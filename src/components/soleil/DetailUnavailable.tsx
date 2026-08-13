import Link from "next/link";

/**
 * État « fiche indisponible temporairement » des pages détail (annonce
 * et bon plan) — même bloc des deux côtés, auparavant dupliqué ET codé
 * en dur en français. Les libellés viennent des dictionnaires
 * (`t.listingDetail`/`t.dealDetail` + `t.common`).
 */
export function DetailUnavailable({
  title,
  body,
  backHref,
  backLabel,
  reloadHref,
  reloadLabel,
}: {
  title: string;
  body: string;
  backHref: string;
  backLabel: string;
  reloadHref: string;
  reloadLabel: string;
}) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center bg-soleil-cream px-4 py-12 text-center text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
      <h1 className="font-display text-[22px] font-extrabold leading-[1.12]">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-soleil-body dark:text-soleil-body-d">
        {body}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={backHref}
          className="inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
        >
          {backLabel}
        </Link>
        <Link
          href={reloadHref}
          className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-soleil-forest px-4 text-sm font-bold dark:border-soleil-cream"
        >
          {reloadLabel}
        </Link>
      </div>
    </main>
  );
}
