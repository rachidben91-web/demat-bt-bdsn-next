"use server";

import { revalidatePath } from "next/cache";
import { requireOfficeWriteModule, requireTerrainAccess } from "@/lib/auth";
import { MESSAGE_ATTACHMENT_BUCKET, type MessagingTargetType } from "@/lib/messaging";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { sendTerrainPushNotification } from "@/lib/terrain-push";

export type MessagingActionState = {
  error: string | null;
  success: string | null;
};

export type TerrainMessageReadState = {
  error: string | null;
  success: string | null;
};

export type TerrainMessageReplyState = {
  error: string | null;
  messageId: string | null;
  success: string | null;
};

type MessageOwnershipRow = {
  id: string;
  sent_by_user_id: string | null;
};

type RecipientCandidate = {
  account_id: string | null;
  display_name: string;
  site: string | null;
  site_code: string | null;
  technician_id: string;
};

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const PARIS_TIMEZONE = "Europe/Paris";

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}

function parseParisDateTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error("Format de date/heure invalide.");
  }

  const [, year, month, day, hour, minute] = match;
  let utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
  );

  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(PARIS_TIMEZONE, new Date(utcGuess));
    utcGuess -= offset;
  }

  return new Date(utcGuess).toISOString();
}

function parseOptionalParisDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  return parseParisDateTime(text);
}

function normalizeTargetType(value: FormDataEntryValue | null): MessagingTargetType {
  const text = String(value ?? "").trim();

  if (text === "site" || text === "manager" || text === "technician") {
    return text;
  }

  return "agency";
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "piece-jointe";
}

