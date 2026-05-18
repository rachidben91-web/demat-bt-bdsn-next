"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJsModule = typeof import("pdfjs-dist/build/pdf.mjs");

let pdfJsPromise: Promise<PdfJsModule> | null = null;

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

export async function openPdfDocumentFromUrl(url: string): Promise<PDFDocumentProxy> {
  const pdfJs = await getPdfJs();
  const loadingTask = pdfJs.getDocument(url);

  return loadingTask.promise;
}
