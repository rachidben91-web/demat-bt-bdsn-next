"use client";

import { useState, useTransition } from "react";
import { getTerrainBtPdfSignedUrl } from "@/app/actions/terrain-pdf";

type TerrainBtPdfButtonProps = {
  btEntryId: string;
  btId: string;
  dispatchItemId: string;
};

export function TerrainBtPdfButton({ btEntryId, btId, dispatchItemId }: TerrainBtPdfButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startPdfTransition] = useTransition();

  function handleOpenPdf() {
    setError(null);

    const popup = window.open("", "_blank", "noopener,noreferrer");

    startPdfTransition(() => {
      void (async () => {
        const result = await getTerrainBtPdfSignedUrl(dispatchItemId, btEntryId, btId);

        if ("error" in result) {
          popup?.close();
          setError(result.error);
          return;
        }

        if (popup) {
          popup.location.href = result.url;
          return;
        }

        window.open(result.url, "_blank", "noopener,noreferrer");
      })();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleOpenPdf}
        type="button"
      >
        {isPending ? "Ouverture du PDF..." : "Voir le PDF BT"}
      </button>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
