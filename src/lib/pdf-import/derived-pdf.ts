"use client";

import { loadPdfLib } from "@/lib/pdf-import/pdf-lib-loader";
import type { ExtractedBt, PdfImportAnalysis } from "@/lib/pdf-import/types";

type ProgressCallback = (message: string) => void;

function getUniqueSortedPages(bt: ExtractedBt) {
  return [...new Set(bt.docs.map((doc) => doc.page))].sort((left, right) => left - right);
}

export async function createDerivedBtPdfFiles(
  file: File,
  analysis: PdfImportAnalysis,
  onProgress?: ProgressCallback,
) {
  const pdfLib = await loadPdfLib();
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const sourceDocument = await pdfLib.PDFDocument.load(sourceBytes);
  const derived = new Map<
    string,
    {
      bytes: Uint8Array;
      pageCount: number;
    }
  >();

  for (const [index, bt] of analysis.bts.entries()) {
    const pages = getUniqueSortedPages(bt);

    if (pages.length === 0) {
      continue;
    }

    onProgress?.(`Preparation du dossier ${bt.id} (${index + 1}/${analysis.bts.length})...`);

    const derivedDocument = await pdfLib.PDFDocument.create();
    const copiedPages = await derivedDocument.copyPages(
      sourceDocument,
      pages.map((page) => page - 1),
    );

    for (const page of copiedPages) {
      derivedDocument.addPage(page);
    }

    derived.set(bt.id, {
      bytes: await derivedDocument.save(),
      pageCount: pages.length,
    });
  }

  return derived;
}
