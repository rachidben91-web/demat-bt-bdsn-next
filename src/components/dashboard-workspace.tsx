"use client";

import Image from "next/image";
import Link from "next/link";
import { BellRing, Sparkles } from "lucide-react";
import { AppShellHeader } from "@/components/app-shell-header";
import { ModuleIcon } from "@/components/module-icon";
import { getModuleTheme } from "@/lib/module-theme";
import type { BtImportDayOverview } from "@/lib/bt-import-days";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { SiteCode } from "@/lib/site-options";
import type { SupportJourneeData } from "@/lib/support-journee";

type DashboardWorkspaceProps = {
  activeSiteCode?: SiteCode | null;
  allowedModules?: OfficeModuleKey[];
  btOverview: BtImportDayOverview;
  currentDateLabel: string;
  headerDateTimeLabel: string;
  isSuperAdmin?: boolean;
  role: string | null;
  supportData: SupportJourneeData;
  userEmail: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function DashboardWorkspace(props: DashboardWorkspaceProps) {
  const { activeSiteCode, allowedModules = [], currentDateLabel, headerDateTimeLabel, isSuperAdmin = false, role, userEmail, supportData } = props;
  const dashboardTheme = getModuleTheme("dashboard");
  const canAccessSupportDay = allowedModules.includes("support_journee") || isSuperAdmin;
  const moduleCards = [
    {
      id: "support",
      href: "/support",
      title: "Support Journée",
      description: "Pilotage quotidien, brief, météo terrain et suivi des affectations du jour.",
      iconModuleId: "support" as const,
      tone: "from-emerald-50 via-white to-emerald-100/70",
      border: "border-emerald-200/80",
      accent: "text-emerald-700",
      visible: canAccessSupportDay,
    },
    {
      id: "referent",
      href: "/referent",
      title: "Référent",
      description: "Vue synthétique de dispatch, réaffectation et préparation de l’envoi mobile.",
      iconModuleId: "referent" as const,
      tone: "from-violet-50 via-white to-violet-100/70",
      border: "border-violet-200/80",
      accent: "text-violet-700",
      visible: allowedModules.includes("referent") || isSuperAdmin,
    },
    {
      id: "brief",
      href: "/brief",
      title: "Brief",
      description: "Lecture détaillée des BT, documents d’origine, observations et analyse des risques.",
      iconModuleId: "brief" as const,
      tone: "from-sky-50 via-white to-sky-100/70",
      border: "border-sky-200/80",
      accent: "text-sky-700",
      visible: allowedModules.includes("brief") || isSuperAdmin,
    },
    {
      id: "import",
      href: "/import-pdf",
      title: "Import PDF",
      description: "Chargement du PDF journalier et préparation des BT détectés pour la journée.",
      iconModuleId: "import" as const,
      tone: "from-rose-50 via-white to-rose-100/70",
      border: "border-rose-200/80",
      accent: "text-rose-700",
      visible: allowedModules.includes("import_pdf") || isSuperAdmin,
    },
    {
      id: "messagerie",
      href: "/messagerie",
      title: "Messagerie",
      description: "Suivi des conversations bureau-terrain, alertes et messages rattaches aux tournees.",
      iconModuleId: "messagerie" as const,
      tone: "from-teal-50 via-white to-teal-100/70",
      border: "border-teal-200/80",
      accent: "text-teal-700",
      visible: allowedModules.includes("messagerie") || isSuperAdmin,
    },
    {
      id: "admin",
      href: "/admin/techniciens",
      title: "Admin tech",
      description: "Référentiel techniciens, managers, couleurs métier et paramètres de structure.",
      iconModuleId: "admin" as const,
      tone: "from-indigo-50 via-white to-indigo-100/70",
      border: "border-indigo-200/80",
      accent: "text-indigo-700",
      visible: allowedModules.includes("technicians_admin") || isSuperAdmin,
    },
    {
      id: "access",
      href: "/admin/acces",
      title: "Accès",
      description: "Comptes bureau, permissions par module et suivi des habilitations terrain.",
      iconModuleId: "access" as const,
      tone: "from-amber-50 via-white to-amber-100/70",
      border: "border-amber-200/80",
      accent: "text-amber-700",
      visible: allowedModules.includes("office_access") || isSuperAdmin,
    },
  ].filter((item) => item.visible);

  return (
    <main className={cx("min-h-screen px-4 py-4 text-slate-900 sm:px-5 lg:px-6", dashboardTheme.pageBackgroundClassName)}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="dashboard"
          activeSiteCode={activeSiteCode}
          allowedModules={allowedModules}
          headerDateTimeLabel={headerDateTimeLabel}
          isSuperAdmin={isSuperAdmin}
          role={role}
          title="Tableau de bord"
          userEmail={userEmail}
          weatherGeneratedAtLabel={supportData.headerWeather.generatedAtLabel}
          weatherZones={supportData.headerWeather.zones}
        />

        <section className="mt-4 rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-[0_22px_56px_rgba(148,163,184,0.14)] backdrop-blur sm:p-6">
          <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(247,250,255,0.98),rgba(255,255,255,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
              Accès du jour
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <Image
                    alt="Logo Demat-BT"
                    className="h-28 w-auto"
                    height={112}
                    priority
                    src="/dashboard-home-logo.png"
                    width={112}
                  />
                </div>
                <div>
                  <h3 className="text-[1.7rem] font-semibold tracking-[-0.03em] text-slate-950">
                    Bonjour
                  </h3>
                  <p className="mt-2 max-w-[70ch] text-sm leading-6 text-slate-500">
                    Voici le tableau d&apos;entrée pour retrouver rapidement les modules bureau et les
                    repères utiles du jour.
                  </p>
                </div>
              </div>
              <div className="rounded-[18px] border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 shadow-[0_10px_24px_rgba(59,130,246,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-500">
                  Date du jour
                </p>
                <p className="mt-1 text-base font-semibold">{currentDateLabel}</p>
              </div>
            </div>
          </div>

           {canAccessSupportDay ? (
             <Link
               className="group relative mt-5 block overflow-hidden rounded-[24px] border border-amber-300 bg-[linear-gradient(135deg,#fff8e8_0%,#fffdf7_52%,#ffedd5_100%)] p-5 shadow-[0_18px_42px_rgba(217,119,6,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-[0_22px_48px_rgba(217,119,6,0.2)] sm:p-6"
               href="/support"
             >
               <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-300/30 blur-2xl" />
               <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                 <div className="flex items-start gap-4">
                   <div className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-amber-200 bg-white text-amber-700 shadow-[0_12px_26px_rgba(217,119,6,0.16)]">
                     <span className="absolute h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping" />
                     <BellRing aria-hidden="true" className="relative h-7 w-7" />
                   </div>
                   <div>
                     <div className="flex flex-wrap items-center gap-2">
                       <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                         Nouveauté · v1.3.2
                       </p>
                       <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900">
                         <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                         À découvrir
                       </span>
                     </div>
                     <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-slate-950">
                       Reprise forcée du Support Journée
                     </h3>
                     <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-700">
                       Lorsqu&apos;un référent est indisponible, un autre référent peut désormais reprendre le support verrouillé et poursuivre l&apos;organisation de la journée.
                     </p>
                   </div>
                 </div>
                 <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-amber-900">
                   Voir le Support Journée
                   <Sparkles aria-hidden="true" className="h-4 w-4 transition group-hover:scale-110" />
                 </span>
               </div>
             </Link>
           ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">
                Modules disponibles
              </h3>
            </div>
            <p className="max-w-[48ch] text-sm leading-6 text-slate-500">
              Chaque carte te donne un point d&apos;entrée clair vers un module métier avec son rôle associé.
            </p>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {moduleCards.map((module) => (
              <Link
                key={module.id}
                className={cx(
                  "group relative overflow-hidden rounded-[24px] border bg-[linear-gradient(135deg,var(--tw-gradient-stops))] px-4 py-4 shadow-[0_16px_36px_rgba(148,163,184,0.1)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(148,163,184,0.14)]",
                  module.border,
                  module.tone,
                )}
                href={module.href}
              >
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.72),transparent_72%)] opacity-80 transition duration-200 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="max-w-[24rem]">
                    <p className={cx("text-[11px] font-semibold uppercase tracking-[0.28em]", module.accent)}>
                      {module.title}
                    </p>
                    <p className="mt-2.5 text-[15px] leading-7 text-slate-600">{module.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                      Ouvrir le module
                      <span className="transition group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                  <div
                    className={cx(
                      "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] shadow-[0_16px_30px_rgba(148,163,184,0.16)]",
                      module.accent,
                    )}
                  >
                    <ModuleIcon className="h-7 w-7" moduleId={module.iconModuleId} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
