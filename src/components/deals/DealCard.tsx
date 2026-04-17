import Link from "next/link";
import { MessageSquare, Clock, Store } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { DealCardData } from "@/lib/deals/queries";
import { PriceTag } from "./PriceTag";
import { TemperatureBadge } from "./TemperatureBadge";
import { CategoryChip } from "./CategoryChip";
import { CommuneChip } from "./CommuneChip";
import { DealImagePlaceholder } from "./DealImagePlaceholder";

export type { DealCardData };

type Props = {
  deal: DealCardData;
  className?: string;
};

export function DealCard({ deal, className }: Props) {
  const sellerName =
    deal.store?.name ?? deal.merchant?.name ?? "Vendeur non précisé";

  const placeholderEmoji = deal.category.icon ?? null;
  const placeholderLabel = deal.store?.name ?? deal.merchant?.name ?? deal.title;

  return (
    <Link
      href={`/bons-plans/${deal.slug}`}
      className={cn(
        "group flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-peyi-orange-300 hover:shadow-md active:scale-[0.99]",
        className,
      )}
    >
      {/* Image */}
      <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
        <DealImagePlaceholder
          emoji={placeholderEmoji}
          label={placeholderLabel}
          className="h-full w-full"
        />
        <div className="absolute left-1 top-1">
          <TemperatureBadge temperature={deal.temperature} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        {/* Header */}
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Store className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{sellerName}</span>
          </div>
          <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground group-hover:text-peyi-orange-700">
            {deal.title}
          </h3>
        </div>

        {/* Price */}
        <PriceTag
          price={deal.price.toString()}
          originalPrice={deal.originalPrice?.toString() ?? null}
          discountPercent={deal.discountPercent ?? null}
          isFree={deal.isFree}
          size="sm"
        />

        {/* Meta footer */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <CategoryChip name={deal.category.name} icon={deal.category.icon} />
          {deal.city && <CommuneChip name={deal.city.name} />}
          <span className="inline-flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" aria-hidden />
            {deal.commentCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-3 w-3" aria-hidden />
            {formatRelativeTime(deal.publishedAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
