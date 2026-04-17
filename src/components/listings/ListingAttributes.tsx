import {
  formatAttribute,
  getFieldsForCategory,
  pickRegisteredAttributes,
} from "@/lib/listings/field-registry";

type Props = {
  categorySlug: string;
  /** Contenu brut du JSON stocké en DB. */
  attributes: unknown;
};

/**
 * Rend une liste `<dl>` propre des attributs spécifiques renseignés par le
 * vendeur. Filtre par le registry de la catégorie pour ignorer d'éventuels
 * résidus (ex. attributs d'une ancienne catégorie après migration).
 *
 * Ne rend rien quand aucun champ n'a de valeur — la section est masquée
 * entièrement côté appelant via le pattern `ListingAttributes returns null`.
 */
export function ListingAttributes({ categorySlug, attributes }: Props) {
  const fields = getFieldsForCategory(categorySlug);
  const values = pickRegisteredAttributes(categorySlug, attributes);

  const rows: { label: string; value: string }[] = [];
  for (const field of fields) {
    const formatted = formatAttribute(field, values[field.name] ?? null);
    if (formatted === null) continue;
    rows.push({ label: field.label, value: formatted });
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-6 px-4 sm:px-0">
      <h2 className="font-display text-lg font-semibold">Caractéristiques</h2>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-semibold text-foreground text-right">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
