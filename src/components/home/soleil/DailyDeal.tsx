import Link from "next/link";
import Image from "next/image";

import { Eyebrow, StripedImage } from "@/components/home/soleil/primitives";
import { isRenderableImageUrl } from "@/lib/images";

type Props = {
  deal: {
    slug: string;
    title: string;
    temperature: number;
    coverImageUrl: string | null;
    /** « Air Caraïbes · Web » — enseigne, marchand, ou commune. */
    source: string | null;
    /** « Bagage 23 kg inclus · expire le 24 août ». */
    note: string | null;
  };
};

/**
 * Le deal du jour — la carte signature de l'accueil.
 *
 * Elle est « inversée » : elle prend l'encre du thème en fond et le fond
 * du thème en encre. Forêt sur crème le jour, crème sur forêt la nuit.
 * Tout passe par `bg-invert` / `text-invert-foreground` : le composant
 * n'a aucun `dark:` et bascule quand même.
 *
 * `peyi-invert-surface` fait suivre le texte secondaire et les rayures
 * du placeholder — sans quoi un placeholder rayé à l'encre du thème
 * disparaîtrait sur un fond de cette même encre.
 */
export function DailyDeal({ deal }: Props) {
  return (
    <section aria-labelledby="deal-du-jour">
      <Eyebrow>Le deal du jour</Eyebrow>
      <div className="peyi-invert-surface mt-2.5 rounded-lg bg-invert p-[18px] text-invert-foreground">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-peyi-orange-500 px-3 py-[5px] font-display text-sm font-extrabold text-peyi-forest-500">
            {deal.temperature > 0 ? "+" : ""}
            {deal.temperature}°
          </span>
          {deal.source && (
            <span className="truncate text-xs font-semibold text-subtle">
              {deal.source}
            </span>
          )}
        </div>

        <h2
          id="deal-du-jour"
          className="mt-3 font-display text-2xl font-extrabold leading-[1.1]"
        >
          {deal.title}
        </h2>

        {deal.note && (
          <p className="mt-1.5 text-xs text-subtle">{deal.note}</p>
        )}

        {isRenderableImageUrl(deal.coverImageUrl) ? (
          <div className="relative mt-3 h-[84px] w-full overflow-hidden rounded-md">
            <Image
              src={deal.coverImageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 420px"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <StripedImage className="mt-3 h-[84px] w-full" label="visuel campagne" />
        )}

        <Link
          href={`/bons-plans/${deal.slug}`}
          className="mt-3 block rounded-full bg-invert-foreground py-[11px] text-center text-[13px] font-extrabold text-invert transition hover:opacity-90"
        >
          Voir le deal →
        </Link>
      </div>
    </section>
  );
}
