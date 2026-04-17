import { prisma } from "@/lib/prisma";
import { DealCard } from "@/components/deals/DealCard";
import { DealStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bons plans",
  description: "Les bons plans partagés par la communauté en Guyane.",
};

export default async function BonsPlansPage() {
  const deals = await prisma.deal.findMany({
    where: { status: DealStatus.PUBLISHED },
    orderBy: [
      { isPinned: "desc" },
      { temperature: "desc" },
      { publishedAt: "desc" },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      originalPrice: true,
      discountPercent: true,
      isFree: true,
      temperature: true,
      commentCount: true,
      publishedAt: true,
      coverImageUrl: true,
      city: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true, icon: true } },
      store: { select: { name: true, slug: true } },
      merchant: { select: { name: true, slug: true, logoUrl: true } },
    },
  });

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:max-w-2xl sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Bons plans
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {deals.length} bons plans partagés par la communauté.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {deals.map((d) => (
          <li key={d.id}>
            <DealCard deal={d} />
          </li>
        ))}
      </ul>
    </main>
  );
}
