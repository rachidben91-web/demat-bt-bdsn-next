"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  FileText,
  Home,
  MessageSquareText,
} from "lucide-react";

type TerrainMobileChromeProps = {
  children: React.ReactNode;
  messageBadgeCount?: number;
};

type NavItem = {
  href: string;
  icon: typeof Home;
  isActive: boolean;
  label: string;
  badge?: number;
};

function isPreviewPath(pathname: string) {
  return pathname === "/terrain/preview" || pathname.endsWith("/preview");
}

function resolveTerrainHref(pathname: string, section: "home" | "bt" | "messages" | "infos") {
  if (isPreviewPath(pathname)) {
    if (section === "home") {
      return "/terrain/preview";
    }

    if (section === "bt") {
      return "/terrain/journee/preview";
    }

    if (section === "messages") {
      return "/terrain/messages/preview";
    }

    return "/terrain/infos/preview";
  }

  if (section === "home") {
    return "/terrain";
  }

  if (section === "bt") {
    return "/terrain/journee";
  }

  if (section === "messages") {
    return "/terrain/messages";
  }

  return "/terrain/infos";
}

function buildNavItems(pathname: string, messageBadgeCount?: number): NavItem[] {
  return [
    {
      href: resolveTerrainHref(pathname, "home"),
      icon: Home,
      isActive: pathname === "/terrain" || pathname === "/terrain/preview",
      label: "Accueil",
    },
    {
      href: resolveTerrainHref(pathname, "bt"),
      icon: FileText,
      isActive:
        pathname.startsWith("/terrain/journee") && !pathname.startsWith("/terrain/journee/login"),
      label: "Mes BT",
    },
    {
      href: resolveTerrainHref(pathname, "messages"),
      icon: MessageSquareText,
      isActive: pathname.startsWith("/terrain/messages"),
      label: "Messages",
      badge: messageBadgeCount && messageBadgeCount > 0 ? messageBadgeCount : undefined,
    },
    {
      href: resolveTerrainHref(pathname, "infos"),
      icon: CircleHelp,
      isActive: pathname.startsWith("/terrain/infos"),
      label: "Infos",
    },
  ];
}

export function TerrainMobileChrome({ children, messageBadgeCount }: TerrainMobileChromeProps) {
  const pathname = usePathname() ?? "/terrain";
  const showNav = !pathname.startsWith("/terrain/login");
  const navItems = buildNavItems(pathname, messageBadgeCount);

  return (
    <div className={showNav ? "pb-[calc(6.75rem+env(safe-area-inset-bottom))]" : undefined}>
      {children}

      {showNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[820px] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="rounded-[26px] border border-white/80 bg-[rgba(255,255,255,0.92)] px-3 py-2 shadow-[0_18px_42px_rgba(15,23,42,0.16)] backdrop-blur-xl">
            <div className="grid grid-cols-4 gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    className={`group relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-center transition ${
                      item.isActive
                        ? "bg-[linear-gradient(180deg,#0f8d6c_0%,#0b7a61_100%)] text-white shadow-[0_14px_28px_rgba(15,141,108,0.24)]"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    href={item.href}
                  >
                    <span className="relative inline-flex">
                      <Icon className="h-5 w-5" strokeWidth={item.isActive ? 2.4 : 2.1} />
                      {item.badge ? (
                        <span className="absolute -right-3 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[#f0743e] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
