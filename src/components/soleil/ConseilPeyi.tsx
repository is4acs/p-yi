import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * ConseilPeyi — encart conseil sur fond sable (forêt en nuit). Le
 * contenu vient après le préfixe « Conseil Péyi — ».
 */
export function ConseilPeyi({ children, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-[14px] bg-soleil-sand p-3 text-[11.5px] leading-relaxed text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d",
        className,
      )}
    >
      <b>Conseil Péyi</b> — {children}
    </div>
  );
}
