import { MessageSquareMore } from "lucide-react";
import { TerrainAppHeader } from "@/components/terrain-app-header";
import {
  buildTerrainMessageItems,
  TerrainMessagePanel,
} from "@/components/terrain-message-panel";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { TERRAIN_ROLE_LABELS, type TerrainRole } from "@/lib/office-access";

type TerrainTechnician = {
  managerName: string;
  role: string;
  site: string;
};

type TerrainMessagesViewProps = {
  currentDateLabel: string;
  displayName: string;
  mobileDispatch: MobileDispatchItem | null;
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

export function TerrainMessagesView({
  currentDateLabel,
  displayName,
  mobileDispatch,
  technician,
  terrainRole,
  userEmail,
}: TerrainMessagesViewProps) {
  const items = buildTerrainMessageItems(mobileDispatch, technician);
  const site = mobileDispatch?.siteCode ?? technician?.site ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,230,0.40),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.32),transparent_26%),linear-gradient(180deg,#eef5fb_0%,#f8fbff_46%,#edf4fb_100%)] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-[760px] space-y-4">
        <TerrainAppHeader
          currentDateLabel={currentDateLabel}
          displayName={displayName}
          roleLabel={TERRAIN_ROLE_LABELS[terrainRole]}
          site={site}
          statusLabel="Messagerie en préparation"
          statusTone="warning"
          userEmail={userEmail}
        />

        <section className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] text-white shadow-[0_14px_28px_rgba(15,141,108,0.20)]">
              <MessageSquareMore className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Module messages
              </p>
              <h2 className="mt-1 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
                Une boîte terrain plus claire
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Cette vue prépare la future messagerie terrain. On pourra y rattacher un BT,
                écrire au bureau, à l&apos;équipe ou au référent sécurité.
              </p>
            </div>
          </div>
        </section>

        <TerrainMessagePanel items={items} />
      </div>
    </main>
  );
}
