import { deactivateTechnicianAction, updateTechnicianAction } from "@/app/admin/techniciens/actions";
import { ResetPasswordForm } from "@/app/admin/acces/reset-password-form";
import { TechnicianForm } from "@/app/admin/techniciens/technician-form";
import { AppShellHeader } from "@/components/app-shell-header";
import { getManagerOptions, getTechnicianById } from "@/lib/admin-technicians";
import { getOfficeAccountByTechnicianId } from "@/lib/admin-office-accounts";
import {
  getReadableOfficeModules,
  hasOfficeModuleWriteAccess,
  requireOfficeModule,
} from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import {
  OFFICE_ACCOUNT_STATUS_LABELS,
  TERRAIN_ROLE_LABELS,
} from "@/lib/office-access";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TechnicianDetailPage(
  props: PageProps<"/admin/techniciens/[id]">,
) {
  const adminTheme = getModuleTheme("admin");
  const auth = await requireOfficeModule("technicians_admin");
  const allowedModules = getReadableOfficeModules(auth);
  const activeSiteCode = await getActiveSiteCodeOrDefault();
  const { id } = await props.params;
  const canOpenAccessWorkspace =
    hasOfficeModuleWriteAccess(auth, "office_access") ||
    hasOfficeModuleWriteAccess(auth, "technicians_admin");
  const [managers, technician, linkedAccess] = await Promise.all([
    getManagerOptions(activeSiteCode),
    getTechnicianById(id),
    canOpenAccessWorkspace ? getOfficeAccountByTechnicianId(id) : Promise.resolve(null),
  ]);

  if (!technician) {
    notFound();
  }

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${adminTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="admin"
          activeSiteCode={activeSiteCode}
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Edition de la fiche technicien et des attributs utilises par les modules terrain."
          title={technician.displayName}
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Fiche technicien
              </p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                {technician.displayName}
              </h2>
              <p className="mt-3 max-w-[68ch] text-base leading-7 text-slate-500">
                Modifie le referentiel sans casser l&apos;historique. Si besoin, desactive le
                technicien plutot que de le supprimer.
              </p>
            </div>

            <form action={deactivateTechnicianAction}>
              <input name="id" type="hidden" value={technician.id} />
              <button
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-600"
                type="submit"
              >
                Desactiver le technicien
              </button>
            </form>
          </div>

          <TechnicianForm
            action={updateTechnicianAction}
            managers={managers}
            mode="edit"
            technician={technician}
          />

          <section className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Acces terrain
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Compte de connexion du technicien
                </h3>
                <p className="mt-3 max-w-[68ch] text-sm leading-7 text-slate-600">
                  Definis ici si ce technicien peut se connecter a l&apos;application Terrain,
                  avec quel role, et gere au besoin la remise a zero de son mot de passe.
                </p>
              </div>

              {canOpenAccessWorkspace ? (
                linkedAccess ? (
                  <ResetPasswordForm accountId={linkedAccess.id} compact />
                ) : (
                  <Link
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                    href={`/admin/techniciens/${technician.id}/access`}
                  >
                    Creer un acces terrain
                  </Link>
                )
              ) : null}
            </div>

            {canOpenAccessWorkspace ? (
              linkedAccess ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Email
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {linkedAccess.email}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Identifiant
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {linkedAccess.loginIdentifier ?? "Non defini"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Etat
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {OFFICE_ACCOUNT_STATUS_LABELS[linkedAccess.accountStatus]}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Role terrain
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {linkedAccess.terrainRole
                        ? TERRAIN_ROLE_LABELS[linkedAccess.terrainRole]
                        : "Aucun"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Mot de passe
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {linkedAccess.passwordChanged
                        ? "Deja personnalise"
                        : "Changement requis a la connexion"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/85 px-5 py-4 text-sm leading-7 text-slate-600">
                  Aucun compte de connexion n&apos;est encore rattache a ce technicien.
                </div>
              )
            ) : (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-800">
                La fiche technicien est visible, mais la gestion des acces terrain demande un
                droit d&apos;ecriture sur <span className="font-semibold">Admin tech</span> ou un
                acces au module <span className="font-semibold">Acces</span>.
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
