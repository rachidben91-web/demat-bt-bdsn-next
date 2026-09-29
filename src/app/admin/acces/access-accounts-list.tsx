"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Search, UsersRound, X } from "lucide-react";
import { useState } from "react";
import {
  OFFICE_ACCOUNT_STATUS_LABELS,
  OFFICE_MODULE_KEYS,
  OFFICE_MODULE_META,
  OFFICE_ROLE_LABELS,
  TERRAIN_ROLE_LABELS,
  canReadOfficeModule,
  type OfficeAccountAdminRow,
} from "@/lib/office-access";
import { getSiteLabel, type SiteCode } from "@/lib/site-options";

type AccessAccountsListProps = {
  accounts: OfficeAccountAdminRow[];
  selectedSiteCode: SiteCode;
};

function statusBadgeClassName(status: "active" | "inactive" | "suspended") {
  if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "suspended") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}

function accessLabel(canAccessOfficeApp: boolean, canAccessTerrainApp: boolean) {
  if (canAccessOfficeApp && canAccessTerrainApp) return "Bureau + terrain";
  if (canAccessOfficeApp) return "Bureau";
  if (canAccessTerrainApp) return "Terrain";
  return "Aucun acces";
}

function countReadableModules(permissions: Parameters<typeof canReadOfficeModule>[0]) {
  return OFFICE_MODULE_KEYS.filter((moduleKey) => canReadOfficeModule(permissions, moduleKey)).length;
}

function getReadableModuleLabels(permissions: Parameters<typeof canReadOfficeModule>[0]) {
  return OFFICE_MODULE_KEYS.filter((moduleKey) => canReadOfficeModule(permissions, moduleKey)).map(
    (moduleKey) => OFFICE_MODULE_META[moduleKey].label,
  );
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function accountMatchesSearch(account: OfficeAccountAdminRow, searchQuery: string) {
  const query = normalizeSearchText(searchQuery.trim());
  if (!query) return true;

  return [
    account.fullName,
    account.email,
    account.loginIdentifier,
    account.technicianDisplayName,
  ].some((value) => normalizeSearchText(value).includes(query));
}

export function AccessAccountsList({ accounts, selectedSiteCode }: AccessAccountsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const filteredAccounts = accounts.filter((account) => accountMatchesSearch(account, searchQuery));
  const hasSearchQuery = searchQuery.trim().length > 0;

  function updateSearchQuery(value: string) {
    setSearchQuery(value);
    if (value.trim()) setIsExpanded(true);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-blue-100 p-2.5 text-blue-700"><UsersRound className="h-5 w-5" /></span>
          <div>
            <h2 className="font-semibold text-slate-950">Comptes et techniciens</h2>
            <p className="mt-1 text-sm text-slate-500">{accounts.length} compte{accounts.length > 1 ? "s" : ""} pour {getSiteLabel(selectedSiteCode)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              onChange={(event) => updateSearchQuery(event.target.value)}
              onFocus={() => setIsExpanded(true)}
              placeholder="Rechercher un nom, identifiant ou e-mail"
              type="search"
              value={searchQuery}
            />
            {hasSearchQuery ? (
              <button aria-label="Effacer la recherche" className="absolute right-2 top-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setSearchQuery("")} type="button">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <button aria-expanded={isExpanded} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" onClick={() => setIsExpanded((value) => !value)} type="button">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isExpanded ? "Replier la liste" : "Afficher la liste"}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <>
          <div className="border-b border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 sm:px-5">
            {hasSearchQuery ? `${filteredAccounts.length} resultat${filteredAccounts.length > 1 ? "s" : ""} sur ${accounts.length}` : `Tous les ${accounts.length} comptes sont affiches.`}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] text-sm">
              <thead className="bg-[linear-gradient(90deg,#2d63da_0%,#3567e7_100%)] text-white">
                <tr>{["Compte", "Type d'acces", "Technicien lie", "Role bureau", "Role terrain", "Modules", "Securite", "Etat", "Action"].map((heading) => <th key={heading} className="px-4 py-4 text-left font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-4"><p className="font-semibold text-slate-950">{account.fullName}</p><p className="mt-1 text-slate-500">{account.email}</p><p className="mt-1 text-xs text-slate-400">Identifiant : {account.loginIdentifier ?? "—"}</p></td>
                    <td className="px-4 py-4 text-slate-600">{accessLabel(account.canAccessOfficeApp, account.canAccessTerrainApp)}</td>
                    <td className="px-4 py-4 text-slate-600"><p>{account.technicianDisplayName ?? "Compte externe"}</p>{account.technicianSiteCode ? <p className="mt-1 text-xs text-slate-400">{getSiteLabel(account.technicianSiteCode as SiteCode)}</p> : null}</td>
                    <td className="px-4 py-4 text-slate-600">{account.officeRole ? OFFICE_ROLE_LABELS[account.officeRole] : "—"}</td>
                    <td className="px-4 py-4 text-slate-600">{account.terrainRole ? TERRAIN_ROLE_LABELS[account.terrainRole] : "—"}</td>
                    <td className="px-4 py-4 text-slate-600"><p>{countReadableModules(account.modulePermissions)} / {OFFICE_MODULE_KEYS.length}</p><p className="mt-1 text-xs text-slate-500">{getReadableModuleLabels(account.modulePermissions).join(", ") || "Aucun"}</p></td>
                    <td className="px-4 py-4 text-slate-600">{account.passwordChanged ? "Mot de passe defini" : "Changement requis"}</td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeClassName(account.accountStatus)}`}>{OFFICE_ACCOUNT_STATUS_LABELS[account.accountStatus]}</span></td>
                    <td className="px-4 py-4"><Link className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href={`/admin/acces/${account.id}`}>Ouvrir</Link></td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 ? <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={9}>Aucun compte ne correspond a cette recherche.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="px-5 py-5 text-sm text-slate-500">La liste est repliee. Utilise la recherche ou le bouton « Afficher la liste » pour ouvrir les comptes.</div>
      )}
    </section>
  );
}
