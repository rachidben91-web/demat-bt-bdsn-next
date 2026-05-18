import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { getBtImportDayOverview } from "@/lib/bt-import-days";
import {
  getDefaultOfficePath,
  getReadableOfficeModules,
  requireAnyOfficeAccess,
} from "@/lib/auth";
import { getSupportJourneeData } from "@/lib/support-journee";
import { redirect } from "next/navigation";

type HomeProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const auth = await requireAnyOfficeAccess();
  const allowedModules = getReadableOfficeModules(auth);

  if (auth.role !== "admin" && !allowedModules.includes("dashboard")) {
    const fallbackPath = getDefaultOfficePath(auth);

    if (fallbackPath && fallbackPath !== "/") {
      redirect(fallbackPath);
    }

    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const [supportData, btOverview] = await Promise.all([
    getSupportJourneeData(resolvedSearchParams?.date),
    getBtImportDayOverview(),
  ]);

  return (
    <DashboardWorkspace
      allowedModules={allowedModules}
      btOverview={btOverview}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      supportData={supportData}
      userEmail={auth.user?.email ?? null}
    />
  );
}
