import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Send } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePicker } from "@/components/poster/ImagePicker";

import { createDealAction } from "./actions";

export const metadata: Metadata = {
  title: "Poster un bon plan",
  description: "Partage tes meilleures affaires avec la communauté Péyi.",
};

export default async function PosterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const user = await requireUser("/poster");

  const [categories, cities] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, type: { in: ["DEAL", "BOTH"] } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, icon: true },
    }),
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <Link
        href="/bons-plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Annuler
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Poster un bon plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Partage une promo, un prix fou ou un deal caché. +5 karma pour toi,
          @{user.username}.
        </p>
      </div>

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <form
        action={createDealAction}
        encType="multipart/form-data"
        className="mt-6 space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre *</Label>
          <Input
            id="title"
            name="title"
            type="text"
            required
            minLength={8}
            maxLength={120}
            placeholder="Ex: PS5 Slim à 399€ chez Cdiscount"
          />
        </div>

        <ImagePicker />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="price">Prix (€) *</Label>
            <Input
              id="price"
              name="price"
              type="text"
              inputMode="decimal"
              required
              pattern="[0-9]+([.,][0-9]{1,2})?"
              placeholder="399"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="originalPrice">Prix d&apos;origine (€)</Label>
            <Input
              id="originalPrice"
              name="originalPrice"
              type="text"
              inputMode="decimal"
              pattern="[0-9]+([.,][0-9]{1,2})?"
              placeholder="499"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categorySlug">Catégorie *</Label>
          <select
            id="categorySlug"
            name="categorySlug"
            required
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
            defaultValue=""
          >
            <option value="" disabled>
              Choisis une catégorie
            </option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="citySlug">Commune</Label>
          <select
            id="citySlug"
            name="citySlug"
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
            defaultValue=""
          >
            <option value="">Toute la Guyane</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="externalUrl">Lien vers l&apos;offre</Label>
          <Input
            id="externalUrl"
            name="externalUrl"
            type="url"
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground">
            Amazon, Cdiscount, site du commerçant… on détectera automatiquement
            les liens affiliés.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Date d&apos;expiration</Label>
          <Input id="expiresAt" name="expiresAt" type="date" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={2000}
            placeholder="Donne les détails : conditions, code promo, dispo en magasin…"
            className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          />
        </div>

        <Button type="submit" size="lg" className="w-full">
          <Send className="h-4 w-4" aria-hidden />
          Publier le bon plan
        </Button>
      </form>
    </main>
  );
}
