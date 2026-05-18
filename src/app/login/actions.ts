"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentAuthContext, getDefaultOfficePath } from "@/lib/auth";

export type LoginFormState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      error: "Email et mot de passe obligatoires.",
    };
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

  redirect(getDefaultOfficePath(auth) ?? "/");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
