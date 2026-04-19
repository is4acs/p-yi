"use client";

import { Send } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";

/**
 * Bouton d'envoi rond de la messagerie — icône `Send` au repos,
 * spinner pendant que le server action tourne.
 */
export function ReplySendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={pending ? "Envoi en cours" : "Envoyer"}
      aria-busy={pending || undefined}
      disabled={pending}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peyi-orange-500 text-white shadow transition active:scale-[0.95] hover:bg-peyi-orange-600 disabled:opacity-70"
    >
      {pending ? (
        <Spinner className="h-4 w-4" label="Envoi en cours" />
      ) : (
        <Send className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
