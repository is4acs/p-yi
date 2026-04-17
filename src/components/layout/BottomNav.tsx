"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flame, Plus, Tag, User } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
  primary?: boolean;
};

const TABS: Tab[] = [
  { href: "/", label: "Accueil", icon: Home, match: (p) => p === "/" },
  {
    href: "/bons-plans",
    label: "Deals",
    icon: Flame,
    match: (p) => p === "/bons-plans" || p.startsWith("/bons-plans/"),
  },
  {
    href: "/poster",
    label: "Poster",
    icon: Plus,
    match: (p) => p.startsWith("/poster"),
    primary: true,
  },
  {
    href: "/annonces",
    label: "Annonces",
    icon: Tag,
    match: (p) => p === "/annonces" || p.startsWith("/annonces/"),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: User,
    match: (p) => p.startsWith("/profil"),
  },
];

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match(pathname);
          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-end gap-0.5 px-1 pb-1 pt-2 text-[10px] font-medium transition active:scale-95",
                  tab.primary
                    ? "text-peyi-orange-700"
                    : isActive
                    ? "text-peyi-orange-600"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.primary ? (
                  <span
                    className={cn(
                      "-mt-5 mb-0.5 flex h-11 w-11 items-center justify-center rounded-full shadow-md shadow-peyi-orange-500/30 transition",
                      isActive
                        ? "bg-peyi-orange-600 text-white"
                        : "bg-peyi-orange-500 text-white hover:bg-peyi-orange-600",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                ) : (
                  <Icon
                    className={cn(
                      "h-5 w-5 transition",
                      isActive && "stroke-[2.5]",
                    )}
                    aria-hidden
                  />
                )}
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
