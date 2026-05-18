"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  deactivateOfficeAccessAction,
  deleteOfficeAccessAction,
  reactivateOfficeAccessAction,
  type CreateOfficeAccessFormState,
} from "@/app/admin/acces/actions";
import type { OfficeAccountStatus } from "@/lib/office-access";

const initialState: CreateOfficeAccessFormState = {
  error: null,
  success: null,
  temporaryPassword: null,
};

type AccessLifecycleActionsProps = {
  accountId: string;
  accountStatus: OfficeAccountStatus;
  returnHref?: string;
  returnLabel?: string;
};

function Feedback({
  state,
}: {
  state: CreateOfficeAccessFormState;
}) {
  if (state.error) {
    return (
      <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {state.success}
      </p>
    );
  }

  return null;
}

export function AccessLifecycleActions({
  accountId,
  accountStatus,
  returnHref = "/admin/acces",
  returnLabel = "Retour a la liste",
}: AccessLifecycleActionsProps) {
  const deactivateWithId = deactivateOfficeAccessAction.bind(null, accountId);
  const reactivateWithId = reactivateOfficeAccessAction.bind(null, accountId);
  const deleteWithId = deleteOfficeAccessAction.bind(null, accountId);

  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateWithId,
    initialState,
  );
  const [reactivateState, reactivateAction, reactivatePending] = useActionState(
    reactivateWithId,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteWithId,
    initialState,
  );

  return (
    <section className="rounded-[26px] border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
        Gestion du compte
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        Desactive temporairement l&apos;acces, reactive-le si besoin, ou supprime
        definitivement le compte.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {accountStatus === "active" ? (
          <form action={deactivateAction}>
            <button
              className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={deactivatePending}
              type="submit"
            >
              {deactivatePending ? "Desactivation..." : "Desactiver l'acces"}
            </button>
          </form>
        ) : (
          <form action={reactivateAction}>
            <button
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={reactivatePending}
              type="submit"
            >
              {reactivatePending ? "Reactivation..." : "Reactiver l'acces"}
            </button>
          </form>
        )}

        <form action={deleteAction}>
          <button
            className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={deletePending}
            type="submit"
          >
            {deletePending ? "Suppression..." : "Supprimer l'acces"}
          </button>
        </form>

        <Link
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          href={returnHref}
        >
          {returnLabel}
        </Link>
      </div>

      <Feedback state={deactivateState} />
      <Feedback state={reactivateState} />
      <Feedback state={deleteState} />
    </section>
  );
}
