import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import { formatPriceType } from "@/lib/listings/queries";
import {
  fetchThread,
  markThreadAsRead,
  type ThreadMessage,
  type ThreadOther,
  type ThreadListing,
} from "@/lib/messages/queries";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { ReplySendButton } from "@/components/messages/ReplySendButton";

import { sendMessageAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ listing?: string; error?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Conversation avec @${params.username}`,
    description: "Messagerie privée sur Péyi.",
    robots: { index: false, follow: false },
  };
}

export default async function ThreadPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const user = await requireUser(
    `/messages/${params.username}${searchParams.listing ? `?listing=${searchParams.listing}` : ""}`,
  );

  const thread = await fetchThread({
    userId: user.id,
    otherUsername: params.username,
    listingSlug: searchParams.listing ?? null,
  });
  if (!thread) notFound();

  // Mark the messages received from the other user as read. Done server-side
  // on render so the badge drops as soon as the page loads.
  await markThreadAsRead({
    userId: user.id,
    otherUserId: thread.other.id,
    listingId: thread.listing?.id ?? null,
  });

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-md flex-col px-4 pb-4 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Messagerie
      </Link>

      <ThreadHeader other={thread.other} />

      {thread.listing && <ListingContextCard listing={thread.listing} />}

      {searchParams.error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <section
        aria-label={`Conversation avec @${thread.other.username}`}
        className="mt-5 flex flex-1 flex-col gap-2"
      >
        {thread.messages.length === 0 ? (
          <div className="my-8 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            Pas encore de message. Dis bonjour !
          </div>
        ) : (
          thread.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isFromMe={m.senderId === user.id}
            />
          ))
        )}
      </section>

      <ReplyForm
        recipientUsername={thread.other.username}
        listingSlug={thread.listing?.slug ?? null}
      />
    </main>
  );
}

function ThreadHeader({ other }: { other: ThreadOther }) {
  const level = LEVEL_META[other.level];
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <UserAvatar
        username={other.username}
        avatarUrl={other.avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">@{other.username}</p>
        <p className="truncate text-xs text-muted-foreground">
          <span aria-hidden>{level.emoji}</span> {level.label} ·{" "}
          {other.karma.toLocaleString("fr-FR")} karma
          {other.city?.name ? ` · ${other.city.name}` : ""}
        </p>
      </div>
    </div>
  );
}

function ListingContextCard({ listing }: { listing: ThreadListing }) {
  const price = formatPriceType(listing.priceType, listing.price);
  return (
    <Link
      href={`/annonces/${listing.slug}`}
      className="mt-2 flex items-center gap-3 rounded-lg border border-peyi-orange-200 bg-peyi-orange-50/40 p-2.5 text-sm transition hover:border-peyi-orange-400"
    >
      {listing.coverImageUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
          <Image
            src={listing.coverImageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-peyi-orange-100 text-lg"
          aria-hidden
        >
          {listing.category.icon ?? "📦"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-peyi-orange-700">
          À propos de
        </p>
        <p className="truncate font-semibold text-foreground">
          {listing.title}
        </p>
        <p className="text-xs text-muted-foreground">{price}</p>
      </div>
    </Link>
  );
}

function MessageBubble({
  message,
  isFromMe,
}: {
  message: ThreadMessage;
  isFromMe: boolean;
}) {
  return (
    <div
      className={
        "flex w-full " + (isFromMe ? "justify-end" : "justify-start")
      }
    >
      <div
        className={
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm " +
          (isFromMe
            ? "rounded-br-sm bg-peyi-orange-500 text-white"
            : "rounded-bl-sm bg-muted text-foreground")
        }
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={
            "mt-1 text-[10px] " +
            (isFromMe ? "text-white/75" : "text-muted-foreground")
          }
        >
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ReplyForm({
  recipientUsername,
  listingSlug,
}: {
  recipientUsername: string;
  listingSlug: string | null;
}) {
  return (
    <form
      action={sendMessageAction}
      className="sticky bottom-0 mt-4 flex items-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <input type="hidden" name="recipientUsername" value={recipientUsername} />
      {listingSlug && (
        <input type="hidden" name="listingSlug" value={listingSlug} />
      )}
      <label htmlFor="reply-content" className="sr-only">
        Ton message
      </label>
      <textarea
        id="reply-content"
        name="content"
        required
        maxLength={2000}
        rows={1}
        placeholder={`Répondre à @${recipientUsername}…`}
        className="min-h-[40px] max-h-32 w-full resize-y rounded-full border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:border-peyi-orange-400 focus:outline-none focus:ring-2 focus:ring-peyi-orange-200"
      />
      <ReplySendButton />
    </form>
  );
}
