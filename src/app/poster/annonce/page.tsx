import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Pencil } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { ListingForm } from "@/components/poster/ListingForm";
import {
  CategoryPicker,
  type PickerCategory,
} from "@/components/poster/CategoryPicker";

import { createListingAction } from "./actions";

export const metadata: Metadata = {
  title: "Poster une annonce",
  description:
    "Vends, échange ou donne près de chez toi. Publie ton annonce sur Péyi.",
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
      <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
        <Link
          href="/poster/annonce"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Changer de catégorie
        </Link>

        <div className="mt-4 flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-peyi-orange-100 text-2xl"
          >
            {selected.icon ?? "📦"}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {selected.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Poste ton annonce dans cette catégorie — +3 karma pour toi,
              @{user.username}.
            </p>
          </div>
        </div>

        {searchParams.error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {searchParams.error}
          </div>
        )}

        <div className="mt-6">
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
            submitLabel="Publier l'annonce"
          />
        </div>
      </main>
    );
  }

  // ----- Picker branch -------------------------------------------------
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/annonces"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Annuler
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          <Pencil className="mr-2 inline h-6 w-6 text-peyi-orange-500" aria-hidden />
          Que veux-tu poster&nbsp;?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis une catégorie — on te proposera ensuite les bonnes questions
          pour que ton annonce soit au top.
        </p>
      </div>

      <div className="mt-6">
        <CategoryPicker parents={parents} activeParent={activeParent} />
      </div>
    </main>
  );
}
