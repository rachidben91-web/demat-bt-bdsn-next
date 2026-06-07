"use client";

type PdfLibDocument = {
  addPage: (page: unknown) => void;
  copyPages: (source: PdfLibDocument, indices: number[]) => Promise<unknown[]>;
  save: () => Promise<Uint8Array>;
};

type PdfLibModule = {
  PDFDocument: {
    create: () => Promise<PdfLibDocument>;
    load: (bytes: ArrayBuffer | Uint8Array) => Promise<PdfLibDocument>;
  };
};

declare global {
  interface Window {
    PDFLib?: PdfLibModule;
  }
}

let pdfLibPromise: Promise<PdfLibModule> | null = null;

export function loadPdfLib(): Promise<PdfLibModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Le moteur PDF n'est disponible que dans le navigateur."));
  }

  if (window.PDFLib) {
    return Promise.resolve(window.PDFLib);
  }

  if (!pdfLibPromise) {
    pdfLibPromise = new Promise<PdfLibModule>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-pdf-lib="true"]');

      if (existingScript) {
        if (window.PDFLib) {
          resolve(window.PDFLib);
          return;
        }

        existingScript.addEventListener("load", () => {
          if (window.PDFLib) {
            resolve(window.PDFLib);
            return;
          }

          reject(new Error("Le moteur PDF a ete charge sans exposer PDFLib."));
        });

        existingScript.addEventListener("error", () => {
          reject(new Error("Chargement du moteur PDF impossible."));
        });

        return;
      }

      const script = document.createElement("script");
      script.src = "/vendor/pdf-lib.min.js";
      script.async = true;
      script.dataset.pdfLib = "true";
      script.onload = () => {
        if (window.PDFLib) {
          resolve(window.PDFLib);
          return;
        }

        reject(new Error("Le moteur PDF a ete charge sans exposer PDFLib."));
      };
      script.onerror = () => {
        reject(new Error("Chargement du moteur PDF impossible."));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      pdfLibPromise = null;
      throw error;
    });
  }

  return pdfLibPromise;
}
