import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ImagePicker } from "./ImagePicker";

type Category = { slug: string; name: string; icon: string | null };
type City = { slug: string; name: string };

export type DealFormValues = {
  dealId?: string;
  title?: string;
  description?: string | null;
  price?: string;
  originalPrice?: string | null;
  externalUrl?: string | null;
  categorySlug?: string;
  citySlug?: string | null;
  expiresAt?: string | null; // yyyy-mm-dd
  coverImageUrl?: string | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  cities: City[];
  defaults?: DealFormValues;
  submitLabel?: string;
};

export function DealForm({
  action,
  categories,
  cities,
  defaults,
  submitLabel = "Publier le bon plan",
}: Props) {
  const v = defaults ?? {};

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {v.dealId && <input type="hidden" name="dealId" value={v.dealId} />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          minLength={8}
          maxLength={120}
          defaultValue={v.title ?? ""}
          placeholder="Ex: PS5 Slim à 399€ chez Cdiscount"
        />
      </div>

      <ImagePicker initialUrl={v.coverImageUrl ?? null} />

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
            defaultValue={v.price ?? ""}
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
            defaultValue={v.originalPrice ?? ""}
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
          defaultValue={v.categorySlug ?? ""}
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
          defaultValue={v.citySlug ?? ""}
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
          defaultValue={v.externalUrl ?? ""}
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          Amazon, Cdiscount, site du commerçant… on détectera automatiquement
          les liens affiliés.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="expiresAt">Date d&apos;expiration</Label>
        <Input
          id="expiresAt"
          name="expiresAt"
          type="date"
          defaultValue={v.expiresAt ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          defaultValue={v.description ?? ""}
          placeholder="Donne les détails : conditions, code promo, dispo en magasin…"
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
        />
      </div>

      <Button type="submit" size="lg" className="w-full">
        <Send className="h-4 w-4" aria-hidden />
        {submitLabel}
      </Button>
    </form>
  );
}
