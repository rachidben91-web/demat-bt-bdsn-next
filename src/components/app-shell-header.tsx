import Link from "next/link";
import { getModuleTheme, type AppModuleId } from "@/lib/module-theme";
import { LogoutButton } from "@/components/logout-button";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { HeaderWeatherZone } from "@/lib/weather";

type ActiveModule = AppModuleId;

type AppShellHeaderProps = {
  activeModule: ActiveModule;
  allowedModules?: OfficeModuleKey[];
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
  title: string;
  subtitle: string;
  sourceLabel?: string | null;
  weatherGeneratedAtLabel?: string | null;
  weatherZones?: HeaderWeatherZone[];
};

const moduleItems = [
  { id: "dashboard", label: "Dashboard", href: "/", moduleKey: "dashboard" },
  { id: "support", label: "Support Journée", href: "/support", moduleKey: "support_journee" },
  { id: "referent", label: "Référent", href: "/referent", moduleKey: "referent" },
  { id: "brief", label: "Brief", href: "/brief", moduleKey: "brief" },
  { id: "import", label: "Import PDF", href: "/import-pdf", moduleKey: "import_pdf" },
  { id: "admin", label: "Admin", href: "/admin/techniciens", moduleKey: "technicians_admin" },
  { id: "access", label: "Accès", href: "/admin/acces", moduleKey: "office_access" },
] as const;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function ModuleIcon({ moduleId }: { moduleId: AppModuleId }) {
  const commonProps = {
    className: "h-3.5 w-3.5",
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

function getHeaderBadgeTone(className: string) {
  return className
    .replace("text-emerald-100", "text-emerald-700")
    .replace("text-indigo-100", "text-indigo-700")
    .replace("text-amber-100", "text-amber-700")
    .replace("text-violet-100", "text-violet-700")
    .replace("text-sky-100", "text-sky-700")
    .replace("text-rose-100", "text-rose-700");
}

function formatRoleLabel(role: string | null) {
  if (!role) {
    return "Role non defini";
  }

  return role
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractFirstName(userEmail: string | null) {
  if (!userEmail) {
    return "Compte";
  }

  const localPart = userEmail.split("@")[0] ?? "";
  const firstChunk = localPart.split(/[.\-_+]+/).find(Boolean) ?? localPart;

  if (!firstChunk) {
    return "Compte";
  }

  return firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1).toLowerCase();
}

export function AppShellHeader({
  activeModule,
  allowedModules = [],
  isSuperAdmin = false,
  role,
  userEmail,
  title,
  subtitle,
  sourceLabel,
  weatherGeneratedAtLabel,
  weatherZones = [],
}: AppShellHeaderProps) {
  const activeTheme = getModuleTheme(activeModule);
  const firstName = extractFirstName(userEmail);
  const roleLabel = formatRoleLabel(role);
  const visibleItems = moduleItems.filter((item) => {
    if (item.moduleKey === null) {
      return isSuperAdmin;
    }

    return isSuperAdmin || allowedModules.includes(item.moduleKey);
  });

  return (
    <header
      className={cx(
        "overflow-hidden rounded-[28px] border border-white/80 shadow-[0_22px_56px_rgba(148,163,184,0.16)] backdrop-blur",
        activeTheme.headerClassName,
      )}
    >
      <div className="px-5 py-4 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-slate-500">
                DEMAT-BT Next
              </p>
              <span
                className={cx(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]",
                  getHeaderBadgeTone(activeTheme.headerBadgeClassName),
                )}
              >
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-current/15 bg-white/70 px-1 text-[10px] font-bold">
                  <ModuleIcon moduleId={activeModule} />
                </span>
                {activeTheme.label}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:gap-4">
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">{title}</h1>
              <p className="max-w-3xl pb-0.5 text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>
            {sourceLabel ? (
              <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                {sourceLabel}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-stretch gap-2.5 xl:min-w-[340px] xl:items-end">
            {weatherGeneratedAtLabel || weatherZones.length > 0 ? (
              <div className="rounded-[22px] border border-white/90 bg-white/72 px-4 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-950">
                  {weatherGeneratedAtLabel ?? "Météo indisponible"}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  {weatherZones.map((zone) => (
                    <span key={zone.id}>
                      {zone.weatherIcon} {zone.label}: {zone.temperatureC ?? "—"}°C{" "}
                      (Pluie {zone.rainProbabilityPercent ?? "—"}%)
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <div className="flex items-center gap-3 rounded-[24px] border border-white/95 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(241,245,249,0.9))] px-3 py-2.5 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur">
                <div
                  className={cx(
                    "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] text-sm font-semibold shadow-[0_10px_22px_rgba(148,163,184,0.12)]",
                    activeTheme.tintClassName,
                  )}
                >
                  {firstName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-[112px] text-left">
                  <p className="text-sm font-semibold leading-5 text-slate-950">{firstName}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-slate-400">
                    {roleLabel}
                  </p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-5 py-3 sm:px-6 lg:px-7">
        <div className="flex flex-wrap items-center gap-1.5 rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur">
          {visibleItems.map((item) => {
            const isActive = item.id === activeModule;
            const theme = getModuleTheme(item.id);

            return (
              <Link
                key={item.id}
                className={cx(
                  "group inline-flex items-center gap-2 rounded-[16px] border border-transparent px-3.5 py-2 text-sm font-semibold transition duration-200",
                  isActive
                    ? theme.activeNavClassName
                    : "text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-[0_12px_22px_rgba(148,163,184,0.12)]",
                )}
                href={item.href}
              >
                <span
                  className={cx(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-[10px] px-1 text-[10px] font-bold transition",
                    isActive
                      ? theme.activeNavIconClassName
                      : "border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-500 group-hover:border-slate-200 group-hover:bg-white group-hover:text-slate-950",
                  )}
                >
                  <ModuleIcon moduleId={item.id} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
