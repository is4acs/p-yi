"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Slugs des pages piliers SEO sous /bons-plans/* et /annonces/* : elles
 * gardent l'ancien gabarit (pas de BackHeader), donc le chrome global
 * reste visible dessus.
 */
const PILLAR_SLUGS = new Set([
  "guyane",
  "cayenne",
  "kourou",
  "matoury",
  "remire-montjoly",
  "saint-laurent-du-maroni",
]);

/**
 * Routes refondues « Soleil péyi » : leurs écrans mobiles embarquent
 * leur propre en-tête (wordmark ou BackHeader). Les sous-pages non
 * refondues (piliers SEO, fil de discussion, sous-pages profil, édition)
 * gardent le Header global.
 */
function isSoleilRoute(pathname: string): boolean {
  if (
    pathname === "/" ||
    pathname === "/bons-plans" ||
    pathname === "/annonces" ||
    pathname === "/messages" ||
    pathname.startsWith("/messages/") ||
    pathname === "/profil" ||
    pathname === "/poster" ||
    pathname.startsWith("/poster/") ||
    pathname === "/connexion" ||
    pathname.startsWith("/connexion/") ||
    pathname === "/auth/reset-password" ||
    pathname === "/activites"
  ) {
    return true;
  }
  const segments = pathname.split("/").filter(Boolean);
  // Pages détail : exactement /bons-plans/[slug] ou /annonces/[slug],
  // hors slugs piliers (les catégories piliers sont sur .../guyane, 3
  // segments, donc déjà exclues).
  if (
    segments.length === 2 &&
    (segments[0] === "bons-plans" || segments[0] === "annonces") &&
    !PILLAR_SLUGS.has(segments[1])
  ) {
    return true;
  }
  return false;
}

/** Masque le Header global en mobile sur les routes refondues. */
export function ChromeVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (!isSoleilRoute(pathname)) return <>{children}</>;
  return <div className="hidden lg:block">{children}</div>;
}

/**
 * Pose la surface crème/nuit derrière un bloc de chrome (Footer) sur
 * les routes refondues, pour éviter la couture blanche sous les pages
 * « Soleil péyi ». Ailleurs, transparent.
 */
export function SoleilSurface({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const soleil = isSoleilRoute(pathname);
  return (
    <div className={cn(soleil && "bg-soleil-cream dark:bg-soleil-night")}>
      {children}
    </div>
  );
}
