import Link from "next/link";
import { LogIn } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";

import { UserAvatar } from "./UserAvatar";

export async function Header() {
  const user = await getCurrentUser();

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
          <NavLink href="/poster">Poster</NavLink>
          <NavLink href="/messages">Messages</NavLink>
        </nav>

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
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
