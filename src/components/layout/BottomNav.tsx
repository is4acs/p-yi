"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SunArc } from "@/components/brand/SunArc";
import { MOBILE_NAV } from "@/config/nav";
import { cn } from "@/lib/utils";

type Props = {
  unreadCount: number;
};

/**
 * Barre du bas mobile — refonte « Soleil péyi ».
 *
 * Deux changements par rapport à la version précédente :
 *
 *  1. **L'onglet actif se signale par le soleil**, un demi-disque orange
 *     de 12 px posé au-dessus du libellé, et par la graisse du texte.
 *     Plus de coloration orange du libellé : à 11 px sur crème, l'orange
 *     de marque ne tient pas le contraste.
 *  2. **Le bouton central est un disque de 46 px** aux couleurs de
 *     l'encre — forêt sur crème le jour, crème sur forêt la nuit — avec
 *     un plus orange. Il ne porte pas de libellé : c'est une action, pas
 *     une destination, et le disque suffit à le dire.
 *
 * Les cinq emplacements sont ceux de `MOBILE_NAV` : Deals, Annonces,
 * [Poster], Messages, Profil. Les trois verticales de contenu, elles,
 * vivent dans les onglets hauts, visibles sur le même écran.
 */
export function BottomNav({ unreadCount }: Props) {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:hidden"
    >
      <ul className="grid grid-cols-5 items-end">
        {MOBILE_NAV.map((tab) => {
          const isActive = tab.match(pathname);
          const badge =
            tab.badgeKey === "unread" && unreadCount > 0 ? unreadCount : null;

          if (tab.primary) {
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex justify-center">
                <Link
                  href={tab.href}
                  aria-label={tab.label}
                  className="-mt-4 mb-2 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-primary text-peyi-orange-500 shadow-lg transition active:scale-95"
                >
                  <Icon className="h-6 w-6" aria-hidden strokeWidth={2.5} />
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.href} className="flex">
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] transition active:scale-95",
                  isActive
                    ? "font-bold text-foreground"
                    : "font-semibold text-muted-foreground",
                )}
              >
                {/* Le soleil occupe sa place même inactif (invisible),
                    sinon les libellés sautent de 6 px à chaque
                    changement d'onglet. */}
                <SunArc
                  width={12}
                  className={cn(!isActive && "invisible")}
                />
                <span className="relative">
                  {tab.mobileLabel}
                  {badge !== null && (
                    <span
                      aria-label={`${badge} non lu${badge > 1 ? "s" : ""}`}
                      className="absolute -right-3.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-peyi-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-background"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
