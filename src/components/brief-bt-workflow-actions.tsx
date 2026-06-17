"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  reassignBriefBtAction,
  replaceBriefBtAction,
  validateBriefBtO2Action,
  type BriefBtWorkflowActionState,
} from "@/app/actions/brief";
import { getEffectiveTeam, isBtPendingO2, isBtSuperseded } from "@/lib/bt-workflow";
import type { ExtractedBt } from "@/lib/pdf-import/types";

type TechnicianOption = {
  id: string;
  label: string;
  nni: string;
  sourceLabel: string;
};

type ReplacementCandidate = {
  entryId: string;
  id: string;
  objet: string;
  pageStart: number;
};

type BriefBtWorkflowActionsProps = {
  bt: ExtractedBt;
  dense?: boolean;
  replacementCandidates: ReplacementCandidate[];
  technicians: TechnicianOption[];
};

const initialState: BriefBtWorkflowActionState = {
  error: null,
  success: null,
};

type FloatingPanelLayout = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

function normalizeKey(value: string) {
  return value.trim().toUpperCase();
}

function buildFloatingPanelLayout(button: HTMLButtonElement | null, desiredWidth: number) {
  if (!button) {
    return {
      left: 12,
      maxHeight: 420,
      top: 96,
      width: desiredWidth,
    } satisfies FloatingPanelLayout;
  }

  const rect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(desiredWidth, viewportWidth - 24);
  const left = Math.max(12, Math.min(rect.left, viewportWidth - width - 12));
  const availableBelow = viewportHeight - rect.bottom - 20;
  const availableAbove = rect.top - 20;
  const shouldOpenAbove = availableBelow < 260 && availableAbove > availableBelow;
  const maxHeight = Math.max(
    220,
    Math.min(520, shouldOpenAbove ? availableAbove - 12 : availableBelow - 8),
  );
  const top = shouldOpenAbove
    ? Math.max(12, rect.top - maxHeight - 12)
    : Math.min(rect.bottom + 8, viewportHeight - maxHeight - 12);

  return {
    left,
    maxHeight,
    top,
    width,
  } satisfies FloatingPanelLayout;
}

