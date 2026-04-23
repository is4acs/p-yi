import Link from "next/link";

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
      <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[38px]">
        {h1}
      </h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-700 sm:text-[15px]">
        {intro}
      </p>
    </header>
  );
}

export function ExplorerAlso({
  title = "Explorer aussi",
  links,
}: {
  title?: string;
  links: ExploreLink[];
}) {
  if (links.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-peyi-orange-700 transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50"
            >
              {link.label}
              {link.description && (
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  {link.description}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
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
      <h2 className="font-display text-lg font-semibold text-ink-900">{title}</h2>
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
