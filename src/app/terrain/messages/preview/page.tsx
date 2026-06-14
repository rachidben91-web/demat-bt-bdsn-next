import { notFound } from "next/navigation";
import { TerrainMessagesView } from "@/components/terrain-messages-view";
import {
  previewCurrentDateLabel,
  previewDispatch,
  previewTechnician,
} from "@/app/terrain/preview-data";

export default function TerrainMessagesPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <TerrainMessagesView
      currentDateLabel={previewCurrentDateLabel}
      displayName="BENALLOU Radouane"
      mobileDispatch={previewDispatch}
      technician={previewTechnician}
      terrainRole="technician"
      userEmail="radouane@dmt.vlg"
    />
  );
}
