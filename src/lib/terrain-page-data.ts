import { getTechnicianById } from "@/lib/admin-technicians";
import { requireTerrainAccess } from "@/lib/auth";
import { getLatestMobileDispatchForTechnician } from "@/lib/mobile-dispatch";

export async function getTerrainPageData() {
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

  return {
    auth,
    currentDateLabel,
    mobileDispatch,
    technician,
    terrainAccount,
  };
}
