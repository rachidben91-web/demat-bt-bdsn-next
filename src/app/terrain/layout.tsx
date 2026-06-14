import type { Metadata, Viewport } from "next";
import { TerrainMobileChrome } from "@/components/terrain-mobile-chrome";
import { TerrainPwaRegistration } from "@/components/terrain-pwa-registration";

export const metadata: Metadata = {
  title: {
    default: "DEMAT-BT Terrain",
    template: "%s | DEMAT-BT Terrain",
  },
  description:
    "Application terrain DEMAT-BT Terrain pour consulter la mission publiée, les BT et les futurs modules terrain.",
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
  themeColor: "#eef5fb",
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
      <TerrainMobileChrome>{children}</TerrainMobileChrome>
    </>
  );
}
