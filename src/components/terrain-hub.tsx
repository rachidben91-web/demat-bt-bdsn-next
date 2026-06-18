import Link from "next/link";
import { FileWarning, MessageSquareText } from "lucide-react";
import { TerrainAppHeader } from "@/components/terrain-app-header";
import {
  buildTerrainMessageItems,
  TerrainMessagePanel,
} from "@/components/terrain-message-panel";
import type { OfficeMessageSummary } from "@/lib/messaging";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { TERRAIN_ROLE_LABELS, type TerrainRole } from "@/lib/office-access";
import {
  buildDispatchStats,
  departureInstructionLabel,
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
  officeMessages: OfficeMessageSummary[];
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

export function TerrainHub({
  currentDateKey,
  currentDateLabel,
  detailHref,
  displayName,
  mobileDispatch,
  officeMessages,
  technician,
  terrainRole,
  userEmail,
}: TerrainHubProps) {
  const dispatchStats = mobileDispatch ? buildDispatchStats(mobileDispatch.btPayload) : null;
  const inboxItems = buildTerrainMessageItems(mobileDispatch, technician, officeMessages);
  const missionDateLabel = mobileDispatch ? formatMissionDate(mobileDispatch.missionDate) : null;
  const isMissionToday = mobileDispatch ? mobileDispatch.missionDate === currentDateKey : false;
  const site = mobileDispatch?.siteCode ?? technician?.site ?? null;
  const statusLabel = mobileDispatch?.acknowledgedAt
    ? "Mission reçue"
    : mobileDispatch
      ? "Confirmation attendue"
      : "En attente de publication";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,230,0.40),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.32),transparent_26%),linear-gradient(180deg,#eef5fb_0%,#f8fbff_46%,#edf4fb_100%)] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-[760px] space-y-4">
        <TerrainAppHeader
          currentDateLabel={currentDateLabel}
          displayName={displayName}
          roleLabel={TERRAIN_ROLE_LABELS[terrainRole]}
          site={site}
          statusLabel={statusLabel}
          statusTone={mobileDispatch?.acknowledgedAt ? "success" : "warning"}
          userEmail={userEmail}
        />

        <section className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,rgba(245,252,248,0.98),rgba(255,255,255,0.96))] p-5 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
            Journée publiée
          </p>

          {mobileDispatch ? (
            <>
              <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                Mission du {missionDateLabel}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Publication du {formatTimestamp(mobileDispatch.publishedAt)} ·{" "}
                {mobileDispatch.btCount} intervention
                {mobileDispatch.btCount > 1 ? "s" : ""} transmise
                {mobileDispatch.btCount > 1 ? "s" : ""}.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {mobileDispatch.acknowledgedAt ? "Mission confirmée" : "À confirmer"}
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {departureInstructionLabel(mobileDispatch.departureInstruction)}
                </span>
                {!isMissionToday ? (
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    Date différente d&apos;aujourd&apos;hui
                  </span>
                ) : null}
              </div>

              {!isMissionToday ? (
                <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                  Vérifie bien la date de mission avant de partir : ces BT sont prévus pour le{" "}
                  {missionDateLabel}, pas pour le {currentDateLabel}.
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
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
                    Points à lire
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-amber-600">
                    {dispatchStats?.alertCount ?? 0}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Risques et observations avant intervention
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Mode
                  </p>
                  <p className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                    {mobileDispatch.workMode ?? "-"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Manager
                  </p>
                  <p className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-slate-950">
                    {mobileDispatch.managerName ?? technician?.managerName ?? "Non renseigné"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-3 max-sm:flex-col">
                <Link
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[20px] bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] px-4 py-3 text-base font-semibold text-white shadow-[0_18px_36px_rgba(15,141,108,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(15,141,108,0.26)]"
                  href={detailHref}
                >
                  <MessageSquareText className="h-5 w-5 text-white" />
                  Consulter ma journée
                </Link>
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  href={`${detailHref}#points-a-lire`}
                >
                  <FileWarning className="h-5 w-5 text-amber-600" />
                  Voir les points à lire ({dispatchStats?.alertCount ?? 0})
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950">
                Aucune mission publiée
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Dès qu&apos;une journée terrain est préparée, elle apparaîtra ici avec sa date de
                mission, son état de confirmation et ses BT.
              </p>
            </>
          )}
        </section>

        <TerrainMessagePanel items={inboxItems} />
      </div>
    </main>
  );
}
