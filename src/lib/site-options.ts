export const ACTIVE_SITE_COOKIE_NAME = "demat_active_site";

export const SITE_OPTIONS = [
  {
    code: "VLG",
    label: "Villeneuve-la-Garenne",
    legacyLabels: ["VLG", "Villeneuve-la-Garenne", "Villeneuve la Garenne"],
  },
  {
    code: "SAT",
    label: "Sartrouville",
    legacyLabels: ["SAT", "Sartrouville"],
  },
] as const;

export type SiteCode = (typeof SITE_OPTIONS)[number]["code"];

export const DEFAULT_SITE_CODE: SiteCode = "VLG";

export function isSiteCode(value: unknown): value is SiteCode {
  return SITE_OPTIONS.some((site) => site.code === value);
}

export function getSiteOption(code: SiteCode) {
  return SITE_OPTIONS.find((site) => site.code === code) ?? SITE_OPTIONS[0];
}

export function getSiteLabel(code: SiteCode) {
  return getSiteOption(code).label;
}

export function matchesSite(value: string | null | undefined, siteCode: SiteCode) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return getSiteOption(siteCode).legacyLabels.some(
    (label) => label.trim().toLowerCase() === normalizedValue,
  );
}
