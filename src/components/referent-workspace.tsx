"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShellHeader } from "@/components/app-shell-header";
import type { BtImportDayOverview } from "@/lib/bt-import-days";
import { getModuleTheme } from "@/lib/module-theme";
import { detectPrimaryBadge } from "@/lib/pdf-import/badges";
import type { ExtractedBt } from "@/lib/pdf-import/types";
import type { OfficeModuleKey } from "@/lib/office-access";

type ReferentWorkspaceProps = {
  allowedModules?: OfficeModuleKey[];
  data: BtImportDayOverview;
  headerDateTimeLabel: string;
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
  weatherGeneratedAtLabel?: string | null;
  weatherZones?: import("@/lib/weather").HeaderWeatherZone[];
};

type DispatchStatus = "unassigned" | "assigned" | "review" | "ready";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getUniqueTeamMembers(bt: ExtractedBt) {
  const members = new Map<string, string>();

  for (const member of bt.team) {
    const label = (member.name || member.nni || "").trim();

    if (!label) {
      continue;
    }

    const key = (member.nni || label).trim().toUpperCase();

    if (!members.has(key)) {
      members.set(key, label);
    }
  }

  return [...members.entries()].map(([key, label]) => ({ key, label }));
}

function getDispatchStatus(bt: ExtractedBt): DispatchStatus {
  const members = getUniqueTeamMembers(bt);

  if (members.length === 0) {
    return "unassigned";
  }

  if (members.length > 1) {
    return "review";
  }

  const hasOperationalContext = Boolean(bt.observations || bt.analyseDesRisques);

  if (hasOperationalContext) {
    return "ready";
  }

  return "assigned";
}

function getDispatchStatusMeta(status: DispatchStatus) {
  switch (status) {
    case "unassigned":
      return {
        label: "A affecter",
        badgeClassName: "border-amber-200 bg-amber-50 text-amber-800",
        panelClassName: "border-amber-200 bg-[linear-gradient(180deg,#fff9ec_0%,#fff4dd_100%)]",
      };
    case "review":
      return {
        label: "A revoir",
        badgeClassName: "border-violet-200 bg-violet-50 text-violet-800",
        panelClassName: "border-violet-200 bg-[linear-gradient(180deg,#faf5ff_0%,#f3e8ff_100%)]",
      };
    case "ready":
      return {
        label: "Pret mobile",
        badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-800",
        panelClassName: "border-emerald-200 bg-[linear-gradient(180deg,#f1fcf6_0%,#e8f9ef_100%)]",
      };
    default:
      return {
        label: "Affecte",
        badgeClassName: "border-blue-200 bg-blue-50 text-blue-800",
        panelClassName: "border-blue-200 bg-[linear-gradient(180deg,#f6faff_0%,#edf5ff_100%)]",
      };
  }
}

function getOperationalCounts(bts: ExtractedBt[]) {
  return bts.reduce(
    (counts, bt) => {
      counts.total += 1;

      switch (getDispatchStatus(bt)) {
        case "unassigned":
          counts.unassigned += 1;
          break;
        case "review":
          counts.review += 1;
          break;
        case "ready":
          counts.ready += 1;
          break;
        default:
          counts.assigned += 1;
          break;
      }

      return counts;
    },
    { total: 0, unassigned: 0, assigned: 0, review: 0, ready: 0 },
  );
}

function getUniqueTechnicians(bts: ExtractedBt[]) {
  return [...new Set(bts.flatMap((bt) => getUniqueTeamMembers(bt).map((member) => member.label)))].sort();
}

function getCompactDuration(value: string) {
  return value.replace(/\s+/g, " ").trim() || "Duree non detectee";
}

