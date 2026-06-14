import { notFound } from "next/navigation";
import { TerrainHub } from "@/components/terrain-hub";
import {
  previewCurrentDateLabel,
  previewDispatch,
  previewTechnician,
} from "@/app/terrain/preview-data";

export default function TerrainPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <TerrainHub
      currentDateLabel={previewCurrentDateLabel}
      detailHref="/terrain/journee/preview"
      displayName="BENALLOU Radouane"
      mobileDispatch={previewDispatch}
      technician={previewTechnician}
      terrainRole="technician"
      userEmail="radouane@dmt.vlg"
    />
  );
}
