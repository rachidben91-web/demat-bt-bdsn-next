"use server";

import { redirect } from "next/navigation";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { getCurrentAuthContext, getDefaultAppPath } from "@/lib/auth";

export type LoginFormState = {
  error: string | null;
};

async function handleLogin(
  _previousState: LoginFormState,
  formData: FormData,
  fallbackRedirect: string,
): Promise<LoginFormState> {
  const rawIdentifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!rawIdentifier || !password) {
    return {
      error: "Identifiant et mot de passe obligatoires.",
    };
  }

  let email = rawIdentifier.toLowerCase();

  if (!rawIdentifier.includes("@")) {
    const adminSupabase = createServerSupabaseAdminClient();

    if (!adminSupabase) {
      return {
        error: "Client admin Supabase indisponible. Verifie la cle service role.",
      };
    }

    const { data: account, error: accountError } = await adminSupabase
      .from("office_accounts")
      .select("email")
      .eq("login_identifier", rawIdentifier.toLowerCase())
      .maybeSingle();

    if (accountError || !account?.email) {
      return {
        error: "Connexion impossible. Verifie tes identifiants.",
      };
    }

    email = account.email.toLowerCase();
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Connexion impossible. Verifie tes identifiants.",
    };
  }

  const auth = await getCurrentAuthContext();

  if (auth.officeAccount?.canAccessOfficeApp && !auth.officeAccount.passwordChanged) {
    redirect("/change-password");
  }

  redirect(getDefaultAppPath(auth) ?? fallbackRedirect);
}

export async function loginAction(
  previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  return handleLogin(previousState, formData, "/login");
}

export async function terrainLoginAction(
  previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  return handleLogin(previousState, formData, "/terrain/login");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function terrainLogoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/terrain/login");
}
