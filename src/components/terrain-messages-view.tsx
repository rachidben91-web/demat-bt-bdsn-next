import { MessageSquareMore } from "lucide-react";
import { TerrainAppHeader } from "@/components/terrain-app-header";
import { TerrainOfficeMessages } from "@/components/terrain-office-messages";
import type { OfficeMessageSummary } from "@/lib/messaging";
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
  officeMessages: OfficeMessageSummary[];
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

export function TerrainMessagesView({
  currentDateLabel,
  displayName,
  mobileDispatch,
  officeMessages,
  technician,
  terrainRole,
  userEmail,
}: TerrainMessagesViewProps) {
  const site = mobileDispatch?.siteCode ?? technician?.site ?? null;
  const unreadCount = officeMessages.filter((message) => !message.currentReadAt).length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,230,0.40),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.32),transparent_26%),linear-gradient(180deg,#eef5fb_0%,#f8fbff_46%,#edf4fb_100%)] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-[760px] space-y-4">
        <TerrainAppHeader
          currentDateLabel={currentDateLabel}
          displayName={displayName}
          roleLabel={TERRAIN_ROLE_LABELS[terrainRole]}
          site={site}
          statusLabel={unreadCount > 0 ? `${unreadCount} message(s) non lus` : "Messagerie synchronisee"}
          statusTone={unreadCount > 0 ? "warning" : "success"}
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
                Messagerie terrain
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Les messages du bureau s&apos;affichent ici avec leurs pieces jointes. Leur lecture
                est confirmee automatiquement a l&apos;ouverture de cette vue. Tu peux aussi
                repondre directement au bureau depuis chaque message.
              </p>
            </div>
          </div>
        </section>

        {officeMessages.length > 0 ? (
          <TerrainOfficeMessages messages={officeMessages} />
        ) : (
          <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              Messages bureau
            </p>
            <p className="mt-3 rounded-[22px] border border-slate-200 bg-white/95 px-4 py-4 text-sm leading-6 text-slate-600">
              Aucun message bureau pour le moment.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
