"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeWriteModule } from "@/lib/auth";
import { getEffectiveTeam } from "@/lib/bt-workflow";
import type { ExtractedBt, ExtractedTeamMember } from "@/lib/pdf-import/types";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export type BriefBtWorkflowActionState = {
  error: string | null;
  success: string | null;
};

type BtLookupRow = {
  brief_workflow_status?: string | null;
  bt_id: string;
  id: string;
  import_day_id?: string;
  mobile_ready?: boolean | null;
  page_start: number;
  replaced_by_entry_id?: string | null;
  replacement_of_entry_id?: string | null;
  source_mode?: string | null;
  superseded_at?: string | null;
  team: unknown;
  team_override?: unknown;
};

type TechnicianLookupRow = {
  display_name: string;
  id: string;
  nni: string;
};

function parseTeam(value: unknown): ExtractedTeamMember[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((member) => {
      if (!member || typeof member !== "object") {
        return null;
      }

      const candidate = member as Record<string, unknown>;

      return {
        nni: typeof candidate.nni === "string" ? candidate.nni : "",
        name: typeof candidate.name === "string" ? candidate.name : "",
      };
    })
    .filter((member): member is ExtractedTeamMember => Boolean(member));
}

function buildBtSnapshot(row: BtLookupRow): ExtractedBt {
  return {
    briefWorkflowStatus:
      row.brief_workflow_status === "o2_pending" || row.brief_workflow_status === "o2_validated"
        ? row.brief_workflow_status
        : "normal",
    docs: [],
    id: row.bt_id,
    mobileReady: Boolean(row.mobile_ready),
    observations: "",
    objet: "",
    pageStart: row.page_start,
    team: parseTeam(row.team),
    teamOverride: parseTeam(row.team_override),
    replacedByEntryId: row.replaced_by_entry_id ?? null,
    replacementOfEntryId: row.replacement_of_entry_id ?? null,
    supersededAt: row.superseded_at ?? null,
    atNum: "",
    client: "",
    datePrevue: "",
    designation: "",
    duree: "",
    analyseDesRisques: "",
    localisation: "",
  };
}

async function getBtEntryOrThrow(entryId: string) {
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Client admin Supabase indisponible. Verifie la cle service role.");
  }

  const { data, error } = await adminSupabase
    .from("bt_import_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle<BtLookupRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "BT introuvable.");
  }

  return { adminSupabase, entry: data };
}

