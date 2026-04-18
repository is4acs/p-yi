import { UserLevel } from "@prisma/client";

import { LEVEL_META, levelProgress } from "@/lib/gamification/levels";
import { cn } from "@/lib/utils";

type Props = {
  karma: number;
  level: UserLevel;
  className?: string;
};

/**
 * Carte de progression de niveau. Affiche le niveau courant + emoji, une
 * barre de progression vers le niveau suivant, et le karma restant. Si
 * l'utilisateur est déjà au plafond (Ambassadeur), on affiche un état
 * spécial "niveau max atteint".
 */
export function LevelProgress({ karma, level, className }: Props) {
  const progress = levelProgress(karma);
  const meta = LEVEL_META[level];
  const nextMeta = progress.next ? LEVEL_META[progress.next] : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Niveau actuel
          </p>
          <p className="mt-1 font-display text-xl font-bold">
            <span aria-hidden className="mr-1.5">
              {meta.emoji}
            </span>
            {meta.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{meta.tagline}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Karma
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-peyi-orange-600">
            {karma.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      {nextMeta ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">
              Prochain niveau :{" "}
              <span className="font-semibold text-foreground">
                {nextMeta.emoji} {nextMeta.label}
              </span>
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {progress.karmaToNext.toLocaleString("fr-FR")} karma restants
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progression : ${progress.percent}% vers ${nextMeta.label}`}
            className="h-2.5 w-full overflow-hidden rounded-full bg-peyi-orange-100"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-peyi-orange-400 to-peyi-orange-600 transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-peyi-orange-50 p-2 text-center text-xs font-semibold text-peyi-orange-700">
          🏆 Niveau maximum atteint — tu es une légende de Péyi !
        </p>
      )}
    </div>
  );
}
