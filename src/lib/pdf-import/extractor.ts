"use client";

import pdfZones from "@/data/pdf-zones.json";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  TextItem,
} from "pdfjs-dist/types/src/display/api";
import type { ExtractedBt, ExtractedTeamMember, PdfAttachmentType, PdfImportAnalysis } from "@/lib/pdf-import/types";

type BoundingBox = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type PdfJsModule = typeof import("pdfjs-dist/build/pdf.mjs");

type ProgressCallback = (message: string) => void;

const BT_ZONES = pdfZones.pages.BT;

let pdfJsPromise: Promise<PdfJsModule> | null = null;

function norm(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanUpper(value: string) {
  return stripAccents(value.toUpperCase());
}

function normalizeMergeText(value: string | null | undefined) {
  return stripAccents(String(value ?? ""))
    .toUpperCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCloseText(a: string, b: string) {
  const left = normalizeMergeText(a);
  const right = normalizeMergeText(b);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  if (left.length < 8 || right.length < 8) {
    return false;
  }

  return left.includes(right) || right.includes(left);
}

function pickBestText(base: string, incoming: string) {
  if (!base) {
    return incoming;
  }

  if (!incoming) {
    return base;
  }

  return incoming.length > base.length ? incoming : base;
}

function mergeTeamLists(baseTeam: ExtractedTeamMember[], extraTeam: ExtractedTeamMember[]) {
  const merged: ExtractedTeamMember[] = [];
  const seen = new Set<string>();

  for (const member of [...baseTeam, ...extraTeam]) {
    const nni = member.nni.trim().toUpperCase();
    const name = norm(member.name);
    const key = nni || normalizeMergeText(name) || "__EMPTY__";

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push({ nni, name });
  }

  return merged;
}

function mergeDocs(
  baseDocs: ExtractedBt["docs"],
  extraDocs: ExtractedBt["docs"],
) {
  const merged = new Map<string, ExtractedBt["docs"][number]>();

  for (const doc of [...baseDocs, ...extraDocs]) {
    merged.set(`${doc.page}:${doc.type}`, doc);
  }

  return [...merged.values()].sort((left, right) => left.page - right.page);
}

function shouldMergeBt(base: ExtractedBt, incoming: ExtractedBt) {
  if (base.id !== incoming.id) {
    return false;
  }

  const baseDate = normalizeMergeText(base.datePrevue);
  const incomingDate = normalizeMergeText(incoming.datePrevue);

  if (baseDate && incomingDate && baseDate !== incomingDate) {
    return false;
  }

  if (isCloseText(base.objet, incoming.objet) || isCloseText(base.localisation, incoming.localisation)) {
    return true;
  }

  const baseAt = normalizeMergeText(base.atNum);
  const incomingAt = normalizeMergeText(incoming.atNum);

  return Boolean(baseAt && incomingAt && baseAt === incomingAt && baseDate === incomingDate);
}

function mergeTwoBts(base: ExtractedBt, incoming: ExtractedBt) {
  base.pageStart = Math.min(base.pageStart, incoming.pageStart);
  base.objet = pickBestText(base.objet, incoming.objet);
  base.datePrevue = pickBestText(base.datePrevue, incoming.datePrevue);
  base.client = pickBestText(base.client, incoming.client);
  base.localisation = pickBestText(base.localisation, incoming.localisation);
  base.atNum = pickBestText(base.atNum, incoming.atNum);
  base.designation = pickBestText(base.designation, incoming.designation);
  base.duree = pickBestText(base.duree, incoming.duree);
  base.analyseDesRisques = pickBestText(base.analyseDesRisques, incoming.analyseDesRisques);
  base.observations = pickBestText(base.observations, incoming.observations);
  base.team = mergeTeamLists(base.team, incoming.team);
  base.docs = mergeDocs(base.docs, incoming.docs);

  return base;
}

function mergeDuplicateBts(bts: ExtractedBt[]) {
  const groups = new Map<string, ExtractedBt[]>();

  for (const bt of bts) {
    const existing = groups.get(bt.id) ?? [];
    existing.push(bt);
    groups.set(bt.id, existing);
  }

  const merged: ExtractedBt[] = [];

  for (const entries of groups.values()) {
    const sorted = [...entries].sort((left, right) => left.pageStart - right.pageStart);
    const buffer: ExtractedBt[] = [];

    for (const entry of sorted) {
      const target = buffer.find((candidate) => shouldMergeBt(candidate, entry));

      if (!target) {
        buffer.push({
          ...entry,
          team: mergeTeamLists(entry.team, []),
          docs: mergeDocs(entry.docs, []),
        });
        continue;
      }

      mergeTwoBts(target, entry);
    }

    merged.push(...buffer);
  }

  return merged.sort((left, right) => left.pageStart - right.pageStart);
}

function getZoneBox(label: keyof typeof BT_ZONES) {
  return BT_ZONES[label].bbox as BoundingBox;
}

async function getPdfJs() {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/build/pdf.mjs").then((module) => {
      module.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      return module;
    });
  }

  return pdfJsPromise;
}

