"use client";

import { useActionState } from "react";
import {
  prepareBtForMobileAction,
  type ReferentBtPreparationActionState,
} from "@/app/actions/referent";

type ReferentPrepareBtButtonProps = {
  btId: string;
  btImportDayId: string | null;
  canPrepare: boolean;
  isPrepared: boolean;
  pageStart: number;
};

const initialState: ReferentBtPreparationActionState = {
  error: null,
  success: null,
};

export function ReferentPrepareBtButton({
  btId,
  btImportDayId,
  canPrepare,
  isPrepared,
  pageStart,
}: ReferentPrepareBtButtonProps) {
  const [state, formAction, pending] = useActionState(prepareBtForMobileAction, initialState);
  const isDisabled = pending || isPrepared || !btImportDayId || !canPrepare;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input name="import_day_id" type="hidden" value={btImportDayId ?? ""} />
      <input name="bt_id" type="hidden" value={btId} />
      <input name="page_start" type="hidden" value={String(pageStart)} />

      <button
        className={
          isPrepared
            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700"
            : "rounded-xl bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        }
        disabled={isDisabled}
        type="submit"
      >
        {isPrepared ? "Prêt mobile" : pending ? "Préparation..." : "Préparer l'envoi"}
      </button>

      {state.error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
