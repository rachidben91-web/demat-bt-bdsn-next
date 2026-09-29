import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { SiteCode } from "@/lib/site-options";

export type OfficeAccountSession = {
  sessionId: string;
  authUserId: string;
  officeAccountId: string;
  fullName: string;
  email: string;
  createdAt: string;
  lastActivityAt: string;
  userAgent: string | null;
};

type OfficeAccountSessionRow = {
  session_id: string;
  auth_user_id: string;
  office_account_id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_activity_at: string;
  user_agent: string | null;
};

export type OfficeAccountSessionOverview = {
  isPreview: boolean;
  sessions: OfficeAccountSession[];
};

const previewSessions: OfficeAccountSession[] = [
  {
    sessionId: "preview-mounir-chrome",
    authUserId: "preview-mounir",
    officeAccountId: "preview-account-mounir",
    fullName: "Mounir B.",
    email: "mounir.b@demat-bt.local",
    createdAt: "2026-09-29T06:30:00.000Z",
    lastActivityAt: "2026-09-29T08:22:00.000Z",
    userAgent: "Mozilla/5.0 Chrome/140.0 Windows",
  },
  {
    sessionId: "preview-mounir-mobile",
    authUserId: "preview-mounir",
    officeAccountId: "preview-account-mounir",
    fullName: "Mounir B.",
    email: "mounir.b@demat-bt.local",
    createdAt: "2026-09-29T06:35:00.000Z",
    lastActivityAt: "2026-09-29T07:48:00.000Z",
    userAgent: "Mozilla/5.0 Mobile Safari/604.1 iPhone",
  },
  {
    sessionId: "preview-sarah-edge",
    authUserId: "preview-sarah",
    officeAccountId: "preview-account-sarah",
    fullName: "Sarah M.",
    email: "sarah.m@demat-bt.local",
    createdAt: "2026-09-28T12:10:00.000Z",
    lastActivityAt: "2026-09-29T08:05:00.000Z",
    userAgent: "Mozilla/5.0 Edg/140.0 Windows",
  },
];

function toOfficeAccountSession(row: OfficeAccountSessionRow): OfficeAccountSession {
  return {
    sessionId: row.session_id,
    authUserId: row.auth_user_id,
    officeAccountId: row.office_account_id,
    fullName: row.full_name,
    email: row.email,
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    userAgent: row.user_agent,
  };
}

export async function getOfficeAccountSessionOverview(
  siteCode: SiteCode,
): Promise<OfficeAccountSessionOverview> {
  if (!isSupabaseConfigured()) {
    return { isPreview: true, sessions: previewSessions };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("list_office_account_sessions", {
      p_site_code: siteCode,
    });

    if (error) {
      return { isPreview: true, sessions: previewSessions };
    }

    return {
      isPreview: false,
      sessions: ((data ?? []) as OfficeAccountSessionRow[]).map(toOfficeAccountSession),
    };
  } catch {
    return { isPreview: true, sessions: previewSessions };
  }
}
