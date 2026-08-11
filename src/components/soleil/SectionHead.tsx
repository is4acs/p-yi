import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
};

/**
 * SectionHead — tête de section éditoriale : titre display extrabold à
 * gauche, lien « Tout voir » en texte orange à droite.
 */
export function SectionHead({ title, href, linkLabel, className }: Props) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <h2 className="font-display text-xl font-extrabold tracking-[-0.3px] text-soleil-forest dark:text-soleil-cream">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="text-xs font-bold text-soleil-otext dark:text-soleil-otext-d"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
