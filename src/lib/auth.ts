import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  canReadOfficeModule,
  canWriteOfficeModule,
  createEmptyOfficeModulePermissions,
  normalizeOfficeModulePermissions,
  type OfficeModuleKey,
  type OfficeModulePermissions,
  type OfficeRole,
  type TerrainRole,
} from "@/lib/office-access";
import { redirect } from "next/navigation";

const READABLE_OFFICE_MODULES_IN_ORDER = [
  "dashboard",
  "support_journee",
  "referent",
  "brief",
  "import_pdf",
  "technicians_admin",
  "office_access",
] as const satisfies readonly OfficeModuleKey[];

const OFFICE_MODULE_DEFAULT_PATHS: Record<OfficeModuleKey, string> = {
  dashboard: "/",
  support_journee: "/support",
  referent: "/referent",
  brief: "/brief",
  import_pdf: "/import-pdf",
  technicians_admin: "/admin/techniciens",
  office_access: "/admin/acces",
};

export type AuthUserRole = "admin" | "manager" | "agent" | null;

export type CurrentOfficeAccount = {
  id: string;
  email: string;
  fullName: string;
  technicianId: string | null;
  accountStatus: "active" | "inactive" | "suspended";
  firstLogin: boolean;
  passwordChanged: boolean;
  canAccessOfficeApp: boolean;
  canAccessTerrainApp: boolean;
  officeRole: OfficeRole | null;
  terrainRole: TerrainRole | null;
  modulePermissions: OfficeModulePermissions;
};

type OfficeAccountQueryRow = {
  id: string;
  email: string;
  full_name: string;
  technician_id: string | null;
  account_status: "active" | "inactive" | "suspended";
  first_login: boolean;
  password_changed: boolean;
  can_access_office_app: boolean;
  can_access_terrain_app: boolean;
  office_role: OfficeRole | null;
  terrain_role: TerrainRole | null;
  office_module_access:
    | { module_key: string; permission_level: string }[]
    | null;
};

function mapOfficeAccount(row: OfficeAccountQueryRow): CurrentOfficeAccount {
  const rawPermissions = Object.fromEntries(
    (row.office_module_access ?? []).map((item) => [item.module_key, item.permission_level]),
  );

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    technicianId: row.technician_id,
    accountStatus: row.account_status,
    firstLogin: row.first_login,
    passwordChanged: row.password_changed,
    canAccessOfficeApp: row.can_access_office_app,
    canAccessTerrainApp: row.can_access_terrain_app,
    officeRole: row.office_role,
    terrainRole: row.terrain_role,
    modulePermissions:
      (row.office_module_access?.length ?? 0) > 0
        ? normalizeOfficeModulePermissions(rawPermissions)
        : createEmptyOfficeModulePermissions(),
  };
}

export async function getCurrentAuthContext() {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      user: null,
      role: null as AuthUserRole,
      officeAccount: null as CurrentOfficeAccount | null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: true,
      user: null,
      role: null as AuthUserRole,
      officeAccount: null as CurrentOfficeAccount | null,
    };
  }

  const [{ data: userRoleRow }, { data: officeAccountRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("office_accounts")
      .select(
        "id, email, full_name, technician_id, account_status, first_login, password_changed, can_access_office_app, can_access_terrain_app, office_role, terrain_role, office_module_access(module_key, permission_level)",
      )
      .eq("auth_user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    configured: true,
    user,
    role: (userRoleRow?.role as AuthUserRole | undefined) ?? null,
    officeAccount: officeAccountRow ? mapOfficeAccount(officeAccountRow as OfficeAccountQueryRow) : null,
  };
}

export async function requireAdmin() {
  const auth = await getCurrentAuthContext();

  if (auth.configured && !auth.user) {
    redirect("/login");
  }

  if (auth.configured && auth.user && auth.role !== "admin") {
    redirect("/login");
  }

  return auth;
}

export async function requireAnyOfficeAccess() {
  const auth = await getCurrentAuthContext();

  if (auth.configured && !auth.user) {
    redirect("/login");
  }

  if (!auth.configured) {
    return auth;
  }

  if (auth.role === "admin") {
    return auth;
  }

  if (auth.officeAccount?.canAccessOfficeApp && !auth.officeAccount.passwordChanged) {
    redirect("/change-password");
  }

  if (
    !auth.officeAccount ||
    auth.officeAccount.accountStatus !== "active" ||
    !auth.officeAccount.canAccessOfficeApp
  ) {
    redirect("/login");
  }

  return auth;
}

export async function requireOfficeModule(moduleKey: OfficeModuleKey) {
  const auth = await getCurrentAuthContext();

  if (auth.configured && !auth.user) {
    redirect("/login");
  }

  if (!auth.configured) {
    return auth;
  }

  if (auth.role === "admin") {
    return auth;
  }

  if (auth.officeAccount?.canAccessOfficeApp && !auth.officeAccount.passwordChanged) {
    redirect("/change-password");
  }

  if (
    !auth.officeAccount ||
    auth.officeAccount.accountStatus !== "active" ||
    !auth.officeAccount.canAccessOfficeApp ||
    !canReadOfficeModule(auth.officeAccount.modulePermissions, moduleKey)
  ) {
    redirect("/login");
  }

  return auth;
}

export async function requireOfficeWriteModule(moduleKey: OfficeModuleKey) {
  const auth = await getCurrentAuthContext();

  if (auth.configured && !auth.user) {
    redirect("/login");
  }

  if (!auth.configured) {
    return auth;
  }

  if (auth.role === "admin") {
    return auth;
  }

  if (auth.officeAccount?.canAccessOfficeApp && !auth.officeAccount.passwordChanged) {
    redirect("/change-password");
  }

  if (
    !auth.officeAccount ||
    auth.officeAccount.accountStatus !== "active" ||
    !auth.officeAccount.canAccessOfficeApp ||
    !canWriteOfficeModule(auth.officeAccount.modulePermissions, moduleKey)
  ) {
    redirect("/login");
  }

  return auth;
}

export function getReadableOfficeModules(
  auth: Awaited<ReturnType<typeof getCurrentAuthContext>>,
): OfficeModuleKey[] {
  if (auth.role === "admin") {
    return [...READABLE_OFFICE_MODULES_IN_ORDER];
  }

  if (!auth.officeAccount || !auth.officeAccount.canAccessOfficeApp) {
    return [];
  }

  return READABLE_OFFICE_MODULES_IN_ORDER.filter((moduleKey) =>
    canReadOfficeModule(auth.officeAccount!.modulePermissions, moduleKey),
  );
}

export function getDefaultOfficePath(
  auth: Awaited<ReturnType<typeof getCurrentAuthContext>>,
): string | null {
  if (auth.role === "admin") {
    return "/";
  }

  const readableModules = getReadableOfficeModules(auth);
  const firstModule = readableModules[0];

  return firstModule ? OFFICE_MODULE_DEFAULT_PATHS[firstModule] : null;
}
