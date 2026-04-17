import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Select used to build the inbox view : last message, other party infos,
 * optional listing context.
 */
export const messageInboxSelect = {
  id: true,
  senderId: true,
  recipientId: true,
  listingId: true,
  content: true,
  isRead: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
    },
  },
  recipient: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
    },
  },
  listing: {
    select: {
      id: true,
      slug: true,
      title: true,
      coverImageUrl: true,
      category: { select: { icon: true } },
    },
  },
} satisfies Prisma.MessageSelect;

export type InboxMessageRow = Prisma.MessageGetPayload<{
  select: typeof messageInboxSelect;
}>;

export type InboxConversation = {
  /** Deterministic key of the conversation, usable as React key. */
  key: string;
  otherParty: InboxMessageRow["sender"];
  listing: InboxMessageRow["listing"];
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
    isFromMe: boolean;
    isRead: boolean;
  };
  unreadCount: number;
};

/**
 * Build the inbox for a user : a list of conversations grouped by
 * (otherParty, listing). Most recent conversations first.
 *
 * A conversation is scoped to a (user pair + listing) tuple — so discussing
 * two different listings with the same seller produces two threads, which
 * matches user expectation on a marketplace.
 */
export async function fetchInbox(userId: string): Promise<InboxConversation[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { recipientId: userId }],
    },
    orderBy: { createdAt: "desc" },
    select: messageInboxSelect,
  });

  const byKey = new Map<string, InboxConversation>();

  for (const m of messages) {
    const isFromMe = m.senderId === userId;
    const other = isFromMe ? m.recipient : m.sender;
    const key = `${other.id}:${m.listingId ?? ""}`;

    let conv = byKey.get(key);
    if (!conv) {
      // First time we see this conversation → the most recent message wins
      // (messages are ordered desc above).
      conv = {
        key,
        otherParty: other,
        listing: m.listing,
        lastMessage: {
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          isFromMe,
          isRead: m.isRead,
        },
        unreadCount: 0,
      };
      byKey.set(key, conv);
    }

    // Count messages RECEIVED by the user and not yet read.
    if (!isFromMe && !m.isRead) {
      conv.unreadCount += 1;
    }
  }

  return Array.from(byKey.values());
}

/**
 * Select for a single message inside a thread. Keeps the payload minimal —
 * the header (other party + listing) is fetched separately once per page load.
 */
export const messageThreadSelect = {
  id: true,
  senderId: true,
  content: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.MessageSelect;

export type ThreadMessage = Prisma.MessageGetPayload<{
  select: typeof messageThreadSelect;
}>;

export type ThreadOther = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  karma: number;
  level: import("@prisma/client").UserLevel;
  city: { name: string } | null;
};

export type ThreadListing = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  price: Prisma.Decimal | null;
  priceType: import("@prisma/client").PriceType;
  authorId: string;
  category: { icon: string | null; name: string };
};

export type ThreadPayload = {
  other: ThreadOther;
  listing: ThreadListing | null;
  messages: ThreadMessage[];
};

/**
 * Fetch a conversation between the current user and another user, optionally
 * scoped to a single listing.
 *
 * Returns null if :
 *  - the other user does not exist
 *  - the other user is the current user (self-messaging not allowed)
 *  - a listingSlug was provided but the listing does not exist
 */
export async function fetchThread({
  userId,
  otherUsername,
  listingSlug,
}: {
  userId: string;
  otherUsername: string;
  listingSlug?: string | null;
}): Promise<ThreadPayload | null> {
  const other = await prisma.user.findUnique({
    where: { username: otherUsername },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      karma: true,
      level: true,
      city: { select: { name: true } },
    },
  });
  if (!other || other.id === userId) return null;

  let listing: ThreadListing | null = null;
  if (listingSlug) {
    listing = await prisma.listing.findFirst({
      where: { slug: listingSlug },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImageUrl: true,
        price: true,
        priceType: true,
        authorId: true,
        category: { select: { icon: true, name: true } },
      },
    });
    if (!listing) return null;
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: other.id },
        { senderId: other.id, recipientId: userId },
      ],
      ...(listing ? { listingId: listing.id } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: messageThreadSelect,
  });

  return { other, listing, messages };
}

/**
 * Total number of messages received by the user that are not yet read.
 * Used for the nav badge (header + bottom bar).
 */
export async function fetchUnreadCount(userId: string): Promise<number> {
  return prisma.message.count({
    where: { recipientId: userId, isRead: false },
  });
}

/**
 * Mark every unread message from `otherUserId` to `userId` as read, optionally
 * scoped to a given listing. Called when the user opens the thread page so the
 * badge drops.
 */
export async function markThreadAsRead({
  userId,
  otherUserId,
  listingId,
}: {
  userId: string;
  otherUserId: string;
  listingId?: string | null;
}): Promise<number> {
  const res = await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      recipientId: userId,
      isRead: false,
      ...(listingId ? { listingId } : {}),
    },
    data: { isRead: true, readAt: new Date() },
  });
  return res.count;
}
