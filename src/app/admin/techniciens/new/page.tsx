import { AppShellHeader } from "@/components/app-shell-header";
import { createTechnicianAction } from "@/app/admin/techniciens/actions";
import { TechnicianForm } from "@/app/admin/techniciens/technician-form";
import { getManagerOptions } from "@/lib/admin-technicians";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";

export default async function NewTechnicianPage() {
  const adminTheme = getModuleTheme("admin");
  const auth = await requireOfficeModule("technicians_admin");
  const allowedModules = getReadableOfficeModules(auth);
  const managers = await getManagerOptions();

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${adminTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="admin"
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Creation d'une fiche technicien pour le referentiel metier."
          title="Nouveau technicien"
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6 lg:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              Admin
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
              Creer une fiche technicien
            </h2>
            <p className="mt-3 max-w-[64ch] text-base leading-7 text-slate-500">
              Renseigne le manager, le NNI, les attributs PTC/PTD et l&apos;ordre
              d&apos;affichage pour rendre le technicien disponible dans Support Journée.
            </p>
          </div>

          <TechnicianForm action={createTechnicianAction} managers={managers} mode="create" />
        </section>
      </div>
    </main>
  );
}
