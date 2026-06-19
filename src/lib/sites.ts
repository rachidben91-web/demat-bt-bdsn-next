import { cookies } from "next/headers";
import {
  ACTIVE_SITE_COOKIE_NAME,
  DEFAULT_SITE_CODE,
  getSiteOption,
  isSiteCode,
  type SiteCode,
} from "@/lib/site-options";

export async function getActiveSiteCode(): Promise<SiteCode | null> {
  const cookieStore = await cookies();
  const rawSiteCode = cookieStore.get(ACTIVE_SITE_COOKIE_NAME)?.value;

  return isSiteCode(rawSiteCode) ? rawSiteCode : null;
}

export async function getActiveSiteCodeOrDefault(): Promise<SiteCode> {
  return (await getActiveSiteCode()) ?? DEFAULT_SITE_CODE;
}

export async function setActiveSiteCode(siteCode: SiteCode) {
  const cookieStore = await cookies();

  cookieStore.set(ACTIVE_SITE_COOKIE_NAME, siteCode, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearActiveSiteCode() {
  const cookieStore = await cookies();

  cookieStore.delete(ACTIVE_SITE_COOKIE_NAME);
}

export function normalizeSiteCode(value: FormDataEntryValue | null): SiteCode | null {
  const rawValue = typeof value === "string" ? value : null;

  return isSiteCode(rawValue) ? rawValue : null;
}

export function getActiveSiteDisplay(siteCode: SiteCode) {
  return getSiteOption(siteCode);
}
