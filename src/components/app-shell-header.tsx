import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { HeaderWeatherZone } from "@/lib/weather";

type ActiveModule = "support" | "admin" | "referent" | "import" | "brief";

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
  { id: "support", label: "Support Journee", href: "/", moduleKey: "support_journee" },
  { id: "admin", label: "Admin", href: "/admin/techniciens", moduleKey: "technicians_admin" },
  { id: "referent", label: "Acces", href: "/admin/acces", moduleKey: "office_access" },
  { id: "brief", label: "Brief", href: "/brief", moduleKey: "support_journee" },
  { id: "import", label: "Import PDF", href: "/import-pdf", moduleKey: "support_journee" },
] as const;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
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
  const visibleItems = moduleItems.filter((item) => {
    if (item.moduleKey === null) {
      return isSuperAdmin;
    }

    return isSuperAdmin || allowedModules.includes(item.moduleKey);
  });

  return (
    <header className="overflow-hidden rounded-[32px] border border-slate-200/60 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_24%),linear-gradient(135deg,#0f172a_0%,#172033_44%,#111827_100%)] shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
      <div className="px-5 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-sky-200/78">
              DEMAT-BT Next
            </p>
            <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-5">
              <h1 className="text-[2.2rem] font-semibold tracking-[-0.03em] text-white">{title}</h1>
              <p className="max-w-3xl pb-1 text-sm leading-6 text-slate-300/82">{subtitle}</p>
            </div>
            {sourceLabel ? (
              <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-slate-200">
                {sourceLabel}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col items-stretch gap-3 xl:min-w-[360px] xl:items-end">
            {weatherGeneratedAtLabel || weatherZones.length > 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/6 px-4 py-3 text-center shadow-inner backdrop-blur">
                <p className="text-sm font-semibold text-white">
                  {weatherGeneratedAtLabel ?? "Meteo indisponible"}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
                  {weatherZones.map((zone) => (
                    <span key={zone.id}>
                      {zone.weatherIcon} {zone.label}: {zone.temperatureC ?? "—"}°C
                      {" "}
                      (Pluie {zone.rainProbabilityPercent ?? "—"}%)
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/7 px-4 py-3 text-right text-sm text-slate-200 backdrop-blur">
                <p className="font-semibold text-white">{userEmail ?? "Compte connecte"}</p>
                <p className="mt-1 uppercase tracking-[0.24em] text-sky-200/72">
                  Role : {role ?? "non defini"}
                </p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-2.5 shadow-inner backdrop-blur">
          {visibleItems.map((item) => {
            const isActive = item.id === activeModule;
            return (
              <Link
                key={item.id}
                className={cx(
                  "rounded-[18px] px-4 py-2.5 text-sm font-semibold transition duration-200",
                  isActive
                    ? "bg-[linear-gradient(180deg,#ffffff_0%,#f3f6fb_100%)] text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.14)]"
                    : "text-slate-300/92 hover:bg-white/8 hover:text-white",
                )}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
