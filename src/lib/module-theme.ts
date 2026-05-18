export type AppModuleId = "dashboard" | "support" | "admin" | "access" | "referent" | "import" | "brief";

type ModuleTheme = {
  activeNavClassName: string;
  activeNavIconClassName: string;
  headerBadgeClassName: string;
  headerClassName: string;
  icon: string;
  label: string;
  pageBackgroundClassName: string;
  tintClassName: string;
};

export const moduleThemeMap: Record<AppModuleId, ModuleTheme> = {
  dashboard: {
    activeNavClassName:
      "border-blue-200/70 bg-[linear-gradient(180deg,#f6faff_0%,#dbeafe_100%)] text-blue-950 shadow-[0_16px_32px_rgba(37,99,235,0.18)]",
    activeNavIconClassName: "bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.28)]",
    headerBadgeClassName: "border-blue-200/40 bg-blue-400/12 text-sky-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,248,255,0.98)_54%,rgba(236,242,251,0.98)_100%)]",
    icon: "DB",
    label: "Dashboard",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fbff_28%,#eef4fb_58%,#e7edf6_100%)]",
    tintClassName: "text-blue-600",
  },
  support: {
    activeNavClassName:
      "border-emerald-200/70 bg-[linear-gradient(180deg,#f4fff8_0%,#dcfce7_100%)] text-emerald-950 shadow-[0_16px_32px_rgba(16,185,129,0.18)]",
    activeNavIconClassName: "bg-emerald-600 text-white shadow-[0_8px_18px_rgba(16,185,129,0.28)]",
    headerBadgeClassName: "border-emerald-200/50 bg-emerald-400/12 text-emerald-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,253,248,0.98)_54%,rgba(235,247,242,0.98)_100%)]",
    icon: "SJ",
    label: "Support",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#ecfdf5_0%,#eff8f7_26%,#eef4fb_58%,#e7edf6_100%)]",
    tintClassName: "text-emerald-600",
  },
  admin: {
    activeNavClassName:
      "border-indigo-200/70 bg-[linear-gradient(180deg,#f7f8ff_0%,#e0e7ff_100%)] text-indigo-950 shadow-[0_16px_32px_rgba(99,102,241,0.18)]",
    activeNavIconClassName: "bg-indigo-600 text-white shadow-[0_8px_18px_rgba(99,102,241,0.28)]",
    headerBadgeClassName: "border-indigo-200/40 bg-indigo-400/12 text-indigo-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,245,255,0.98)_54%,rgba(236,240,251,0.98)_100%)]",
    icon: "AD",
    label: "Admin",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#eef2ff_0%,#f5f3ff_28%,#f3f6fb_58%,#edf3f8_100%)]",
    tintClassName: "text-indigo-600",
  },
  access: {
    activeNavClassName:
      "border-amber-200/70 bg-[linear-gradient(180deg,#fffaf0_0%,#fef3c7_100%)] text-amber-950 shadow-[0_16px_32px_rgba(245,158,11,0.18)]",
    activeNavIconClassName: "bg-amber-500 text-white shadow-[0_8px_18px_rgba(245,158,11,0.28)]",
    headerBadgeClassName: "border-amber-200/40 bg-amber-300/14 text-amber-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,251,240,0.98)_54%,rgba(248,243,232,0.98)_100%)]",
    icon: "AC",
    label: "Accès",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#fff7ed_0%,#fefce8_28%,#f6f8fc_58%,#eef3f8_100%)]",
    tintClassName: "text-amber-600",
  },
  referent: {
    activeNavClassName:
      "border-violet-200/70 bg-[linear-gradient(180deg,#faf5ff_0%,#ede9fe_100%)] text-violet-950 shadow-[0_16px_32px_rgba(139,92,246,0.18)]",
    activeNavIconClassName: "bg-violet-600 text-white shadow-[0_8px_18px_rgba(139,92,246,0.28)]",
    headerBadgeClassName: "border-violet-200/40 bg-violet-400/12 text-violet-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,244,255,0.98)_54%,rgba(240,236,249,0.98)_100%)]",
    icon: "RF",
    label: "Référent",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#f5f3ff_0%,#faf5ff_28%,#eef4fb_58%,#e7edf6_100%)]",
    tintClassName: "text-violet-600",
  },
  brief: {
    activeNavClassName:
      "border-sky-200/70 bg-[linear-gradient(180deg,#f3f9ff_0%,#dbeafe_100%)] text-sky-950 shadow-[0_16px_32px_rgba(59,130,246,0.18)]",
    activeNavIconClassName: "bg-sky-600 text-white shadow-[0_8px_18px_rgba(59,130,246,0.28)]",
    headerBadgeClassName: "border-sky-200/40 bg-sky-400/12 text-sky-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,249,255,0.98)_54%,rgba(235,241,250,0.98)_100%)]",
    icon: "BF",
    label: "Brief",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#eff6ff_0%,#f8fbff_28%,#eef4fb_58%,#e7edf6_100%)]",
    tintClassName: "text-sky-600",
  },
  import: {
    activeNavClassName:
      "border-rose-200/70 bg-[linear-gradient(180deg,#fff5f7_0%,#ffe4e6_100%)] text-rose-950 shadow-[0_16px_32px_rgba(244,63,94,0.18)]",
    activeNavIconClassName: "bg-rose-500 text-white shadow-[0_8px_18px_rgba(244,63,94,0.28)]",
    headerBadgeClassName: "border-rose-200/40 bg-rose-400/12 text-rose-100",
    headerClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,244,246,0.98)_54%,rgba(249,237,240,0.98)_100%)]",
    icon: "PDF",
    label: "Import PDF",
    pageBackgroundClassName:
      "bg-[radial-gradient(circle_at_top_left,#fff1f2_0%,#fff7ed_28%,#f6f8fc_58%,#eef3f8_100%)]",
    tintClassName: "text-rose-600",
  },
};

export function getModuleTheme(moduleId: AppModuleId) {
  return moduleThemeMap[moduleId];
}
