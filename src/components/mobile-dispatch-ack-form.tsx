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
};

export function MobileDispatchAckForm({
  acknowledgedAt,
  itemId,
}: MobileDispatchAckFormProps) {
  const [state, formAction, pending] = useActionState(
    acknowledgeMobileDispatchAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5">
      <input name="item_id" type="hidden" value={itemId} />

      {acknowledgedAt ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Journée bien reçue.
        </div>
      ) : (
        <button
          className="w-full rounded-[22px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(16,185,129,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
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
