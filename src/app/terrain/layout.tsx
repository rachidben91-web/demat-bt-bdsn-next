import type { Metadata, Viewport } from "next";
import { TerrainPwaRegistration } from "@/components/terrain-pwa-registration";

export const metadata: Metadata = {
  title: {
    default: "DEMAT-BT Terrain",
    template: "%s | DEMAT-BT Terrain",
  },
  description:
    "Application terrain DEMAT-BT Terrain pour consulter la journée du jour, les briefs et les interventions terrain.",
  applicationName: "DEMAT-BT Terrain",
  manifest: "/terrain.webmanifest",
  appleWebApp: {
    capable: true,
    title: "DEMAT-BT Terrain",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  colorScheme: "light",
};

export default function TerrainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <TerrainPwaRegistration />
      {children}
    </>
  );
}
