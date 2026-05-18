"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthContext, requireAdmin } from "@/lib/auth";
import {
  OFFICE_ACCOUNT_STATUS_OPTIONS,
  OFFICE_MODULE_KEYS,
  OFFICE_ROLE_OPTIONS,
  TERRAIN_ROLE_OPTIONS,
  isOfficePermissionLevel,
  type OfficeModuleKey,
  type OfficePermissionLevel,
  type OfficeRole,
  type TerrainRole,
} from "@/lib/office-access";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { buildTemporaryOfficePassword } from "@/lib/temporary-password";

export type CreateOfficeAccessFormState = {
  error: string | null;
  success: string | null;
  temporaryPassword: string | null;
};

function toRequiredString(value: FormDataEntryValue | null, fieldLabel: string) {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`${fieldLabel} obligatoire.`);
  }

  return text;
}

function toOptionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toBoolean(value: FormDataEntryValue | null) {
  return value === "on";
}

function normalizeOfficeRole(value: FormDataEntryValue | null): OfficeRole | null {
  const text = String(value ?? "").trim();
  return OFFICE_ROLE_OPTIONS.includes(text as OfficeRole) ? (text as OfficeRole) : null;
}

function normalizeTerrainRole(value: FormDataEntryValue | null): TerrainRole | null {
  const text = String(value ?? "").trim();
  return TERRAIN_ROLE_OPTIONS.includes(text as TerrainRole) ? (text as TerrainRole) : null;
}

function normalizeAccountStatus(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return OFFICE_ACCOUNT_STATUS_OPTIONS.includes(text as (typeof OFFICE_ACCOUNT_STATUS_OPTIONS)[number])
    ? text
    : "active";
}

function readPermissionLevel(
  formData: FormData,
  moduleKey: OfficeModuleKey,
): OfficePermissionLevel {
  const value = String(formData.get(`permission_${moduleKey}`) ?? "").trim();
  return isOfficePermissionLevel(value) ? value : "none";
}

export async function createOfficeAccessAction(
  _previousState: CreateOfficeAccessFormState,
  formData: FormData,
): Promise<CreateOfficeAccessFormState> {
  await requireAdmin();

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
      temporaryPassword: null,
    };
  }

  try {
    const fullName = toRequiredString(formData.get("full_name"), "Nom complet");
    const email = toRequiredString(formData.get("email"), "Email").toLowerCase();
    const technicianId = toOptionalString(formData.get("technician_id"));
    const officeRole = normalizeOfficeRole(formData.get("office_role"));
    const terrainRole = normalizeTerrainRole(formData.get("terrain_role"));
    const accountStatus = normalizeAccountStatus(formData.get("account_status"));
    const canAccessOfficeApp = toBoolean(formData.get("can_access_office_app"));
    const canAccessTerrainApp = toBoolean(formData.get("can_access_terrain_app"));

    if (!canAccessOfficeApp && !canAccessTerrainApp) {
      throw new Error("Active au moins un acces bureau ou terrain.");
    }

    if (canAccessOfficeApp && !officeRole) {
      throw new Error("Choisis un role bureau pour un acces bureau.");
    }

    if (canAccessTerrainApp && !terrainRole) {
      throw new Error("Choisis un role terrain pour un acces terrain.");
    }

    const modulePermissions = Object.fromEntries(
      OFFICE_MODULE_KEYS.map((moduleKey) => [
        moduleKey,
        canAccessOfficeApp ? readPermissionLevel(formData, moduleKey) : "none",
      ]),
    ) as Record<OfficeModuleKey, OfficePermissionLevel>;

    if (canAccessOfficeApp && !Object.values(modulePermissions).some((level) => level !== "none")) {
      throw new Error("Selectionne au moins un module bureau accessible.");
    }

    if (technicianId) {
      const { data: existingLink, error: existingLinkError } = await adminSupabase
        .from("office_accounts")
        .select("id")
        .eq("technician_id", technicianId)
        .maybeSingle();

      if (existingLinkError) {
        throw new Error(existingLinkError.message);
      }

      if (existingLink) {
        throw new Error("Ce technicien est deja lie a un autre acces.");
      }
    }

    const temporaryPassword = buildTemporaryOfficePassword(fullName);
    const { data: createdAuthUser, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (authError || !createdAuthUser.user) {
      throw new Error(authError?.message ?? "Creation du compte auth impossible.");
    }

    const authUserId = createdAuthUser.user.id;
    const { error: officeAccountError } = await adminSupabase
      .from("office_accounts")
      .insert({
        auth_user_id: authUserId,
        email,
        full_name: fullName,
        technician_id: technicianId,
        account_status: accountStatus,
        first_login: true,
        password_changed: false,
        can_access_office_app: canAccessOfficeApp,
        can_access_terrain_app: canAccessTerrainApp,
        office_role: officeRole,
        terrain_role: terrainRole,
      });

    if (officeAccountError) {
      await adminSupabase.auth.admin.deleteUser(authUserId);
      throw new Error(officeAccountError.message);
    }

    const { data: createdOfficeAccount, error: officeAccountLookupError } = await adminSupabase
      .from("office_accounts")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (officeAccountLookupError || !createdOfficeAccount) {
      await adminSupabase.auth.admin.deleteUser(authUserId);
      throw new Error(
        officeAccountLookupError?.message ?? "Compte cree mais introuvable apres insertion.",
      );
    }

    const moduleRows = canAccessOfficeApp
      ? OFFICE_MODULE_KEYS.map((moduleKey) => ({
          office_account_id: createdOfficeAccount.id,
          module_key: moduleKey,
          permission_level: modulePermissions[moduleKey],
        }))
      : [];

    if (moduleRows.length > 0) {
      const { error: moduleAccessError } = await adminSupabase
        .from("office_module_access")
        .insert(moduleRows);

      if (moduleAccessError) {
        await adminSupabase.from("office_accounts").delete().eq("id", createdOfficeAccount.id);
        await adminSupabase.auth.admin.deleteUser(authUserId);
        throw new Error(moduleAccessError.message);
      }
    }

    revalidatePath("/admin/acces");
    revalidatePath("/admin/acces/new");

    return {
      error: null,
      success: `Acces cree pour ${fullName}.`,
      temporaryPassword,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Creation de l'acces impossible.",
      success: null,
      temporaryPassword: null,
    };
  }
}

