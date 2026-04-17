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

  const palette = isCold
    ? "bg-cold/10 text-cold border-cold/30"
    : isHot
    ? "bg-hot/10 text-hot border-hot/30"
    : "bg-muted text-muted-foreground border-border";

  const sizing =
    size === "sm"
      ? "px-1.5 py-0.5 text-[10px] gap-0.5"
      : "px-2 py-0.5 text-xs gap-1";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold tabular-nums",
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
