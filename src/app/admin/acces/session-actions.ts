"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthContext, hasOfficeModuleWriteAccess } from "@/lib/auth";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SessionManagementActionState = {
  error: string | null;
  success: string | null;
};

function invalidState(error: string): SessionManagementActionState {
  return { error, success: null };
}

async function requireSessionManagementAccess() {
  const auth = await getCurrentAuthContext();

  if (auth.configured && !auth.user) {
    throw new Error("Session invalide. Reconnecte-toi puis recommence.");
  }

  if (auth.configured && !hasOfficeModuleWriteAccess(auth, "office_access")) {
    throw new Error("Le module Acces en ecriture est requis pour cette action.");
  }

  return auth;
}

export async function revokeOfficeAccountSessionsAction(
  targetUserId: string,
  sessionId: string | null,
): Promise<SessionManagementActionState> {
  if (!isSupabaseConfigured()) {
    return invalidState("La deconnexion est indisponible sans configuration Supabase.");
  }

  try {
    await requireSessionManagementAccess();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("revoke_office_account_sessions", {
      p_target_user_id: targetUserId,
      p_session_id: sessionId,
    });

    if (error) {
      throw new Error(error.message);
    }

    const revokedCount = Number(data ?? 0);
    if (!Number.isInteger(revokedCount) || revokedCount < 1) {
      throw new Error("Aucune session valide a deconnecter.");
    }

    revalidatePath("/admin/acces");

    return {
      error: null,
      success:
        revokedCount === 1
          ? "La session a ete deconnectee."
          : `${revokedCount} sessions ont ete deconnectees.`,
    };
  } catch (error) {
    return invalidState(
      error instanceof Error ? error.message : "La deconnexion a echoue.",
    );
  }
}
