import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterChip = {
  label: string;
  href: string;
  active?: boolean;
};

type Props = {
  chips: FilterChip[];
  className?: string;
};

/**
 * FilterChips — rangée horizontale scrollable de filtres. Chip active en
 * aplat forêt (inversion crème en nuit), inactives bordées 1,5px.
 */
export function FilterChips({ chips, className }: Props) {
  return (
    <div
      className={cn(
        "scrollbar-hide -mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0",
        className,
      )}
    >
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          aria-current={chip.active ? "true" : undefined}
          className={cn(
            "flex min-h-11 flex-none items-center whitespace-nowrap rounded-full px-3.5 py-2 text-xs transition-colors",
            chip.active
              ? "bg-soleil-forest font-bold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              : "border-[1.5px] border-soleil-border font-semibold text-soleil-forest hover:bg-soleil-sand dark:border-soleil-border-d dark:text-soleil-cream dark:hover:bg-soleil-forest",
          )}
        >
          {chip.label}
        </Link>
      ))}
    </div>
  );
}
