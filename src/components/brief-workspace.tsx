"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { AppShellHeader } from "@/components/app-shell-header";
import type { BtImportDayOverview } from "@/lib/bt-import-days";
import { getModuleTheme } from "@/lib/module-theme";
import { detectBtCategory, detectPrimaryBadge, getBtCategoryOrder } from "@/lib/pdf-import/badges";
import { openPdfDocumentFromUrl } from "@/lib/pdf-import/pdf-viewer";
import type { ExtractedBt } from "@/lib/pdf-import/types";
import { DOC_TYPES_CONFIG } from "@/lib/pdf-import/ui-config";
import type { OfficeModuleKey } from "@/lib/office-access";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type BriefWorkspaceProps = {
  allowedModules?: OfficeModuleKey[];
  data: BtImportDayOverview;
  headerDateTimeLabel: string;
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
  weatherGeneratedAtLabel?: string | null;
  weatherZones?: import("@/lib/weather").HeaderWeatherZone[];
};

type ViewerState = {
  entries: Array<{
    btId: string;
    objet: string;
    pdfPage: number;
    sourcePage: number;
    type: string;
  }>;
  currentPage: number;
  pdfStoragePath: string;
  title: string;
  subtitle: string;
};

type ViewerViewportSize = {
  height: number;
  width: number;
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
      secondaryLabel: "Aucune équipe détectée",
    };
  }

  const visible = members.slice(0, 2).map((member) => member.label);
  const hiddenCount = Math.max(0, members.length - visible.length);
  const label = hiddenCount > 0 ? `${visible.join(" / ")} +${hiddenCount}` : visible.join(" / ");

  return {
    key: members.map((member) => member.key).join("|"),
    label,
    secondaryLabel: `${members.length} technicien(s) dans cette équipe`,
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

function buildViewerEntries(bts: ExtractedBt[], useSequentialPages = false) {
  const uniqueEntries = new Map<
    string,
    {
      btId: string;
      objet: string;
      pdfPage: number;
      sourcePage: number;
      type: string;
    }
  >();

  for (const bt of bts) {
    const sortedDocs = [...bt.docs].sort((left, right) => left.page - right.page);

    for (const [index, doc] of sortedDocs.entries()) {
      const key = `${doc.page}:${doc.type}`;

      if (!uniqueEntries.has(key)) {
        uniqueEntries.set(key, {
          btId: bt.id,
          objet: bt.objet,
          pdfPage: useSequentialPages ? index + 1 : doc.page,
          sourcePage: doc.page,
          type: doc.type,
        });
      }
    }
  }

  return [...uniqueEntries.values()].sort((left, right) => left.pdfPage - right.pdfPage);
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
  headerDateTimeLabel,
  isSuperAdmin = false,
  role,
  userEmail,
  weatherGeneratedAtLabel,
  weatherZones = [],
}: BriefWorkspaceProps) {
  const briefTheme = getModuleTheme("brief");
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
  const [viewerZoom, setViewerZoom] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewerViewportSize, setViewerViewportSize] = useState<ViewerViewportSize>({
    width: 0,
    height: 0,
  });
  const [viewerPageOrientation, setViewerPageOrientation] = useState<"portrait" | "landscape">("portrait");
  const [viewerLoading, startViewerTransition] = useTransition();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewerViewportRef = useRef<HTMLDivElement | null>(null);
  const viewerPanSessionRef = useRef<{
    originX: number;
    originY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const viewerRenderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [isViewerPanning, setIsViewerPanning] = useState(false);
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

    return viewerState.entries.map((entry) => entry.pdfPage).sort((left, right) => left - right);
  }, [viewerState]);

  const currentViewerDoc =
    viewerState?.entries.find((entry) => entry.pdfPage === viewerState.currentPage) ?? null;
  const isCompactView = viewMode === "compact";
  const isCategoryLayout = layoutMode === "category";
  const emptyStateSpanClassName =
    isCategoryLayout
      ? "col-span-1"
      : "col-span-1 min-[900px]:col-span-2 min-[1280px]:col-span-3 min-[1700px]:col-span-4";

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

  useEffect(() => {
    function syncResponsivePreferences() {
      const profile = getScreenProfile(window.innerWidth);
      setViewportWidth(window.innerWidth);

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
      if (!viewerState?.pdfStoragePath) {
        return;
      }

      setViewerError(null);
      setPdfDocument(null);

      try {
        const supabase = createBrowserSupabaseClient();
        const { data: signedData, error } = await supabase.storage
          .from("bt-import-pdfs")
          .createSignedUrl(viewerState.pdfStoragePath, 3600);

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
  }, [viewerState]);

  useEffect(() => {
    if (!viewerState) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [viewerState]);

  useEffect(() => {
    if (!viewerState || !viewerViewportRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const element = viewerViewportRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      const nextEntry = entries[0];

      if (!nextEntry) {
        return;
      }

      setViewerViewportSize({
        width: nextEntry.contentRect.width,
        height: nextEntry.contentRect.height,
      });
    });

    resizeObserver.observe(element);

    setViewerViewportSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [viewerState]);

  useEffect(() => {
    let cancelled = false;

    async function renderCurrentPage() {
      const measuredWidth =
        viewerViewportSize.width ||
        viewerViewportRef.current?.clientWidth ||
        viewerViewportRef.current?.getBoundingClientRect().width ||
        0;
      const measuredHeight =
        viewerViewportSize.height ||
        viewerViewportRef.current?.clientHeight ||
        viewerViewportRef.current?.getBoundingClientRect().height ||
        0;

      if (
        !viewerState ||
        !pdfDocument ||
        !canvasRef.current ||
        measuredWidth <= 0 ||
        measuredHeight <= 0
      ) {
        return;
      }

      try {
        const page = await pdfDocument.getPage(viewerState.currentPage);
        const pageViewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;

        if (!canvas) {
          return;
        }

        const context = canvas.getContext("2d");

        if (!context) {
          return;
        }

        const horizontalPadding = 32;
        const verticalPadding = 40;
        const availableWidth = Math.max(220, measuredWidth - horizontalPadding);
        const availableHeight = Math.max(220, measuredHeight - verticalPadding);
        const fitScale = Math.min(
          availableWidth / pageViewport.width,
          availableHeight / pageViewport.height,
        );
        const effectiveScale = Math.max(0.2, fitScale) * viewerZoom;
        const viewport = page.getViewport({ scale: effectiveScale });
        const devicePixelRatio = window.devicePixelRatio || 1;

        setViewerPageOrientation(pageViewport.width >= pageViewport.height ? "landscape" : "portrait");

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.width = Math.floor(viewport.width * devicePixelRatio);
        canvas.height = Math.floor(viewport.height * devicePixelRatio);
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);

        viewerRenderTaskRef.current?.cancel();

        const renderTask = page.render({
          canvas,
          canvasContext: context,
          transform: devicePixelRatio === 1 ? undefined : [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0],
          viewport,
        });
        viewerRenderTaskRef.current = renderTask;

        await renderTask.promise;

        if (viewerRenderTaskRef.current === renderTask) {
          viewerRenderTaskRef.current = null;
        }

        if (cancelled) {
          return;
        }
      } catch (caughtError) {
        if (viewerRenderTaskRef.current) {
          viewerRenderTaskRef.current = null;
        }

        if (
          caughtError &&
          typeof caughtError === "object" &&
          "name" in caughtError &&
          caughtError.name === "RenderingCancelledException"
        ) {
          return;
        }

        if (!cancelled) {
          setViewerError(caughtError instanceof Error ? caughtError.message : "Rendu PDF impossible.");
        }
      }
    }

    renderCurrentPage();

    return () => {
      cancelled = true;
      viewerRenderTaskRef.current?.cancel();
      viewerRenderTaskRef.current = null;
    };
  }, [viewerState, pdfDocument, viewerViewportSize, viewerZoom]);

  function openViewer(bt: ExtractedBt, page: number) {
    const pdfStoragePath = bt.derivedPdfStoragePath ?? currentDay?.sourcePdfStoragePath;

    if (!pdfStoragePath) {
      setViewerError("Aucun PDF n'est disponible pour ce BT.");
      return;
    }

    const usesDerivedPdf = Boolean(bt.derivedPdfStoragePath);
    const entries = buildViewerEntries([bt], usesDerivedPdf);

    if (entries.length === 0) {
      setViewerError("Aucun document rattache a ce BT.");
      return;
    }

    const initialPage =
      entries.find((entry) => entry.sourcePage === page)?.pdfPage ?? entries[0]?.pdfPage ?? 1;

    setSignedUrl(null);
    setPdfDocument(null);
    setViewerError(null);

    startViewerTransition(() => {
      setViewerZoom(1);
      setIsViewerPanning(false);
      setViewerState({
        entries,
        currentPage: initialPage,
        pdfStoragePath,
        title: bt.id,
        subtitle: bt.objet || (usesDerivedPdf ? "Dossier PDF du BT" : "Documents du BT"),
      });
    });
  }

  function openGroupViewer(groupLabel: string, entries: ExtractedBt[]) {
    const sourcePdfStoragePath = currentDay?.sourcePdfStoragePath;

    if (!sourcePdfStoragePath) {
      setViewerError("Le PDF source n'est pas disponible pour cette journee.");
      return;
    }

    const viewerEntries = buildViewerEntries(entries);

    if (viewerEntries.length === 0) {
      setViewerError("Aucun document rattache a cette selection.");
      return;
    }

    setSignedUrl(null);
    setPdfDocument(null);
    setViewerError(null);

    startViewerTransition(() => {
      setViewerZoom(1);
      setIsViewerPanning(false);
      setViewerState({
        entries: viewerEntries,
        currentPage: viewerEntries[0]?.pdfPage ?? 1,
        pdfStoragePath: sourcePdfStoragePath,
        title: groupLabel,
        subtitle: `${entries.length} BT · ${viewerEntries.length} page(s) utiles`,
      });
    });
  }

  function closeViewer() {
    viewerRenderTaskRef.current?.cancel();
    viewerRenderTaskRef.current = null;
    setViewerZoom(1);
    setIsViewerPanning(false);
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

  function changeViewerZoom(direction: "in" | "out") {
    setViewerZoom((current) => {
      const nextValue = direction === "in" ? current + 0.2 : current - 0.2;
      return Math.min(3, Math.max(0.6, Number(nextValue.toFixed(2))));
    });
  }

  function resetViewerZoom() {
    setViewerZoom(1);

    if (viewerViewportRef.current) {
      viewerViewportRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    }
  }

  function handleViewerPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!viewerViewportRef.current || viewerZoom <= 1) {
      return;
    }

    viewerPanSessionRef.current = {
      originX: event.clientX,
      originY: event.clientY,
      scrollLeft: viewerViewportRef.current.scrollLeft,
      scrollTop: viewerViewportRef.current.scrollTop,
    };
    setIsViewerPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleViewerPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!viewerViewportRef.current || !viewerPanSessionRef.current) {
      return;
    }

    const deltaX = event.clientX - viewerPanSessionRef.current.originX;
    const deltaY = event.clientY - viewerPanSessionRef.current.originY;

    viewerViewportRef.current.scrollLeft = viewerPanSessionRef.current.scrollLeft - deltaX;
    viewerViewportRef.current.scrollTop = viewerPanSessionRef.current.scrollTop - deltaY;
  }

  function handleViewerPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    viewerPanSessionRef.current = null;
    setIsViewerPanning(false);
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
    <main className={cx("min-h-screen px-3 py-3 text-slate-900 sm:px-5 sm:py-4 lg:px-6 xl:px-8", briefTheme.pageBackgroundClassName)}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="brief"
          allowedModules={allowedModules}
          headerDateTimeLabel={headerDateTimeLabel}
          isSuperAdmin={isSuperAdmin}
          role={role}
          title="Brief"
          userEmail={userEmail}
          weatherGeneratedAtLabel={weatherGeneratedAtLabel}
          weatherZones={weatherZones}
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
                    {currentDay ? formatDayLabel(currentDay.dayDate) : "Aucune journée"}
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
                    placeholder="Rechercher un BT, client, adresse, équipe..."
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
                className={cx(isCategoryLayout ? "grid gap-5" : "space-y-4")}
              >
                {groupedBts.length > 0 ? (
                  isCategoryLayout ? (
                    groupedBts.map((group) => (
                    <article
                      key={group.key}
                      className={cx(
                        "rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-4",
                        isCategoryLayout && "px-4 py-4 sm:px-5 sm:py-5",
                      )}
                    >
                      <div className="flex w-full flex-wrap items-center justify-between gap-3 pb-3 text-left">
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
                          {group.entries.some((entry) => entry.docs.length > 0) ? (
                            <button
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                              onClick={() => openGroupViewer(group.label, group.entries)}
                              type="button"
                            >
                              Dossier PDF
                            </button>
                          ) : null}
                          {isCategoryLayout ? (
                            <button
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
                              onClick={() => toggleGroup(group.key)}
                              type="button"
                            >
                              {collapsedGroups[group.key] ? "Afficher" : "Reduire"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={cx(
                          isCategoryLayout && collapsedGroups[group.key] ? "hidden" : "",
                          "grid gap-3 sm:grid-cols-2 min-[1280px]:grid-cols-3 min-[1800px]:grid-cols-4",
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
                                          <span className="text-sm text-slate-500">Aucune équipe détectée</span>
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
                    <div
                      className="grid auto-rows-max gap-4"
                      style={{
                        gridAutoFlow: desktopGridColumns > 1 ? "row dense" : "row",
                        gridTemplateColumns: `repeat(${desktopGridColumns}, minmax(0, 1fr))`,
                      }}
                    >
                      {groupedBts.map((group) => {
                        const groupSpan = Math.min(group.entries.length, desktopGridColumns);

                        return (
                          <article
                            key={group.key}
                            className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 shadow-[0_18px_40px_rgba(148,163,184,0.12)] sm:p-4"
                            style={{
                              gridColumn: `span ${groupSpan} / span ${groupSpan}`,
                            }}
                          >
                            <div className="flex w-full flex-wrap items-center justify-between gap-3 pb-3 text-left">
                              <div className="flex items-center gap-3">
                                <div>
                                  <h3 className="text-[1.45rem] font-semibold tracking-tight text-slate-950">
                                    {group.label}
                                  </h3>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {group.secondaryLabel ?? `${group.entries.length} BT dans ce groupe`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                  {group.entries.length} BT
                                </span>
                                {group.entries.some((entry) => entry.docs.length > 0) ? (
                                  <button
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                                    onClick={() => openGroupViewer(group.label, group.entries)}
                                    type="button"
                                  >
                                    Dossier PDF
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div
                              className="grid gap-3"
                              style={{
                                gridTemplateColumns: `repeat(${Math.min(group.entries.length, desktopGridColumns)}, minmax(0, 1fr))`,
                              }}
                            >
                              {group.entries.map((bt) => {
                                const primaryBadge = detectPrimaryBadge(bt);
                                const teamPreview = getTeamPreview(bt, 8);

                                return (
                                  <article
                                    key={`${bt.id}-${bt.pageStart}`}
                                    className="overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-[0_16px_36px_rgba(148,163,184,0.12)]"
                                  >
                                    <div className={cx("border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-4 sm:px-5", isCompactView ? "py-3" : "py-4")}>
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <h4
                                              className={cx(
                                                "font-semibold tracking-tight text-slate-950",
                                                isCompactView ? "text-[1.25rem] sm:text-[1.45rem]" : "text-[1.45rem] sm:text-2xl",
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
                                              isCompactView ? "text-[13px] leading-5" : "text-sm leading-6",
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

                                    <div className={cx("grid gap-4 px-4 sm:px-5", isCompactView ? "py-3 sm:py-4" : "py-4 sm:py-5")}>
                                      <div
                                        className={cx(
                                          "grid gap-4",
                                          isCompactView ? "grid-cols-1" : "min-[720px]:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]",
                                        )}
                                      >
                                        <div className="space-y-3 text-sm text-slate-700">
                                          <div className={cx("grid gap-2", isCompactView ? "grid-cols-2" : "sm:grid-cols-2")}>
                                            <div>📅 {bt.datePrevue || "—"}</div>
                                            <div>⏱️ {formatDuree(bt.duree) || "—"}</div>
                                            <div>👤 {bt.client || "—"}</div>
                                            <div>🧾 {bt.atNum || "—"}</div>
                                          </div>
                                          <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-6 text-slate-700">
                                            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                              Localisation
                                            </span>
                                            <p className="mt-2">{bt.localisation || "Non reconnue"}</p>
                                          </div>
                                        </div>

                                        <div className={cx("space-y-3", isCompactView && "grid gap-3 sm:grid-cols-2")}>
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
                                                <span className="text-sm text-slate-500">Aucune équipe détectée</span>
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

                                      {(bt.analyseDesRisques || bt.observations) ? (
                                        <div className="grid gap-3 min-[980px]:grid-cols-2">
                                          {bt.analyseDesRisques ? (
                                            <div className="rounded-[20px] border border-amber-300 bg-[linear-gradient(180deg,#fff8db_0%,#fff3c4_100%)] px-4 py-3 text-sm leading-6 text-amber-950">
                                              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                                                Analyse des risques
                                              </span>
                                              <p className={cx("mt-2", isCompactView ? "line-clamp-4 text-[13px] leading-5" : "line-clamp-6")}>
                                                {bt.analyseDesRisques}
                                              </p>
                                            </div>
                                          ) : null}

                                          {bt.observations ? (
                                            <div className="rounded-[20px] border border-blue-300 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] px-4 py-3 text-sm leading-6 text-blue-950">
                                              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">
                                                Observations
                                              </span>
                                              <p className={cx("mt-2", isCompactView ? "line-clamp-4 text-[13px] leading-5" : "line-clamp-6")}>
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
                        );
                      })}
                    </div>
                  )
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
          <div
            className={cx(
              "flex h-[95vh] w-full max-w-[98vw] flex-col overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.36)] sm:max-h-[94vh] sm:rounded-[28px]",
              viewerPageOrientation === "landscape"
                ? "sm:max-w-[1580px] min-[1800px]:max-w-[1820px] min-[2300px]:max-w-[2080px]"
                : "sm:max-w-[1200px] min-[1800px]:max-w-[1480px] min-[2300px]:max-w-[1720px]",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[1.45rem] font-semibold tracking-tight text-slate-950 sm:text-2xl">
                    {viewerState.title}
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
                <p className="mt-2 text-sm text-slate-500">{viewerState.subtitle || "Document source"}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  disabled={viewerZoom <= 0.6}
                  onClick={() => changeViewerZoom("out")}
                  type="button"
                >
                  −
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  onClick={resetViewerZoom}
                  type="button"
                >
                  Zoom {Math.round(viewerZoom * 100)}%
                </button>
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  disabled={viewerZoom >= 3}
                  onClick={() => changeViewerZoom("in")}
                  type="button"
                >
                  +
                </button>
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
                    PDF journalier complet
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

            <div className="flex-1 overflow-hidden bg-[linear-gradient(180deg,#eef3fa_0%,#f8fbff_100%)] p-2 sm:p-4">
              {viewerError ? (
                <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                  {viewerError}
                </div>
              ) : viewerLoading || !pdfDocument ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/70 text-sm text-slate-500">
                  Chargement du document original...
                </div>
              ) : (
                <div className="flex h-full min-h-[420px] flex-col rounded-[20px] border border-slate-200 bg-white p-2 shadow-inner sm:rounded-[24px] sm:p-3">
                  <div
                    className={cx(
                      "flex-1 min-h-[420px] overflow-auto rounded-[16px]",
                      viewerZoom > 1 ? (isViewerPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default",
                    )}
                    onPointerDown={handleViewerPointerDown}
                    onPointerMove={handleViewerPointerMove}
                    onPointerUp={handleViewerPointerUp}
                    onPointerCancel={handleViewerPointerUp}
                    ref={viewerViewportRef}
                    style={{ touchAction: viewerZoom > 1 ? "none" : "auto" }}
                  >
                    <div
                      className={cx(
                        "flex min-h-full min-w-full items-start",
                        viewerZoom > 1 ? "justify-start" : "justify-center",
                      )}
                    >
                      <canvas className="block h-auto max-w-none rounded-[16px]" ref={canvasRef} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    Page {sortedViewerPages.indexOf(viewerState.currentPage) + 1} sur{" "}
                    {sortedViewerPages.length}
                    {currentViewerDoc ? ` — ${currentViewerDoc.type} — ${currentViewerDoc.btId}` : ""}
                    {viewerZoom > 1 ? " — glisser pour se deplacer" : ""}
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
