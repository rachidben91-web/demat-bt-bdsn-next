import badgeRules from "@/data/bt-badges-rules.json";
import type { ExtractedBt } from "@/lib/pdf-import/types";

type BadgeRule = {
  any?: string[];
  all?: string[];
  any2?: string[];
};

type BadgeConfig = {
  id: string;
  label: string;
  icon: string;
  color: string;
  priority: number;
  rules?: BadgeRule[];
  exclude?: string[];
};

export type BtCategory = {
  color: string;
  icon: string;
  id: string;
  label: string;
};

function normalizeText(value: string) {
  return ` ${String(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function buildBadgeText(bt: ExtractedBt) {
  return normalizeText([bt.objet, bt.observations].filter(Boolean).join(" | "));
}

function ruleMatches(text: string, rule?: BadgeRule) {
  if (!rule) {
    return false;
  }

  const has = (needle: string) => text.includes(normalizeText(needle));
  const anyOk = !rule.any || rule.any.some(has);
  const allOk = !rule.all || rule.all.every(has);
  const any2Ok = !rule.any2 || rule.any2.some(has);

  return anyOk && allOk && any2Ok;
}

export function detectPrimaryBadge(bt: ExtractedBt): BadgeConfig | null {
  const rules = [...badgeRules.badges].sort(
    (left, right) => (right.priority ?? 0) - (left.priority ?? 0),
  ) as BadgeConfig[];
  const text = buildBadgeText(bt);
  const matchingIds: string[] = [];

  for (const badge of rules) {
    const excludes = badge.exclude ?? [];

    if (excludes.some((exclude) => text.includes(normalizeText(exclude)))) {
      continue;
    }

    if ((badge.rules ?? []).some((rule) => ruleMatches(text, rule))) {
      matchingIds.push(badge.id);
    }
  }

  const stackOrder = badgeRules.notes.ui.display.stackOrder ?? [];
  const ordered = [...new Set(matchingIds)].sort((left, right) => {
    const leftIndex = stackOrder.indexOf(left);
    const rightIndex = stackOrder.indexOf(right);

    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });

  const primaryId = ordered[0];

  if (!primaryId) {
    return null;
  }

  return rules.find((badge) => badge.id === primaryId) ?? null;
}

const CATEGORY_CONFIG: Record<string, BtCategory> = {
  "1/4 COM": { id: "1/4 COM", label: "1/4 Com", color: "#06b6d4", icon: "🗣️" },
  AUTRES: { id: "AUTRES", label: "Autres", color: "#94a3b8", icon: "⬜" },
  CLIENT: { id: "CLIENT", label: "Clientele", color: "#14b8a6", icon: "👤" },
  DEP: { id: "DEP", label: "Depannage Jour", color: "#f59e0b", icon: "🧰" },
  EAP: { id: "EAP", label: "EAP", color: "#4f46e5", icon: "📋" },
  FUITE: { id: "FUITE", label: "Fuite / Surveillance", color: "#ef4444", icon: "🚨" },
  IS: { id: "IS", label: "IS Jour", color: "#eab308", icon: "🛑" },
  MAGASIN: { id: "MAGASIN", label: "Magasin", color: "#6366f1", icon: "📦" },
  MAINT: { id: "MAINT", label: "Maintenance", color: "#3b82f6", icon: "🔧" },
  PIS: { id: "PIS", label: "PIS", color: "#64748b", icon: "⚙️" },
  REUNION: { id: "REUNION", label: "Reunion / Admin", color: "#ec4899", icon: "👥" },
  RSF_SAP: { id: "RSF_SAP", label: "RSF / SAP", color: "#8b5cf6", icon: "💣" },
  TRAVAUX: { id: "TRAVAUX", label: "Travaux", color: "#10b981", icon: "🛠️" },
  VISUELLE: { id: "VISUELLE", label: "Visuelle", color: "#f43f5e", icon: "👁️" },
};

const CATEGORY_ORDER = [
  "1/4 COM",
  "IS",
  "DEP",
  "FUITE",
  "TRAVAUX",
  "RSF_SAP",
  "MAGASIN",
  "EAP",
  "CLIENT",
  "REUNION",
  "VISUELLE",
  "PIS",
  "MAINT",
  "AUTRES",
] as const;

function getCategoryKeyFromBadgeId(badgeId: string) {
  const id = badgeId.toUpperCase();

  if (id.startsWith("IS_") || id === "IS") return "IS";
  if (id.startsWith("DEP_") || id === "DEP") return "DEP";
  if (id === "MAINTENANCE" || id.startsWith("MAINT_") || id.includes("CICM") || id.includes("ROBINET")) {
    return "MAINT";
  }
  if (id === "SURVEILLANCE" || id === "LOCA" || id.includes("FUITE") || id.includes("URGEN") || id.includes("SURVEILLANCE")) {
    return "FUITE";
  }
  if (id.includes("TRAVAUX") || id.includes("CHANTIER") || id.includes("RACC")) return "TRAVAUX";
  if (id.includes("RSF") || id.includes("SAP")) return "RSF_SAP";
  if (id.includes("MAGASIN")) return "MAGASIN";
  if (id.includes("1/4 COM") || id.includes("COM") || id.includes("BRIEF")) return "1/4 COM";
  if (id.includes("EAP")) return "EAP";
  if (id.includes("PIS")) return "PIS";
  if (id.includes("REUNION") || id.includes("ADMIN")) return "REUNION";
  if (id === "CLIENTELE" || id.includes("CLIENT") || id === "MHS" || id === "MES") return "CLIENT";
  if (id.includes("VISUELLE")) return "VISUELLE";
  return "AUTRES";
}

export function detectBtCategory(bt: ExtractedBt): BtCategory {
  const primaryBadge = detectPrimaryBadge(bt);
  const categoryKey = getCategoryKeyFromBadgeId(primaryBadge?.id ?? "AUTRES");
  return CATEGORY_CONFIG[categoryKey] ?? CATEGORY_CONFIG.AUTRES;
}

export function getBtCategoryOrder(categoryId: string) {
  const index = CATEGORY_ORDER.indexOf(categoryId as (typeof CATEGORY_ORDER)[number]);
  return index === -1 ? 999 : index;
}
