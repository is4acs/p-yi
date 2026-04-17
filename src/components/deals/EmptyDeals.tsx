import Link from "next/link";
import { Sparkles } from "lucide-react";

type Props = {
  hasFilters: boolean;
};

export function EmptyDeals({ hasFilters }: Props) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-12 text-center">
      <Sparkles
        className="mb-3 h-8 w-8 text-peyi-orange-500"
        aria-hidden
      />
      <h2 className="font-display text-lg font-semibold">
        {hasFilters ? "Aucun bon plan ne correspond" : "Encore aucun bon plan"}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {hasFilters
          ? "Essaie d'élargir ta recherche ou efface les filtres."
          : "Sois le premier à partager un bon plan de ta commune."}
      </p>
      {hasFilters ? (
        <Link
          href="/bons-plans"
          className="mt-4 inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium hover:border-peyi-orange-300"
        >
          Effacer les filtres
        </Link>
      ) : (
        <span className="mt-4 inline-flex h-10 items-center rounded-md bg-muted px-4 text-sm font-medium text-muted-foreground">
          Poster un bon plan (bientôt)
        </span>
      )}
    </div>
  );
}
