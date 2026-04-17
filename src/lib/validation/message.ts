import { z } from "zod";

/**
 * Payload for a new private message. The sender is always the current user —
 * so only the recipient, optional listing context, and content are submitted.
 */
export const createMessageSchema = z.object({
  recipientUsername: z
    .string()
    .trim()
    .min(3, "Destinataire invalide.")
    .max(32, "Destinataire invalide."),
  listingSlug: z
    .string()
    .trim()
    .max(140)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  content: z
    .string()
    .trim()
    .min(1, "Ton message est vide.")
    .max(2000, "Ton message est trop long (2000 caractères max)."),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
