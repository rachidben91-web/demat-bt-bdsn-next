"use server";

import { redirect } from "next/navigation";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";
import { getCurrentAuthContext } from "@/lib/auth";

export type ChangePasswordFormState = {
  error: string | null;
  success: string | null;
};

export async function changePasswordAction(
  _previousState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  const auth = await getCurrentAuthContext();

  if (!auth.user) {
    redirect("/login");
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!password || !confirmPassword) {
    return {
      error: "Renseigne et confirme le nouveau mot de passe.",
      success: null,
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Les deux mots de passe ne correspondent pas.",
      success: null,
    };
  }

  if (password.length < 12) {
    return {
      error: "Le mot de passe doit contenir au moins 12 caracteres.",
      success: null,
    };
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialCharacter = /[^a-zA-Z0-9]/.test(password);

  if (!hasLowercase || !hasUppercase || !hasDigit || !hasSpecialCharacter) {
    return {
      error:
        "Le mot de passe doit contenir une minuscule, une majuscule, un chiffre et un caractere special.",
      success: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const adminSupabase = createServerSupabaseAdminClient();
  const { error: authError } = await supabase.auth.updateUser({
    password,
  });

  if (authError) {
    return {
      error: authError.message,
      success: null,
    };
  }

  if (auth.officeAccount) {
    const accountUpdateClient = adminSupabase ?? supabase;
    const { error: accountError } = await accountUpdateClient
      .from("office_accounts")
      .update({
        password_changed: true,
        first_login: false,
      })
      .eq("id", auth.officeAccount.id);

    if (accountError) {
      return {
        error: accountError.message,
        success: null,
      };
    }
  }

  redirect("/");
}
