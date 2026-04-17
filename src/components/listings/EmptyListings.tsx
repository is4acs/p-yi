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
      <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center">
        <SlidersHorizontal
          className="mb-3 h-8 w-8 text-peyi-orange-500"
          aria-hidden
        />
        <h2 className="font-display text-lg font-semibold">
          Aucun résultat avec ces filtres
        </h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Essaie d&apos;élargir la fourchette ou retire un critère.
        </p>
        <Link
          href={clearFiltersHref}
          className="mt-4 inline-flex h-10 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-peyi-orange-600"
        >
          Effacer les filtres
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center">
      <PackageSearch
        className="mb-3 h-8 w-8 text-peyi-green-500"
        aria-hidden
      />
      <h2 className="font-display text-lg font-semibold">
        Aucune annonce pour le moment
      </h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Sois le premier à publier une annonce en Guyane.
      </p>
      <Link
        href="/poster/annonce"
        className="mt-4 inline-flex h-10 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white hover:bg-peyi-orange-600"
      >
        Poster une annonce
      </Link>
    </div>
  );
}
