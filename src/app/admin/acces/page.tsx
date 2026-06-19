import Link from "next/link";
import { AppShellHeader } from "@/components/app-shell-header";
import { getOfficeAccounts } from "@/lib/admin-office-accounts";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { SITE_OPTIONS, getSiteLabel, isSiteCode, type SiteCode } from "@/lib/site-options";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import {
  OFFICE_ACCOUNT_STATUS_LABELS,
  OFFICE_MODULE_KEYS,
  OFFICE_MODULE_META,
  OFFICE_ROLE_LABELS,
  TERRAIN_ROLE_LABELS,
  canReadOfficeModule,
} from "@/lib/office-access";

function statusBadgeClassName(status: "active" | "inactive" | "suspended") {
  if (status === "active") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (status === "suspended") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-slate-100 text-slate-500 border-slate-200";
}

function accessLabel(canAccessOfficeApp: boolean, canAccessTerrainApp: boolean) {
  if (canAccessOfficeApp && canAccessTerrainApp) {
    return "Bureau + terrain";
  }

  if (canAccessOfficeApp) {
    return "Bureau";
  }

  if (canAccessTerrainApp) {
    return "Terrain";
  }

  return "Aucun acces";
}

function countReadableModules(
  permissions: Parameters<typeof canReadOfficeModule>[0],
) {
  return OFFICE_MODULE_KEYS.filter((moduleKey) => canReadOfficeModule(permissions, moduleKey)).length;
}

function getReadableModuleLabels(
  permissions: Parameters<typeof canReadOfficeModule>[0],
) {
  return OFFICE_MODULE_KEYS.filter((moduleKey) => canReadOfficeModule(permissions, moduleKey)).map(
    (moduleKey) => OFFICE_MODULE_META[moduleKey].label,
  );
}

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
  const accounts = await getOfficeAccounts(selectedSiteCode);

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

          <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-sm">
                <thead className="bg-[linear-gradient(90deg,#2d63da_0%,#3567e7_100%)] text-white">
                  <tr>
                    {[
                      "Compte",
                      "Type d'acces",
                      "Technicien lie",
                      "Role bureau",
                      "Role terrain",
                      "Modules",
                      "Securite",
                      "Etat",
                      "Action",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-4 text-left font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">{account.fullName}</p>
                        <p className="mt-1 text-slate-500">{account.email}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Identifiant : {account.loginIdentifier ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {accessLabel(account.canAccessOfficeApp, account.canAccessTerrainApp)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <p>{account.technicianDisplayName ?? "Compte externe"}</p>
                        {account.technicianSiteCode ? (
                          <p className="mt-1 text-xs text-slate-400">
                            {getSiteLabel(account.technicianSiteCode as SiteCode)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {account.officeRole ? OFFICE_ROLE_LABELS[account.officeRole] : "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {account.terrainRole ? TERRAIN_ROLE_LABELS[account.terrainRole] : "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <p>
                          {countReadableModules(account.modulePermissions)} / {OFFICE_MODULE_KEYS.length}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getReadableModuleLabels(account.modulePermissions).join(", ") || "Aucun"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {account.passwordChanged ? "Mot de passe defini" : "Changement requis"}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClassName(account.accountStatus)}`}
                        >
                          {OFFICE_ACCOUNT_STATUS_LABELS[account.accountStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          href={`/admin/acces/${account.id}`}
                        >
                          Ouvrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                        Aucun compte charge pour {getSiteLabel(selectedSiteCode)}.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

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
