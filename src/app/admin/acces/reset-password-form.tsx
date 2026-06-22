"use client";

import { useActionState } from "react";
import {
  resetOfficePasswordAction,
  type CreateOfficeAccessFormState,
} from "@/app/admin/acces/actions";

const initialState: CreateOfficeAccessFormState = {
  error: null,
  success: null,
  temporaryPassword: null,
};

type ResetPasswordFormProps = {
  accountId: string;
  compact?: boolean;
};

export function ResetPasswordForm({ accountId, compact = false }: ResetPasswordFormProps) {
  const resetActionWithId = resetOfficePasswordAction.bind(null, accountId);
  const [state, formAction, pending] = useActionState(resetActionWithId, initialState);

  return (
    <form
      action={formAction}
      className={
        compact
          ? "rounded-2xl border border-slate-200 bg-white p-4"
          : "rounded-[26px] border border-slate-200 bg-slate-50 p-5"
      }
    >
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
        Reinitialisation du mot de passe
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Genere un nouveau mot de passe temporaire et force l&apos;utilisateur a le
        changer lors de sa prochaine connexion.
      </p>

      {state.error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-semibold">{state.success}</p>
          {state.temporaryPassword ? (
            <p className="mt-2">
              Mot de passe temporaire : <span className="font-mono font-semibold">{state.temporaryPassword}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        className={`mt-5 rounded-2xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70 ${
          compact
            ? "bg-blue-600 text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)]"
            : "border border-slate-200 bg-white text-slate-700"
        }`}
        disabled={pending}
        type="submit"
      >
        {pending ? "Reinitialisation..." : "Reinitialiser le mot de passe"}
      </button>
    </form>
  );
}
