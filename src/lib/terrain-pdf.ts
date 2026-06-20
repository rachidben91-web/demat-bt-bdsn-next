import type { CurrentOfficeAccount } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

type TerrainDispatchItemRow = {
  bt_ids: unknown;
  dispatch_id: string;
  id: string;
  office_account_id: string | null;
  technician_id: string;
};

type TerrainDispatchRow = {
  bt_import_day_id: string | null;
};

type TerrainBtEntryRow = {
  bt_id: string;
  derived_pdf_storage_path: string | null;
  id: string;
};

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseBtIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export async function resolveTerrainBtPdfSource(
  account: CurrentOfficeAccount,
  dispatchItemId: string,
  btEntryId: string,
  btId?: string,
): Promise<{ btId: string; storagePath: string } | { error: string }> {
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return { error: "Client admin Supabase indisponible. Verifie la cle service role." };
  }

  try {
    const normalizedDispatchItemId = dispatchItemId.trim();
    const normalizedBtEntryId = btEntryId.trim();
    const normalizedBtId = String(btId ?? "").trim();
    const technicianId = account.technicianId ?? null;
    const officeAccountId = account.id ?? null;

    if (!normalizedDispatchItemId || !normalizedBtEntryId || !technicianId) {
      return { error: "Parametres terrain invalides." };
    }

    const { data: dispatchItem, error: dispatchError } = await adminSupabase
      .from("mobile_dispatch_items")
      .select("id, dispatch_id, bt_ids, technician_id, office_account_id")
      .eq("id", normalizedDispatchItemId)
      .eq("technician_id", technicianId)
      .maybeSingle<TerrainDispatchItemRow>();

    if (dispatchError || !dispatchItem) {
      return { error: "Mission introuvable." };
    }

    if (dispatchItem.office_account_id && officeAccountId && dispatchItem.office_account_id !== officeAccountId) {
      return { error: "Mission non accessible pour ce compte terrain." };
    }

    const allowedBtIds = parseBtIds(dispatchItem.bt_ids);

    const { data: dispatch, error: dispatchLookupError } = await adminSupabase
      .from("mobile_dispatches")
      .select("bt_import_day_id")
      .eq("id", dispatchItem.dispatch_id)
      .maybeSingle<TerrainDispatchRow>();

    if (dispatchLookupError || !dispatch?.bt_import_day_id) {
      return { error: "Source PDF introuvable pour cette mission." };
    }

    let btEntry: TerrainBtEntryRow | null = null;
    let fallbackBtId = normalizedBtId;

    if (isUuidLike(normalizedBtEntryId)) {
      const { data: btEntryById, error: btEntryByIdError } = await adminSupabase
        .from("bt_import_entries")
        .select("id, bt_id, derived_pdf_storage_path")
        .eq("import_day_id", dispatch.bt_import_day_id)
        .eq("id", normalizedBtEntryId)
        .maybeSingle<TerrainBtEntryRow>();

      if (btEntryByIdError) {
        return { error: "PDF non disponible pour ce BT." };
      }

      btEntry = btEntryById ?? null;
      fallbackBtId = btEntryById?.bt_id ?? fallbackBtId;
    }

    if (!btEntry && !fallbackBtId) {
      const { data: payloadRow, error: payloadError } = await adminSupabase
        .from("mobile_dispatch_items")
        .select("bt_payload")
        .eq("id", normalizedDispatchItemId)
        .maybeSingle<{ bt_payload: unknown }>();

      if (!payloadError && payloadRow && Array.isArray(payloadRow.bt_payload)) {
        const matchedPayloadBt = payloadRow.bt_payload.find((item) => {
          if (!item || typeof item !== "object") {
            return false;
          }

          const candidate = item as Record<string, unknown>;
          return candidate.btEntryId === normalizedBtEntryId && typeof candidate.btId === "string";
        }) as { btId?: string } | undefined;

        fallbackBtId = matchedPayloadBt?.btId?.trim() ?? "";
      }
    }

    if (!btEntry) {
      const lookupBtId = fallbackBtId || normalizedBtEntryId;
      const { data: btEntryByBtId, error: btEntryByBtIdError } = await adminSupabase
        .from("bt_import_entries")
        .select("id, bt_id, derived_pdf_storage_path")
        .eq("import_day_id", dispatch.bt_import_day_id)
        .eq("bt_id", lookupBtId)
        .order("replacement_of_entry_id", { ascending: false, nullsFirst: false })
        .order("page_start", { ascending: false })
        .limit(1)
        .maybeSingle<TerrainBtEntryRow>();

      if (btEntryByBtIdError || !btEntryByBtId) {
        return { error: "PDF non disponible pour ce BT." };
      }

      btEntry = btEntryByBtId;
    }

    if (!allowedBtIds.includes(btEntry.bt_id) && !allowedBtIds.includes(btEntry.id)) {
      return { error: "BT non lie a cette mission." };
    }

    if (!btEntry.derived_pdf_storage_path) {
      return { error: "PDF non disponible pour ce BT." };
    }

    return {
      btId: btEntry.bt_id,
      storagePath: btEntry.derived_pdf_storage_path,
    };
  } catch {
    return { error: "Impossible de retrouver le PDF." };
  }
}

export async function resolveTerrainBtPdfSignedUrl(
  account: CurrentOfficeAccount,
  dispatchItemId: string,
  btEntryId: string,
  btId?: string,
): Promise<{ url: string } | { error: string }> {
  const source = await resolveTerrainBtPdfSource(account, dispatchItemId, btEntryId, btId);
  const adminSupabase = createServerSupabaseAdminClient();

  if ("error" in source) {
    return source;
  }

  if (!adminSupabase) {
    return { error: "Client admin Supabase indisponible. Verifie la cle service role." };
  }

  const { data: signedData, error: signedError } = await adminSupabase.storage
    .from("bt-import-pdfs")
    .createSignedUrl(source.storagePath, 30 * 60);

  if (signedError || !signedData?.signedUrl) {
    return { error: "Impossible de generer le lien PDF." };
  }

  return { url: signedData.signedUrl };
}
