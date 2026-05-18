"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { AppShellHeader } from "@/components/app-shell-header";
import type { BtImportDayOverview } from "@/lib/bt-import-days";
import { detectBtCategory, detectPrimaryBadge, getBtCategoryOrder } from "@/lib/pdf-import/badges";
import { openPdfDocumentFromUrl } from "@/lib/pdf-import/pdf-viewer";
import type { ExtractedBt } from "@/lib/pdf-import/types";
import { DOC_TYPES_CONFIG } from "@/lib/pdf-import/ui-config";
import type { OfficeModuleKey } from "@/lib/office-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type BriefWorkspaceProps = {
  allowedModules?: OfficeModuleKey[];
  data: BtImportDayOverview;
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
};

type ViewerState = {
  bt: ExtractedBt;
  currentPage: number;
};

type ViewMode = "large" | "compact";
type LayoutMode = "team" | "category";
type ScreenProfile = "tablet" | "desktop" | "wall";
type CollapsedGroups = Record<string, boolean>;

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

function formatDuree(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

function getTeamGroupSummary(bt: ExtractedBt) {
  const members = getUniqueTeamMembers(bt);

  if (members.length === 0) {
    return {
      key: "SANS_EQUIPE",
      label: "Sans affectation",
      secondaryLabel: "Aucune equipe detectee",
    };
  }

  const visible = members.slice(0, 2).map((member) => member.label);
  const hiddenCount = Math.max(0, members.length - visible.length);
  const label = hiddenCount > 0 ? `${visible.join(" / ")} +${hiddenCount}` : visible.join(" / ");

  return {
    key: members.map((member) => member.key).join("|"),
    label,
    secondaryLabel: `${members.length} technicien(s) dans cette equipe`,
  };
}

function getDocCounts(bt: ExtractedBt) {
  const counts = new Map<string, number>();

  for (const doc of bt.docs) {
    counts.set(doc.type, (counts.get(doc.type) ?? 0) + 1);
  }

  return [...counts.entries()];
}

function getUniqueTechnicianCount(bts: ExtractedBt[]) {
  return new Set(
    bts.flatMap((bt) => bt.team.map((member) => (member.nni || member.name || "").trim()).filter(Boolean)),
  ).size;
}

function getTeamPreview(bt: ExtractedBt, maxVisible = 4) {
  const members = getUniqueTeamMembers(bt);

  return {
    hiddenCount: Math.max(0, members.length - maxVisible),
    visible: members.slice(0, maxVisible),
  };
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getScreenProfile(width: number): ScreenProfile {
  if (width >= 2100) {
    return "wall";
  }

  if (width >= 1180) {
    return "desktop";
  }

  return "tablet";
}

function getAutoViewMode(profile: ScreenProfile): ViewMode {
  return profile === "wall" ? "compact" : "large";
}

export function BriefWorkspace({
  allowedModules = [],
  data,
  isSuperAdmin = false,
  role,
  userEmail,
}: BriefWorkspaceProps) {
  const { bts, currentDay, days } = data;
  const [query, setQuery] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("large");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("team");
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedGroups>({});
  const [viewerState, setViewerState] = useState<ViewerState | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerLoading, startViewerTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hasManualViewModeRef = useRef(false);

  const technicianOptions = useMemo(
    () =>
      [...new Set(bts.flatMap((bt) => bt.team.map((member) => member.name || member.nni)).filter(Boolean))].sort(),
    [bts],
  );

  const filteredBts = useMemo(() => {
    return bts.filter((bt) => {
      const queryMatch =
        query.length === 0 ||
        normalizeText(
          [
            bt.id,
            bt.objet,
            bt.client,
            bt.localisation,
            bt.atNum,
            ...bt.team.map((member) => `${member.nni} ${member.name}`),
          ].join(" "),
        ).includes(normalizeText(query));

      const technicianMatch =
        selectedTechnician === "all" ||
        bt.team.some((member) => (member.name || member.nni) === selectedTechnician);

      return queryMatch && technicianMatch;
    });
  }, [bts, query, selectedTechnician]);

  const groupedBts = useMemo(() => {
    const groups = new Map<
      string,
      {
        color?: string;
        entries: ExtractedBt[];
        icon?: string;
        label: string;
        order: number;
        secondaryLabel?: string;
      }
    >();

    for (const bt of filteredBts) {
      if (layoutMode === "category") {
        const category = detectBtCategory(bt);
        const existing = groups.get(category.id) ?? {
          color: category.color,
          entries: [],
          icon: category.icon,
          label: category.label,
          order: getBtCategoryOrder(category.id),
        };
        existing.entries.push(bt);
        groups.set(category.id, existing);
        continue;
      }

      const teamGroup = getTeamGroupSummary(bt);
      const existing = groups.get(teamGroup.key) ?? {
        entries: [],
        label: teamGroup.label,
        order: 999,
        secondaryLabel: teamGroup.secondaryLabel,
      };
      existing.entries.push(bt);
      groups.set(teamGroup.key, existing);
    }

    return [...groups.entries()]
      .map(([groupKey, group]) => ({ ...group, key: groupKey }))
      .sort((left, right) => {
        if (layoutMode === "category" && left.order !== right.order) {
          return left.order - right.order;
        }

        return left.label.localeCompare(right.label, "fr", { sensitivity: "base" });
      });
  }, [filteredBts, layoutMode]);

  const sortedViewerPages = useMemo(() => {
    if (!viewerState) {
      return [];
    }

    return viewerState.bt.docs.map((doc) => doc.page).sort((left, right) => left - right);
  }, [viewerState]);

  const currentViewerDoc = viewerState?.bt.docs.find((doc) => doc.page === viewerState.currentPage) ?? null;
  const isCompactView = viewMode === "compact";
  const isCategoryLayout = layoutMode === "category";
  const groupsGridClassName =
    isCategoryLayout
      ? "grid-cols-1"
      : viewMode === "compact"
        ? "columns-1 md:columns-2 min-[1500px]:columns-3 min-[2100px]:columns-4 [column-gap:1rem]"
        : "columns-1 min-[1200px]:columns-2 min-[1800px]:columns-3 [column-gap:1rem]";
  const emptyStateSpanClassName =
    isCategoryLayout
      ? "col-span-1"
      : viewMode === "compact"
      ? "min-[760px]:col-span-2 min-[1380px]:col-span-3 min-[1880px]:col-span-4 min-[2360px]:col-span-5"
      : "min-[900px]:col-span-2 min-[1750px]:col-span-3 min-[2250px]:col-span-4";

  useEffect(() => {
    function syncResponsivePreferences() {
      const profile = getScreenProfile(window.innerWidth);

      if (!hasManualViewModeRef.current) {
        setViewMode(getAutoViewMode(profile));
      }
    }

    syncResponsivePreferences();
    window.addEventListener("resize", syncResponsivePreferences);

    return () => {
      window.removeEventListener("resize", syncResponsivePreferences);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadViewerDocument() {
      if (!viewerState || !currentDay?.sourcePdfStoragePath) {
        return;
      }

      setViewerError(null);
      setPdfDocument(null);

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: signedData, error } = await supabase.storage
          .from("bt-import-pdfs")
          .createSignedUrl(currentDay.sourcePdfStoragePath, 3600);

        if (error || !signedData?.signedUrl) {
          throw error ?? new Error("URL signee introuvable.");
        }

        if (cancelled) {
          return;
        }

        setSignedUrl(signedData.signedUrl);
        const document = await openPdfDocumentFromUrl(signedData.signedUrl);

        if (!cancelled) {
          setPdfDocument(document);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setViewerError(caughtError instanceof Error ? caughtError.message : "Ouverture du PDF impossible.");
        }
      }
    }

    loadViewerDocument();

    return () => {
      cancelled = true;
    };
  }, [viewerState, currentDay?.sourcePdfStoragePath]);

  useEffect(() => {
    let cancelled = false;

    async function renderCurrentPage() {
      if (!viewerState || !pdfDocument || !canvasRef.current) {
        return;
      }

      try {
        const page = await pdfDocument.getPage(viewerState.currentPage);
        const viewport = page.getViewport({ scale: 1.65 });
        const canvas = canvasRef.current;

        if (!canvas) {
          return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (cancelled) {
          return;
        }
      } catch (caughtError) {
        if (!cancelled) {
          setViewerError(caughtError instanceof Error ? caughtError.message : "Rendu PDF impossible.");
        }
      }
    }

    renderCurrentPage();

    return () => {
      cancelled = true;
    };
  }, [viewerState, pdfDocument]);

  function openViewer(bt: ExtractedBt, page: number) {
    if (!currentDay?.sourcePdfStoragePath) {
      setViewerError("Le PDF source n'est pas disponible pour cette journee.");
      return;
    }

    setSignedUrl(null);
    setPdfDocument(null);
    setViewerError(null);

    startViewerTransition(() => {
      setViewerState({
        bt,
        currentPage: page,
      });
    });
  }

  function closeViewer() {
    setViewerState(null);
    setPdfDocument(null);
    setSignedUrl(null);
    setViewerError(null);
  }

  function goToPreviousPage() {
    if (!viewerState) {
      return;
    }

    const index = sortedViewerPages.indexOf(viewerState.currentPage);

    if (index > 0) {
      setViewerState({
        ...viewerState,
        currentPage: sortedViewerPages[index - 1],
      });
    }
  }

  function goToNextPage() {
    if (!viewerState) {
      return;
    }

    const index = sortedViewerPages.indexOf(viewerState.currentPage);

    if (index >= 0 && index < sortedViewerPages.length - 1) {
      setViewerState({
        ...viewerState,
        currentPage: sortedViewerPages[index + 1],
      });
    }
  }

  function handleViewModeChange(nextMode: ViewMode) {
    hasManualViewModeRef.current = true;
    setViewMode(nextMode);
  }

  function handleSelectedDayChange(dayDate: string) {
    if (!dayDate) {
      return;
    }

    window.location.href = `/brief?date=${dayDate}`;
  }

  function toggleGroup(groupKey: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [groupKey]: !current[groupKey],
    }));
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff_0%,#eef4fb_42%,#e7edf6_100%)] px-3 py-3 text-slate-900 sm:px-5 sm:py-4 lg:px-6 xl:px-8">
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="brief"
          allowedModules={allowedModules}
          isSuperAdmin={isSuperAdmin}
          role={role}
          subtitle="Vue referent enrichie : regroupement, pastilles metier, documents d'origine et navigation par equipe."
          title="Brief"
          userEmail={userEmail}
        />

        <section className="mt-4 rounded-[28px] border border-white/80 bg-white/72 p-4 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur sm:mt-5 sm:p-5 lg:p-6 xl:p-8">
          <div className="space-y-4 lg:space-y-5">
            <section className="sticky top-4 z-20 rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.96)_100%)] p-4 shadow-[0_18px_40px_rgba(148,163,184,0.16)] backdrop-blur">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                    Jour actif
                  </p>
                  <h2 className="mt-2 text-[1.85rem] font-semibold tracking-tight text-slate-950">
                    {currentDay ? formatDayLabel(currentDay.dayDate) : "Aucune journee"}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "BT", value: String(filteredBts.length) },
                    { label: "Equipes", value: String(groupedBts.length) },
                    { label: "Pages", value: String(currentDay?.pageCount ?? 0) },
                    { label: "Site", value: currentDay?.siteCode ?? "—" },
                  ].map((metric) => (
                    <article
                      key={metric.label}
                      className="min-w-[110px] rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(148,163,184,0.08)]"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                        {metric.value}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/90 p-3 shadow-sm">
                <div className="flex flex-col gap-3 min-[1680px]:grid min-[1680px]:grid-cols-[240px_minmax(0,0.9fr)_260px_auto] min-[1680px]:items-center">
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
                    placeholder="Rechercher un BT, client, adresse, equipe..."
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
                  <div className="flex flex-wrap gap-2 min-[1440px]:justify-end">
                    {[
                      { key: "large", label: "Grandes vignettes" },
                      { key: "compact", label: "Petites vignettes" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        className={cx(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          viewMode === option.key
                            ? "border-blue-200 bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700",
                        )}
                        onClick={() => handleViewModeChange(option.key as ViewMode)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                    {[
                      { key: "team", label: "Vignettes" },
                      { key: "category", label: "Categories" },
                    ].map((option) => (
                      <button
                        key={option.key}
                        className={cx(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          layoutMode === option.key
                            ? "border-slate-200 bg-slate-950 text-white shadow-[0_12px_24px_rgba(15,23,42,0.14)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950",
                        )}
                        onClick={() => setLayoutMode(option.key as LayoutMode)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="space-y-4 lg:space-y-5">
              <section
                className={cx(
                  isCategoryLayout ? "grid gap-5" : "space-y-0",
                  groupsGridClassName,
                )}
              >
                {groupedBts.length > 0 ? (
                  groupedBts.map((group) => (
                    <article
                      key={group.key}
                      className={cx(
                        "rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-4",
                        isCategoryLayout && "px-4 py-4 sm:px-5 sm:py-5",
                        !isCategoryLayout && "mb-4 inline-block w-full break-inside-avoid",
                      )}
                    >
                      <button
                        className="flex w-full flex-wrap items-center justify-between gap-3 pb-3 text-left"
                        onClick={() => {
                          if (isCategoryLayout) {
                            toggleGroup(group.key);
                          }
                        }}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          {isCategoryLayout ? (
                            <span
                              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-lg text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                              style={{ backgroundColor: group.color ?? "#94a3b8" }}
                            >
                              {group.icon}
                            </span>
                          ) : null}
                          <div>
                            <h3 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                              {group.label}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {isCategoryLayout
                                ? `${group.entries.length} BT dans ce groupe · ${getUniqueTechnicianCount(group.entries)} technicien(s)`
                                : group.secondaryLabel ?? `${group.entries.length} BT dans ce groupe`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                            {group.entries.length} BT
                          </span>
                          {isCategoryLayout ? (
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                              {collapsedGroups[group.key] ? "Afficher" : "Reduire"}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      <div
                        className={cx(
                          isCategoryLayout && collapsedGroups[group.key] ? "hidden" : "",
                          isCategoryLayout
                            ? "grid gap-3 sm:grid-cols-2 min-[1280px]:grid-cols-3 min-[1800px]:grid-cols-4"
                            : "space-y-3 sm:space-y-4",
                        )}
                      >
                        {group.entries.map((bt) => {
                          const primaryBadge = detectPrimaryBadge(bt);
                          const teamPreview = getTeamPreview(bt, isCategoryLayout ? 4 : 8);

                          return (
                            <article
                              key={`${bt.id}-${bt.pageStart}`}
                              className={cx(
                                "overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-[0_16px_36px_rgba(148,163,184,0.12)]",
                                isCategoryLayout && "rounded-[20px] shadow-[0_10px_24px_rgba(148,163,184,0.10)]",
                              )}
                            >
                              <div
                                className={cx(
                                  "border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-4 sm:px-5",
                                  isCompactView || isCategoryLayout ? "py-3" : "py-4",
                                )}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4
                                      className={cx(
                                        "font-semibold tracking-tight text-slate-950",
                                        isCompactView || isCategoryLayout
                                          ? "text-[1.25rem] sm:text-[1.45rem]"
                                          : "text-[1.45rem] sm:text-2xl",
                                      )}
                                      >
                                        {bt.id}
                                      </h4>
                                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                        Page {bt.pageStart}
                                      </span>
                                      {primaryBadge ? (
                                        <span
                                          className="rounded-full px-3 py-1 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
                                          style={{ backgroundColor: primaryBadge.color }}
                                        >
                                          {primaryBadge.icon} {primaryBadge.label}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p
                                      className={cx(
                                        "mt-3 text-slate-600",
                                        isCompactView || isCategoryLayout
                                          ? "text-[13px] leading-5"
                                          : "text-sm leading-6",
                                      )}
                                    >
                                      {bt.objet || "Objet non reconnu"}
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {getDocCounts(bt).map(([type, count]) => {
                                      const config =
                                        DOC_TYPES_CONFIG[type as keyof typeof DOC_TYPES_CONFIG] ?? DOC_TYPES_CONFIG.DOC;

                                      return (
                                        <span
                                          key={`${bt.id}-${type}`}
                                          className="rounded-full border px-3 py-1 text-xs font-semibold"
                                          style={{
                                            color: config.color,
                                            borderColor: `${config.color}33`,
                                            backgroundColor: `${config.color}12`,
                                          }}
                                        >
                                          {config.icon} {type} ×{count}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                                <div
                                  className={cx(
                                    "grid gap-4 px-4 sm:px-5",
                                    isCompactView || isCategoryLayout ? "py-3 sm:py-4" : "py-4 sm:py-5",
                                  )}
                                >
                                <div
                                  className={cx(
                                    "grid gap-4",
                                    isCategoryLayout
                                      ? "grid-cols-1"
                                      : isCompactView
                                      ? "grid-cols-1"
                                      : "min-[720px]:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]",
                                  )}
                                >
                                  <div className="space-y-3 text-sm text-slate-700">
                                    <div
                                      className={cx(
                                        "grid gap-2",
                                        isCategoryLayout ? "grid-cols-2" : isCompactView ? "grid-cols-2" : "sm:grid-cols-2",
                                      )}
                                    >
                                      <div>📅 {bt.datePrevue || "—"}</div>
                                      <div>⏱️ {formatDuree(bt.duree) || "—"}</div>
                                      {!isCategoryLayout ? <div>👤 {bt.client || "—"}</div> : null}
                                      {!isCategoryLayout ? <div>🧾 {bt.atNum || "—"}</div> : null}
                                    </div>
                                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
                                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        Localisation
                                      </span>
                                      <p className="mt-2">{bt.localisation || "Non reconnue"}</p>
                                    </div>
                                  </div>

                                  <div
                                    className={cx(
                                      "space-y-3",
                                      isCategoryLayout ? "grid gap-3 sm:grid-cols-1" : isCompactView && "grid gap-3 sm:grid-cols-2",
                                    )}
                                  >
                                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        Equipe
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {teamPreview.visible.length > 0 ? (
                                          <>
                                            {teamPreview.visible.map((member) => (
                                            <span
                                              key={`${bt.id}-${member.key}`}
                                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                                            >
                                              {member.label}
                                            </span>
                                            ))}
                                            {teamPreview.hiddenCount > 0 ? (
                                              <span className="rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                                                +{teamPreview.hiddenCount}
                                              </span>
                                            ) : null}
                                          </>
                                        ) : (
                                          <span className="text-sm text-slate-500">Aucune equipe detectee</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                        Documents d&apos;origine
                                      </p>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {bt.docs.map((doc) => {
                                          const config =
                                            DOC_TYPES_CONFIG[doc.type as keyof typeof DOC_TYPES_CONFIG] ?? DOC_TYPES_CONFIG.DOC;

                                          return (
                                            <button
                                              key={`${bt.id}-${doc.page}-${doc.type}`}
                                              className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5"
                                              onClick={() => openViewer(bt, doc.page)}
                                              style={{
                                                color: config.color,
                                                borderColor: `${config.color}55`,
                                                backgroundColor: `${config.color}10`,
                                              }}
                                              type="button"
                                            >
                                              <span>{config.icon}</span>
                                              <span>{doc.type}</span>
                                              <span className="opacity-70">(p.{doc.page})</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {(bt.analyseDesRisques || bt.observations) && !isCategoryLayout ? (
                                  <div className="grid gap-3 min-[980px]:grid-cols-2">
                                    {bt.analyseDesRisques ? (
                                      <div className="rounded-[20px] border border-amber-300 bg-[linear-gradient(180deg,#fff8db_0%,#fff3c4_100%)] px-4 py-3 text-sm leading-6 text-amber-950">
                                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                                          Analyse des risques
                                        </span>
                                        <p
                                          className={cx(
                                            "mt-2",
                                            isCompactView || isCategoryLayout
                                              ? "line-clamp-4 text-[13px] leading-5"
                                              : "line-clamp-6",
                                          )}
                                        >
                                          {bt.analyseDesRisques}
                                        </p>
                                      </div>
                                    ) : null}

                                    {bt.observations ? (
                                      <div className="rounded-[20px] border border-blue-300 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] px-4 py-3 text-sm leading-6 text-blue-950">
                                        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                                          Observations
                                        </span>
                                        <p
                                          className={cx(
                                            "mt-2",
                                            isCompactView || isCategoryLayout
                                              ? "line-clamp-4 text-[13px] leading-5"
                                              : "line-clamp-6",
                                          )}
                                        >
                                          {bt.observations}
                                        </p>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </article>
                  ))
                ) : (
                  <article
                    className={cx(
                      "rounded-[26px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500 shadow-sm",
                      emptyStateSpanClassName,
                    )}
                  >
                    Aucun BT ne correspond aux filtres actifs.
                  </article>
                )}
              </section>
            </div>
          </div>
        </section>
      </div>

      {viewerState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,15,33,0.62)] p-2 backdrop-blur-sm sm:p-4">
          <div className="flex h-[94vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.36)] sm:max-h-[92vh] sm:max-w-[1200px] sm:rounded-[28px] min-[1800px]:max-w-[1480px] min-[2300px]:max-w-[1720px]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[1.45rem] font-semibold tracking-tight text-slate-950 sm:text-2xl">
                    {viewerState.bt.id}
                  </h3>
                  {currentViewerDoc ? (
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor:
                          (
                            DOC_TYPES_CONFIG[
                              currentViewerDoc.type as keyof typeof DOC_TYPES_CONFIG
                            ] ?? DOC_TYPES_CONFIG.DOC
                          ).color,
                      }}
                    >
                      {
                        (
                          DOC_TYPES_CONFIG[
                            currentViewerDoc.type as keyof typeof DOC_TYPES_CONFIG
                          ] ?? DOC_TYPES_CONFIG.DOC
                        ).icon
                      }{" "}
                      {currentViewerDoc.type}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-slate-500">{viewerState.bt.objet || "Document source"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  disabled={sortedViewerPages.indexOf(viewerState.currentPage) <= 0}
                  onClick={goToPreviousPage}
                  type="button"
                >
                  ← Page -
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  disabled={
                    sortedViewerPages.indexOf(viewerState.currentPage) >= sortedViewerPages.length - 1
                  }
                  onClick={goToNextPage}
                  type="button"
                >
                  Page + →
                </button>
                {signedUrl ? (
                  <a
                    className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
                    href={signedUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Ouvrir le PDF
                  </a>
                ) : null}
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  onClick={closeViewer}
                  type="button"
                >
                  Fermer
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[linear-gradient(180deg,#eef3fa_0%,#f8fbff_100%)] p-2 sm:p-4">
              {viewerError ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  {viewerError}
                </div>
              ) : viewerLoading || !pdfDocument ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/70 text-sm text-slate-500">
                  Chargement du document original...
                </div>
              ) : (
                <div className="rounded-[20px] border border-slate-200 bg-white p-2 shadow-inner sm:rounded-[24px] sm:p-3">
                  <canvas className="mx-auto h-auto max-w-full rounded-[16px]" ref={canvasRef} />
                  <p className="mt-3 text-sm text-slate-500">
                    Page {sortedViewerPages.indexOf(viewerState.currentPage) + 1} sur{" "}
                    {sortedViewerPages.length}
                    {currentViewerDoc ? ` — ${currentViewerDoc.type}` : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
