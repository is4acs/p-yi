import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";

type Props = {
  page: number;
  pageCount: number;
  sort: DealsSort;
  category: string | null;
  city: string | null;
  q?: string | null;
};

export function DealsPagination({
  page,
  pageCount,
  sort,
  category,
  city,
  q,
}: Props) {
  if (pageCount <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  const prevUrl = buildDealsUrl({ sort, category, city, q, page: page - 1 });
  const nextUrl = buildDealsUrl({ sort, category, city, q, page: page + 1 });

  return (
    <nav
      aria-label="Pagination des bons plans"
      className="mt-6 flex items-center justify-between gap-3"
    >
      <PagerLink href={prevUrl} disabled={!hasPrev} label="Précédent" />
      <span className="text-xs tabular-nums text-soleil-muted dark:text-soleil-muted-d">
        Page{" "}
        <span className="font-bold text-soleil-forest dark:text-soleil-cream">
          {page}
        </span>{" "}
        / {pageCount}
      </span>
      <PagerLink href={nextUrl} disabled={!hasNext} label="Suivant" />
    </nav>
  );
}

function PagerLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  const classes = cn(
    "inline-flex min-h-[44px] items-center rounded-full border-[1.5px] px-4 py-2 text-xs font-bold",
    disabled
      ? "cursor-not-allowed border-soleil-border text-soleil-muted dark:border-soleil-border-d dark:text-soleil-muted-d"
      : "border-soleil-forest text-soleil-forest dark:border-soleil-cream dark:text-soleil-cream",
  );

  if (disabled) {
    return (
      <span aria-disabled className={classes}>
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={classes} scroll>
      {label}
    </Link>
  );
}
