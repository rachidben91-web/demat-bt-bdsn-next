import type { MobileDispatchBtPayload, MobileDispatchItem } from "@/lib/mobile-dispatch";

export function extractFirstName(displayName: string, userEmail: string | null) {
  const tokens = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const [firstToken, secondToken] = tokens;

  if (firstToken && secondToken && firstToken === firstToken.toUpperCase()) {
    return secondToken;
  }

  if (firstToken) {
    return firstToken;
  }

  if (!userEmail) {
    return "Technicien";
  }

  const localPart = userEmail.split("@")[0] ?? "";
  const firstChunk = localPart.split(/[.\-_+]+/).find(Boolean) ?? localPart;

  if (!firstChunk) {
    return "Technicien";
  }

  return firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1).toLowerCase();
}

export function formatMissionDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export function departureInstructionLabel(value: MobileDispatchItem["departureInstruction"]) {
  if (value === "agency") {
    return "Passage agence obligatoire";
  }

  if (value === "direct") {
    return "Départ direct autorisé";
  }

  return "Départ à confirmer";
}

export function compactText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function formatDocumentBadges(
  docs: Array<{
    page: number;
    type: string;
  }>,
) {
  if (docs.length === 0) {
    return [];
  }

  const counts = docs.reduce<Record<string, number>>((accumulator, doc) => {
    const key = doc.type.trim().toUpperCase();

    if (!key) {
      return accumulator;
    }

    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([type, count]) => `${type}${count > 1 ? ` x${count}` : ""}`)
    .sort();
}

function parseClockToken(value: string) {
  const match = value.match(/(\d{1,2})h(\d{2})/i);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatClock(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}h${String(minutes).padStart(2, "0")}`;
}

export function extractTimeWindow(value: string) {
  const matches = Array.from(value.matchAll(/(\d{1,2}h\d{2})/gi)).map((item) => item[1]);

  if (matches.length >= 2) {
    const start = parseClockToken(matches[matches.length - 2]);
    const end = parseClockToken(matches[matches.length - 1]);

    if (start !== null || end !== null) {
      return {
        start,
        end,
        label:
          start !== null && end !== null
            ? `${formatClock(start)} - ${formatClock(end)}`
            : compactText(value),
      };
    }
  }

  return {
    start: null,
    end: null,
    label: compactText(value) || "Horaire à confirmer",
  };
}

export function buildDispatchStats(btPayload: MobileDispatchBtPayload[]) {
  let documentCount = 0;
  let alertCount = 0;
  let earliestStart: number | null = null;
  let latestEnd: number | null = null;

  for (const bt of btPayload) {
    documentCount += bt.docs.length;

    if (compactText(bt.analyseDesRisques)) {
      alertCount += 1;
    }

    if (compactText(bt.observations)) {
      alertCount += 1;
    }

    const window = extractTimeWindow(bt.duree);

    if (window.start !== null) {
      earliestStart =
        earliestStart === null ? window.start : Math.min(earliestStart, window.start);
    }

    if (window.end !== null) {
      latestEnd = latestEnd === null ? window.end : Math.max(latestEnd, window.end);
    }
  }

  return {
    alertCount,
    documentCount,
    scheduleLabel:
      earliestStart !== null && latestEnd !== null
        ? `${formatClock(earliestStart)} - ${formatClock(latestEnd)}`
        : "Horaires à confirmer",
  };
}
