import { ReferentWorkspace } from "@/components/referent-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getBtImportDayOverview } from "@/lib/bt-import-days";

type ReferentPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function ReferentPage({ searchParams }: ReferentPageProps) {
  const auth = await requireOfficeModule("referent");
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const data = await getBtImportDayOverview(resolvedSearchParams?.date);

  return (
    <ReferentWorkspace
      allowedModules={allowedModules}
      data={data}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
    />
  );
}
