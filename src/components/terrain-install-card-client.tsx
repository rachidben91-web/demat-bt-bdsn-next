"use client";

import dynamic from "next/dynamic";

export const TerrainInstallCardClient = dynamic(
  () => import("@/components/terrain-install-card").then((module) => module.TerrainInstallCard),
  { ssr: false },
);
