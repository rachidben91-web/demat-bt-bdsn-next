"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import {
  markTerrainMessagesAsReadAction,
  type TerrainMessageReadState,
} from "@/app/actions/messaging";
import type { OfficeMessageSummary } from "@/lib/messaging";

type TerrainOfficeMessagesProps = {
  messages: OfficeMessageSummary[];
};

const initialState: TerrainMessageReadState = {
  error: null,
  success: null,
};

export function TerrainOfficeMessages({ messages }: TerrainOfficeMessagesProps) {
  const [state, formAction] = useActionState(markTerrainMessagesAsReadAction, initialState);
  const unreadRecipientIds = messages
    .map((message) => message.currentRecipientId)
    .filter(
      (recipientId, index): recipientId is string =>
        Boolean(recipientId && !messages[index]?.currentReadAt),
    );

  useEffect(() => {
    if (unreadRecipientIds.length === 0) {
      return;
    }

    const formData = new FormData();

    unreadRecipientIds.forEach((recipientId) => {
      formData.append("recipient_id", recipientId);
    });

    formAction(formData);
  }, [formAction, unreadRecipientIds]);

  return (
    <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        Messages bureau
      </p>
      <div className="mt-3 space-y-3">
        {messages.map((message) => {
          const isRead = Boolean(message.currentReadAt);
          const senderLabel = message.sentByName || message.sentByEmail;

          return (
            <article
              className="rounded-[22px] border border-slate-200 bg-white/95 p-4"
              key={message.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal-700">
                      Envoye par {senderLabel}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                        isRead
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isRead ? "Lu" : "Nouveau"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Destinataire: {message.targetLabel}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-950">{message.title}</h3>
                </div>
                <p className="shrink-0 text-xs font-semibold text-slate-400">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "2-digit",
                  }).format(new Date(message.sentAt))}
                </p>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {message.body}
              </p>
              {message.attachments.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {message.attachments.map((attachment) =>
                    attachment.signedUrl ? (
                      <a
                        className="block rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800"
                        href={attachment.signedUrl}
                        key={attachment.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Ouvrir {attachment.fileName}
                      </a>
                    ) : (
                      <p
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                        key={attachment.id}
                      >
                        {attachment.fileName}
                      </p>
                    ),
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {state.error ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
