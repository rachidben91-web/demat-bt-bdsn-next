"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createOfficeAccessAction,
  type CreateOfficeAccessFormState,
  updateOfficeAccessAction,
} from "@/app/admin/acces/actions";
import type {
  OfficeAccountAdminRow,
  TechnicianAccessCandidate,
} from "@/lib/admin-office-accounts";
import {
  createRolePresetPermissions,
  OFFICE_ACCOUNT_STATUS_LABELS,
  OFFICE_ACCOUNT_STATUS_OPTIONS,
  OFFICE_MODULE_KEYS,
  OFFICE_MODULE_META,
  OFFICE_PERMISSION_LEVEL_LABELS,
  OFFICE_PERMISSION_LEVELS,
  OFFICE_ROLE_LABELS,
  OFFICE_ROLE_OPTIONS,
  TERRAIN_ROLE_LABELS,
  TERRAIN_ROLE_OPTIONS,
  type OfficeRole,
} from "@/lib/office-access";

type AccessFormProps = {
  account?: OfficeAccountAdminRow | null;
  allowOfficeAccessControls?: boolean;
  cancelHref?: string;
  cancelLabel?: string;
  initialValues?: {
    accountStatus?: string;
    canAccessOfficeApp?: boolean;
    canAccessTerrainApp?: boolean;
    email?: string;
    fullName?: string;
    loginIdentifier?: string | null;
    officeRole?: string | null;
    technicianId?: string | null;
    terrainRole?: string | null;
  };
  lockTechnicianLink?: boolean;
  managementScope?: "general" | "technician";
  mode?: "create" | "edit";
  requiredTechnicianId?: string;
  showTerrainOnlyNotice?: boolean;
  technicians: TechnicianAccessCandidate[];
};

const initialCreateOfficeAccessFormState: CreateOfficeAccessFormState = {
  error: null,
  success: null,
  temporaryPassword: null,
};

function fieldClassName() {
  return "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400";
}

function getLinkedTechnicianLabel(
  technicians: TechnicianAccessCandidate[],
  technicianId: string | null | undefined,
  fallbackLabel: string | null | undefined,
) {
  if (!technicianId) {
    return fallbackLabel ?? "Compte externe / pas de liaison";
  }

  const technician = technicians.find((candidate) => candidate.id === technicianId);

  if (technician) {
    return `${technician.displayName} - ${technician.nni} - ${technician.role}`;
  }

  return fallbackLabel ?? "Technicien impose depuis la fiche";
}

