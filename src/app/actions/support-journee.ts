"use server";

import { requireOfficeWriteModule } from "@/lib/auth";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { refresh } from "next/cache";

type EditableAssignmentInput = {
  id: string;
  technicianId: string;
  activity: string | null;
  observations: string;
  briefAgence: string;
  briefDistance: string;
  debriefAgence: string;
  debriefDistance: string;
  gtv: string;
};

type SupportEntrySnapshot = {
  id: string;
  technician_id: string;
  activity_id: string | null;
  observation: string | null;
  brief_agency: string | null;
  brief_remote: string | null;
  debrief_agency: string | null;
  debrief_remote: string | null;
  gtv: string | null;
};

type TechnicianSeedRow = {
  id: string;
  ptc: boolean;
  ptd: boolean;
  sort_order: number;
};

export type SupportJourneeActionResult = {
  ok: boolean;
  message: string;
  dayId?: string | null;
  editStatus?: string;
  lastModifiedAt?: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
};

type ActivityStatusInput = "Present" | "Absent" | "Greve";

function normalizeRequiredTechnicians(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

function normalizeActivityStatus(status: ActivityStatusInput) {
  if (status === "Present") {
    return "present";
  }

  if (status === "Greve") {
    return "greve";
  }

  return "absent";
}

function buildActivityCode(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

async function requireAdminSupabase() {
  const auth = await requireOfficeWriteModule("support_journee");

  if (!isSupabaseConfigured()) {
    return {
      supabase: null,
      userEmail: auth.user?.email ?? null,
    };
  }

  const userEmail = auth.user?.email ?? null;

  if (!userEmail) {
    throw new Error("Utilisateur non authentifie.");
  }

  return {
    supabase: await createServerSupabaseClient(),
    userEmail,
  };
}

function toNullableValue(value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed === "—") {
    return null;
  }

  return trimmed;
}

function historyValue(value: string | null) {
  return value ?? "vide";
}

async function getAuthorizedContext(dayId: string) {
  const auth = await requireOfficeWriteModule("support_journee");

  if (!isSupabaseConfigured()) {
    return {
      supabase: null,
      userEmail: auth.user?.email ?? null,
      day: null,
    };
  }

  const userEmail = auth.user?.email ?? null;

  if (!userEmail) {
    throw new Error("Utilisateur non authentifie.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: day, error } = await supabase
    .from("support_days")
    .select("id, status, locked_by, locked_at")
    .eq("id", dayId)
    .maybeSingle();

  if (error || !day) {
    throw new Error("Journee de support introuvable.");
  }

  return {
    supabase,
    userEmail,
    day,
  };
}

function buildDefaultWorkMode(technician: TechnicianSeedRow) {
  if (technician.ptc && technician.ptd) {
    return "PTC-PTD";
  }

  if (technician.ptc) {
    return "PTC";
  }

  if (technician.ptd) {
    return "PTD";
  }

  return "NONE";
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

async function getOrCreateSupportDayContext(input: { dayId: string | null; dayDate: string }) {
  if (input.dayId) {
    return getAuthorizedContext(input.dayId);
  }

  const auth = await requireOfficeWriteModule("support_journee");

  if (!isSupabaseConfigured()) {
    return {
      supabase: null,
      userEmail: auth.user?.email ?? null,
      day: null,
    };
  }

  const userEmail = auth.user?.email ?? null;

  if (!userEmail) {
    throw new Error("Utilisateur non authentifie.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: existingDay, error: existingDayError } = await supabase
    .from("support_days")
    .select("id, status, locked_by, locked_at")
    .eq("day_date", input.dayDate)
    .maybeSingle();

  if (existingDayError) {
    throw existingDayError;
  }

  if (existingDay) {
    return {
      supabase,
      userEmail,
      day: existingDay,
    };
  }

  const { data: insertedDay, error: insertedDayError } = await supabase
    .from("support_days")
    .insert({
      day_date: input.dayDate,
      week_label: formatWeekLabel(input.dayDate),
      status: "draft",
      weather_note: null,
      server_label: "Supabase",
      last_modified_by: null,
      last_modified_at: null,
      locked_by: null,
      locked_at: null,
    })
    .select("id, status, locked_by, locked_at")
    .single();

  if (insertedDayError || !insertedDay) {
    throw insertedDayError ?? new Error("Impossible de creer la journee.");
  }

  const { data: technicians, error: techniciansError } = await supabase
    .from("technicians")
    .select("id, ptc, ptd, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (techniciansError) {
    throw techniciansError;
  }

  const entrySeeds = ((technicians ?? []) as TechnicianSeedRow[]).map((technician, index) => ({
    support_day_id: insertedDay.id,
    technician_id: technician.id,
    activity_id: null,
    work_mode: buildDefaultWorkMode(technician),
    observation: null,
    brief_agency: null,
    brief_remote: null,
    debrief_agency: null,
    debrief_remote: null,
    gtv: null,
    display_order: technician.sort_order || index + 1,
  }));

  if (entrySeeds.length > 0) {
    const { error: entriesError } = await supabase
      .from("support_day_entries")
      .insert(entrySeeds);

    if (entriesError) {
      throw entriesError;
    }
  }

  return {
    supabase,
    userEmail,
    day: insertedDay,
  };
}

export async function takeSupportDayControl(
  input: { dayId: string | null; dayDate: string },
): Promise<SupportJourneeActionResult> {
  try {
    const context = await getOrCreateSupportDayContext(input);

    if (!context.supabase || !context.userEmail || !context.day) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    if (context.day.locked_by && context.day.locked_by !== context.userEmail) {
      return {
        ok: false,
        message: `Journee deja prise par ${context.day.locked_by}.`,
        editStatus: context.day.status,
        lockedBy: context.day.locked_by,
        lockedAt: context.day.locked_at,
      };
    }

    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("support_days")
      .update({
        status: "in_progress",
        locked_by: context.userEmail,
        locked_at: now,
        last_modified_by: context.userEmail,
        last_modified_at: now,
      })
      .eq("id", context.day.id);

    if (error) {
      throw error;
    }

    return {
      ok: true,
      message: "Prise en main activee.",
      dayId: context.day.id,
      editStatus: "in_progress",
      lastModifiedAt: now,
      lockedBy: context.userEmail,
      lockedAt: now,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur de prise en main.",
    };
  }
}

export async function releaseSupportDayControl(
  dayId: string,
): Promise<SupportJourneeActionResult> {
  try {
    const context = await getAuthorizedContext(dayId);

    if (!context.supabase || !context.userEmail || !context.day) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    if (context.day.locked_by && context.day.locked_by !== context.userEmail) {
      return {
        ok: false,
        message: `Impossible de liberer une journee detenue par ${context.day.locked_by}.`,
        editStatus: context.day.status,
        lockedBy: context.day.locked_by,
        lockedAt: context.day.locked_at,
      };
    }

    const now = new Date().toISOString();
    const { error } = await context.supabase
      .from("support_days")
      .update({
        status: "draft",
        locked_by: null,
        locked_at: null,
        last_modified_by: context.userEmail,
        last_modified_at: now,
      })
      .eq("id", dayId);

    if (error) {
      throw error;
    }

    return {
      ok: true,
      message: "Journee liberee.",
      dayId,
      editStatus: "draft",
      lastModifiedAt: now,
      lockedBy: null,
      lockedAt: null,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur de liberation.",
    };
  }
}

export async function saveSupportDayAssignments(
  input: { dayId: string | null; dayDate: string; globalObservation: string },
  assignments: EditableAssignmentInput[],
): Promise<SupportJourneeActionResult> {
  try {
    const context = await getOrCreateSupportDayContext(input);
    const dayId = context.day?.id;

    if (!context.supabase || !context.userEmail || !context.day) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    if (context.day.locked_by && context.day.locked_by !== context.userEmail) {
      return {
        ok: false,
        message: `Journee actuellement verrouillee par ${context.day.locked_by}.`,
        editStatus: context.day.status,
        lockedBy: context.day.locked_by,
        lockedAt: context.day.locked_at,
      };
    }

    const { data: activities, error: activitiesError } = await context.supabase
      .from("activity_definitions")
      .select("id, label")
      .eq("active", true);

    if (activitiesError) {
      throw activitiesError;
    }

    const activityByLabel = new Map(
      (activities ?? []).map((activity) => [activity.label, activity.id]),
    );
    const activityLabelById = new Map(
      (activities ?? []).map((activity) => [activity.id, activity.label]),
    );

    const { data: currentEntries, error: currentEntriesError } = await context.supabase
      .from("support_day_entries")
      .select(
        "id, technician_id, activity_id, observation, brief_agency, brief_remote, debrief_agency, debrief_remote, gtv",
      )
      .eq("support_day_id", dayId);

    if (currentEntriesError) {
      throw currentEntriesError;
    }

    const currentEntryById = new Map(
      ((currentEntries ?? []) as SupportEntrySnapshot[]).map((entry) => [entry.id, entry]),
    );
    const currentEntryByTechnicianId = new Map(
      ((currentEntries ?? []) as SupportEntrySnapshot[]).map((entry) => [entry.technician_id, entry]),
    );

    const resolvedEntries = assignments.map((assignment) => {
      const resolvedEntry =
        currentEntryById.get(assignment.id) ?? currentEntryByTechnicianId.get(assignment.technicianId);

      if (!resolvedEntry) {
        throw new Error(`Ligne support introuvable pour le technicien ${assignment.technicianId}.`);
      }

      return {
        assignment,
        previous: resolvedEntry,
        resolvedEntryId: resolvedEntry.id,
      };
    });

    const historyRows = resolvedEntries.flatMap(({ assignment, previous, resolvedEntryId }) => {
      const nextActivityId =
        assignment.activity && assignment.activity.trim().length > 0
          ? activityByLabel.get(assignment.activity) ?? null
          : null;
      const nextObservation = toNullableValue(assignment.observations);
      const nextBriefAgency = toNullableValue(assignment.briefAgence);
      const nextBriefRemote = toNullableValue(assignment.briefDistance);
      const nextDebriefAgency = toNullableValue(assignment.debriefAgence);
      const nextDebriefRemote = toNullableValue(assignment.debriefDistance);
      const nextGrv = toNullableValue(assignment.gtv);

      const changes = [
        {
          field_name: "activity",
          old_value: previous.activity_id
            ? historyValue(activityLabelById.get(previous.activity_id) ?? previous.activity_id)
            : "vide",
          new_value: nextActivityId
            ? historyValue(activityLabelById.get(nextActivityId) ?? nextActivityId)
            : "vide",
          changed: previous.activity_id !== nextActivityId,
        },
        {
          field_name: "observation",
          old_value: historyValue(previous.observation),
          new_value: historyValue(nextObservation),
          changed: previous.observation !== nextObservation,
        },
        {
          field_name: "brief_agency",
          old_value: historyValue(previous.brief_agency),
          new_value: historyValue(nextBriefAgency),
          changed: previous.brief_agency !== nextBriefAgency,
        },
        {
          field_name: "brief_remote",
          old_value: historyValue(previous.brief_remote),
          new_value: historyValue(nextBriefRemote),
          changed: previous.brief_remote !== nextBriefRemote,
        },
        {
          field_name: "debrief_agency",
          old_value: historyValue(previous.debrief_agency),
          new_value: historyValue(nextDebriefAgency),
          changed: previous.debrief_agency !== nextDebriefAgency,
        },
        {
          field_name: "debrief_remote",
          old_value: historyValue(previous.debrief_remote),
          new_value: historyValue(nextDebriefRemote),
          changed: previous.debrief_remote !== nextDebriefRemote,
        },
        {
          field_name: "grv",
          old_value: historyValue(previous.gtv),
          new_value: historyValue(nextGrv),
          changed: previous.gtv !== nextGrv,
        },
      ];

      return changes
        .filter((change) => change.changed)
        .map((change) => ({
          support_day_entry_id: resolvedEntryId,
          changed_by: context.userEmail,
          field_name: change.field_name,
          old_value: change.old_value,
          new_value: change.new_value,
        }));
    });

    const updates = resolvedEntries.map(({ assignment, resolvedEntryId }) => {
      const activityId =
        assignment.activity && assignment.activity.trim().length > 0
          ? activityByLabel.get(assignment.activity)
          : null;

      if (assignment.activity && !activityId) {
        throw new Error(`Activite introuvable : ${assignment.activity}`);
      }

      return context.supabase
        .from("support_day_entries")
        .update({
          activity_id: activityId,
          observation: toNullableValue(assignment.observations),
          brief_agency: toNullableValue(assignment.briefAgence),
          brief_remote: toNullableValue(assignment.briefDistance),
          debrief_agency: toNullableValue(assignment.debriefAgence),
          debrief_remote: toNullableValue(assignment.debriefDistance),
          gtv: toNullableValue(assignment.gtv),
        })
        .eq("id", resolvedEntryId)
        .eq("support_day_id", dayId);
    });

    const results = await Promise.all(updates);
    const failedUpdate = results.find((result) => result.error);

    if (failedUpdate?.error) {
      throw failedUpdate.error;
    }

    if (historyRows.length > 0) {
      const { error: historyInsertError } = await context.supabase
        .from("support_day_entry_history")
        .insert(historyRows);

      if (historyInsertError) {
        throw historyInsertError;
      }
    }

    const now = new Date().toISOString();
    const { error: dayError } = await context.supabase
      .from("support_days")
      .update({
        status: "in_progress",
        locked_by: context.userEmail,
        locked_at: context.day.locked_at ?? now,
        global_observation: toNullableValue(input.globalObservation),
        last_modified_by: context.userEmail,
        last_modified_at: now,
      })
      .eq("id", dayId);

    if (dayError) {
      throw dayError;
    }

    return {
      ok: true,
      message: "Journee enregistree.",
      dayId,
      editStatus: "in_progress",
      lastModifiedAt: now,
      lockedBy: context.userEmail,
      lockedAt: context.day.locked_at ?? now,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur d'enregistrement.",
    };
  }
}

export async function createActivityDefinition(input: {
  label: string;
  color: string;
  status: ActivityStatusInput;
  requiredTechnicians: number | null;
  showInDailyCheck: boolean;
}): Promise<SupportJourneeActionResult> {
  try {
    const context = await requireAdminSupabase();

    if (!context.supabase) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    const label = input.label.trim();

    if (!label) {
      return {
        ok: false,
        message: "Le libelle de l'activite est obligatoire.",
      };
    }

    const baseCode = buildActivityCode(label);

    if (!baseCode) {
      return {
        ok: false,
        message: "Impossible de generer un code d'activite valide.",
      };
    }

    const { data: existingActivities, error: existingError } = await context.supabase
      .from("activity_definitions")
      .select("code, label, display_order");

    if (existingError) {
      throw existingError;
    }

    const takenCodes = new Set((existingActivities ?? []).map((item) => item.code));
    const labelAlreadyExists = (existingActivities ?? []).some(
      (item) => item.label.toLowerCase() === label.toLowerCase(),
    );

    if (labelAlreadyExists) {
      return {
        ok: false,
        message: "Une activite avec ce libelle existe deja.",
      };
    }

    let code = baseCode;
    let suffix = 2;

    while (takenCodes.has(code)) {
      code = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    const nextDisplayOrder =
      Math.max(0, ...(existingActivities ?? []).map((item) => item.display_order ?? 0)) + 10;

    const { error } = await context.supabase.from("activity_definitions").insert({
      code,
      label,
      color: input.color,
      status: normalizeActivityStatus(input.status),
      display_order: nextDisplayOrder,
      active: true,
      required_technicians: input.showInDailyCheck
        ? normalizeRequiredTechnicians(input.requiredTechnicians)
        : null,
      show_in_daily_check: input.showInDailyCheck,
    });

    if (error) {
      throw error;
    }

    refresh();

    return {
      ok: true,
      message: "Activite ajoutee.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur lors de l'ajout de l'activite.",
    };
  }
}

export async function updateActivityDefinition(input: {
  id: string;
  label: string;
  color: string;
  status: ActivityStatusInput;
  requiredTechnicians: number | null;
  showInDailyCheck: boolean;
}): Promise<SupportJourneeActionResult> {
  try {
    const context = await requireAdminSupabase();

    if (!context.supabase) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    const label = input.label.trim();

    if (!label) {
      return {
        ok: false,
        message: "Le libelle de l'activite est obligatoire.",
      };
    }

    const { data: existingActivities, error: existingError } = await context.supabase
      .from("activity_definitions")
      .select("id, label")
      .neq("id", input.id);

    if (existingError) {
      throw existingError;
    }

    const labelAlreadyExists = (existingActivities ?? []).some(
      (item) => item.label.toLowerCase() === label.toLowerCase(),
    );

    if (labelAlreadyExists) {
      return {
        ok: false,
        message: "Une autre activite avec ce libelle existe deja.",
      };
    }

    const { error } = await context.supabase
      .from("activity_definitions")
      .update({
        label,
        color: input.color,
        status: normalizeActivityStatus(input.status),
        required_technicians: input.showInDailyCheck
          ? normalizeRequiredTechnicians(input.requiredTechnicians)
          : null,
        show_in_daily_check: input.showInDailyCheck,
      })
      .eq("id", input.id);

    if (error) {
      throw error;
    }

    refresh();

    return {
      ok: true,
      message: "Activite mise a jour.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Erreur lors de la mise a jour de l'activite.",
    };
  }
}

export async function deactivateActivityDefinition(
  id: string,
): Promise<SupportJourneeActionResult> {
  try {
    const context = await requireAdminSupabase();

    if (!context.supabase) {
      return {
        ok: false,
        message: "Supabase n'est pas configure pour cette instance.",
      };
    }

    const { error } = await context.supabase
      .from("activity_definitions")
      .update({
        active: false,
      })
      .eq("id", id);

    if (error) {
      throw error;
    }

    refresh();

    return {
      ok: true,
      message: "Activite supprimee.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Erreur lors de la suppression.",
    };
  }
}
