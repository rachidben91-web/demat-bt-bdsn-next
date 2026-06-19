"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  createActivityDefinition,
  deactivateActivityDefinition,
  releaseSupportDayControl,
  saveSupportDayAssignments,
  takeSupportDayControl,
  updateActivityDefinition,
} from "@/app/actions/support-journee";
import { AppShellHeader } from "@/components/app-shell-header";
import { getModuleTheme } from "@/lib/module-theme";
import { supportTabs } from "@/data/support-journee";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { SiteCode } from "@/lib/site-options";
import type {
  ActivityOption,
  AvailableSupportDay,
  DailyAssignmentRow,
  SupportJourneeData,
} from "@/lib/support-journee";

type TabId = (typeof supportTabs)[number]["id"];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function statusTone(status: string) {
  if (status === "Present") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "Greve") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function metricTone(label: string) {
  if (label.startsWith("Présents")) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (label.startsWith("Grève")) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-rose-50 text-rose-700";
}

function rsfTone(level: "favorable" | "surveiller" | "deconseillee") {
  if (level === "favorable") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (level === "surveiller") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function formatLockTimestamp(value: string | null) {
  if (!value) {
    return "Aucun verrou actif";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLastUpdate(value: string | null) {
  if (!value) {
    return "Aucune modification";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatModifierName(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const localPart = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const normalized = localPart.replace(/[._+~-]+/g, " ").trim();
  const firstName = normalized.split(/\s+/).find(Boolean);

  if (!firstName) {
    return trimmed;
  }

  return `${firstName.charAt(0).toLocaleUpperCase("fr-FR")}${firstName
    .slice(1)
    .toLocaleLowerCase("fr-FR")}`;
}

function normalizeField(value: string) {
  return value === "—" ? "" : value;
}

function normalizeActivity(value: string | null) {
  return value ?? "";
}

function printableValue(value: string | null) {
  if (!value || value === "—" || value === "â€”") {
    return "";
  }

  return value;
}

function getContrastColor(hexColor: string) {
  const value = hexColor.replace("#", "");

  if (value.length !== 6) {
    return "#0f172a";
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  const toLinear = (channel: number) => {
    const normalized = channel / 255;

    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * toLinear(red) +
    0.7152 * toLinear(green) +
    0.0722 * toLinear(blue);
  const contrastWithDark = (luminance + 0.05) / 0.05;
  const contrastWithWhite = 1.05 / (luminance + 0.05);

  return contrastWithDark >= contrastWithWhite ? "#0f172a" : "#ffffff";
}

function activitySelectStyle(activity: ActivityOption | undefined) {
  if (!activity) {
    return undefined;
  }

  return {
    backgroundColor: activity.color,
    color: getContrastColor(activity.color),
    borderColor: activity.color,
  };
}

type EditableAssignment = DailyAssignmentRow;
type ActivityStatusValue = ActivityOption["status"];

type ActivityDraft = {
  label: string;
  color: string;
  status: ActivityStatusValue;
  requiredTechnicians: string;
  showInDailyCheck: boolean;
};

type SaveTrigger = "auto" | "manual" | "release" | "navigation";

type PendingNavigation =
  | {
      kind: "href";
      href: string;
    }
  | {
      kind: "date";
      date: string;
    };

function serializeAssignments(assignments: EditableAssignment[]) {
  return JSON.stringify(assignments);
}

type SupportJourneeWorkspaceProps = {
  activeSiteCode?: SiteCode | null;
  allowedModules?: OfficeModuleKey[];
  data: SupportJourneeData;
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
};

function shiftDate(dateString: string, offsetDays: number) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().slice(0, 10);
}

function startOfMonth(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(1);

  return date.toISOString().slice(0, 10);
}

function shiftMonth(dateString: string, offsetMonths: number) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths, 1);

  return date.toISOString().slice(0, 10);
}

function formatCalendarHeader(dateString: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T12:00:00Z`));
}

function buildCalendarDays(monthDate: string) {
  const monthStart = new Date(`${monthDate}T12:00:00Z`);
  const firstDay = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1),
  );
  const firstWeekday = (firstDay.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setUTCDate(firstDay.getUTCDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + index);

    return {
      iso: day.toISOString().slice(0, 10),
      dayNumber: day.getUTCDate(),
      inCurrentMonth: day.getUTCMonth() === monthStart.getUTCMonth(),
    };
  });
}

function formatDateDisplay(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function formatEditStatusLabel(status: string) {
  if (status === "draft") {
    return "Brouillon";
  }

  if (status === "in_progress") {
    return "En cours de modification";
  }

  if (status === "published") {
    return "Publie";
  }

  return status;
}

function parseDisplayDateToIso(dateString: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateString.trim());

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseRequiredTechnicians(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function formatTechnicianLabel(count: number) {
  return `${count} TG`;
}

export function SupportJourneeWorkspace({
  activeSiteCode,
  allowedModules = [],
  data,
  isSuperAdmin = false,
  role,
  userEmail,
}: SupportJourneeWorkspaceProps) {
  const supportTheme = getModuleTheme("support");
  const {
    activityDefinitions,
    availableDates,
    dailyAssignments,
    dayWeather,
    headerWeather,
    historyEntries,
    supportMetrics,
    supportSummary,
    technicians,
    source,
  } = data;
  const [activeTab, setActiveTab] = useState<TabId>("brief");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [historyAgent, setHistoryAgent] = useState("all");
  const [appliedHistoryAgent, setAppliedHistoryAgent] = useState("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [appliedHistoryStartDate, setAppliedHistoryStartDate] = useState("");
  const [appliedHistoryEndDate, setAppliedHistoryEndDate] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [assignments, setAssignments] = useState<EditableAssignment[]>(dailyAssignments);
  const [savedAssignments, setSavedAssignments] =
    useState<EditableAssignment[]>(dailyAssignments);
  const [globalObservation, setGlobalObservation] = useState(
    supportSummary.globalObservation,
  );
  const [savedGlobalObservation, setSavedGlobalObservation] = useState(
    supportSummary.globalObservation,
  );
  const [currentDayId, setCurrentDayId] = useState<string | null>(supportSummary.dayId);
  const [editStatus, setEditStatus] = useState(supportSummary.editStatus);
  const [lockedBy, setLockedBy] = useState(supportSummary.lockedBy);
  const [lockedAt, setLockedAt] = useState(supportSummary.lockedAt);
  const [lastUpdate, setLastUpdate] = useState(supportSummary.lastUpdate);
  const [lastModifiedBy, setLastModifiedBy] = useState(supportSummary.lastModifiedBy);
  const [statusMessage, setStatusMessage] = useState(
    source === "mock"
      ? "Mode maquette actif : les actions restent locales."
      : supportSummary.savedDayStatus,
  );
  const currentDayDate = supportSummary.dayDate ?? new Date().toISOString().slice(0, 10);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(currentDayDate));
  const [newActivity, setNewActivity] = useState<ActivityDraft>({
    label: "",
    color: "#3b82f6",
    status: "Present",
    requiredTechnicians: "",
    showInDailyCheck: false,
  });
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityDraft | null>(null);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const autosaveTimerRef = useRef<number | null>(null);
  const isSavingAssignmentsRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);
  const queuedSaveRef = useRef<SaveTrigger | null>(null);
  const assignmentsRef = useRef(assignments);
  const globalObservationRef = useRef(globalObservation);
  const currentDayIdRef = useRef(currentDayId);
  const tableSectionRef = useRef<HTMLElement | null>(null);
  const tableHeaderRef = useRef<HTMLDivElement | null>(null);

  const isLockedByCurrentUser = Boolean(userEmail) && lockedBy === userEmail;
  const canTakeControl =
    source === "supabase" && (!lockedBy || isLockedByCurrentUser);
  const canEdit = source === "mock" || isLockedByCurrentUser;
  const draftAssignmentsSignature = serializeAssignments(assignments);
  const savedAssignmentsSignature = serializeAssignments(savedAssignments);
  const hasUnsavedChanges =
    draftAssignmentsSignature !== savedAssignmentsSignature ||
    globalObservation !== savedGlobalObservation;
  const isBusy = isPending || isSavingAssignments;
  const saveState = isSavingAssignments ? "saving" : hasUnsavedChanges ? "dirty" : "saved";
  const saveStateBadgeClassName =
    saveState === "saving"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : saveState === "dirty"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const saveStatePanelClassName =
    saveState === "saving"
      ? "border-amber-100 bg-amber-50/80 text-amber-800"
      : saveState === "dirty"
        ? "border-rose-100 bg-rose-50/80 text-rose-800"
        : "border-emerald-100 bg-emerald-50/80 text-emerald-800";
  const saveStateAccentClassName =
    saveState === "saving"
      ? "text-amber-700"
      : saveState === "dirty"
        ? "text-rose-700"
        : "text-emerald-700";
  const saveStateLabel =
    saveState === "saving"
      ? "Enregistrement en cours"
      : saveState === "dirty"
        ? "Modifications non enregistrées"
        : "Modifications enregistrées";
  const tableHeaderTop = 104;
  const [tableHeaderFrame, setTableHeaderFrame] = useState({
    isPinned: false,
    left: 0,
    width: 0,
  });
  const availableDateMap = new Map(
    availableDates.map((item: AvailableSupportDay) => [item.date, item.hasData]),
  );
  const calendarDays = buildCalendarDays(visibleMonth);
  const sortedActivityDefinitions = useMemo(
    () =>
      [...activityDefinitions].sort((firstActivity, secondActivity) =>
        firstActivity.label.localeCompare(secondActivity.label, "fr", {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    [activityDefinitions],
  );
  const activityByLabel = new Map(
    sortedActivityDefinitions.map((activity) => [activity.label, activity]),
  );
  const dailyCheckActivities = useMemo(
    () =>
      sortedActivityDefinitions
        .filter((activity) => activity.showInDailyCheck)
        .map((activity) => {
          const currentCount = assignments.filter(
            (assignment) => assignment.activity === activity.label,
          ).length;
          const requiredCount = activity.requiredTechnicians;
          const extraCount =
            requiredCount != null && currentCount > requiredCount
              ? currentCount - requiredCount
              : 0;
          const isSatisfied = requiredCount == null ? currentCount > 0 : currentCount >= requiredCount;

          return {
            activity,
            currentCount,
            extraCount,
            isSatisfied,
            requiredCount,
          };
        }),
    [assignments, sortedActivityDefinitions],
  );
  const printGeneratedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
  const liveMetrics = assignments.reduce(
    (accumulator, assignment) => {
      const activity = assignment.activity ? activityByLabel.get(assignment.activity) : undefined;

      if (activity?.status === "Absent") {
        accumulator.absents += 1;
      } else if (activity?.status === "Present") {
        accumulator.presents += 1;
      } else if (activity?.status === "Greve") {
        accumulator.greve += 1;
      }

      return accumulator;
    },
    {
      presents: 0,
      absents: 0,
      greve: 0,
    },
  );

  const filteredAssignments = assignments;

  const filteredActivities = sortedActivityDefinitions.filter((activity) =>
    activity.label.toLowerCase().includes(activitySearch.toLowerCase()),
  );

  const filteredHistory = historyEntries.filter((entry) =>
    {
      const entryIsoDate = parseDisplayDateToIso(entry.date);
      const byAgent = appliedHistoryAgent === "all" ? true : entry.agent === appliedHistoryAgent;
      const byStartDate =
        !appliedHistoryStartDate || !entryIsoDate ? true : entryIsoDate >= appliedHistoryStartDate;
      const byEndDate =
        !appliedHistoryEndDate || !entryIsoDate ? true : entryIsoDate <= appliedHistoryEndDate;

      return byAgent && byStartDate && byEndDate;
    },
  );

  function updateAssignment(
    assignmentId: string,
    field: keyof Pick<
      EditableAssignment,
      | "activity"
      | "observations"
      | "briefAgence"
      | "briefDistance"
      | "debriefAgence"
      | "debriefDistance"
      | "gtv"
    >,
    value: string | null,
  ) {
    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, [field]: value } : assignment,
      ),
    );
  }

  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  useEffect(() => {
    globalObservationRef.current = globalObservation;
  }, [globalObservation]);

  useEffect(() => {
    currentDayIdRef.current = currentDayId;
  }, [currentDayId]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function updateTableHeaderPinning() {
      const tableSection = tableSectionRef.current;
      const tableHeader = tableHeaderRef.current;

      if (!tableSection || !tableHeader) {
        return;
      }

      const sectionRect = tableSection.getBoundingClientRect();
      const headerHeight = tableHeader.offsetHeight;
      const shouldPin =
        sectionRect.top <= tableHeaderTop &&
        sectionRect.bottom > tableHeaderTop + headerHeight;

      setTableHeaderFrame((current) => {
        const next = {
          isPinned: shouldPin,
          left: sectionRect.left,
          width: sectionRect.width,
        };

        if (
          current.isPinned === next.isPinned &&
          current.left === next.left &&
          current.width === next.width
        ) {
          return current;
        }

        return next;
      });
    }

    updateTableHeaderPinning();
    window.addEventListener("scroll", updateTableHeaderPinning, { passive: true });
    window.addEventListener("resize", updateTableHeaderPinning);

    return () => {
      window.removeEventListener("scroll", updateTableHeaderPinning);
      window.removeEventListener("resize", updateTableHeaderPinning);
    };
  }, [tableHeaderTop]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (supportSummary.dayId) {
        setCurrentDayId(supportSummary.dayId);
      }

      setEditStatus(supportSummary.editStatus);
      setLockedBy(supportSummary.lockedBy);
      setLockedAt(supportSummary.lockedAt);
      setLastUpdate(supportSummary.lastUpdate);
      setLastModifiedBy(supportSummary.lastModifiedBy);
    });

    return () => {
      cancelled = true;
    };
  }, [
    supportSummary.dayId,
    supportSummary.editStatus,
    supportSummary.lastModifiedBy,
    supportSummary.lastUpdate,
    supportSummary.lockedAt,
    supportSummary.lockedBy,
  ]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled || hasUnsavedChangesRef.current || isSavingAssignmentsRef.current) {
        return;
      }

      setAssignments(dailyAssignments);
      setSavedAssignments(dailyAssignments);
      setGlobalObservation(supportSummary.globalObservation);
      setSavedGlobalObservation(supportSummary.globalObservation);
    });

    return () => {
      cancelled = true;
    };
  }, [
    dailyAssignments,
    supportSummary.globalObservation,
  ]);

  const syncActionResult = (result: {
    ok: boolean;
    message: string;
    dayId?: string | null;
    editStatus?: string;
    lastModifiedAt?: string | null;
    lastModifiedBy?: string | null;
    lockedBy?: string | null;
    lockedAt?: string | null;
  }) => {
    setStatusMessage(result.message);

    if (result.dayId !== undefined) {
      setCurrentDayId(result.dayId);
    }

    if (result.editStatus) {
      setEditStatus(result.editStatus);
    }

    if (result.lockedBy !== undefined) {
      setLockedBy(result.lockedBy);
    }

    if (result.lockedAt !== undefined) {
      setLockedAt(result.lockedAt);
    }

    if (result.lastModifiedAt !== undefined) {
      setLastUpdate(formatLastUpdate(result.lastModifiedAt));
    }

    if (result.lastModifiedBy !== undefined) {
      setLastModifiedBy(formatModifierName(result.lastModifiedBy));
    }
  };

  const persistAssignments = useCallback(async (trigger: SaveTrigger) => {
    if (source === "mock") {
      setStatusMessage("Mode maquette : modifications conservees localement.");
      setSavedAssignments(assignmentsRef.current);
      setSavedGlobalObservation(globalObservationRef.current);
      setLastUpdate("Brouillon local");
      setLastModifiedBy(null);
      return true;
    }

    if (!isLockedByCurrentUser) {
      if (trigger !== "auto") {
        setStatusMessage("Prenez la main sur la journee avant d'enregistrer.");
      }

      return false;
    }

    if (isSavingAssignmentsRef.current) {
      queuedSaveRef.current = trigger;
      return false;
    }

    const currentAssignments = assignmentsRef.current;
    const currentObservation = globalObservationRef.current;

    isSavingAssignmentsRef.current = true;
    setIsSavingAssignments(true);

    if (trigger === "auto") {
      setStatusMessage("Enregistrement automatique en cours...");
    }

    try {
      const result = await saveSupportDayAssignments(
        {
          dayId: currentDayIdRef.current,
          dayDate: currentDayDate,
          globalObservation: currentObservation,
        },
        currentAssignments.map((assignment) => ({
          id: assignment.id,
          technicianId: assignment.technicianId,
          activity: assignment.activity,
          observations: assignment.observations,
          briefAgence: assignment.briefAgence,
          briefDistance: assignment.briefDistance,
          debriefAgence: assignment.debriefAgence,
          debriefDistance: assignment.debriefDistance,
          gtv: assignment.gtv,
        })),
      );

      syncActionResult(result);

      if (!result.ok) {
        if (trigger === "auto") {
          setStatusMessage(`${result.message} Les modifications restent locales.`);
        }

        return false;
      }

      setSavedAssignments(currentAssignments);
      setSavedGlobalObservation(currentObservation);

      if (trigger === "auto") {
        setStatusMessage("Modifications enregistrées automatiquement.");
      }

      return true;
    } finally {
      isSavingAssignmentsRef.current = false;
      setIsSavingAssignments(false);

      const queuedSave = queuedSaveRef.current;
      queuedSaveRef.current = null;

      if (
        queuedSave &&
        (serializeAssignments(assignmentsRef.current) !== serializeAssignments(currentAssignments) ||
          globalObservationRef.current !== currentObservation)
      ) {
        void persistAssignments(queuedSave);
      }
    }
  }, [currentDayDate, isLockedByCurrentUser, source]);

  function completeNavigation(target: PendingNavigation) {
    if (target.kind === "date") {
      setCalendarOpen(false);
      setVisibleMonth(startOfMonth(target.date));
    }

    startTransition(() => {
      if (target.kind === "date") {
        router.push(`/support?date=${target.date}`);
        return;
      }

      router.push(target.href);
    });
  }

  function requestNavigation(target: PendingNavigation) {
    if (isSavingAssignmentsRef.current) {
      setStatusMessage("Un enregistrement est deja en cours. Reessayez dans un instant.");
      return;
    }

    if (hasUnsavedChanges) {
      setPendingNavigation(target);
      return;
    }

    completeNavigation(target);
  }

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        !hasUnsavedChanges ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      const nextHref = `${url.pathname}${url.search}${url.hash}`;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (nextHref === currentHref) {
        return;
      }

      event.preventDefault();
      setPendingNavigation({
        kind: "href",
        href: nextHref,
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (source !== "supabase" || isLockedByCurrentUser || hasUnsavedChanges) {
      return;
    }

    const refreshInterval = window.setInterval(() => {
      router.refresh();
    }, 15000);

    return () => window.clearInterval(refreshInterval);
  }, [hasUnsavedChanges, isLockedByCurrentUser, router, source]);

  useEffect(() => {
    if (
      source !== "supabase" ||
      !isLockedByCurrentUser ||
      !hasUnsavedChanges ||
      pendingNavigation !== null
    ) {
      return;
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void persistAssignments("auto");
    }, 1000);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    assignments,
    globalObservation,
    hasUnsavedChanges,
    isLockedByCurrentUser,
    pendingNavigation,
    persistAssignments,
    source,
  ]);

  function handleTakeControl() {
    if (!canTakeControl) {
      return;
    }

    startTransition(async () => {
      const result = await takeSupportDayControl({
        dayId: currentDayId,
        dayDate: currentDayDate,
      });
      syncActionResult(result);
    });
  }

  function handleReleaseControl() {
    if (!currentDayId || source !== "supabase") {
      return;
    }

    startTransition(async () => {
      if (hasUnsavedChanges) {
        const saveSucceeded = await persistAssignments("release");

        if (!saveSucceeded) {
          return;
        }
      }

      const result = await releaseSupportDayControl(currentDayId);
      syncActionResult(result);
    });
  }

  function handleSave() {
    void persistAssignments("manual");
  }

  function handleReset() {
    if (!canEdit) {
      setStatusMessage("Prenez la main sur la journee avant de la vider.");
      return;
    }

    setAssignments((current) =>
      current.map((assignment) => ({
        ...assignment,
        activity: null,
        observations: "—",
        briefAgence: "—",
        briefDistance: "—",
        debriefAgence: "—",
        debriefDistance: "—",
        gtv: "—",
      })),
    );
      setStatusMessage("Journée vidée localement. Enregistrez pour confirmer.");
    setGlobalObservation("");
  }

  function handleCreateActivity() {
    startTransition(async () => {
      const result = await createActivityDefinition({
        ...newActivity,
        requiredTechnicians: newActivity.showInDailyCheck
          ? parseRequiredTechnicians(newActivity.requiredTechnicians)
          : null,
      });
      setStatusMessage(result.message);

      if (result.ok) {
        setNewActivity({
          label: "",
          color: "#3b82f6",
          status: "Present",
          requiredTechnicians: "",
          showInDailyCheck: false,
        });
      }
    });
  }

  function startActivityEdit(activity: ActivityOption) {
    setEditingActivityId(activity.id);
    setEditingActivity({
      label: activity.label,
      color: activity.color,
      status: activity.status,
      requiredTechnicians:
        activity.requiredTechnicians != null ? String(activity.requiredTechnicians) : "",
      showInDailyCheck: activity.showInDailyCheck,
    });
  }

  function cancelActivityEdit() {
    setEditingActivityId(null);
    setEditingActivity(null);
  }

  function handleUpdateActivity(activityId: string) {
    if (!editingActivity) {
      return;
    }

    startTransition(async () => {
      const result = await updateActivityDefinition({
        id: activityId,
        ...editingActivity,
        requiredTechnicians: editingActivity.showInDailyCheck
          ? parseRequiredTechnicians(editingActivity.requiredTechnicians)
          : null,
      });

      setStatusMessage(result.message);

      if (result.ok) {
        cancelActivityEdit();
      }
    });
  }

  function handleDeleteActivity(activityId: string) {
    startTransition(async () => {
      const result = await deactivateActivityDefinition(activityId);
      setStatusMessage(result.message);
    });
  }

  function resetActivityFilters() {
    setActivitySearch("");
    cancelActivityEdit();
  }

  function applyHistoryFilters() {
    setAppliedHistoryAgent(historyAgent);
    setAppliedHistoryStartDate(historyStartDate);
    setAppliedHistoryEndDate(historyEndDate);
  }

  function resetHistoryFilters() {
    setHistoryAgent("all");
    setAppliedHistoryAgent("all");
    setHistoryStartDate("");
    setHistoryEndDate("");
    setAppliedHistoryStartDate("");
    setAppliedHistoryEndDate("");
  }

  function navigateToDate(date: string) {
    requestNavigation({
      kind: "date",
      date,
    });
  }

  function handlePrint() {
    window.print();
  }

  async function handleSaveAndContinue() {
    if (!pendingNavigation) {
      return;
    }

    const target = pendingNavigation;
    const saveSucceeded = await persistAssignments("navigation");

    if (!saveSucceeded) {
      return;
    }

    setPendingNavigation(null);
    completeNavigation(target);
  }

  const dateNavigatorControls = (
    <div className="flex flex-wrap gap-2">
      {["J-1", "Auj.", "J+1"].map((item) => (
        <button
          key={item}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
          onClick={() =>
            navigateToDate(
              item === "J-1"
                ? shiftDate(currentDayDate, -1)
                : item === "J+1"
                  ? shiftDate(currentDayDate, 1)
                  : new Date().toISOString().slice(0, 10),
            )
          }
          type="button"
        >
          {item}
        </button>
      ))}
      <div className="relative">
        <button
          className="flex min-w-[180px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-white"
          onClick={() => setCalendarOpen((current) => !current)}
          type="button"
        >
          <span>{formatDateDisplay(currentDayDate)}</span>
          <CalendarDays aria-hidden="true" className="h-4 w-4 text-blue-500" />
        </button>

        {calendarOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[320px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between">
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold capitalize text-slate-900">
                {formatCalendarHeader(visibleMonth)}
              </p>
              <button
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                <div key={`${label}-${index}`}>{label}</div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const isCurrentDay = day.iso === currentDayDate;
                const isKnownDay = availableDateMap.has(day.iso);
                const hasData = availableDateMap.get(day.iso) === true;

                return (
                  <button
                    key={day.iso}
                    className={cx(
                      "relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition",
                      day.inCurrentMonth
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:bg-slate-50",
                      isCurrentDay && "bg-blue-600 text-white hover:bg-blue-600",
                    )}
                    onClick={() => navigateToDate(day.iso)}
                    type="button"
                  >
                    <span>{day.dayNumber}</span>
                    {isKnownDay ? (
                      <span
                        className={cx(
                          "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                          isCurrentDay
                            ? "bg-white"
                            : hasData
                              ? "bg-emerald-500"
                              : "bg-rose-500",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Journée initialisée vide</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Journée avec données</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <main className={cx("min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8", supportTheme.pageBackgroundClassName)}>
      <section className="support-print-sheet">
        <header className="support-print-header">
          <div className="support-print-title-block">
            <Image
              alt="DEMAT-BT"
              className="support-print-logo"
              height={31}
              priority
              unoptimized
              src="/dashboard-topbar-logo.png"
              width={118}
            />
            <div>
              <p className="support-print-kicker">Support journée</p>
              <h1>Liste agents / activités</h1>
            </div>
          </div>
          <div className="support-print-date-block">
            <p className="support-print-date">{supportSummary.dateLabel}</p>
            <p className="support-print-week">{supportSummary.weekLabel}</p>
          </div>
          <div className="support-print-meta">
            <p>Agents : {assignments.length}</p>
            <p>Présents : {liveMetrics.presents}</p>
            <p>Absents : {liveMetrics.absents}</p>
            <p>Grève : {liveMetrics.greve}</p>
            <p>Genere le {printGeneratedAt}</p>
          </div>
        </header>

        <section className="support-print-comments">
          <strong>Commentaires journee</strong>
          <p>{printableValue(globalObservation) || "Aucun commentaire."}</p>
        </section>

        <table className="support-print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>PTC / PTD</th>
              <th>Activite</th>
              <th>Observations</th>
              <th>Brief agence</th>
              <th>Brief distance</th>
              <th>Debrief agence</th>
              <th>Debrief distance</th>
              <th>GRV</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => {
              const activity = assignment.activity ? activityByLabel.get(assignment.activity) : undefined;
              const isAbsentRow = activity?.status === "Absent";

              return (
                <tr
                  key={`print-${assignment.id}`}
                  className={isAbsentRow ? "support-print-row-absent" : undefined}
                >
                  <td>{assignment.rank}</td>
                  <td className="support-print-agent">{assignment.agent}</td>
                  <td>{printableValue(assignment.workMode) || "-"}</td>
                  <td
                    className="support-print-activity-cell"
                    style={
                      assignment.activity
                        ? {
                            backgroundColor: activity?.color ?? "#e5e7eb",
                            color: getContrastColor(activity?.color ?? "#e5e7eb"),
                          }
                        : undefined
                    }
                  >
                    <span className="support-print-activity-label">
                      {assignment.activity || "-"}
                    </span>
                  </td>
                  <td>{printableValue(assignment.observations) || "-"}</td>
                  <td>{printableValue(assignment.briefAgence) || "-"}</td>
                  <td>{printableValue(assignment.briefDistance) || "-"}</td>
                  <td>{printableValue(assignment.debriefAgence) || "-"}</td>
                  <td>{printableValue(assignment.debriefDistance) || "-"}</td>
                  <td>{printableValue(assignment.gtv) || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="support-screen-root mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="support"
          activeSiteCode={activeSiteCode}
          allowedModules={allowedModules}
          isSuperAdmin={isSuperAdmin}
          role={role}
          title="Support Journée"
          userEmail={userEmail}
          weatherGeneratedAtLabel={headerWeather.generatedAtLabel}
          weatherZones={headerWeather.zones}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Module Actif
              </p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Pilotage Quotidien
              </h2>
              <p className="mt-3 max-w-[64ch] text-base leading-7 text-slate-500">
                Cette page se concentre uniquement sur le support journée : saisie du brief,
                paramétrage des activités et consultation de l&apos;historique.
              </p>
            </div>

            {activeTab === "brief" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  `Présents: ${liveMetrics.presents}`,
                  `Absents: ${liveMetrics.absents}`,
                  `Grève: ${liveMetrics.greve}`,
                ].map((item) => (
                  <div
                    key={item}
                    className={cx(
                      "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold shadow-sm",
                      metricTone(item),
                    )}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-2">
            {supportTabs.map((tab) => (
              <button
                key={tab.id}
                className={cx(
                  "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-[0_16px_32px_rgba(37,99,235,0.28)]"
                    : "text-slate-500 hover:bg-white hover:text-slate-900",
                )}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "brief" ? (
            <div className="mt-6 space-y-5">
              <section className="flex justify-end rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
                {false ? (
                  <div className="hidden">
                  <div className="hidden flex-wrap gap-2">
                    {["J-1", "Auj.", "J+1"].map((item) => (
                      <button
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                        onClick={() =>
                          navigateToDate(
                            item === "J-1"
                              ? shiftDate(currentDayDate, -1)
                              : item === "J+1"
                                ? shiftDate(currentDayDate, 1)
                                : new Date().toISOString().slice(0, 10),
                          )
                        }
                        type="button"
                      >
                        {item}
                      </button>
                    ))}
                    <div className="relative">
                      <button
                        className="flex min-w-[180px] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-white"
                        onClick={() => setCalendarOpen((current) => !current)}
                        type="button"
                      >
                        <span>{formatDateDisplay(currentDayDate)}</span>
                        <span aria-hidden="true">📅</span>
                      </button>

                      {calendarOpen ? (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-[320px] rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
                          <div className="flex items-center justify-between">
                            <button
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                              onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
                              type="button"
                            >
                              ←
                            </button>
                            <p className="text-sm font-semibold capitalize text-slate-900">
                              {formatCalendarHeader(visibleMonth)}
                            </p>
                            <button
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"
                              onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
                              type="button"
                            >
                              →
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                              <div key={`${label}-${index}`}>{label}</div>
                            ))}
                          </div>

                          <div className="mt-3 grid grid-cols-7 gap-2">
                            {calendarDays.map((day) => {
                              const isCurrentDay = day.iso === currentDayDate;
                              const isKnownDay = availableDateMap.has(day.iso);
                              const hasData = availableDateMap.get(day.iso) === true;

                              return (
                                <button
                                  key={day.iso}
                                  className={cx(
                                    "relative flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition",
                                    day.inCurrentMonth
                                      ? "text-slate-700 hover:bg-slate-100"
                                      : "text-slate-300 hover:bg-slate-50",
                                    isCurrentDay && "bg-blue-600 text-white hover:bg-blue-600",
                                  )}
                                  onClick={() => navigateToDate(day.iso)}
                                  type="button"
                                >
                                  <span>{day.dayNumber}</span>
                                  {isKnownDay ? (
                                    <span
                                      className={cx(
                                        "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                                        isCurrentDay
                                          ? "bg-white"
                                          : hasData
                                            ? "bg-emerald-500"
                                            : "bg-rose-500",
                                      )}
                                    />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>

                          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            <span>Journée initialisée vide</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Journée avec données</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <input
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Rechercher agent, activité, observation..."
                      value={searchTerm}
                    />
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      onChange={(event) => setSelectedTechnician(event.target.value)}
                      value={selectedTechnician}
                    >
                      <option value="all">Tous les techniciens</option>
                      {technicians.map((technician) => (
                        <option key={technician.id} value={technician.id}>
                          {technician.name}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      {supportSummary.weatherNote}
                    </div>
                  </div>
                  </div>
                ) : null}

                <div className="w-full rounded-[24px] border border-blue-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="rounded-[22px] bg-[linear-gradient(135deg,#eef4ff_0%,#f8fbff_100%)] p-4 lg:w-[340px] lg:flex-none">
                      <p className="text-3xl font-semibold uppercase tracking-tight text-blue-600">
                        {supportSummary.dateLabel}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{supportSummary.weekLabel}</p>
                      <div className="mt-4 space-y-2 text-sm text-slate-500">
                        <p>
                          Derniere modification : {lastUpdate}
                          {lastModifiedBy ? ` par ${lastModifiedBy}` : ""}
                        </p>
                        <p>Statut edition : {formatEditStatusLabel(editStatus)}</p>
                        <p>Verrou : {lockedBy ? `${lockedBy} (${formatLockTimestamp(lockedAt)})` : "Libre"}</p>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">Commentaires journee</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Notes generales visibles dans le support journee et reprises sur l&apos;impression.
                          </p>
                        </div>
                        {!canEdit ? (
                          <p className="text-sm font-semibold text-slate-400">
                            Prenez la main pour modifier les commentaires.
                          </p>
                        ) : null}
                      </div>
                      <textarea
                        className="mt-3 min-h-[72px] w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400"
                        disabled={!canEdit}
                        onChange={(event) => setGlobalObservation(event.target.value)}
                        placeholder="Annotations de la journee, consignes, points d'attention..."
                        value={globalObservation}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(135deg,#f7fbff_0%,#ffffff_100%)] p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Previsions meteo terrain</h3>
                    <p className="mt-1 text-sm text-slate-500">{supportSummary.weatherNote}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-4">
                  {dayWeather.length > 0 ? (
                    dayWeather.map((zone) => (
                      <article
                        key={zone.id}
                        className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold text-slate-950">{zone.label}</p>
                            <p className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-950">
                              {zone.minTempC ?? "—"}° / {zone.maxTempC ?? "—"}°
                            </p>
                          </div>
                          <div className="text-2xl leading-none" title={zone.weatherLabel}>
                            {zone.weatherIcon}
                          </div>
                        </div>

                        <dl className="mt-3 space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-500">Prob. pluie</dt>
                            <dd className="font-semibold text-slate-950">
                              {zone.rainProbabilityPercent ?? "—"}%
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-500">Cumul pluie</dt>
                            <dd className="font-semibold text-slate-950">
                              {zone.precipitationMm ?? 0} mm
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-slate-500">Heures humides</dt>
                            <dd className="font-semibold text-slate-950">{zone.humidHours} h</dd>
                          </div>
                        </dl>

                        <div
                          className={cx(
                            "mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            rsfTone(zone.rsfLevel),
                          )}
                        >
                          {zone.rsfLabel}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-sm text-slate-500 xl:col-span-4">
                      Aucune donnee meteo detaillee disponible pour cette journee.
                    </div>
                  )}
                </div>
              </section>

              <section className="sticky top-4 z-40 flex flex-wrap items-center gap-3 rounded-[26px] border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur">
                {dateNavigatorControls}
                <button
                  className={cx(
                    "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
                    canTakeControl
                      ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      : "border-slate-200 bg-slate-100 text-slate-400",
                  )}
                  disabled={!canTakeControl || isBusy}
                  onClick={handleTakeControl}
                  type="button"
                >
                  {isLockedByCurrentUser ? "Prise en main active" : "Prendre la main"}
                </button>
                <button
                  className={cx(
                    "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
                    canEdit
                      ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
                      : "border-slate-200 bg-slate-100 text-slate-400",
                  )}
                  disabled={!canEdit || isBusy}
                  onClick={handleReleaseControl}
                  type="button"
                >
                  Liberer la journee
                </button>
                <button
                  className={cx(
                    "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition",
                    canEdit
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-400",
                  )}
                  disabled={!canEdit || isBusy}
                  onClick={handleSave}
                  type="button"
                >
                  {isSavingAssignments ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                  onClick={handlePrint}
                  type="button"
                >
                  Imprimer
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
                  type="button"
                >
                  CSV
                </button>
                <span
                  className={cx(
                    "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                    saveStateBadgeClassName,
                  )}
                >
                  {saveStateLabel}
                </span>
                {dailyCheckActivities.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {dailyCheckActivities.map(({ activity, currentCount, extraCount, isSatisfied, requiredCount }) => (
                      <article
                        key={`daily-check-${activity.id}`}
                        className={cx(
                          "min-w-[126px] rounded-2xl border px-3 py-2 shadow-sm",
                          isSatisfied
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-rose-200 bg-rose-50 text-rose-900",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-white/70 shadow-sm"
                            style={{ backgroundColor: activity.color }}
                          />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                            {activity.label}
                          </p>
                        </div>
                        <p className={cx("mt-1 text-sm font-semibold", isSatisfied ? "text-emerald-700" : "text-rose-700")}>
                          {requiredCount == null
                            ? formatTechnicianLabel(currentCount)
                            : isSatisfied
                              ? `${formatTechnicianLabel(requiredCount)}${extraCount > 0 ? ` +${extraCount}` : ""}`
                              : `${currentCount} / ${requiredCount} TG`}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}
                <div className="ml-auto">
                  <button
                    className={cx(
                      "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      canEdit
                        ? "border-rose-200 bg-rose-50 text-rose-500"
                        : "border-slate-200 bg-slate-100 text-slate-400",
                    )}
                    disabled={!canEdit || isBusy}
                    onClick={handleReset}
                    type="button"
                  >
                    Vider
                  </button>
                </div>
              </section>

              <section
                className={cx(
                  "rounded-[24px] px-4 py-3 text-sm shadow-sm",
                  saveStatePanelClassName,
                )}
              >
                <p>{statusMessage}</p>
                {hasUnsavedChanges ? (
                  <p className={cx("mt-1", saveStateAccentClassName)}>
                    Des modifications locales sont en attente d&apos;enregistrement.
                  </p>
                ) : null}
                {source === "supabase" && isLockedByCurrentUser && !hasUnsavedChanges ? (
                  <p className={cx("mt-1", saveStateAccentClassName)}>
                    Les modifications sont synchronisees automatiquement avec Supabase.
                  </p>
                ) : null}
              </section>

              <section
                ref={tableSectionRef}
                className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm"
              >
                <div
                  ref={tableHeaderRef}
                  className={cx(
                    "overflow-x-auto border-b border-slate-200/80",
                    tableHeaderFrame.isPinned ? "fixed z-30" : "relative",
                  )}
                  style={
                    tableHeaderFrame.isPinned
                      ? {
                          top: tableHeaderTop,
                          left: tableHeaderFrame.left,
                          width: tableHeaderFrame.width,
                        }
                      : undefined
                  }
                >
                  <table className="min-w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[52px]" />
                      <col className="w-[16%]" />
                      <col className="w-[8%]" />
                      <col className="w-[15%]" />
                      <col className="w-[16%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[7%]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[linear-gradient(90deg,#2d63da_0%,#3567e7_100%)] text-white">
                        {[
                          "#",
                          "Agent",
                          "PTC-PTD",
                          "Activite",
                          "Observations",
                          "Brief",
                          "Brief",
                          "Debrief",
                          "Debrief",
                          "GRV",
                        ].map((heading, index) => (
                          <th
                            key={`${heading}-${index}`}
                            className={cx(
                              "bg-[linear-gradient(90deg,#2d63da_0%,#3567e7_100%)] px-3 py-4 text-center font-semibold",
                              (index === 5 || index === 7 || index === 9) &&
                                "border-l border-white/25",
                              (index === 6 || index === 8 || index === 9) &&
                                "border-r border-white/25",
                            )}
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-200 bg-blue-50 text-xs uppercase tracking-[0.18em] text-blue-700">
                        <th className="bg-blue-50 px-3 py-3" />
                        <th className="bg-blue-50 px-3 py-3" />
                        <th className="bg-blue-50 px-3 py-3" />
                        <th className="bg-blue-50 px-3 py-3" />
                        <th className="bg-blue-50 px-3 py-3" />
                        <th className="border-l border-blue-200 bg-blue-50 px-3 py-3 text-center">
                          Agence
                        </th>
                        <th className="border-r border-blue-200 bg-blue-50 px-3 py-3 text-center">
                          Distance
                        </th>
                        <th className="border-l border-blue-200 bg-blue-50 px-3 py-3 text-center">
                          Agence
                        </th>
                        <th className="border-r border-blue-200 bg-blue-50 px-3 py-3 text-center">
                          Distance
                        </th>
                        <th className="border-x border-blue-200 bg-blue-50 px-3 py-3 text-center" />
                      </tr>
                    </thead>
                  </table>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed text-sm">
                    <colgroup>
                      <col className="w-[52px]" />
                      <col className="w-[16%]" />
                      <col className="w-[8%]" />
                      <col className="w-[15%]" />
                      <col className="w-[16%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[8.5%]" />
                      <col className="w-[7%]" />
                    </colgroup>
                    <tbody>
                      {filteredAssignments.map((assignment) => {
                        const rowActivity = assignment.activity
                          ? activityByLabel.get(assignment.activity)
                          : undefined;
                        const isAbsentRow = rowActivity?.status === "Absent";

                        return (
                        <tr
                          key={assignment.id}
                          className={cx(
                            "border-b border-slate-100 transition-colors",
                            isAbsentRow
                              ? "bg-rose-50/70 hover:bg-rose-100/70"
                              : "hover:bg-slate-50/70",
                          )}
                        >
                          <td className="px-3 py-3 align-middle">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-700">
                              {assignment.rank}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-semibold text-slate-900 align-middle">
                            {assignment.agent}
                          </td>
                          <td className="px-3 py-3 text-center text-slate-600 align-middle">
                            {assignment.workMode}
                          </td>
                          <td className="px-3 py-3 align-middle text-center">
                            {(() => {
                              const selectedActivity = rowActivity;

                              return (
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-sm outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(
                                  assignment.id,
                                  "activity",
                                  event.target.value || null,
                                )
                              }
                              value={normalizeActivity(assignment.activity)}
                              style={{
                                ...(activitySelectStyle(selectedActivity) ?? {}),
                                textAlign: "center",
                                textAlignLast: "center",
                              }}
                            >
                              <option value="">—</option>
                              {sortedActivityDefinitions.map((activity) => (
                                <option key={activity.id} value={activity.label}>
                                  {activity.label}
                                </option>
                              ))}
                            </select>
                              );
                            })()}
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(
                                  assignment.id,
                                  "observations",
                                  event.target.value,
                                )
                              }
                              value={normalizeField(assignment.observations)}
                            />
                          </td>
                          <td className="border-l border-blue-100 bg-blue-50/35 px-3 py-3 align-middle">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(
                                  assignment.id,
                                  "briefAgence",
                                  event.target.value,
                                )
                              }
                              value={normalizeField(assignment.briefAgence)}
                            >
                              <option value="">—</option>
                              <option value="OK">OK</option>
                              <option value="A faire">A faire</option>
                            </select>
                          </td>
                          <td className="border-r border-blue-100 bg-blue-50/35 px-3 py-3 align-middle">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(
                                  assignment.id,
                                  "briefDistance",
                                  event.target.value,
                                )
                              }
                              value={normalizeField(assignment.briefDistance)}
                            >
                              <option value="">—</option>
                              <option value="OK">OK</option>
                              <option value="A faire">A faire</option>
                            </select>
                          </td>
                          <td className="border-l border-emerald-100 bg-emerald-50/30 px-3 py-3 align-middle">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(
                                  assignment.id,
                                  "debriefAgence",
                                  event.target.value,
                                )
                              }
                              value={normalizeField(assignment.debriefAgence)}
                            >
                              <option value="">—</option>
                              <option value="OK">OK</option>
                              <option value="A faire">A faire</option>
                            </select>
                          </td>
                          <td className="border-r border-emerald-100 bg-emerald-50/30 px-3 py-3 align-middle">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(
                                  assignment.id,
                                  "debriefDistance",
                                  event.target.value,
                                )
                              }
                              value={normalizeField(assignment.debriefDistance)}
                            >
                              <option value="">—</option>
                              <option value="OK">OK</option>
                              <option value="A faire">A faire</option>
                            </select>
                          </td>
                          <td className="border-x border-amber-100 bg-amber-50/35 px-3 py-3 align-middle">
                            <select
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!canEdit}
                              onChange={(event) =>
                                updateAssignment(assignment.id, "gtv", event.target.value)
                              }
                              value={normalizeField(assignment.gtv)}
                            >
                              <option value="">—</option>
                              <option value="Oui">Oui</option>
                              <option value="Non">Non</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === "activities" ? (
            <div className="mt-6 space-y-5">
              <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
                      Paramétrage des activités
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Gere les couleurs, les statuts et les libelles qui serviront ensuite dans le
                      tableau quotidien.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <input
                      className="min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
                      onChange={(event) =>
                        setNewActivity((current) => ({
                          ...current,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Nom nouvelle activité..."
                      value={newActivity.label}
                    />
                    <label
                      className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-slate-300 shadow-inner"
                      style={{ backgroundColor: newActivity.color }}
                    >
                      <input
                        className="sr-only"
                        onChange={(event) =>
                          setNewActivity((current) => ({
                            ...current,
                            color: event.target.value,
                          }))
                        }
                        type="color"
                        value={newActivity.color}
                      />
                    </label>
                    <select
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                      onChange={(event) =>
                        setNewActivity((current) => ({
                          ...current,
                          status: event.target.value as ActivityStatusValue,
                        }))
                      }
                      value={newActivity.status}
                      >
                      <option value="Present">Présent</option>
                      <option value="Absent">Absent</option>
                      <option value="Greve">Grève</option>
                    </select>
                    <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                      <input
                        checked={newActivity.showInDailyCheck}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        onChange={(event) =>
                          setNewActivity((current) => ({
                            ...current,
                            showInDailyCheck: event.target.checked,
                            requiredTechnicians:
                              event.target.checked && !current.requiredTechnicians
                                ? "1"
                                : current.requiredTechnicians,
                          }))
                        }
                        type="checkbox"
                      />
                      Afficher dans le contrôle
                    </label>
                    <input
                      className="w-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={!newActivity.showInDailyCheck}
                      inputMode="numeric"
                      min="1"
                      onChange={(event) =>
                        setNewActivity((current) => ({
                          ...current,
                          requiredTechnicians: event.target.value,
                        }))
                      }
                      placeholder="Nb. TG"
                      type="number"
                      value={newActivity.requiredTechnicians}
                    />
                    <button
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                      disabled={isBusy}
                      onClick={handleCreateActivity}
                      type="button"
                    >
                      + Ajouter
                    </button>
                  </div>
                </div>
              </section>

              <section className="flex flex-wrap gap-3">
                <input
                  className="min-w-[260px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400"
                  onChange={(event) => setActivitySearch(event.target.value)}
                  placeholder="Rechercher activité..."
                  value={activitySearch}
                />
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  onClick={resetActivityFilters}
                  type="button"
                >
                  Réinitialiser
                </button>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                {filteredActivities.map((activity) => (
                  <article
                    key={activity.id}
                    className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm"
                  >
                    {editingActivityId === activity.id && editingActivity ? (
                      <>
                        <div className="space-y-3">
                          <input
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                            onChange={(event) =>
                              setEditingActivity((current) =>
                                current
                                  ? { ...current, label: event.target.value }
                                  : current,
                              )
                            }
                            value={editingActivity.label}
                          />
                          <div className="flex items-center gap-3">
                            <label
                              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 shadow-inner"
                              style={{ backgroundColor: editingActivity.color }}
                            >
                              <input
                                className="sr-only"
                                onChange={(event) =>
                                  setEditingActivity((current) =>
                                    current
                                      ? { ...current, color: event.target.value }
                                      : current,
                                  )
                                }
                                type="color"
                                value={editingActivity.color}
                              />
                            </label>
                            <select
                              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                              onChange={(event) =>
                                setEditingActivity((current) =>
                                  current
                                    ? {
                                        ...current,
                                        status: event.target.value as ActivityStatusValue,
                                      }
                                    : current,
                                )
                              }
                              value={editingActivity.status}
                            >
                              <option value="Present">Présent</option>
                              <option value="Absent">Absent</option>
                              <option value="Greve">Grève</option>
                            </select>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                              <input
                                checked={editingActivity.showInDailyCheck}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                onChange={(event) =>
                                  setEditingActivity((current) =>
                                    current
                                      ? {
                                          ...current,
                                          showInDailyCheck: event.target.checked,
                                          requiredTechnicians:
                                            event.target.checked && !current.requiredTechnicians
                                              ? "1"
                                              : current.requiredTechnicians,
                                        }
                                      : current,
                                  )
                                }
                                type="checkbox"
                              />
                              Afficher dans le contrôle
                            </label>
                            <input
                              className="w-[140px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 disabled:bg-slate-100 disabled:text-slate-400"
                              disabled={!editingActivity.showInDailyCheck}
                              inputMode="numeric"
                              min="1"
                              onChange={(event) =>
                                setEditingActivity((current) =>
                                  current
                                    ? {
                                        ...current,
                                        requiredTechnicians: event.target.value,
                                      }
                                    : current,
                                )
                              }
                              placeholder="Nb. TG"
                              type="number"
                              value={editingActivity.requiredTechnicians}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700"
                            onClick={() => handleUpdateActivity(activity.id)}
                            type="button"
                          >
                            Enregistrer
                          </button>
                          <button
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                            onClick={cancelActivityEdit}
                            type="button"
                          >
                            Annuler
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <div
                            className="h-6 w-10 rounded-sm border border-slate-400 shadow-inner"
                            style={{ backgroundColor: activity.color }}
                          />
                          <div>
                            <h3 className="text-base font-semibold text-slate-900">
                              {activity.label}
                            </h3>
                            <span
                              className={cx(
                                "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                                statusTone(activity.status),
                              )}
                            >
                              {activity.status}
                            </span>
                            {activity.showInDailyCheck ? (
                              <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                Controle jour
                                {activity.requiredTechnicians != null
                                  ? ` • min. ${activity.requiredTechnicians}`
                                  : ""}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                            onClick={() => startActivityEdit(activity)}
                            type="button"
                          >
                            Modifier
                          </button>
                          <button
                            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"
                            onClick={() => handleDeleteActivity(activity.id)}
                            type="button"
                          >
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </section>
            </div>
          ) : null}

          {activeTab === "history" ? (
            <div className="mt-6 space-y-5">
              <section className="grid gap-4 xl:grid-cols-3">
                {[
                  { value: String(supportMetrics.totalDays), label: "Jours saisis" },
                  { value: String(supportMetrics.totalRows), label: "Lignes totales" },
                  { value: supportMetrics.topActivity, label: "Top activité" },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-[24px] border border-slate-200/80 bg-white p-6 text-center shadow-sm"
                  >
                    <p className="text-4xl font-semibold tracking-tight text-blue-600">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm uppercase tracking-[0.22em] text-slate-500">
                      {item.label}
                    </p>
                  </article>
                ))}
              </section>

              <section className="flex flex-wrap gap-3 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  onChange={(event) => setHistoryStartDate(event.target.value)}
                  type="date"
                  value={historyStartDate}
                />
                <input
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  onChange={(event) => setHistoryEndDate(event.target.value)}
                  type="date"
                  value={historyEndDate}
                />
                <select
                  className="min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                  onChange={(event) => setHistoryAgent(event.target.value)}
                  value={historyAgent}
                >
                  <option value="all">Tous agents</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.name}>
                      {technician.name}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
                  onClick={applyHistoryFilters}
                  type="button"
                >
                  Filtrer
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  onClick={resetHistoryFilters}
                  type="button"
                >
                  Réinitialiser
                </button>
              </section>

              <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm">
                <div className="max-h-[680px] overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-slate-700">
                      <tr>
                        {["Date", "Agent", "Activite", "Obs", "Brief", "Debrief", "GRV"].map(
                          (heading) => (
                            <th key={heading} className="px-4 py-4 font-semibold">
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((entry) => (
                        <tr key={entry.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 text-slate-600">{entry.date}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{entry.agent}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                              {entry.activity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {entry.observation || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{entry.brief || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{entry.debrief || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{entry.grv || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>

      {pendingNavigation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <h3 className="text-xl font-semibold text-slate-950">
              Des modifications ne sont pas encore enregistrées
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Vous pouvez poursuivre sans sauvegarder, ou enregistrer vos modifications avant
              de quitter cette page.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                disabled={isBusy}
                onClick={() => setPendingNavigation(null)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 shadow-sm"
                disabled={isBusy}
                onClick={() => {
                  const target = pendingNavigation;
                  setPendingNavigation(null);
                  completeNavigation(target);
                }}
                type="button"
              >
                Poursuivre sans enregistrer
              </button>
              <button
                className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                disabled={isBusy}
                onClick={() => void handleSaveAndContinue()}
                type="button"
              >
                {isSavingAssignments ? "Enregistrement..." : "Enregistrer puis continuer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
