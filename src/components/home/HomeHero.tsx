import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { HighlightJaune } from "@/components/ui/highlight-jaune";
import { HomeSearchBar } from "@/components/home/HomeSearchBar";

/**
 * HomeHero — section éditoriale d'ouverture de `/`.
 *
 * Même ADN que `<BonsPlansHero>` (eyebrow mono orange, H1 display +
 * HighlightJaune signature, lede local, 3 KPIs temps-réel) mais
 * positionné comme "panorama" du marketplace : couvre à la fois les
 * bons plans ET les annonces via deux `<HighlightJaune>` dans le H1.
 *
 * KPIs choisis pour signaler la vitalité globale du peyi (vs
 * BonsPlansHero qui est deal-centric) :
 *   • Bons plans ce mois  — fraîcheur du catalogue deals
 *   • Annonces cette semaine — pouls du marché d'occasion
 *   • Membres actifs      — taille de la communauté
 *
 * Les 3 counts tournent en parallèle via `Promise.all`, tous sur des
 * index existants (`@@index([status, publishedAt])` sur Deal/Listing
 * et `@@index([lastActiveAt])` sur User) — pas de régression perf
 * même avec des millions de rows à terme.
 *
 * Conservé du hero S27/S28 :
 *   • `HomeSearchBar` (elle convertit, c'est l'entrée principale)
 *   • CTA primary "Poster" (+5 karma, friction minimale)
 *   • Fond gradient orange subtil (-mx-4 pour bleed full-width mobile)
 *
 * Ajouté en S31 :
 *   • Eyebrow éditorial au lieu du descriptif ("Marketplace 100%
 *     Guyane" → "La communauté des malins du peyi")
 *   • Lede concret avec refs guyanaises (PS5 Cdiscount, vol Cayenne,
 *     BBQ Matoury) au lieu de la formule générique
 *   • KPIs inline sous le CTA — proof-of-life de la communauté
 *   • Lien secondaire "Voir les bons plans →" à côté du CTA primary
 *     pour offrir une 2e entrée (explorer vs publier)
 */

function formatKpi(n: number): string {
  // Séparateur milliers espace insécable, pas de décimales. Même
  // formatage qu'ailleurs dans l'app (fr-FR partout).
  return new Intl.NumberFormat("fr-FR").format(n);
}

export async function HomeHero() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dealsThisMonth, listingsThisWeek, activeMembers] = await Promise.all([
    prisma.deal.count({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: firstOfMonth },
      },
    }),
    prisma.listing.count({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const kpis = [
    { value: dealsThisMonth, label: "bons plans ce mois" },
    { value: listingsThisWeek, label: "annonces cette semaine" },
    { value: activeMembers, label: "membres actifs" },
  ];

  return (
    <section
      aria-labelledby="home-hero-title"
      className="relative -mx-4 overflow-hidden bg-gradient-to-b from-peyi-orange-50/70 to-transparent px-4 pb-8 pt-10 sm:mx-0 sm:px-0 sm:pb-12 sm:pt-14"
    >
      {/* Décorations subtiles (pastilles orange + verte) — cohérence
          avec BonsPlansHero/AnnoncesHero. Opacité basse, aria-hidden. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-6 h-12 w-12 rounded-full bg-peyi-orange opacity-20 sm:right-16 sm:top-10 sm:h-16 sm:w-16"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-4 right-2 h-20 w-20 rounded-full bg-peyi-green opacity-15 sm:right-10 sm:h-28 sm:w-28"
      />

      <div className="relative">
        <p className="font-mono text-eyebrow uppercase text-peyi-orange-700">
          La communauté des malins du peyi
        </p>
        <h1
          id="home-hero-title"
          className="mt-2 font-display text-title-md font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-title-lg"
        >
          Les <HighlightJaune>bons plans</HighlightJaune> et{" "}
          <HighlightJaune>annonces</HighlightJaune>
          <br className="hidden sm:inline" /> de&nbsp;Guyane, entre nous.
        </h1>
        <p className="mt-3 max-w-xl text-base text-ink-700 sm:text-lede">
          PS5 Cdiscount, vol Cayenne–Paris, BBQ Weber du Géant Matoury. Partage,
          vote et profite — entre Guyanais, près de chez toi.
        </p>

        <div className="mt-6">
          <HomeSearchBar />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild variant="peyi" size="peyi">
            <Link href="/poster">
              <Plus aria-hidden />
              Poster un bon plan
            </Link>
          </Button>
          <Link
            href="/bons-plans"
            className="inline-flex items-center gap-1 text-sm font-medium text-peyi-orange-700 hover:text-peyi-orange-800"
          >
            Voir les bons plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* KPIs — même pattern que BonsPlansHero : gros chiffre display
            peyi-orange-700 + label mono ink-500. Baseline aligned pour
            rythme horizontal propre malgré les tailles mixtes. */}
        <ul className="mt-7 flex flex-wrap items-baseline gap-x-5 gap-y-2">
          {kpis.map(({ value, label }) => (
            <li
              key={label}
              className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 sm:text-xs"
            >
              <b className="font-display text-[15px] font-extrabold tracking-normal text-peyi-orange-700">
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
