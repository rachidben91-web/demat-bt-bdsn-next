"use server";

import { redirect } from "next/navigation";
import { normalizeSiteCode, setActiveSiteCode } from "@/lib/sites";

function sanitizeReturnTo(value: FormDataEntryValue | null) {
  const returnTo = typeof value === "string" ? value.trim() : "";

  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  if (
    returnTo.startsWith("/login") ||
    returnTo.startsWith("/terrain") ||
    returnTo.startsWith("/choix-site")
  ) {
    return "/";
  }

  return returnTo;
}

export async function chooseSiteAction(formData: FormData) {
  const siteCode = normalizeSiteCode(formData.get("siteCode"));

  if (!siteCode) {
    redirect("/choix-site");
  }

  await setActiveSiteCode(siteCode);
  redirect(sanitizeReturnTo(formData.get("returnTo")));
}
