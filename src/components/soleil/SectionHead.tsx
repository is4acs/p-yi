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
    <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-2", className)}>
      <h2 className="min-w-0 font-display text-xl font-extrabold leading-tight tracking-[-0.3px] text-soleil-forest [overflow-wrap:anywhere] dark:text-soleil-cream sm:text-2xl">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          aria-label={`${linkLabel} : ${title}`}
          className="inline-flex min-h-11 shrink-0 items-center text-xs font-bold text-soleil-otext underline-offset-4 hover:underline dark:text-soleil-otext-d"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
