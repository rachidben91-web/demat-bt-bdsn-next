import Link from "next/link";
import { AppShellHeader } from "@/components/app-shell-header";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getModuleTheme } from "@/lib/module-theme";
import { getTechnicianAdminRows } from "@/lib/admin-technicians";

function badgeClassName(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-500 border-slate-200";
}

const avatarToneClasses = [
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-cyan-100 text-cyan-700 border-cyan-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-rose-100 text-rose-700 border-rose-200",
] as const;

function getInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getAvatarTone(displayName: string) {
  const hash = Array.from(displayName).reduce((accumulator, character) => {
    return accumulator + character.charCodeAt(0);
  }, 0);

  return avatarToneClasses[hash % avatarToneClasses.length];
}

export default async function TechniciansAdminPage(
  props: PageProps<"/admin/techniciens">,
) {
  const adminTheme = getModuleTheme("admin");
  const auth = await requireOfficeModule("technicians_admin");
  const allowedModules = getReadableOfficeModules(auth);
  const searchParams = await props.searchParams;
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const technicians = await getTechnicianAdminRows(query);

  return (
    <main className={`min-h-screen px-4 py-4 text-slate-900 sm:px-6 lg:px-8 ${adminTheme.pageBackgroundClassName}`}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="admin"
          allowedModules={allowedModules}
          isSuperAdmin={auth.role === "admin"}
          role={auth.role ?? auth.officeAccount?.officeRole ?? null}
          subtitle="Gestion du referentiel techniciens, managers et attributs metier."
          title="Admin tech"
          userEmail={auth.user?.email ?? null}
        />

        <section className="mt-5 rounded-[30px] border border-white/80 bg-white/68 p-5 shadow-[0_26px_70px_rgba(148,163,184,0.16)] backdrop-blur sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                Module Admin tech
              </p>
              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Référentiel techniciens
              </h2>
              <p className="mt-3 max-w-[68ch] text-base leading-7 text-slate-500">
                Cree, modifie et desactive les techniciens directement dans l&apos;application,
                sans passer par l&apos;editeur Supabase.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                <p className="text-2xl font-semibold text-slate-950">{technicians.length}</p>
                <p className="mt-1 text-sm text-slate-500">techniciens charges</p>
              </div>
              <Link
                className="flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
                href="/admin/techniciens/new"
              >
                + Nouveau technicien
              </Link>
            </div>
          </div>

          <div className="mt-6 rounded-[26px] border border-slate-200/80 bg-white p-4 shadow-sm">
            <form className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <input
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                defaultValue={query}
                name="q"
                placeholder="Rechercher par nom, prenom ou NNI..."
              />
              <div className="flex gap-3">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                  type="submit"
                >
                  Filtrer
                </button>
                <Link
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-600"
                  href="/admin/techniciens"
                >
                  Reinitialiser
                </Link>
              </div>
            </form>
          </div>

          <section className="mt-5 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-sm">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[10%]" />
                  <col className="w-[16%]" />
                  <col className="w-[6%]" />
                  <col className="w-[15%]" />
                  <col className="w-[8%]" />
                  <col className="w-[6%]" />
                  <col className="w-[7%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="bg-[linear-gradient(90deg,#2d63da_0%,#3567e7_100%)] text-white">
                  <tr>
                    {["Technicien", "NNI", "Manager", "Site", "Rôle", "PTC/PTD", "Ordre", "État", "Action"].map(
                      (heading) => (
                        <th key={heading} className="px-4 py-4 text-left font-semibold">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {technicians.map((technician) => (
                    <tr key={technician.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold ${getAvatarTone(technician.displayName)}`}
                          >
                            {getInitials(technician.displayName)}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-950">{technician.displayName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{technician.nni}</td>
                      <td className="px-4 py-4 text-slate-600">{technician.managerName}</td>
                      <td className="px-4 py-4 text-slate-600">{technician.site}</td>
                      <td className="px-4 py-4 text-slate-600">{technician.role}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {technician.ptc ? "PTC" : "—"} / {technician.ptd ? "PTD" : "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{technician.sortOrder}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClassName(technician.active)}`}>
                          {technician.active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          href={`/admin/techniciens/${technician.id}`}
                        >
                          Modifier
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {technicians.length === 0 ? (
                    <tr>
                      <td className="px-4 py-10 text-center text-slate-500" colSpan={9}>
                        Aucun technicien trouve pour ce filtre.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
