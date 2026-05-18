import { LogoutButton } from "@/components/logout-button";
import {
  TERRAIN_ROLE_LABELS,
  type TerrainRole,
} from "@/lib/office-access";

type TerrainTechnician = {
  managerName: string;
  role: string;
  site: string;
};

type TerrainWorkspaceProps = {
  currentDateLabel: string;
  loginIdentifier: string | null;
  technician: TerrainTechnician | null;
  terrainRole: TerrainRole;
  userEmail: string | null;
};

function extractFirstName(userEmail: string | null) {
  if (!userEmail) {
    return "Technicien";
  }

  const localPart = userEmail.split("@")[0] ?? "";
  const firstChunk = localPart.split(/[.\-_+]+/).find(Boolean) ?? localPart;

  if (!firstChunk) {
    return "Technicien";
  }

  return firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1).toLowerCase();
}

export function TerrainWorkspace({
  currentDateLabel,
  loginIdentifier,
  technician,
  terrainRole,
  userEmail,
}: TerrainWorkspaceProps) {
  const firstName = extractFirstName(userEmail);
  const roleLabel = TERRAIN_ROLE_LABELS[terrainRole];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#f3f8ff_26%,#eef6ff_60%,#f7fafc_100%)] px-4 py-4 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(237,246,255,0.96))] shadow-[0_24px_70px_rgba(125,146,178,0.18)] backdrop-blur">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-700">
                Application terrain
              </p>
              <h1 className="mt-3 text-[2.4rem] font-semibold tracking-[-0.05em] text-slate-950">
                Bonjour {firstName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Cette page d&apos;accueil affichera uniquement les éléments envoyés sur mobile
                pour ta journée terrain.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  {roleLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {currentDateLabel}
                </span>
                {technician?.site ? (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Site {technician.site}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="rounded-[24px] border border-white/85 bg-white/90 px-4 py-3 text-left shadow-[0_18px_34px_rgba(148,163,184,0.14)] lg:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Compte
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{userEmail ?? "—"}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Identifiant : {loginIdentifier ?? "—"}
                </p>
              </div>
              <LogoutButton variant="terrain" />
            </div>
          </div>
        </header>

        <section className="mt-5">
          <article className="rounded-[30px] border border-cyan-100/90 bg-[linear-gradient(155deg,rgba(240,253,250,0.95),rgba(255,255,255,0.92))] px-5 py-6 shadow-[0_20px_46px_rgba(148,163,184,0.14)]">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-cyan-200 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(207,250,254,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                <span className="text-2xl">⌁</span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-700">
                  Accueil mobile
                </p>
                <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-950">
                  Aucun envoi reçu pour le moment
                </h2>
                <p className="mt-3 max-w-[56ch] text-sm leading-7 text-slate-600">
                  Tant qu&apos;une journée n&apos;a pas été préparée puis envoyée vers le mobile,
                  rien n&apos;apparaît ici. Dès qu&apos;une affectation sera publiée pour toi,
                  cette page affichera le contenu utile du jour.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Statut
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  En attente d&apos;une journée envoyée
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Aucun brief, aucune intervention et aucun repère mobile ne sont encore
                  disponibles pour ce compte.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Ce qui apparaîtra ici
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Activité du jour, éléments de brief, consignes terrain et informations utiles
                  envoyées depuis le back-office.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
