import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildDealsUrl, type DealsSort } from "@/lib/deals/url";

type Props = {
  page: number;
  pageCount: number;
  sort: DealsSort;
  category: string | null;
  city: string | null;
};

export function DealsPagination({ page, pageCount, sort, category, city }: Props) {
  if (pageCount <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  const prevUrl = buildDealsUrl({ sort, category, city, page: page - 1 });
  const nextUrl = buildDealsUrl({ sort, category, city, page: page + 1 });

  return (
    <nav
      aria-label="Pagination des bons plans"
      className="mt-6 flex items-center justify-between gap-3"
    >
      <PagerLink href={prevUrl} disabled={!hasPrev} label="Précédent" />
      <span className="text-sm text-muted-foreground tabular-nums">
        Page <span className="font-semibold text-foreground">{page}</span> /{" "}
        {pageCount}
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
    "inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium",
    disabled
      ? "cursor-not-allowed border-border bg-muted text-muted-foreground/50"
      : "border-border bg-background text-foreground hover:border-peyi-orange-300",
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
