import Link from "next/link";
import {
  TECHNICIAN_ROLE_OPTIONS,
  type ManagerOption,
  type TechnicianAdminRow,
} from "@/lib/admin-technicians";

type TechnicianFormProps = {
  action: (formData: FormData) => Promise<void>;
  managers: ManagerOption[];
  mode: "create" | "edit";
  technician?: TechnicianAdminRow | null;
};

function fieldClassName() {
  return "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400";
}

export function TechnicianForm({
  action,
  managers,
  mode,
  technician,
}: TechnicianFormProps) {
  return (
    <form action={action} className="space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
      {mode === "edit" && technician ? <input name="id" type="hidden" value={technician.id} /> : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          NNI
          <input
            className={fieldClassName()}
            defaultValue={technician?.nni ?? ""}
            name="nni"
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Manager
          <select
            className={fieldClassName()}
            defaultValue={technician?.managerId ?? ""}
            name="manager_id"
          >
            <option value="">Non assigne</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Prenom
          <input
            className={fieldClassName()}
            defaultValue={technician?.firstName ?? ""}
            name="first_name"
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Nom
          <input
            className={fieldClassName()}
            defaultValue={technician?.lastName ?? ""}
            name="last_name"
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Site
          <input
            className={fieldClassName()}
            defaultValue={technician?.site ?? "VLG"}
            name="site"
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Role
          <select
            className={fieldClassName()}
            defaultValue={technician?.role ?? TECHNICIAN_ROLE_OPTIONS[0]}
            name="role"
            required
          >
            {TECHNICIAN_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Couleur
          <input
            className={fieldClassName()}
            defaultValue={technician?.color ?? "#2563eb"}
            name="color"
            type="color"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Ordre d&apos;affichage
          <input
            className={fieldClassName()}
            defaultValue={technician?.sortOrder ?? 0}
            min={0}
            name="sort_order"
            type="number"
          />
        </label>
      </div>

      <div className="grid gap-3 rounded-[24px] bg-slate-50 p-5 sm:grid-cols-3">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input defaultChecked={technician?.ptc ?? false} name="ptc" type="checkbox" />
          PTC
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input defaultChecked={technician?.ptd ?? false} name="ptd" type="checkbox" />
          PTD
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <input defaultChecked={technician?.active ?? true} name="active" type="checkbox" />
          Actif
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
          type="submit"
        >
          {mode === "create" ? "Creer le technicien" : "Enregistrer les modifications"}
        </button>
        <Link
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          href="/admin/techniciens"
        >
          Retour a la liste
        </Link>
      </div>
    </form>
  );
}
