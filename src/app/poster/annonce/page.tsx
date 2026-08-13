import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { ListingForm } from "@/components/poster/ListingForm";
import {
  CategoryPicker,
  type PickerCategory,
} from "@/components/poster/CategoryPicker";
import { BackHeader } from "@/components/soleil/BackHeader";
import { PosterFork } from "@/components/soleil/PosterFork";

import { createListingAction } from "./actions";
import { getMessages, tFormat } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Poster une annonce",
  description:
    "Vends, échange ou donne près de chez toi. Publie ton annonce sur Péyi.",
  robots: { index: false, follow: false },
};

type SearchParams = {
  category?: string;
  parent?: string;
  error?: string;
};

export default async function PosterAnnoncePage(
  props: {
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const user = await requireUser("/poster/annonce");

  // Pull the full LISTING category tree once — small table, cheap query,
  // keeps the page statically composable. We group children under their
  // parent so the picker can decide whether to drill down or jump to form.
  const allCategories = await prisma.category.findMany({
    where: { isActive: true, type: { in: ["LISTING", "BOTH"] } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      icon: true,
      parentId: true,
      id: true,
    },
  });

  const parents: PickerCategory[] = allCategories
    .filter((c) => !c.parentId)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      icon: p.icon,
      children: allCategories
        .filter((c) => c.parentId === p.id)
        .map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
    }));

  const bySlug = new Map(allCategories.map((c) => [c.slug, c]));
  const parentIdToChildren = new Map<string, typeof allCategories>();
  for (const c of allCategories) {
    if (!c.parentId) continue;
    const list = parentIdToChildren.get(c.parentId) ?? [];
    list.push(c);
    parentIdToChildren.set(c.parentId, list);
  }

  // Only land on the form when the slug refers to an actual leaf category.
  // A parent with children (like `vehicules`) must force a sub-category
  // pick before the form shows — we redirect through the picker grid.
  const selectedCategorySlug = (() => {
    if (!searchParams.category) return undefined;
    const cat = bySlug.get(searchParams.category);
    if (!cat) return undefined;
    const hasChildren = (parentIdToChildren.get(cat.id)?.length ?? 0) > 0;
    return hasChildren ? undefined : searchParams.category;
  })();

  const activeParent: PickerCategory | undefined = (() => {
    if (searchParams.parent) {
      return parents.find((p) => p.slug === searchParams.parent);
    }
    // Fallback : if a parent slug accidentally landed in `?category=`, honour
    // the intent and drill into its sub-grid rather than showing the form.
    if (searchParams.category && !selectedCategorySlug) {
      return parents.find((p) => p.slug === searchParams.category);
    }
    return undefined;
  })();

  // ----- Form branch ---------------------------------------------------
  if (selectedCategorySlug) {
    const selected = bySlug.get(selectedCategorySlug)!;
    const [flatCategoriesForForm, cities] = await Promise.all([
      // Leaf-only list for the form's dropdown — posters should always land
      // on a specific sub-category when one exists, so we filter out the
      // umbrella parents that do have children.
      prisma.category.findMany({
        where: { isActive: true, type: { in: ["LISTING", "BOTH"] } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          icon: true,
          parentId: true,
          children: { select: { id: true }, take: 1 },
        },
      }),
      prisma.city.findMany({
        orderBy: { name: "asc" },
        select: { slug: true, name: true },
      }),
    ]);

    const formCategories = flatCategoriesForForm
      .filter((c) => c.children.length === 0)
      .map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));

    return (
      <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
        <div className="mx-auto w-full max-w-md sm:max-w-2xl">
          <BackHeader title={t.poster.title} backHref="/poster/annonce" />

          <div className="px-5">
            <PosterFork selected="annonce" className="pt-4" />

            <Link
              href="/poster/annonce"
              className="mt-4 inline-flex min-h-[36px] items-center gap-1 text-xs font-bold text-soleil-muted2 dark:text-soleil-muted-d"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              {t.poster.changeCategory}
            </Link>

            <h1 className="mt-1 font-display text-[22px] font-extrabold leading-[1.12]">
              {selected.name}
            </h1>
            <p className="mt-1 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
              {tFormat(t.poster.listingIntro, { name: user.username })}
            </p>

            {searchParams.error && (
              <div
                role="alert"
                className="mt-4 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {searchParams.error}
              </div>
            )}

            <div className="mt-5">
              <ListingForm
                action={createListingAction}
                categories={formCategories}
                cities={cities}
                defaults={{
                  categorySlug: selectedCategorySlug,
                  // Only auto-fill when the phone is verified — an unverified number
                  // would weaken the trust signal we show on listing cards.
                  contactPhone: user.phoneVerified ? user.phone : null,
                  showPhone: Boolean(user.phoneVerified && user.phone),
                }}
                profilePhone={user.phone}
                profilePhoneVerified={user.phoneVerified}
                submitLabel={t.poster.publishCta}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ----- Picker branch -------------------------------------------------
  return (
    <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md sm:max-w-2xl">
      <BackHeader title={t.poster.title} backHref="/poster" />

      <div className="px-5">
      <PosterFork selected="annonce" className="pt-4" />

      <h1 className="mt-5 font-display text-[17px] font-extrabold">
        {t.poster.chooseCategory}
      </h1>
      <p className="mt-1 text-xs text-soleil-muted2 dark:text-soleil-muted-d">
        {t.poster.chooseCategoryHelp}
      </p>

      <div className="mt-4">
        <CategoryPicker parents={parents} activeParent={activeParent} />
      </div>
      </div>
      </div>
    </main>
  );
}
