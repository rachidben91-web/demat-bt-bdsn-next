import Link from "next/link";
import { AppShellHeader } from "@/components/app-shell-header";
import { AccessForm } from "@/app/admin/acces/access-form";
import { getTechniciansEligibleForOfficeAccess } from "@/lib/admin-office-accounts";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";

export default async function NewAdminAccessPage() {
  const accessTheme = getModuleTheme("access");
  const auth = await requireOfficeModule("office_access");
  const allowedModules = getReadableOfficeModules(auth);
  const technicians = await getTechniciansEligibleForOfficeAccess();

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${accessTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="access"
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Preparation du formulaire de creation d'un acces bureau ou mixte."
          title="Nouvel acces"
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-6 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur">
          <div className="mb-6 flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              Creation d&apos;un acces
            </p>
            <p className="max-w-[72ch] text-sm leading-7 text-slate-600">
              Tu peux creer un compte externe ou le lier a un technicien existant.
              Le mot de passe temporaire sera affiche apres creation pour que tu puisses
              le transmettre au referent.
            </p>
            <p className="text-sm text-slate-500">
              Techniciens encore libres pour une liaison : {technicians.length}
            </p>
          </div>

          <AccessForm technicians={technicians} />

          <div className="mt-6">
            <Link
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              href="/admin/acces"
            >
              Revenir a la liste des acces
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
