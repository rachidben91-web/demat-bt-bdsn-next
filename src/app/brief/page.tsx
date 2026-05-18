import { BriefWorkspace } from "@/components/brief-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getBtImportDayOverview } from "@/lib/bt-import-days";
import { getSupportWeatherBundle } from "@/lib/weather";

type BriefPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function BriefPage({ searchParams }: BriefPageProps) {
  const auth = await requireOfficeModule("brief");
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const selectedDate = resolvedSearchParams?.date ?? new Date().toISOString().slice(0, 10);
  const [data, weatherBundle] = await Promise.all([
    getBtImportDayOverview(resolvedSearchParams?.date),
    getSupportWeatherBundle(selectedDate),
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
  }).format(new Date()).replace(",", " —");

  return (
    <BriefWorkspace
      allowedModules={allowedModules}
      data={data}
      headerDateTimeLabel={headerDateTimeLabel}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      userEmail={auth.user?.email ?? null}
      weatherGeneratedAtLabel={weatherBundle.generatedAtLabel}
      weatherZones={weatherBundle.headerZones}
    />
  );
}
