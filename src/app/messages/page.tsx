import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Inbox, MessageSquare } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { formatRelativeTime } from "@/lib/format";
import { fetchInbox, type InboxConversation } from "@/lib/messages/queries";
import { UserAvatar } from "@/components/layout/UserAvatar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages",
  description:
    "Tes conversations privées avec les vendeurs et les membres Péyi.",
};

export default async function MessagesInboxPage() {
  const user = await requireUser("/messages");
  const conversations = await fetchInbox(user.id);

  const unreadTotal = conversations.reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Messagerie
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {conversations.length === 0
              ? "Aucune conversation pour l'instant."
              : `${conversations.length} conversation${conversations.length > 1 ? "s" : ""}${
                  unreadTotal > 0
                    ? ` · ${unreadTotal} non lu${unreadTotal > 1 ? "s" : ""}`
                    : ""
                }.`}
          </p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {conversations.map((c) => (
            <li key={c.key}>
              <ConversationRow conversation={c} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ConversationRow({
  conversation: c,
}: {
  conversation: InboxConversation;
}) {
  const href = c.listing
    ? `/messages/${c.otherParty.username}?listing=${c.listing.slug}`
    : `/messages/${c.otherParty.username}`;

  const previewPrefix = c.lastMessage.isFromMe ? "Toi : " : "";
  const isUnread = c.unreadCount > 0;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition active:scale-[0.99] hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
    >
      <UserAvatar
        username={c.otherParty.username}
        avatarUrl={c.otherParty.avatarUrl}
        size="md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={
              "truncate font-semibold " +
              (isUnread ? "text-foreground" : "text-foreground")
            }
          >
            @{c.otherParty.username}
          </p>
          <span
            className={
              "shrink-0 text-[11px] tabular-nums " +
              (isUnread
                ? "font-semibold text-peyi-orange-600"
                : "text-muted-foreground")
            }
          >
            {formatRelativeTime(c.lastMessage.createdAt)}
          </span>
        </div>

        {c.listing && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {c.listing.category.icon && (
              <span aria-hidden>{c.listing.category.icon}</span>
            )}
            <span className="truncate">{c.listing.title}</span>
          </div>
        )}

        <p
          className={
            "mt-0.5 line-clamp-1 text-sm " +
            (isUnread && !c.lastMessage.isFromMe
              ? "font-medium text-foreground"
              : "text-muted-foreground")
          }
        >
          {previewPrefix}
          {c.lastMessage.content}
        </p>
      </div>

      {c.listing?.coverImageUrl ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
          <Image
            src={c.listing.coverImageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      {isUnread && (
        <span
          aria-label={`${c.unreadCount} message${c.unreadCount > 1 ? "s" : ""} non lu${c.unreadCount > 1 ? "s" : ""}`}
          className="ml-1 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-peyi-orange-500 px-1.5 text-[11px] font-bold text-white"
        >
          {c.unreadCount > 99 ? "99+" : c.unreadCount}
        </span>
      )}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
        <Inbox className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-medium">
        Aucun message pour l&apos;instant.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Ouvre une annonce et contacte le vendeur pour démarrer une conversation.
      </p>
      <Link
        href="/annonces"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
      >
        <MessageSquare className="h-4 w-4" aria-hidden />
        Parcourir les annonces
      </Link>
    </div>
  );
}