export async function updateOfficeAccessAction(
  _previousState: CreateOfficeAccessFormState,
  formData: FormData,
): Promise<CreateOfficeAccessFormState> {
  await requireAdmin();

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
      temporaryPassword: null,
    };
  }

  try {
    const officeAccountId = toRequiredString(formData.get("office_account_id"), "Compte");
    const authUserId = toRequiredString(formData.get("auth_user_id"), "Utilisateur Auth");
    const fullName = toRequiredString(formData.get("full_name"), "Nom complet");
    const email = toRequiredString(formData.get("email"), "Email").toLowerCase();
    const technicianId = toOptionalString(formData.get("technician_id"));
    const officeRole = normalizeOfficeRole(formData.get("office_role"));
    const terrainRole = normalizeTerrainRole(formData.get("terrain_role"));
    const accountStatus = normalizeAccountStatus(formData.get("account_status"));
    const canAccessOfficeApp = toBoolean(formData.get("can_access_office_app"));
    const canAccessTerrainApp = toBoolean(formData.get("can_access_terrain_app"));

    if (!canAccessOfficeApp && !canAccessTerrainApp) {
      throw new Error("Active au moins un acces bureau ou terrain.");
    }

    if (canAccessOfficeApp && !officeRole) {
      throw new Error("Choisis un role bureau pour un acces bureau.");
    }

    if (canAccessTerrainApp && !terrainRole) {
      throw new Error("Choisis un role terrain pour un acces terrain.");
    }

    if (technicianId) {
      const { data: existingLink, error: existingLinkError } = await adminSupabase
        .from("office_accounts")
        .select("id")
        .eq("technician_id", technicianId)
        .neq("id", officeAccountId)
        .maybeSingle();

      if (existingLinkError) {
        throw new Error(existingLinkError.message);
      }

      if (existingLink) {
        throw new Error("Ce technicien est deja lie a un autre acces.");
      }
    }

    const modulePermissions = Object.fromEntries(
      OFFICE_MODULE_KEYS.map((moduleKey) => [
        moduleKey,
        canAccessOfficeApp ? readPermissionLevel(formData, moduleKey) : "none",
      ]),
    ) as Record<OfficeModuleKey, OfficePermissionLevel>;

    if (canAccessOfficeApp && !Object.values(modulePermissions).some((level) => level !== "none")) {
      throw new Error("Selectionne au moins un module bureau accessible.");
    }

    const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(authUserId, {
      email,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authUpdateError) {
      throw new Error(authUpdateError.message);
    }

    const { error: officeAccountError } = await adminSupabase
      .from("office_accounts")
      .update({
        email,
        full_name: fullName,
        technician_id: technicianId,
        account_status: accountStatus,
        can_access_office_app: canAccessOfficeApp,
        can_access_terrain_app: canAccessTerrainApp,
        office_role: officeRole,
        terrain_role: terrainRole,
      })
      .eq("id", officeAccountId);

    if (officeAccountError) {
      throw new Error(officeAccountError.message);
    }

    const { error: deletePermissionsError } = await adminSupabase
      .from("office_module_access")
      .delete()
      .eq("office_account_id", officeAccountId);

    if (deletePermissionsError) {
      throw new Error(deletePermissionsError.message);
    }

    if (canAccessOfficeApp) {
      const moduleRows = OFFICE_MODULE_KEYS.map((moduleKey) => ({
        office_account_id: officeAccountId,
        module_key: moduleKey,
        permission_level: modulePermissions[moduleKey],
      }));

      const { error: insertPermissionsError } = await adminSupabase
        .from("office_module_access")
        .insert(moduleRows);

      if (insertPermissionsError) {
        throw new Error(insertPermissionsError.message);
      }
    }

    revalidatePath("/admin/acces");
    revalidatePath(`/admin/acces/${officeAccountId}`);

    return {
      error: null,
      success: `Acces mis a jour pour ${fullName}.`,
      temporaryPassword: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Mise a jour de l'acces impossible.",
      success: null,
      temporaryPassword: null,
    };
  }
}

