"use client";

import { LogOut, MonitorSmartphone, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { revokeOfficeAccountSessionsAction } from "@/app/admin/acces/session-actions";
import type { OfficeAccountSession } from "@/lib/admin-office-sessions";

type SessionManagementProps = {
  currentUserId: string | null;
  isPreview: boolean;
  sessions: OfficeAccountSession[];
};

type SessionGroup = {
  authUserId: string;
  fullName: string;
  email: string;
  sessions: OfficeAccountSession[];
};

type PendingRevocation = {
  group: SessionGroup;
  session: OfficeAccountSession | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDeviceLabel(userAgent: string | null) {
  const source = userAgent?.toLowerCase() ?? "";

  if (source.includes("edg/")) return "Microsoft Edge · ordinateur";
  if (source.includes("firefox")) return "Firefox · ordinateur";
  if (source.includes("iphone") || source.includes("ipad")) return "Safari · iPhone / iPad";
  if (source.includes("android")) return "Navigateur · Android";
  if (source.includes("chrome")) return "Google Chrome · ordinateur";
  if (source.includes("safari")) return "Safari · ordinateur";

  return "Navigateur ou appareil non identifie";
}

function getSessionGroups(sessions: OfficeAccountSession[]) {
  const groups = new Map<string, SessionGroup>();

  for (const session of sessions) {
    const current = groups.get(session.authUserId);

    if (current) {
      current.sessions.push(session);
      continue;
    }

    groups.set(session.authUserId, {
      authUserId: session.authUserId,
      fullName: session.fullName,
      email: session.email,
      sessions: [session],
    });
  }

  return Array.from(groups.values());
}

export function SessionManagement({ currentUserId, isPreview, sessions }: SessionManagementProps) {
  const router = useRouter();
  const [pendingRevocation, setPendingRevocation] = useState<PendingRevocation | null>(null);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => getSessionGroups(sessions), [sessions]);

  function requestRevocation(group: SessionGroup, session: OfficeAccountSession | null) {
    setNotice(null);
    setPendingRevocation({ group, session });
  }

  function confirmRevocation() {
    if (!pendingRevocation) return;

    if (isPreview) {
      setNotice({
        kind: "success",
        text: "Simulation locale : aucune session reelle n'a ete deconnectee.",
      });
      setPendingRevocation(null);
      return;
    }

    startTransition(async () => {
      const result = await revokeOfficeAccountSessionsAction(
        pendingRevocation.group.authUserId,
        pendingRevocation.session?.sessionId ?? null,
      );

      setNotice(
        result.error
          ? { kind: "error", text: result.error }
          : { kind: "success", text: result.success ?? "Deconnexion effectuee." },
      );
      setPendingRevocation(null);

      if (!result.error) router.refresh();
    });
  }

  return (
    <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
              Sessions et securite
            </p>
            {isPreview ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Apercu local · donnees d&apos;exemple
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" /> Donnees en direct
              </span>
            )}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Sessions valides
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Consulte les sessions encore valides et deconnecte un appareil ou l&apos;ensemble des appareils d&apos;un compte. Les jetons d&apos;acces deja charges expirent naturellement selon leur duree de validite.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left lg:text-right">
          <p className="text-2xl font-semibold text-blue-950">{sessions.length}</p>
          <p className="mt-1 text-sm text-blue-700">session{sessions.length > 1 ? "s" : ""} valide{sessions.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {notice ? (
        <p
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {groups.map((group) => {
          const isCurrentAccount = group.authUserId === currentUserId;
          const sessionCount = group.sessions.length;

          return (
            <article key={group.authUserId} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-950">{group.fullName}</h3>
                    {isCurrentAccount ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Votre compte
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{group.email}</p>
                </div>

                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {sessionCount} session{sessionCount > 1 ? "s" : ""}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {group.sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-600">
                        <MonitorSmartphone className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{getDeviceLabel(session.userAgent)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Derniere activite : {formatDate(session.lastActivityAt)}
                        </p>
                      </div>
                    </div>

                    {!isCurrentAccount ? (
                      <button
                        className="inline-flex w-fit items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                        onClick={() => requestRevocation(group, session)}
                        type="button"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Deconnecter
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              {!isCurrentAccount ? (
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  onClick={() => requestRevocation(group, null)}
                  type="button"
                >
                  <LogOut className="h-4 w-4" /> Deconnecter tous les appareils
                </button>
              ) : (
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Pour votre propre compte, utilisez la deconnexion habituelle depuis le profil.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
          <ShieldCheck className="mx-auto h-7 w-7 text-emerald-600" />
          <p className="mt-3 font-semibold text-slate-800">Aucune session valide</p>
          <p className="mt-1 text-sm text-slate-500">Les utilisateurs devront se reconnecter pour apparaitre ici.</p>
        </div>
      ) : null}

      {pendingRevocation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="session-revocation-title">
          <div className="w-full max-w-lg rounded-[28px] border border-white/70 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Confirmation requise</p>
                <h3 id="session-revocation-title" className="mt-2 text-xl font-semibold text-slate-950">
                  {pendingRevocation.session
                    ? "Deconnecter cet appareil ?"
                    : "Deconnecter tous les appareils ?"}
                </h3>
              </div>
              <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={() => setPendingRevocation(null)} type="button" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {pendingRevocation.session
                ? `La session de ${pendingRevocation.group.fullName} sera invalidee.`
                : `Les ${pendingRevocation.group.sessions.length} sessions de ${pendingRevocation.group.fullName} seront invalidees.`}
              {isPreview ? " Cette action est uniquement simulee dans l'apercu local." : " L'action sera journalisee dans l'administration."}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => setPendingRevocation(null)} type="button" disabled={isPending}>
                Annuler
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70" onClick={confirmRevocation} type="button" disabled={isPending}>
                {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {isPending ? "Deconnexion..." : "Confirmer la deconnexion"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
