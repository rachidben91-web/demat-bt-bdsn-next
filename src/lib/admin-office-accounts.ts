import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { SiteCode } from "@/lib/site-options";
import {
  createEmptyOfficeModulePermissions,
  normalizeOfficeModulePermissions,
  type OfficeAccountAdminRow,
  type OfficeAccountRow,
  type OfficeModuleAccessRow,
} from "@/lib/office-access";

export type { OfficeAccountAdminRow } from "@/lib/office-access";

type OfficeAccountQueryRow = OfficeAccountRow & {
  technicians:
    | { display_name: string | null; site_code: string | null }
    | { display_name: string | null; site_code: string | null }[]
    | null;
  office_module_access:
    | { module_key: string; permission_level: string }[]
    | null;
};

function getTechnician(technicians: OfficeAccountQueryRow["technicians"]) {
  if (Array.isArray(technicians)) {
    return technicians[0] ?? null;
  }

  return technicians ?? null;
}

function mapModulePermissions(
  rows: OfficeAccountQueryRow["office_module_access"],
) {
  if (!rows?.length) {
    return createEmptyOfficeModulePermissions();
  }

  const permissionMap = Object.fromEntries(
    rows.map((row) => [row.module_key, row.permission_level]),
  );

  return normalizeOfficeModulePermissions(permissionMap);
}

function mapOfficeAccountRow(item: OfficeAccountQueryRow): OfficeAccountAdminRow {
  const technician = getTechnician(item.technicians);

  return {
    id: item.id,
    authUserId: item.auth_user_id,
    email: item.email,
    loginIdentifier: item.login_identifier,
    fullName: item.full_name,
    technicianId: item.technician_id,
    technicianDisplayName: technician?.display_name ?? null,
    technicianSiteCode: technician?.site_code ?? null,
    accountStatus: item.account_status,
    firstLogin: item.first_login,
    passwordChanged: item.password_changed,
    canAccessOfficeApp: item.can_access_office_app,
    canAccessTerrainApp: item.can_access_terrain_app,
    officeRole: item.office_role,
    terrainRole: item.terrain_role,
    modulePermissions: mapModulePermissions(item.office_module_access),
  };
}

export async function getOfficeAccounts(siteCode?: SiteCode): Promise<OfficeAccountAdminRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("office_accounts")
    .select(
      "id, auth_user_id, email, login_identifier, full_name, technician_id, account_status, first_login, password_changed, can_access_office_app, can_access_terrain_app, office_role, terrain_role, created_at, updated_at, technicians(display_name, site_code), office_module_access(module_key, permission_level)",
    )
    .order("full_name", { ascending: true });

  if (error) {
    return [];
  }

  const accounts = ((data ?? []) as OfficeAccountQueryRow[]).map(mapOfficeAccountRow);

  if (!siteCode) {
    return accounts;
  }

  return accounts.filter((account) => account.technicianSiteCode === siteCode);
}

export async function getOfficeAccountById(
  id: string,
): Promise<OfficeAccountAdminRow | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("office_accounts")
    .select(
      "id, auth_user_id, email, login_identifier, full_name, technician_id, account_status, first_login, password_changed, can_access_office_app, can_access_terrain_app, office_role, terrain_role, created_at, updated_at, technicians(display_name, site_code), office_module_access(module_key, permission_level)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOfficeAccountRow(data as OfficeAccountQueryRow);
}

export async function getOfficeAccountByTechnicianId(
  technicianId: string,
): Promise<OfficeAccountAdminRow | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("office_accounts")
    .select(
      "id, auth_user_id, email, login_identifier, full_name, technician_id, account_status, first_login, password_changed, can_access_office_app, can_access_terrain_app, office_role, terrain_role, created_at, updated_at, technicians(display_name, site_code), office_module_access(module_key, permission_level)",
    )
    .eq("technician_id", technicianId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapOfficeAccountRow(data as OfficeAccountQueryRow);
}

export async function getOfficeModuleAccessRows(
  officeAccountId: string,
): Promise<OfficeModuleAccessRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("office_module_access")
    .select("office_account_id, module_key, permission_level")
    .eq("office_account_id", officeAccountId)
    .order("module_key", { ascending: true });

  if (error) {
    return [];
  }

  return (data ?? []) as OfficeModuleAccessRow[];
}

type TechnicianCandidateRow = {
  id: string;
  display_name: string;
  nni: string;
  role: string;
  active: boolean;
};

export type TechnicianAccessCandidate = {
  id: string;
  displayName: string;
  nni: string;
  role: string;
  active: boolean;
};

export async function getTechniciansEligibleForOfficeAccess(siteCode?: SiteCode): Promise<
  TechnicianAccessCandidate[]
> {
  return getTechniciansForOfficeAccess(null, siteCode);
}

export async function getTechniciansForOfficeAccess(
  currentTechnicianId?: string | null,
  siteCode?: SiteCode,
): Promise<TechnicianAccessCandidate[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: technicians, error: techniciansError }, { data: linkedAccounts, error: linkedError }] =
    await Promise.all([
      supabase
        .from("technicians")
        .select("id, display_name, nni, role, active")
        .eq("site_code", siteCode ?? "VLG")
        .order("display_name", { ascending: true }),
      supabase
        .from("office_accounts")
        .select("technician_id")
        .not("technician_id", "is", null),
    ]);

  if (techniciansError || linkedError) {
    return [];
  }

  const linkedTechnicianIds = new Set(
    (linkedAccounts ?? [])
      .map((row) => row.technician_id)
      .filter((value): value is string => Boolean(value)),
  );

  return ((technicians ?? []) as TechnicianCandidateRow[])
    .filter(
      (technician) =>
        technician.id === currentTechnicianId || !linkedTechnicianIds.has(technician.id),
    )
    .map((technician) => ({
      id: technician.id,
      displayName: technician.display_name,
      nni: technician.nni,
      role: technician.role,
      active: technician.active,
    }));
}
