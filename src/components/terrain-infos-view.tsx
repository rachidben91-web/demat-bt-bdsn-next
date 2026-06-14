import { Download, PhoneCall, ShieldCheck, Siren } from "lucide-react";
import { TerrainAppHeader } from "@/components/terrain-app-header";
import { TerrainInstallCardClient } from "@/components/terrain-install-card-client";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { TERRAIN_ROLE_LABELS, type TerrainRole } from "@/lib/office-access";

type TerrainTechnician = {
  managerName: string;
  role: string;
  site: string;
};

type TerrainInfosViewProps = {
  currentDateLabel: string;
  displayName: string;
  mobileDispatch: MobileDispatchItem | null;
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

const infoCards = [
  {
    description: "Rappel EPI, conduite à tenir, signaux d'arrêt et vigilance gaz.",
    icon: ShieldCheck,
    title: "Sécurité terrain",
  },
  {
    description: "Accès bureau, manager, référent et numéro d'urgence de secteur.",
    icon: PhoneCall,
    title: "Contacts utiles",
  },
  {
    description: "Procédure de départ, confirmation de mission et remontée d'incident.",
    icon: Siren,
    title: "Procédures",
  },
  {
    description: "Installer l'app, retrouver les documents et préparer les futurs modules.",
    icon: Download,
    title: "Installation & app",
  },
];

export function TerrainInfosView({
  currentDateLabel,
  displayName,
  mobileDispatch,
  technician,
  terrainRole,
  userEmail,
}: TerrainInfosViewProps) {
  const site = mobileDispatch?.siteCode ?? technician?.site ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,230,0.40),transparent_28%),radial-gradient(circle_at_top_right,rgba(191,219,254,0.32),transparent_26%),linear-gradient(180deg,#eef5fb_0%,#f8fbff_46%,#edf4fb_100%)] px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-[760px] space-y-4">
        <TerrainAppHeader
          currentDateLabel={currentDateLabel}
          displayName={displayName}
          roleLabel={TERRAIN_ROLE_LABELS[terrainRole]}
          site={site}
          statusLabel="Infos utiles"
          statusTone="neutral"
          userEmail={userEmail}
        />

        <section className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-5 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Infos utiles
          </p>
          <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.04em] text-slate-950">
            Le futur espace de repères terrain
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Cette page pourra accueillir les contacts, les rappels sécurité, les procédures
            et les éléments d&apos;installation utiles aux techniciens.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          {infoCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-[24px] border border-white/70 bg-white/96 p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] text-white shadow-[0_12px_24px_rgba(15,141,108,0.18)]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
              </article>
            );
          })}
        </section>

        <TerrainInstallCardClient />
      </div>
    </main>
  );
}
