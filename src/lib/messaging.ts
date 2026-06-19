import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { matchesSite, type SiteCode } from "@/lib/site-options";

const MESSAGE_ATTACHMENT_BUCKET = "office-message-attachments";

export type MessagingTargetType = "agency" | "site" | "manager" | "technician";

export type MessagingTechnicianTarget = {
  id: string;
  managerId: string | null;
  managerName: string | null;
  name: string;
  site: string | null;
};

export type OfficeMessageAttachment = {
  fileName: string;
  fileSize: number;
  id: string;
  mimeType: string | null;
  signedUrl?: string | null;
  storagePath: string;
};

export type OfficeMessageRecipient = {
  id: string;
  readAt: string | null;
  siteCode: string | null;
  technicianId: string;
  technicianName: string;
};

export type OfficeMessageReply = {
  body: string;
  id: string;
  sentAt: string;
  technicianId: string;
  technicianName: string;
};

export type OfficeMessageSummary = {
  attachments: OfficeMessageAttachment[];
  archivedAt?: string | null;
  body: string;
  currentReadAt?: string | null;
  currentRecipientId?: string | null;
  id: string;
  publishAt: string;
  recipients: OfficeMessageRecipient[];
  replies: OfficeMessageReply[];
  sentAt: string;
  sentByEmail: string;
  sentByName?: string | null;
  status: "active" | "expired" | "scheduled";
  targetLabel: string;
  targetSite: string | null;
  targetType: MessagingTargetType;
  title: string;
  validFrom: string | null;
  validUntil: string | null;
};

type MessageRow = {
  id: string;
  title: string;
  body: string;
  target_type: MessagingTargetType;
  target_label: string;
  target_site: string | null;
  archived_at?: string | null;
  publish_at?: string | null;
  sent_by_email: string;
  sent_by_user_id?: string | null;
  sent_at: string;
  valid_from?: string | null;
  valid_until?: string | null;
  office_accounts?: OfficeAccountRelationRow;
  office_message_attachments: AttachmentRow[] | null;
  office_message_recipients: RecipientRow[] | null;
  office_message_replies?: ReplyRow[] | null;
};

type AttachmentRow = {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
};

type RecipientRow = {
  id: string;
  read_at: string | null;
  site_code: string | null;
  technician_id: string;
  technician_name: string;
};

type RecipientWithMessageRow = RecipientRow & {
  office_messages: MessageRow | MessageRow[] | null;
};

type ReplyRow = {
  body: string;
  id: string;
  message_id?: string;
  sent_at: string;
  technician_id: string;
  technician_name: string;
};

type ManagerRelationRow =
  | { name: string | null }
  | { name: string | null }[]
  | null;

type OfficeAccountRelationRow =
  | { full_name: string | null }
  | { full_name: string | null }[]
  | null;

async function getServerReader() {
  const adminSupabase = createServerSupabaseAdminClient();

  if (adminSupabase) {
    return adminSupabase;
  }

  return createServerSupabaseClient();
}

function mapAttachment(row: AttachmentRow): OfficeMessageAttachment {
  return {
    fileName: row.file_name,
    fileSize: Number(row.file_size ?? 0),
    id: row.id,
    mimeType: row.mime_type,
    storagePath: row.storage_path,
  };
}

function mapRecipient(row: RecipientRow): OfficeMessageRecipient {
  return {
    id: row.id,
    readAt: row.read_at,
    siteCode: row.site_code,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
  };
}

function mapReply(row: ReplyRow): OfficeMessageReply {
  return {
    body: row.body,
    id: row.id,
    sentAt: row.sent_at,
    technicianId: row.technician_id,
    technicianName: row.technician_name,
  };
}

function resolveMessageStatus(row: MessageRow) {
  const now = Date.now();
  const publishAtMs = new Date(row.publish_at ?? row.sent_at).getTime();
  const validFromMs = row.valid_from ? new Date(row.valid_from).getTime() : null;
  const validUntilMs = row.valid_until ? new Date(row.valid_until).getTime() : null;

  if (publishAtMs > now || (validFromMs !== null && validFromMs > now)) {
    return "scheduled" as const;
  }

  if (validUntilMs !== null && validUntilMs < now) {
    return "expired" as const;
  }

  return "active" as const;
}

