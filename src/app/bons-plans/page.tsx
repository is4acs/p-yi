import { prisma } from "@/lib/prisma";
import { fetchDealsPage, PAGE_SIZE } from "@/lib/deals/queries";
import { parsePage, parseSort } from "@/lib/deals/url";
import { DealCard } from "@/components/deals/DealCard";
import { DealsSortTabs } from "@/components/deals/DealsSortTabs";
import { DealsFilterBar } from "@/components/deals/DealsFilterBar";
import { DealsPagination } from "@/components/deals/DealsPagination";
import { EmptyDeals } from "@/components/deals/EmptyDeals";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bons plans",
  description: "Les bons plans partagés par la communauté en Guyane.",
};

type SearchParams = {
  sort?: string;
  category?: string;
  city?: string;
  page?: string;
};

export default async function BonsPlansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);
  const category = searchParams.category?.trim() || null;
  const city = searchParams.city?.trim() || null;

  const [{ deals, total }, categories, cities] = await Promise.all([
    fetchDealsPage({ sort, page, category, city }),
    prisma.category.findMany({
      where: { type: "DEAL", isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(category || city);

  return (
    <main className="mx-auto max-w-md pb-12 sm:max-w-2xl">
      <div className="sticky top-0 z-10 -mx-0 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-0 sm:pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Bons plans
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          {total} bon{total > 1 ? "s" : ""} plan{total > 1 ? "s" : ""}
          {hasFilters ? " (filtré)" : ""}
        </p>

        <div className="mt-3 space-y-2">
          <DealsSortTabs currentSort={sort} category={category} city={city} />
          <DealsFilterBar
            sort={sort}
            categories={categories}
            cities={cities}
            selectedCategory={category}
            selectedCity={city}
          />
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-0">
        {deals.length === 0 ? (
          <EmptyDeals hasFilters={hasFilters} />
        ) : (
          <ul className="flex flex-col gap-3">
            {deals.map((d) => (
              <li key={d.id}>
                <DealCard deal={d} />
              </li>
            ))}
          </ul>
        )}

        <DealsPagination
          page={page}
          pageCount={pageCount}
          sort={sort}
          category={category}
          city={city}
        />
      </div>
    </main>
  );
}
