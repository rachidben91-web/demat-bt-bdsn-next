import { getTechnicianById } from "@/lib/admin-technicians";
import { requireTerrainAccess } from "@/lib/auth";
import { getLatestMobileDispatchForTechnician } from "@/lib/mobile-dispatch";
import { toParisDateKey } from "@/lib/terrain-ui";

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
  const currentDateKey = toParisDateKey(new Date());

  return {
    auth,
    currentDateKey,
    currentDateLabel,
    mobileDispatch,
    technician,
    terrainAccount,
  };
}
