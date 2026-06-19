import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessForm } from "@/app/admin/acces/access-form";
import { AccessLifecycleActions } from "@/app/admin/acces/access-lifecycle-actions";
import { ResetPasswordForm } from "@/app/admin/acces/reset-password-form";
import { AppShellHeader } from "@/components/app-shell-header";
import {
  getOfficeAccountById,
  getTechniciansForOfficeAccess,
} from "@/lib/admin-office-accounts";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import {
  OFFICE_ACCOUNT_STATUS_LABELS,
  OFFICE_ROLE_LABELS,
  TERRAIN_ROLE_LABELS,
} from "@/lib/office-access";

export default async function AdminAccessDetailsPage(
  props: PageProps<"/admin/acces/[id]">,
) {
  const accessTheme = getModuleTheme("access");
  const auth = await requireOfficeModule("office_access");
  const allowedModules = getReadableOfficeModules(auth);
  const activeSiteCode = await getActiveSiteCodeOrDefault();
  const params = await props.params;
  const account = await getOfficeAccountById(params.id);

  if (!account) {
    notFound();
  }

  const technicians = await getTechniciansForOfficeAccess(account.technicianId, activeSiteCode);

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${accessTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="access"
          activeSiteCode={activeSiteCode}
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Edition du compte, du rattachement technicien et des permissions bureau."
          title={account.fullName}
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-6 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur">
          <div className="mb-6 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              Edition d&apos;un acces
            </p>
            <p className="mt-2 max-w-[72ch] text-sm leading-7 text-slate-600">
              Tu peux modifier ici l&apos;email de connexion, le rattachement a un technicien,
              les roles bureau ou terrain, et la matrice de permissions.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Etat actuel : {OFFICE_ACCOUNT_STATUS_LABELS[account.accountStatus]} · Role bureau :{" "}
              {account.officeRole ? OFFICE_ROLE_LABELS[account.officeRole] : "Aucun"} · Role terrain :{" "}
              {account.terrainRole ? TERRAIN_ROLE_LABELS[account.terrainRole] : "Aucun"}
            </p>
          </div>

          <AccessForm account={account} mode="edit" technicians={technicians} />

          <div className="mt-6">
            <ResetPasswordForm accountId={account.id} />
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              href="/admin/acces"
            >
              Retour a la liste
            </Link>
            <Link
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
              href="/admin/acces/new"
            >
              Preparer un autre acces
            </Link>
          </div>

          <div className="mt-6">
            <AccessLifecycleActions
              accountId={account.id}
              accountStatus={account.accountStatus}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