async function extractFullPageText(page: PDFPageProxy) {
  const textContent = await page.getTextContent();
  const items = (textContent.items as TextItem[]) ?? [];
  const rows = items
    .map((item) => ({
      str: norm(item.str),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.str.length > 0);

  rows.sort((left, right) => right.y - left.y || left.x - right.x);

  return rows.map((item) => item.str).join(" ");
}

async function extractTextInBoundingBox(page: PDFPageProxy, bbox: BoundingBox) {
  const textContent = await page.getTextContent();
  const items = (textContent.items as TextItem[]) ?? [];
  const matches = items
    .map((item) => ({
      str: norm(item.str),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter(
      (item) =>
        item.str.length > 0 &&
        item.x >= bbox.x0 &&
        item.x <= bbox.x1 &&
        item.y >= bbox.y0 &&
        item.y <= bbox.y1,
    );

  matches.sort((left, right) => right.y - left.y || left.x - right.x);

  return norm(matches.map((item) => item.str).join(" "));
}

async function countPageImages(page: PDFPageProxy, pdfJs: PdfJsModule) {
  try {
    const operators = await page.getOperatorList();

    return operators.fnArray.filter(
      (value) =>
        value === pdfJs.OPS.paintImageXObject || value === pdfJs.OPS.paintInlineImageXObject,
    ).length;
  } catch {
    return 0;
  }
}

function containsAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function getPlanSignalScore(text: string) {
  const strongSignals = [
    "PLAN DE SITUATION",
    "PLAN DE MASSE",
    "PLAN D ENSEMBLE",
    "PLAN D'ENSEMBLE",
    "PLAN DE REPERAGE",
    "PLAN DE REPEREMENT",
    "PLAN DE LOCALISATION",
    "PLAN DE DETAIL",
    "VUE EN PLAN",
    "PLAN TOPOGRAPHIQUE",
    "PLAN DE RECOLEMENT",
    "RESEAU GAZ",
    "CROQUIS",
    "EMPRISE",
  ];
  const mediumSignals = [
    "ECHELLE",
    "FORMAT A4",
    "FORMAT A3",
    "FORMAT A2",
    "FORMAT A1",
    "PAYSAGE",
    "COMMUNE",
    "CODE INSEE",
    "LAMBERT",
    "CARTOGRAPHIE",
    "RECOLLEMENT",
    "ALTIMETRIE",
    "CANALISATION",
    "TRONCON",
    "NORD",
    "X =",
    "Y =",
  ];

  let score = 0;

  for (const signal of strongSignals) {
    if (text.includes(signal)) {
      score += 3;
    }
  }

  for (const signal of mediumSignals) {
    if (text.includes(signal)) {
      score += 1;
    }
  }

  if (text.includes("PLAN")) {
    score += 1;
  }

  if (text.includes("GRDF")) {
    score += 1;
  }

  return score;
}

async function detectAttachmentType(page: PDFPageProxy, pdfJs: PdfJsModule): Promise<PdfAttachmentType> {
  const rawText = await extractFullPageText(page);
  const text = cleanUpper(rawText);
  const textLength = rawText.replace(/\s+/g, "").length;
  const imageCount = await countPageImages(page, pdfJs);

  if (
    text.includes("PROCEDURE D'EXECUTION") ||
    text.includes("PROCEDURE D EXECUTION") ||
    /PROCEDURE\s+D.?EXECUTION/.test(text) ||
    (text.includes("LISTE DES INTERVENTIONS") &&
      text.includes("OPERATION") &&
      text.includes("ACTEURS"))
  ) {
    return "PROC";
  }

  if (text.includes("FOR-113") || text.includes("FOR 113") || text.includes("PREPARATION ET DE SUIVI")) {
    return "FOR113";
  }

  if (
    text.includes("FICHE AT") ||
    text.includes("N° D'AT") ||
    text.includes("NO D'AT") ||
    text.includes("N D'AT") ||
    (text.includes("AUTORISATION DE TRAVAIL") &&
      !text.includes("BON DE TRAVAIL") &&
      text.includes("DELIVRANCE"))
  ) {
    return "AT";
  }

  if (
    text.includes("GOOGLE STREET VIEW") ||
    text.includes("STREET VIEW") ||
    (text.includes("GOOGLE MAPS") && !text.includes("BON DE TRAVAIL"))
  ) {
    return "STREET";
  }

  if (getPlanSignalScore(text) >= 3) {
    return "PLAN";
  }

  if (
    containsAny(text, [
      "PHOTO",
      "PHOTOS",
      "PRISE DE VUE",
      "REPORTAGE PHOTO",
      "AVANT TRAVAUX",
      "APRES TRAVAUX",
      "AVANT / APRES",
    ])
  ) {
    return "PHOTO";
  }

  if (imageCount >= 2 && textLength < 900 && getPlanSignalScore(text) < 3) {
    return "PHOTO";
  }

  if (textLength < 220 && imageCount > 0) {
    return "PHOTO";
  }

  return "DOC";
}

function isBtNumber(value: string) {
  return /BT\d{8,14}/i.test(value);
}

function pickBtId(value: string) {
  return ((value.match(/BT\d{8,14}/i) ?? [""])[0] ?? "").toUpperCase();
}

function pickAtId(value: string) {
  return ((value.match(/AT\d{3,}/i) ?? [""])[0] ?? "").toUpperCase();
}

function parseTeam(value: string) {
  const text = cleanUpper(value);
  const regex = /([A-Z]\d{5})\s+([A-ZÀ-Ÿ][A-ZÀ-Ÿ' -]{2,60})/g;
  const team: ExtractedTeamMember[] = [];

  for (const match of text.matchAll(regex)) {
    const nni = match[1] ?? "";
    const name = norm(match[2] ?? "");

    if (!team.some((member) => member.nni === nni)) {
      team.push({ nni, name });
    }
  }

  return team;
}

function extractDayFromFilename(fileName: string) {
  const compact = fileName.match(/(?:^|_)(20\d{2})(\d{2})(\d{2})(?:_|\.|$)/);

  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }

  const french = fileName.match(/(?:^|_)(\d{2})[-_](\d{2})[-_](20\d{2})(?:_|\.|$)/);

  if (french) {
    return `${french[3]}-${french[2]}-${french[1]}`;
  }

  return null;
}

async function extractBtsFromDocument(
  pdfDocument: PDFDocumentProxy,
  pdfJs: PdfJsModule,
  onProgress?: ProgressCallback,
) {
  const extracted: ExtractedBt[] = [];
  let currentBt: ExtractedBt | null = null;

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    onProgress?.(`Analyse page ${pageNumber}/${pdfDocument.numPages}...`);

    const page = await pdfDocument.getPage(pageNumber);
    const btNumber = await extractTextInBoundingBox(page, getZoneBox("BT_NUM"));

    if (isBtNumber(btNumber)) {
      const team = parseTeam(await extractTextInBoundingBox(page, getZoneBox("REALISATION")));

      currentBt = {
        id: pickBtId(btNumber),
        pageStart: pageNumber,
        objet: await extractTextInBoundingBox(page, getZoneBox("OBJET")),
        datePrevue: await extractTextInBoundingBox(page, getZoneBox("DATE_PREVUE")),
        client: await extractTextInBoundingBox(page, getZoneBox("CLIENT_NOM")),
        localisation: await extractTextInBoundingBox(page, getZoneBox("LOCALISATION")),
        atNum: pickAtId(await extractTextInBoundingBox(page, getZoneBox("AT_NUM"))),
        designation: await extractTextInBoundingBox(page, getZoneBox("DESIGNATION")),
        duree: await extractTextInBoundingBox(page, getZoneBox("DUREE")),
        analyseDesRisques: await extractTextInBoundingBox(page, getZoneBox("ANALYSE_DES_RISQUES")),
        observations: await extractTextInBoundingBox(page, getZoneBox("OBSERVATIONS")),
        team,
        docs: [{ page: pageNumber, type: "BT" }],
      };

      extracted.push(currentBt);
      continue;
    }

    if (!currentBt) {
      continue;
    }

    currentBt.docs.push({
      page: pageNumber,
      type: await detectAttachmentType(page, pdfJs),
    });
  }

  return mergeDuplicateBts(extracted);
}

export async function analyzePdfFile(file: File, onProgress?: ProgressCallback): Promise<PdfImportAnalysis> {
  const pdfJs = await getPdfJs();
  onProgress?.("Chargement du PDF...");

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfJs.getDocument({ data: buffer });
  const pdfDocument = await loadingTask.promise;
  const bts = await extractBtsFromDocument(pdfDocument, pdfJs, onProgress);

  onProgress?.(`${bts.length} BT detecte(s).`);

  return {
    importedDayIso: extractDayFromFilename(file.name),
    pageCount: pdfDocument.numPages,
    pdfName: file.name,
    bts,
  };
}
