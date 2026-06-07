import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type DepartureInstruction = "agency" | "direct" | "confirm";

export type MobileDispatchBtPayload = {
  btId: string;
  client: string;
  localisation: string;
  objet: string;
  pageStart: number;
};

export type MobileDispatchItem = {
  id: string;
  acknowledgedAt: string | null;
  acknowledgedByEmail: string | null;
  activitySummary: string;
  btCount: number;
  btPayload: MobileDispatchBtPayload[];
  departureInstruction: DepartureInstruction;
  managerName: string | null;
  missionDate: string;
  observation: string | null;
  officeAccountId: string | null;
  publishedAt: string;
  siteCode: string | null;
  technicianId: string;
  technicianName: string;
  workMode: string | null;
};

export type MobileDispatchStatusSnapshot = {
  acknowledgedAt: string | null;
  acknowledgedByEmail: string | null;
  departureInstruction: DepartureInstruction;
  publishedAt: string;
  technicianId: string;
  technicianName: string;
};

type MobileDispatchItemRow = {
  id: string;
  acknowledged_at: string | null;
  acknowledged_by_email: string | null;
  activity_summary: string;
  bt_count: number;
  bt_payload: unknown;
  departure_instruction: DepartureInstruction;
  manager_name: string | null;
  mission_date: string;
  observation: string | null;
  office_account_id: string | null;
  published_at: string;
  site_code: string | null;
  technician_id: string;
  technician_name: string;
  work_mode: string | null;
};

function parseBtPayload(value: unknown): MobileDispatchBtPayload[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Record<string, unknown>;

      return {
        btId: typeof candidate.btId === "string" ? candidate.btId : "",
        client: typeof candidate.client === "string" ? candidate.client : "",
        localisation: typeof candidate.localisation === "string" ? candidate.localisation : "",
        objet: typeof candidate.objet === "string" ? candidate.objet : "",
        pageStart: typeof candidate.pageStart === "number" ? candidate.pageStart : 0,
      };
    })
    .filter((item): item is MobileDispatchBtPayload => Boolean(item?.btId));
}

function mapMobileDispatchItem(row: MobileDispatchItemRow): MobileDispatchItem {
  return {
    id: row.id,
    acknowledgedAt: row.acknowledged_at,
    acknowledgedByEmail: row.acknowledged_by_email,
    activitySummary: row.activity_summary,
    btCount: row.bt_count,
    btPayload: parseBtPayload(row.bt_payload),
    departureInstruction: row.departure_instruction,
    managerName: row.manager_name,
    missionDate: row.mission_date,
    observation: row.observation,
    officeAccountId: row.office_account_id,
    publishedAt: row.published_at,
    siteCode: row.site_code,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
    workMode: row.work_mode,
  };
}

async function getServerReader() {
  const adminSupabase = createServerSupabaseAdminClient();

  if (adminSupabase) {
    return adminSupabase;
  }

  return createServerSupabaseClient();
}

export async function getLatestMobileDispatchForTechnician(
  technicianId: string,
  officeAccountId?: string | null,
): Promise<MobileDispatchItem | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await getServerReader();
  let query = supabase
    .from("mobile_dispatch_items")
    .select(
      "id, acknowledged_at, acknowledged_by_email, activity_summary, bt_count, bt_payload, departure_instruction, manager_name, mission_date, observation, office_account_id, published_at, site_code, technician_id, technician_name, work_mode",
    )
    .eq("technician_id", technicianId)
    .order("mission_date", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(1);

  if (officeAccountId) {
    query = query.eq("office_account_id", officeAccountId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMobileDispatchItem(data as MobileDispatchItemRow);
}

export async function getMobileDispatchStatusesForMissionDate(
  missionDate: string,
  technicianIds: string[] = [],
): Promise<Record<string, MobileDispatchStatusSnapshot>> {
  if (!isSupabaseConfigured() || !missionDate) {
    return {};
  }

  const supabase = await getServerReader();
  let query = supabase
    .from("mobile_dispatch_items")
    .select(
      "acknowledged_at, acknowledged_by_email, departure_instruction, published_at, technician_id, technician_name",
    )
    .eq("mission_date", missionDate);

  if (technicianIds.length > 0) {
    query = query.in("technician_id", technicianIds);
  }

  const { data, error } = await query.order("published_at", { ascending: false });

  if (error || !data) {
    return {};
  }

  return data.reduce<Record<string, MobileDispatchStatusSnapshot>>((accumulator, row) => {
    const technicianId = typeof row.technician_id === "string" ? row.technician_id : "";

    if (!technicianId || accumulator[technicianId]) {
      return accumulator;
    }

    accumulator[technicianId] = {
      acknowledgedAt: typeof row.acknowledged_at === "string" ? row.acknowledged_at : null,
      acknowledgedByEmail: typeof row.acknowledged_by_email === "string" ? row.acknowledged_by_email : null,
      departureInstruction:
        row.departure_instruction === "agency" ||
        row.departure_instruction === "direct" ||
        row.departure_instruction === "confirm"
          ? row.departure_instruction
          : "confirm",
      publishedAt: typeof row.published_at === "string" ? row.published_at : "",
      technicianId,
      technicianName: typeof row.technician_name === "string" ? row.technician_name : "",
    };

    return accumulator;
  }, {});
}
