import Link from "next/link";
import { Compass, MapPin, Tag } from "lucide-react";

import type { ExploreLink, FaqItem } from "@/lib/seo/local-pages";

export function SeoIntro({
  h1,
  intro,
  eyebrow,
}: {
  h1: string;
  intro: string;
  eyebrow?: string;
}) {
  return (
    <header className="rounded-xl border border-peyi-orange-200 bg-gradient-to-b from-peyi-orange-50 to-white p-5 sm:p-6">
      {eyebrow && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-peyi-orange-700">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-[38px]">
        {h1}
      </h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-700 sm:text-[15px]">
        {intro}
      </p>
    </header>
  );
}

const GROUP_LABELS: Record<NonNullable<ExploreLink["group"]>, string> = {
  other: "Raccourcis",
  city: "Par ville",
  category: "Par catégorie",
};

const GROUP_ORDER: Array<NonNullable<ExploreLink["group"]>> = [
  "other",
  "city",
  "category",
];

/**
 * Bloc de maillage interne, en chips groupés.
 *
 * Avant : une douzaine de boutons pleine largeur portant des phrases
 * identiques à 90 % (« Voir les annonces à Cayenne », « Voir les annonces à
 * Matoury »…). Sur mobile, ça donnait un écran entier de scroll à lire mot
 * à mot pour repérer le seul mot qui change — le nom de la ville.
 *
 * Maintenant : on n'affiche QUE ce mot, sous forme de chip tactile, groupé
 * par ville / catégorie. Le texte d'ancrage descriptif complet reste dans
 * le DOM en `sr-only` : Google lit toujours « Voir les annonces à Cayenne »,
 * la valeur SEO est intacte (même motif que HomePillarLinks, cf. CODEX.md).
 * `title` donne l'infobulle au survol pour les lecteurs voyants.
 */
export function ExplorerAlso({
  title = "Explorer aussi",
  links,
}: {
  title?: string;
  links: ExploreLink[];
}) {
  if (links.length === 0) return null;

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: links.filter((link) => (link.group ?? "other") === group),
  })).filter((entry) => entry.items.length > 0);

  // Un seul groupe (guides, pages courtes) : pas d'intertitre, il n'y a
  // rien à distinguer.
  const showHeadings = groups.length > 1;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>

      <div className="mt-3 space-y-4">
        {groups.map(({ group, items }) => (
          <div key={group}>
            {showHeadings && (
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {group === "city" ? (
                  <MapPin className="h-3 w-3" aria-hidden />
                ) : group === "category" ? (
                  <Tag className="h-3 w-3" aria-hidden />
                ) : (
                  <Compass className="h-3 w-3" aria-hidden />
                )}
                {GROUP_LABELS[group]}
              </p>
            )}
            <ul className="flex flex-wrap gap-2">
              {items.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    title={link.label}
                    className="inline-flex min-h-11 items-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition duration-base hover:border-peyi-orange-300 hover:bg-peyi-orange-50 hover:text-peyi-orange-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {link.short ? (
                      <>
                        {/* Ancrage complet pour les moteurs et les lecteurs
                            d'écran ; à l'écran, seul le mot utile. */}
                        <span className="sr-only">{link.label}</span>
                        <span aria-hidden>{link.short}</span>
                      </>
                    ) : (
                      link.label
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SeoFaq({
  title = "Questions fréquentes",
  items,
}: {
  title?: string;
  items: FaqItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <article key={item.question} className="rounded-lg bg-muted/40 p-3">
            <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {item.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
