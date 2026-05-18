import { TerrainWorkspace } from "@/components/terrain-workspace";
import { getTechnicianById } from "@/lib/admin-technicians";
import { requireTerrainAccess } from "@/lib/auth";

export default async function TerrainPage() {
  const auth = await requireTerrainAccess();
  const terrainAccount = auth.officeAccount!;
  const technician = terrainAccount.technicianId
    ? await getTechnicianById(terrainAccount.technicianId)
    : null;
  const currentDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Europe/Paris",
  }).format(new Date());

  return (
    <TerrainWorkspace
      currentDateLabel={currentDateLabel}
      loginIdentifier={terrainAccount.loginIdentifier}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
