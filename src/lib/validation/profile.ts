import { z } from "zod";

import { usernameSchema } from "./auth";

/**
 * Regex for strict E.164 format : `+` followed by 8 to 15 digits.
 * We accept a wide range because Péyi users may type their phone in many ways,
 * but `normalizePhone()` is expected to have run before this validator.
 */
const e164Regex = /^\+\d{8,15}$/;

export const updateProfileSchema = z.object({
  username: usernameSchema,
  fullName: z
    .string()
    .trim()
    .max(80, "Le nom est trop long (80 caractères max).")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "L'e-mail est requis.")
    .email("E-mail invalide."),
  /**
   * `phone` is the already-normalized E.164 string, or an empty string to
   * clear the phone. If null/undefined on the form, we treat it as "no
   * change" — the action layer decides.
   */
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => ""))
    .refine(
      (v) => !v || e164Regex.test(v),
      "Numéro de téléphone invalide (format attendu : +594694123456).",
    ),
});

export const verifyOtpSchema = z.object({
  phone: z.string().regex(e164Regex, "Numéro de téléphone invalide."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Le code doit contenir 6 chiffres."),
});

export const resendOtpSchema = z.object({
  phone: z.string().regex(e164Regex, "Numéro de téléphone invalide."),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
