import Link from "next/link";

import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/async/with-timeout";
import { buildDealsUrl } from "@/lib/deals/url";

/**
 * DealCategoryStrip — rail horizontal de chips catégories pour
 * `/bons-plans`. Refonte S34 (pattern "chip rail" inspiré Vinted /
 * Airbnb / Idealo) remplaçant l'ancien layout tile-style (colonnes
 * emoji/label/count, 96×90px chacune) qui était visuellement lourd et
 * peu scannable sur mobile.
 *
 * Améliorations S34 :
 *   • Pills horizontales inline (h-10, emoji + nom + count sur une
 *     ligne) — rail 40px au lieu de 90px, libère ~50px de viewport
 *     mobile pour les deals.
 *   • **Strip toujours visible** (même en mode filtré — cf. page.tsx)
 *     pour que l'utilisateur puisse sauter d'une catégorie à l'autre
 *     sans passer par le select dropdown. Avant S34 la strip était
 *     cachée sous filtre → sensation de "redirect" sèche.
 *   • État actif `bg-peyi-orange-500 text-white shadow-brand` — aligné
 *     avec les autres CTA primaires du site (bouton Poster, Chercher,
 *     logo). Pas de noir (cassait la dynamique chromatique).
 *   • Gradient fade droite mobile — indique le scroll horizontal.
 *   • `active:scale-[0.98]` + `focus-visible:ring` — feedback tactile
 *     + a11y clavier.
 *   • La catégorie sélectionnée est FORCÉE dans la liste même si elle
 *     a 0 deal actif (expirations, saison creuse). Sinon la pill
 *     active disparaîtrait et l'utilisateur perdrait son repère.
 *
 * Target `DEAL|BOTH` (pas `LISTING|BOTH`) — ce sont les catégories
 * pertinentes pour les bons plans (Supermarché, Tech, Mode, Voyages…).
 * Les catégories à 0 deal actif sont masquées par défaut : un compteur
 * vide décourage plus qu'il n'invite.
 */

// Nombre max de chips visibles. 12 couvre largement le seed actuel
// (~8-10 catégories DEAL) + laisse de la marge. Au-delà, scroll-x
// prend le relais sur mobile et wrap flex sur desktop.
const TOP_N = 12;
const STRIP_QUERY_TIMEOUT_MS = 3_500;

type Props = {
  /** Slug de la catégorie active (depuis la querystring `?category=`)
   *  ou `null` en mode "Tous". Permet de mettre en avant la bonne
   *  pill au retour de navigation. */
  selectedCategory?: string | null;
};

