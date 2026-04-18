import { prisma } from "@/lib/prisma";
import { HighlightJaune } from "@/components/ui/highlight-jaune";
import { ListingStatus } from "@prisma/client";

/**
 * AnnoncesHero — section éditoriale en tête de `/annonces`.
 *
 * Symétrique à `<BonsPlansHero>` côté deals — même pattern hero
 * décoratif visible uniquement en mode "découverte" (aucun filtre).
 * On diffère sur deux axes pour que les deux pages soient
 * visuellement distinctes au premier coup d'œil :
 *   • palette verte Péyi (signal "annonces / marché local") vs.
 *     orange (signal "bons plans / promos")
 *   • KPIs adaptés : annonces en ligne + nouvelles cette semaine +
 *     membres actifs. Le "nouvelles cette semaine" remplace le
 *     "chauds cette semaine" qui n'a pas de sens sur des annonces
 *     (pas de système de votes).
 *
 * Les counts tournent en parallèle via `Promise.all`. Queries indexées
 * (`status`, `publishedAt`) — pas de full scan.
 *
 * La prop `total` est passée depuis la page parente plutôt que recalculée
 * ici : on économise une requête (la page a déjà fait le count pour la
 * pagination) et on garantit la cohérence entre le hero et le reste de
 * la page (même nombre affiché).
 */

function formatKpi(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

type Props = {
  total: number;
};

export async function AnnoncesHero({ total }: Props) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [freshThisWeek, activeMembers] = await Promise.all([
    prisma.listing.count({
      where: {
        status: ListingStatus.PUBLISHED,
        publishedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const kpis = [
    { value: total, label: "annonces en ligne" },
    { value: freshThisWeek, label: "nouvelles cette semaine" },
    { value: activeMembers, label: "membres actifs" },
  ];

  return (
    <section
      aria-labelledby="annonces-hero-title"
      className="relative -mx-4 overflow-hidden bg-gradient-to-b from-peyi-green-50/70 to-transparent px-4 pb-8 pt-10 sm:mx-0 sm:px-0 sm:pb-10 sm:pt-12"
    >
      {/* Décorations — pastilles vert/orange en miroir du hero deals
          (orange/vert). Même intensité d'opacité pour conserver la
          parenté visuelle entre les deux pages. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-6 h-12 w-12 rounded-full bg-peyi-green opacity-20 sm:right-16 sm:top-10 sm:h-16 sm:w-16"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-4 right-2 h-20 w-20 rounded-full bg-peyi-orange opacity-15 sm:right-10 sm:h-28 sm:w-28"
      />

      <div className="relative max-w-2xl">
        <p className="font-mono text-eyebrow uppercase text-peyi-green-700">
          Le marché local de la Guyane
        </p>
        <h1
          id="annonces-hero-title"
          className="mt-2 font-display text-title-md font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-title-lg"
        >
          Toutes les <HighlightJaune>annonces</HighlightJaune> de Guyane,
          <br className="hidden sm:inline" /> entre voisins.
        </h1>
        <p className="mt-3 max-w-xl text-base text-ink-700 sm:text-lede">
          Voitures, logements, tech, emploi, matériel pro, vide-dressing :
          achète, vends, échange et donne entre Guyanais. Un marché alimenté
          par la communauté, près de chez toi.
        </p>

        <ul className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {kpis.map(({ value, label }) => (
            <li
              key={label}
              className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 sm:text-xs"
            >
              <b className="font-display text-[15px] font-extrabold tracking-normal text-peyi-green-700">
                {formatKpi(value)}
              </b>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
