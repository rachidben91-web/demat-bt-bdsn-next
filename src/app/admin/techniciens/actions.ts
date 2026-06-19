"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { TECHNICIAN_ROLE_OPTIONS } from "@/lib/admin-technicians";
import { getSiteLabel, isSiteCode, type SiteCode } from "@/lib/site-options";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
} from "@/lib/supabase/server";

function toOptionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function toRequiredString(value: FormDataEntryValue | null, fallback = "") {
  return String(value ?? fallback).trim();
}

function getDisplayName(firstName: string, lastName: string) {
  return `${lastName.toUpperCase()} ${firstName}`.trim();
}

function normalizeRole(value: FormDataEntryValue | null) {
  const role = toRequiredString(value, TECHNICIAN_ROLE_OPTIONS[0]);

  return TECHNICIAN_ROLE_OPTIONS.includes(
    role as (typeof TECHNICIAN_ROLE_OPTIONS)[number],
  )
    ? role
    : TECHNICIAN_ROLE_OPTIONS[0];
}

async function resolveFormSiteCode(value: FormDataEntryValue | null): Promise<SiteCode> {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (isSiteCode(rawValue)) {
    return rawValue;
  }

  return getActiveSiteCodeOrDefault();
}

export async function createTechnicianAction(formData: FormData) {
  await requireAdmin();

  const supabase =
    createServerSupabaseAdminClient() ?? (await createServerSupabaseClient());
  const firstName = toRequiredString(formData.get("first_name"));
  const lastName = toRequiredString(formData.get("last_name"));
  const nni = toRequiredString(formData.get("nni"));
  const siteCode = await resolveFormSiteCode(formData.get("site_code"));

  if (!firstName || !lastName || !nni) {
    throw new Error("Nom, prenom et NNI obligatoires.");
  }

  const payload = {
    nni,
    first_name: firstName,
    last_name: lastName,
    display_name: getDisplayName(firstName, lastName),
    manager_id: toOptionalString(formData.get("manager_id")),
    site: getSiteLabel(siteCode),
    site_code: siteCode,
    role: normalizeRole(formData.get("role")),
    color: toRequiredString(formData.get("color"), "#2563eb"),
    ptc: formData.has("ptc"),
    ptd: formData.has("ptd"),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    active: formData.has("active"),
  };

  const { error } = await supabase.from("technicians").insert(payload);

  if (error) {
    throw new Error(`Creation technicien impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/techniciens");
  redirect("/admin/techniciens");
}

export async function updateTechnicianAction(formData: FormData) {
  await requireAdmin();

  const supabase =
    createServerSupabaseAdminClient() ?? (await createServerSupabaseClient());
  const id = toRequiredString(formData.get("id"));
  const firstName = toRequiredString(formData.get("first_name"));
  const lastName = toRequiredString(formData.get("last_name"));
  const nni = toRequiredString(formData.get("nni"));
  const siteCode = await resolveFormSiteCode(formData.get("site_code"));

  if (!id || !firstName || !lastName || !nni) {
    throw new Error("Technicien invalide.");
  }

  const payload = {
    nni,
    first_name: firstName,
    last_name: lastName,
    display_name: getDisplayName(firstName, lastName),
    manager_id: toOptionalString(formData.get("manager_id")),
    site: getSiteLabel(siteCode),
    site_code: siteCode,
    role: normalizeRole(formData.get("role")),
    color: toRequiredString(formData.get("color"), "#2563eb"),
    ptc: formData.has("ptc"),
    ptd: formData.has("ptd"),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    active: formData.has("active"),
  };

  const { data, error } = await supabase
    .from("technicians")
    .update(payload)
    .eq("id", id)
    .select("id, ptc, ptd")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Mise a jour technicien impossible: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(
      "Mise a jour technicien impossible: aucune ligne mise a jour. Verifiez la policy Supabase d'update sur public.technicians.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin/techniciens");
  revalidatePath(`/admin/techniciens/${id}`);
  redirect("/admin/techniciens");
}

export async function deactivateTechnicianAction(formData: FormData) {
  await requireAdmin();

  const supabase =
    createServerSupabaseAdminClient() ?? (await createServerSupabaseClient());
  const id = toRequiredString(formData.get("id"));

  if (!id) {
    throw new Error("Technicien invalide.");
  }

  const { error } = await supabase
    .from("technicians")
    .update({ active: false })
    .eq("id", id);

  if (error) {
    throw new Error(`Desactivation impossible: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/admin/techniciens");
  revalidatePath(`/admin/techniciens/${id}`);
  redirect("/admin/techniciens");
}
