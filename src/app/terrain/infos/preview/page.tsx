import { notFound } from "next/navigation";
import { TerrainInfosView } from "@/components/terrain-infos-view";
import {
  previewCurrentDateLabel,
  previewDispatch,
  previewTechnician,
} from "@/app/terrain/preview-data";

export default function TerrainInfosPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <TerrainInfosView
      currentDateLabel={previewCurrentDateLabel}
      displayName="BENALLOU Radouane"
      mobileDispatch={previewDispatch}
      technician={previewTechnician}
      terrainRole="technician"
      userEmail="radouane@dmt.vlg"
    />
  );
}
