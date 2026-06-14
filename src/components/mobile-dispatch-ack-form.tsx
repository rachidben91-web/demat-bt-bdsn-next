"use client";

import { useActionState } from "react";
import {
  acknowledgeMobileDispatchAction,
  type MobileDispatchActionState,
} from "@/app/actions/mobile-dispatch";

const initialState: MobileDispatchActionState = {
  error: null,
  success: null,
};

type MobileDispatchAckFormProps = {
  acknowledgedAt: string | null;
  itemId: string;
  variant?: "light" | "dark";
};

export function MobileDispatchAckForm({
  acknowledgedAt,
  itemId,
  variant = "light",
}: MobileDispatchAckFormProps) {
  const [state, formAction, pending] = useActionState(
    acknowledgeMobileDispatchAction,
    initialState,
  );

  const successClassName =
    variant === "dark"
      ? "rounded-[18px] border border-emerald-400/20 bg-[#1b463b] px-4 py-3 text-sm text-[#d3fff0]"
      : "rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800";
  const buttonClassName =
    variant === "dark"
      ? "w-full rounded-[18px] border border-white/12 bg-[#2f2b27] px-5 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-[#37332f] disabled:cursor-not-allowed disabled:opacity-70"
      : "w-full rounded-[22px] bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(15,141,108,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(15,141,108,0.28)] disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <form action={formAction} className="mt-5">
      <input name="item_id" type="hidden" value={itemId} />

      {acknowledgedAt ? (
        <div className={successClassName}>Mission bien reçue.</div>
      ) : (
        <button
          className={buttonClassName}
          disabled={pending}
          type="submit"
        >
          {pending ? "Confirmation..." : "J'ai bien reçu ma journée"}
        </button>
      )}

      {state.error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success && !acknowledgedAt ? (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
