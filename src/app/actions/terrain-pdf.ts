"use server";

import { requireTerrainAccess } from "@/lib/auth";
import { resolveTerrainBtPdfSignedUrl } from "@/lib/terrain-pdf";

export async function getTerrainBtPdfSignedUrl(
  dispatchItemId: string,
  btEntryId: string,
  btId?: string,
): Promise<{ url: string } | { error: string }> {
  const auth = await requireTerrainAccess();
  return resolveTerrainBtPdfSignedUrl(auth.officeAccount!, dispatchItemId, btEntryId, btId);
}