function isVisibleOnTerrain(row: MessageRow) {
  return resolveMessageStatus(row) === "active";
}

function mapMessage(row: MessageRow): OfficeMessageSummary {
  const senderAccount = row.office_accounts;
  const sentByName = Array.isArray(senderAccount)
    ? (senderAccount[0]?.full_name ?? null)
    : typeof senderAccount?.full_name === "string"
      ? senderAccount.full_name
      : null;

  return {
    attachments: (row.office_message_attachments ?? []).map(mapAttachment),
    archivedAt: row.archived_at ?? null,
    body: row.body,
    id: row.id,
    publishAt: row.publish_at ?? row.sent_at,
    recipients: (row.office_message_recipients ?? []).map(mapRecipient),
    replies: (row.office_message_replies ?? []).map(mapReply),
    sentAt: row.sent_at,
    sentByEmail: row.sent_by_email,
    sentByName,
    status: resolveMessageStatus(row),
    targetLabel: row.target_label,
    targetSite: row.target_site,
    targetType: row.target_type,
    title: row.title,
    validFrom: row.valid_from ?? null,
    validUntil: row.valid_until ?? null,
  };
}

async function signAttachments(
  attachments: OfficeMessageAttachment[],
): Promise<OfficeMessageAttachment[]> {
  if (attachments.length === 0) {
    return attachments;
  }

  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return attachments;
  }

  const signed = await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await adminSupabase.storage
        .from(MESSAGE_ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.storagePath, 30 * 60);

      return {
        ...attachment,
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );

  return signed;
}

export async function getMessagingTechnicianTargets(siteCode?: SiteCode): Promise<MessagingTechnicianTarget[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await getServerReader();
  let query = supabase
    .from("technicians")
    .select("id, display_name, site, site_code, manager_id, managers(name), sort_order")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  if (siteCode) {
    query = query.eq("site_code", siteCode);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data
    .filter((row) => !siteCode || row.site_code === siteCode || matchesSite(String(row.site ?? ""), siteCode))
    .map((row) => {
    const managers = (row.managers ?? null) as ManagerRelationRow;

    return {
      id: String(row.id),
      managerId: typeof row.manager_id === "string" ? row.manager_id : null,
      managerName:
        Array.isArray(managers)
          ? (managers[0]?.name ?? null)
          : typeof managers?.name === "string"
            ? managers.name
            : null,
      name: String(row.display_name ?? ""),
      site:
        typeof row.site_code === "string" && row.site_code.trim()
          ? row.site_code
          : typeof row.site === "string" && row.site.trim()
            ? row.site
            : null,
    };
  });
}

export async function getRecentOfficeMessages(options?: {
  viewerOfficeAccountId?: string | null;
  viewerRole?: "admin" | "manager" | "agent" | null;
  limit?: number;
}): Promise<OfficeMessageSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const limit = options?.limit ?? 8;
  const supabase = await getServerReader();
  let query = supabase
    .from("office_messages")
    .select(
      "id, title, body, target_type, target_label, target_site, archived_at, publish_at, sent_by_email, sent_by_user_id, sent_at, valid_from, valid_until, office_accounts!office_messages_sent_by_user_id_fkey(full_name), office_message_recipients(id, read_at, site_code, technician_id, technician_name), office_message_attachments(id, file_name, file_size, mime_type, storage_path), office_message_replies(id, technician_id, technician_name, body, sent_at)",
    )
    .order("publish_at", { ascending: false })
    .order("sent_at", { ascending: false })
    .is("archived_at", null)
    .limit(limit);

  if (options?.viewerRole !== "admin") {
    if (!options?.viewerOfficeAccountId) {
      return [];
    }

    query = query.eq("sent_by_user_id", options.viewerOfficeAccountId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const messages = (data as MessageRow[]).map(mapMessage);

  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      attachments: await signAttachments(message.attachments),
    })),
  );
}

