import { cn } from "@/lib/utils";

type Props = {
  emoji?: string | null;
  label?: string | null;
  className?: string;
};

export function DealImagePlaceholder({ emoji, label, className }: Props) {
  const initial = label?.trim()?.[0]?.toUpperCase() ?? "?";
  const display = emoji ?? initial;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-neutral-200 to-neutral-300",
        className,
      )}
      role="img"
      aria-label={label ? `Illustration ${label}` : "Illustration du bon plan"}
    >
      <span className="select-none text-3xl font-bold text-neutral-400 drop-shadow-sm sm:text-4xl">
        {display}
      </span>
    </div>
  );
}
