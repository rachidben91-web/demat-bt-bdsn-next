"use client";

import { useActionState } from "react";
import { loginAction, type LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-800" htmlFor="email">
          Email
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[#e8e1d8] bg-[#f7f3ee] px-4 py-3.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#d83a2f] focus:bg-white"
          id="email"
          name="email"
          placeholder="prenom@dmt.vlg"
          type="email"
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
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-[#d83a2f] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(216,58,47,0.24)] transition hover:bg-[#c23126] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Connexion..." : "Se connecter"}
      </button>

      <p className="text-center text-sm text-slate-400">Mot de passe oublié ?</p>
    </form>
  );
}
