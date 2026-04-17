"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendMessageAction } from "@/app/messages/actions";

type Props = {
  recipientUsername: string;
  listingSlug: string;
};

/**
 * Progressive-disclosure contact form shown on listing detail pages.
 * Closed state : single button. Open state : textarea + send.
 *
 * On submit, the server action redirects to /messages/<recipient>?listing=...
 * so the user lands on the thread they just started.
 */
export function ContactSellerForm({ recipientUsername, listingSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-border bg-card text-sm font-semibold text-foreground transition active:scale-[0.98] hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        Envoyer un message au vendeur
      </button>
    );
  }

  const trimmed = content.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 2000;

  return (
    <form
      action={sendMessageAction}
      className="flex flex-col gap-2 rounded-md border border-peyi-orange-200 bg-peyi-orange-50/40 p-3"
    >
      <input type="hidden" name="recipientUsername" value={recipientUsername} />
      <input type="hidden" name="listingSlug" value={listingSlug} />

      <label
        htmlFor="message-content"
        className="text-xs font-medium text-muted-foreground"
      >
        Ton message à{" "}
        <span className="font-semibold text-foreground">
          @{recipientUsername}
        </span>
      </label>
      <textarea
        id="message-content"
        name="content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        maxLength={2000}
        rows={4}
        autoFocus
        placeholder="Bonjour, est-ce toujours disponible ?"
        className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-peyi-orange-400 focus:outline-none focus:ring-2 focus:ring-peyi-orange-200"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {content.length}/2000
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setOpen(false);
              setContent("");
            }}
          >
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            <Send className="h-3.5 w-3.5" aria-hidden />
            Envoyer
          </Button>
        </div>
      </div>
    </form>
  );
}
