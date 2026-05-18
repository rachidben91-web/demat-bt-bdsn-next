"use client";

import Link from "next/link";
import { AppShellHeader } from "@/components/app-shell-header";
import { getModuleTheme, type AppModuleId } from "@/lib/module-theme";
import type { BtImportDayOverview } from "@/lib/bt-import-days";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { SupportJourneeData } from "@/lib/support-journee";

type DashboardWorkspaceProps = {
  allowedModules?: OfficeModuleKey[];
  btOverview: BtImportDayOverview;
  isSuperAdmin?: boolean;
  role: string | null;
  supportData: SupportJourneeData;
  userEmail: string | null;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function DashboardModuleIcon({ moduleId }: { moduleId: AppModuleId }) {
  const commonProps = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
  };

  switch (moduleId) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <rect x="4.75" y="4.75" width="5.75" height="5.75" rx="1.8" />
          <rect x="13.5" y="4.75" width="5.75" height="5.75" rx="1.8" />
          <rect x="4.75" y="13.5" width="5.75" height="5.75" rx="1.8" />
          <rect x="13.5" y="13.5" width="5.75" height="5.75" rx="1.8" />
        </svg>
      );
    case "support":
      return (
        <svg {...commonProps}>
          <path d="M12 4.75v14.5" />
          <path d="M4.75 12h14.5" />
          <circle cx="12" cy="12" r="2.75" />
          <path d="M12 7.5v1.25" />
        </svg>
      );
    case "referent":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8.5" r="3" />
          <path d="M6.75 18.25c1.55-2.45 3.25-3.5 5.25-3.5s3.7 1.05 5.25 3.5" />
          <path d="M17.5 7.25 19.25 9" />
        </svg>
      );
    case "brief":
      return (
        <svg {...commonProps}>
          <rect x="5.25" y="4.75" width="13.5" height="14.5" rx="2.75" />
          <path d="M8.25 9h7.5" />
          <path d="M8.25 12h7.5" />
          <path d="M8.25 15h5" />
          <path d="M15.5 4.75v3.25h3.25" />
        </svg>
      );
    case "import":
      return (
        <svg {...commonProps}>
          <path d="M12 4.75v9.5" />
          <path d="m8.5 10.75 3.5 3.5 3.5-3.5" />
          <path d="M5.5 18.5h13" />
          <path d="M7 6.5h2" />
        </svg>
      );
    case "admin":
      return (
        <svg {...commonProps}>
          <path d="M12 4.75 6.5 7.5v4.1c0 3.2 2.15 6 5.5 7.65 3.35-1.65 5.5-4.45 5.5-7.65V7.5L12 4.75Z" />
          <path d="M12 8.75v5.25" />
          <path d="M9.5 11.375h5" />
        </svg>
      );
    case "access":
      return (
        <svg {...commonProps}>
          <rect x="4.75" y="6.25" width="14.5" height="12" rx="2.75" />
          <path d="M8.75 6.25V4.75" />
          <path d="M15.25 6.25V4.75" />
          <path d="M4.75 10.75h14.5" />
          <circle cx="15.5" cy="14.5" r="1" />
        </svg>
      );
  }
}

export function DashboardWorkspace(props: DashboardWorkspaceProps) {
  const { allowedModules = [], isSuperAdmin = false, role, userEmail } = props;
  const dashboardTheme = getModuleTheme("dashboard");
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
      visible: allowedModules.includes("support_journee") || isSuperAdmin,
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
      id: "admin",
      href: "/admin/techniciens",
      title: "Admin",
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
          allowedModules={allowedModules}
          isSuperAdmin={isSuperAdmin}
          role={role}
          subtitle="Point d’entrée léger pour retrouver rapidement les modules bureau et les repères du jour."
          title="Dashboard"
          userEmail={userEmail}
        />

        <section className="mt-4 rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-[0_22px_56px_rgba(148,163,184,0.14)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">
                Navigation rapide
              </p>
              <h3 className="mt-2 text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">
                Modules disponibles
              </h3>
            </div>
            <p className="max-w-[48ch] text-sm leading-6 text-slate-500">
              Accès directs aux espaces bureau essentiels, dans une version plus compacte.
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
                      "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.88))] shadow-[0_12px_26px_rgba(148,163,184,0.14)]",
                      module.accent,
                    )}
                  >
                    <DashboardModuleIcon moduleId={module.iconModuleId} />
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
