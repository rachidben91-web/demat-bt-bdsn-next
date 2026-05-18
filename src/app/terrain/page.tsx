import { TerrainWorkspace } from "@/components/terrain-workspace";
import { getTechnicianById } from "@/lib/admin-technicians";
import { requireTerrainAccess } from "@/lib/auth";
import { getLatestMobileDispatchForTechnician } from "@/lib/mobile-dispatch";

export default async function TerrainPage() {
  const auth = await requireTerrainAccess();
  const terrainAccount = auth.officeAccount!;
  const [technician, mobileDispatch] = await Promise.all([
    terrainAccount.technicianId ? getTechnicianById(terrainAccount.technicianId) : null,
    terrainAccount.technicianId
      ? getLatestMobileDispatchForTechnician(
          terrainAccount.technicianId,
          terrainAccount.id,
        )
      : null,
  ]);
  const currentDateLabel = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: "Europe/Paris",
  }).format(new Date());

  return (
    <TerrainWorkspace
      currentDateLabel={currentDateLabel}
      loginIdentifier={terrainAccount.loginIdentifier}
      mobileDispatch={mobileDispatch}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
