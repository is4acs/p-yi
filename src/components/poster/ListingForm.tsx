"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, Info, Send } from "lucide-react";
import type {
  ItemCondition,
  ListingType,
  PriceType,
} from "@prisma/client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { useMessages } from "@/components/soleil/I18nProvider";
import { cn } from "@/lib/utils";
import { CONDITION_LABEL, TYPE_LABEL } from "@/lib/listings/queries";
import { maxPhotosForCategory } from "@/lib/listings/photo-limits";
import {
  type AttributeValue,
  getFieldsForCategory,
} from "@/lib/listings/field-registry";

import { PhotosUploader } from "./PhotosUploader";
import { ListingAttributesFields } from "./ListingAttributesFields";

type Category = { slug: string; name: string; icon: string | null };
type City = { slug: string; name: string };

export type ListingFormValues = {
  listingId?: string;
  title?: string;
  description?: string;
  type?: ListingType;
  priceType?: PriceType;
  price?: string | null;
  condition?: ItemCondition | null;
  categorySlug?: string;
  citySlug?: string;
  neighborhood?: string | null;
  contactPhone?: string | null;
  showPhone?: boolean;
  allowMessages?: boolean;
  /** Existing photo URLs in display order (cover first). Edit mode. */
  photoUrls?: string[];
  /** Attributs dynamiques déjà renseignés (mode édition). */
  attributes?: Record<string, AttributeValue>;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  cities: City[];
  defaults?: ListingFormValues;
  submitLabel?: string;
  /**
   * Phone stored on the current user's profile. Used to build a hint under the
   * contactPhone field (verified ✓, needs verification, or none set).
   */
  profilePhone?: string | null;
  profilePhoneVerified?: boolean;
};

const TYPES: ListingType[] = ["OFFER", "DEMAND", "EXCHANGE", "DONATION"];

const PRICE_TYPES: Array<{ id: PriceType; label: string; needsPrice: boolean }> = [
  { id: "FIXED", label: "Prix ferme", needsPrice: true },
  { id: "NEGOTIABLE", label: "À débattre", needsPrice: true },
  { id: "PER_MONTH", label: "Par mois", needsPrice: true },
  { id: "PER_DAY", label: "Par jour", needsPrice: true },
  { id: "FREE", label: "Gratuit", needsPrice: false },
  { id: "ON_REQUEST", label: "Sur demande", needsPrice: false },
];

const CONDITIONS: ItemCondition[] = [
  "NEW",
  "LIKE_NEW",
  "VERY_GOOD",
  "GOOD",
  "ACCEPTABLE",
  "FOR_PARTS",
];

