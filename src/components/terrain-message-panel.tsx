import type { MobileDispatchItem } from "@/lib/mobile-dispatch";
import { compactText, departureInstructionLabel } from "@/lib/terrain-ui";

type TerrainTechnician = {
  managerName: string;
  role: string;
  site: string;
};

export type TerrainMessageItem = {
  id: string;
  initials: string;
  preview: string;
  timeLabel: string;
  title: string;
  tone: "blue" | "mint" | "sand" | "sage";
  unreadCount?: number;
};

type TerrainMessagePanelProps = {
  title?: string;
  items: TerrainMessageItem[];
  showComposer?: boolean;
};

function buildInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function circleClassName(tone: TerrainMessageItem["tone"]) {
  if (tone === "blue") {
    return "bg-[#d8e8fb] text-[#2b5b8d]";
  }

  if (tone === "mint") {
    return "bg-[#d9f3e7] text-[#21654f]";
  }

  if (tone === "sand") {
    return "bg-[#f8ecd7] text-[#855c16]";
  }

  return "bg-[#ddeedb] text-[#325c31]";
}

export function buildTerrainMessageItems(
  mobileDispatch: MobileDispatchItem | null,
  technician: TerrainTechnician | null,
) {
  const siteLabel = mobileDispatch?.siteCode ?? technician?.site ?? "VLG";
  const managerName = mobileDispatch?.managerName ?? technician?.managerName ?? "Chef d'équipe";
  const firstBtWithObservation =
    mobileDispatch?.btPayload.find((bt) => compactText(bt.observations)) ?? null;
  const firstBtWithRisk =
    mobileDispatch?.btPayload.find((bt) => compactText(bt.analyseDesRisques)) ?? null;

  const items: TerrainMessageItem[] = [
    {
      id: "office",
      initials: "BU",
      preview: mobileDispatch
        ? `${departureInstructionLabel(mobileDispatch.departureInstruction)} avant ${
            mobileDispatch.btPayload[0]
              ? mobileDispatch.btPayload[0].duree.match(/\d{2}h\d{2}/)?.[0] ?? "départ"
              : "départ"
          }.`
        : "Le bureau transmettra ici les consignes de départ.",
      timeLabel: "08h47",
      title: `Bureau ${siteLabel}`,
      tone: "blue",
      unreadCount: 2,
    },
    {
      id: "manager",
      initials: buildInitials(managerName) || "CE",
      preview: "OK reçu, on se retrouve à l'agence si besoin.",
      timeLabel: "08h12",
      title: managerName,
      tone: "mint",
    },
  ];

  if (firstBtWithObservation) {
    items.push({
      id: "bt-observation",
      initials: "BT",
      preview: compactText(firstBtWithObservation.observations),
      timeLabel: "Hier",
      title: `Intervention ${firstBtWithObservation.btId}`,
      tone: "sand",
      unreadCount: 1,
    });
  }

  if (firstBtWithRisk) {
    items.push({
      id: "safety",
      initials: "RS",
      preview: `Rappel : ${compactText(firstBtWithRisk.analyseDesRisques)}`,
      timeLabel: "Hier",
      title: "Référent sécurité",
      tone: "sage",
    });
  }

  return items.slice(0, 4);
}

export function TerrainMessagePanel({
  title = "Messagerie terrain",
  items,
  showComposer = true,
}: TerrainMessagePanelProps) {
  return (
    <section className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,251,255,0.96))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
        {title}
      </p>

      <div className="mt-3 rounded-[22px] border border-slate-200 bg-white/90 px-4 py-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 py-3 ${index === items.length - 1 ? "" : "border-b border-slate-100"}`}
          >
            <div
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${circleClassName(
                item.tone,
              )}`}
            >
              {item.initials}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-base font-semibold text-slate-900">{item.title}</p>
                <p className="shrink-0 text-xs font-semibold text-slate-400">{item.timeLabel}</p>
              </div>
              <p className="truncate text-sm text-slate-600">{item.preview}</p>
            </div>

            {item.unreadCount ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f0743e] px-2 text-xs font-bold text-white">
                {item.unreadCount}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {showComposer ? (
        <div className="mt-3 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            + Nouveau message
          </p>
          <div className="mt-3 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-base text-slate-400">
            Écrire au bureau ou à l&apos;équipe...
          </div>
        </div>
      ) : null}
    </section>
  );
}
