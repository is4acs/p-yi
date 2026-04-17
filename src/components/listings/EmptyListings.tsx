import Link from "next/link";
import { PackageSearch } from "lucide-react";

type Props = {
  hasFilters: boolean;
};

export function EmptyListings({ hasFilters }: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center">
      <PackageSearch
        className="mb-3 h-8 w-8 text-peyi-green-500"
        aria-hidden
      />
      <h2 className="font-display text-lg font-semibold">
        {hasFilters
          ? "Aucune annonce ne correspond"
          : "Aucune annonce pour le moment"}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasFilters
          ? "Essaie d'élargir ta recherche ou efface les filtres."
          : "Sois le premier à publier une annonce en Guyane."}
      </p>
      {hasFilters ? (
        <Link
          href="/annonces"
          className="mt-4 inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:border-peyi-orange-300"
        >
          Effacer les filtres
        </Link>
      ) : (
        <Link
          href="/poster/annonce"
          className="mt-4 inline-flex h-10 items-center rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white hover:bg-peyi-orange-600"
        >
          Poster une annonce
        </Link>
      )}
    </div>
  );
}
