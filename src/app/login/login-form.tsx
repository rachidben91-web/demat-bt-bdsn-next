"use client";

import { useActionState } from "react";
import {
  loginAction,
  terrainLoginAction,
  type LoginFormState,
} from "@/app/login/actions";

type LoginFormProps = {
  submitLabel?: string;
  variant?: "office" | "terrain";
};

const initialState: LoginFormState = {
  error: null,
  debugError: null,
};

export function LoginForm({
  submitLabel = "Se connecter",
  variant = "office",
}: LoginFormProps) {
  const action = variant === "terrain" ? terrainLoginAction : loginAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-800" htmlFor="identifier">
          Email ou identifiant
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[#e8e1d8] bg-[#f7f3ee] px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d83a2f] focus:bg-white"
          id="identifier"
          name="identifier"
          placeholder="prenom@dmt.vlg ou h26975"
          type="text"
        />
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-slate-800"
          htmlFor="password"
        >
          Mot de passe
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[#e8e1d8] bg-[#f7f3ee] px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d83a2f] focus:bg-white"
          id="password"
          name="password"
          placeholder="Mot de passe"
          type="password"
        />
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p>{state.error}</p>
          {state.debugError ? (
            <p className="mt-2 break-words font-mono text-xs text-rose-900/85">
              Détail dev : {state.debugError}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        className="w-full rounded-2xl bg-[#d83a2f] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(216,58,47,0.24)] transition hover:bg-[#c23126] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Connexion..." : submitLabel}
      </button>

      <p className="text-center text-sm text-slate-400">Mot de passe oublié ?</p>
    </form>
  );
}
