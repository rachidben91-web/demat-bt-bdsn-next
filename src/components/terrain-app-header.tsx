import Image from "next/image";
import { LogoutButton } from "@/components/logout-button";
import { extractFirstName } from "@/lib/terrain-ui";

type HeaderTone = "success" | "warning" | "neutral";

type TerrainAppHeaderProps = {
  currentDateLabel: string;
  displayName: string;
  roleLabel: string;
  site: string | null;
  statusLabel: string;
  statusTone: HeaderTone;
  userEmail: string | null;
};

function statusClassName(tone: HeaderTone) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function TerrainAppHeader({
  currentDateLabel,
  displayName,
  roleLabel,
  site,
  statusLabel,
  statusTone,
  userEmail,
}: TerrainAppHeaderProps) {
  const firstName = extractFirstName(displayName, userEmail);

  return (
    <header className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,250,248,0.96))] text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#0f8d6c]">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] shadow-[0_14px_28px_rgba(15,141,108,0.20)]">
              <Image
                alt="Icône DEMAT-BT Terrain"
                className="h-5 w-5"
                height={128}
                src="/dashboard-favicon.png"
                width={128}
              />
            </span>
            DEMAT-BT Terrain
          </div>

          <div>
            <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.3rem]">
              Bonjour {firstName}
            </h1>
            <p className="mt-1 text-base text-slate-600">
              {currentDateLabel}
              {site ? ` · Site ${site}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {roleLabel}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName(
                statusTone,
              )}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <LogoutButton variant="terrain" />
      </div>
    </header>
  );
}
