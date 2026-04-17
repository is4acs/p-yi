import Link from "next/link";
import type { Metadata } from "next";
import {
  Award,
  Bell,
  CheckCheck,
  CornerDownRight,
  Flame,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { NotificationType } from "@prisma/client";

import { requireUser } from "@/lib/auth/current-user";
import { formatRelativeTime } from "@/lib/format";
import {
  bucketNotifications,
  fetchNotifications,
  type NotificationRow,
} from "@/lib/notifications/queries";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { NotificationLink } from "@/components/notifications/NotificationLink";
import { cn } from "@/lib/utils";

import { markAllReadAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notifications",
  description:
    "Tes notifications Péyi : messages, commentaires, badges et plus encore.",
};

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const { rows } = await fetchNotifications(user.id);
  const buckets = bucketNotifications(rows);
  const unreadCount = rows.filter((r) => !r.isRead).length;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length === 0
              ? "Aucune notification pour l'instant."
              : `${rows.length} notification${rows.length > 1 ? "s" : ""}${
                  unreadCount > 0
                    ? ` · ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                    : ""
                }.`}
          </p>
        </div>

        {unreadCount > 0 && (
          <form action={markAllReadAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Tout marquer lu
            </button>
          </form>
        )}
      </header>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <Section label="Aujourd'hui" rows={buckets.today} />
          <Section label="Hier" rows={buckets.yesterday} />
          <Section label="Cette semaine" rows={buckets.thisWeek} />
          <Section label="Plus ancien" rows={buckets.older} />
        </div>
      )}
    </main>
  );
}

function Section({ label, rows }: { label: string; rows: NotificationRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <ul className="flex flex-col gap-2">
        {rows.map((n) => (
          <li key={n.id}>
            <NotificationRowView row={n} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotificationRowView({ row: n }: { row: NotificationRow }) {
  const href = n.actionUrl ?? "/notifications";

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition active:scale-[0.99]",
        n.isRead
          ? "border-border bg-card hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
          : "border-peyi-orange-200 bg-peyi-orange-50/60 hover:border-peyi-orange-300 hover:bg-peyi-orange-100/60",
      )}
    >
      {/* Left column : avatar (social) or colored icon bubble (system). */}
      {n.fromUser ? (
        <UserAvatar
          username={n.fromUser.username}
          avatarUrl={n.fromUser.avatarUrl}
          size="md"
        />
      ) : (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            iconBackground(n.type),
          )}
        >
          <TypeIcon type={n.type} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm",
              n.isRead ? "font-medium" : "font-semibold",
            )}
          >
            {n.title}
          </p>
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              n.isRead
                ? "text-muted-foreground"
                : "font-semibold text-peyi-orange-600",
            )}
          >
            {formatRelativeTime(n.createdAt)}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-xs",
            n.isRead ? "text-muted-foreground" : "text-foreground/90",
          )}
        >
          {n.message}
        </p>
      </div>

      {!n.isRead && (
        <span
          aria-label="Non lu"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-peyi-orange-500"
        />
      )}
    </div>
  );

  return (
    <NotificationLink id={n.id} href={href} isRead={n.isRead}>
      {content}
    </NotificationLink>
  );
}

/**
 * Small colored bubble behind the type icon. Keeps the list visually varied
 * so a wall of notifications doesn't read as a single block.
 */
function iconBackground(type: NotificationType): string {
  switch (type) {
    case NotificationType.NEW_MESSAGE:
    case NotificationType.NEW_COMMENT:
    case NotificationType.COMMENT_REPLY:
      return "bg-peyi-orange-100 text-peyi-orange-600";
    case NotificationType.DEAL_HOT:
      return "bg-red-100 text-red-600";
    case NotificationType.BADGE_EARNED:
    case NotificationType.LEVEL_UP:
    case NotificationType.KARMA_MILESTONE:
      return "bg-amber-100 text-amber-600";
    case NotificationType.ALERT_MATCH:
    case NotificationType.LISTING_FAVORITED:
      return "bg-peyi-green-100 text-peyi-green-700";
    case NotificationType.LISTING_EXPIRING:
      return "bg-amber-100 text-amber-600";
    case NotificationType.REPORT_RESOLVED:
      return "bg-blue-100 text-blue-600";
    case NotificationType.SYSTEM:
    case NotificationType.PROMOTIONAL:
    default:
      return "bg-muted text-muted-foreground";
  }
}

function TypeIcon({ type }: { type: NotificationType }) {
  const cls = "h-4 w-4";
  switch (type) {
    case NotificationType.NEW_MESSAGE:
      return <MessageSquare className={cls} aria-hidden />;
    case NotificationType.NEW_COMMENT:
      return <MessageCircle className={cls} aria-hidden />;
    case NotificationType.COMMENT_REPLY:
      return <CornerDownRight className={cls} aria-hidden />;
    case NotificationType.DEAL_HOT:
      return <Flame className={cls} aria-hidden />;
    case NotificationType.ALERT_MATCH:
      return <Target className={cls} aria-hidden />;
    case NotificationType.BADGE_EARNED:
      return <Award className={cls} aria-hidden />;
    case NotificationType.LEVEL_UP:
      return <TrendingUp className={cls} aria-hidden />;
    case NotificationType.KARMA_MILESTONE:
      return <Trophy className={cls} aria-hidden />;
    case NotificationType.LISTING_EXPIRING:
      return <Bell className={cls} aria-hidden />;
    case NotificationType.LISTING_FAVORITED:
      return <Sparkles className={cls} aria-hidden />;
    case NotificationType.REPORT_RESOLVED:
      return <ShieldCheck className={cls} aria-hidden />;
    case NotificationType.PROMOTIONAL:
      return <Megaphone className={cls} aria-hidden />;
    case NotificationType.SYSTEM:
    default:
      return <Settings className={cls} aria-hidden />;
  }
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
        <Bell className="h-6 w-6" aria-hidden />
      </div>
      <p className="mt-3 text-sm font-medium">
        Aucune notification pour l&apos;instant.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Tes messages, commentaires et badges apparaîtront ici.
      </p>
      <Link
        href="/bons-plans"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-peyi-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
      >
        Explorer Péyi
      </Link>
    </div>
  );
}

