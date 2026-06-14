import { TerrainWorkspace } from "@/components/terrain-workspace";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainDayPage() {
  const { auth, currentDateKey, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();

  return (
    <TerrainWorkspace
      currentDateKey={currentDateKey}
      currentDateLabel={currentDateLabel}
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
