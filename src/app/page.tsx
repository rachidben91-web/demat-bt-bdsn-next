import { DashboardWorkspace } from "@/components/dashboard-workspace";
import { getBtImportDayOverview } from "@/lib/bt-import-days";
import {
  getDefaultOfficePath,
  getReadableOfficeModules,
  requireAnyOfficeAccess,
} from "@/lib/auth";
import { getActiveSiteCodeOrDefault } from "@/lib/sites";
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
  const activeSiteCode = await getActiveSiteCodeOrDefault();
  const currentDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Europe/Paris",
  }).format(new Date());
  const headerDateTimeLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  }).format(new Date()).replace(",", " —");

  if (auth.role !== "admin" && !allowedModules.includes("dashboard")) {
    const fallbackPath = getDefaultOfficePath(auth);

    if (fallbackPath && fallbackPath !== "/") {
      redirect(fallbackPath);
    }

    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const [supportData, btOverview] = await Promise.all([
    getSupportJourneeData(resolvedSearchParams?.date, activeSiteCode),
    getBtImportDayOverview(undefined, activeSiteCode),
  ]);

  return (
    <DashboardWorkspace
      activeSiteCode={activeSiteCode}
      allowedModules={allowedModules}
      btOverview={btOverview}
      currentDateLabel={currentDateLabel}
      headerDateTimeLabel={headerDateTimeLabel}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      supportData={supportData}
      userEmail={auth.user?.email ?? null}
    />
  );
}
