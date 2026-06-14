"use client";

import { useEffect } from "react";

export function TerrainPwaRegistration() {
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
              .filter((key) => key.startsWith("demat-terrain-shell-"))
              .map((key) => caches.delete(key)),
          ),
        );
      }

      return;
    }

    navigator.serviceWorker
      .register("/terrain-sw.js", {
        scope: "/terrain/",
        updateViaCache: "none",
      })
      .catch((error) => {
        console.error("Terrain service worker registration failed", error);
      });
  }, []);

  return null;
}
