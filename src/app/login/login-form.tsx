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
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
          id="email"
          name="email"
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
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
          id="password"
          name="password"
          type="password"
        />
      </div>

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
        {pending ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