export function ReferentWorkspace({
  allowedModules = [],
  data,
  headerDateTimeLabel,
  isSuperAdmin = false,
  role,
  userEmail,
  weatherGeneratedAtLabel,
  weatherZones = [],
}: ReferentWorkspaceProps) {
  const referentTheme = getModuleTheme("referent");
  const { bts, currentDay, days } = data;
  const [query, setQuery] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<DispatchStatus | "all">("all");
  const [viewportWidth, setViewportWidth] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedAssignments, setExpandedAssignments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function syncViewportWidth() {
      setViewportWidth(window.innerWidth);
    }

    syncViewportWidth();
    window.addEventListener("resize", syncViewportWidth);

    return () => {
      window.removeEventListener("resize", syncViewportWidth);
    };
  }, []);

  const technicianOptions = useMemo(() => getUniqueTechnicians(bts), [bts]);

  const filteredBts = useMemo(() => {
    return bts.filter((bt) => {
      const status = getDispatchStatus(bt);
      const teamMembers = getUniqueTeamMembers(bt);
      const queryMatch =
        query.length === 0 ||
        normalizeText(
          [
            bt.id,
            bt.objet,
            bt.client,
            bt.localisation,
            bt.atNum,
            ...teamMembers.map((member) => member.label),
          ].join(" "),
        ).includes(normalizeText(query));

      const technicianMatch =
        selectedTechnician === "all" || teamMembers.some((member) => member.label === selectedTechnician);

      const statusMatch = selectedStatus === "all" || status === selectedStatus;

      return queryMatch && technicianMatch && statusMatch;
    });
  }, [bts, query, selectedStatus, selectedTechnician]);

  const groupedBts = useMemo(() => {
    const groups = new Map<string, { label: string; secondary: string; entries: ExtractedBt[] }>();

    for (const bt of filteredBts) {
      const teamMembers = getUniqueTeamMembers(bt);
      const key = teamMembers.length > 0 ? teamMembers.map((member) => member.key).join("|") : "UNASSIGNED";
      const label =
        teamMembers.length > 0 ? teamMembers.map((member) => member.label).join(" / ") : "Sans affectation";
      const secondary =
        teamMembers.length > 0
          ? `${teamMembers.length} technicien(s) sur ce groupe`
          : "BT a redistribuer ou completer";

      const existing = groups.get(key) ?? { label, secondary, entries: [] };
      existing.entries.push(bt);
      groups.set(key, existing);
    }

    return [...groups.entries()]
      .map(([key, group]) => ({ key, ...group }))
      .sort((left, right) => {
        if (left.key === "UNASSIGNED") {
          return -1;
        }

        if (right.key === "UNASSIGNED") {
          return 1;
        }

        return left.label.localeCompare(right.label, "fr", { sensitivity: "base" });
      });
  }, [filteredBts]);

  const counts = useMemo(() => getOperationalCounts(filteredBts), [filteredBts]);
  const desktopGridColumns = useMemo(() => {
    if (viewportWidth >= 1700) {
      return 4;
    }

    if (viewportWidth >= 1280) {
      return 3;
    }

    if (viewportWidth >= 900) {
      return 2;
    }

    return 1;
  }, [viewportWidth]);

  function handleSelectedDayChange(dayDate: string) {
    if (!dayDate) {
      return;
    }

    window.location.href = `/referent?date=${dayDate}`;
  }

  function toggleGroupNames(groupKey: string) {
    setExpandedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  function toggleAssignmentNames(btKey: string) {
    setExpandedAssignments((current) => ({
      ...current,
      [btKey]: !current[btKey],
    }));
  }

  return (
    <main className={cx("min-h-screen px-3 py-3 text-slate-900 sm:px-5 sm:py-4 lg:px-6 xl:px-8", referentTheme.pageBackgroundClassName)}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="referent"
          allowedModules={allowedModules}
          headerDateTimeLabel={headerDateTimeLabel}
          isSuperAdmin={isSuperAdmin}
          role={role}
          title="Référent"
          userEmail={userEmail}
          weatherGeneratedAtLabel={weatherGeneratedAtLabel}
          weatherZones={weatherZones}
        />

        <section className="mt-4 rounded-[28px] border border-white/80 bg-white/72 p-4 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur sm:mt-5 sm:p-5 lg:p-6 xl:p-8">
          <section className="sticky top-4 z-20 rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.96)_100%)] p-4 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                  Journée chargée
                </p>
                <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950">
                  {currentDay ? formatDayLabel(currentDay.dayDate) : "Aucune journée"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Vue référent centrée sur l&apos;affectation, la réaffectation et la préparation de l&apos;envoi terrain.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "BT", value: counts.total, tone: "text-slate-950" },
                  { label: "À affecter", value: counts.unassigned, tone: "text-amber-700" },
                  { label: "À revoir", value: counts.review, tone: "text-violet-700" },
                  { label: "Prêts", value: counts.ready, tone: "text-emerald-700" },
                  { label: "Site", value: currentDay?.siteCode ?? "—", tone: "text-slate-950" },
                ].map((metric) => (
                  <article
                    key={metric.label}
                    className="min-w-[110px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      {metric.label}
                    </p>
                    <p className={cx("mt-1 text-2xl font-semibold tracking-tight", metric.tone)}>{metric.value}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-sm min-[1700px]:grid-cols-[240px_minmax(0,1fr)_240px_200px_auto]">
              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400"
                onChange={(event) => handleSelectedDayChange(event.target.value)}
                value={currentDay?.dayDate ?? ""}
              >
                {days.map((day) => (
                  <option key={day.id} value={day.dayDate}>
                    {formatDayLabel(day.dayDate)}
                  </option>
                ))}
              </select>

              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un BT, client, adresse ou équipe..."
                value={query}
              />

              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                onChange={(event) => setSelectedTechnician(event.target.value)}
                value={selectedTechnician}
              >
                <option value="all">Tous les techniciens</option>
                {technicianOptions.map((technician) => (
                  <option key={technician} value={technician}>
                    {technician}
                  </option>
                ))}
              </select>

              <select
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                onChange={(event) => setSelectedStatus(event.target.value as DispatchStatus | "all")}
                value={selectedStatus}
              >
                <option value="all">Tous les etats</option>
                <option value="unassigned">A affecter</option>
                <option value="assigned">Affectes</option>
                <option value="review">A revoir</option>
                <option value="ready">Prets mobile</option>
              </select>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  type="button"
                >
                  Importer BT unitaire
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
                  type="button"
                >
                  Preparer l&apos;envoi mobile
                </button>
              </div>
            </div>
          </section>

          <section className="mt-5 space-y-4">
            {groupedBts.length > 0 ? (
              <div
                className="grid auto-rows-max gap-4"
                style={{
                  gridAutoFlow: desktopGridColumns > 1 ? "row dense" : "row",
                  gridTemplateColumns: `repeat(${desktopGridColumns}, minmax(0, 1fr))`,
                }}
              >
                {groupedBts.map((group) => {
                  const groupSpan = Math.min(group.entries.length, desktopGridColumns);
                  const isGroupExpanded = expandedGroups[group.key] ?? false;
                  const groupMembers = group.key === "UNASSIGNED" ? [] : group.label.split(" / ").filter(Boolean);
                  const visibleGroupMembers = isGroupExpanded ? groupMembers : groupMembers.slice(0, 2);
                  const hiddenGroupMembersCount = Math.max(0, groupMembers.length - visibleGroupMembers.length);

                  return (
                    <article
                      key={group.key}
                      className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_16px_34px_rgba(148,163,184,0.1)] sm:p-4"
                      style={{
                        gridColumn: `span ${groupSpan} / span ${groupSpan}`,
                      }}
                    >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                    <div>
                      <h3 className="text-[1.2rem] font-semibold tracking-tight text-slate-950 sm:text-[1.3rem]">
                        {groupMembers.length > 0 ? visibleGroupMembers.join(" / ") : group.label}
                      </h3>
                      {groupMembers.length > 2 ? (
                        <button
                          className="mt-1 inline-flex items-center gap-2 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800"
                          onClick={() => toggleGroupNames(group.key)}
                          type="button"
                        >
                          <span>{isGroupExpanded ? "Replier les noms" : `Afficher ${hiddenGroupMembersCount} nom(s)`}</span>
                          <span className="text-xs">{isGroupExpanded ? "↑" : "↓"}</span>
                        </button>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">{group.secondary}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {group.entries.length} BT
                    </span>
                  </div>

                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(group.entries.length, desktopGridColumns)}, minmax(0, 1fr))`,
                    }}
                  >
                    {group.entries.map((bt) => {
                      const primaryBadge = detectPrimaryBadge(bt);
                      const teamMembers = getUniqueTeamMembers(bt);
                      const status = getDispatchStatus(bt);
                      const statusMeta = getDispatchStatusMeta(status);
                      const btKey = `${bt.id}-${bt.pageStart}`;
                      const isAssignmentExpanded = expandedAssignments[btKey] ?? false;
                      const visibleTeamMembers = isAssignmentExpanded ? teamMembers : teamMembers.slice(0, 3);
                      const hiddenTeamMembersCount = Math.max(0, teamMembers.length - visibleTeamMembers.length);

                      return (
                        <article
                          key={btKey}
                          className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(148,163,184,0.1)]"
                        >
                          <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-3.5 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-[1.05rem] font-semibold tracking-tight text-slate-950 sm:text-[1.15rem]">
                                    {bt.id}
                                  </h4>
                                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                    Page {bt.pageStart}
                                  </span>
                                  {primaryBadge ? (
                                    <span
                                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                                      style={{ backgroundColor: primaryBadge.color }}
                                    >
                                      {primaryBadge.icon} {primaryBadge.label}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-slate-600">
                                  {bt.objet || "Objet non reconnu"}
                                </p>
                              </div>
                              <span
                                className={cx(
                                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                  statusMeta.badgeClassName,
                                )}
                              >
                                {statusMeta.label}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 px-3.5 py-3">
                            <div className="grid gap-x-3 gap-y-2 text-[11px] text-slate-700 sm:grid-cols-2">
                              <div>📅 {bt.datePrevue || "Date non detectee"}</div>
                              <div>⏱️ {getCompactDuration(bt.duree)}</div>
                              <div>👤 {bt.client || "Client non detecte"}</div>
                              <div>🧾 {bt.atNum || "AT non detecte"}</div>
                            </div>

                            <div className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-3 py-2.5">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Localisation
                              </p>
                              <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-slate-700">
                                {bt.localisation || "Non reconnue"}
                              </p>
                            </div>

                            <div className={cx("rounded-[16px] border px-3 py-2.5", statusMeta.panelClassName)}>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Affectation actuelle
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {teamMembers.length > 0 ? (
                                  <>
                                    {visibleTeamMembers.map((member) => (
                                    <span
                                      key={`${bt.id}-${member.key}`}
                                      className="rounded-full border border-white/80 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm"
                                    >
                                      {member.label}
                                    </span>
                                    ))}
                                    {hiddenTeamMembersCount > 0 ? (
                                      <button
                                        className="rounded-full border border-dashed border-slate-300 bg-white/88 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
                                        onClick={() => toggleAssignmentNames(btKey)}
                                        type="button"
                                      >
                                        {isAssignmentExpanded ? "Replier" : `+${hiddenTeamMembersCount} noms`}
                                      </button>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="text-[11px] text-slate-600">Aucune affectation definie</span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                              <button
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                                type="button"
                              >
                                Reaffecter
                              </button>
                              <button
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                                type="button"
                              >
                                Remplacer BT
                              </button>
                              <button
                                className="rounded-xl bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white"
                                type="button"
                              >
                                Preparer l&apos;envoi
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <article className="rounded-[26px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm">
                Aucun BT ne correspond aux filtres actifs.
              </article>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
