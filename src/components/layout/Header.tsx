import Link from "next/link";
import { Bell, LogIn } from "lucide-react";
import type { User } from "@prisma/client";

import { cn } from "@/lib/utils";

import { UserAvatar } from "./UserAvatar";

type Props = {
  user: User | null;
  /** Unread direct messages, used for the Messages nav badge. */
  unreadCount: number;
  /** Unread notifications, used for the bell badge. */
  unreadNotifications: number;
};

export function Header({ user, unreadCount, unreadNotifications }: Props) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-display text-xl font-bold tracking-tight"
        >
          <span className="text-peyi-orange-500">Péyi</span>
        </Link>

        <nav
          aria-label="Navigation principale"
          className="hidden gap-1 text-sm font-medium sm:flex"
        >
          <NavLink href="/bons-plans">Bons plans</NavLink>
          <NavLink href="/annonces">Annonces</NavLink>
          <NavLink href="/poster">Poster</NavLink>
          <NavLink href="/messages" badge={unreadCount}>
            Messages
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications — ${unreadNotifications} non lue${unreadNotifications > 1 ? "s" : ""}`
                  : "Notifications"
              }
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50 hover:text-foreground"
            >
              <Bell className="h-4 w-4" aria-hidden />
              {unreadNotifications > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-peyi-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-background"
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <Link
              href="/profil"
              className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 text-sm font-medium transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50"
            >
              <UserAvatar username={user.username} avatarUrl={user.avatarUrl} />
              <span className="hidden max-w-[120px] truncate pr-1 sm:inline">
                @{user.username}
              </span>
            </Link>
          ) : (
            <Link
              href="/connexion"
              className="inline-flex items-center gap-1.5 rounded-full bg-peyi-orange-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-peyi-orange-600"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative rounded-full px-3 py-1.5 text-muted-foreground transition active:scale-95 hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          aria-label={`${badge} non lu${badge > 1 ? "s" : ""}`}
          className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-peyi-orange-500 px-1 text-[10px] font-bold text-white"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
