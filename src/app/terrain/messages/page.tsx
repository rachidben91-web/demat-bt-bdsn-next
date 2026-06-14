import { TerrainMessagesView } from "@/components/terrain-messages-view";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainMessagesPage() {
  const { auth, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();

  return (
    <TerrainMessagesView
      currentDateLabel={currentDateLabel}
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
