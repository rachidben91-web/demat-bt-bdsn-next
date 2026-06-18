import { Archive, MessageSquareMore, Paperclip, Send, Trash2, UsersRound } from "lucide-react";
import { archiveOfficeMessageAction, deleteOfficeMessageAction } from "@/app/actions/messaging";
import { AppShellHeader } from "@/components/app-shell-header";
import { MessagingComposer } from "@/components/messaging-composer";
import { ModuleIcon } from "@/components/module-icon";
import type { MessagingTechnicianTarget, OfficeMessageSummary } from "@/lib/messaging";
import { getModuleTheme } from "@/lib/module-theme";
import type { OfficeModuleKey } from "@/lib/office-access";
import type { DailyAssignmentRow, SupportJourneeData } from "@/lib/support-journee";

type MessagingWorkspaceProps = {
  allowedModules?: OfficeModuleKey[];
  data: SupportJourneeData;
  headerDateTimeLabel: string;
  isSuperAdmin?: boolean;
  messageTargets: MessagingTechnicianTarget[];
  recentMessages: OfficeMessageSummary[];
  role: string | null;
  userEmail: string | null;
};

function formatMessageTimestamp(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function summarizeNames(values: string[], maxVisible = 3) {
  if (values.length === 0) {
    return "Aucun";
  }

  const visible = values.slice(0, maxVisible).join(", ");
  const remaining = values.length - maxVisible;

  return remaining > 0 ? `${visible} +${remaining}` : visible;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function hasUsefulText(value: string) {
  const trimmed = value.trim();

  return Boolean(trimmed && trimmed !== "\u2014" && trimmed !== "\u00e2\u20ac\u201d");
}

function buildConversationRows(assignments: DailyAssignmentRow[]) {
  const withObservations = assignments.filter((assignment) =>
    hasUsefulText(assignment.observations),
  );
  const remoteBriefs = assignments.filter((assignment) =>
    hasUsefulText(assignment.briefDistance),
  );
  const officeDebriefs = assignments.filter((assignment) =>
    hasUsefulText(assignment.debriefAgence),
  );

  return [
    {
      id: "observations",
      count: withObservations.length,
    },
    {
      id: "briefs",
      count: remoteBriefs.length,
    },
    {
      id: "debriefs",
      count: officeDebriefs.length,
    },
  ];
}

export function MessagingWorkspace({
  allowedModules = [],
  data,
  headerDateTimeLabel,
  isSuperAdmin = false,
  messageTargets,
  recentMessages,
  role,
  userEmail,
}: MessagingWorkspaceProps) {
  const theme = getModuleTheme("messagerie");
  const { dailyAssignments, headerWeather, supportMetrics, technicians } = data;
  const conversationRows = buildConversationRows(dailyAssignments);
  const activeTechnicians = Math.max(
    supportMetrics.presents,
    dailyAssignments.filter((assignment) => assignment.activity !== null).length,
  );
  const pendingMessages = conversationRows.reduce((total, row) => total + row.count, 0);
  const siteCount = new Set(technicians.map((technician) => technician.site).filter(Boolean)).size;
  const messageSites = [...new Set(messageTargets.map((technician) => technician.site).filter(Boolean))]
    .sort((left, right) => left!.localeCompare(right!, "fr")) as string[];
  const metrics = [
    {
      icon: MessageSquareMore,
      label: "Messages a suivre",
      value: String(pendingMessages),
      detail: "files issues du support journee",
    },
    {
      icon: UsersRound,
      label: "Agents visibles",
      value: String(activeTechnicians),
      detail: `${siteCount} site${siteCount > 1 ? "s" : ""} terrain`,
    },
    {
      icon: Send,
      label: "Diffusions envoyees",
      value: String(recentMessages.length),
      detail: "historique des derniers envois",
    },
  ];

  return (
    <main className={cx("min-h-screen px-4 py-4 text-slate-900 sm:px-5 lg:px-6", theme.pageBackgroundClassName)}>
      <div className="mx-auto max-w-[2360px]">
        <AppShellHeader
          activeModule="messagerie"
          allowedModules={allowedModules}
          headerDateTimeLabel={headerDateTimeLabel}
          isSuperAdmin={isSuperAdmin}
          role={role}
          subtitle="Console bureau pour preparer les echanges terrain, suivre les files actives et rattacher les messages aux tournees."
          title="Messagerie"
          userEmail={userEmail}
          weatherGeneratedAtLabel={headerWeather.generatedAtLabel}
          weatherZones={headerWeather.zones}
        />

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-[0_22px_56px_rgba(148,163,184,0.14)] backdrop-blur sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-600">
                  Centre messages
                </p>
                <h2 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.03em] text-slate-950">
                  Vue bureau des conversations terrain
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Compose des consignes bureau vers toute l&apos;agence, un groupe, un manager ou des techniciens precis, avec piece jointe si besoin.
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] text-teal-700 shadow-[0_16px_30px_rgba(148,163,184,0.16)]">
                <ModuleIcon className="h-7 w-7" moduleId="messagerie" />
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <article
                    className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_rgba(148,163,184,0.10)]"
                    key={metric.label}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {metric.label}
                      </p>
                    </div>
                    <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{metric.detail}</p>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm">
              <div className="grid grid-cols-[minmax(0,1.3fr)_140px_130px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Derniers messages</span>
                <span>Lecture</span>
                <span>Piece jointe</span>
              </div>
              {recentMessages.length > 0 ? (
                recentMessages.map((message) => {
                  const readRecipients = message.recipients.filter((recipient) => recipient.readAt);
                  const unreadRecipients = message.recipients.filter((recipient) => !recipient.readAt);
                  const sentByLabel = message.sentByName || message.sentByEmail;

                  return (
                    <div
                      className="grid grid-cols-[minmax(0,1.3fr)_140px_130px] gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0"
                      key={message.id}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                            <MessageSquareMore className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {message.title}
                              </p>
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-700">
                                {message.targetLabel}
                              </span>
                            </div>
                            <p className="truncate text-sm text-slate-500">{message.body}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatMessageTimestamp(message.sentAt)} par {sentByLabel}
                            </p>
                            <div className="mt-2 space-y-1 text-xs text-slate-500">
                              <p>
                                <span className="font-semibold text-slate-600">Destinataires:</span>{" "}
                                {summarizeNames(message.recipients.map((recipient) => recipient.technicianName))}
                              </p>
                              {message.attachments.length > 0 ? (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {message.attachments.map((attachment) =>
                                    attachment.signedUrl ? (
                                      <a
                                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700"
                                        href={attachment.signedUrl}
                                        key={attachment.id}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        {attachment.fileName}
                                      </a>
                                    ) : (
                                      <span
                                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700"
                                        key={attachment.id}
                                      >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        {attachment.fileName}
                                      </span>
                                    ),
                                  )}
                                </div>
                              ) : null}
                              {message.recipients.length > 1 ? (
                                <>
                                  <p>
                                    <span className="font-semibold text-emerald-700">Lus:</span>{" "}
                                    {summarizeNames(
                                      readRecipients.map((recipient) => recipient.technicianName),
                                    )}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-amber-700">Non lus:</span>{" "}
                                    {summarizeNames(
                                      unreadRecipients.map((recipient) => recipient.technicianName),
                                    )}
                                  </p>
                                </>
                              ) : null}
                              {message.replies.length > 0 ? (
                                <div className="pt-2">
                                  <p className="font-semibold text-slate-600">
                                    Retours terrain ({message.replies.length})
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {message.replies.map((reply) => (
                                      <div
                                        className="rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2"
                                        key={reply.id}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-700">
                                            {reply.technicianName}
                                          </p>
                                          <p className="text-[11px] text-slate-400">
                                            {formatMessageTimestamp(reply.sentAt)}
                                          </p>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                          {reply.body}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <form action={archiveOfficeMessageAction}>
                                <input name="message_id" type="hidden" value={message.id} />
                                <button
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                                  type="submit"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  Archiver
                                </button>
                              </form>
                              <form action={deleteOfficeMessageAction}>
                                <input name="message_id" type="hidden" value={message.id} />
                                <button
                                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                  type="submit"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Supprimer
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="self-center">
                        <p className="text-sm font-semibold text-slate-900">
                          {readRecipients.length}/{message.recipients.length}
                        </p>
                        <p className="text-xs text-slate-400">lus</p>
                      </div>
                      <span className="self-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-center text-xs font-semibold text-teal-700">
                        {message.attachments.length > 0
                          ? `${message.attachments.length} fichier`
                          : "Aucune"}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-sm text-slate-500">
                  Aucun message envoye pour le moment. Le prochain envoi apparaitra ici.
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-[0_22px_56px_rgba(148,163,184,0.14)] backdrop-blur">
            <MessagingComposer sites={messageSites} technicians={messageTargets} />

            <div className="mt-4 space-y-3">
              {[
                {
                  icon: UsersRound,
                  label: "Cibles disponibles",
                  text: `${messageTargets.length} technicien(s) avec acces terrain et filtrage manager.`,
                  tone: "text-sky-700 bg-sky-50",
                },
                {
                  icon: Paperclip,
                  label: "Pieces jointes",
                  text: "PDF, images et documents legers sont acceptes.",
                  tone: "text-emerald-700 bg-emerald-50",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <article
                    className="rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-sm"
                    key={item.label}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cx("inline-flex h-9 w-9 items-center justify-center rounded-2xl", item.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
