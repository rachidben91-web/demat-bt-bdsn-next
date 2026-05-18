import { ReferentWorkspace } from "@/components/referent-workspace";
import { getReadableOfficeModules, requireOfficeModule } from "@/lib/auth";
import { getBtImportDayOverview } from "@/lib/bt-import-days";
import { getSupportJourneeData } from "@/lib/support-journee";
import { getSupportWeatherBundle } from "@/lib/weather";

type ReferentPageProps = {
  searchParams?: Promise<{
    date?: string;
  }>;
};

export default async function ReferentPage({ searchParams }: ReferentPageProps) {
  const auth = await requireOfficeModule("referent");
  const allowedModules = getReadableOfficeModules(auth);
  const resolvedSearchParams = await searchParams;
  const selectedDate = resolvedSearchParams?.date ?? new Date().toISOString().slice(0, 10);
  const [data, supportData, weatherBundle] = await Promise.all([
    getBtImportDayOverview(resolvedSearchParams?.date),
    getSupportJourneeData(selectedDate),
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
    <ReferentWorkspace
      allowedModules={allowedModules}
      data={data}
      headerDateTimeLabel={headerDateTimeLabel}
      isSuperAdmin={auth.role === "admin"}
      role={auth.role ?? auth.officeAccount?.officeRole ?? null}
      technicians={supportData.technicians.map((technician) => ({
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
