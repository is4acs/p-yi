"use client";

import { useRef, useState, useTransition } from "react";
import { Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
        rows={compact ? 2 : 3}
        maxLength={MAX_LEN}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-peyi-orange-300"
      />

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] tabular-nums text-muted-foreground">
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
          <Button type="submit" size="sm" disabled={disabled}>
            <Send className="h-3.5 w-3.5" aria-hidden />
            {compact ? "Répondre" : "Publier"}
          </Button>
        </div>
      </div>
    </form>
  );
}
