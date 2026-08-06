import Link from "next/link";

import { fetchTopCommunes } from "@/lib/stats";
import { withTimeout } from "@/lib/async/with-timeout";
import { buildListingsUrl } from "@/lib/listings/url";
import { Icon } from "@/components/ui/Icon";

/**
 * HomeCommunesSection — "Près de chez toi" sur la home `/`.
 *
 * Pourquoi : Péyi est une marketplace hyperlocale. L'utilisateur veut
 * cliquer sur sa commune pour voir ce qui se vend autour de lui —
 * c'est un mode d'entrée aussi important que la catégorie.
 *
 * Implémentation :
 *  - On prend les 6 communes avec le plus d'annonces actives (PUBLISHED
 *    + non expirées). `groupBy` + orderBy desc côté Prisma.
 *  - Si une commune a zéro annonce, on ne l'affiche pas (évite un chip
 *    "Camopi · 0" décourageant). Les 22 communes de Guyane restent
 *    accessibles via le filtre complet sur `/annonces`.
 *  - Pastilles peyi-green-50 pour trancher avec l'orange dominant de
 *    la home (catégories, CTA). Le vert = "local, proximité".
 */

export async function HomeCommunesSection() {
  // Top 6 communes par volume d'annonces actives — groupBy + lookup
  // cachés 5 min (cf. `src/lib/stats.ts`) : données globales, une
  // requête par fenêtre de cache au lieu de deux par page vue.
  const rows = await withTimeout(
    fetchTopCommunes(),
    3_500,
    "home/communes-counts",
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[home/communes] query failed", err);
    return null;
  });

  if (!rows || rows.length === 0) return null;

  return (
    <section className="mt-10 px-4 sm:px-0">
      <div className="flex items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <Icon name="pin" size={20} className="text-peyi-green-600" />
          Près de chez toi
        </h2>
        <Link
          href="/annonces"
          className="text-sm font-medium text-peyi-orange-600 hover:text-peyi-orange-700"
        >
          Voir tout
        </Link>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {rows.map(({ city, count }) => (
          <li key={city.id}>
            <Link
              href={buildListingsUrl({ city: city.slug })}
              className="inline-flex items-center gap-2 rounded-full border border-peyi-green-200 bg-peyi-green-50 px-3.5 py-2 text-sm font-medium text-peyi-green-900 transition hover:border-peyi-green-400 hover:bg-peyi-green-100"
            >
              <span>{city.name}</span>
              <span className="rounded-full bg-white/70 px-2 py-0.5 font-mono text-xs tabular-nums text-peyi-green-700">
                {count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
