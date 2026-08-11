import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Les deux tuiles-compteurs du héros : bons plans et annonces publiés.
 *
 * Elles reprennent la règle posée par `<CommunityStats>` : **on ne
 * montre pas un compteur famélique**. En dessous du seuil, la tuile
 * garde son rôle de porte d'entrée mais remplace le nombre par une
 * accroche d'action. Afficher « 0 bons plans » sur l'écran d'accueil,
 * c'est annoncer à un nouveau venu que le site est vide.
 *
 * Le seuil est le même que celui des autres compteurs du site
 * (`NEXT_PUBLIC_STATS_MIN_THRESHOLD`, 3 par défaut) — un seul réglage
 * pour tout le produit.
 */

const DEFAULT_THRESHOLD = 3;

function minThreshold(): number {
  const raw = Number(process.env.NEXT_PUBLIC_STATS_MIN_THRESHOLD);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_THRESHOLD;
}

type Tile = {
  href: string;
  count: number;
  label: string;
  hint: string;
  /** Accroche affichée à la place du nombre sous le seuil. */
  fallback: string;
  /** La première tuile porte l'encre pleine, la seconde le filet. */
  emphasis?: boolean;
};

export function CounterTiles({
  dealCount,
  listingCount,
}: {
  dealCount: number;
  listingCount: number;
}) {
  const threshold = minThreshold();

  const tiles: Tile[] = [
    {
      href: "/bons-plans",
      count: dealCount,
      label: "Bons plans",
      hint: "votés par la commu",
      fallback: "Ouvre le bal",
      emphasis: true,
    },
    {
      href: "/annonces",
      count: listingCount,
      label: "Annonces",
      hint: "près de chez toi",
      fallback: "Dépose la 1re",
    },
  ];

  return (
    <div className="grid max-w-[460px] grid-cols-2 gap-3">
      {tiles.map((tile) => {
        const showCount = tile.count >= threshold;
        return (
          <Link
            key={tile.href}
            href={tile.href}
            className={cn(
              "rounded-lg border-[1.5px] p-3.5 transition hover:border-peyi-orange-400",
              tile.emphasis ? "border-foreground" : "border-input",
            )}
          >
            <span
              className={cn(
                "block font-display font-extrabold leading-none",
                showCount ? "text-[22px]" : "text-[15px]",
              )}
            >
              {showCount
                ? new Intl.NumberFormat("fr-FR").format(tile.count)
                : tile.fallback}
            </span>
            <span className="mt-1.5 block text-xs font-bold">
              {tile.label} <span className="text-accent-text">→</span>
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {tile.hint}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
