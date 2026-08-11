import { cn } from "@/lib/utils";

type Props = {
  temperature: number;
  /** Diamètre du cercle en px. */
  size?: number;
  className?: string;
};

/**
 * TempBadge — température en cercle bordé orange (2px), texte
 * `soleil-otext`. La bordure orange ne change pas entre jour et nuit.
 */
export function TempBadge({ temperature, size = 42, className }: Props) {
  const label = temperature >= 0 ? `+${temperature}°` : `${temperature}°`;
  return (
    <span
      className={cn(
        "flex flex-none items-center justify-center rounded-full border-2 border-soleil-orange font-display text-[11px] font-extrabold text-soleil-otext dark:text-soleil-otext-d",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={`Température ${label}`}
    >
      {label}
    </span>
  );
}
