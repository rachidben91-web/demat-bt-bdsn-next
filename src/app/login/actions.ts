"use server";

import { redirect } from "next/navigation";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { getCurrentAuthContext, getDefaultAppPath } from "@/lib/auth";

export type LoginFormState = {
  error: string | null;
  debugError?: string | null;
};

function getDebugErrorDetails(error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    name?: string;
    status?: number;
  };

  return [candidate.name, candidate.code, candidate.status, candidate.message]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .join(" | ");
}

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
      debugError: null,
    };
  }

  let email = rawIdentifier.toLowerCase();

  if (!rawIdentifier.includes("@")) {
    const adminSupabase = createServerSupabaseAdminClient();

    if (!adminSupabase) {
      return {
        error: "Client admin Supabase indisponible. Verifie la cle service role.",
        debugError:
          process.env.NODE_ENV !== "production"
            ? "Le client admin Supabase n'a pas pu etre initialise."
            : null,
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
        debugError:
          getDebugErrorDetails(accountError) ??
          "Aucun compte office_accounts ne correspond a cet identifiant.",
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
    console.error("Login failed", {
      code: error.code,
      identifier: rawIdentifier,
      message: error.message,
      status: error.status,
    });

    return {
      error: "Connexion impossible. Verifie tes identifiants.",
      debugError: getDebugErrorDetails(error),
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
