import { TerrainInfosView } from "@/components/terrain-infos-view";
import { getTerrainMessageInbox } from "@/lib/messaging";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainInfosPage() {
  const { auth, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();
  const officeMessages = await getTerrainMessageInbox(
    terrainAccount.technicianId!,
    terrainAccount.id,
  );

  return (
    <TerrainInfosView
      currentDateLabel={currentDateLabel}
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      officeMessages={officeMessages}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
