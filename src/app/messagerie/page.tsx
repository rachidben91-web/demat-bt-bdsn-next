import { MessagingWorkspace } from "@/components/messaging-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getMessagingTechnicianTargets, getRecentOfficeMessages } from "@/lib/messaging";
import { getSupportJourneeData } from "@/lib/support-journee";

type MessageriePageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function MessageriePage({ searchParams }: MessageriePageProps) {
  const auth = await requireOfficeModule("messagerie");
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const [data, messageTargets, recentMessages] = await Promise.all([
    getSupportJourneeData(resolvedSearchParams?.date),
    getMessagingTechnicianTargets(),
    getRecentOfficeMessages({
      viewerOfficeAccountId: auth.officeAccount?.id ?? null,
      viewerRole: auth.role,
    }),
  ]);
  const headerDateTimeLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  }).format(new Date()).replace(",", " -");

  return (
    <MessagingWorkspace
      allowedModules={allowedModules}
      data={data}
      headerDateTimeLabel={headerDateTimeLabel}
      isSuperAdmin={auth.role === "admin"}
      messageTargets={messageTargets}
      recentMessages={recentMessages}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
    />
  );
}
