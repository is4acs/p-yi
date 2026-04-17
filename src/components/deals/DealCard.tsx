import Link from "next/link";
import { MessageSquare, Clock, Store } from "lucide-react";
import type { VoteType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { DealCardData } from "@/lib/deals/queries";
import { PriceTag } from "./PriceTag";
import { CategoryChip } from "./CategoryChip";
import { CommuneChip } from "./CommuneChip";
import { DealImagePlaceholder } from "./DealImagePlaceholder";
import { VoteButtons } from "./VoteButtons";

export type { DealCardData };

type Props = {
  deal: DealCardData;
  currentUserId?: string | null;
  myVote?: VoteType | null;
  className?: string;
};

export function DealCard({ deal, currentUserId, myVote = null, className }: Props) {
  const sellerName =
    deal.store?.name ?? deal.merchant?.name ?? "Vendeur non précisé";
  const placeholderEmoji = deal.category.icon ?? null;
  const placeholderLabel = deal.store?.name ?? deal.merchant?.name ?? deal.title;

  const isAuthor = currentUserId === deal.authorId;
  const isAuthenticated = Boolean(currentUserId);
  const canVote = isAuthenticated && !isAuthor;
  const disabledHint = !isAuthenticated
    ? "Connecte-toi pour voter."
    : isAuthor
    ? "Tu ne peux pas voter sur ton propre bon plan."
    : undefined;

  return (
    <article
      className={cn(
        "group flex items-stretch gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-peyi-orange-300 hover:shadow-md",
        className,
      )}
    >
      <Link
        href={`/bons-plans/${deal.slug}`}
        className="flex min-w-0 flex-1 gap-3 transition active:scale-[0.99]"
      >
        {/* Image */}
        <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28">
          <DealImagePlaceholder
            emoji={placeholderEmoji}
            label={placeholderLabel}
            className="h-full w-full"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Store className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{sellerName}</span>
            </div>
            <h3 className="line-clamp-2 font-display text-sm font-semibold leading-tight text-foreground group-hover:text-peyi-orange-700">
              {deal.title}
            </h3>
          </div>

          <PriceTag
            price={deal.price.toString()}
            originalPrice={deal.originalPrice?.toString() ?? null}
            discountPercent={deal.discountPercent ?? null}
            isFree={deal.isFree}
            size="sm"
          />

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

      <div className="flex shrink-0 items-center">
        <VoteButtons
          dealId={deal.id}
          temperature={deal.temperature}
          upvotes={deal.upvotes}
          downvotes={deal.downvotes}
          myVote={myVote}
          canVote={canVote}
          disabledHint={disabledHint}
          variant="compact"
        />
      </div>
    </article>
  );
}
