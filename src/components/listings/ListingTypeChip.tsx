import type { ListingType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatListingType } from "@/lib/listings/queries";
import type { Locale } from "@/lib/i18n/config";

type Props = {
  type: ListingType;
  /** Langue de l'interface — fr par défaut (pages legacy sans locale). */
  locale?: Locale;
  className?: string;
};

const TONE: Record<ListingType, string> = {
  OFFER: "bg-peyi-green-100 text-peyi-green-800",
  DEMAND: "bg-peyi-orange-100 text-peyi-orange-800",
  EXCHANGE: "bg-blue-100 text-blue-800",
  DONATION: "bg-violet-100 text-violet-800",
};

export function ListingTypeChip({ type, locale = "fr", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        TONE[type],
        className,
      )}
    >
      {formatListingType(type, locale)}
    </span>
  );
}
