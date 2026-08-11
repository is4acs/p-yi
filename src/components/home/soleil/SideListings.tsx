import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

import { SectionHead, StripedImage } from "@/components/home/soleil/primitives";
import { isRenderableImageUrl } from "@/lib/images";

type HomeListing = {
  id: string;
  slug: string;
  title: string;
  priceLabel: string;
  /** « Saint-Laurent · 40 min ». */
  meta: string;
  coverImageUrl: string | null;
};

/**
 * « Côté annonces » — grille de vignettes avec le prix posé SUR la
 * photo, en pastille crème. C'est la signature « annonce » de la
 * direction, par opposition au prix orange en ligne des bons plans.
 *
 * La dernière case est toujours l'invitation à déposer une annonce, en
 * pointillés : sur une place de marché naissante, la porte d'entrée
 * vendeur doit être visible depuis l'accueil, pas seulement depuis un
 * bouton de barre de navigation.
 */
export function SideListings({ listings }: { listings: HomeListing[] }) {
  return (
    <section aria-labelledby="cote-annonces">
      <SectionHead
        title="Côté annonces"
        linkLabel="Tout voir"
        href="/annonces"
      />
      <div id="cote-annonces" className="mt-3 grid grid-cols-2 gap-3">
        {listings.map((listing) => (
          <Link key={listing.id} href={`/annonces/${listing.slug}`} className="group">
            <div className="relative">
              {isRenderableImageUrl(listing.coverImageUrl) ? (
                <div className="relative h-[110px] w-full overflow-hidden rounded-md bg-surface">
                  <Image
                    src={listing.coverImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 45vw, 220px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <StripedImage className="h-[110px] w-full" label="photo" />
              )}
              <span className="absolute bottom-2 left-2 rounded-xs bg-background px-2 py-[3px] font-display text-xs font-extrabold text-foreground shadow-sm">
                {listing.priceLabel}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] font-bold group-hover:underline">
              {listing.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {listing.meta}
            </p>
          </Link>
        ))}

        <Link
          href="/poster/annonce"
          className="flex min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed border-input transition hover:border-peyi-orange-400"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-peyi-orange-500">
            <Plus className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
          </span>
          <span className="text-center text-[11.5px] font-bold leading-snug">
            Dépose ton
            <br />
            annonce
          </span>
        </Link>
      </div>
    </section>
  );
}
