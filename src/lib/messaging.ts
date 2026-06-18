import {
  createServerSupabaseAdminClient,
  createServerSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

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

export type OfficeMessageSummary = {
  attachments: OfficeMessageAttachment[];
  body: string;
  currentReadAt?: string | null;
  currentRecipientId?: string | null;
  id: string;
  recipients: OfficeMessageRecipient[];
  sentAt: string;
  sentByEmail: string;
  sentByName?: string | null;
  targetLabel: string;
  targetSite: string | null;
  targetType: MessagingTargetType;
  title: string;
};

type MessageRow = {
  id: string;
  title: string;
  body: string;
  target_type: MessagingTargetType;
  target_label: string;
  target_site: string | null;
  sent_by_email: string;
  sent_at: string;
  office_accounts?: OfficeAccountRelationRow;
  office_message_attachments: AttachmentRow[] | null;
  office_message_recipients: RecipientRow[] | null;
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

function mapMessage(row: MessageRow): OfficeMessageSummary {
  const senderAccount = row.office_accounts;
  const sentByName = Array.isArray(senderAccount)
    ? (senderAccount[0]?.full_name ?? null)
    : typeof senderAccount?.full_name === "string"
      ? senderAccount.full_name
      : null;

  return {
    attachments: (row.office_message_attachments ?? []).map(mapAttachment),
    body: row.body,
    id: row.id,
    recipients: (row.office_message_recipients ?? []).map(mapRecipient),
    sentAt: row.sent_at,
    sentByEmail: row.sent_by_email,
    sentByName,
    targetLabel: row.target_label,
    targetSite: row.target_site,
    targetType: row.target_type,
    title: row.title,
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

export async function getMessagingTechnicianTargets(): Promise<MessagingTechnicianTarget[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await getServerReader();
  const { data, error } = await supabase
    .from("technicians")
    .select("id, display_name, site, manager_id, managers(name), sort_order")
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
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
      site: typeof row.site === "string" && row.site.trim() ? row.site : null,
    };
  });
}

export async function getRecentOfficeMessages(limit = 8): Promise<OfficeMessageSummary[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await getServerReader();
  const { data, error } = await supabase
    .from("office_messages")
    .select(
      "id, title, body, target_type, target_label, target_site, sent_by_email, sent_at, office_accounts!office_messages_sent_by_user_id_fkey(full_name), office_message_recipients(id, read_at, site_code, technician_id, technician_name), office_message_attachments(id, file_name, file_size, mime_type, storage_path)",
    )
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as MessageRow[]).map(mapMessage);
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
      "id, read_at, site_code, technician_id, technician_name, office_messages(id, title, body, target_type, target_label, target_site, sent_by_email, sent_at, office_accounts!office_messages_sent_by_user_id_fkey(full_name), office_message_attachments(id, file_name, file_size, mime_type, storage_path), office_message_recipients(id, read_at, site_code, technician_id, technician_name))",
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

      accumulator.push({
        ...mapMessage(message),
        currentReadAt: row.read_at,
        currentRecipientId: row.id,
      });

      return accumulator;
    },
    [],
  );

  return Promise.all(
    messages.map(async (message) => ({
      ...message,
      attachments: await signAttachments(message.attachments),
    })),
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
    .select("id", { count: "exact", head: true })
    .eq("technician_id", technicianId)
    .is("read_at", null);

  if (officeAccountId) {
    query = query.or(`office_account_id.is.null,office_account_id.eq.${officeAccountId}`);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export { MESSAGE_ATTACHMENT_BUCKET };
