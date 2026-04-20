import { AlertType } from "@prisma/client";
import { z } from "zod";

/**
 * Validation pour les alertes user (saved searches + push/email).
 *
 *   - `keywords` est saisi côté UI comme chaîne "iphone, macbook" séparée
 *     par virgules. On la normalise ici : trim, lowercase-accent-insensitive
 *     sera appliqué côté matcher (src/lib/notifications/alerts.ts), donc
 *     on conserve la casse d'origine pour l'affichage.
 *   - Prix en string (formulaire HTML) puis converti en nombre pour
 *     comparaison. `null`/empty = pas de filtre.
 *   - `categoryId` / `cityId` : optionnels (UUID Prisma). Côté form on envoie
 *     "" pour "aucun" → transformé en undefined.
 */

const priceString = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional()
  .refine(
    (v) => v === undefined || /^\d+([.,]\d{1,2})?$/.test(v),
    "Prix invalide.",
  )
  .transform((v) => (v === undefined ? undefined : Number(v.replace(",", "."))));

const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional()
  .refine(
    (v) => v === undefined || /^[0-9a-f-]{36}$/i.test(v),
    "Identifiant invalide.",
  );

function parseKeywords(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  // Split virgules/points-virgules/retours-ligne, trim, dédup.
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export const alertFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Donne un nom à ton alerte.")
      .max(50, "50 caractères max."),
    keywordsRaw: z.unknown().transform(parseKeywords),
    type: z.nativeEnum(AlertType),
    categoryId: optionalUuid,
    cityId: optionalUuid,
    minPrice: priceString,
    maxPrice: priceString,
  })
  .refine((v) => v.keywordsRaw.length <= 10, {
    message: "10 mots-clés maximum.",
    path: ["keywordsRaw"],
  })
  .refine((v) => v.keywordsRaw.every((k) => k.length <= 30), {
    message: "Chaque mot-clé doit faire 30 caractères max.",
    path: ["keywordsRaw"],
  })
  .refine(
    (v) =>
      v.minPrice === undefined ||
      v.maxPrice === undefined ||
      v.minPrice <= v.maxPrice,
    {
      message: "Le prix min doit être inférieur au prix max.",
      path: ["maxPrice"],
    },
  )
  .refine(
    (v) => v.keywordsRaw.length > 0 || v.categoryId || v.cityId,
    {
      message:
        "Ajoute au moins un mot-clé, une catégorie ou une commune pour filtrer.",
      path: ["keywordsRaw"],
    },
  );

export type AlertFormInput = z.infer<typeof alertFormSchema>;
