import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * CountLine — eyebrow compteur (ex. « 214 DEALS · GUYANE ») en lettres
 * capitales espacées, texte orange lisible.
 */
export function CountLine({ children, className }: Props) {
  return (
    <div
      className={cn(
        "text-[11px] font-extrabold uppercase tracking-[2px] text-soleil-otext dark:text-soleil-otext-d",
        className,
      )}
    >
      {children}
    </div>
  );
}
