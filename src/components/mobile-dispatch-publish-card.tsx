"use client";

import { useActionState, useState } from "react";
import {
  publishMobileDispatchAction,
  type MobileDispatchActionState,
} from "@/app/actions/mobile-dispatch";
import type { MobileDispatchStatusSnapshot } from "@/lib/mobile-dispatch";

type MobileDispatchPublishCardProps = {
  btImportDayId: string | null;
  btPayload: Array<{
    btId: string;
    client: string;
    localisation: string;
    objet: string;
    pageStart: number;
  }>;
  missionDate: string;
  siteCode: string | null;
  dispatchStatuses?: MobileDispatchStatusSnapshot[];
  technicians: Array<{ id: string; label: string }>;
};

const initialState: MobileDispatchActionState = {
  error: null,
  success: null,
};

export function MobileDispatchPublishCard({
  btImportDayId,
  btPayload,
  dispatchStatuses = [],
  missionDate,
  siteCode,
  technicians,
}: MobileDispatchPublishCardProps) {
  const [departureInstruction, setDepartureInstruction] = useState("confirm");
  const [state, formAction, pending] = useActionState(
    publishMobileDispatchAction,
    initialState,
  );

  if (technicians.length === 0 || btPayload.length === 0) {
    return null;
  }

  const publishedCount = dispatchStatuses.length;
  const acknowledgedCount = dispatchStatuses.filter((status) => status.acknowledgedAt).length;
  const latestPublication = dispatchStatuses
    .map((status) => status.publishedAt)
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const latestAcknowledgement = dispatchStatuses
    .map((status) => status.acknowledgedAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  const formatTimestamp = (value: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));

  return (
    <form action={formAction} className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-3">
      <input name="bt_import_day_id" type="hidden" value={btImportDayId ?? ""} />
      <input name="mission_date" type="hidden" value={missionDate} />
      <input name="site_code" type="hidden" value={siteCode ?? ""} />
      <input name="technicians" type="hidden" value={JSON.stringify(technicians)} />
      <input name="bt_payload" type="hidden" value={JSON.stringify(btPayload)} />

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Publication mobile
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            Envoie ce groupe vers l&apos;application terrain avec une consigne de depart.
          </p>
        </div>

        {publishedCount > 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
            <p className="font-semibold">
              {acknowledgedCount === publishedCount
                ? `Accuse de reception recu pour ${acknowledgedCount} technicien(s).`
                : `Envoi mobile publie pour ${publishedCount} technicien(s).`}
            </p>
            <p className="mt-1 text-emerald-800/90">
              {latestPublication ? `Derniere publication le ${formatTimestamp(latestPublication)}.` : null}
              {latestPublication && latestAcknowledgement ? " " : null}
              {latestAcknowledgement
                ? `Dernier accuse recu le ${formatTimestamp(latestAcknowledgement)}.`
                : acknowledgedCount > 0
                  ? `${acknowledgedCount} technicien(s) ont confirme la reception.`
                  : "Aucun accuse de reception pour le moment."}
            </p>
          </div>
        ) : null}

        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 outline-none focus:border-violet-400"
          name="departure_instruction"
          onChange={(event) => setDepartureInstruction(event.target.value)}
          value={departureInstruction}
        >
          <option value="confirm">Depart a confirmer</option>
          <option value="agency">Passage agence obligatoire</option>
          <option value="direct">Depart direct autorise</option>
        </select>

        <button
          className="rounded-xl bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_12px_24px_rgba(139,92,246,0.22)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? "Publication..." : "Publier vers mobile"}
        </button>

        {state.error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
            {state.success}
          </p>
        ) : null}
      </div>
    </form>
  );
}
