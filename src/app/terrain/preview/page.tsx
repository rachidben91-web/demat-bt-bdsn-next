import { notFound } from "next/navigation";
import { TerrainHub } from "@/components/terrain-hub";
import {
  previewCurrentDateKey,
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
      currentDateKey={previewCurrentDateKey}
      currentDateLabel={previewCurrentDateLabel}
      detailHref="/terrain/journee/preview"
      displayName="BENALLOU Radouane"
      mobileDispatch={previewDispatch}
      officeMessages={[]}
      technician={previewTechnician}
      terrainRole="technician"
      userEmail="radouane@dmt.vlg"
    />
  );
}
