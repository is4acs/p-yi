import { prisma } from "@/lib/prisma";
import { HighlightJaune } from "@/components/ui/highlight-jaune";

/**
 * BonsPlansHero — section éditoriale en tête de `/bons-plans`.
 *
 * Inspirée du mockup Claude Design (`Pages Peyi.html` · 18 avril 2026).
 * C'est le "visage" de la page : on installe un ton guyanais (PS5, vol
 * Cayenne–Paris, BBQ Weber Matoury) et on annonce la santé de la
 * communauté via 3 KPIs. Elle ne s'affiche qu'en mode "découverte"
 * (aucun filtre actif) — sous un filtre l'utilisateur veut des
 * résultats, pas du brand.
 *
 * KPIs choisis pour refléter la dynamique du peyi :
 *   • Deals ce mois    — fraîcheur du catalogue
 *   • Chauds cette semaine — vitalité des votes
 *   • Membres actifs    — taille de la communauté
 *
 * Les 3 counts tournent en parallèle via `Promise.all`. Ce sont des
 * queries indexées (cf. `prisma/schema.prisma` : `@@index([status,
 * publishedAt(sort: Desc)])` et `@@index([temperature(sort: Desc)])`)
 * — pas de full scan malgré les millions de deals à terme.
 *
 * Fallback graceful : si un KPI = 0 (projet jeune, vacances d'été, …),
 * on affiche "0" sans rien masquer. Mieux vaut un zéro honnête qu'un
 * bloc KPI qui disparaît et désaligne la composition.
 */

function formatKpi(n: number): string {
  // Formatage français : séparateur de milliers espace insécable, pas
  // de décimales. `2841` → `2 841`. Conserve l'alignement typographique
  // avec le reste de l'app (qui utilise `fr-FR` partout).
  return new Intl.NumberFormat("fr-FR").format(n);
}

export async function BonsPlansHero() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dealsThisMonth, hotThisWeek, activeMembers] = await Promise.all([
    prisma.deal.count({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: firstOfMonth },
      },
    }),
    prisma.deal.count({
      where: {
        status: "PUBLISHED",
        temperature: { gte: 100 },
        publishedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.user.count({
      where: { lastActiveAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const kpis = [
    { value: dealsThisMonth, label: "deals postés ce mois" },
    { value: hotThisWeek, label: "chauds cette semaine" },
    { value: activeMembers, label: "membres actifs" },
  ];

  return (
    <section
      aria-labelledby="bons-plans-hero-title"
      className="relative -mx-4 overflow-hidden bg-gradient-to-b from-peyi-orange-50/70 to-transparent px-4 pb-6 pt-6 sm:mx-0 sm:px-0 sm:pb-10 sm:pt-12"
    >
      {/* Décorations — deux pastilles colorées, subtiles, pour casser
          le vide sur desktop. Opacité faible, masquées au focus (les
          screen readers les ignorent via `aria-hidden`). Sur mobile on
          réduit la taille pour ne pas occuper la précieuse place. */}
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-6 h-12 w-12 rounded-full bg-peyi-orange opacity-20 sm:right-16 sm:top-10 sm:h-16 sm:w-16"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-4 right-2 h-20 w-20 rounded-full bg-peyi-green opacity-15 sm:right-10 sm:h-28 sm:w-28"
      />

      <div className="relative max-w-2xl">
        <p className="font-mono text-eyebrow uppercase text-peyi-orange-700">
          La communauté des malins du peyi
        </p>
        <h1
          id="bons-plans-hero-title"
          className="mt-2 font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-title-lg sm:leading-[1.05]"
        >
          Les meilleurs <HighlightJaune>bons plans</HighlightJaune> de Guyane,
          <br className="hidden sm:inline" /> validés par la communauté.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-[1.5] text-ink-700 sm:text-lede">
          <span className="sm:hidden">
            Tous les deals du peyi. Votés chauds ou froids par de vrais gens.
          </span>
          <span className="hidden sm:inline">
            De la high-tech aux billets d&apos;avion en passant par les
            courses du quotidien : tous les deals sont ici. Votés chauds ou
            froids par de vrais gens du peyi.
          </span>
        </p>

        {/* KPIs — masqués sur mobile (le viewport vertical est précieux,
            on laisse la vedette au strip catégories + liste de deals qui
            suivent). Réaffichés sm:+ où l'espace le permet. */}
        <ul className="mt-6 hidden flex-wrap items-baseline gap-x-5 gap-y-2 sm:flex">
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
