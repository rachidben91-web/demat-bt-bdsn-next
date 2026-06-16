"use server";

import { refresh } from "next/cache";
import { requireOfficeWriteModule } from "@/lib/auth";
import type { ExtractedBt, ExtractedTeamMember } from "@/lib/pdf-import/types";
import { getBtPreparationIssues } from "@/lib/referent-dispatch";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export type ReferentBtPreparationActionState = {
  error: string | null;
  success: string | null;
};

type BtImportEntryLookupRow = {
  id: string;
  bt_id: string;
  page_start: number;
  objet: string;
  client: string;
  localisation: string;
  team: unknown;
  team_override?: unknown;
  mobile_ready?: boolean | null;
  brief_workflow_status?: string | null;
  replaced_by_entry_id?: string | null;
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

function buildPreparationCandidate(row: BtImportEntryLookupRow): ExtractedBt {
  return {
    id: row.bt_id,
    pageStart: row.page_start,
    objet: row.objet,
    datePrevue: "",
    client: row.client,
    localisation: row.localisation,
    atNum: "",
    designation: "",
    duree: "",
    analyseDesRisques: "",
    observations: "",
    team: parseTeam(row.team),
    teamOverride: parseTeam(row.team_override),
    docs: [],
    mobileReady: Boolean(row.mobile_ready),
    briefWorkflowStatus:
      row.brief_workflow_status === "o2_pending" || row.brief_workflow_status === "o2_validated"
        ? row.brief_workflow_status
        : "normal",
    replacedByEntryId: row.replaced_by_entry_id ?? null,
    supersededAt: row.superseded_at ?? null,
  };
}

export async function prepareBtForMobileAction(
  previousState: ReferentBtPreparationActionState,
  formData: FormData,
): Promise<ReferentBtPreparationActionState> {
  void previousState;

  const auth = await requireOfficeWriteModule("referent");
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
    };
  }

  try {
    const importDayId = String(formData.get("import_day_id") ?? "").trim();
    const btId = String(formData.get("bt_id") ?? "").trim();
    const pageStart = Number(String(formData.get("page_start") ?? "").trim());
    const preparedByEmail = auth.user?.email ?? null;

    if (!importDayId || !btId || !Number.isFinite(pageStart) || pageStart <= 0) {
      throw new Error("BT introuvable pour la preparation mobile.");
    }

    if (!preparedByEmail) {
      throw new Error("Utilisateur non authentifie.");
    }

    const { data, error } = await adminSupabase
      .from("bt_import_entries")
      .select("*")
      .eq("import_day_id", importDayId)
      .eq("bt_id", btId)
      .eq("page_start", pageStart)
      .maybeSingle<BtImportEntryLookupRow>();

    if (error || !data) {
      throw new Error(error?.message ?? "BT introuvable.");
    }

    const hasPreparationSchema = Object.prototype.hasOwnProperty.call(data, "mobile_ready");

    if (!hasPreparationSchema) {
      throw new Error("La migration de preparation mobile doit etre appliquee avant cette action.");
    }

    if (data.mobile_ready) {
      return {
        error: null,
        success: `${data.bt_id} est deja pret pour mobile.`,
      };
    }

    const candidate = buildPreparationCandidate(data);
    const issues = getBtPreparationIssues(candidate);

    if (issues.length > 0) {
      throw new Error(issues.join(" "));
    }

    const preparedAt = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from("bt_import_entries")
      .update({
        mobile_ready: true,
        mobile_ready_at: preparedAt,
        mobile_ready_by_email: preparedByEmail,
      })
      .eq("id", data.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    refresh();

    return {
      error: null,
      success: `${data.bt_id} est pret pour le prochain envoi mobile.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Preparation mobile impossible.",
      success: null,
    };
  }
}
