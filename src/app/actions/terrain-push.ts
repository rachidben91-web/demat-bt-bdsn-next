"use server";

import { requireTerrainAccess } from "@/lib/auth";
import {
  deleteTerrainPushSubscription,
  isTerrainPushConfigured,
  type SerializablePushSubscription,
  upsertTerrainPushSubscription,
} from "@/lib/terrain-push";

export type TerrainPushActionResult = {
  error: string | null;
  success: string | null;
};

export async function subscribeTerrainPushAction(input: {
  subscription: SerializablePushSubscription;
  userAgent?: string | null;
}): Promise<TerrainPushActionResult> {
  const auth = await requireTerrainAccess();

  if (!isTerrainPushConfigured()) {
    return {
      error: "Les notifications push ne sont pas configurees sur ce serveur.",
      success: null,
    };
  }

  try {
    await upsertTerrainPushSubscription({
      officeAccountId: auth.officeAccount!.id,
      subscription: input.subscription,
      technicianId: auth.officeAccount!.technicianId!,
      userAgent: input.userAgent ?? null,
    });

    return {
      error: null,
      success: "Notifications activees sur cet appareil.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Activation des notifications impossible.",
      success: null,
    };
  }
}

export async function unsubscribeTerrainPushAction(input: {
  endpoint: string;
}): Promise<TerrainPushActionResult> {
  const auth = await requireTerrainAccess();

  try {
    await deleteTerrainPushSubscription({
      endpoint: input.endpoint,
      officeAccountId: auth.officeAccount!.id,
      technicianId: auth.officeAccount!.technicianId!,
    });

    return {
      error: null,
      success: "Notifications desactivees sur cet appareil.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Desactivation des notifications impossible.",
      success: null,
    };
  }
}
