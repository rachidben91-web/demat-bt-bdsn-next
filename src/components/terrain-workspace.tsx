import { Clock3, FileText, MapPin } from "lucide-react";
import { MobileDispatchAckForm } from "@/components/mobile-dispatch-ack-form";
import { TerrainAppHeader } from "@/components/terrain-app-header";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { TERRAIN_ROLE_LABELS, type TerrainRole } from "@/lib/office-access";
import {
  buildDispatchStats,
  compactText,
  departureInstructionLabel,
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
  const dispatchStats = mobileDispatch ? buildDispatchStats(mobileDispatch.btPayload) : null;
  const missionDateLabel = mobileDispatch ? formatMissionDate(mobileDispatch.missionDate) : null;
  const isAcknowledged = Boolean(mobileDispatch?.acknowledgedAt);
  const isMissionToday = mobileDispatch ? mobileDispatch.missionDate === currentDateKey : false;
  const site = mobileDispatch?.siteCode ?? technician?.site ?? null;
  const statusLabel = isAcknowledged ? "Mission reçue" : "Confirmation attendue";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,230,0.40),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.32),transparent_26%),linear-gradient(180deg,#eef5fb_0%,#f8fbff_46%,#edf4fb_100%)] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-[760px] space-y-4">
        <TerrainAppHeader
          currentDateLabel={currentDateLabel}
          displayName={displayName}
          roleLabel={TERRAIN_ROLE_LABELS[terrainRole]}
          site={site}
          statusLabel={statusLabel}
          statusTone={isAcknowledged ? "success" : "warning"}
          userEmail={userEmail}
        />

        {mobileDispatch ? (
          <>
            <section className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,rgba(244,252,247,0.98),rgba(255,255,255,0.96))] p-5 text-slate-950 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] text-[1.35rem] font-semibold text-white shadow-[0_14px_28px_rgba(15,141,108,0.20)]">
                  BT
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Mission terrain
                  </p>
                  <h2 className="mt-1 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                    Mission prévue le {missionDateLabel}
                  </h2>
                  <p className="mt-2 text-base text-slate-700">
                    {mobileDispatch.btCount} intervention
                    {mobileDispatch.btCount > 1 ? "s" : ""} programmée
                    {mobileDispatch.btCount > 1 ? "s" : ""} pour cette date.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Publication le {formatTimestamp(mobileDispatch.publishedAt)}.
                  </p>
                </div>
              </div>

              {!isMissionToday ? (
                <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  Attention : cette mission n&apos;est pas prévue pour aujourd&apos;hui. Vérifie
                  bien la date avant de démarrer les BT.
                </div>
              ) : null}

              <div className="mt-4 rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Statut mobile
                </p>
                <p className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-slate-950">
                  {isAcknowledged ? "Mission bien reçue" : "Confirmation attendue"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {isAcknowledged
                    ? `Accusé envoyé le ${formatTimestamp(mobileDispatch.acknowledgedAt!)}`
                    : "Confirme la bonne réception en bas de page pour signaler au bureau que tout est exploitable."}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Interventions
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                    {mobileDispatch.btCount}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{mobileDispatch.activitySummary}</p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Plage horaire
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                    {dispatchStats?.scheduleLabel ?? "À confirmer"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Documents
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                    {dispatchStats?.documentCount ?? 0}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">Pièces jointes recensées dans les BT.</p>
                </div>
                <div
                  className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
                  id="points-a-lire"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Points à lire
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-amber-600">
                    {dispatchStats?.alertCount ?? 0}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {dispatchStats?.riskCount ?? 0} risque{dispatchStats?.riskCount === 1 ? "" : "s"} +{" "}
                    {dispatchStats?.observationCount ?? 0} observation
                    {(dispatchStats?.observationCount ?? 0) === 1 ? "" : "s"}.
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Consigne de départ
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
                    {departureInstructionLabel(mobileDispatch.departureInstruction)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Site
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
                    {site ?? "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Manager
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
                    {mobileDispatch.managerName ?? technician?.managerName ?? "Non renseigné"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Mode
                  </p>
                  <p className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-950">
                    {mobileDispatch.workMode ?? "-"}
                  </p>
                </div>
              </div>

              {compactText(mobileDispatch.observation) ? (
                <div className="mt-4 rounded-[22px] border border-cyan-200 bg-cyan-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                    Brief de mission
                  </p>
                  <p className="mt-3 text-base leading-8 text-slate-700">
                    {mobileDispatch.observation}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
              <div className="flex items-start justify-between gap-4 max-sm:flex-col">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    BT de la mission
                  </p>
                  <h3 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                    Lecture rapide des interventions
                  </h3>
                </div>
                <p className="max-w-sm text-sm leading-7 text-slate-600">
                  Adresse, horaire, client, documents et points de vigilance sont regroupés
                  sur chaque carte.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                {mobileDispatch.btPayload.map((bt) => {
                  const timeWindow = extractTimeWindow(bt.duree);
                  const documentBadges = formatDocumentBadges(bt.docs);

                  return (
                    <article
                      key={`${bt.btId}-${bt.pageStart}`}
                      className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                      style={{ contentVisibility: "auto", containIntrinsicSize: "680px" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700">
                            {bt.btId}
                          </p>
                          <h4 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-slate-950">
                            {bt.objet || "Objet non renseigné"}
                          </h4>
                          {compactText(bt.designation) ? (
                            <p className="mt-1 text-base text-slate-500">{bt.designation}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                          Page {bt.pageStart}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                        <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Horaire
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                            <Clock3 className="h-4 w-4 text-emerald-600" />
                            {timeWindow.label}
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-slate-100 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Adresse
                          </p>
                          <p className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            {bt.localisation || "Localisation non renseignée"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-base text-slate-700">
                        {bt.client || "Client non renseigné"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {documentBadges.length > 0 ? (
                          documentBadges.map((docLabel) => (
                            <span
                              key={`${bt.btId}-${docLabel}`}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
                            >
                              <FileText className="h-4 w-4 text-slate-500" />
                              {docLabel}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-500">
                            Aucun document annexe
                          </span>
                        )}
                      </div>

                      {compactText(bt.analyseDesRisques) ? (
                        <div className="mt-4 rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                            Analyse des risques
                          </p>
                          <p className="mt-2 text-base leading-7">{bt.analyseDesRisques}</p>
                        </div>
                      ) : null}

                      {compactText(bt.observations) ? (
                        <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Observations
                          </p>
                          <p className="mt-2 text-base leading-7 text-slate-700">{bt.observations}</p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[30px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(241,253,248,0.98),rgba(255,255,255,0.96))] p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
              <p className="text-[1.1rem] font-semibold text-slate-950">Confirmer la réception</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Confirme que tu as bien reçu la mission et que les informations sont
                exploitables sur le terrain.
              </p>
              <MobileDispatchAckForm
                acknowledgedAt={mobileDispatch.acknowledgedAt}
                itemId={mobileDispatch.id}
                variant="light"
              />
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Mission
            </p>
            <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
              Aucun envoi reçu pour le moment
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Retourne à l&apos;accueil pour vérifier l&apos;arrivée d&apos;une mission ou attends
              la prochaine publication du back-office.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
