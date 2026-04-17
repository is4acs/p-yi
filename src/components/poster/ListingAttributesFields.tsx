"use client";

import { Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttributeValue, FieldDef } from "@/lib/listings/field-registry";

type Props = {
  fields: FieldDef[];
  /** Valeurs pré-remplies (mode édition). */
  defaults?: Record<string, AttributeValue>;
};

/**
 * Rend la section "Détails spécifiques" d'une annonce en se basant sur un
 * registry de champs propre à la catégorie sélectionnée. Chaque champ est
 * posté sous la clé `attr.<name>` dans la FormData — la server action
 * n'accepte que les clés connues du registry, donc pas de risque d'injecter
 * des attributs arbitraires.
 *
 * Le component ne gère pas d'état interne : chaque champ utilise son propre
 * `defaultValue`, ce qui permet au parent (`ListingForm`) de remonter les
 * champs lorsque la catégorie change — React déclenche un nouveau mount, et
 * les defaults reflètent l'édition en cours.
 */
export function ListingAttributesFields({ fields, defaults }: Props) {
  if (fields.length === 0) return null;

  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">Détails spécifiques</legend>
      <p className="-mt-1 flex items-start gap-1 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Ces champs aident les acheteurs à te trouver quand ils filtrent par
        critères.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <AttributeField
            key={field.name}
            field={field}
            defaultValue={defaults?.[field.name] ?? null}
          />
        ))}
      </div>
    </fieldset>
  );
}

function AttributeField({
  field,
  defaultValue,
}: {
  field: FieldDef;
  defaultValue: AttributeValue;
}) {
  const inputName = `attr.${field.name}`;
  const inputId = `attr-${field.name}`;

  // Les champs booléens n'ont pas de label en position "bloc" — la case
  // est inline avec le texte, et occupent toute la largeur sur mobile
  // comme desktop pour éviter les orphelins dans la grille.
  if (field.type === "boolean") {
    return (
      <label
        htmlFor={inputId}
        className="col-span-full flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm transition has-[:checked]:border-peyi-green-500 has-[:checked]:bg-peyi-green-50"
      >
        <input
          id={inputId}
          type="checkbox"
          name={inputName}
          value="on"
          defaultChecked={Boolean(defaultValue)}
          className="h-4 w-4 rounded border-border accent-peyi-orange-500"
        />
        <span className="flex-1 font-medium">{field.label}</span>
        {field.help && (
          <span className="text-xs text-muted-foreground">{field.help}</span>
        )}
      </label>
    );
  }

  if (field.type === "select") {
    const current =
      typeof defaultValue === "string" ? defaultValue : "";
    return (
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>
          {field.label}
          {field.required && " *"}
        </Label>
        <select
          id={inputId}
          name={inputName}
          required={field.required}
          defaultValue={current}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help && (
          <p className="text-xs text-muted-foreground">{field.help}</p>
        )}
      </div>
    );
  }

  // text / number / date
  const isNumber = field.type === "number";
  const isDate = field.type === "date";
  const current =
    defaultValue === null || defaultValue === undefined
      ? ""
      : String(defaultValue);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>
        {field.label}
        {field.unit ? ` (${field.unit})` : ""}
        {field.required ? " *" : ""}
      </Label>
      <Input
        id={inputId}
        name={inputName}
        type={isDate ? "date" : "text"}
        inputMode={isNumber ? "numeric" : undefined}
        pattern={isNumber ? "[0-9]+([.,][0-9]{1,2})?" : undefined}
        required={field.required}
        defaultValue={current}
        placeholder={field.placeholder}
        maxLength={field.type === "text" ? 200 : undefined}
      />
      {field.help && (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      )}
    </div>
  );
}
