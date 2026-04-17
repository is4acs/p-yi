import { z } from "zod";

export const createCommentSchema = z.object({
  dealId: z.string().uuid("Bon plan invalide."),
  parentId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  content: z
    .string()
    .trim()
    .min(2, "Ton commentaire est trop court.")
    .max(2000, "Ton commentaire est trop long (2000 caractères max)."),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
