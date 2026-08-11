"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { VERTICAL_TABS } from "@/config/nav";
import { cn } from "@/lib/utils";

/**
 * Onglets des trois verticales — Bons plans / Annonces / Activités.
 *
 * Soulignement de 3 px orange sous l'onglet actif : c'est le seul
 * indicateur, pas de fond ni de pilule. L'accueil met « Bons plans » en
 * avant sans être `/bons-plans` — d'où `activeKeyOverride`, qui laisse
 * la page décider quel onglet paraît actif.
 *
 * L'orange sert ici de trait, pas de texte : le libellé actif prend
 * l'encre du thème, à pleine graisse. C'est ce qui permet de rester
 * lisible en jour comme en nuit sans changer de couleur.
 */
export function VerticalTabs({
  activeKeyOverride,
  hideOnHome = false,
  className,
}: {
  /** Force l'onglet actif (l'accueil affiche « Bons plans » actif). */
  activeKeyOverride?: string;
  /**
   * Masque les onglets sur l'accueil. Utilisé pour la rangée mobile :
   * l'accueil y porte déjà ses propres portes d'entrée (les tuiles
   * compteurs et les liens de section), les onglets y feraient doublon
   * sur un écran étroit. Sur desktop ils restent, la place ne manque pas.
   */
  hideOnHome?: boolean;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";

  if (hideOnHome && pathname === "/") return null;

  return (
    <nav
      aria-label="Sections du site"
      className={cn("flex items-center gap-6", className)}
    >
      {VERTICAL_TABS.map((tab) => {
        const isActive = activeKeyOverride
          ? tab.key === activeKeyOverride
          : tab.match(pathname);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative py-2 text-[13px] transition-colors",
              isActive
                ? "font-bold text-foreground"
                : "font-semibold text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-peyi-orange-500"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
