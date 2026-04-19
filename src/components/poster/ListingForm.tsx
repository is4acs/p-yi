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
    <form action={action} className="space-y-5">
      {v.listingId && (
        <input type="hidden" name="listingId" value={v.listingId} />
      )}

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
          placeholder="Ex: iPhone 14 Pro 128Go · parfait état"
        />
      </div>

      <PhotosUploader initialUrls={v.photoUrls ?? []} max={maxPhotos} />

      <div className="space-y-1.5">
        <Label htmlFor="type">Type d&apos;annonce *</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((t) => (
            <label
              key={t}
              className="flex cursor-pointer items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-2 text-xs font-medium transition has-[:checked]:border-peyi-green-500 has-[:checked]:bg-peyi-green-50 has-[:checked]:text-peyi-green-700"
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
          <Label htmlFor="priceType">Tarif *</Label>
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
          <Label htmlFor="price">Prix (€){priceRequired ? " *" : ""}</Label>
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
        <Label htmlFor="condition">État (pour les objets)</Label>
        <select
          id="condition"
          name="condition"
          defaultValue={v.condition ?? ""}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
        >
          <option value="">Non applicable</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {CONDITION_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="categorySlug">Catégorie *</Label>
        <select
          id="categorySlug"
          name="categorySlug"
          required
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
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

      <ListingAttributesFields
        fields={attributeFields}
        defaults={v.attributes}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="citySlug">Commune *</Label>
          <select
            id="citySlug"
            name="citySlug"
            required
            defaultValue={v.citySlug ?? ""}
            className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
          >
            <option value="" disabled>
              Choisis une commune
            </option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="neighborhood">Quartier</Label>
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
        <Label htmlFor="description">Description *</Label>
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

      <fieldset className="space-y-3 rounded-lg border border-border bg-card p-3">
        <legend className="px-1 text-sm font-semibold">Contact</legend>

        <div className="space-y-1.5">
          <Label htmlFor="contactPhone">Téléphone</Label>
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
            className="h-4 w-4 rounded border-border accent-peyi-orange-500"
          />
          <input type="hidden" name="showPhone" value="off" />
          Afficher mon téléphone publiquement
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allowMessages"
            value="on"
            defaultChecked={v.allowMessages ?? true}
            className="h-4 w-4 rounded border-border accent-peyi-orange-500"
          />
          <input type="hidden" name="allowMessages" value="off" />
          Autoriser les messages privés
        </label>
      </fieldset>

      <SubmitButton size="lg" className="w-full" pendingLabel="Publication…">
        <Send className="h-4 w-4" aria-hidden />
        {submitLabel}
      </SubmitButton>
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
