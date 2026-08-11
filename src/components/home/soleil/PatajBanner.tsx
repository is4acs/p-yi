import Link from "next/link";

/**
 * « Pataj to bon plan ! » — l'unique aplat orange plein de l'écran.
 *
 * C'est une règle du handoff : un seul CTA orange plein par écran. Le
 * reste des actions passe par l'encre (forêt) ou par le filet. Le titre
 * est en créole guyanais assumé, comme le reste du ton du site.
 *
 * Le texte secondaire est en `#5C3413` — un brun chaud choisi pour
 * passer le contraste AA sur l'orange, là où l'encre forêt vibrerait et
 * où un blanc serait illisible. Il est écrit en dur volontairement : ce
 * bloc est orange dans les deux thèmes, il ne bascule pas.
 */
export function PatajBanner() {
  return (
    <section
      aria-labelledby="pataj"
      className="relative overflow-hidden rounded-lg bg-peyi-orange-500 p-5"
    >
      <div
        aria-hidden
        className="absolute -right-6 -top-6 h-[100px] w-[100px] rounded-full bg-peyi-cream-100/25"
      />
      <h2
        id="pataj"
        className="relative font-display text-[21px] font-extrabold leading-[1.05] text-peyi-forest-500"
      >
        Pataj to bon plan !
      </h2>
      <p className="relative mt-1 text-[12.5px] font-medium text-[#5C3413]">
        Gratuit, en 2 minutes. Le péyi te dira merci.
      </p>
      <Link
        href="/poster"
        className="relative mt-3 inline-block rounded-full bg-peyi-forest-500 px-4 py-2.5 text-[12.5px] font-extrabold text-peyi-cream-100 transition hover:opacity-90"
      >
        Poster un deal +
      </Link>
    </section>
  );
}