export function ListingForm({
  action,
  categories,
  cities,
  defaults,
  submitLabel = "Publier l'annonce",
  profilePhone,
  profilePhoneVerified,
}: Props) {
  const t = useMessages();
  const v = defaults ?? {};
  const [priceType, setPriceType] = useState<PriceType>(v.priceType ?? "FIXED");
  const [categorySlug, setCategorySlug] = useState<string>(
    v.categorySlug ?? "",
  );
  const priceRequired = ["FIXED", "NEGOTIABLE", "PER_MONTH", "PER_DAY"].includes(
    priceType,
  );
  // Photo cap follows the selected category — voiture/immo get 20 shots,
  // everything else caps at 10. The uploader gracefully keeps photos
  // over the new limit (user picked them) but blocks adding more.
  const maxPhotos = useMemo(
    () => maxPhotosForCategory(categorySlug || null),
    [categorySlug],
  );
  // Registry-driven specific fields — empty array pour les catégories
  // sans formulaire dédié (ex. covoiturage, perdu-trouvé).
  const attributeFields = useMemo(
    () => getFieldsForCategory(categorySlug),
    [categorySlug],
  );

  return (
    <form action={action} className="soleil-form space-y-5">
      {v.listingId && (
        <input type="hidden" name="listingId" value={v.listingId} />
      )}

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
          placeholder="Ex: iPhone 14 Pro 128Go · parfait état"
        />
      </div>

      <PhotosUploader initialUrls={v.photoUrls ?? []} max={maxPhotos} />

      <div className="space-y-1.5">
        <p
          id="listing-type-label"
          className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d"
        >
          {t.form.typeLabel} *
        </p>
        <div
          role="radiogroup"
          aria-labelledby="listing-type-label"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        >
          {TYPES.map((t) => (
            <label
              key={t}
              className="flex min-h-[38px] cursor-pointer items-center justify-center gap-1 rounded-full border-[1.5px] border-soleil-border px-2 py-2 text-xs font-semibold transition has-[:checked]:border-soleil-forest has-[:checked]:bg-soleil-forest has-[:checked]:font-bold has-[:checked]:text-soleil-cream has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-soleil-orange dark:border-soleil-border-d dark:has-[:checked]:border-soleil-cream dark:has-[:checked]:bg-soleil-cream dark:has-[:checked]:text-soleil-forest"
            >
              <input
                type="radio"
                name="type"
                value={t}
                defaultChecked={(v.type ?? "OFFER") === t}
                className="sr-only"
              />
              {TYPE_LABEL[t]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="priceType">{t.form.priceKind} *</Label>
          <select
            id="priceType"
            name="priceType"
            required
            value={priceType}
            onChange={(e) => setPriceType(e.target.value as PriceType)}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          >
            {PRICE_TYPES.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={cn("space-y-1.5", !priceRequired && "opacity-60")}>
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="price">{t.form.price}{priceRequired ? " *" : ""}</Label>
          <Input
            id="price"
            name="price"
            type="text"
            inputMode="decimal"
            pattern="[0-9]+([.,][0-9]{1,2})?"
            required={priceRequired}
            disabled={!priceRequired}
            defaultValue={v.price ?? ""}
            placeholder={priceRequired ? "500" : "—"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="condition">{t.form.condition}</Label>
        <select
          id="condition"
          name="condition"
          defaultValue={v.condition ?? ""}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
        >
          <option value="">{t.form.notApplicable}</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="categorySlug">{t.form.category} *</Label>
        <select
          id="categorySlug"
          name="categorySlug"
          required
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
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

      <ListingAttributesFields
        fields={attributeFields}
        defaults={v.attributes}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="citySlug">{t.form.cityField} *</Label>
          <select
            id="citySlug"
            name="citySlug"
            required
            defaultValue={v.citySlug ?? ""}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          >
            <option value="" disabled>
              {t.form.chooseCity}
            </option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="neighborhood">{t.form.neighborhood}</Label>
          <Input
            id="neighborhood"
            name="neighborhood"
            type="text"
            maxLength={80}
            defaultValue={v.neighborhood ?? ""}
            placeholder="Ex: Cogneau-Lamirande"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="description">{t.form.description} *</Label>
        <textarea
          id="description"
          name="description"
          rows={6}
          required
          minLength={20}
          maxLength={5000}
          defaultValue={v.description ?? ""}
          placeholder="Décris ton annonce : état, caractéristiques, conditions de retrait…"
          className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
        />
      </div>

      <fieldset className="space-y-3 rounded-[14px] border-[1.5px] border-soleil-border p-3 dark:border-soleil-border-d">
        <legend className="px-1 text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d">
          {t.form.contact}
        </legend>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-soleil-muted2 dark:text-soleil-muted-d" htmlFor="contactPhone">{t.form.phone}</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            maxLength={30}
            defaultValue={v.contactPhone ?? ""}
            placeholder="0694 12 34 56"
          />
          <PhoneHint
            profilePhone={profilePhone}
            profilePhoneVerified={profilePhoneVerified}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="showPhone"
            value="on"
            defaultChecked={v.showPhone ?? false}
            className="h-4 w-4 rounded border-soleil-border accent-soleil-orange dark:border-soleil-border-d"
          />
          <input type="hidden" name="showPhone" value="off" />
          {t.form.showPhone}
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowMessages"
            value="on"
            defaultChecked={v.allowMessages ?? true}
            className="h-4 w-4 rounded border-soleil-border accent-soleil-orange dark:border-soleil-border-d"
          />
          <input type="hidden" name="allowMessages" value="off" />
          {t.form.allowMessages}
        </label>
      </fieldset>

      <SubmitButton
        size="lg"
        className="w-full rounded-full bg-soleil-forest py-3.5 text-sm font-extrabold text-soleil-cream hover:bg-soleil-forest dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream"
        pendingLabel={t.poster.publishing}
      >
        <Send className="h-4 w-4" aria-hidden />
        {submitLabel}
      </SubmitButton>
      <p className="!mt-2 text-center text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
        {t.poster.publishNote}
      </p>
    </form>
  );
}

/**
 * Little info row under the phone input that reflects the user's profile
 * state. It encourages verification without blocking posting — an unverified
 * number is still usable, but the badge raises trust on the listing card.
 */
function PhoneHint({
  profilePhone,
  profilePhoneVerified,
}: {
  profilePhone?: string | null;
  profilePhoneVerified?: boolean;
}) {
  if (profilePhone && profilePhoneVerified) {
    return (
      <p className="flex items-center gap-1 text-xs text-peyi-green-700">
        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
        Pré-rempli depuis ton profil (numéro vérifié).
      </p>
    );
  }
  if (profilePhone && !profilePhoneVerified) {
    return (
      <p className="flex items-start gap-1 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Ton numéro de profil n&apos;est pas encore vérifié.{" "}
          <a
            href={`/profil/verifier-telephone?phone=${encodeURIComponent(profilePhone)}`}
            className="font-medium text-peyi-orange-600 hover:underline"
          >
            Vérifier
          </a>{" "}
          pour gagner la confiance des acheteurs.
        </span>
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        Ajoute un numéro à{" "}
        <a
          href="/profil/edit"
          className="font-medium text-peyi-orange-600 hover:underline"
        >
          ton profil
        </a>{" "}
        pour le pré-remplir automatiquement.
      </span>
    </p>
  );
}
