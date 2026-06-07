"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveBtImportDayAction } from "@/app/actions/bt-import";
import { AppShellHeader } from "@/components/app-shell-header";
import { getModuleTheme } from "@/lib/module-theme";
import { createDerivedBtPdfFiles } from "@/lib/pdf-import/derived-pdf";
import { analyzePdfFile } from "@/lib/pdf-import/extractor";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { PdfImportAnalysis } from "@/lib/pdf-import/types";
import type { OfficeModuleKey } from "@/lib/office-access";

type ImportPdfWorkspaceProps = {
  allowedModules?: OfficeModuleKey[];
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Date non reconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
  }).format(new Date(`${value}T12:00:00Z`));
}

function buildStoragePath(dayIso: string, fileName: string) {
  const safeName = sanitizeFileSegment(fileName);

  return `VLG/${dayIso}/${safeName || "journee.pdf"}`;
}

function sanitizeFileSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildDerivedStoragePath(dayIso: string, btId: string) {
  const safeBtId = sanitizeFileSegment(btId.toUpperCase());
  return `VLG/${dayIso}/bt/${safeBtId || "BT"}.pdf`;
}

function badgeTone(type: string) {
  if (type === "BT") {
    return "bg-blue-100 text-blue-700";
  }

  if (type === "AT" || type === "PROC" || type === "FOR113") {
    return "bg-amber-100 text-amber-700";
  }

  if (type === "PLAN" || type === "STREET") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (type === "PHOTO") {
    return "bg-fuchsia-100 text-fuchsia-700";
  }

  return "bg-slate-100 text-slate-700";
}

