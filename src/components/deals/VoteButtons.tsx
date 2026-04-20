"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Flame, Snowflake } from "lucide-react";
import type { VoteType } from "@prisma/client";

import { cn } from "@/lib/utils";
import {
  voteDealAction,
  type VoteInput,
  type VoteResult,
} from "@/app/bons-plans/actions";

type VoteState = {
  temperature: number;
  upvotes: number;
  downvotes: number;
  myVote: VoteType | null;
};

type Props = {
  dealId: string;
  temperature: number;
  upvotes: number;
  downvotes: number;
  myVote: VoteType | null;
  canVote: boolean;
  disabledHint?: string;
  // `compact`  — pilule horizontale 🔥 / °/ ❄ (listes compactes home)
  // `wide`     — row grand format (page détail)
  // `rail`     — colonne Dealabs : ▲ / ±N° / ▼ (refonte S30 `/bons-plans`)
  variant?: "compact" | "wide" | "rail";
  className?: string;
};

// HOT vote: +10°  |  COLD vote: -5°  (mirrors voteDealAction)
function applyOptimistic(state: VoteState, input: VoteInput): VoteState {
  let { temperature, upvotes, downvotes } = state;

  if (state.myVote === input) {
    if (input === "HOT") {
      upvotes -= 1;
      temperature -= 10;
    } else {
      downvotes -= 1;
      temperature += 5;
    }
    return { temperature, upvotes, downvotes, myVote: null };
  }

  if (state.myVote === null) {
    if (input === "HOT") {
      upvotes += 1;
      temperature += 10;
    } else {
      downvotes += 1;
      temperature -= 5;
    }
    return { temperature, upvotes, downvotes, myVote: input };
  }

  if (input === "HOT") {
    upvotes += 1;
    downvotes -= 1;
    temperature += 15;
  } else {
    upvotes -= 1;
    downvotes += 1;
    temperature -= 15;
  }
  return { temperature, upvotes, downvotes, myVote: input };
}