export async function reassignBriefBtAction(
  previousState: BriefBtWorkflowActionState,
  formData: FormData,
): Promise<BriefBtWorkflowActionState> {
  void previousState;

  const auth = await requireOfficeWriteModule("brief");

  try {
    const entryId = String(formData.get("entry_id") ?? "").trim();
    const selectedTechnicianIds = formData
      .getAll("technician_ids")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (!entryId) {
      throw new Error("BT introuvable pour la reaffectation.");
    }

    if (selectedTechnicianIds.length === 0) {
      throw new Error("Selectionnez au moins un technicien.");
    }

    const { adminSupabase, entry } = await getBtEntryOrThrow(entryId);

    if (entry.superseded_at || entry.replaced_by_entry_id) {
      throw new Error("Ce BT a deja ete remplace.");
    }

    const { data: technicianRows, error: techniciansError } = await adminSupabase
      .from("technicians")
      .select("id, display_name, nni")
      .in("id", selectedTechnicianIds);

    if (techniciansError) {
      throw new Error(techniciansError.message);
    }

    const technicianById = new Map(
      ((technicianRows ?? []) as TechnicianLookupRow[]).map((technician) => [technician.id, technician]),
    );

    const nextTeam = selectedTechnicianIds
      .map((technicianId) => technicianById.get(technicianId))
      .filter((technician): technician is TechnicianLookupRow => Boolean(technician))
      .map((technician) => ({
        name: technician.display_name,
        nni: technician.nni,
      }));

    if (nextTeam.length !== selectedTechnicianIds.length) {
      throw new Error("Impossible de retrouver toute la selection technicien.");
    }

    const { error: updateError } = await adminSupabase
      .from("bt_import_entries")
      .update({
        brief_workflow_status: "o2_pending",
        mobile_ready: false,
        mobile_ready_at: null,
        mobile_ready_by_email: null,
        o2_pending_at: new Date().toISOString(),
        o2_pending_by_email: auth.user?.email ?? null,
        o2_validated_at: null,
        o2_validated_by_email: null,
        team_override: nextTeam,
      })
      .eq("id", entry.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/brief");
    revalidatePath("/referent");

    return {
      error: null,
      success: `${entry.bt_id} passe en attente O2.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Reaffectation impossible.",
      success: null,
    };
  }
}

export async function validateBriefBtO2Action(
  previousState: BriefBtWorkflowActionState,
  formData: FormData,
): Promise<BriefBtWorkflowActionState> {
  void previousState;

  const auth = await requireOfficeWriteModule("brief");

  try {
    const entryId = String(formData.get("entry_id") ?? "").trim();

    if (!entryId) {
      throw new Error("BT introuvable pour la validation O2.");
    }

    const { adminSupabase, entry } = await getBtEntryOrThrow(entryId);

    if (entry.superseded_at || entry.replaced_by_entry_id) {
      throw new Error("Ce BT a deja ete remplace.");
    }

    if (entry.brief_workflow_status !== "o2_pending") {
      throw new Error("Ce BT n'est pas en attente O2.");
    }

    const { error: updateError } = await adminSupabase
      .from("bt_import_entries")
      .update({
        brief_workflow_status: "o2_validated",
        o2_validated_at: new Date().toISOString(),
        o2_validated_by_email: auth.user?.email ?? null,
      })
      .eq("id", entry.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/brief");
    revalidatePath("/referent");

    return {
      error: null,
      success: `${entry.bt_id} est valide dans O2.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Validation O2 impossible.",
      success: null,
    };
  }
}

export async function replaceBriefBtAction(
  previousState: BriefBtWorkflowActionState,
  formData: FormData,
): Promise<BriefBtWorkflowActionState> {
  void previousState;

  const auth = await requireOfficeWriteModule("brief");

  try {
    const entryId = String(formData.get("entry_id") ?? "").trim();
    const replacementEntryId = String(formData.get("replacement_entry_id") ?? "").trim();

    if (!entryId || !replacementEntryId) {
      throw new Error("BT introuvable pour le remplacement.");
    }

    if (entryId === replacementEntryId) {
      throw new Error("Selectionnez un autre BT pour le remplacement.");
    }

    const { adminSupabase, entry } = await getBtEntryOrThrow(entryId);

    if (entry.superseded_at || entry.replaced_by_entry_id) {
      throw new Error("Ce BT a deja ete remplace.");
    }

    if (entry.brief_workflow_status !== "o2_validated") {
      throw new Error("Le BT doit d'abord etre valide dans O2 avant remplacement.");
    }

    const { entry: replacementEntry } = await getBtEntryOrThrow(replacementEntryId);

    if (!entry.import_day_id || replacementEntry.import_day_id !== entry.import_day_id) {
      throw new Error("Le BT de remplacement doit appartenir a la meme journee importee.");
    }

    if (replacementEntry.source_mode !== "unitary_import") {
      throw new Error("Le BT de remplacement doit provenir d'un import unitaire.");
    }

    if (replacementEntry.superseded_at || replacementEntry.replaced_by_entry_id || replacementEntry.replacement_of_entry_id) {
      throw new Error("Ce BT unitaire est deja utilise dans un autre remplacement.");
    }

    const sourceBt = buildBtSnapshot(entry);
    const effectiveTeam = getEffectiveTeam(sourceBt);
    const replacementPreparedAt = new Date().toISOString();

    const { error: replacementUpdateError } = await adminSupabase
      .from("bt_import_entries")
      .update({
        brief_workflow_status: "normal",
        mobile_ready: false,
        mobile_ready_at: null,
        mobile_ready_by_email: null,
        o2_pending_at: null,
        o2_pending_by_email: null,
        o2_validated_at: null,
        o2_validated_by_email: null,
        replacement_of_entry_id: entry.id,
        team_override: effectiveTeam.length > 0 ? effectiveTeam : null,
      })
      .eq("id", replacementEntry.id);

    if (replacementUpdateError) {
      throw new Error(replacementUpdateError.message);
    }

    const { error: sourceUpdateError } = await adminSupabase
      .from("bt_import_entries")
      .update({
        mobile_ready: false,
        mobile_ready_at: null,
        mobile_ready_by_email: null,
        replaced_by_entry_id: replacementEntry.id,
        superseded_at: replacementPreparedAt,
        superseded_by_email: auth.user?.email ?? null,
      })
      .eq("id", entry.id);

    if (sourceUpdateError) {
      throw new Error(sourceUpdateError.message);
    }

    revalidatePath("/brief");
    revalidatePath("/referent");

    return {
      error: null,
      success: `${entry.bt_id} a ete remplace par ${replacementEntry.bt_id}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Remplacement BT impossible.",
      success: null,
    };
  }
}
