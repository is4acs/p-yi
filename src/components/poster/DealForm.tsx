"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { useMessages } from "@/components/soleil/I18nProvider";

import { ImagePicker } from "./ImagePicker";

type Category = { slug: string; name: string; icon: string | null };
type City = { slug: string; name: string };
export type StoreOption = { slug: string; name: string; citySlug: string };

export type DealFormValues = {
  dealId?: string;
  title?: string;
  description?: string | null;
  price?: string;
  originalPrice?: string | null;
  externalUrl?: string | null;
  categorySlug?: string;
  citySlug?: string | null;
  storeName?: string | null;
  expiresAt?: string | null; // yyyy-mm-dd
  coverImageUrl?: string | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  cities: City[];
  stores: StoreOption[];
  defaults?: DealFormValues;
  submitLabel?: string;
};

export function DealForm({
  action,
  categories,
  cities,
  stores,
  defaults,
  submitLabel = "Publier le bon plan",
}: Props) {
  const t = useMessages();
  const v = defaults ?? {};
  const [citySlug, setCitySlug] = useState<string>(v.citySlug ?? "");
  // `stores` n'est plus consommé depuis qu'on a retiré le datalist de
  // suggestions — on garde la prop pour la compat d'appel (et pour si un
  // jour on réactive l'autocomplétion).
  void stores;

  return (
    <form action={action} className="soleil-form space-y-5">
      {v.dealId && <input type="hidden" name="dealId" value={v.dealId} />}

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="title">{t.form.title} *</Label>
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
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="price">{t.form.price} *</Label>
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
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="originalPrice">{t.form.originalPrice}</Label>
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
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="categorySlug">{t.form.category} *</Label>
        <select
          id="categorySlug"
          name="categorySlug"
          required
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          defaultValue={v.categorySlug ?? ""}
        >
          <option value="" disabled>
            {t.form.chooseCategory}
          </option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="citySlug">{t.form.cityField}</Label>
          <select
            id="citySlug"
            name="citySlug"
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          >
            <option value="">{t.form.allGuyane}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="storeName">{t.form.store}</Label>
          <Input
            id="storeName"
            name="storeName"
            type="text"
            maxLength={100}
            defaultValue={v.storeName ?? ""}
            placeholder="Ex: Carrefour Matoury, Super U Kourou…"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {t.form.storeHelp}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="externalUrl">{t.form.link}</Label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          defaultValue={v.externalUrl ?? ""}
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          {t.form.linkHelp}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="expiresAt">{t.form.expiry}</Label>
        <Input
          id="expiresAt"
          name="expiresAt"
          type="date"
          defaultValue={v.expiresAt ?? ""}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="description">{t.form.description}</Label>
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

      <SubmitButton
        size="lg"
        className="w-full rounded-full bg-soleil-forest py-3.5 text-sm font-extrabold text-soleil-cream hover:bg-soleil-forest dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream"
        pendingLabel={t.poster.publishing}
      >
        <Send className="h-4 w-4" aria-hidden />
        {submitLabel}
      </SubmitButton>
      <p className="!mt-2 text-center text-[10.5px] text-soleil-muted2 dark:text-soleil-muted-d">
        {t.poster.publishNote}
      </p>
    </form>
  );
}
