"use client";

import { useEffect, useState } from "react";

export function TerrainNetworkBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="mx-auto max-w-[760px] px-4 pt-4">
      <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-[0_12px_28px_rgba(245,158,11,0.12)]">
        Mode hors ligne: l&apos;application affiche les dernieres donnees synchronisees sur cette tablette.
      </div>
    </div>
  );
}
