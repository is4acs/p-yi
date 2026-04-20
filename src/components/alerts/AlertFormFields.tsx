import type { AlertType } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryOption = { id: string; name: string; icon: string | null };
type CityOption = { id: string; name: string };

export type AlertFormDefaults = {
  name: string;
  keywords: string[];
  type: AlertType;
  categoryId: string | null;
  cityId: string | null;
  minPrice: number | null;
  maxPrice: number | null;
};

const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300";

export function AlertFormFields({
  defaults,
  categories,
  cities,
}: {
  defaults?: AlertFormDefaults;
  categories: CategoryOption[];
  cities: CityOption[];
}) {
  const d = defaults;
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nom de l&apos;alerte</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={50}
          defaultValue={d?.name ?? ""}
          placeholder="Ex. iPhone 15 à Cayenne"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="keywords">Mots-clés</Label>
        <Input
          id="keywords"
          name="keywords"
          defaultValue={d?.keywords.join(", ") ?? ""}
          placeholder="iphone, macbook, ps5"
        />
        <p className="text-xs text-muted-foreground">
          Séparés par des virgules. 10 max, 30 caractères par mot-clé.
          Insensible à la casse et aux accents.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Type d&apos;annonces</legend>
        <div className="grid grid-cols-3 gap-2">
          <TypeRadio value="BOTH" label="Les deux" defaultType={d?.type} />
          <TypeRadio value="DEAL" label="Bons plans" defaultType={d?.type} />
          <TypeRadio value="LISTING" label="Annonces" defaultType={d?.type} />
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Catégorie</Label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={d?.categoryId ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cityId">Commune</Label>
          <select
            id="cityId"
            name="cityId"
            defaultValue={d?.cityId ?? ""}
            className={SELECT_CLASS}
          >
            <option value="">Toute la Guyane</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="minPrice">Prix min (€)</Label>
          <Input
            id="minPrice"
            name="minPrice"
            type="text"
            inputMode="decimal"
            defaultValue={d?.minPrice?.toString() ?? ""}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxPrice">Prix max (€)</Label>
          <Input
            id="maxPrice"
            name="maxPrice"
            type="text"
            inputMode="decimal"
            defaultValue={d?.maxPrice?.toString() ?? ""}
            placeholder="Sans limite"
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Tu seras notifié par push et e-mail selon tes préférences globales.
        Modifie-les depuis{" "}
        <span className="font-medium">Profil → Confidentialité</span>.
      </div>
    </div>
  );
}

function TypeRadio({
  value,
  label,
  defaultType,
}: {
  value: AlertType;
  label: string;
  defaultType: AlertType | undefined;
}) {
  const isDefault =
    defaultType === value || (defaultType === undefined && value === "BOTH");
  return (
    <label className="relative flex cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition has-[:checked]:border-peyi-orange-500 has-[:checked]:bg-peyi-orange-50 has-[:checked]:text-peyi-orange-800">
      <input
        type="radio"
        name="type"
        value={value}
        defaultChecked={isDefault}
        className="sr-only"
      />
      {label}
    </label>
  );
}
