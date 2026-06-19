export const OFFICE_ROLE_OPTIONS = [
  "admin",
  "manager",
  "team_lead",
  "viewer",
] as const;

export const TERRAIN_ROLE_OPTIONS = [
  "technician",
  "senior_technician",
] as const;

export const OFFICE_ACCOUNT_STATUS_OPTIONS = [
  "active",
  "inactive",
  "suspended",
] as const;

export const OFFICE_PERMISSION_LEVELS = [
  "none",
  "read",
  "write",
] as const;

export const OFFICE_MODULE_KEYS = [
  "dashboard",
  "support_journee",
  "referent",
  "brief",
  "import_pdf",
  "messagerie",
  "technicians_admin",
  "office_access",
] as const;

export const OFFICE_MODULE_META: Record<
  OfficeModuleKey,
  { label: string; description: string }
> = {
  dashboard: {
    label: "Dashboard",
    description: "Accueil bureau et point d'entree vers les modules disponibles.",
  },
  support_journee: {
    label: "Support Journée",
    description: "Pilotage quotidien de l'équipe terrain.",
  },
  referent: {
    label: "Référent",
    description: "Dispatch, affectation et préparation de l'envoi mobile.",
  },
  brief: {
    label: "Brief",
    description: "Lecture détaillée des BT, risques et documents d'origine.",
  },
  import_pdf: {
    label: "Import PDF",
    description: "Chargement du PDF journalier et préparation des BT du jour.",
  },
  messagerie: {
    label: "Messagerie",
    description: "Conversations bureau-terrain et suivi des messages d'equipe.",
  },
  technicians_admin: {
    label: "Admin tech",
    description: "Référentiel techniciens, managers et paramètres métier.",
  },
  office_access: {
    label: "Accès",
    description: "Comptes bureau, droits et liaison au terrain.",
  },
};

export type OfficeRole = (typeof OFFICE_ROLE_OPTIONS)[number];
export type TerrainRole = (typeof TERRAIN_ROLE_OPTIONS)[number];
export type OfficeAccountStatus = (typeof OFFICE_ACCOUNT_STATUS_OPTIONS)[number];
export type OfficePermissionLevel = (typeof OFFICE_PERMISSION_LEVELS)[number];
export type OfficeModuleKey = (typeof OFFICE_MODULE_KEYS)[number];

export type OfficeModulePermissions = Record<OfficeModuleKey, OfficePermissionLevel>;

export type OfficeAccountRow = {
  id: string;
  auth_user_id: string;
  email: string;
  login_identifier: string | null;
  full_name: string;
  technician_id: string | null;
  account_status: OfficeAccountStatus;
  first_login: boolean;
  password_changed: boolean;
  can_access_office_app: boolean;
  can_access_terrain_app: boolean;
  office_role: OfficeRole | null;
  terrain_role: TerrainRole | null;
  created_at: string;
  updated_at: string;
};

export type OfficeAccountAdminRow = {
  id: string;
  authUserId: string;
  email: string;
  loginIdentifier: string | null;
  fullName: string;
  technicianId: string | null;
  technicianDisplayName: string | null;
  technicianSiteCode: string | null;
  accountStatus: OfficeAccountStatus;
  firstLogin: boolean;
  passwordChanged: boolean;
  canAccessOfficeApp: boolean;
  canAccessTerrainApp: boolean;
  officeRole: OfficeRole | null;
  terrainRole: TerrainRole | null;
  modulePermissions: OfficeModulePermissions;
};

export type OfficeModuleAccessRow = {
  office_account_id: string;
  module_key: OfficeModuleKey;
  permission_level: OfficePermissionLevel;
};

export const OFFICE_ROLE_LABELS: Record<OfficeRole, string> = {
  admin: "Administrateur",
  manager: "Manager",
  team_lead: "Référent d'équipe",
  viewer: "Lecture seule",
};

export const TERRAIN_ROLE_LABELS: Record<TerrainRole, string> = {
  technician: "Technicien",
  senior_technician: "Technicien senior",
};

