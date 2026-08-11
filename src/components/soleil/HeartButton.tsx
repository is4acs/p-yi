"use client";

import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/bons-plans/favorites/actions";
import { toggleListingFavoriteAction } from "@/app/annonces/favorites/actions";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useMessages } from "./I18nProvider";

type Props = {
  kind: "deal" | "listing";
  targetId: string;
  initialFavorited: boolean;
  canFavorite: boolean;
  disabledHint?: string;
  className?: string;
};

/**
 * HeartButton — cœur rond 36px bordé pour le slot actions du
 * BackHeader. Toggle optimiste branché sur l'action favoris existante
 * (deal ou listing selon `kind`).
 */
export function HeartButton({
  kind,
  targetId,
  initialFavorited,
  canFavorite,
  disabledHint,
  className,
}: Props) {
  const t = useMessages();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!canFavorite || pending) return;
    const next = !favorited;
    setFavorited(next);
    startTransition(async () => {
      const action =
        kind === "deal" ? toggleFavoriteAction : toggleListingFavoriteAction;
      const result = await action(targetId);
      if (!result.ok) {
        setFavorited(!next);
      } else {
        setFavorited(Boolean(result.favorited));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canFavorite || pending}
      aria-pressed={favorited}
      aria-label={favorited ? t.dealDetail.favRemove : t.dealDetail.favAdd}
      title={!canFavorite ? disabledHint : undefined}
      className={cn(
        "flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] border-soleil-border text-soleil-forest transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-soleil-border-d dark:text-soleil-cream",
        className,
      )}
    >
      <Icon
        name="heart"
        size={15}
        className={cn(favorited && "fill-soleil-orange text-soleil-orange")}
      />
    </button>
  );
}
