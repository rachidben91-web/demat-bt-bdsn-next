import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type ManagerOption = {
  id: string;
  name: string;
};

export const TECHNICIAN_ROLE_OPTIONS = [
  "Technicien gaz",
  "Referent technique",
  "Technicien travaux tiers",
  "Referent d'equipe",
] as const;

export type TechnicianAdminRow = {
  id: string;
  nni: string;
  lastName: string;
  firstName: string;
  displayName: string;
  managerId: string | null;
  managerName: string;
  site: string;
  role: string;
  color: string;
  ptc: boolean;
  ptd: boolean;
  sortOrder: number;
  active: boolean;
};

type ManagerRow = {
  id: string;
  name: string;
};

type TechnicianRow = {
  id: string;
  nni: string;
  last_name: string;
  first_name: string;
  display_name: string;
  manager_id: string | null;
  site: string;
  role: string;
  color: string | null;
  ptc: boolean;
  ptd: boolean;
  sort_order: number;
  active: boolean;
  managers: { name: string | null } | { name: string | null }[] | null;
};

function getManagerName(managers: TechnicianRow["managers"]) {
  if (Array.isArray(managers)) {
    return managers[0]?.name ?? "Non assigne";
  }

  return managers?.name ?? "Non assigne";
}

export async function getManagerOptions(): Promise<ManagerOption[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("managers")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return [];
  }

  return ((data ?? []) as ManagerRow[]).map((manager) => ({
    id: manager.id,
    name: manager.name,
  }));
}

export async function getTechnicianAdminRows(search?: string): Promise<TechnicianAdminRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("technicians")
    .select(
      "id, nni, last_name, first_name, display_name, manager_id, site, role, color, ptc, ptd, sort_order, active, managers(name)",
    )
    .order("sort_order", { ascending: true });

  const normalizedSearch = search?.trim();

  if (normalizedSearch) {
    query = query.or(
      `display_name.ilike.%${normalizedSearch}%,last_name.ilike.%${normalizedSearch}%,first_name.ilike.%${normalizedSearch}%,nni.ilike.%${normalizedSearch}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    return [];
  }

  return ((data ?? []) as TechnicianRow[]).map((item) => ({
    id: item.id,
    nni: item.nni,
    lastName: item.last_name,
    firstName: item.first_name,
    displayName: item.display_name,
    managerId: item.manager_id,
    managerName: getManagerName(item.managers),
    site: item.site,
    role: item.role,
    color: item.color ?? "#2563eb",
    ptc: item.ptc,
    ptd: item.ptd,
    sortOrder: item.sort_order,
    active: item.active,
  }));
}

export async function getTechnicianById(id: string): Promise<TechnicianAdminRow | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("technicians")
    .select(
      "id, nni, last_name, first_name, display_name, manager_id, site, role, color, ptc, ptd, sort_order, active, managers(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const item = data as TechnicianRow;

  return {
    id: item.id,
    nni: item.nni,
    lastName: item.last_name,
    firstName: item.first_name,
    displayName: item.display_name,
    managerId: item.manager_id,
    managerName: getManagerName(item.managers),
    site: item.site,
    role: item.role,
    color: item.color ?? "#2563eb",
    ptc: item.ptc,
    ptd: item.ptd,
    sortOrder: item.sort_order,
    active: item.active,
  };
}
