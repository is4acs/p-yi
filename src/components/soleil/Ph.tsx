import { cn } from "@/lib/utils";

type Props = {
  /** Libellé technique affiché au centre (ex. « visuel campagne »). */
  label?: string;
  className?: string;
};

/**
 * Ph — placeholder visuel hachuré (fond sable en jour, forêt en nuit).
 * Les couleurs vivent dans la classe `.soleil-ph` de globals.css.
 */
export function Ph({ label, className }: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        "soleil-ph flex items-center justify-center font-mono text-[10px]",
        className,
      )}
    >
      {label}
    </div>
  );
}
