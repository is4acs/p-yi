import { prisma } from "@/lib/prisma";
import { buildListingsUrl } from "@/lib/listings/url";

import { CategoryTile } from "@/components/ui/category-tile";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * HomeCategoriesGrid — grille d'entrée "à la Leboncoin" sur la home `/`.
 *
 * Remplace l'ancienne rangée de chips horizontale : on passe à une
 * grille 2 colonnes mobile / 4 colonnes desktop pour donner du poids
 * visuel aux catégories (principal mode d'entrée dans la marketplace).
 *
 * Choix :
 *  - On ne prend QUE les catégories `LISTING` ou `BOTH` (la home
 *    centre sur les annonces — les bons plans gardent leurs propres
 *    catégories sur `/bons-plans`).
 *  - Limite 8 pour tenir sur 2×4 sans scroll (les moins prioritaires
 *    restent accessibles via `/annonces`).
 *  - Compteur par catégorie : PUBLISHED + non expirées, via groupBy.
 *    C'est 1 query en plus mais très rapide (index sur status +
 *    expiresAt déjà posé).
 *  - Rotation chromatique orange / green / rouge / jaune — pattern
 *    `i % 4` pour garantir l'alternance même si l'ordre des
 *    catégories change en DB.
 *  - Icône Péyi custom quand une correspondance existe (home, car,
 *    job, tag), sinon fallback sur l'emoji de la DB (📱, 🛋️, etc.).
 *    On évite d'empiler emoji + icône : l'un OU l'autre.
 */

// Slugs de catégories → icône Péyi. Les autres utiliseront l'emoji.
// Liste tenue à la main : on n'a que 6 catégories avec une vraie
// icône custom dans le sprite Péyi (home/car/job/tag sont les plus
// utiles pour la home marketplace).
const SLUG_TO_ICON: Partial<Record<string, IconName>> = {
  vehicules: "car",
  covoiturage: "car",
  immobilier: "home",
  "emploi-services": "job",
  "mode-vide-dressing": "tag",
  "loisirs-sport": "event",
};

const VARIANTS = ["orange", "green", "rouge", "jaune"] as const;

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    // 1 200 → "1,2k" ; 12 000 → "12k"
    return k >= 10 ? `${Math.floor(k)}k` : `${k.toFixed(1).replace(".", ",")}k`;
  }
  return String(n);
}

export async function HomeCategoriesGrid() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { type: { in: ["LISTING", "BOTH"] }, isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
      select: { id: true, slug: true, name: true, icon: true },
    }),
    prisma.listing.groupBy({
      by: ["categoryId"],
      where: { status: "PUBLISHED", expiresAt: { gt: new Date() } },
      _count: { _all: true },
    }),
  ]);

  if (categories.length === 0) return null;

  const countByCategoryId = new Map<string, number>(
    counts.map((c) => [c.categoryId, c._count._all]),
  );

  return (
    <section className="mt-8 px-4 sm:px-0">
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink-900">
          Explorer par catégorie
        </h2>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((c, i) => {
          const variant = VARIANTS[i % VARIANTS.length];
          const iconName = SLUG_TO_ICON[c.slug];
          const count = countByCategoryId.get(c.id) ?? 0;
          return (
            <CategoryTile
              key={c.id}
              href={buildListingsUrl({ category: c.slug })}
              variant={variant}
            >
              {iconName ? (
                <Icon name={iconName} size={28} />
              ) : (
                <span aria-hidden className="text-[28px] leading-none">
                  {c.icon ?? "📦"}
                </span>
              )}
              <div className="mt-3 flex flex-col">
                <span className="font-display text-sm font-semibold leading-tight">
                  {c.name}
                </span>
                <span className="mt-0.5 text-xs opacity-70">
                  {count > 0
                    ? `${formatCount(count)} ${count > 1 ? "annonces" : "annonce"}`
                    : "Bientôt"}
                </span>
              </div>
            </CategoryTile>
          );
        })}
      </div>
    </section>
  );
}
