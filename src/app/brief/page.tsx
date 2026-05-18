import { BriefWorkspace } from "@/components/brief-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getBtImportDayOverview } from "@/lib/bt-import-days";

type BriefPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function BriefPage({ searchParams }: BriefPageProps) {
  const auth = await requireOfficeModule("support_journee");
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const data = await getBtImportDayOverview(resolvedSearchParams?.date);

  return (
    <BriefWorkspace
      allowedModules={allowedModules}
      data={data}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
    />
  );
}