async function resolveRecipients(options: {
  adminSupabase: NonNullable<ReturnType<typeof createServerSupabaseAdminClient>>;
  managerId: string | null;
  selectedTechnicianIds: string[];
  site: string | null;
  targetType: MessagingTargetType;
}) {
  let query = options.adminSupabase
    .from("office_accounts")
    .select("id, technician_id, technicians(id, display_name, site, site_code, manager_id, managers(name))")
    .eq("account_status", "active")
    .eq("can_access_terrain_app", true)
    .not("technician_id", "is", null);

  if (options.targetType === "technician") {
    if (options.selectedTechnicianIds.length === 0) {
      throw new Error("Selectionne au moins un technicien.");
    }

    query = query.in("technician_id", options.selectedTechnicianIds);
  }

  if (options.targetType === "manager") {
    if (!options.managerId) {
      throw new Error("Selectionne un manager.");
    }

    query = query.eq("technicians.manager_id", options.managerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const candidates = (data ?? []).flatMap((row) => {
    const technician = Array.isArray(row.technicians) ? row.technicians[0] : row.technicians;

    if (!technician?.id) {
      return [];
    }

    return [
      {
        account_id: typeof row.id === "string" ? row.id : null,
        display_name: String(technician.display_name ?? "Technicien"),
        site: typeof technician.site === "string" && technician.site.trim() ? technician.site : null,
        site_code:
          typeof technician.site_code === "string" && technician.site_code.trim()
            ? technician.site_code
            : null,
        technician_id: String(technician.id),
      },
    ];
  }) satisfies RecipientCandidate[];

  const filtered =
    options.targetType === "agency" || options.targetType === "site" || options.targetType === "manager"
      ? options.site
        ? candidates.filter(
            (candidate) => candidate.site_code === options.site || candidate.site === options.site,
          )
        : candidates
      : candidates;

  const unique = new Map<string, RecipientCandidate>();
  filtered.forEach((candidate) => unique.set(candidate.technician_id, candidate));

  return [...unique.values()].sort((left, right) =>
    left.display_name.localeCompare(right.display_name, "fr"),
  );
}

async function requireMessageOwnership(messageId: string) {
  const auth = await requireOfficeWriteModule("messagerie");
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Client admin Supabase indisponible. Verifie la cle service role.");
  }

  const { data, error } = await adminSupabase
    .from("office_messages")
    .select("id, sent_by_user_id")
    .eq("id", messageId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Message introuvable.");
  }

  const message = data as MessageOwnershipRow;
  const viewerOfficeAccountId = auth.officeAccount?.id ?? null;
  const isAdmin = auth.role === "admin";

  if (!isAdmin && (!viewerOfficeAccountId || message.sent_by_user_id !== viewerOfficeAccountId)) {
    throw new Error("Tu n'as pas le droit de modifier ce message.");
  }

  return {
    adminSupabase,
    auth,
    message,
  };
}

export async function sendOfficeMessageAction(
  previousState: MessagingActionState,
  formData: FormData,
): Promise<MessagingActionState> {
  void previousState;
  const auth = await requireOfficeWriteModule("messagerie");
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
    };
  }

  try {
    const targetType = normalizeTargetType(formData.get("target_type"));
    const activeSiteCode = await getActiveSiteCodeOrDefault();
    const managerId = String(formData.get("target_manager_id") ?? "").trim() || null;
    const managerName = String(formData.get("target_manager_name") ?? "").trim() || null;
    const site = String(formData.get("target_site") ?? "").trim() || null;
    const selectedTechnicianIds = formData
      .getAll("technician_id")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const title = String(formData.get("title") ?? "").replace(/\s+/g, " ").trim();
    const body = String(formData.get("body") ?? "").trim();
    const publishAt = parseOptionalParisDateTime(formData.get("publish_at"));
    const validFromInput = parseOptionalParisDateTime(formData.get("valid_from"));
    const validUntil = parseOptionalParisDateTime(formData.get("valid_until"));
    const sentByOfficeAccountId = auth.officeAccount?.id ?? null;
    const sentByEmail = auth.user?.email ?? null;

    if (!sentByOfficeAccountId) {
      throw new Error("Compte bureau introuvable pour l'envoi du message.");
    }

    if (!sentByEmail) {
      throw new Error("Utilisateur non authentifie.");
    }

    if (!title) {
      throw new Error("Le titre du message est obligatoire.");
    }

    if (!body) {
      throw new Error("Le message est obligatoire.");
    }

    if (targetType === "manager" && !managerId) {
      throw new Error("Selectionne un manager.");
    }

    const effectivePublishAt = publishAt ?? new Date().toISOString();
    const validFrom = validFromInput ?? publishAt ?? null;

    if (validFrom && validUntil && new Date(validUntil).getTime() < new Date(validFrom).getTime()) {
      throw new Error("La fin de validite doit etre apres le debut de validite.");
    }

    if (validUntil && new Date(validUntil).getTime() < new Date(effectivePublishAt).getTime()) {
      throw new Error("La fin de validite doit etre apres l'envoi programme.");
    }

    const recipients = await resolveRecipients({
      adminSupabase,
      managerId,
      selectedTechnicianIds,
      site,
      targetType,
    });

    if (recipients.length === 0) {
      throw new Error("Aucun destinataire terrain actif trouve pour cette cible.");
    }

    const targetLabel =
      targetType === "agency"
        ? site
          ? `Agence - site ${site}`
          : "Toute l'agence"
        : targetType === "site"
          ? `Groupe ${site}`
        : targetType === "manager"
            ? `Manager ${managerName ?? "non renseigne"}${site ? ` - site ${site}` : ""}`
          : recipients.map((recipient) => recipient.display_name).join(", ");

    const { data: message, error: messageError } = await adminSupabase
      .from("office_messages")
      .insert({
        body,
        publish_at: effectivePublishAt,
        sent_by_email: sentByEmail,
        sent_by_user_id: sentByOfficeAccountId,
        target_label: targetLabel,
        target_site: site ?? null,
        target_type: targetType,
        title,
        valid_from: validFrom,
        valid_until: validUntil,
      })
      .select("id")
      .single();

    if (messageError || !message?.id) {
      throw new Error(messageError?.message ?? "Creation du message impossible.");
    }

    const messageId = String(message.id);
    const { error: recipientError } = await adminSupabase.from("office_message_recipients").insert(
      recipients.map((recipient) => ({
        message_id: messageId,
        office_account_id: recipient.account_id,
        site_code: recipient.site_code ?? activeSiteCode,
        technician_id: recipient.technician_id,
        technician_name: recipient.display_name,
      })),
    );

    if (recipientError) {
      throw new Error(recipientError.message);
    }

    const attachment = formData.get("attachment");

    if (attachment instanceof File && attachment.size > 0) {
      if (attachment.size > MAX_ATTACHMENT_SIZE) {
        throw new Error("La piece jointe ne doit pas depasser 10 Mo.");
      }

      const storagePath = `${messageId}/${Date.now()}-${safeFileName(attachment.name)}`;
      const { error: uploadError } = await adminSupabase.storage
        .from(MESSAGE_ATTACHMENT_BUCKET)
        .upload(storagePath, attachment, {
          contentType: attachment.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: attachmentError } = await adminSupabase
        .from("office_message_attachments")
        .insert({
          file_name: attachment.name || "piece-jointe",
          file_size: attachment.size,
          message_id: messageId,
          mime_type: attachment.type || null,
          storage_path: storagePath,
        });

      if (attachmentError) {
        throw new Error(attachmentError.message);
      }
    }

    if (new Date(effectivePublishAt).getTime() <= Date.now()) {
      void sendTerrainPushNotification({
        notification: {
          body:
            attachment instanceof File && attachment.size > 0
              ? `Un document du bureau est disponible: ${title}`
              : title,
          data: {
            messageId,
            type:
              attachment instanceof File && attachment.size > 0 ? "document" : "message",
          },
          requireInteraction: attachment instanceof File && attachment.size > 0,
          tag:
            attachment instanceof File && attachment.size > 0
              ? `terrain-document-${messageId}`
              : `terrain-message-${messageId}`,
          title:
            attachment instanceof File && attachment.size > 0
              ? "Nouveau document terrain"
              : "Nouveau message du bureau",
          url:
            attachment instanceof File && attachment.size > 0 ? "/terrain/infos" : "/terrain/messages",
        },
        officeAccountIds: recipients
          .map((recipient) => recipient.account_id)
          .filter((accountId): accountId is string => Boolean(accountId)),
        technicianIds: recipients.map((recipient) => recipient.technician_id),
      });
    }

    revalidatePath("/messagerie");
    revalidatePath("/terrain/messages");
    revalidatePath("/terrain");

    return {
      error: null,
      success:
        new Date(effectivePublishAt).getTime() > Date.now()
          ? `Message programme pour ${recipients.length} technicien(s).`
          : `Message envoye a ${recipients.length} technicien(s).`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Envoi du message impossible.",
      success: null,
    };
  }
}

