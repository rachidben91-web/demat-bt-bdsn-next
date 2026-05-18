import { SupportJourneeWorkspace } from "@/components/support-journee-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getSupportJourneeData } from "@/lib/support-journee";

type SupportPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const auth = await requireOfficeModule("support_journee");
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const data = await getSupportJourneeData(resolvedSearchParams?.date);

  return (
    <SupportJourneeWorkspace
      allowedModules={allowedModules}
      data={data}
      isSuperAdmin={auth.role === "admin"}
      key={data.supportSummary.dayId ?? data.supportSummary.dayDate ?? "support-journee"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
    />
  );
}
