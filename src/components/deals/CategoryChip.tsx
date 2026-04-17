import { cn } from "@/lib/utils";

type Props = {
  name: string;
  icon?: string | null;
  className?: string;
};

export function CategoryChip({ name, icon, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {icon && <span aria-hidden>{icon}</span>}
      <span className="truncate">{name}</span>
    </span>
  );
}
