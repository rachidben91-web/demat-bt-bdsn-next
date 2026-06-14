"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type TerrainInstallCardProps = {
  className?: string;
  compact?: boolean;
};

function detectIos() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function TerrainInstallCard({
  className = "",
  compact = false,
}: TerrainInstallCardProps) {
  const baseClassName =
    "rounded-[24px] border border-cyan-200/80 bg-[linear-gradient(160deg,rgba(236,254,255,0.96),rgba(255,255,255,0.94))] p-4 shadow-[0_18px_38px_rgba(14,116,144,0.10)]";
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const frameId = window.requestAnimationFrame(() => {
      setIsIos(detectIos());
      setIsStandalone(mediaQuery.matches);
    });

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleDisplayModeChange(event: MediaQueryListEvent) {
      setIsStandalone(event.matches);
    }

    function handleAppInstalled() {
      setInstallEvent(null);
      setIsStandalone(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    setIsInstalling(true);

    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } finally {
      setInstallEvent(null);
      setIsInstalling(false);
    }
  }

  if (isStandalone) {
    return null;
  }

  const title = compact ? "Installer l'app" : "Installer l'application terrain";
  const description = installEvent
    ? "Ajoute DEMAT-BT Terrain à l'écran d'accueil pour l'ouvrir comme une vraie appli."
    : isIos
      ? "Sur iPhone ou iPad, ouvre le menu Partager puis choisis Ajouter à l'écran d'accueil."
      : "Le mode installable apparaîtra ici dès que le navigateur propose l'installation.";

  return (
    <section
      className={[baseClassName, className].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">
            PWA terrain
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600" suppressHydrationWarning>
            {description}
          </p>
        </div>

        {installEvent ? (
          <button
            className="rounded-[18px] bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(8,145,178,0.24)] transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isInstalling}
            onClick={handleInstall}
            type="button"
          >
            {isInstalling ? "Installation..." : "Installer"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
