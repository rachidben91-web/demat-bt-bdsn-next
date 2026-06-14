import { TerrainWorkspace } from "@/components/terrain-workspace";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainDayPage() {
  const { auth, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();

  return (
    <TerrainWorkspace
      currentDateLabel={currentDateLabel}
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
