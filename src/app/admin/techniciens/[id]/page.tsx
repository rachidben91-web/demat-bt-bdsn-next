import { deactivateTechnicianAction, updateTechnicianAction } from "@/app/admin/techniciens/actions";
import { TechnicianForm } from "@/app/admin/techniciens/technician-form";
import { AppShellHeader } from "@/components/app-shell-header";
import { getManagerOptions, getTechnicianById } from "@/lib/admin-technicians";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { notFound } from "next/navigation";

export default async function TechnicianDetailPage(
  props: PageProps<"/admin/techniciens/[id]">,
) {
  const adminTheme = getModuleTheme("admin");
  const auth = await requireOfficeModule("technicians_admin");
  const allowedModules = getReadableOfficeModules(auth);
  const { id } = await props.params;
  const [managers, technician] = await Promise.all([
    getManagerOptions(),
    getTechnicianById(id),
  ]);

  if (!technician) {
    notFound();
  }

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${adminTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="admin"
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
        </section>
      </div>
    </main>
  );
}
