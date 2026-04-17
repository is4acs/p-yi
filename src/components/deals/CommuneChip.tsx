import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

type Props = {
  name: string;
  className?: string;
};

export function CommuneChip({ name, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <MapPin className="h-3 w-3" aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  );
}
