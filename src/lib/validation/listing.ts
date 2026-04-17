import { z } from "zod";

const LISTING_TYPES = ["OFFER", "DEMAND", "EXCHANGE", "DONATION"] as const;
const PRICE_TYPES = [
  "FIXED",
  "NEGOTIABLE",
  "PER_MONTH",
  "PER_DAY",
  "FREE",
  "ON_REQUEST",
] as const;
const ITEM_CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "VERY_GOOD",
  "GOOD",
  "ACCEPTABLE",
  "FOR_PARTS",
] as const;

const numericString = (label: string) =>
  z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, `${label} invalide.`)
    .transform((v) => v.replace(",", "."));

export const createListingSchema = z
  .object({
    title: z
      .string()
      .min(8, "Le titre doit faire au moins 8 caractères.")
      .max(120, "Le titre est trop long (120 caractères max)."),
    description: z
      .string()
      .min(20, "Décris ton annonce en 20 caractères minimum.")
      .max(5000, "Description trop longue (5000 caractères max).")
      .transform((v) => v.trim()),
    type: z.enum(LISTING_TYPES),
    priceType: z.enum(PRICE_TYPES),
    price: numericString("Prix")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    condition: z
      .enum(ITEM_CONDITIONS)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    categorySlug: z.string().min(1, "Choisis une catégorie."),
    citySlug: z.string().min(1, "Choisis une commune."),
    neighborhood: z
      .string()
      .max(80)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    contactPhone: z
      .string()
      .max(30)
      .optional()
      .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
    showPhone: z.enum(["on", "off"]).optional(),
    allowMessages: z.enum(["on", "off"]).optional(),
  })
  .refine(
    (v) => {
      const needsPrice =
        v.priceType === "FIXED" ||
        v.priceType === "NEGOTIABLE" ||
        v.priceType === "PER_MONTH" ||
        v.priceType === "PER_DAY";
      return !needsPrice || Boolean(v.price);
    },
    { message: "Indique un prix.", path: ["price"] },
  );

export type CreateListingInput = z.infer<typeof createListingSchema>;
