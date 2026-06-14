import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { MobileDispatchAckForm } from "@/components/mobile-dispatch-ack-form";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { TERRAIN_ROLE_LABELS, type TerrainRole } from "@/lib/office-access";
import {
  buildDispatchStats,
  compactText,
  departureInstructionLabel,
  extractFirstName,
  extractTimeWindow,
  formatDocumentBadges,
  formatMissionDate,
  formatTimestamp,
} from "@/lib/terrain-ui";

type TerrainTechnician = {
  managerName: string;
  role: string;
  site: string;
};

type TerrainWorkspaceProps = {
  currentDateKey: string;
  currentDateLabel: string;
  displayName: string;
  mobileDispatch: MobileDispatchItem | null;
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

export function TerrainWorkspace({
  currentDateKey,
  currentDateLabel,
  displayName,
  mobileDispatch,
  technician,
  terrainRole,
  userEmail,
}: TerrainWorkspaceProps) {
  const firstName = extractFirstName(displayName, userEmail);
  const roleLabel = TERRAIN_ROLE_LABELS[terrainRole];
  const dispatchStats = mobileDispatch ? buildDispatchStats(mobileDispatch.btPayload) : null;
  const isAcknowledged = Boolean(mobileDispatch?.acknowledgedAt);
  const missionDateLabel = mobileDispatch ? formatMissionDate(mobileDispatch.missionDate) : null;
  const isMissionToday = mobileDispatch ? mobileDispatch.missionDate === currentDateKey : false;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#f3f8ff_26%,#eef6ff_60%,#f7fafc_100%)] px-4 py-4 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(237,246,255,0.96))] shadow-[0_24px_70px_rgba(125,146,178,0.18)] backdrop-blur">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-700">
                DEMAT-BT Terrain
              </p>
              <h1 className="mt-3 text-[2.2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.5rem]">
                Mission de {firstName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Vérifie ici la date réelle de mission, les BT publiés et les points de
                vigilance avant de partir sur le terrain.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  {roleLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  Aujourd&apos;hui : {currentDateLabel}
                </span>
                {technician?.site ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Site {technician.site}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isAcknowledged
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {isAcknowledged ? "Réception confirmée" : "Confirmation attendue"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-3 lg:justify-end">
              <Link
                className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_16px_34px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-slate-300"
                href="/terrain"
              >
                Retour à l&apos;accueil
              </Link>
              <LogoutButton variant="terrain" />
            </div>
          </div>
        </header>

        <section className="mt-5">
          {mobileDispatch ? (
            <article className="rounded-[30px] border border-emerald-100/90 bg-[linear-gradient(155deg,rgba(240,253,244,0.95),rgba(255,255,255,0.92))] px-5 py-6 shadow-[0_20px_46px_rgba(148,163,184,0.14)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-emerald-200 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(220,252,231,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <span className="text-2xl">OK</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                      Mission terrain
                    </p>
                    <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-950">
                      Mission prévue le {missionDateLabel}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {mobileDispatch.btCount} intervention{mobileDispatch.btCount > 1 ? "s" : ""}{" "}
                      programmée{mobileDispatch.btCount > 1 ? "s" : ""} pour cette date.
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Publication le {formatTimestamp(mobileDispatch.publishedAt)}.
                    </p>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/85 bg-white/90 px-4 py-4 shadow-[0_18px_34px_rgba(148,163,184,0.12)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Statut mobile
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {isAcknowledged ? "Mission bien reçue" : "Confirmation attendue"}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-slate-500">
                    {isAcknowledged
                      ? `Accusé envoyé le ${formatTimestamp(mobileDispatch.acknowledgedAt!)}`
                      : "Confirme la bonne réception en bas de page."}
                  </p>
                </div>
              </div>

              {!isMissionToday ? (
                <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50/90 px-4 py-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Attention : la mission affichée est prévue pour le {missionDateLabel}, alors
                    qu&apos;aujourd&apos;hui nous sommes le {currentDateLabel}.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    Ne démarre pas ces BT sans vérifier que tu consultes bien la bonne date de
                    mission.
                  </p>
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-2 gap-3 max-sm:grid-cols-1 xl:grid-cols-4">
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Interventions
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {mobileDispatch.btCount}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {mobileDispatch.activitySummary}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Plage horaire
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {dispatchStats?.scheduleLabel ?? "Horaires à confirmer"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Documents
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {dispatchStats?.documentCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Pièces jointes recensées dans les BT.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Points à lire
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {dispatchStats?.alertCount ?? 0}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {dispatchStats?.riskCount ?? 0} risque{dispatchStats?.riskCount === 1 ? "" : "s"}{" "}
                    + {dispatchStats?.observationCount ?? 0} observation
                    {(dispatchStats?.observationCount ?? 0) === 1 ? "" : "s"}.
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/88 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Consigne de départ
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {departureInstructionLabel(mobileDispatch.departureInstruction)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/88 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Site
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {mobileDispatch.siteCode ?? technician?.site ?? "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/88 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Manager
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {mobileDispatch.managerName ?? technician?.managerName ?? "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/88 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Mode
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {mobileDispatch.workMode ?? "-"}
                  </p>
                </div>
              </div>

              {compactText(mobileDispatch.observation) ? (
                <div className="mt-4 rounded-[24px] border border-cyan-200 bg-cyan-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                    Brief de mission
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {mobileDispatch.observation}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 rounded-[24px] border border-white/80 bg-white/92 p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                      BT de la mission
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                      Lecture rapide des interventions
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500">
                    Adresse, horaire, client, documents et points de vigilance sont regroupés
                    sur chaque carte.
                  </p>
                </div>
                <div className="mt-3 space-y-3">
                  {mobileDispatch.btPayload.map((bt) => {
                    const timeWindow = extractTimeWindow(bt.duree);
                    const documentBadges = formatDocumentBadges(bt.docs);

                    return (
                      <article
                        key={`${bt.btId}-${bt.pageStart}`}
                        className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-[0_10px_30px_rgba(148,163,184,0.08)]"
                        style={{ contentVisibility: "auto", containIntrinsicSize: "680px" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                              BT
                            </p>
                            <p className="mt-1 text-base font-semibold text-slate-950">
                              {bt.btId}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {compactText(bt.atNum) ? (
                              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                AT {bt.atNum}
                              </span>
                            ) : null}
                            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              Page {bt.pageStart}
                            </span>
                          </div>
                        </div>

                        <p className="mt-4 text-base font-semibold text-slate-900">
                          {bt.objet || "Objet non renseigné"}
                        </p>
                        {compactText(bt.designation) ? (
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {bt.designation}
                          </p>
                        ) : null}

                        <div className="mt-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1 xl:grid-cols-3">
                          <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-3 col-span-2 xl:col-span-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Horaire
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {timeWindow.label}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Client
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {bt.client || "Client non renseigné"}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/80 bg-white/85 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Adresse
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {bt.localisation || "Localisation non renseignée"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Documents
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {documentBadges.length > 0 ? (
                              documentBadges.map((docLabel) => (
                                <span
                                  key={`${bt.btId}-${docLabel}`}
                                  className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                >
                                  {docLabel}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500">Aucun document annexe</span>
                            )}
                          </div>
                        </div>

                        {compactText(bt.analyseDesRisques) ? (
                          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                              Analyse des risques
                            </p>
                            <p className="mt-2 text-sm leading-6 text-amber-950">
                              {bt.analyseDesRisques}
                            </p>
                          </div>
                        ) : null}

                        {compactText(bt.observations) ? (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/85 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Observations
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">
                              {bt.observations}
                            </p>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-white/80 bg-white/88 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Confirmation de réception
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Confirme ici que la mission affichée sur mobile est bien reçue et exploitable.
                </p>
                <MobileDispatchAckForm
                  acknowledgedAt={mobileDispatch.acknowledgedAt}
                  itemId={mobileDispatch.id}
                />
              </div>
            </article>
          ) : (
            <article className="rounded-[30px] border border-cyan-100/90 bg-[linear-gradient(155deg,rgba(240,253,250,0.95),rgba(255,255,255,0.92))] px-5 py-6 shadow-[0_20px_46px_rgba(148,163,184,0.14)]">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-cyan-200 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(207,250,254,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <span className="text-2xl">...</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-700">
                    Mission
                  </p>
                  <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-950">
                    Aucun envoi reçu pour le moment
                  </h2>
                  <p className="mt-3 max-w-[56ch] text-sm leading-7 text-slate-600">
                    Retourne à l&apos;accueil pour vérifier l&apos;arrivée d&apos;une mission ou
                    attendre une publication du back-office.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <Link
                  className="inline-flex items-center justify-center rounded-[22px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_16px_34px_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-slate-300"
                  href="/terrain"
                >
                  Retour à l&apos;accueil hub
                </Link>
              </div>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}
