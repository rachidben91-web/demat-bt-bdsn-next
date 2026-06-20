import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export type SerializablePushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

export type TerrainPushNotificationPayload = {
  badge?: string;
  body: string;
  data?: Record<string, unknown>;
  icon?: string;
  requireInteraction?: boolean;
  tag?: string;
  title: string;
  url: string;
};

type StoredSubscriptionRow = {
  auth: string;
  endpoint: string;
  id: string;
  office_account_id: string | null;
  p256dh: string;
  technician_id: string | null;
};

function getPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:no-reply@demat-bt.local";

  if (!publicKey || !privateKey) {
    return null;
  }

  return {
    privateKey,
    publicKey,
    subject,
  };
}

export function isTerrainPushConfigured() {
  return Boolean(getPushConfig());
}

async function getWebPushClient() {
  const config = getPushConfig();

  if (!config) {
    return null;
  }

  const webPushModule = await import("web-push");
  const webPush = webPushModule.default;

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

  return webPush;
}

export async function upsertTerrainPushSubscription(options: {
  officeAccountId: string;
  subscription: SerializablePushSubscription;
  technicianId: string;
  userAgent?: string | null;
}) {
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Client admin Supabase indisponible. Verifie la cle service role.");
  }

  const endpoint = options.subscription.endpoint.trim();
  const p256dh = options.subscription.keys.p256dh.trim();
  const auth = options.subscription.keys.auth.trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Abonnement push incomplet.");
  }

  const { error } = await adminSupabase.from("terrain_push_subscriptions").upsert(
    {
      auth,
      endpoint,
      last_seen_at: new Date().toISOString(),
      office_account_id: options.officeAccountId,
      p256dh,
      scope: "terrain",
      technician_id: options.technicianId,
      updated_at: new Date().toISOString(),
      user_agent: options.userAgent ?? null,
    },
    {
      onConflict: "endpoint",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTerrainPushSubscription(options: {
  endpoint: string;
  officeAccountId?: string | null;
  technicianId?: string | null;
}) {
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Client admin Supabase indisponible. Verifie la cle service role.");
  }

  let query = adminSupabase
    .from("terrain_push_subscriptions")
    .delete()
    .eq("endpoint", options.endpoint.trim());

  if (options.officeAccountId) {
    query = query.eq("office_account_id", options.officeAccountId);
  }

  if (options.technicianId) {
    query = query.eq("technician_id", options.technicianId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

async function getRecipientSubscriptions(options: {
  officeAccountIds?: string[];
  technicianIds?: string[];
}) {
  const adminSupabase = createServerSupabaseAdminClient();

  if (!adminSupabase) {
    throw new Error("Client admin Supabase indisponible. Verifie la cle service role.");
  }

  const officeAccountIds = [...new Set((options.officeAccountIds ?? []).filter(Boolean))];
  const technicianIds = [...new Set((options.technicianIds ?? []).filter(Boolean))];

  if (officeAccountIds.length === 0 && technicianIds.length === 0) {
    return [] as StoredSubscriptionRow[];
  }

  const queries = [];

  if (officeAccountIds.length > 0) {
    queries.push(
      adminSupabase
        .from("terrain_push_subscriptions")
        .select("id, endpoint, p256dh, auth, office_account_id, technician_id")
        .eq("scope", "terrain")
        .in("office_account_id", officeAccountIds),
    );
  }

  if (technicianIds.length > 0) {
    queries.push(
      adminSupabase
        .from("terrain_push_subscriptions")
        .select("id, endpoint, p256dh, auth, office_account_id, technician_id")
        .eq("scope", "terrain")
        .in("technician_id", technicianIds),
    );
  }

  const results = await Promise.all(queries);
  const rows = results.flatMap((result) => {
    if (result.error || !result.data) {
      return [];
    }

    return result.data as StoredSubscriptionRow[];
  });

  return [...new Map(rows.map((row) => [row.endpoint, row])).values()];
}

export async function sendTerrainPushNotification(options: {
  notification: TerrainPushNotificationPayload;
  officeAccountIds?: string[];
  technicianIds?: string[];
}) {
  const webPush = await getWebPushClient();

  if (!webPush) {
    return {
      deletedEndpoints: [] as string[],
      sentCount: 0,
      skipped: true,
    };
  }

  const subscriptions = await getRecipientSubscriptions({
    officeAccountIds: options.officeAccountIds,
    technicianIds: options.technicianIds,
  });

  if (subscriptions.length === 0) {
    return {
      deletedEndpoints: [] as string[],
      sentCount: 0,
      skipped: false,
    };
  }

  const payload = JSON.stringify({
    badge: options.notification.badge ?? "/terrain-icon-192.png",
    body: options.notification.body,
    data: options.notification.data ?? {},
    icon: options.notification.icon ?? "/terrain-icon-192.png",
    requireInteraction: options.notification.requireInteraction ?? false,
    tag: options.notification.tag ?? undefined,
    title: options.notification.title,
    url: options.notification.url,
  });

  const deletedEndpoints: string[] = [];
  let sentCount = 0;

  await Promise.allSettled(
    subscriptions.map(async (row) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              auth: row.auth,
              p256dh: row.p256dh,
            },
          },
          payload,
        );
        sentCount += 1;
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          deletedEndpoints.push(row.endpoint);
        } else {
          console.error("Terrain push send failed", {
            endpoint: row.endpoint,
            error,
          });
        }
      }
    }),
  );

  if (deletedEndpoints.length > 0) {
    const adminSupabase = createServerSupabaseAdminClient();

    if (adminSupabase) {
      await adminSupabase
        .from("terrain_push_subscriptions")
        .delete()
        .in("endpoint", deletedEndpoints);
    }
  }

  return {
    deletedEndpoints,
    sentCount,
    skipped: false,
  };
}