export async function getTerrainMessageInbox(
  technicianId: string,
  officeAccountId?: string | null,
): Promise<OfficeMessageSummary[]> {
  if (!isSupabaseConfigured() || !technicianId) {
    return [];
  }

  const supabase = await getServerReader();
  let query = supabase
    .from("office_message_recipients")
    .select(
      "id, read_at, site_code, technician_id, technician_name, office_messages(id, title, body, target_type, target_label, target_site, archived_at, publish_at, sent_by_email, sent_by_user_id, sent_at, valid_from, valid_until, office_accounts!office_messages_sent_by_user_id_fkey(full_name), office_message_attachments(id, file_name, file_size, mime_type, storage_path), office_message_recipients(id, read_at, site_code, technician_id, technician_name))",
    )
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (officeAccountId) {
    query = query.or(`office_account_id.is.null,office_account_id.eq.${officeAccountId}`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const messages = (data as RecipientWithMessageRow[]).reduce<OfficeMessageSummary[]>(
    (accumulator, row) => {
      const message = Array.isArray(row.office_messages)
        ? row.office_messages[0]
        : row.office_messages;

      if (!message) {
        return accumulator;
      }

      if (!isVisibleOnTerrain(message)) {
        return accumulator;
      }

      accumulator.push({
        ...mapMessage(message),
        currentReadAt: row.read_at,
        currentRecipientId: row.id,
      });

      return accumulator;
    },
    [],
  );

  const messageIds = [...new Set(messages.map((message) => message.id))];
  let repliesByMessageId = new Map<string, OfficeMessageReply[]>();

  if (messageIds.length > 0) {
    const { data: repliesData, error: repliesError } = await supabase
      .from("office_message_replies")
      .select("id, message_id, technician_id, technician_name, body, sent_at")
      .in("message_id", messageIds)
      .eq("technician_id", technicianId)
      .order("sent_at", { ascending: true });

    if (!repliesError && repliesData) {
      repliesByMessageId = (repliesData as ReplyRow[]).reduce((accumulator, row) => {
        const currentReplies = accumulator.get(String(row.message_id ?? "")) ?? [];
        currentReplies.push(mapReply(row));
        accumulator.set(String(row.message_id ?? ""), currentReplies);
        return accumulator;
      }, new Map<string, OfficeMessageReply[]>());
    }
  }

  return Promise.all(
    messages.map(async (message) => {
      const signedAttachments = await signAttachments(message.attachments);
      return {
        ...message,
        attachments: signedAttachments,
        replies: repliesByMessageId.get(message.id) ?? [],
      };
    }),
  );
}

export async function getUnreadTerrainMessageCount(
  technicianId: string,
  officeAccountId?: string | null,
): Promise<number> {
  if (!isSupabaseConfigured() || !technicianId) {
    return 0;
  }

  const supabase = await getServerReader();
  let query = supabase
    .from("office_message_recipients")
    .select(
      "id, read_at, office_messages(id, publish_at, sent_at, valid_from, valid_until, target_type, target_label, target_site, body, title, sent_by_email, office_message_attachments(id, file_name, file_size, mime_type, storage_path), office_message_recipients(id, read_at, site_code, technician_id, technician_name))",
    )
    .eq("technician_id", technicianId)
    .is("read_at", null);

  if (officeAccountId) {
    query = query.or(`office_account_id.is.null,office_account_id.eq.${officeAccountId}`);
  }

  const { data, error } = await query;

  if (error) {
    return 0;
  }

  return ((data ?? []) as RecipientWithMessageRow[]).filter((row) => {
    const message = Array.isArray(row.office_messages)
      ? row.office_messages[0]
      : row.office_messages;

    return Boolean(message && isVisibleOnTerrain(message));
  }).length;
}

export { MESSAGE_ATTACHMENT_BUCKET };
