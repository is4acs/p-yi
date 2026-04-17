"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Bookmark } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleListingFavoriteAction } from "@/app/annonces/favorites/actions";

type Props = {
  listingId: string;
  initialFavorited: boolean;
  canFavorite: boolean;
  disabledHint?: string;
  size?: "sm" | "md";
  className?: string;
};

export function ListingFavoriteButton({
  listingId,
  initialFavorited,
  canFavorite,
  disabledHint,
  size = "sm",
  className,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [optimistic, addOptimistic] = useOptimistic<boolean, boolean>(
    favorited,
    (_, next) => next,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    if (!canFavorite || pending) return;
    setError(null);
    const next = !optimistic;
    startTransition(async () => {
      addOptimistic(next);
      const res = await toggleListingFavoriteAction(listingId);
      if (!res.ok) {
        setError(res.error ?? "Erreur.");
        return;
      }
      setFavorited(Boolean(res.favorited));
    });
  }

  const sizing =
    size === "sm"
      ? "h-8 w-8 rounded-full"
      : "h-10 rounded-full px-3 text-sm font-semibold";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={!canFavorite || pending}
        aria-pressed={optimistic}
        aria-label={
          optimistic ? "Retirer des favoris" : "Ajouter aux favoris"
        }
        title={disabledHint}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 border transition",
          "disabled:cursor-not-allowed disabled:opacity-60",
          optimistic
            ? "border-peyi-orange-400 bg-peyi-orange-500 text-white hover:bg-peyi-orange-600"
            : "border-border bg-card text-muted-foreground hover:border-peyi-orange-300 hover:text-peyi-orange-600",
          sizing,
          className,
        )}
      >
        <Bookmark
          className={cn("h-4 w-4", optimistic && "fill-white")}
          aria-hidden
        />
        {size === "md" && (
          <span>{optimistic ? "Sauvegardé" : "Sauvegarder"}</span>
        )}
      </button>

      {error && (
        <span role="alert" className="ml-2 text-[10px] text-destructive">
          {error}
        </span>
      )}
    </>
  );
}
