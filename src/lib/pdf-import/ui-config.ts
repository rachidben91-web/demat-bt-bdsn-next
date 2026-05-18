export const DOC_TYPES_CONFIG = {
  BT: { label: "BT", icon: "📋", color: "#17499c", desc: "Bon de Travail" },
  AT: { label: "AT", icon: "✅", color: "#059669", desc: "Autorisation de Travail" },
  FOR113: { label: "FOR-113", icon: "📋", color: "#0ea5e9", desc: "Fiche de preparation et suivi" },
  PROC: { label: "PROC", icon: "📝", color: "#2563eb", desc: "Procedure d'execution / Mode operatoire" },
  PLAN: { label: "PLAN", icon: "🗺️", color: "#7c3aed", desc: "Plan de situation / Cartographie" },
  PHOTO: { label: "PHOTO", icon: "📷", color: "#dc2626", desc: "Photos / Images terrain" },
  STREET: { label: "STREET", icon: "🌍", color: "#ea580c", desc: "Vue Street View" },
  DOC: { label: "DOC", icon: "📄", color: "#85ab95", desc: "Document generique / Annexe" },
} as const;