export async function DealCategoryStrip({ selectedCategory = null }: Props) {
  let categories: Array<{
    id: string;
    slug: string;
    name: string;
    icon: string | null;
    sortOrder: number;
  }> = [];
  let counts: Array<{ categoryId: string; _count: { _all: number } }> = [];

  try {
    [categories, counts] = await withTimeout(
      Promise.all([
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
            // Deal expiré = plus "un plan actif" → exclu du compteur.
            // `expiresAt: null` (event-like sans date fin) reste compté.
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          _count: { _all: true },
        }),
      ]),
      STRIP_QUERY_TIMEOUT_MS,
      "deals/category-strip",
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[deals/category-strip] query failed", err);
  }

  if (categories.length === 0) {
    const baseChip =
      "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-ink-100 bg-background px-4 text-sm font-semibold text-ink-900 transition-[border-color,color] duration-150 hover:border-peyi-orange-300 hover:text-peyi-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
    return (
      <section
        aria-label="Filtrer par catégorie"
        className="relative -mx-4 border-b border-ink-100 bg-background sm:mx-0"
      >
        <ul className="scrollbar-hide flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:snap-none sm:overflow-visible sm:gap-2.5 sm:px-0 sm:py-4">
          <li className="snap-start">
            <Link href="/bons-plans" className={baseChip}>
              <span aria-hidden className="text-base leading-none">
                🔥
              </span>
              <span>Tous</span>
            </Link>
          </li>
        </ul>
      </section>
    );
  }

  const countByCategoryId = new Map<string, number>(
    counts.map((c) => [c.categoryId, c._count._all]),
  );
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);

  // Tri volume desc, tiebreak sortOrder (cohérent avec HomeCategoriesGrid).
  const sorted = [...categories].sort((a, b) => {
    const diff =
      (countByCategoryId.get(b.id) ?? 0) - (countByCategoryId.get(a.id) ?? 0);
    if (diff !== 0) return diff;
    return a.sortOrder - b.sortOrder;
  });

  // On garde les catégories avec ≥1 deal actif, puis on force la
  // catégorie sélectionnée en tête si elle n'est pas déjà dedans
  // (ex. elle a 0 deal après le filtre d'expiration — rare mais
  // possible). Sans ce safeguard, la pill active disparaîtrait.
  const withDeals = sorted.filter(
    (c) => (countByCategoryId.get(c.id) ?? 0) > 0,
  );
  const selectedCat = selectedCategory
    ? sorted.find((c) => c.slug === selectedCategory) ?? null
    : null;

  let ordered = withDeals.slice(0, TOP_N);
  if (selectedCat && !ordered.some((c) => c.id === selectedCat.id)) {
    ordered = [selectedCat, ...ordered.slice(0, TOP_N - 1)];
  }

  // Cas limite : aucune catégorie à afficher ET pas de sélection →
  // on masque la strip plutôt qu'un rail vide (startup / DB vide).
  if (ordered.length === 0 && !selectedCat) return null;

  const allActive = !selectedCategory;

  // Classes partagées — factoring évite la duplication entre la pill
  // "Tous" et les pills catégories. Les variantes active/inactive
  // changent seulement bg/border/text + ombre.
  const baseChip =
    "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const activeChip =
    "border-peyi-orange-500 bg-peyi-orange-500 text-white shadow-brand";
  const inactiveChip =
    "border-ink-100 bg-background text-ink-900 hover:border-peyi-orange-300 hover:text-peyi-orange-700";

  return (
    <section
      aria-label="Filtrer par catégorie"
      className="relative -mx-4 border-b border-ink-100 bg-background sm:mx-0"
    >
      {/* Rail : scroll-snap-x horizontal mobile, wrap flex desktop.
          `scrollbar-hide` masque la scrollbar iOS pour un rendu clean
          (la barre reste scrollable, juste invisible). */}
      <ul className="scrollbar-hide flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 py-3 sm:flex-wrap sm:snap-none sm:overflow-visible sm:gap-2.5 sm:px-0 sm:py-4">
        <li className="snap-start">
          <Link
            href="/bons-plans"
            aria-current={allActive ? "page" : undefined}
            className={cn(baseChip, allActive ? activeChip : inactiveChip)}
          >
            <span aria-hidden className="text-base leading-none">
              🔥
            </span>
            <span>Tous</span>
            <span
              className={cn(
                "font-mono text-xs font-medium tabular-nums",
                allActive ? "text-white/75" : "text-ink-500",
              )}
            >
              {new Intl.NumberFormat("fr-FR").format(total)}
            </span>
          </Link>
        </li>

        {ordered.map((cat) => {
          const count = countByCategoryId.get(cat.id) ?? 0;
          const isActive = selectedCategory === cat.slug;
          return (
            <li key={cat.id} className="snap-start">
              <Link
                href={buildDealsUrl({ category: cat.slug })}
                aria-current={isActive ? "page" : undefined}
                className={cn(baseChip, isActive ? activeChip : inactiveChip)}
              >
                <span aria-hidden className="text-base leading-none">
                  {cat.icon ?? "📦"}
                </span>
                {/* `whitespace-nowrap` : les noms longs ("Supermarché &
                    Alimentation") ne wrappent pas dans la pill — on
                    préfère qu'elles prennent plus de largeur que
                    d'afficher 2 lignes de texte (casse le rail h-10). */}
                <span className="whitespace-nowrap">{cat.name}</span>
                <span
                  className={cn(
                    "font-mono text-xs font-medium tabular-nums",
                    isActive ? "text-white/75" : "text-ink-500",
                  )}
                >
                  {new Intl.NumberFormat("fr-FR").format(count)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Fade droite mobile — signale visuellement que le rail continue
          à droite. Masqué sm:+ où le rail wrappe sur plusieurs lignes
          (pas de scroll à indiquer). `pointer-events-none` pour que
          le scroll se propage au rail sous le gradient. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden"
      />
    </section>
  );
}
