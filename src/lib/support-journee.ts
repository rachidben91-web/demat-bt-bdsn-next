import {
  activityDefinitions as fallbackActivityDefinitions,
  dailyAssignments as fallbackDailyAssignments,
  historyEntries as fallbackHistoryEntries,
  supportMetrics as fallbackSupportMetrics,
  supportSummary as fallbackSupportSummary,
  technicians as fallbackTechnicians,
} from "@/data/support-journee";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getSupportWeatherBundle,
  type DayWeatherZone,
  type HeaderWeatherZone,
} from "@/lib/weather";

export type ActivityStatus = "Present" | "Absent" | "Greve";

export type TechnicianOption = {
  id: string;
  nni: string;
  name: string;
  lastName: string;
  firstName: string;
  site: string;
  manager: string;
  role: string;
  color: string;
  ptc: boolean;
  ptd: boolean;
};

export type ActivityOption = {
  id: string;
  label: string;
  color: string;
  status: ActivityStatus;
};

export type DailyAssignmentRow = {
  id: string;
  rank: number;
  technicianId: string;
  agent: string;
  workMode: string;
  activity: string | null;
  observations: string;
  briefAgence: string;
  briefDistance: string;
  debriefAgence: string;
  debriefDistance: string;
  gtv: string;
};

export type HistoryRow = {
  id: string;
  date: string;
  agent: string;
  activity: string;
  observation: string;
  brief: string;
  debrief: string;
  grv: string;
};

export type AvailableSupportDay = {
  date: string;
  hasData: boolean;
};

export type SupportJourneeData = {
  activityDefinitions: ActivityOption[];
  dailyAssignments: DailyAssignmentRow[];
  headerWeather: {
    generatedAtLabel: string;
    zones: HeaderWeatherZone[];
  };
  dayWeather: DayWeatherZone[];
  historyEntries: HistoryRow[];
  availableDates: AvailableSupportDay[];
  supportMetrics: {
    presents: number;
    absents: number;
    greve: number;
    totalDays: number;
    totalRows: number;
    topActivity: string;
  };
  supportSummary: {
    dayId: string | null;
    dayDate: string | null;
    dateLabel: string;
    weekLabel: string;
    lastUpdate: string;
    editStatus: string;
    server: string;
    weatherNote: string;
    globalObservation: string;
    savedDayStatus: string;
    lockedBy: string | null;
    lockedAt: string | null;
  };
  technicians: TechnicianOption[];
  source: "supabase" | "mock";
};

type ManagerRow = {
  name: string | null;
};

type TechnicianRow = {
  id: string;
  nni: string;
  last_name: string;
  first_name: string;
  display_name: string;
  site: string;
  role: string;
  color: string | null;
  ptc: boolean;
  ptd: boolean;
  sort_order: number;
  managers: ManagerRow | ManagerRow[] | null;
};

type ActivityRow = {
  id: string;
  code: string;
  label: string;
  color: string | null;
  status: "present" | "absent" | "greve";
  display_order: number;
};

type SupportDayRow = {
  id: string;
  day_date: string;
  week_label: string | null;
  status: string;
  weather_note: string | null;
  server_label: string | null;
  global_observation: string | null;
  last_modified_by: string | null;
  last_modified_at: string | null;
  locked_by: string | null;
  locked_at: string | null;
};

type SupportEntryRow = {
  support_day_id?: string;
  id: string;
  technician_id: string;
  activity_id: string | null;
  work_mode: string | null;
  observation: string | null;
  brief_agency: string | null;
  brief_remote: string | null;
  debrief_agency: string | null;
  debrief_remote: string | null;
  gtv: string | null;
  display_order: number;
};

function mapStatus(status: "present" | "absent" | "greve"): ActivityStatus {
  if (status === "present") {
    return "Present";
  }

  if (status === "greve") {
    return "Greve";
  }

  return "Absent";
}

function getManagerName(managers: ManagerRow | ManagerRow[] | null) {
  if (Array.isArray(managers)) {
    return managers[0]?.name ?? "Non assigne";
  }

  return managers?.name ?? "Non assigne";
}

