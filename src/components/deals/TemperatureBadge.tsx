import { cn } from "@/lib/utils";

type Props = {
  temperature: number;
  size?: "sm" | "md";
  className?: string;
};

export function TemperatureBadge({ temperature, size = "md", className }: Props) {
  const isCold = temperature <= -5;
  const isHot = temperature >= 50;

  const label = temperature >= 0 ? `+${temperature}°` : `${temperature}°`;
  const icon = isCold ? "❄️" : "🔥";

  // Refonte « Soleil péyi » : la température se lit sur un cercle bordé
  // d'orange, pas sur un aplat rouge ou bleu — ces deux couleurs ne font
  // pas partie de la palette. Chaud = bordure orange pleine, tiède =
  // filet neutre, froid = bordure atténuée. Le chiffre reste dans
  // l'orange lisible.
  const palette = isCold
    ? "border-input text-muted-foreground"
    : isHot
    ? "border-peyi-orange-500 text-accent-text"
    : "border-input text-accent-text";

  const sizing =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] gap-0.5"
      : "px-2 py-0.5 text-xs gap-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-2 bg-transparent font-display font-extrabold tabular-nums",
        palette,
        sizing,
        className,
      )}
      aria-label={`Température ${label}`}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
