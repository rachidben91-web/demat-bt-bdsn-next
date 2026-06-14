import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { TerrainInstallCardClient } from "@/components/terrain-install-card-client";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { TERRAIN_ROLE_LABELS, type TerrainRole } from "@/lib/office-access";
import {
  buildDispatchStats,
  extractFirstName,
  formatMissionDate,
  formatTimestamp,
} from "@/lib/terrain-ui";

type TerrainTechnician = {
  managerName: string;
  role: string;
  site: string;
};

type TerrainHubProps = {
  currentDateKey: string;
  currentDateLabel: string;
  detailHref: string;
  displayName: string;
  mobileDispatch: MobileDispatchItem | null;
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

type StatusBadge = {
  label: string;
  tone: "info" | "neutral" | "success" | "warning" | "muted";
};

function buildStatusBadges(
  currentDateLabel: string,
  terrainRole: TerrainRole,
  technician: TerrainTechnician | null,
  mobileDispatch: MobileDispatchItem | null,
) {
  const badges: StatusBadge[] = [
    {
      label: TERRAIN_ROLE_LABELS[terrainRole],
      tone: "info",
    },
    {
      label: currentDateLabel,
      tone: "neutral",
    },
  ];

  if (technician?.site) {
    badges.push({
      label: `Site ${technician.site}`,
      tone: "neutral",
    });
  }

  if (mobileDispatch) {
    badges.push({
      label: mobileDispatch.acknowledgedAt ? "Mission reçue" : "Nouvelle mission",
      tone: mobileDispatch.acknowledgedAt ? "success" : "warning",
    });
  } else {
    badges.push({
      label: "Aucune mission publiée",
      tone: "muted",
    });
  }

  return badges;
}

function badgeClassName(tone: StatusBadge["tone"]) {
  switch (tone) {
    case "info":
      return "border-cyan-200 bg-cyan-50 text-cyan-800";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "muted":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "neutral":
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

export function TerrainHub({
  currentDateKey,
  currentDateLabel,
  detailHref,
  displayName,
  mobileDispatch,
  technician,
  terrainRole,
  userEmail,
}: TerrainHubProps) {
  const firstName = extractFirstName(displayName, userEmail);
  const dispatchStats = mobileDispatch ? buildDispatchStats(mobileDispatch.btPayload) : null;
  const missionDateLabel = mobileDispatch ? formatMissionDate(mobileDispatch.missionDate) : null;
  const isMissionToday = mobileDispatch ? mobileDispatch.missionDate === currentDateKey : false;
  const statusBadges = buildStatusBadges(
    currentDateLabel,
    terrainRole,
    technician,
    mobileDispatch,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f2ff_0%,#edf6ff_24%,#eef7ff_58%,#f8fbff_100%)] px-4 py-5 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[34px] border border-white/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(237,246,255,0.96))] shadow-[0_28px_80px_rgba(125,146,178,0.18)] backdrop-blur">
          <div className="grid gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:px-7">
            <div className="flex items-start gap-4">
              <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[26px] bg-[linear-gradient(160deg,#0f766e_0%,#0891b2_55%,#67e8f9_100%)] p-3 shadow-[0_18px_40px_rgba(8,145,178,0.22)]">
                <Image
                  alt="Logo DEMAT-BT Terrain"
                  className="h-12 w-12 drop-shadow-[0_12px_18px_rgba(15,23,42,0.22)]"
                  height={280}
                  loading="eager"
                  src="/dashboard-favicon.png"
                  width={280}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-700">
                  DEMAT-BT Terrain
                </p>
                <h1 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.5rem]">
                  Bonjour {firstName}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                  Accède à la mission publiée, puis retrouve ici les futurs modules terrain
                  comme la messagerie et les infos utiles.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {statusBadges.map((badge) => (
                    <span
                      key={badge.label}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClassName(
                        badge.tone,
                      )}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start lg:justify-end">
              <LogoutButton variant="terrain" />
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)]">
          <section className="rounded-[30px] border border-emerald-100/90 bg-[linear-gradient(155deg,rgba(240,253,244,0.95),rgba(255,255,255,0.93))] px-5 py-6 shadow-[0_20px_46px_rgba(148,163,184,0.14)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-emerald-700">
              Mission
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">
              {mobileDispatch
                ? `${mobileDispatch.btCount} intervention${mobileDispatch.btCount > 1 ? "s" : ""} ${
                    mobileDispatch.btCount > 1 ? "prévues" : "prévue"
                  }`
                : "Aucune mission disponible"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {mobileDispatch
                ? `Date de mission : ${missionDateLabel}. Publication le ${formatTimestamp(
                    mobileDispatch.publishedAt,
                  )}.`
                : "Dès qu'une mission est préparée et envoyée, elle apparaît ici avec son statut de réception."}
            </p>

            {mobileDispatch && !isMissionToday ? (
              <div className="mt-4 rounded-[22px] border border-amber-200 bg-amber-50/90 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  Attention : cette mission est prévue pour le {missionDateLabel}, pas pour le{" "}
                  {currentDateLabel}.
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Vérifie bien la date avant d&apos;ouvrir les BT pour éviter de repartir sur
                  une ancienne journée.
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3 max-sm:grid-cols-1 xl:grid-cols-4">
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Date de mission
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {missionDateLabel ?? "À confirmer"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Statut
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {mobileDispatch
                    ? mobileDispatch.acknowledgedAt
                      ? "Réception confirmée"
                      : "À consulter"
                    : "En attente"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Plage horaire
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {dispatchStats?.scheduleLabel ?? "À confirmer"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Points à lire
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {dispatchStats?.alertCount ?? 0} élément{dispatchStats?.alertCount === 1 ? "" : "s"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Analyses de risques et observations à relire avant intervention.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {mobileDispatch ? (
                <Link
                  className="inline-flex items-center justify-center rounded-[22px] bg-cyan-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(8,145,178,0.24)] transition hover:-translate-y-0.5 hover:bg-cyan-800"
                  href={detailHref}
                >
                  Consulter ma mission
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center justify-center rounded-[22px] border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-500">
                  En attente d&apos;une mission
                </span>
              )}
              {mobileDispatch ? (
                <span className="inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                  {mobileDispatch.activitySummary}
                </span>
              ) : null}
            </div>
          </section>

          <div className="space-y-5">
            <TerrainInstallCardClient />

            <section className="rounded-[30px] border border-white/90 bg-[linear-gradient(165deg,rgba(255,255,255,0.97),rgba(244,249,255,0.96))] px-5 py-6 shadow-[0_20px_46px_rgba(148,163,184,0.12)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                Modules
              </p>
              <div className="mt-4 grid gap-3">
                <article className="rounded-[24px] border border-cyan-200 bg-cyan-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      Messagerie
                    </h3>
                    <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                      Bientôt
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Référer un client, envoyer une confirmation ou recevoir un message lié
                    à une intervention.
                  </p>
                </article>

                <article className="rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      Infos utiles
                    </h3>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      Évolutif
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Contacts, procédures, rappels sécurité et autres informations utiles à
                    envoyer au terrain.
                  </p>
                </article>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
