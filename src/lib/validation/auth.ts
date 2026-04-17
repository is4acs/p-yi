import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "L'e-mail est requis.")
    .email("E-mail invalide."),
  password: z
    .string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export const usernameSchema = z
  .string()
  .min(3, "Le pseudo doit faire au moins 3 caractères.")
  .max(20, "Le pseudo ne doit pas dépasser 20 caractères.")
  .regex(
    /^[a-z0-9_.]+$/,
    "Le pseudo ne peut contenir que des lettres minuscules, chiffres, points et underscores.",
  );

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "L'e-mail est requis.")
    .email("E-mail invalide."),
  username: usernameSchema,
  password: z
    .string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export const completeProfileSchema = z.object({
  username: usernameSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;