export const OFFICE_ACCOUNT_STATUS_LABELS: Record<OfficeAccountStatus, string> = {
  active: "Actif",
  inactive: "Inactif",
  suspended: "Suspendu",
};

export const OFFICE_PERMISSION_LEVEL_LABELS: Record<OfficePermissionLevel, string> = {
  none: "Aucun",
  read: "Lecture",
  write: "Ecriture",
};

export function isOfficeRole(value: string | null | undefined): value is OfficeRole {
  return OFFICE_ROLE_OPTIONS.includes(value as OfficeRole);
}

export function isTerrainRole(value: string | null | undefined): value is TerrainRole {
  return TERRAIN_ROLE_OPTIONS.includes(value as TerrainRole);
}

export function isOfficePermissionLevel(
  value: string | null | undefined,
): value is OfficePermissionLevel {
  return OFFICE_PERMISSION_LEVELS.includes(value as OfficePermissionLevel);
}

export function isOfficeModuleKey(value: string | null | undefined): value is OfficeModuleKey {
  return OFFICE_MODULE_KEYS.includes(value as OfficeModuleKey);
}

export function createEmptyOfficeModulePermissions(): OfficeModulePermissions {
  return {
    dashboard: "none",
    support_journee: "none",
    referent: "none",
    brief: "none",
    import_pdf: "none",
    messagerie: "none",
    technicians_admin: "none",
    office_access: "none",
  };
}

export function createRolePresetPermissions(
  role: OfficeRole | null,
): OfficeModulePermissions {
  if (role === "admin" || role === "manager") {
    return {
      dashboard: "write",
      support_journee: "write",
      referent: "write",
      brief: "write",
      import_pdf: "write",
      messagerie: "write",
      technicians_admin: "write",
      office_access: "write",
    };
  }

  if (role === "team_lead") {
    return {
      dashboard: "read",
      support_journee: "write",
      referent: "write",
      brief: "read",
      import_pdf: "none",
      messagerie: "write",
      technicians_admin: "read",
      office_access: "none",
    };
  }

  if (role === "viewer") {
    return {
      dashboard: "read",
      support_journee: "read",
      referent: "read",
      brief: "read",
      import_pdf: "none",
      messagerie: "read",
      technicians_admin: "read",
      office_access: "none",
    };
  }

  return createEmptyOfficeModulePermissions();
}

export function normalizeOfficeModulePermissions(
  input: Partial<Record<string, string | null | undefined>>,
): OfficeModulePermissions {
  const normalized = createEmptyOfficeModulePermissions();
  const legacySupportPermission = isOfficePermissionLevel(input.support_journee)
    ? input.support_journee
    : "none";

  for (const moduleKey of OFFICE_MODULE_KEYS) {
    const value = input[moduleKey];

    if (isOfficePermissionLevel(value)) {
      normalized[moduleKey] = value;
      continue;
    }

    if (
      (moduleKey === "dashboard" ||
        moduleKey === "referent" ||
        moduleKey === "brief" ||
        moduleKey === "import_pdf" ||
        moduleKey === "messagerie") &&
      legacySupportPermission !== "none"
    ) {
      normalized[moduleKey] = legacySupportPermission;
      continue;
    }

    normalized[moduleKey] = "none";
  }

  return normalized;
}

export function canReadOfficeModule(
  permissions: OfficeModulePermissions,
  moduleKey: OfficeModuleKey,
): boolean {
  const level = permissions[moduleKey];
  return level === "read" || level === "write";
}

export function canWriteOfficeModule(
  permissions: OfficeModulePermissions,
  moduleKey: OfficeModuleKey,
): boolean {
  return permissions[moduleKey] === "write";
}

export function hasAnyOfficeModuleAccess(permissions: OfficeModulePermissions): boolean {
  return OFFICE_MODULE_KEYS.some((moduleKey) => permissions[moduleKey] !== "none");
}
