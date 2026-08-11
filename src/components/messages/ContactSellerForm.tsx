"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendMessageAction } from "@/app/messages/actions";
import { useMessages } from "@/components/soleil/I18nProvider";

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
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-soleil-forest py-3 text-center text-[13.5px] font-extrabold text-soleil-cream transition active:scale-[0.98] dark:bg-soleil-cream dark:text-soleil-forest"
      >
        {t.listingDetail.message}
      </button>
    );
  }

  const trimmed = content.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= 2000;

  return (
    <form
      action={sendMessageAction}
      className="flex flex-col gap-2 rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-sand p-3 dark:border-soleil-border-d dark:bg-soleil-forest"
    >
      <input type="hidden" name="recipientUsername" value={recipientUsername} />
      <input type="hidden" name="listingSlug" value={listingSlug} />

      <label
        htmlFor="message-content"
        className="text-xs font-medium text-soleil-muted2 dark:text-soleil-muted-d"
      >
        {t.listingDetail.messageTo}{" "}
        <span className="font-bold text-soleil-forest dark:text-soleil-cream">
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
        placeholder={t.listingDetail.messagePlaceholder}
        className="w-full resize-y rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-input px-3.5 py-3 text-[13px] font-semibold text-soleil-forest placeholder:text-soleil-muted focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-night dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus:border-soleil-cream"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs tabular-nums text-soleil-muted dark:text-soleil-muted-d">
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
            {t.listingDetail.cancel}
          </Button>
          <SubmitButton size="sm" disabled={!canSubmit} pendingLabel={t.listingDetail.sending}>
            <Send className="h-3.5 w-3.5" aria-hidden />
            {t.listingDetail.send}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
