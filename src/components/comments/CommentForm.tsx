"use client";

import { useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCommentAction } from "@/app/bons-plans/comments/actions";

type Props = {
  dealId: string;
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const MAX_LEN = 2000;

export function CommentForm({
  dealId,
  parentId,
  placeholder = "Partage ton avis sur ce bon plan…",
  autoFocus = false,
  compact = false,
  onSuccess,
  onCancel,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createCommentAction(formData);
      if (!res.ok) {
        setError(res.error ?? "Erreur lors de l'envoi.");
        return;
      }
      setValue("");
      onSuccess?.();
    });
  }

  const disabled = pending || value.trim().length < 2;

  return (
    <form action={submit} className={cn("space-y-2", compact && "space-y-1.5")}>
      <input type="hidden" name="dealId" value={dealId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      <textarea
        ref={textareaRef}
        name="content"
        required
        autoFocus={autoFocus}
        rows={compact ? 2 : 2}
        maxLength={MAX_LEN}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex w-full resize-y rounded-[22px] border-[1.5px] border-soleil-border bg-transparent px-4 py-2.5 text-[12.5px] text-soleil-forest transition placeholder:text-soleil-muted focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus:border-soleil-cream"
      />

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] tabular-nums text-soleil-muted dark:text-soleil-muted-d">
          {value.length}/{MAX_LEN}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={pending}
            >
              Annuler
            </Button>
          )}
          <SubmitButton
            size="sm"
            disabled={disabled}
            pending={pending}
            pendingLabel={compact ? "Envoi…" : "Publication…"}
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            {compact ? "Répondre" : "Publier"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
