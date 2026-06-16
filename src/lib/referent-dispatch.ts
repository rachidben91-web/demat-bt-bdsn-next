import type { ExtractedBt } from "@/lib/pdf-import/types";
import {
  getUniqueTeamMembers as getWorkflowUniqueTeamMembers,
  isBtPendingO2,
  isBtSuperseded,
} from "@/lib/bt-workflow";

export type DispatchStatus = "unassigned" | "assigned" | "review" | "blocked" | "ready";

const REQUIRED_PREPARATION_FIELDS = [
  { key: "objet", label: "objet" },
  { key: "client", label: "client" },
  { key: "localisation", label: "localisation" },
] as const satisfies ReadonlyArray<{
  key: keyof ExtractedBt;
  label: string;
}>;

function compactText(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export const getUniqueTeamMembers = getWorkflowUniqueTeamMembers;

export function getBtPreparationIssues(bt: ExtractedBt) {
  const issues: string[] = [];
  const teamMembers = getUniqueTeamMembers(bt);

  if (isBtSuperseded(bt)) {
    issues.push("BT remplace. Utiliser la version active avant publication mobile.");
  }

  if (isBtPendingO2(bt)) {
    issues.push("Reaffectation en attente de validation O2.");
  }

  if (teamMembers.length === 0) {
    issues.push("Aucune affectation definie.");
  }

  const missingFields = REQUIRED_PREPARATION_FIELDS.filter(
    (field) => !compactText(String(bt[field.key] ?? "")),
  );

  if (missingFields.length > 0) {
    issues.push(`Champs a completer : ${missingFields.map((field) => field.label).join(", ")}.`);
  }

  return issues;
}

export function canPrepareBtForMobile(bt: ExtractedBt) {
  return getBtPreparationIssues(bt).length === 0;
}

export function getDispatchStatus(bt: ExtractedBt): DispatchStatus {
  if (isBtPendingO2(bt)) {
    return "blocked";
  }

  const teamMembers = getUniqueTeamMembers(bt);

  if (teamMembers.length === 0) {
    return "unassigned";
  }

  const canPrepare = canPrepareBtForMobile(bt);

  if (bt.mobileReady && canPrepare) {
    return "ready";
  }

  if (!canPrepare) {
    return "review";
  }

  return "assigned";
}
