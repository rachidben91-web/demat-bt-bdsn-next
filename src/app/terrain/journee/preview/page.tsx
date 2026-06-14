import { notFound } from "next/navigation";
import { TerrainWorkspace } from "@/components/terrain-workspace";
import {
  previewCurrentDateKey,
  previewCurrentDateLabel,
  previewDispatch,
  previewTechnician,
} from "@/app/terrain/preview-data";

export default function TerrainPreviewDayPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <TerrainWorkspace
      currentDateKey={previewCurrentDateKey}
      currentDateLabel={previewCurrentDateLabel}
      displayName="BENALLOU Radouane"
      mobileDispatch={previewDispatch}
      technician={previewTechnician}
      terrainRole="technician"
      userEmail="radouane@dmt.vlg"
    />
  );
}
