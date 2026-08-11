"use client";

import { useState, useTransition } from "react";
import type { VoteType } from "@prisma/client";
import { voteDealAction, type VoteInput } from "@/app/bons-plans/actions";
import { cn } from "@/lib/utils";

type Props = {
  dealId: string;
  temperature: number;
  myVote: VoteType | null;
  canVote: boolean;
  disabledHint?: string;
  className?: string;
};

function tempQualifier(temperature: number): string {
  if (temperature >= 100) return "deal brûlant";
  if (temperature >= 50) return "deal chaud";
  if (temperature >= 0) return "deal tiède";
  return "deal froid";
}

/**
 * VotePill — pilule de vote de la fiche bon plan : ▼ à gauche (COLD),
 * température + qualificatif au centre, ▲ orange à droite (HOT). Vote
 * optimiste (±10° visuel) réconcilié avec la réponse serveur.
 */
export function VotePill({
  dealId,
  temperature,
  myVote,
  canVote,
  disabledHint,
  className,
}: Props) {
  const [temp, setTemp] = useState(temperature);
  const [vote, setVote] = useState<VoteType | null>(myVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cast(input: VoteInput) {
    if (!canVote || pending) return;
    setError(null);
    const delta = input === "HOT" ? 10 : -10;
    setTemp((t) => t + delta);
    startTransition(async () => {
      const result = await voteDealAction(dealId, input);
      if (result.ok && typeof result.temperature === "number") {
        setTemp(result.temperature);
        setVote(result.myVote ?? null);
      } else {
        setTemp((t) => t - delta);
        if (result.error) setError(result.error);
      }
    });
  }

  const label = temp >= 0 ? `+${temp}°` : `${temp}°`;

  return (
    <div className={className}>
      <div className="flex items-center justify-between rounded-full border-[1.5px] border-soleil-border p-[5px] dark:border-soleil-border-d">
        <button
          type="button"
          onClick={() => cast("COLD")}
          disabled={!canVote || pending}
          title={!canVote ? disabledHint : undefined}
          aria-label="Voter froid"
          aria-pressed={vote === "COLD"}
          className={cn(
            "flex h-[38px] w-[38px] items-center justify-center rounded-full bg-soleil-sand text-[15px] text-soleil-muted2 transition active:scale-95 dark:bg-soleil-forest dark:text-soleil-muted-d",
            vote === "COLD" && "ring-2 ring-soleil-border dark:ring-soleil-border-d",
            !canVote && "opacity-60",
          )}
        >
          ▼
        </button>
        <span
          aria-live="polite"
          className="font-display font-extrabold text-soleil-otext dark:text-soleil-otext-d"
        >
          {label} · {tempQualifier(temp)}
        </span>
        <button
          type="button"
          onClick={() => cast("HOT")}
          disabled={!canVote || pending}
          title={!canVote ? disabledHint : undefined}
          aria-label="Voter chaud"
          aria-pressed={vote === "HOT"}
          className={cn(
            "flex h-[38px] w-[38px] items-center justify-center rounded-full bg-soleil-orange text-[15px] text-soleil-forest transition active:scale-95",
            vote === "HOT" && "ring-2 ring-soleil-otext dark:ring-soleil-otext-d",
            !canVote && "opacity-60",
          )}
        >
          ▲
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-center text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
          {error}
        </p>
      )}
    </div>
  );
}
