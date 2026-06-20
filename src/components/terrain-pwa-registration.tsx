"use client";

import { useEffect } from "react";

type TerrainPwaRegistrationProps = {
  officeAccountId: string | null;
};

const TERRAIN_ACCOUNT_KEY = "demat-terrain-account-id";

async function clearTerrainCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith("demat-terrain-")).map((key) => caches.delete(key)),
    );
  }
}

export function TerrainPwaRegistration({ officeAccountId }: TerrainPwaRegistrationProps) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalPreview =
      process.env.NODE_ENV !== "production" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalPreview) {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(
          registrations
            .filter((registration) => registration.scope.includes("/terrain"))
            .map((registration) => registration.unregister()),
        ),
      );

      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("demat-terrain-"))
              .map((key) => caches.delete(key)),
          ),
        );
      }

      return;
    }

    const previousAccountId = window.localStorage.getItem(TERRAIN_ACCOUNT_KEY);

    if (previousAccountId && officeAccountId && previousAccountId !== officeAccountId) {
      void clearTerrainCaches();
    }

    if (officeAccountId) {
      window.localStorage.setItem(TERRAIN_ACCOUNT_KEY, officeAccountId);
    }

    void navigator.serviceWorker
      .register("/terrain-sw.js", {
        scope: "/terrain",
        updateViaCache: "none",
      })
      .then(async () => {
        const registration = await navigator.serviceWorker.ready;

        registration.active?.postMessage({
          type: "PREFETCH_TERRAIN_URLS",
          urls: ["/terrain", "/terrain/journee", "/terrain/messages", "/terrain/infos"],
        });
      })
      .catch((error) => {
        console.error("Terrain service worker registration failed", error);
      });
  }, [officeAccountId]);

  return null;
}