export function BriefBtWorkflowActions({
  bt,
  dense = false,
  replacementCandidates,
  technicians,
}: BriefBtWorkflowActionsProps) {
  const reassignButtonRef = useRef<HTMLButtonElement | null>(null);
  const reassignPanelRef = useRef<HTMLDivElement | null>(null);
  const replaceButtonRef = useRef<HTMLButtonElement | null>(null);
  const replacePanelRef = useRef<HTMLDivElement | null>(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [selectedReplacementId, setSelectedReplacementId] = useState("");
  const [reassignPanelLayout, setReassignPanelLayout] = useState<FloatingPanelLayout>({
    left: 0,
    maxHeight: 420,
    top: 0,
    width: 520,
  });
  const [replacePanelLayout, setReplacePanelLayout] = useState<FloatingPanelLayout>({
    left: 0,
    maxHeight: 360,
    top: 0,
    width: 480,
  });
  const [reassignState, reassignAction, reassignPending] = useActionState(
    reassignBriefBtAction,
    initialState,
  );
  const [validateState, validateAction, validatePending] = useActionState(
    validateBriefBtO2Action,
    initialState,
  );
  const [replaceState, replaceAction, replacePending] = useActionState(
    replaceBriefBtAction,
    initialState,
  );

  const selectedTechnicianIds = (() => {
    const effectiveTeam = getEffectiveTeam(bt);
    const technicianByKey = new Map(
      technicians.flatMap((technician) => [
        [normalizeKey(technician.nni), technician.id],
        [normalizeKey(technician.label), technician.id],
      ]),
    );

    return effectiveTeam
      .map((member) => technicianByKey.get(normalizeKey(member.nni || member.name || "")) ?? "")
      .filter(Boolean);
  })();

  const isSuperseded = isBtSuperseded(bt);
  const canValidateO2 = isBtPendingO2(bt) && !isSuperseded;
  const canReplace = bt.briefWorkflowStatus === "o2_validated" && !isSuperseded;

  useEffect(() => {
    if (!isReassignOpen && !isReplaceOpen) {
      return undefined;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        reassignPanelRef.current?.contains(target) ||
        reassignButtonRef.current?.contains(target) ||
        replacePanelRef.current?.contains(target) ||
        replaceButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsReassignOpen(false);
      setIsReplaceOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsReassignOpen(false);
        setIsReplaceOpen(false);
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isReassignOpen, isReplaceOpen]);

  function openReassignPanel() {
    setReplaceOpenState(false);
    setReassignPanelLayout(buildFloatingPanelLayout(reassignButtonRef.current, 560));
    setIsReassignOpen(true);
  }

  function setReplaceOpenState(nextValue: boolean) {
    setIsReplaceOpen(nextValue);

    if (!nextValue) {
      setSelectedReplacementId("");
    }
  }

  function openReplacePanel() {
    setIsReassignOpen(false);
    setReplacePanelLayout(buildFloatingPanelLayout(replaceButtonRef.current, 500));
    setReplaceOpenState(true);
  }

  return (
    <div className={dense ? "space-y-1.5" : "space-y-2"}>
      <div className={dense ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
        <button
          className={dense
            ? "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"}
          disabled={isSuperseded || technicians.length === 0}
          onClick={openReassignPanel}
          ref={reassignButtonRef}
          type="button"
        >
          Reaffecter
        </button>

        <form action={validateAction}>
          <input name="entry_id" type="hidden" value={bt.entryId ?? ""} />
          <button
            className={dense
              ? "rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"}
            disabled={!canValidateO2 || validatePending || !bt.entryId}
            type="submit"
          >
            {validatePending ? "Validation..." : "Valider O2"}
          </button>
        </form>

        <button
          className={dense
            ? "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            : "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"}
          disabled={!canReplace}
          onClick={openReplacePanel}
          ref={replaceButtonRef}
          type="button"
        >
          Remplacer BT
        </button>
      </div>

      {reassignState.success ? <p className={dense ? "text-[10px] text-emerald-700" : "text-[11px] text-emerald-700"}>{reassignState.success}</p> : null}
      {validateState.success ? <p className={dense ? "text-[10px] text-emerald-700" : "text-[11px] text-emerald-700"}>{validateState.success}</p> : null}
      {replaceState.success ? <p className={dense ? "text-[10px] text-emerald-700" : "text-[11px] text-emerald-700"}>{replaceState.success}</p> : null}
      {validateState.error ? <p className={dense ? "text-[10px] text-rose-700" : "text-[11px] text-rose-700"}>{validateState.error}</p> : null}

      {isReassignOpen ? (
        <div
          className="fixed z-50"
          ref={reassignPanelRef}
          style={{
            left: `${reassignPanelLayout.left}px`,
            top: `${reassignPanelLayout.top}px`,
            width: `${reassignPanelLayout.width}px`,
          }}
        >
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Reaffecter {bt.id}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Corrige l&apos;affectation locale puis place le BT en attente O2.
                </p>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                disabled={reassignPending}
                onClick={() => setIsReassignOpen(false)}
                type="button"
              >
                Fermer
              </button>
            </div>

            <form action={reassignAction} className="mt-5">
              <input name="entry_id" type="hidden" value={bt.entryId ?? ""} />

              <div
                className="grid gap-2 overflow-y-auto pr-1 sm:grid-cols-2"
                style={{ maxHeight: `${reassignPanelLayout.maxHeight}px` }}
              >
                {technicians.map((technician) => {
                  const isSelected = selectedTechnicianIds.includes(technician.id);

                  return (
                    <label
                      key={technician.id}
                      className={
                        isSelected
                          ? "flex cursor-pointer items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
                          : "flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                      }
                    >
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        defaultChecked={isSelected}
                        name="technician_ids"
                        type="checkbox"
                        value={technician.id}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{technician.label}</span>
                        <span className="block text-xs text-slate-500">{technician.sourceLabel}</span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {reassignState.error ? (
                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {reassignState.error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  disabled={reassignPending}
                  onClick={() => setIsReassignOpen(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={reassignPending || !bt.entryId}
                  type="submit"
                >
                  {reassignPending ? "Reaffectation..." : "Enregistrer la reaffectation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isReplaceOpen ? (
        <div
          className="fixed z-50"
          ref={replacePanelRef}
          style={{
            left: `${replacePanelLayout.left}px`,
            top: `${replacePanelLayout.top}px`,
            width: `${replacePanelLayout.width}px`,
          }}
        >
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Remplacer {bt.id}</h3>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">
                  Selectionne un BT unitaire actif pour remplacer ce BT et reprendre le flux referent.
                </p>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                disabled={replacePending}
                onClick={() => setReplaceOpenState(false)}
                type="button"
              >
                Fermer
              </button>
            </div>

            <form action={replaceAction} className="mt-5 space-y-4">
              <input name="entry_id" type="hidden" value={bt.entryId ?? ""} />
              <input name="replacement_entry_id" type="hidden" value={selectedReplacementId} />

              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400"
                onChange={(event) => setSelectedReplacementId(event.target.value)}
                value={selectedReplacementId}
              >
                <option value="">Choisir un BT unitaire</option>
                {replacementCandidates.map((candidate) => (
                  <option key={candidate.entryId} value={candidate.entryId}>
                    {candidate.id} - {candidate.objet || "Objet non reconnu"} - page {candidate.pageStart}
                  </option>
                ))}
              </select>

              {replacementCandidates.length === 0 ? (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Aucun BT unitaire actif disponible pour le remplacement.
                </p>
              ) : null}

              {replaceState.success ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {replaceState.success}
                </p>
              ) : null}

              {replaceState.error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {replaceState.error}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
                  disabled={replacePending}
                  onClick={() => setReplaceOpenState(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={replacePending || !bt.entryId || !selectedReplacementId}
                  type="submit"
                >
                  {replacePending ? "Remplacement..." : "Confirmer le remplacement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
