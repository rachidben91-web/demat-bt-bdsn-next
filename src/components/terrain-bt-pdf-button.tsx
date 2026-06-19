type TerrainBtPdfButtonProps = {
  btEntryId: string;
  btId: string;
  dispatchItemId: string;
};

export function TerrainBtPdfButton({ btEntryId, btId, dispatchItemId }: TerrainBtPdfButtonProps) {
  const href = `/terrain/bt-pdf?${new URLSearchParams({
    btEntryId,
    btId,
    dispatchItemId,
  }).toString()}`;

  return (
    <a
      className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      Voir le PDF BT
    </a>
  );
}
