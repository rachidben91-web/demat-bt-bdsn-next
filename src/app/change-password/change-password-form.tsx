"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordFormState } from "@/app/change-password/actions";

const initialState: ChangePasswordFormState = {
  error: null,
  success: null,
};

function fieldClassName() {
  return "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400";
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-800" htmlFor="password">
          Nouveau mot de passe
        </label>
        <input className={fieldClassName()} id="password" name="password" type="password" />
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-slate-800"
          htmlFor="confirm_password"
        >
          Confirmation du mot de passe
        </label>
        <input
          className={fieldClassName()}
          id="confirm_password"
          name="confirm_password"
          type="password"
        />
      </div>

      <p className="text-sm leading-6 text-slate-500">
        Minimum 12 caracteres, avec au moins une minuscule, une majuscule, un chiffre
        et un caractere special.
      </p>

      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(37,99,235,0.28)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Mise a jour..." : "Changer le mot de passe"}
      </button>
    </form>
  );
}
