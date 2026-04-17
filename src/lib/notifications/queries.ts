import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Select used everywhere we render a notification row. Keeps the shape small
 * so bulk fetches stay cheap. Note that `fromUserId` is stored as a bare
 * string column without a Prisma relation, so we resolve the sender in a
 * second query and splice it in as `fromUser`.
 */
export const notificationBaseSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  imageUrl: true,
  actionUrl: true,
  dealId: true,
  listingId: true,
  commentId: true,
  fromUserId: true,
  isRead: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

type NotificationBaseRow = Prisma.NotificationGetPayload<{
  select: typeof notificationBaseSelect;
}>;

export type NotificationRow = NotificationBaseRow & {
  fromUser: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
};

/**
 * Fetch the most recent notifications for a user. Caller can pass a cursor
 * (createdAt) to paginate; we return a fixed page size and a `nextCursor`
 * if more rows remain. 50 rows per page keeps the inbox snappy and matches
 * common notification-center UX.
 */
const PAGE_SIZE = 50;

export async function fetchNotifications(
  userId: string,
  cursor?: Date | null,
): Promise<{ rows: NotificationRow[]; nextCursor: Date | null }> {
  const base = await prisma.notification.findMany({
    where: {
      userId,
      ...(cursor ? { createdAt: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    select: notificationBaseSelect,
  });

  const hasMore = base.length > PAGE_SIZE;
  const slice = hasMore ? base.slice(0, PAGE_SIZE) : base;
  const nextCursor = hasMore ? slice[slice.length - 1].createdAt : null;

  // Batch-resolve senders — `Notification.fromUserId` has no FK/relation in
  // the schema, so we do the join in memory. One query regardless of page
  // size; duplicates are deduped by the Set.
  const fromUserIds = Array.from(
    new Set(
      slice
        .map((r) => r.fromUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const fromUsers =
    fromUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: fromUserIds } },
          select: { id: true, username: true, avatarUrl: true },
        })
      : [];
  const fromUserById = new Map(fromUsers.map((u) => [u.id, u]));

  const rows: NotificationRow[] = slice.map((r) => ({
    ...r,
    fromUser: r.fromUserId ? fromUserById.get(r.fromUserId) ?? null : null,
  }));

  return { rows, nextCursor };
}

/**
 * How many unread notifications does the user have ? Used for the bell badge
 * in the header. Indexed by `(userId, isRead, createdAt)` in Prisma schema,
 * so this is O(log n) — safe to call on every request.
 */
export async function fetchUnreadNotificationsCount(
  userId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

/**
 * Mark a single notification as read. Scoped by userId to prevent one user
 * from flipping another's notifications — the `where` combines both.
 */
export async function markNotificationAsRead({
  notificationId,
  userId,
}: {
  notificationId: string;
  userId: string;
}): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { id: notificationId, userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return res.count;
}

/**
 * Mark every unread notification for the user as read in one go. Called from
 * the "Tout marquer comme lu" button. Returns the number of rows affected so
 * the UI can give a quick "X notifications marquées comme lues" toast later.
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return res.count;
}

/**
 * Group notifications by human-friendly time bucket, preserving the
 * "most recent first" order within each group. We compute buckets in JS
 * so the DB query stays a simple ordered select.
 *
 *  - today : since midnight local
 *  - yesterday : the day before
 *  - thisWeek : the last 7 days (excluding today / yesterday)
 *  - older : everything else
 */
export type NotificationBucket = "today" | "yesterday" | "thisWeek" | "older";

export function bucketNotifications(
  rows: NotificationRow[],
  now: Date = new Date(),
): Record<NotificationBucket, NotificationRow[]> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const buckets: Record<NotificationBucket, NotificationRow[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  for (const r of rows) {
    const t = r.createdAt.getTime();
    if (t >= startOfToday.getTime()) buckets.today.push(r);
    else if (t >= startOfYesterday.getTime()) buckets.yesterday.push(r);
    else if (t >= sevenDaysAgo.getTime()) buckets.thisWeek.push(r);
    else buckets.older.push(r);
  }

  return buckets;
}
