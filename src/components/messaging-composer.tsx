"use client";

import { Paperclip, Send, UsersRound } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  sendOfficeMessageAction,
  type MessagingActionState,
} from "@/app/actions/messaging";
import type { MessagingTechnicianTarget, MessagingTargetType } from "@/lib/messaging";

type MessagingComposerProps = {
  sites: string[];
  technicians: MessagingTechnicianTarget[];
};

const initialState: MessagingActionState = {
  error: null,
  success: null,
};

export function MessagingComposer({ sites, technicians }: MessagingComposerProps) {
  const [state, formAction, pending] = useActionState(sendOfficeMessageAction, initialState);
  const [targetType, setTargetType] = useState<MessagingTargetType>("agency");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedAttachmentName, setSelectedAttachmentName] = useState<string | null>(null);
  const [selectedAttachmentSizeLabel, setSelectedAttachmentSizeLabel] = useState<string | null>(null);

  const managerOptions = useMemo(() => {
    const uniqueManagers = new Map<string, string>();

    technicians.forEach((technician) => {
      if (technician.managerId && technician.managerName) {
        uniqueManagers.set(technician.managerId, technician.managerName);
      }
    });

    return [...uniqueManagers.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name, "fr"));
  }, [technicians]);

  const selectedManagerName =
    managerOptions.find((manager) => manager.id === selectedManagerId)?.name ?? "";

  const visibleTechnicians = useMemo(() => {
    let filteredTechnicians = technicians;

    if (targetType === "manager" && selectedManagerId) {
      filteredTechnicians = filteredTechnicians.filter(
        (technician) => technician.managerId === selectedManagerId,
      );
    }

    if (targetType === "manager" && selectedSite) {
      filteredTechnicians = filteredTechnicians.filter(
        (technician) => technician.site === selectedSite,
      );
    }

    return filteredTechnicians;
  }, [selectedManagerId, selectedSite, targetType, technicians]);

  function formatFileSize(size: number) {
    if (size < 1024) {
      return `${size} o`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} Ko`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
  }

  return (
    <form
      action={formAction}
      className="rounded-[24px] border border-teal-100 bg-teal-50/80 p-4"
    >
      <input name="target_type" type="hidden" value={targetType} />
      <input name="target_manager_id" type="hidden" value={selectedManagerId} />
      <input
        name="target_manager_name"
        type="hidden"
        value={selectedManagerName}
      />
      <input name="target_site" type="hidden" value={selectedSite} />

      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-[0_14px_28px_rgba(13,148,136,0.20)]">
          <Send className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Composer
          </p>
          <p className="mt-2 text-sm leading-6 text-teal-950">
            Envoie une consigne a toute l&apos;agence, a un site, a un manager ou a un technicien precis.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-teal-200 bg-white p-1 text-xs font-semibold text-slate-600">
        {[
          { label: "Agence", value: "agency" },
          { label: "Manager", value: "manager" },
          { label: "Technicien", value: "technician" },
        ].map((item) => (
          <button
            className={`rounded-xl px-2 py-2 transition ${
              targetType === item.value ? "bg-teal-600 text-white shadow-sm" : "hover:bg-teal-50"
            }`}
            key={item.value}
            onClick={() => setTargetType(item.value as MessagingTargetType)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      {targetType === "agency" ? (
        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Portee agence
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
            onChange={(event) => setSelectedSite(event.target.value)}
            value={selectedSite}
          >
            <option value="">Toute l&apos;agence</option>
            {sites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {targetType === "manager" ? (
        <>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Filtre site
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
              onChange={(event) => setSelectedSite(event.target.value)}
              value={selectedSite}
            >
              <option value="">Tous les sites</option>
              {sites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Manager
            <select
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
              onChange={(event) => setSelectedManagerId(event.target.value)}
              value={selectedManagerId}
            >
              <option value="">Selectionner un manager</option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {targetType === "technician" ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <UsersRound className="h-4 w-4" />
            Techniciens
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
            {visibleTechnicians.map((technician) => (
              <label
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
                key={technician.id}
              >
                <input
                  className="h-4 w-4 accent-teal-600"
                  name="technician_id"
                  type="checkbox"
                  value={technician.id}
                />
                <span className="min-w-0 flex-1 truncate">{technician.name}</span>
                {technician.site ? (
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {technician.site}
                  </span>
                ) : null}
              </label>
            ))}
            {visibleTechnicians.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Aucun technicien disponible sur cette cible.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {targetType === "manager" ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <UsersRound className="h-4 w-4" />
            Techniciens concernes
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
            {visibleTechnicians.map((technician) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-700"
                key={technician.id}
              >
                <span className="min-w-0 flex-1 truncate">{technician.name}</span>
                {technician.site ? (
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {technician.site}
                  </span>
                ) : null}
              </div>
            ))}
            {visibleTechnicians.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Aucun technicien disponible pour ce manager.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {targetType === "agency" ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <UsersRound className="h-4 w-4" />
            Techniciens concernes
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {selectedSite
              ? `Le message sera envoye a tous les techniciens du site ${selectedSite}.`
              : "Le message sera envoye a tous les techniciens avec acces terrain, tous sites confondus."}
          </p>
        </div>
      ) : null}

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Objet
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
          maxLength={120}
          name="title"
          placeholder="Ex. Vigilance chaleur"
          required
        />
      </label>

      <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Message
        <textarea
          className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
          name="body"
          placeholder="Attention, pensez a bien boire de l'eau car il fait chaud..."
          required
        />
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Envoi programme
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
            name="publish_at"
            type="datetime-local"
          />
        </label>

        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Visible a partir du
          <input
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
            name="valid_from"
            type="datetime-local"
          />
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Visible jusqu&apos;au
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-teal-400"
          name="valid_until"
          type="datetime-local"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-teal-200 bg-white px-3 py-3 text-sm font-medium text-slate-600">
        <Paperclip className="h-4 w-4 text-teal-700" />
        <span className="min-w-0 flex-1 truncate">
          {selectedAttachmentName ?? "Ajouter une piece jointe"}
        </span>
        <input
          className="sr-only"
          name="attachment"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setSelectedAttachmentName(file?.name ?? null);
            setSelectedAttachmentSizeLabel(file ? formatFileSize(file.size) : null);
          }}
          type="file"
        />
      </label>

      {selectedAttachmentName ? (
        <p className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Piece jointe selectionnee : {selectedAttachmentName}
          {selectedAttachmentSizeLabel ? ` (${selectedAttachmentSizeLabel})` : ""}
        </p>
      ) : null}

      <button
        className="mt-4 w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(13,148,136,0.20)] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Envoi en cours..." : "Envoyer le message"}
      </button>

      {state.error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
