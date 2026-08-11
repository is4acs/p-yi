import Link from "next/link";
import { Sparkles } from "lucide-react";

type Props = {
  hasFilters: boolean;
};

export function EmptyDeals({ hasFilters }: Props) {
  return (
    <div className="flex flex-col items-center rounded-[14px] bg-soleil-sand px-4 py-12 text-center text-soleil-forest dark:bg-soleil-forest dark:text-soleil-cream">
      <Sparkles
        className="mb-3 h-8 w-8 text-soleil-orange"
        aria-hidden
      />
      <h2 className="font-display text-lg font-extrabold">
        {hasFilters ? "Aucun bon plan ne correspond" : "Encore aucun bon plan"}
      </h2>
      <p className="mt-1 max-w-xs text-sm text-soleil-body dark:text-soleil-body-d">
        {hasFilters
          ? "Essaie d'élargir ta recherche ou efface les filtres."
          : "Sois le premier à partager un bon plan de ta commune."}
      </p>
      {hasFilters ? (
        <Link
          href="/bons-plans"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-soleil-forest px-4 text-sm font-bold dark:border-soleil-cream"
        >
          Effacer les filtres
        </Link>
      ) : (
        <Link
          href="/poster/bon-plan"
          className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
        >
          Poster un bon plan
        </Link>
      )}
    </div>
  );
}