export function VoteButtons({
  dealId,
  temperature,
  upvotes,
  downvotes,
  myVote,
  canVote,
  disabledHint,
  variant = "compact",
  className,
}: Props) {
  const [state, setState] = useState<VoteState>({
    temperature,
    upvotes,
    downvotes,
    myVote,
  });
  const [optimistic, addOptimistic] = useOptimistic(
    state,
    (current, input: VoteInput) => applyOptimistic(current, input),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick(input: VoteInput) {
    if (!canVote || pending) return;
    setError(null);
    startTransition(async () => {
      addOptimistic(input);
      const res: VoteResult = await voteDealAction(dealId, input);
      if (!res.ok) {
        setError(res.error ?? "Une erreur est survenue.");
        return;
      }
      setState({
        temperature: res.temperature ?? 0,
        upvotes: res.upvotes ?? 0,
        downvotes: res.downvotes ?? 0,
        myVote: res.myVote ?? null,
      });
    });
  }

  const isCold = optimistic.temperature <= -5;
  const isHot = optimistic.temperature >= 50;
  const tempLabel =
    optimistic.temperature >= 0
      ? `+${optimistic.temperature}°`
      : `${optimistic.temperature}°`;
  const tempPalette = isCold
    ? "text-cold"
    : isHot
    ? "text-hot"
    : "text-muted-foreground";

  const isCompact = variant === "compact";
  const isRail = variant === "rail";

  // Rail variant — colonne Dealabs (▲ / ±N° / ▼), 56px de large. La
  // valeur par défaut (neutre) est peyi-orange-600 : dans la mockup ce
  // n'est pas "muted" mais déjà coloré marque, ce qui signale que voter
  // chaud est l'interaction encouragée. Les seuils hot/cold restent
  // identiques à compact/wide pour que la "couleur" du deal soit
  // cohérente partout (une carte à +428° est rouge dans la liste ET
  // sur la page détail).
  if (isRail) {
    const railPalette = isCold
      ? "text-cold"
      : isHot
      ? "text-hot"
      : "text-peyi-orange-600";
    const hotActive = optimistic.myVote === "HOT";
    const coldActive = optimistic.myVote === "COLD";

    return (
      <div
        className={cn("inline-flex flex-col items-stretch gap-1", className)}
      >
        <div
          className="flex w-14 flex-col items-center gap-0.5 rounded-md border border-border bg-muted/50 p-1"
          role="group"
          aria-label="Voter pour ce bon plan"
        >
          <button
            type="button"
            onClick={() => onClick("HOT")}
            disabled={!canVote || pending}
            aria-pressed={hotActive}
            aria-label={`Chaud (${optimistic.upvotes})`}
            title={disabledHint}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition",
              "disabled:cursor-not-allowed disabled:opacity-50",
              hotActive
                ? "bg-peyi-orange-100 text-peyi-orange-700"
                : "text-muted-foreground enabled:hover:bg-peyi-orange-50 enabled:hover:text-peyi-orange-700",
            )}
          >
            <ChevronUp className="h-5 w-5" aria-hidden />
          </button>
          <span
            className={cn(
              "font-display text-[15px] font-black leading-none tracking-tight",
              railPalette,
            )}
            aria-live="polite"
          >
            {tempLabel}
          </span>
          <button
            type="button"
            onClick={() => onClick("COLD")}
            disabled={!canVote || pending}
            aria-pressed={coldActive}
            aria-label={`Froid (${optimistic.downvotes})`}
            title={disabledHint}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition",
              "disabled:cursor-not-allowed disabled:opacity-50",
              coldActive
                ? "bg-cold/15 text-cold"
                : "text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground",
            )}
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {error && (
          <p role="alert" className="text-[10px] text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  const group = isCompact
    ? "flex-col w-11 divide-y"
    : "flex-row h-10 divide-x";

  const hotActive = optimistic.myVote === "HOT";
  const coldActive = optimistic.myVote === "COLD";

  return (
    <div className={cn("inline-flex flex-col items-stretch gap-1", className)}>
      <div
        className={cn(
          "inline-flex overflow-hidden rounded-full border border-border bg-card divide-border",
          group,
        )}
        role="group"
        aria-label="Voter pour ce bon plan"
      >
        <button
          type="button"
          onClick={() => onClick("HOT")}
          disabled={!canVote || pending}
          aria-pressed={hotActive}
          aria-label={`Chaud (${optimistic.upvotes})`}
          title={disabledHint}
          className={cn(
            "inline-flex items-center justify-center gap-1 font-semibold tabular-nums transition",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isCompact ? "min-h-10 py-2 text-xs" : "px-3 text-sm",
            hotActive
              ? "bg-hot/15 text-hot"
              : "text-muted-foreground enabled:hover:bg-hot/10 enabled:hover:text-hot",
          )}
        >
          <Flame className="h-4 w-4" aria-hidden />
          <span>{optimistic.upvotes}</span>
        </button>

        <span
          className={cn(
            "inline-flex items-center justify-center bg-background font-bold tabular-nums",
            tempPalette,
            isCompact ? "py-1 text-[11px]" : "px-3 text-sm",
          )}
          aria-live="polite"
        >
          {tempLabel}
        </span>

        <button
          type="button"
          onClick={() => onClick("COLD")}
          disabled={!canVote || pending}
          aria-pressed={coldActive}
          aria-label={`Froid (${optimistic.downvotes})`}
          title={disabledHint}
          className={cn(
            "inline-flex items-center justify-center gap-1 font-semibold tabular-nums transition",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isCompact ? "min-h-10 py-2 text-xs" : "px-3 text-sm",
            coldActive
              ? "bg-cold/15 text-cold"
              : "text-muted-foreground enabled:hover:bg-cold/10 enabled:hover:text-cold",
          )}
        >
          <Snowflake className="h-4 w-4" aria-hidden />
          <span>{optimistic.downvotes}</span>
        </button>
      </div>

      {error && (
        <p role="alert" className="text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
