import { LogoutButton } from "@/components/logout-button";
import { MobileDispatchAckForm } from "@/components/mobile-dispatch-ack-form";
import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
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
  mobileDispatch: MobileDispatchItem | null;
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

function formatMissionDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function departureInstructionLabel(value: MobileDispatchItem["departureInstruction"]) {
  if (value === "agency") {
    return "Passage agence obligatoire";
  }

  if (value === "direct") {
    return "Depart direct autorise";
  }

  return "Depart a confirmer";
}

function compactText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function formatDocumentSummary(
  docs: Array<{
    page: number;
    type: string;
  }>,
) {
  if (docs.length === 0) {
    return "Aucun document annexe";
  }

  const counts = docs.reduce<Record<string, number>>((accumulator, doc) => {
    const key = doc.type.trim().toUpperCase();

    if (!key) {
      return accumulator;
    }

    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([type, count]) => `${type}${count > 1 ? ` x${count}` : ""}`)
    .join(" • ");
}

export function TerrainWorkspace({
  currentDateLabel,
  loginIdentifier,
  mobileDispatch,
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
                  Cette page affiche uniquement les informations publiées sur mobile pour ta journée terrain.
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
          {mobileDispatch ? (
            <article className="rounded-[30px] border border-emerald-100/90 bg-[linear-gradient(155deg,rgba(240,253,244,0.95),rgba(255,255,255,0.92))] px-5 py-6 shadow-[0_20px_46px_rgba(148,163,184,0.14)]">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-emerald-200 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.95),rgba(220,252,231,0.85))] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <span className="text-2xl">✓</span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                    Journee publiee
                  </p>
                  <h2 className="mt-2 text-[1.8rem] font-semibold tracking-[-0.03em] text-slate-950">
                    {mobileDispatch.activitySummary}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Mission du {formatMissionDate(mobileDispatch.missionDate)} · publiee le{" "}
                    {formatTimestamp(mobileDispatch.publishedAt)}.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Consigne de depart
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {departureInstructionLabel(mobileDispatch.departureInstruction)}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Site
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {mobileDispatch.siteCode ?? technician?.site ?? "Non renseigne"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Manager
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {mobileDispatch.managerName ?? technician?.managerName ?? "Non renseigne"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/85 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Mode
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {mobileDispatch.workMode ?? "—"}
                  </p>
                </div>
              </div>

              {compactText(mobileDispatch.observation) ? (
                <div className="mt-4 rounded-[24px] border border-cyan-200 bg-cyan-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
                    Brief du jour
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {mobileDispatch.observation}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-[24px] border border-white/80 bg-white/92 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Interventions transmises
                </p>
                <div className="mt-3 space-y-3">
                  {mobileDispatch.btPayload.map((bt) => (
                    <article
                      key={`${bt.btId}-${bt.pageStart}`}
                      className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-950">{bt.btId}</p>
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
                      <p className="mt-2 text-sm font-medium text-slate-800">
                        {bt.objet || "Objet non renseigne"}
                      </p>
                      {compactText(bt.designation) ? (
                        <p className="mt-1 text-sm text-slate-600">{bt.designation}</p>
                      ) : null}
                      <p className="mt-1 text-sm text-slate-600">
                        {bt.client || "Client non renseigne"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {bt.localisation || "Localisation non renseignee"}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Duree
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {compactText(bt.duree) || "Non renseignee"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Documents
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatDocumentSummary(bt.docs)}
                          </p>
                        </div>
                      </div>
                      {compactText(bt.analyseDesRisques) ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                            Analyse des risques
                          </p>
                          <p className="mt-1 text-sm leading-6 text-amber-950">
                            {bt.analyseDesRisques}
                          </p>
                        </div>
                      ) : null}
                      {compactText(bt.observations) ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-white/85 px-3 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Observations
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {bt.observations}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              <MobileDispatchAckForm
                acknowledgedAt={mobileDispatch.acknowledgedAt}
                itemId={mobileDispatch.id}
              />
            </article>
          ) : (
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
          )}
        </section>
      </div>
    </main>
  );
}