export async function markTerrainMessagesAsReadAction(
  previousState: TerrainMessageReadState,
  formData: FormData,
): Promise<TerrainMessageReadState> {
  void previousState;
  const terrainAuth = await requireTerrainAccess();
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      success: null,
    };
  }

  try {
    const recipientIds = formData
      .getAll("recipient_id")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (recipientIds.length === 0) {
      return {
        error: null,
        success: null,
      };
    }

    const officeAccountId = terrainAuth.officeAccount?.id ?? null;
    const technicianId = terrainAuth.officeAccount?.technicianId ?? null;

    if (!officeAccountId || !technicianId) {
      throw new Error("Compte terrain introuvable.");
    }

    const readAt = new Date().toISOString();
    const { error } = await adminSupabase
      .from("office_message_recipients")
      .update({ read_at: readAt })
      .in("id", recipientIds)
      .eq("technician_id", technicianId)
      .eq("office_account_id", officeAccountId)
      .is("read_at", null);

    if (error) {
      throw new Error(error.message);
    }

    return {
      error: null,
      success: "Messages marques comme lus.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Confirmation de lecture impossible.",
      success: null,
    };
  }
}

export async function replyToOfficeMessageAction(
  previousState: TerrainMessageReplyState,
  formData: FormData,
): Promise<TerrainMessageReplyState> {
  void previousState;
  const terrainAuth = await requireTerrainAccess();
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return {
      error: "Client admin Supabase indisponible. Verifie la cle service role.",
      messageId: null,
      success: null,
    };
  }

  try {
    const messageId = String(formData.get("message_id") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const officeAccountId = terrainAuth.officeAccount?.id ?? null;
    const technicianId = terrainAuth.officeAccount?.technicianId ?? null;
    const technicianName = terrainAuth.officeAccount?.fullName?.trim() || "Technicien";

    if (!messageId) {
      throw new Error("Message introuvable.");
    }

    if (!body) {
      throw new Error("La reponse est obligatoire.");
    }

    if (!officeAccountId || !technicianId) {
      throw new Error("Compte terrain introuvable.");
    }

    const { data: recipient, error: recipientError } = await adminSupabase
      .from("office_message_recipients")
      .select("id")
      .eq("message_id", messageId)
      .eq("technician_id", technicianId)
      .eq("office_account_id", officeAccountId)
      .maybeSingle();

    if (recipientError) {
      throw new Error(recipientError.message);
    }

    if (!recipient) {
      throw new Error("Tu ne peux pas repondre a ce message.");
    }

    const { error } = await adminSupabase.from("office_message_replies").insert({
      body,
      message_id: messageId,
      office_account_id: officeAccountId,
      technician_id: technicianId,
      technician_name: technicianName,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/terrain/messages");
    revalidatePath("/terrain");
    revalidatePath("/messagerie");

    return {
      error: null,
      messageId,
      success: "Reponse envoyee au bureau.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Envoi de la reponse impossible.",
      messageId: String(formData.get("message_id") ?? "").trim() || null,
      success: null,
    };
  }
}

export async function archiveOfficeMessageAction(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();

  if (!messageId) {
    throw new Error("Message introuvable.");
  }

  const { adminSupabase, auth } = await requireMessageOwnership(messageId);
  const archivedByUserId = auth.officeAccount?.id ?? null;

  const { error } = await adminSupabase
    .from("office_messages")
    .update({
      archived_at: new Date().toISOString(),
      archived_by_user_id: archivedByUserId,
    })
    .eq("id", messageId)
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/messagerie");
}

export async function deleteOfficeMessageAction(formData: FormData) {
  const messageId = String(formData.get("message_id") ?? "").trim();

  if (!messageId) {
    throw new Error("Message introuvable.");
  }

  const { adminSupabase } = await requireMessageOwnership(messageId);
  const { data: attachments, error: attachmentsError } = await adminSupabase
    .from("office_message_attachments")
    .select("storage_path")
    .eq("message_id", messageId);

  if (attachmentsError) {
    throw new Error(attachmentsError.message);
  }

  const storagePaths = (attachments ?? [])
    .map((attachment) => String(attachment.storage_path ?? "").trim())
    .filter(Boolean);

  if (storagePaths.length > 0) {
    const { error: storageError } = await adminSupabase.storage
      .from(MESSAGE_ATTACHMENT_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error } = await adminSupabase.from("office_messages").delete().eq("id", messageId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/messagerie");
  revalidatePath("/terrain/messages");
  revalidatePath("/terrain");
}
