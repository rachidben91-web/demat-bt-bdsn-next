import Link from "next/link";
import { notFound } from "next/navigation";
import { AccessForm } from "@/app/admin/acces/access-form";
import { AccessLifecycleActions } from "@/app/admin/acces/access-lifecycle-actions";
import { ResetPasswordForm } from "@/app/admin/acces/reset-password-form";
import { AppShellHeader } from "@/components/app-shell-header";
import { getTechnicianById } from "@/lib/admin-technicians";
import {
  getOfficeAccountByTechnicianId,
  getTechniciansForOfficeAccess,
} from "@/lib/admin-office-accounts";
import {
  getCurrentAuthContext,
  getReadableOfficeModules,
  hasOfficeModuleWriteAccess,
} from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import {
  OFFICE_ACCOUNT_STATUS_LABELS,
  OFFICE_ROLE_LABELS,
  TERRAIN_ROLE_LABELS,
} from "@/lib/office-access";
import { redirect } from "next/navigation";

export default async function TechnicianAccessPage(
  props: PageProps<"/admin/techniciens/[id]/access">,
) {
  const adminTheme = getModuleTheme("admin");
  const auth = await getCurrentAuthContext();

  if (auth.configured && !auth.user) {
    redirect("/login");
  }

  const canManageOfficeAccess = hasOfficeModuleWriteAccess(auth, "office_access");
  const canManageTechnicianAccess = hasOfficeModuleWriteAccess(auth, "technicians_admin");

  if (!canManageOfficeAccess && !canManageTechnicianAccess) {
    redirect("/login");
  }

  const allowedModules = getReadableOfficeModules(auth);
  const activeSiteCode = await getActiveSiteCodeOrDefault();
  const { id } = await props.params;
  const [technician, account, technicians] = await Promise.all([
    getTechnicianById(id),
    getOfficeAccountByTechnicianId(id),
    getTechniciansForOfficeAccess(id, activeSiteCode),
  ]);

  if (!technician) {
    notFound();
  }

  const returnHref = `/admin/techniciens/${technician.id}`;
  const canUseLimitedTerrainAccess =
    !canManageOfficeAccess && (!account || !account.canAccessOfficeApp);

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${adminTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="admin"
          activeSiteCode={activeSiteCode}
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Configuration du compte de connexion lie au technicien et de son acces terrain."
          title={`Acces terrain · ${technician.displayName}`}
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-6 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur">
          <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              Compte technicien
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {technician.displayName}
            </h2>
            <p className="mt-3 max-w-[72ch] text-sm leading-7 text-slate-600">
              Cree ou mets a jour ici l&apos;acces de connexion du technicien, son role
              terrain et la remise a zero du mot de passe temporaire.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              NNI : {technician.nni} · Manager : {technician.managerName} · Etat de la fiche :{" "}
              {technician.active ? "Active" : "Inactive"}
            </p>
            {account ? (
              <p className="mt-3 text-sm text-slate-500">
                Compte actuel : {OFFICE_ACCOUNT_STATUS_LABELS[account.accountStatus]} · Bureau :{" "}
                {account.officeRole ? OFFICE_ROLE_LABELS[account.officeRole] : "Aucun"} · Terrain :{" "}
                {account.terrainRole ? TERRAIN_ROLE_LABELS[account.terrainRole] : "Aucun"}
              </p>
            ) : null}
          </div>

          {canManageOfficeAccess || canUseLimitedTerrainAccess ? (
            <div className="mt-6">
              <AccessForm
                account={account}
                allowOfficeAccessControls={canManageOfficeAccess}
                cancelHref={returnHref}
                cancelLabel="Retour a la fiche technicien"
                initialValues={{
                  accountStatus: "active",
                  canAccessOfficeApp: false,
                  canAccessTerrainApp: true,
                  fullName: technician.displayName,
                  loginIdentifier: technician.nni.toLowerCase(),
                  officeRole: null,
                  technicianId: technician.id,
                  terrainRole: "technician",
                }}
                lockTechnicianLink={!canManageOfficeAccess}
                managementScope="technician"
                mode={account ? "edit" : "create"}
                requiredTechnicianId={technician.id}
                showTerrainOnlyNotice={!canManageOfficeAccess}
                technicians={technicians}
              />
            </div>
          ) : null}

          {account && (canManageOfficeAccess || canUseLimitedTerrainAccess) ? (
            <>
              <div className="mt-6">
                <ResetPasswordForm accountId={account.id} />
              </div>

              <div className="mt-6">
                <AccessLifecycleActions
                  accountId={account.id}
                  accountStatus={account.accountStatus}
                  returnHref={returnHref}
                  returnLabel="Retour a la fiche technicien"
                />
              </div>
            </>
          ) : null}

          {account && !canManageOfficeAccess && account.canAccessOfficeApp ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-800">
              Ce compte possede aussi un acces bureau. Pour modifier ses droits bureau ou ses
              permissions modules, ouvre-le depuis le module <span className="font-semibold">Acces</span>.
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Link
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              href={returnHref}
            >
              Retour a la fiche technicien
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
