import { Lock } from "lucide-react";

import { type BadgeRow } from "@/lib/gamification/queries";
import { cn } from "@/lib/utils";

type Props = {
  badges: BadgeRow[];
};

/**
 * Grille de badges — débloqués en couleur, verrouillés en niveaux de gris
 * avec un cadenas. On garde TOUS les badges visibles (même verrouillés)
 * pour donner un objectif à l'utilisateur.
 */
export function BadgesGrid({ badges }: Props) {
  const earned = badges.filter((b) => b.earned);
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold">Badges</h2>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {earned.length}
          </span>
          /{badges.length} débloqués
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {badges.map((badge) => (
          <li key={badge.id}>
            <BadgeCard badge={badge} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BadgeCard({ badge }: { badge: BadgeRow }) {
  return (
    <div
      className={cn(
        "group relative flex aspect-square flex-col items-center justify-center rounded-lg border p-2 text-center transition",
        badge.earned
          ? "border-peyi-orange-300 bg-peyi-orange-50"
          : "border-dashed border-border bg-muted/40",
      )}
      title={badge.description}
    >
      <span
        aria-hidden
        className={cn(
          "text-2xl transition",
          badge.earned ? "" : "opacity-30 grayscale",
        )}
      >
        {badge.emoji ?? "🏅"}
      </span>
      <p
        className={cn(
          "mt-1 line-clamp-2 text-[10px] font-semibold leading-tight",
          badge.earned ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {badge.name}
      </p>
      {!badge.earned && (
        <span className="absolute right-1 top-1 text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
        </span>
      )}
    </div>
  );
}
