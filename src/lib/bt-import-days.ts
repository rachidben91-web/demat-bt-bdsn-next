import type {
  BtBriefWorkflowStatus,
  BtSourceMode,
  ExtractedBt,
  ExtractedBtDocument,
  ExtractedTeamMember,
} from "@/lib/pdf-import/types";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type BtImportDaySummary = {
  id: string;
  dayDate: string;
  siteCode: string;
  sourcePdfName: string;
  sourcePdfStoragePath: string | null;
  pageCount: number;
  btCount: number;
  importedByEmail: string | null;
  importedAt: string;
  updatedAt: string;
};

export type BtImportDayOverview = {
  currentDay: BtImportDaySummary | null;
  bts: ExtractedBt[];
  days: BtImportDaySummary[];
  source: "supabase" | "mock";
};

type BtImportDayRow = {
  id: string;
  day_date: string;
  site_code: string;
  source_pdf_name: string;
  source_pdf_storage_path: string | null;
  page_count: number;
  bt_count: number;
  imported_by_email: string | null;
  imported_at: string;
  updated_at: string;
};

type BtImportEntryRow = {
  id: string;
  bt_id: string;
  page_start: number;
  objet: string;
  date_prevue: string;
  client: string;
  localisation: string;
  at_num: string;
  designation: string;
  duree: string;
  analyse_des_risques: string;
  observations: string;
  team: unknown;
  docs: unknown;
  mobile_ready?: boolean | null;
  mobile_ready_at?: string | null;
  mobile_ready_by_email?: string | null;
  source_mode?: string | null;
  brief_workflow_status?: string | null;
  team_override?: unknown;
  workflow_note?: string | null;
  o2_pending_at?: string | null;
  o2_pending_by_email?: string | null;
  o2_validated_at?: string | null;
  o2_validated_by_email?: string | null;
  replacement_of_entry_id?: string | null;
  replaced_by_entry_id?: string | null;
  superseded_at?: string | null;
  superseded_by_email?: string | null;
  derived_pdf_storage_path: string | null;
  derived_pdf_page_count: number | null;
  created_at?: string;
};

function parseSourceMode(value: string | null | undefined): BtSourceMode {
  return value === "unitary_import" ? "unitary_import" : "daily_pdf";
}

function parseBriefWorkflowStatus(value: string | null | undefined): BtBriefWorkflowStatus {
  if (value === "o2_pending" || value === "o2_validated") {
    return value;
  }

  return "normal";
}

function mapDayRow(row: BtImportDayRow): BtImportDaySummary {
  return {
    id: row.id,
    dayDate: row.day_date,
    siteCode: row.site_code,
    sourcePdfName: row.source_pdf_name,
    sourcePdfStoragePath: row.source_pdf_storage_path,
    pageCount: row.page_count,
    btCount: row.bt_count,
    importedByEmail: row.imported_by_email,
    importedAt: row.imported_at,
    updatedAt: row.updated_at,
  };
}

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

function parseDocs(value: unknown): ExtractedBtDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((doc) => {
      if (!doc || typeof doc !== "object") {
        return null;
      }

      const candidate = doc as Record<string, unknown>;

      return {
        page: typeof candidate.page === "number" ? candidate.page : 0,
        type: typeof candidate.type === "string" ? candidate.type : "DOC",
      } as ExtractedBtDocument;
    })
    .filter((doc): doc is ExtractedBtDocument => doc !== null && doc.page > 0);
}

function mapEntryRow(row: BtImportEntryRow): ExtractedBt {
  return {
    entryId: row.id,
    id: row.bt_id,
    pageStart: row.page_start,
    objet: row.objet,
    datePrevue: row.date_prevue,
    client: row.client,
    localisation: row.localisation,
    atNum: row.at_num,
    designation: row.designation,
    duree: row.duree,
    analyseDesRisques: row.analyse_des_risques,
    observations: row.observations,
    team: parseTeam(row.team),
    docs: parseDocs(row.docs),
    derivedPdfStoragePath: row.derived_pdf_storage_path,
    derivedPdfPageCount: row.derived_pdf_page_count,
    mobileReady: Boolean(row.mobile_ready),
    mobileReadyAt: row.mobile_ready_at ?? null,
    mobileReadyByEmail: row.mobile_ready_by_email ?? null,
    sourceMode: parseSourceMode(row.source_mode),
    briefWorkflowStatus: parseBriefWorkflowStatus(row.brief_workflow_status),
    teamOverride: parseTeam(row.team_override),
    workflowNote: row.workflow_note ?? null,
    o2PendingAt: row.o2_pending_at ?? null,
    o2PendingByEmail: row.o2_pending_by_email ?? null,
    o2ValidatedAt: row.o2_validated_at ?? null,
    o2ValidatedByEmail: row.o2_validated_by_email ?? null,
    replacementOfEntryId: row.replacement_of_entry_id ?? null,
    replacedByEntryId: row.replaced_by_entry_id ?? null,
    supersededAt: row.superseded_at ?? null,
    supersededByEmail: row.superseded_by_email ?? null,
  };
}

export async function getBtImportDayOverview(
  selectedDate?: string,
): Promise<BtImportDayOverview> {
  if (!isSupabaseConfigured()) {
    return {
      currentDay: null,
      bts: [],
      days: [],
      source: "mock",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: daysData, error: daysError } = await supabase
    .from("bt_import_days")
    .select(
      "id, day_date, site_code, source_pdf_name, source_pdf_storage_path, page_count, bt_count, imported_by_email, imported_at, updated_at",
    )
    .order("day_date", { ascending: false });

  if (daysError) {
    return {
      currentDay: null,
      bts: [],
      days: [],
      source: "mock",
    };
  }

  const days = ((daysData ?? []) as BtImportDayRow[]).map(mapDayRow);
  const currentDay = days.find((day) => day.dayDate === selectedDate) ?? days[0] ?? null;

  if (!currentDay) {
    return {
      currentDay: null,
      bts: [],
      days,
      source: "supabase",
    };
  }

  const { data: entriesData, error: entriesError } = await supabase
    .from("bt_import_entries")
    .select("*")
    .eq("import_day_id", currentDay.id)
    .order("page_start", { ascending: true });

  if (entriesError) {
    return {
      currentDay,
      bts: [],
      days,
      source: "supabase",
    };
  }

  return {
    currentDay,
    bts: ((entriesData ?? []) as BtImportEntryRow[]).map(mapEntryRow),
    days,
    source: "supabase",
  };
}
