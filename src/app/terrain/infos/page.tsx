import { TerrainInfosView } from "@/components/terrain-infos-view";
import { getTerrainPageData } from "@/lib/terrain-page-data";

export default async function TerrainInfosPage() {
  const { auth, currentDateLabel, mobileDispatch, technician, terrainAccount } =
    await getTerrainPageData();

  return (
    <TerrainInfosView
      currentDateLabel={currentDateLabel}
      displayName={terrainAccount.fullName}
      mobileDispatch={mobileDispatch}
      technician={technician}
      terrainRole={terrainAccount.terrainRole!}
      userEmail={auth.user?.email ?? null}
    />
  );
}
