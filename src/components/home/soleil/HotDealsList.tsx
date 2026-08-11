import Link from "next/link";

import {
  SectionHead,
  TemperatureCircle,
} from "@/components/home/soleil/primitives";
import { cn } from "@/lib/utils";

type HotDeal = {
  id: string;
  slug: string;
  title: string;
  priceLabel: string;
  /** « Carrefour · Matoury · il y a 2 h · 24 commentaires ». */
  meta: string;
  temperature: number;
};

/**
 * « Ça chauffe cette semaine » — liste éditoriale numérotée.
 *
 * Le rang (`01`, `02`, `03`) en Bricolage orange tient lieu de puce :
 * c'est un classement, pas une liste à cocher. D'où le `<ol>`, qui le
 * dit aussi aux lecteurs d'écran.
 *
 * Les filets séparent les lignes sans les encadrer — la maquette évite
 * volontairement les cartes ici, pour que la page respire entre deux
 * blocs qui, eux, sont des cartes.
 */
export function HotDealsList({ deals }: { deals: HotDeal[] }) {
  if (deals.length === 0) return null;

  return (
    <section aria-labelledby="ca-chauffe">
      <SectionHead
        title="Ça chauffe cette semaine"
        linkLabel="Tout voir"
        href="/bons-plans"
      />
      <ol id="ca-chauffe" className="mt-1">
        {deals.map((deal, index) => (
          <li
            key={deal.id}
            className={cn(
              "flex items-center gap-3.5 py-3.5",
              index < deals.length - 1 && "border-b border-hairline",
            )}
          >
            <span
              aria-hidden
              className="w-8 shrink-0 font-display text-xl font-extrabold text-peyi-orange-500"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">
                <Link
                  href={`/bons-plans/${deal.slug}`}
                  className="hover:underline"
                >
                  {deal.title}
                </Link>{" "}
                <span className="whitespace-nowrap text-accent-text">
                  · {deal.priceLabel}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {deal.meta}
              </p>
            </div>
            <TemperatureCircle temperature={deal.temperature} />
          </li>
        ))}
      </ol>
    </section>
  );
}
