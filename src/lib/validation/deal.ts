import { z } from "zod";

const numericString = (label: string) =>
  z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, `${label} invalide.`)
    .transform((v) => v.replace(",", "."));

export const createDealSchema = z
  .object({
    title: z
      .string()
      .min(8, "Le titre doit faire au moins 8 caractères.")
      .max(120, "Le titre est trop long (120 caractères max)."),
    description: z
      .string()
      .max(2000, "La description est trop longue (2000 caractères max).")
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    price: numericString("Prix"),
    originalPrice: numericString("Prix d'origine").optional(),
    externalUrl: z
      .string()
      .url("Lien invalide.")
      .max(500)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    categorySlug: z
      .string()
      .min(1, "Choisis une catégorie."),
    citySlug: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    storeSlug: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    expiresAt: z
      .string()
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine(
    (v) =>
      !v.originalPrice ||
      Number(v.originalPrice) > Number(v.price),
    {
      message: "Le prix d'origine doit être supérieur au prix actuel.",
      path: ["originalPrice"],
    },
  );

export type CreateDealInput = z.infer<typeof createDealSchema>;
