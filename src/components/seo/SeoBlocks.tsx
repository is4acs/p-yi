import type { FaqItem } from "@/lib/seo/local-pages";

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
    // Refonte « Soleil péyi » : le dégradé orange vers blanc introduisait
    // deux couleurs hors charte sur une page crème — le blanc pur y fait
    // une tache. Un simple filet et le sur-titre orange suffisent.
    <header className="rounded-lg border-[1.5px] border-input p-5 sm:p-6">
      {eyebrow && (
        <p className="text-[11px] font-extrabold uppercase tracking-[2.2px] text-accent-text">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-[38px]">
        {h1}
      </h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-copy sm:text-[15px]">
        {intro}
      </p>
    </header>
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
    <section className="rounded-lg border-[1.5px] border-input p-4 sm:p-5">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <article key={item.question} className="rounded-md bg-surface p-3">
            <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
            <p className="mt-1 text-sm leading-6 text-copy">
              {item.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
