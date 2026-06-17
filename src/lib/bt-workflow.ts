import type { ExtractedBt, ExtractedTeamMember } from "@/lib/pdf-import/types";

function getUniqueTeamMembersFromTeam(team: ExtractedTeamMember[]) {
  const members = new Map<string, string>();

  for (const member of team) {
    const label = (member.name || member.nni || "").trim();

    if (!label) {
      continue;
    }

    const key = (member.nni || label).trim().toUpperCase();

    if (!members.has(key)) {
      members.set(key, label);
    }
  }

  return [...members.entries()].map(([key, label]) => ({ key, label }));
}

export function getEffectiveTeam(bt: ExtractedBt): ExtractedTeamMember[] {
  if (Array.isArray(bt.teamOverride) && bt.teamOverride.length > 0) {
    return bt.teamOverride;
  }

  return bt.team;
}

export function hasTeamOverride(bt: ExtractedBt) {
  return Array.isArray(bt.teamOverride) && bt.teamOverride.length > 0;
}

export function getUniqueTeamMembers(bt: ExtractedBt) {
  return getUniqueTeamMembersFromTeam(getEffectiveTeam(bt));
}

export function getOriginalTeamMembers(bt: ExtractedBt) {
  if (Array.isArray(bt.replacementSourceTeam) && bt.replacementSourceTeam.length > 0) {
    return getUniqueTeamMembersFromTeam(bt.replacementSourceTeam);
  }

  return getUniqueTeamMembersFromTeam(bt.team);
}

export function isBtPendingO2(bt: ExtractedBt) {
  return bt.briefWorkflowStatus === "o2_pending";
}

export function isBtO2Validated(bt: ExtractedBt) {
  return bt.briefWorkflowStatus === "o2_validated";
}

export function isBtSuperseded(bt: ExtractedBt) {
  return Boolean(bt.supersededAt || bt.replacedByEntryId);
}

export function isUnusedUnitaryImport(bt: ExtractedBt) {
  return bt.sourceMode === "unitary_import" && !bt.replacementOfEntryId && !isBtSuperseded(bt);
}

export function shouldDisplayBtInBriefWorkspace(bt: ExtractedBt) {
  return !isUnusedUnitaryImport(bt);
}

export function shouldDisplayBtInReferentWorkspace(bt: ExtractedBt) {
  return !isBtSuperseded(bt) && !isUnusedUnitaryImport(bt);
}