export function ImportPdfWorkspace({
  allowedModules = [],
  isSuperAdmin = false,
  role,
  userEmail,
}: ImportPdfWorkspaceProps) {
  const importTheme = getModuleTheme("import");
  const [analysis, setAnalysis] = useState<PdfImportAnalysis | null>(null);
  const [status, setStatus] = useState("Choisissez un PDF journalier pour lancer la reconnaissance DBT.");
  const [error, setError] = useState<string | null>(null);
  const [savedDayDate, setSavedDayDate] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setError(null);
    setAnalysis(null);
    setSavedDayDate(null);
    setSaveMessage(null);

    startTransition(async () => {
      try {
        const result = await analyzePdfFile(file, setStatus);
        setAnalysis(result);
        setStatus(
          result.bts.length > 0
            ? `${result.bts.length} BT detecte(s) dans ${result.pageCount} page(s).`
            : "Aucun BT detecte. Le PDF ne correspond peut-etre pas au gabarit attendu.",
        );
      } catch (caughtError) {
        setAnalysis(null);
        setError(caughtError instanceof Error ? caughtError.message : "Analyse impossible.");
        setStatus("Le PDF n'a pas pu etre analyse.");
      }
    });
  }

  function handleSaveDay() {
    if (!analysis) {
      return;
    }

    setSaveMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        let storagePath: string | null = null;
        let analysisToSave = analysis;

        if (selectedFile && analysis.importedDayIso) {
          setStatus("Televersement du PDF source...");
          storagePath = buildStoragePath(analysis.importedDayIso, selectedFile.name);
          const supabase = createBrowserSupabaseClient();
          const { error: uploadError } = await supabase.storage
            .from("bt-import-pdfs")
            .upload(storagePath, selectedFile, {
              upsert: true,
              contentType: "application/pdf",
            });

          if (uploadError) {
            throw uploadError;
          }

          setStatus("Preparation des PDFs derives par BT...");
          const derivedPdfs = await createDerivedBtPdfFiles(selectedFile, analysis, setStatus);
          const derivedPrefix = `VLG/${analysis.importedDayIso}/bt`;
          const { data: existingDerivedFiles, error: listDerivedError } = await supabase.storage
            .from("bt-import-pdfs")
            .list(derivedPrefix, {
              limit: 500,
              sortBy: { column: "name", order: "asc" },
            });

          if (listDerivedError) {
            throw listDerivedError;
          }

          const stalePaths = (existingDerivedFiles ?? [])
            .filter((entry) => entry.name && !entry.name.endsWith("/"))
            .map((entry) => `${derivedPrefix}/${entry.name}`);

          if (stalePaths.length > 0) {
            const { error: removeDerivedError } = await supabase.storage
              .from("bt-import-pdfs")
              .remove(stalePaths);

            if (removeDerivedError) {
              throw removeDerivedError;
            }
          }

          const enrichedBts = [];

          for (const [index, bt] of analysis.bts.entries()) {
            const derivedPdf = derivedPdfs.get(bt.id);

            if (!derivedPdf) {
              enrichedBts.push(bt);
              continue;
            }

            const derivedStoragePath = buildDerivedStoragePath(analysis.importedDayIso, bt.id);
            setStatus(`Televersement du dossier ${bt.id} (${index + 1}/${analysis.bts.length})...`);
            const { error: derivedUploadError } = await supabase.storage
              .from("bt-import-pdfs")
              .upload(derivedStoragePath, derivedPdf.bytes, {
                upsert: true,
                contentType: "application/pdf",
              });

            if (derivedUploadError) {
              throw derivedUploadError;
            }

            enrichedBts.push({
              ...bt,
              derivedPdfStoragePath: derivedStoragePath,
              derivedPdfPageCount: derivedPdf.pageCount,
            });
          }

          analysisToSave = {
            ...analysis,
            bts: enrichedBts,
          };
        }

        setStatus("Enregistrement de la journee...");
        const result = await saveBtImportDayAction(analysisToSave, storagePath);
        setSaveMessage(result.message);

        if (result.ok) {
          setSavedDayDate(result.dayDate ?? null);
          setAnalysis(analysisToSave);
          setStatus("Journee enregistree avec ses dossiers BT derives.");
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Sauvegarde impossible.");
        setStatus("La journee n'a pas pu etre enregistree.");
      }
    });
  }

  return (
    <main className={cx("min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8", importTheme.pageBackgroundClassName)}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="import"
          allowedModules={allowedModules}
          isSuperAdmin={isSuperAdmin}
          role={role}
          subtitle="Lecture PDF client-side et reconnaissance des BT comme dans l'ancienne application."
          title="Import PDF"
          userEmail={userEmail}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6 lg:p-8">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <article className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-6 text-white shadow-[0_26px_60px_rgba(15,23,42,0.22)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Reconnaissance DBT
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Importer un PDF du jour
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Cette premiere version reconnait les BT, relie les pages suivantes comme pieces
                jointes et classe leurs types principaux.
              </p>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-white/20 bg-white/6 px-6 py-10 text-center">
                <span className="text-sm font-semibold text-white">
                  {isPending ? "Analyse en cours..." : "Choisir un PDF"}
                </span>
                <span className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                  Format attendu : PDF journalier BT
                </span>
                <input
                  accept="application/pdf"
                  className="sr-only"
                  onChange={handleFileChange}
                  type="file"
                />
              </label>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-white/6 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">Etat</p>
                <p className="mt-2">{status}</p>
                {error ? <p className="mt-3 text-rose-300">{error}</p> : null}
                {saveMessage ? <p className="mt-3 text-cyan-200">{saveMessage}</p> : null}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!analysis || isPending}
                  onClick={handleSaveDay}
                  type="button"
                >
                  Enregistrer cette journee
                </button>
                <Link
                  className={cx(
                    "rounded-2xl border border-white/14 px-5 py-3 text-center text-sm font-semibold",
                    savedDayDate
                      ? "bg-white/10 text-white"
                      : "pointer-events-none bg-white/5 text-slate-500",
                  )}
                  href={savedDayDate ? `/brief?date=${savedDayDate}` : "/brief"}
                >
                  Ouvrir dans Brief
                </Link>
              </div>
            </article>

            <div className="space-y-5">
              <section className="grid gap-4 md:grid-cols-3">
                {[
                  {
                    label: "BT detectes",
                    value: String(analysis?.bts.length ?? 0),
                  },
                  {
                    label: "Pages PDF",
                    value: String(analysis?.pageCount ?? 0),
                  },
                  {
                    label: "Jour reconnu",
                    value: analysis?.importedDayIso ? "Oui" : "Non",
                  },
                ].map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm"
                  >
                    <p className="text-4xl font-semibold tracking-tight text-blue-600">
                      {metric.value}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.22em] text-slate-500">
                      {metric.label}
                    </p>
                  </article>
                ))}
              </section>

              <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Apercu du fichier
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {analysis?.pdfName ?? "Aucun fichier analyse"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {formatDateLabel(analysis?.importedDayIso ?? null)}
                </p>
              </section>

              <section className="space-y-4">
                {analysis?.bts.length ? (
                  analysis.bts.map((bt) => (
                    <article
                      key={`${bt.id}-${bt.pageStart}`}
                      className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                              {bt.id}
                            </h3>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Page {bt.pageStart}
                            </span>
                            {bt.derivedPdfStoragePath ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                PDF derive {bt.derivedPdfPageCount ?? bt.docs.length} page(s)
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {bt.objet || "Objet non reconnu"}
                          </p>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2 xl:min-w-[420px]">
                          <div>
                            <span className="font-semibold text-slate-700">Date prevue :</span>{" "}
                            {bt.datePrevue || "—"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">AT :</span>{" "}
                            {bt.atNum || "—"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Client :</span>{" "}
                            {bt.client || "—"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Duree :</span>{" "}
                            {bt.duree || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Localisation
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {bt.localisation || "Non reconnue"}
                          </p>
                        </div>
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Equipe detectee
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {bt.team.length ? (
                              bt.team.map((member) => (
                                <span
                                  key={`${bt.id}-${member.nni}`}
                                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                                >
                                  {member.nni} {member.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">Aucune equipe reconnue</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Documents rattaches
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {bt.docs.map((doc) => (
                            <span
                              key={`${bt.id}-${doc.page}-${doc.type}`}
                              className={cx(
                                "rounded-full px-3 py-1 text-xs font-semibold",
                                badgeTone(doc.type),
                              )}
                            >
                              Page {doc.page} · {doc.type}
                            </span>
                          ))}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="rounded-[26px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm">
                    L&apos;aperçu des BT apparaitra ici apres analyse d&apos;un PDF.
                  </article>
                )}
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