function formatDateLabel(dayDate: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dayDate}T12:00:00Z`));
}

function formatDateInput(dayDate: string) {
  const date = new Date(`${dayDate}T12:00:00Z`);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Aucune modification";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function fallbackData(): SupportJourneeData {
  return {
    activityDefinitions: fallbackActivityDefinitions,
    dailyAssignments: fallbackDailyAssignments,
    headerWeather: {
      generatedAtLabel: "Météo indisponible",
      zones: [],
    },
    dayWeather: [],
    historyEntries: fallbackHistoryEntries,
    availableDates: [],
    supportMetrics: fallbackSupportMetrics,
    supportSummary: {
      ...fallbackSupportSummary,
      dayId: null,
      dayDate: null,
      globalObservation: "",
      lockedBy: null,
      lockedAt: null,
    },
    technicians: fallbackTechnicians,
    source: "mock",
  };
}

function formatWeekLabel(dayDate: string) {
  const date = new Date(`${dayDate}T12:00:00Z`);
  const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const daysSinceYearStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / 86400000,
  );
  const weekNumber = Math.ceil((daysSinceYearStart + startOfYear.getUTCDay() + 1) / 7);

  return `Semaine ${weekNumber}`;
}

function buildEmptyAssignments(technicians: TechnicianOption[]): DailyAssignmentRow[] {
  return technicians.map((technician, index) => ({
    id: `virtual-${technician.id}`,
    rank: index + 1,
    technicianId: technician.id,
    agent: technician.name,
    workMode:
      technician.ptc && technician.ptd
        ? "PTC-PTD"
        : technician.ptc
          ? "PTC"
          : technician.ptd
            ? "PTD"
            : "—",
    activity: null,
    observations: "—",
    briefAgence: "—",
    briefDistance: "—",
    debriefAgence: "—",
    debriefDistance: "—",
    gtv: "—",
  }));
}

export async function getSupportJourneeData(selectedDate?: string): Promise<SupportJourneeData> {
  const resolvedDate = selectedDate ?? new Date().toISOString().slice(0, 10);
  const weatherBundle = await getSupportWeatherBundle(resolvedDate).catch(() => ({
    generatedAtLabel: "Météo indisponible",
    headerZones: [] as HeaderWeatherZone[],
    dayZones: [] as DayWeatherZone[],
    weatherNote: "Aucune prevision disponible.",
  }));
  const fallback = fallbackData();

  if (!isSupabaseConfigured()) {
    return {
      ...fallback,
      headerWeather: {
        generatedAtLabel: weatherBundle.generatedAtLabel,
        zones: weatherBundle.headerZones,
      },
      dayWeather: weatherBundle.dayZones,
      supportSummary: {
        ...fallback.supportSummary,
        dayDate: resolvedDate,
        weatherNote: weatherBundle.weatherNote,
      },
    };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const [
      techniciansResult,
      activitiesResult,
      supportDaysCountResult,
      supportDaysResult,
    ] = await Promise.all([
      supabase
        .from("technicians")
        .select(
          "id, nni, last_name, first_name, display_name, site, role, color, ptc, ptd, sort_order, managers(name)",
        )
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("activity_definitions")
        .select("id, code, label, color, status, display_order")
        .eq("active", true)
        .order("display_order", { ascending: true }),
      supabase.from("support_days").select("*", { count: "exact", head: true }),
      supabase
        .from("support_days")
        .select(
          "id, day_date, week_label, status, weather_note, server_label, global_observation, last_modified_by, last_modified_at, locked_by, locked_at",
        )
        .order("day_date", { ascending: false }),
    ]);

    if (
      techniciansResult.error ||
      activitiesResult.error ||
      supportDaysCountResult.error ||
      supportDaysResult.error
    ) {
      return {
        ...fallback,
        headerWeather: {
          generatedAtLabel: weatherBundle.generatedAtLabel,
          zones: weatherBundle.headerZones,
        },
        dayWeather: weatherBundle.dayZones,
        supportSummary: {
          ...fallback.supportSummary,
          dayDate: resolvedDate,
          weatherNote: weatherBundle.weatherNote,
        },
      };
    }

    const technicians = ((techniciansResult.data ?? []) as TechnicianRow[]).map((item) => ({
      id: item.id,
      nni: item.nni,
      name: item.display_name,
      lastName: item.last_name,
      firstName: item.first_name,
      site: item.site,
      manager: getManagerName(item.managers),
      role: item.role,
      color: item.color ?? "#94a3b8",
      ptc: item.ptc,
      ptd: item.ptd,
    }));

    const activityDefinitions = ((activitiesResult.data ?? []) as ActivityRow[]).map((item) => ({
      id: item.id,
      label: item.label,
      color: item.color ?? "#cbd5e1",
      status: mapStatus(item.status),
    }));

    const supportDays = (supportDaysResult.data ?? []) as SupportDayRow[];
    const effectiveDate = selectedDate ?? supportDays[0]?.day_date ?? resolvedDate;
    const supportDay = supportDays.find((item) => item.day_date === effectiveDate) ?? null;

    const allEntriesResult = supportDays.length
      ? await supabase
          .from("support_day_entries")
          .select(
            "support_day_id, id, technician_id, activity_id, work_mode, observation, brief_agency, brief_remote, debrief_agency, debrief_remote, gtv, display_order",
          )
          .in(
            "support_day_id",
            supportDays.map((item) => item.id),
          )
      : { data: [], error: null };

    if (allEntriesResult.error) {
      return fallbackData();
    }

    const entries = ((allEntriesResult.data ?? []) as SupportEntryRow[])
      .filter((entry) => (supportDay ? entry.support_day_id === supportDay.id : false))
      .sort((left, right) => left.display_order - right.display_order);
    const technicianById = new Map(technicians.map((item) => [item.id, item]));
    const activityById = new Map(
      ((activitiesResult.data ?? []) as ActivityRow[]).map((item) => [item.id, item]),
    );

    const persistedAssignments = entries.map((entry, index) => {
      const technician = technicianById.get(entry.technician_id);
      const activity = entry.activity_id ? activityById.get(entry.activity_id) : null;
      const workMode =
        entry.work_mode && entry.work_mode !== "NONE"
          ? entry.work_mode
          : technician?.ptc && technician?.ptd
            ? "PTC-PTD"
            : technician?.ptc
              ? "PTC"
              : technician?.ptd
                ? "PTD"
                : "—";

      return {
        id: entry.id,
        rank: index + 1,
        technicianId: entry.technician_id,
        agent: technician?.name ?? "Technicien inconnu",
        workMode,
        activity: activity?.label ?? null,
        observations: entry.observation ?? "—",
        briefAgence: entry.brief_agency ?? "—",
        briefDistance: entry.brief_remote ?? "—",
        debriefAgence: entry.debrief_agency ?? "—",
        debriefDistance: entry.debrief_remote ?? "—",
        gtv: entry.gtv ?? "—",
      };
    });
    const dailyAssignments = supportDay
      ? persistedAssignments
      : buildEmptyAssignments(technicians);

    const dayStateByDate = new Map<string, boolean>();
    supportDays.forEach((day) => dayStateByDate.set(day.day_date, false));
    ((allEntriesResult.data ?? []) as SupportEntryRow[]).forEach((entry) => {
      const relatedDay = supportDays.find((day) => day.id === entry.support_day_id);

      if (!relatedDay) {
        return;
      }

      const hasData =
        entry.activity_id !== null ||
        entry.observation !== null ||
        entry.brief_agency !== null ||
        entry.brief_remote !== null ||
        entry.debrief_agency !== null ||
        entry.debrief_remote !== null ||
        entry.gtv !== null;

      if (hasData) {
        dayStateByDate.set(relatedDay.day_date, true);
      }
    });

    const counts = dailyAssignments.reduce(
      (accumulator, entry) => {
        const activity = entries.find((item) => item.id === entry.id);
        const activityRow = activity?.activity_id ? activityById.get(activity.activity_id) : null;
        const status = activityRow?.status;

        if (status === "greve") {
          accumulator.greve += 1;
        } else if (status === "absent") {
          accumulator.absents += 1;
        } else if (status === "present") {
          accumulator.presents += 1;
        }

        if (activityRow?.label) {
          accumulator.activityCounts.set(
            activityRow.label,
            (accumulator.activityCounts.get(activityRow.label) ?? 0) + 1,
          );
        }

        return accumulator;
      },
      {
        presents: 0,
        absents: 0,
        greve: 0,
        activityCounts: new Map<string, number>(),
      },
    );

    let topActivity = "Aucune";
    let topActivityCount = 0;

    counts.activityCounts.forEach((value, key) => {
      if (value > topActivityCount) {
        topActivity = key;
        topActivityCount = value;
      }
    });

    const fallbackSnapshotHistory = dailyAssignments
      .filter(
        (entry) =>
          entry.activity !== null ||
          entry.observations !== "—" ||
          entry.briefAgence !== "—" ||
          entry.briefDistance !== "—" ||
          entry.debriefAgence !== "—" ||
          entry.debriefDistance !== "—" ||
          entry.gtv !== "—",
      )
      .map((entry) => ({
        id: `snapshot-${supportDay?.id ?? effectiveDate}-${entry.id}`,
        date: formatDateInput(effectiveDate),
        agent: entry.agent,
        activity: entry.activity ?? "—",
        observation: entry.observations === "—" ? "" : entry.observations,
        brief:
          entry.briefAgence !== "—" || entry.briefDistance !== "—"
            ? `Agence: ${entry.briefAgence} / Distance: ${entry.briefDistance}`
            : "",
        debrief:
          entry.debriefAgence !== "—" || entry.debriefDistance !== "—"
            ? `Agence: ${entry.debriefAgence} / Distance: ${entry.debriefDistance}`
            : "",
        grv: entry.gtv !== "—" ? entry.gtv : "",
      }));

    const supportDayById = new Map(supportDays.map((day) => [day.id, day]));
    const allEntries = (allEntriesResult.data ?? []) as SupportEntryRow[];
    const filledHistoryEntries = allEntries
      .filter(
        (entry) =>
          entry.activity_id !== null ||
          entry.observation !== null ||
          entry.brief_agency !== null ||
          entry.brief_remote !== null ||
          entry.debrief_agency !== null ||
          entry.debrief_remote !== null ||
          entry.gtv !== null,
      )
      .map((entry) => {
        const relatedDay = entry.support_day_id
          ? supportDayById.get(entry.support_day_id)
          : undefined;
        const relatedTechnician = technicianById.get(entry.technician_id);
        const relatedActivity = entry.activity_id
          ? activityById.get(entry.activity_id)
          : undefined;

        return {
          id: `filled-${entry.id}`,
          date: relatedDay ? formatDateInput(relatedDay.day_date) : "—",
          agent: relatedTechnician?.name ?? "Inconnu",
          activity: relatedActivity?.label ?? "—",
          observation: entry.observation ?? "",
          brief:
            entry.brief_agency || entry.brief_remote
              ? `Agence: ${entry.brief_agency ?? "—"} / Distance: ${entry.brief_remote ?? "—"}`
              : "",
          debrief:
            entry.debrief_agency || entry.debrief_remote
              ? `Agence: ${entry.debrief_agency ?? "—"} / Distance: ${entry.debrief_remote ?? "—"}`
              : "",
          grv: entry.gtv ?? "",
        };
      })
      .sort((left, right) => right.date.localeCompare(left.date));

    return {
      activityDefinitions,
      dailyAssignments,
      headerWeather: {
        generatedAtLabel: weatherBundle.generatedAtLabel,
        zones: weatherBundle.headerZones,
      },
      dayWeather: weatherBundle.dayZones,
      historyEntries:
        filledHistoryEntries.length > 0 ? filledHistoryEntries : fallbackSnapshotHistory,
      availableDates: supportDays.map((day) => ({
        date: day.day_date,
        hasData: dayStateByDate.get(day.day_date) ?? false,
      })),
      supportMetrics: {
        presents: counts.presents,
        absents: counts.absents,
        greve: counts.greve,
        totalDays: supportDaysCountResult.count ?? 0,
        totalRows: supportDay ? entries.length : technicians.length,
        topActivity:
          topActivityCount > 0 ? `${topActivity} (${topActivityCount})` : "Aucune",
      },
      supportSummary: {
        dayId: supportDay?.id ?? null,
        dayDate: effectiveDate,
        dateLabel: formatDateLabel(effectiveDate),
        weekLabel: supportDay?.week_label ?? formatWeekLabel(effectiveDate),
        lastUpdate: formatTimestamp(supportDay?.last_modified_at ?? null),
        editStatus: supportDay?.status ?? "draft",
        server: supportDay?.server_label ?? "Supabase",
        weatherNote: weatherBundle.weatherNote || supportDay?.weather_note || "Aucune prevision disponible.",
        globalObservation: supportDay?.global_observation ?? "",
        savedDayStatus: supportDay
          ? `Jour charge : ${formatDateInput(effectiveDate)} — ${entries.length} lignes`
          : `Jour non initialise : ${formatDateInput(effectiveDate)}`,
        lockedBy: supportDay?.locked_by ?? null,
        lockedAt: supportDay?.locked_at ?? null,
      },
      technicians,
      source: "supabase",
    };
  } catch {
    return {
      ...fallback,
      headerWeather: {
        generatedAtLabel: weatherBundle.generatedAtLabel,
        zones: weatherBundle.headerZones,
      },
      dayWeather: weatherBundle.dayZones,
      supportSummary: {
        ...fallback.supportSummary,
        dayDate: resolvedDate,
        weatherNote: weatherBundle.weatherNote,
      },
    };
  }
}
