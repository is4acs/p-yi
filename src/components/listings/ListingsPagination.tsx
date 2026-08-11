import Link from "next/link";
import { getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  buildListingsUrl,
  type ListingsFilters,
  type ListingsSort,
  type ListingTypeSlug,
} from "@/lib/listings/url";

type Props = {
  page: number;
  pageCount: number;
  sort: ListingsSort;
  category: string | null;
  city: string | null;
  type: ListingTypeSlug | null;
  q?: string | null;
  filters?: ListingsFilters;
};

export async function ListingsPagination({
  page,
  pageCount,
  sort,
  category,
  city,
  type,
  q,
  filters,
}: Props) {
  if (pageCount <= 1) return null;
  const t = await getMessages();

  const hasPrev = page > 1;
  const hasNext = page < pageCount;

  const prevUrl = buildListingsUrl({
    sort,
    category,
    city,
    type,
    q,
    filters,
    page: page - 1,
  });
  const nextUrl = buildListingsUrl({
    sort,
    category,
    city,
    type,
    q,
    filters,
    page: page + 1,
  });

  return (
    <nav
      aria-label="Pagination des annonces"
      className="mt-6 flex items-center justify-between gap-3"
    >
      <PagerLink href={prevUrl} disabled={!hasPrev} label={t.deals.previous} />
      <span className="text-xs tabular-nums text-soleil-muted dark:text-soleil-muted-d">
        {t.deals.page}{" "}
        <span className="font-bold text-soleil-forest dark:text-soleil-cream">
          {page}
        </span>{" "}
        / {pageCount}
      </span>
      <PagerLink href={nextUrl} disabled={!hasNext} label={t.deals.next} />
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
