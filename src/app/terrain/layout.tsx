import type { Metadata, Viewport } from "next";
import { TerrainMobileChrome } from "@/components/terrain-mobile-chrome";
import { TerrainNetworkBanner } from "@/components/terrain-network-banner";
import { TerrainPwaRegistration } from "@/components/terrain-pwa-registration";
import { getCurrentAuthContext } from "@/lib/auth";
import { getUnreadTerrainMessageCount } from "@/lib/messaging";

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

export default async function TerrainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getCurrentAuthContext();
  const messageBadgeCount =
    auth.officeAccount?.canAccessTerrainApp && auth.officeAccount.technicianId
      ? await getUnreadTerrainMessageCount(
          auth.officeAccount.technicianId,
          auth.officeAccount.id,
        )
      : 0;

  return (
    <>
      <TerrainPwaRegistration officeAccountId={auth.officeAccount?.id ?? null} />
      <TerrainNetworkBanner />
      <TerrainMobileChrome messageBadgeCount={messageBadgeCount}>
        {children}
      </TerrainMobileChrome>
    </>
  );
}
