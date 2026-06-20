import { requireTerrainAccess } from "@/lib/auth";
import { MESSAGE_ATTACHMENT_BUCKET } from "@/lib/messaging";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    attachmentId: string;
  }>;
};

function buildContentDisposition(fileName: string, mimeType: string | null) {
  const inlineMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];
  const dispositionType = mimeType && inlineMimeTypes.includes(mimeType) ? "inline" : "attachment";

  return `${dispositionType}; filename="${encodeURIComponent(fileName)}"`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { attachmentId } = await context.params;
  const auth = await requireTerrainAccess();
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    return new Response("Client admin Supabase indisponible.", { status: 500 });
  }

  const officeAccountId = auth.officeAccount?.id ?? null;
  const technicianId = auth.officeAccount?.technicianId ?? null;

  if (!officeAccountId || !technicianId) {
    return new Response("Compte terrain introuvable.", { status: 403 });
  }

  const { data: attachment, error: attachmentError } = await adminSupabase
    .from("office_message_attachments")
    .select("id, file_name, mime_type, storage_path, message_id")
    .eq("id", attachmentId)
    .maybeSingle();

  if (attachmentError || !attachment) {
    return new Response("Document introuvable.", { status: 404 });
  }

  const { data: recipient, error: recipientError } = await adminSupabase
    .from("office_message_recipients")
    .select("id")
    .eq("message_id", attachment.message_id)
    .eq("technician_id", technicianId)
    .or(`office_account_id.is.null,office_account_id.eq.${officeAccountId}`)
    .maybeSingle();

  if (recipientError) {
    return new Response("Verification d'acces impossible.", { status: 500 });
  }

  if (!recipient) {
    return new Response("Acces refuse.", { status: 403 });
  }

  const { data: fileData, error: fileError } = await adminSupabase.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .download(attachment.storage_path);

  if (fileError || !fileData) {
    return new Response("Telechargement impossible.", { status: 404 });
  }

  return new Response(await fileData.arrayBuffer(), {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": buildContentDisposition(
        String(attachment.file_name ?? "document"),
        attachment.mime_type,
      ),
      "Content-Type": attachment.mime_type ?? "application/octet-stream",
    },
    status: 200,
  });
}
