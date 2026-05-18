"use server";

import { refresh } from "next/cache";
import { requireTerrainAccess, requireOfficeWriteModule } from "@/lib/auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import type { DepartureInstruction } from "@/lib/mobile-dispatch";

export type MobileDispatchActionState = {
  error: string | null;
  success: string | null;
};

type PublishPayloadBt = {
  btId: string;
  client: string;
  localisation: string;
  objet: string;
  pageStart: number;
};

function parseJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  const text = String(value ?? "").trim();

  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function normalizeDepartureInstruction(value: FormDataEntryValue | null): DepartureInstruction {
  const text = String(value ?? "").trim();

  if (text === "agency" || text === "direct") {
    return text;
  }

  return "confirm";
}

function getActivitySummary(btCount: number) {
  if (btCount <= 0) {
    return "Aucune intervention transmise";
  }

  if (btCount === 1) {
    return "1 intervention transmise";
  }

  return `${btCount} interventions transmises`;
}

export async function publishMobileDispatchAction(
  previousState: MobileDispatchActionState,
  formData: FormData,
): Promise<MobileDispatchActionState> {
  void previousState;
  await requireOfficeWriteModule("referent");

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
    };
  }

  try {
    const missionDate = String(formData.get("mission_date") ?? "").trim();
    const btImportDayId = String(formData.get("bt_import_day_id") ?? "").trim() || null;
    const siteCode = String(formData.get("site_code") ?? "").trim() || null;
    const departureInstruction = normalizeDepartureInstruction(formData.get("departure_instruction"));
    const technicians = parseJson<Array<{ id: string; label: string }>>(
      formData.get("technicians"),
      [],
    );
    const btPayload = parseJson<PublishPayloadBt[]>(formData.get("bt_payload"), []);

    if (!missionDate) {
      throw new Error("Date de mission manquante.");
    }

    if (technicians.length === 0) {
      throw new Error("Aucun technicien a publier.");
    }

    if (btPayload.length === 0) {
      throw new Error("Aucun BT a publier.");
    }

    const auth = await requireOfficeWriteModule("referent");
    const publishedByEmail = auth.user?.email ?? null;

    if (!publishedByEmail) {
      throw new Error("Utilisateur non authentifie.");
    }

    const technicianIds = technicians.map((item) => item.id);
    const { data: technicianRows, error: technicianError } = await adminSupabase
      .from("technicians")
      .select("id, display_name, ptc, ptd, managers(name)")
      .in("id", technicianIds);

    if (technicianError) {
      throw new Error(technicianError.message);
    }

    const { data: accountRows, error: accountError } = await adminSupabase
      .from("office_accounts")
      .select("id, technician_id, can_access_terrain_app")
      .in("technician_id", technicianIds);

    if (accountError) {
      throw new Error(accountError.message);
    }

    const accountByTechnicianId = new Map(
      (accountRows ?? [])
        .filter((row) => row.can_access_terrain_app && row.technician_id)
        .map((row) => [row.technician_id as string, row.id as string]),
    );

    const dispatchInsert = await adminSupabase
      .from("mobile_dispatches")
      .insert({
        bt_import_day_id: btImportDayId,
        mission_date: missionDate,
        published_by_email: publishedByEmail,
        published_by_user_id: auth.user?.id ?? null,
        status: "published",
      })
      .select("id")
      .single();

    if (dispatchInsert.error || !dispatchInsert.data) {
      throw new Error(dispatchInsert.error?.message ?? "Publication impossible.");
    }

    const managerNameFrom = (value: { name: string | null } | { name: string | null }[] | null) => {
      if (Array.isArray(value)) {
        return value[0]?.name ?? null;
      }

      return value?.name ?? null;
    };

    const itemRows = (technicianRows ?? []).map((technician) => {
      const workMode =
        technician.ptc && technician.ptd
          ? "PTC-PTD"
          : technician.ptc
            ? "PTC"
            : technician.ptd
              ? "PTD"
              : "—";

      return {
        activity_summary: getActivitySummary(btPayload.length),
        bt_count: btPayload.length,
        bt_ids: btPayload.map((item) => item.btId),
        bt_payload: btPayload,
        departure_instruction: departureInstruction,
        dispatch_id: dispatchInsert.data.id,
        manager_name: managerNameFrom(
          technician.managers as { name: string | null } | { name: string | null }[] | null,
        ),
        mission_date: missionDate,
        observation: null,
        office_account_id: accountByTechnicianId.get(technician.id) ?? null,
        published_at: new Date().toISOString(),
        site_code: siteCode,
        technician_id: technician.id,
        technician_name: technician.display_name,
        work_mode: workMode,
      };
    });

    const { error: itemsError } = await adminSupabase.from("mobile_dispatch_items").insert(itemRows);

    if (itemsError) {
      throw new Error(itemsError.message);
    }

    refresh();

    return {
      error: null,
      success: `Publication mobile envoyee pour ${itemRows.length} technicien(s).`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Publication mobile impossible.",
      success: null,
    };
  }
}

export async function acknowledgeMobileDispatchAction(
  previousState: MobileDispatchActionState,
  formData: FormData,
): Promise<MobileDispatchActionState> {
  void previousState;

  const auth = await requireTerrainAccess();
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
    };
  }

  try {
    const itemId = String(formData.get("item_id") ?? "").trim();

    if (!itemId) {
      throw new Error("Envoi mobile introuvable.");
    }

    const officeAccountId = auth.officeAccount?.id ?? null;

    const { data: item, error: itemError } = await adminSupabase
      .from("mobile_dispatch_items")
      .select("id, office_account_id, technician_id, acknowledged_at")
      .eq("id", itemId)
      .maybeSingle();

    if (itemError || !item) {
      throw new Error(itemError?.message ?? "Envoi mobile introuvable.");
    }

    if (
      item.technician_id !== auth.officeAccount?.technicianId ||
      (item.office_account_id && item.office_account_id !== officeAccountId)
    ) {
      throw new Error("Cet envoi mobile ne correspond pas a ce compte.");
    }

    if (item.acknowledged_at) {
      return {
        error: null,
        success: "Journee deja accusee.",
      };
    }

    const acknowledgedAt = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from("mobile_dispatch_items")
      .update({
        acknowledged_at: acknowledgedAt,
        acknowledged_by_account_id: officeAccountId,
        acknowledged_by_email: auth.user?.email ?? null,
      })
      .eq("id", itemId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    refresh();

    return {
      error: null,
      success: "Journee recue et confirmee.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Accuse de reception impossible.",
      success: null,
    };
  }
}
