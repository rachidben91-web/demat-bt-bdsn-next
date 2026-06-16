import { BriefWorkspace } from "@/components/brief-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getBtImportDayOverview } from "@/lib/bt-import-days";
import { getSupportTechnicians } from "@/lib/support-journee";
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
  const [data, technicians, weatherBundle] = await Promise.all([
    getBtImportDayOverview(resolvedSearchParams?.date),
    getSupportTechnicians(),
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
      technicians={technicians.map((technician) => ({
        id: technician.id,
        label: technician.name,
        nni: technician.nni,
      }))}
      userEmail={auth.user?.email ?? null}
      weatherGeneratedAtLabel={weatherBundle.generatedAtLabel}
      weatherZones={weatherBundle.headerZones}
    />
  );
}