export async function resetOfficePasswordAction(
  officeAccountId: string,
  _previousState: CreateOfficeAccessFormState,
): Promise<CreateOfficeAccessFormState> {
  await requireAdmin();
  void _previousState;

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
      temporaryPassword: null,
    };
  }

  try {
    const { data: account, error: accountError } = await adminSupabase
      .from("office_accounts")
      .select("id, auth_user_id, full_name")
      .eq("id", officeAccountId)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(accountError?.message ?? "Compte introuvable.");
    }

    const temporaryPassword = buildTemporaryOfficePassword(account.full_name);
    const { error: authError } = await adminSupabase.auth.admin.updateUserById(
      account.auth_user_id,
      {
        password: temporaryPassword,
      },
    );

    if (authError) {
      throw new Error(authError.message);
    }

    const { error: updateAccountError } = await adminSupabase
      .from("office_accounts")
      .update({
        first_login: true,
        password_changed: false,
      })
      .eq("id", officeAccountId);

    if (updateAccountError) {
      throw new Error(updateAccountError.message);
    }

    revalidatePath("/admin/acces");
    revalidatePath(`/admin/acces/${officeAccountId}`);

    return {
      error: null,
      success: "Mot de passe reinitialise. Le changement sera obligatoire a la prochaine connexion.",
      temporaryPassword,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Reinitialisation du mot de passe impossible.",
      success: null,
      temporaryPassword: null,
    };
  }
}

export async function deactivateOfficeAccessAction(
  officeAccountId: string,
  _previousState: CreateOfficeAccessFormState,
): Promise<CreateOfficeAccessFormState> {
  await requireAdmin();
  void _previousState;

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
      temporaryPassword: null,
    };
  }

  try {
    const auth = await getCurrentAuthContext();
    const { data: account, error: accountError } = await adminSupabase
      .from("office_accounts")
      .select("id, auth_user_id, full_name")
      .eq("id", officeAccountId)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(accountError?.message ?? "Compte introuvable.");
    }

    if (auth.user?.id === account.auth_user_id) {
      throw new Error("Tu ne peux pas desactiver ton propre acces.");
    }

    const { error: updateError } = await adminSupabase
      .from("office_accounts")
      .update({
        account_status: "inactive",
      })
      .eq("id", officeAccountId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/admin/acces");
    revalidatePath(`/admin/acces/${officeAccountId}`);

    return {
      error: null,
      success: `Acces desactive pour ${account.full_name}.`,
      temporaryPassword: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Desactivation de l'acces impossible.",
      success: null,
      temporaryPassword: null,
    };
  }
}

export async function reactivateOfficeAccessAction(
  officeAccountId: string,
  _previousState: CreateOfficeAccessFormState,
): Promise<CreateOfficeAccessFormState> {
  await requireAdmin();
  void _previousState;

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
      temporaryPassword: null,
    };
  }

  try {
    const { data: account, error: accountError } = await adminSupabase
      .from("office_accounts")
      .select("id, full_name")
      .eq("id", officeAccountId)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(accountError?.message ?? "Compte introuvable.");
    }

    const { error: updateError } = await adminSupabase
      .from("office_accounts")
      .update({
        account_status: "active",
      })
      .eq("id", officeAccountId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath("/admin/acces");
    revalidatePath(`/admin/acces/${officeAccountId}`);

    return {
      error: null,
      success: `Acces reactive pour ${account.full_name}.`,
      temporaryPassword: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Reactivation de l'acces impossible.",
      success: null,
      temporaryPassword: null,
    };
  }
}

export async function deleteOfficeAccessAction(
  officeAccountId: string,
  _previousState: CreateOfficeAccessFormState,
): Promise<CreateOfficeAccessFormState> {
  await requireAdmin();
  void _previousState;

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
      temporaryPassword: null,
    };
  }

  try {
    const auth = await getCurrentAuthContext();
    const { data: account, error: accountError } = await adminSupabase
      .from("office_accounts")
      .select("id, auth_user_id, full_name")
      .eq("id", officeAccountId)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(accountError?.message ?? "Compte introuvable.");
    }

    if (auth.user?.id === account.auth_user_id) {
      throw new Error("Tu ne peux pas supprimer ton propre acces.");
    }

    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(
      account.auth_user_id,
    );

    if (authDeleteError) {
      throw new Error(authDeleteError.message);
    }

    const { error: accountDeleteError } = await adminSupabase
      .from("office_accounts")
      .delete()
      .eq("id", officeAccountId);

    if (accountDeleteError) {
      throw new Error(accountDeleteError.message);
    }

    revalidatePath("/admin/acces");
    revalidatePath(`/admin/acces/${officeAccountId}`);

    return {
      error: null,
      success: `Acces supprime pour ${account.full_name}. Retourne a la liste des acces.`,
      temporaryPassword: null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Suppression de l'acces impossible.",
      success: null,
      temporaryPassword: null,
    };
  }
}