export function AccessForm({
  account,
  allowOfficeAccessControls = true,
  cancelHref = "/admin/acces",
  cancelLabel = "Retour a la liste",
  initialValues,
  lockTechnicianLink = false,
  managementScope = "general",
  mode = "create",
  requiredTechnicianId,
  showTerrainOnlyNotice = false,
  technicians,
}: AccessFormProps) {
  const defaultCanAccessOfficeApp =
    account?.canAccessOfficeApp ?? initialValues?.canAccessOfficeApp ?? true;
  const defaultOfficeRole = account?.officeRole ?? initialValues?.officeRole ?? "";
  const defaultModulePermissions =
    account?.modulePermissions ??
    (defaultOfficeRole
      ? createRolePresetPermissions(defaultOfficeRole as OfficeRole)
      : createRolePresetPermissions(null));
  const [state, formAction, pending] = useActionState(
    mode === "create" ? createOfficeAccessAction : updateOfficeAccessAction,
    initialCreateOfficeAccessFormState,
  );
  const linkedTechnicianId = account?.technicianId ?? initialValues?.technicianId ?? "";

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm"
    >
      <input name="management_scope" type="hidden" value={managementScope} />
      {requiredTechnicianId ? (
        <input name="expected_technician_id" type="hidden" value={requiredTechnicianId} />
      ) : null}
      {mode === "edit" && account ? (
        <>
          <input name="office_account_id" type="hidden" value={account.id} />
          <input name="auth_user_id" type="hidden" value={account.authUserId} />
        </>
      ) : null}
      {!allowOfficeAccessControls ? (
        <>
          <input name="can_access_terrain_app" type="hidden" value="on" />
          <input name="office_role" type="hidden" value="" />
          {OFFICE_MODULE_KEYS.map((moduleKey) => (
            <input
              key={moduleKey}
              name={`permission_${moduleKey}`}
              type="hidden"
              value="none"
            />
          ))}
        </>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">
          Nom complet
          <input
            className={fieldClassName()}
            defaultValue={account?.fullName ?? initialValues?.fullName ?? ""}
            name="full_name"
            required
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Email de connexion
          <input
            className={fieldClassName()}
            defaultValue={account?.email ?? initialValues?.email ?? ""}
            name="email"
            required
            type="email"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Identifiant de connexion
          <input
            className={fieldClassName()}
            defaultValue={account?.loginIdentifier ?? initialValues?.loginIdentifier ?? ""}
            name="login_identifier"
            placeholder="ex. h26975"
          />
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Technicien lie
          {lockTechnicianLink ? (
            <>
              <input name="technician_id" type="hidden" value={linkedTechnicianId} />
              <div className={`${fieldClassName()} text-slate-600`}>
                {getLinkedTechnicianLabel(
                  technicians,
                  linkedTechnicianId,
                  account?.technicianDisplayName ?? null,
                )}
              </div>
            </>
          ) : (
            <select
              className={fieldClassName()}
              defaultValue={linkedTechnicianId}
              name="technician_id"
            >
              <option value="">Compte externe / pas de liaison</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.displayName} - {technician.nni} - {technician.role}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="text-sm font-semibold text-slate-700">
          Etat du compte
          <select
            className={fieldClassName()}
            defaultValue={account?.accountStatus ?? initialValues?.accountStatus ?? "active"}
            name="account_status"
          >
            {OFFICE_ACCOUNT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {OFFICE_ACCOUNT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        {allowOfficeAccessControls ? (
          <label className="text-sm font-semibold text-slate-700">
            Role bureau
            <select
              className={fieldClassName()}
              defaultValue={defaultOfficeRole}
              name="office_role"
            >
              <option value="">Aucun</option>
              {OFFICE_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {OFFICE_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="text-sm font-semibold text-slate-700">
          Role terrain
          <select
            className={fieldClassName()}
            defaultValue={account?.terrainRole ?? initialValues?.terrainRole ?? ""}
            name="terrain_role"
          >
            <option value="">Aucun</option>
            {TERRAIN_ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {TERRAIN_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {allowOfficeAccessControls ? (
        <div className="grid gap-3 rounded-[24px] bg-slate-50 p-5 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              defaultChecked={defaultCanAccessOfficeApp}
              name="can_access_office_app"
              type="checkbox"
            />
            Acces bureau
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              defaultChecked={
                account?.canAccessTerrainApp ?? initialValues?.canAccessTerrainApp ?? false
              }
              name="can_access_terrain_app"
              type="checkbox"
            />
            Acces terrain
          </label>
        </div>
      ) : (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Acces terrain uniquement</p>
          <p className="mt-2 leading-7">
            Depuis la fiche technicien, ce formulaire reste volontairement limite au compte
            terrain du technicien.
          </p>
        </div>
      )}

      {allowOfficeAccessControls ? (
        <section className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Permissions bureau
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Les roles bureau servent de preset. Tu peux ensuite ajuster les modules un par un.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {OFFICE_MODULE_KEYS.map((moduleKey) => (
              <label
                key={moduleKey}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700"
              >
                <span>{OFFICE_MODULE_META[moduleKey].label}</span>
                <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
                  {OFFICE_MODULE_META[moduleKey].description}
                </span>
                <select
                  className={fieldClassName()}
                  defaultValue={defaultModulePermissions[moduleKey]}
                  name={`permission_${moduleKey}`}
                >
                  {OFFICE_PERMISSION_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {OFFICE_PERMISSION_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {showTerrainOnlyNotice ? (
        <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Cette vue permet de creer ou maintenir un acces terrain sans ouvrir les droits du
          module Acces.
        </p>
      ) : null}

      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-semibold">{state.success}</p>
          {state.temporaryPassword ? (
            <p className="mt-2">
              Mot de passe temporaire :{" "}
              <span className="font-mono font-semibold">{state.temporaryPassword}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending
            ? mode === "create"
              ? "Creation en cours..."
              : "Mise a jour en cours..."
            : mode === "create"
              ? "Creer l'acces"
              : "Enregistrer les modifications"}
        </button>
        <Link
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          href={cancelHref}
        >
          {cancelLabel}
        </Link>
      </div>
    </form>
  );
}
