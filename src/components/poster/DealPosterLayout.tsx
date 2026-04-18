"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { LivePreview } from "./LivePreview";
import { PosterTips } from "./PosterTips";

/**
 * DealPosterLayout — split-screen `/poster` :
 *   lg:+   formulaire (1fr) + aside 320px (aperçu + tips) sticky
 *   <lg    formulaire plein width, tips empilés sous le bouton submit
 *          (preview masqué — pas assez d'espace vertical pour qu'il
 *          apporte plus que le formulaire lui-même sur mobile).
 *
 * Client component wrapper. `DealForm` est passé en `children` et reste
 * un server component (Form + server action intacts). On capte `onInput`
 * au niveau du wrapper : les inputs natifs bubblent leurs événements
 * jusqu'à nous — pas besoin de convertir DealForm en controlled form.
 *
 * Le match sur `target.name` est l'allow-list des champs qui alimentent
 * la preview. On ignore les autres (externalUrl, expiresAt, …) parce
 * qu'ils n'apparaissent pas sur la carte publique — inutile de les
 * tracer dans notre state.
 *
 * Les defaults initiaux sont importants pour `/bons-plans/[slug]/edit`
 * (réutilise le même form pour l'édition) : la preview démarre renseignée.
 */

type Category = { slug: string; name: string; icon: string | null };
type City = { slug: string; name: string };

type Defaults = {
  title?: string;
  price?: string;
  originalPrice?: string | null;
  categorySlug?: string;
  citySlug?: string | null;
  storeName?: string | null;
};

type Props = {
  children: ReactNode;
  categories: Category[];
  cities: City[];
  defaults?: Defaults;
};

// Les noms matchent exactement les `name=` des inputs de `DealForm`.
// Si le form ajoute un champ, il faut ajouter la clé ici pour qu'elle
// remonte en preview.
const PREVIEW_FIELDS = new Set([
  "title",
  "price",
  "originalPrice",
  "categorySlug",
  "citySlug",
  "storeName",
]);

type PreviewState = {
  title: string;
  price: string;
  originalPrice: string;
  categorySlug: string;
  citySlug: string;
  storeName: string;
};

export function DealPosterLayout({
  children,
  categories,
  cities,
  defaults,
}: Props) {
  const [values, setValues] = useState<PreviewState>({
    title: defaults?.title ?? "",
    price: defaults?.price ?? "",
    originalPrice: defaults?.originalPrice ?? "",
    categorySlug: defaults?.categorySlug ?? "",
    citySlug: defaults?.citySlug ?? "",
    storeName: defaults?.storeName ?? "",
  });

  function handleInput(e: FormEvent<HTMLDivElement>) {
    const target = e.target as HTMLInputElement &
      HTMLTextAreaElement &
      HTMLSelectElement;
    const name = target.name;
    if (!name || !PREVIEW_FIELDS.has(name)) return;
    setValues((prev) => ({ ...prev, [name]: target.value }));
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
      <div onInput={handleInput}>{children}</div>

      <aside className="mt-8 lg:mt-0">
        <div className="lg:sticky lg:top-6 lg:space-y-4">
          {/* Preview — desktop uniquement (écran suffisant pour l'aside).
              Sur mobile, la preview serait redondante avec le formulaire
              qu'on vient de saisir dans l'écran juste au-dessus. */}
          <div className="hidden lg:block">
            <LivePreview
              title={values.title}
              price={values.price}
              originalPrice={values.originalPrice}
              categorySlug={values.categorySlug}
              citySlug={values.citySlug}
              storeName={values.storeName}
              categories={categories}
              cities={cities}
            />
          </div>
          <PosterTips />
        </div>
      </aside>
    </div>
  );
}
