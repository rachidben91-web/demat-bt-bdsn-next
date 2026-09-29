import Link from "next/link";
import { AppShellHeader } from "@/components/app-shell-header";
import { getOfficeAccounts } from "@/lib/admin-office-accounts";
import { AccessAccountsList } from "@/app/admin/acces/access-accounts-list";
import { getOfficeAccountSessionOverview } from "@/lib/admin-office-sessions";
import {
  getReadableOfficeModules,
  hasOfficeModuleWriteAccess,
  requireOfficeModule,
} from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { SITE_OPTIONS, getSiteLabel, isSiteCode, type SiteCode } from "@/lib/site-options";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import {
  OFFICE_MODULE_KEYS,
  OFFICE_MODULE_META,
} from "@/lib/office-access";
import { SessionManagement } from "@/app/admin/acces/session-management";

function normalizeSiteFilter(value: string | string[] | undefined, fallback: SiteCode) {
  const siteCode = Array.isArray(value) ? value[0] : value;
  return isSiteCode(siteCode) ? siteCode : fallback;
}

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string | string[] }>;
}) {
  const accessTheme = getModuleTheme("access");
  const auth = await requireOfficeModule("office_access");
  const allowedModules = getReadableOfficeModules(auth);
  const activeSiteCode = await getActiveSiteCodeOrDefault();
  const params = await searchParams;
  const selectedSiteCode = normalizeSiteFilter(params.site, activeSiteCode);
  const canManageSessions = hasOfficeModuleWriteAccess(auth, "office_access");
  const [accounts, sessionOverview] = await Promise.all([
    getOfficeAccounts(selectedSiteCode),
    canManageSessions
      ? getOfficeAccountSessionOverview(selectedSiteCode)
      : Promise.resolve(null),
  ]);

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${accessTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="access"
          activeSiteCode={activeSiteCode}
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Gestion des comptes bureau, des acces terrain et des permissions par module."
          title="Accès et permissions"
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Module Admin tech
              </p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Accès et permissions
              </h2>
              <p className="mt-3 max-w-[68ch] text-base leading-7 text-slate-500">
                Liste des comptes relies aux referents, managers et acces terrain de{" "}
                {getSiteLabel(selectedSiteCode)}.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[auto_auto]">
              <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                {SITE_OPTIONS.map((site) => {
                  const isSelected = site.code === selectedSiteCode;

                  return (
                    <Link
                      key={site.code}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                      href={`/admin/acces?site=${site.code}`}
                    >
                      {site.code}
                    </Link>
                  );
                })}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-2xl font-semibold text-slate-950">{accounts.length}</p>
                <p className="mt-1 text-sm text-slate-500">comptes detectes</p>
              </div>
              <Link
                className="flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                href={`/admin/acces/new?site=${selectedSiteCode}`}
              >
                + Nouvel acces
              </Link>
            </div>
          </div>

          {sessionOverview ? (
            <SessionManagement
              currentUserId={auth.user?.id ?? null}
              isPreview={sessionOverview.isPreview}
              sessions={sessionOverview.sessions}
            />
          ) : null}

          <AccessAccountsList accounts={accounts} selectedSiteCode={selectedSiteCode} />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {OFFICE_MODULE_KEYS.map((moduleKey) => (
              <div
                key={moduleKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm"
              >
                <p className="font-semibold text-slate-900">{OFFICE_MODULE_META[moduleKey].label}</p>
                <p className="mt-1 leading-6 text-slate-500">
                  {OFFICE_MODULE_META[moduleKey].description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
