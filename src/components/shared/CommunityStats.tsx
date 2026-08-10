import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * KPIs communautaires des héros (home, /bons-plans, /annonces) — SEULE
 * source de la règle d'affichage :
 *
 * un compteur ne s'affiche que s'il atteint le seuil
 * `NEXT_PUBLIC_STATS_MIN_THRESHOLD` (défaut : 3). En dessous, il est
 * masqué ; si AUCUN compteur ne passe le seuil, on affiche une accroche
 * d'action à la place. Afficher « 0 annonces cette semaine » au lancement
 * est contre-productif — mais on n'invente jamais de faux chiffres : on
 * masque, c'est tout.
 *
 * Le markup reprend à l'identique le pattern KPI des héros (chiffre
 * display orange + label mono), masqué sur mobile comme avant (le
 * viewport vertical y est précieux).
 */

export type CommunityKpi = { value: number; label: string };

const DEFAULT_THRESHOLD = 3;

function minThreshold(): number {
  const raw = Number(process.env.NEXT_PUBLIC_STATS_MIN_THRESHOLD);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_THRESHOLD;
}

function formatKpi(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return k >= 10
      ? `${Math.floor(k)}k`
      : `${k.toFixed(1).replace(".", ",")}k`;
  }
  return String(value);
}

export function CommunityStats({
  kpis,
  emptyHint,
  className,
}: {
  kpis: CommunityKpi[];
  /** Accroche affichée quand aucun compteur ne passe le seuil. */
  emptyHint: string;
  className?: string;
}) {
  const threshold = minThreshold();
  const visible = kpis.filter((kpi) => kpi.value >= threshold);

  if (visible.length === 0) {
    return (
      <p
        className={cn(
          "mt-6 hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-peyi-orange-700 sm:flex sm:text-xs",
          className,
        )}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {emptyHint}
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "mt-6 hidden flex-wrap items-baseline gap-x-5 gap-y-2 sm:flex",
        className,
      )}
    >
      {visible.map(({ value, label }) => (
        <li
          key={label}
          className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 sm:text-xs"
        >
          <b className="font-display text-[15px] font-extrabold tracking-normal text-peyi-orange-700">
            {formatKpi(value)}
          </b>
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
