"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeWriteModule } from "@/lib/auth";
import { getEffectiveTeam } from "@/lib/bt-workflow";
import type { ExtractedBt, ExtractedTeamMember, PdfImportAnalysis } from "@/lib/pdf-import/types";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export type BriefBtWorkflowActionState = {
  error: string | null;
  success: string | null;
};

export type SaveUnitaryBtImportResult = {
  entryId?: string;
  importedBtId?: string;
  message: string;
  ok: boolean;
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

type ManagerLookupRow = {
  id: string;
  name: string;
};

type ReferentLookupRow = {
  full_name: string;
  id: string;
};

type ImportDayLookupRow = {
  day_date: string;
  id: string;
};

type UnitaryImportLookupRow = {
  bt_id: string;
  id: string;
  page_start: number;
  replaced_by_entry_id?: string | null;
  replacement_of_entry_id?: string | null;
  source_mode?: string | null;
  superseded_at?: string | null;
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

function parseSelectedAssignmentIds(values: string[]) {
  const technicianIds: string[] = [];
  const managerIds: string[] = [];
  const referentIds: string[] = [];

  for (const value of values) {
    if (value.startsWith("manager:")) {
      managerIds.push(value.slice("manager:".length));
      continue;
    }

    if (value.startsWith("referent:")) {
      referentIds.push(value.slice("referent:".length));
      continue;
    }

    technicianIds.push(value);
  }

  return { managerIds, referentIds, technicianIds };
}

export async function saveUnitaryBtImportAction(
  importDayId: string,
  analysis: PdfImportAnalysis,
): Promise<SaveUnitaryBtImportResult> {
  const auth = await requireOfficeWriteModule("brief");

  try {
    if (!importDayId) {
      throw new Error("Journee introuvable pour l'import unitaire.");
    }

    if (analysis.bts.length === 0) {
      throw new Error("Aucun BT n'a ete detecte dans le PDF.");
    }

    if (analysis.bts.length > 1) {
      throw new Error("Le PDF unitaire doit contenir un seul BT.");
    }

    const unitaryBt = analysis.bts[0];

    if (!unitaryBt.derivedPdfStoragePath) {
      throw new Error("Le dossier PDF derive du BT est manquant.");
    }

    const adminSupabase = createServerSupabaseAdminClient();

    if (!adminSupabase) {
      throw new Error("Client admin Supabase indisponible. Verifie la cle service role.");
    }

    const { data: dayRow, error: dayError } = await adminSupabase
      .from("bt_import_days")
      .select("id, day_date")
      .eq("id", importDayId)
      .maybeSingle<ImportDayLookupRow>();

    if (dayError || !dayRow) {
      throw new Error(dayError?.message ?? "Journee importee introuvable.");
    }

    const { data: existingEntries, error: existingEntriesError } = await adminSupabase
      .from("bt_import_entries")
      .select("id, bt_id, page_start, source_mode, replacement_of_entry_id, replaced_by_entry_id, superseded_at")
      .eq("import_day_id", importDayId)
      .order("page_start", { ascending: false });

    if (existingEntriesError) {
      throw new Error(existingEntriesError.message);
    }

    const existingRows = (existingEntries ?? []) as UnitaryImportLookupRow[];
    const reusableEntry =
      existingRows.find(
        (entry) =>
          entry.bt_id === unitaryBt.id &&
          entry.source_mode === "unitary_import" &&
          !entry.replacement_of_entry_id &&
          !entry.replaced_by_entry_id &&
          !entry.superseded_at,
      ) ?? null;
    const nextPageStart = Math.max(0, ...existingRows.map((entry) => entry.page_start)) + 1;
    const entryPayload = {
      analyse_des_risques: unitaryBt.analyseDesRisques,
      at_num: unitaryBt.atNum,
      brief_workflow_status: "normal",
      bt_id: unitaryBt.id,
      client: unitaryBt.client,
      date_prevue: unitaryBt.datePrevue,
      derived_pdf_page_count: unitaryBt.derivedPdfPageCount ?? null,
      derived_pdf_storage_path: unitaryBt.derivedPdfStoragePath,
      designation: unitaryBt.designation,
      docs: unitaryBt.docs,
      duree: unitaryBt.duree,
      import_day_id: importDayId,
      localisation: unitaryBt.localisation,
      mobile_ready: false,
      mobile_ready_at: null,
      mobile_ready_by_email: null,
      o2_pending_at: null,
      o2_pending_by_email: null,
      o2_validated_at: null,
      o2_validated_by_email: null,
      objet: unitaryBt.objet,
      observations: unitaryBt.observations,
      page_start: reusableEntry?.page_start ?? nextPageStart,
      replaced_by_entry_id: null,
      replacement_of_entry_id: null,
      source_mode: "unitary_import",
      superseded_at: null,
      superseded_by_email: null,
      team: unitaryBt.team,
      team_override: null,
      workflow_note: null,
    };

    let entryId = reusableEntry?.id ?? null;

    if (reusableEntry) {
      const { error: updateEntryError } = await adminSupabase
        .from("bt_import_entries")
        .update(entryPayload)
        .eq("id", reusableEntry.id);

      if (updateEntryError) {
        throw new Error(updateEntryError.message);
      }
    } else {
      const { data: insertedEntry, error: insertEntryError } = await adminSupabase
        .from("bt_import_entries")
        .insert(entryPayload)
        .select("id")
        .single<{ id: string }>();

      if (insertEntryError || !insertedEntry) {
        throw new Error(insertEntryError?.message ?? "Impossible d'enregistrer le BT unitaire.");
      }

      entryId = insertedEntry.id;
    }

    const totalEntries = reusableEntry ? existingRows.length : existingRows.length + 1;
    const { error: updateDayError } = await adminSupabase
      .from("bt_import_days")
      .update({
        bt_count: totalEntries,
        imported_by_email: auth.user?.email ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dayRow.id);

    if (updateDayError) {
      throw new Error(updateDayError.message);
    }

    revalidatePath("/brief");
    revalidatePath("/referent");

    return {
      entryId: entryId ?? undefined,
      importedBtId: unitaryBt.id,
      message: reusableEntry
        ? `${unitaryBt.id} a ete mis a jour dans la journee ${dayRow.day_date}.`
        : `${unitaryBt.id} a ete ajoute a la journee ${dayRow.day_date}.`,
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Import unitaire impossible.",
      ok: false,
    };
  }
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

    const { managerIds, referentIds, technicianIds } = parseSelectedAssignmentIds(selectedTechnicianIds);
    const [
      { data: technicianRows, error: techniciansError },
      { data: managerRows, error: managersError },
      { data: referentRows, error: referentsError },
    ] = await Promise.all([
      technicianIds.length > 0
        ? adminSupabase.from("technicians").select("id, display_name, nni").in("id", technicianIds)
        : Promise.resolve({ data: [], error: null }),
      managerIds.length > 0
        ? adminSupabase.from("managers").select("id, name").in("id", managerIds)
        : Promise.resolve({ data: [], error: null }),
      referentIds.length > 0
        ? adminSupabase.from("office_accounts").select("id, full_name").in("id", referentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (techniciansError) {
      throw new Error(techniciansError.message);
    }

    if (managersError) {
      throw new Error(managersError.message);
    }

    if (referentsError) {
      throw new Error(referentsError.message);
    }

    const technicianById = new Map(
      ((technicianRows ?? []) as TechnicianLookupRow[]).map((technician) => [technician.id, technician]),
    );
    const managerById = new Map(
      ((managerRows ?? []) as ManagerLookupRow[]).map((manager) => [manager.id, manager]),
    );
    const referentById = new Map(
      ((referentRows ?? []) as ReferentLookupRow[]).map((referent) => [referent.id, referent]),
    );

    const nextTeam = selectedTechnicianIds
      .map((selectedId) => {
        if (selectedId.startsWith("manager:")) {
          const manager = managerById.get(selectedId.slice("manager:".length));

          return manager
            ? {
                name: manager.name,
                nni: "",
              }
            : null;
        }

        if (selectedId.startsWith("referent:")) {
          const referent = referentById.get(selectedId.slice("referent:".length));

          return referent
            ? {
                name: referent.full_name,
                nni: "",
              }
            : null;
        }

        const technician = technicianById.get(selectedId);

        return technician
          ? {
              name: technician.display_name,
              nni: technician.nni,
            }
          : null;
      })
      .filter((technician): technician is ExtractedTeamMember => Boolean(technician));

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
