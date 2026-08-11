"use client";

import { useState, useTransition } from "react";
import type { VoteType } from "@prisma/client";
import { voteDealAction, type VoteInput } from "@/app/bons-plans/actions";
import { cn } from "@/lib/utils";
import type { Messages } from "@/lib/i18n/dictionaries/fr";
import { useMessages } from "./I18nProvider";

type Props = {
  dealId: string;
  temperature: number;
  myVote: VoteType | null;
  canVote: boolean;
  disabledHint?: string;
  className?: string;
};

function tempQualifier(temperature: number, t: Messages): string {
  if (temperature >= 100) return t.dealDetail.tempBlazing;
  if (temperature >= 50) return t.dealDetail.tempHot;
  if (temperature >= 0) return t.dealDetail.tempWarm;
  return t.dealDetail.tempCold;
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
  const t = useMessages();
  const [temp, setTemp] = useState(temperature);
  const [vote, setVote] = useState<VoteType | null>(myVote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Miroir de la sémantique serveur (HOT = +10°, COLD = −5°, re-clic =
  // retrait du vote, clic opposé = bascule) pour que l'optimiste ne
  // saute pas quand la réponse arrive.
  function optimisticDelta(input: VoteInput, current: VoteType | null): number {
    const HOT = 10;
    const COLD = -5;
    if (input === "HOT") {
      if (current === "HOT") return -HOT;
      if (current === "COLD") return HOT - COLD;
      return HOT;
    }
    if (current === "COLD") return -COLD;
    if (current === "HOT") return COLD - HOT;
    return COLD;
  }

  function nextVote(input: VoteInput, current: VoteType | null): VoteType | null {
    if (input === "HOT") return current === "HOT" ? null : "HOT";
    return current === "COLD" ? null : "COLD";
  }

  function cast(input: VoteInput) {
    if (!canVote || pending) return;
    setError(null);
    const previousVote = vote;
    const delta = optimisticDelta(input, previousVote);
    setTemp((t) => t + delta);
    setVote(nextVote(input, previousVote));
    startTransition(async () => {
      const result = await voteDealAction(dealId, input);
      if (result.ok && typeof result.temperature === "number") {
        setTemp(result.temperature);
        setVote(result.myVote ?? null);
      } else {
        setTemp((t) => t - delta);
        setVote(previousVote);
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
          aria-label={t.dealDetail.voteCold}
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
          {label} · {tempQualifier(temp, t)}
        </span>
        <button
          type="button"
          onClick={() => cast("HOT")}
          disabled={!canVote || pending}
          title={!canVote ? disabledHint : undefined}
          aria-label={t.dealDetail.voteHot}
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
