import { TerrainHub } from "@/components/terrain-hub";
import { getTerrainMessageInbox } from "@/lib/messaging";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainPage() {
  const { auth, currentDateKey, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();
  const officeMessages = await getTerrainMessageInbox(
    terrainAccount.technicianId!,
    terrainAccount.id,
  );

  return (
    <TerrainHub
      currentDateKey={currentDateKey}
      currentDateLabel={currentDateLabel}
      detailHref="/terrain/journee"
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      officeMessages={officeMessages}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
