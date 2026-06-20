"use client";

import { useRef } from "react";
import { logoutAction, terrainLogoutAction } from "@/app/login/actions";

type LogoutButtonProps = {
  variant?: "office" | "terrain" | "terrainDark";
};

export function LogoutButton({ variant = "office" }: LogoutButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const action =
    variant === "terrain" || variant === "terrainDark" ? terrainLogoutAction : logoutAction;
  const className =
    variant === "terrainDark"
      ? "rounded-[18px] border border-white/18 bg-white/5 px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-200 hover:bg-white/10"
      : variant === "terrain"
        ? "rounded-[18px] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-900"
        : "rounded-[22px] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.95))] px-4 py-3 text-sm font-semibold text-rose-700 shadow-[0_16px_34px_rgba(244,63,94,0.14)] transition duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-[linear-gradient(180deg,rgba(255,244,246,1),rgba(255,228,230,0.95))] hover:text-rose-800";

  async function handleTerrainLogout() {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("demat-terrain-")).map((key) => caches.delete(key)),
      );
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();

      registrations
        .filter((registration) => registration.scope.includes("/terrain"))
        .forEach((registration) => {
          registration.active?.postMessage({ type: "CLEAR_TERRAIN_CACHES" });
        });
    }

    window.localStorage.removeItem("demat-terrain-account-id");
    formRef.current?.requestSubmit();
  }

  return (
    <form action={action} ref={formRef}>
      <button
        className={className}
        onClick={
          variant === "terrain" || variant === "terrainDark"
            ? (event) => {
                event.preventDefault();
                void handleTerrainLogout();
              }
            : undefined
        }
        type="submit"
      >
        Se deconnecter
      </button>
    </form>
  );
}
