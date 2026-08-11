import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { Sun } from "./Sun";

type Props = {
  selected?: "deal" | "annonce" | null;
  className?: string;
};

const CARDS = [
  {
    key: "deal" as const,
    href: "/poster/bon-plan",
    title: "Un bon plan",
    sub: "Une promo repérée en magasin ou en ligne",
  },
  {
    key: "annonce" as const,
    href: "/poster/annonce",
    title: "Une annonce",
    sub: "Quelque chose à vendre près de chez toi",
  },
];

/**
 * PosterFork — le choix bon plan / annonce du flux Poster. La carte
 * sélectionnée passe en aplat forêt (inversion crème en nuit) avec
 * pastille check orange ; l'autre reste bordée avec soleil gris.
 */
export function PosterFork({ selected = null, className }: Props) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5", className)}>
      {CARDS.map((card) => {
        const isSelected = card.key === selected;
        return (
          <Link
            key={card.key}
            href={card.href}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "relative rounded-2xl border-[1.5px] p-3.5 transition active:scale-[0.99]",
              isSelected
                ? "border-soleil-forest bg-soleil-forest text-soleil-cream dark:border-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
                : "border-soleil-border text-soleil-forest dark:border-soleil-border-d dark:text-soleil-cream",
            )}
          >
            {isSelected && (
              <span
                aria-hidden
                className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-soleil-orange text-soleil-forest"
              >
                <Icon name="check" size={11} />
              </span>
            )}
            <Sun
              w={18}
              className={
                isSelected
                  ? undefined
                  : "bg-soleil-border dark:bg-soleil-border-d"
              }
            />
            <div className="mt-2 font-display text-[15px] font-extrabold">
              {card.title}
            </div>
            <div
              className={cn(
                "mt-[3px] text-[11px] leading-[1.45]",
                isSelected
                  ? "text-soleil-muted-d dark:text-soleil-muted"
                  : "text-soleil-muted dark:text-soleil-muted-d",
              )}
            >
              {card.sub}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
