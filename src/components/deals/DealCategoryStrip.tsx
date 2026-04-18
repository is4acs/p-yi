import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { buildDealsUrl } from "@/lib/deals/url";

/**
 * DealCategoryStrip — rangée horizontale de "category pills" pour
 * `/bons-plans` (mockup `Pages Peyi.html` · 18 avril 2026).
 *
 * Rôle : exposer les catégories les plus actives comme points d'entrée
 * rapides, avec leur compteur de deals en cours. Similaire à la strip
 * Dealabs, mais avec le ton Péyi (emoji du seed + compteur mono).
 *
 * Différences avec `<HomeCategoriesGrid>` :
 *   • Target `DEAL|BOTH` (pas `LISTING|BOTH`) — ce sont les catégories
 *     qui ont du sens pour des bons plans (Supermarché, Tech, Mode,
 *     Voyages, …).
 *   • Layout scroll-snap horizontal sur mobile (économie d'espace
 *     vertical), wrap flex sur desktop (tout visible d'un coup).
 *   • Pills compactes (colonne emoji/label/count) plutôt que tiles
 *     colorées pleine largeur — c'est un index secondaire, pas un
 *     hero.
 *
 * Ne s'affiche qu'en mode "découverte" (aucun filtre actif), comme le
 * `<BonsPlansHero>` — sous filtre l'utilisateur veut des résultats,
 * pas un index.
 *
 * Les catégories à 0 deal sont masquées : un compteur vide décourage
 * plus qu'il n'invite. L'utilisateur peut toujours y accéder via le
 * `DealsFilterBar` qui, lui, montre toutes les catégories.
 */

const TOP_N = 10; // nombre max de pills affichées

export async function DealCategoryStrip() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { type: { in: ["DEAL", "BOTH"] }, isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        sortOrder: true,
      },
    }),
    prisma.deal.groupBy({
      by: ["categoryId"],
      where: {
        status: "PUBLISHED",
        // Un deal expiré n'est plus "un plan actif" — on le sort du
        // compteur. `expiresAt: null` = pas de date de fin (event-like)
        // et reste compté.
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _count: { _all: true },
    }),
  ]);

  if (categories.length === 0) return null;

  const countByCategoryId = new Map<string, number>(
    counts.map((c) => [c.categoryId, c._count._all]),
  );
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);

  // Tri par volume desc, tiebreak par sortOrder (cf. la même logique
  // dans `HomeCategoriesGrid` — même principe data-driven).
  const ordered = [...categories]
    .filter((c) => (countByCategoryId.get(c.id) ?? 0) > 0)
    .sort((a, b) => {
      const diff =
        (countByCategoryId.get(b.id) ?? 0) -
        (countByCategoryId.get(a.id) ?? 0);
      if (diff !== 0) return diff;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, TOP_N);

  // Si aucune catégorie n'a de deal actif, on masque la strip plutôt
  // que d'afficher une rangée vide. Garde la page propre en démarrage.
  if (ordered.length === 0) return null;

  return (
    <section
      aria-label="Catégories de bons plans"
      className="-mx-4 border-b border-ink-100 bg-background px-4 py-4 sm:mx-0 sm:px-0 sm:py-5"
    >
      <ul className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:snap-none sm:overflow-visible sm:pb-0">
        {/* "Tous" pill — state actif par défaut sur une page non
            filtrée. Dark (ink-900) pour se démarquer du reste.

            S33 : largeur figée `w-[96px]` (au lieu de `min-w-[88px]`)
            + label `line-clamp-2` pour que "Maison & Électroménager"
            wrappe sur 2 lignes au lieu de déborder ou tronquer avec
            ellipsis (bug signalé via screenshot iPhone user). `px-3`
            (vs `px-4`) compense les 8px supplémentaires. */}
        <li className="snap-start">
          <Link
            href="/bons-plans"
            className="flex w-[96px] flex-shrink-0 flex-col items-center gap-1.5 rounded-md border border-ink-900 bg-ink-900 px-3 py-3 text-white transition-transform duration-base hover:-translate-y-0.5"
          >
            <span aria-hidden className="text-[22px] leading-none">
              🔥
            </span>
            <span className="line-clamp-2 text-center font-display text-[12.5px] font-bold leading-tight">
              Tous
            </span>
            <span className="font-mono text-[9.5px] leading-none text-white/60">
              {new Intl.NumberFormat("fr-FR").format(total)}
            </span>
          </Link>
        </li>

        {ordered.map((cat) => {
          const count = countByCategoryId.get(cat.id) ?? 0;
          return (
            <li key={cat.id} className="snap-start">
              <Link
                href={buildDealsUrl({ category: cat.slug })}
                className="flex w-[96px] flex-shrink-0 flex-col items-center gap-1.5 rounded-md border border-ink-100 bg-background px-3 py-3 text-ink-900 transition-[transform,border-color] duration-base hover:-translate-y-0.5 hover:border-peyi-orange-500"
              >
                <span aria-hidden className="text-[22px] leading-none">
                  {cat.icon ?? "📦"}
                </span>
                <span className="line-clamp-2 text-center font-display text-[12.5px] font-bold leading-tight">
                  {cat.name}
                </span>
                <span className="font-mono text-[9.5px] leading-none text-ink-500">
                  {new Intl.NumberFormat("fr-FR").format(count)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
