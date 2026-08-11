import Link from "next/link";
import { PackageSearch, SlidersHorizontal } from "lucide-react";

type Props = {
  /**
   * - `"no-listings"` : la catégorie/scope ne contient aucune annonce du tout.
   *   CTA: aller poster la sienne.
   * - `"filtered"` : l'utilisateur a appliqué des filtres qui ne matchent
   *   rien. CTA: effacer les filtres.
   */
  mode: "no-listings" | "filtered";
  /**
   * URL à utiliser pour le CTA "effacer les filtres". Permet à l'appelant
   * de préserver ou non le contexte (catégorie / ville) selon ce qui
   * correspond au scope courant.
   */
  clearFiltersHref?: string;
};

export function EmptyListings({
  mode,
  clearFiltersHref = "/annonces",
}: Props) {
  if (mode === "filtered") {
    return (
      <div className="flex flex-col items-center rounded-[14px] bg-soleil-sand px-4 py-12 text-center text-soleil-forest dark:bg-soleil-forest dark:text-soleil-cream">
        <SlidersHorizontal
          className="mb-3 h-8 w-8 text-soleil-orange"
          aria-hidden
        />
        <h2 className="font-display text-lg font-extrabold">
          Aucun résultat avec ces filtres
        </h2>
        <p className="mt-1 max-w-xs text-sm text-soleil-body dark:text-soleil-body-d">
          Essaie d&apos;élargir la fourchette ou retire un critère.
        </p>
        <Link
          href={clearFiltersHref}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
        >
          Effacer les filtres
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-[14px] bg-soleil-sand px-4 py-12 text-center text-soleil-forest dark:bg-soleil-forest dark:text-soleil-cream">
      <PackageSearch
        className="mb-3 h-8 w-8 text-soleil-orange"
        aria-hidden
      />
      <h2 className="font-display text-lg font-extrabold">
        Aucune annonce pour le moment
      </h2>
      <p className="mt-1 max-w-xs text-sm text-soleil-body dark:text-soleil-body-d">
        Sois le premier à publier une annonce en Guyane.
      </p>
      <Link
        href="/poster/annonce"
        className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
      >
        Poster une annonce
      </Link>
    </div>
  );
}
