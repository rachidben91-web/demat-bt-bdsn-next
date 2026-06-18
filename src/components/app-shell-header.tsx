import Image from "next/image";
import Link from "next/link";
import packageJson from "../../package.json";
import { getModuleTheme, type AppModuleId } from "@/lib/module-theme";
import { ModuleIcon } from "@/components/module-icon";
import { LogoutButton } from "@/components/logout-button";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { HeaderWeatherZone } from "@/lib/weather";

type ActiveModule = AppModuleId;

type AppShellHeaderProps = {
  activeModule: ActiveModule;
  allowedModules?: OfficeModuleKey[];
  headerDateTimeLabel?: string | null;
  isSuperAdmin?: boolean;
  role: string | null;
  userEmail: string | null;
  title: string;
  subtitle?: string;
  sourceLabel?: string | null;
  weatherGeneratedAtLabel?: string | null;
  weatherZones?: HeaderWeatherZone[];
};

const moduleItems = [
  { id: "dashboard", label: "Tableau de bord", href: "/", moduleKey: "dashboard" },
  { id: "support", label: "Support Journée", href: "/support", moduleKey: "support_journee" },
  { id: "referent", label: "Référent", href: "/referent", moduleKey: "referent" },
  { id: "brief", label: "Brief", href: "/brief", moduleKey: "brief" },
  { id: "import", label: "Import PDF", href: "/import-pdf", moduleKey: "import_pdf" },
  { id: "messagerie", label: "Messagerie", href: "/messagerie", moduleKey: "messagerie" },
  { id: "admin", label: "Admin tech", href: "/admin/techniciens", moduleKey: "technicians_admin" },
  { id: "access", label: "Accès", href: "/admin/acces", moduleKey: "office_access" },
] as const;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function formatRoleLabel(role: string | null) {
  if (!role) {
    return "Rôle non défini";
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
  headerDateTimeLabel,
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
  const appVersion = `v${packageJson.version}`;
  const firstName = extractFirstName(userEmail);
  const roleLabel = formatRoleLabel(role);
  const hasHeaderStatus = Boolean(headerDateTimeLabel || weatherGeneratedAtLabel || weatherZones.length > 0);
  const shouldShowSubtitle = Boolean(subtitle?.trim());
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
      <div className="px-5 py-3.5 sm:px-6 lg:px-7">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.95fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/85 bg-white/80 shadow-[0_8px_20px_rgba(148,163,184,0.12)]">
                <Image
                  alt="Logo Demat-BT"
                  className="h-8 w-auto"
                  height={32}
                  priority
                  src="/dashboard-topbar-logo.png"
                  width={32}
                />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-slate-500">
                DEMAT-BT Next
              </p>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <h1 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">{title}</h1>
              {shouldShowSubtitle ? (
                <p className="max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
              ) : null}
            </div>
            {sourceLabel ? (
              <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600">
                {sourceLabel}
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            {hasHeaderStatus ? (
              <div className="mx-auto max-w-[760px] rounded-[22px] border border-sky-200/90 bg-[linear-gradient(180deg,rgba(248,251,255,0.97)_0%,rgba(228,237,251,0.97)_100%)] px-5 py-3 text-center text-slate-900 shadow-[0_18px_38px_rgba(125,146,178,0.18)] backdrop-blur">
                <p className="text-[15px] font-semibold tracking-[0.01em] text-slate-900">
                  {headerDateTimeLabel ?? weatherGeneratedAtLabel ?? "Repère indisponible"}
                </p>
                <div className="mx-auto mt-2 h-px w-24 bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.35),transparent)]" />
                <div className="mt-2 flex flex-nowrap items-center justify-center gap-2 overflow-hidden text-[10px] text-slate-700">
                  {weatherZones.map((zone) => (
                    <span
                      key={zone.id}
                      className="inline-flex min-w-0 shrink items-center gap-1 whitespace-nowrap rounded-full bg-white/72 px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                    >
                      <span>{zone.weatherIcon}</span>
                      <span className="truncate font-medium text-slate-800">{zone.label}</span>
                      <span className="shrink-0 text-slate-600">
                        {zone.temperatureC ?? "—"}°C (Pluie {zone.rainProbabilityPercent ?? "—"}%)
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2.5 xl:justify-end">
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
                  <p className="mt-1 text-[10px] font-medium text-slate-400">{appVersion}</p>
                </div>
              </div>
              <LogoutButton />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-5 py-3 sm:px-6 lg:px-7">
        <div className="flex flex-wrap items-center gap-1.5 rounded-[20px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur">
          {visibleItems.map((item) => {
            const isActive = item.id === activeModule;
            const theme = getModuleTheme(item.id);

            return (
              <Link
                key={item.id}
                className={cx(
                  "group inline-flex items-center gap-2 rounded-[14px] border border-transparent px-3 py-1.5 text-[13px] font-semibold transition duration-200",
                  isActive
                    ? theme.activeNavClassName
                    : "text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-[0_12px_22px_rgba(148,163,184,0.12)]",
                )}
                href={item.href}
              >
                <span
                  className={cx(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-[9px] px-1 text-[10px] font-bold transition",
                    isActive
                      ? theme.activeNavIconClassName
                      : "border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-500 group-hover:border-slate-200 group-hover:bg-white group-hover:text-slate-950",
                  )}
                >
                  <ModuleIcon className="h-3.5 w-3.5" moduleId={item.id} />
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
