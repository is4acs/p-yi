import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * PriceTag — étiquette de prix posée sur une photo (coin bas-gauche).
 * Identique en dark : elle repose toujours sur l'image.
 */
export function PriceTag({ children, className }: Props) {
  return (
    <span
      className={cn(
        "absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded-[7px] bg-soleil-cream px-2 py-1 text-xs font-extrabold leading-snug text-soleil-forest [overflow-wrap:anywhere]",
        className,
      )}
    >
      {children}
    </span>
  );
}
