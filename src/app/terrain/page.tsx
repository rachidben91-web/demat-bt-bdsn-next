import { TerrainHub } from "@/components/terrain-hub";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainPage() {
  const { auth, currentDateKey, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();

  return (
    <TerrainHub
      currentDateKey={currentDateKey}
      currentDateLabel={currentDateLabel}
      detailHref="/terrain/journee"
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
