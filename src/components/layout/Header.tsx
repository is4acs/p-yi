import Link from "next/link";
import { Bell, LogIn } from "lucide-react";
import type { User } from "@prisma/client";

import { getMessages, tFormat } from "@/lib/i18n";
import { Sun } from "@/components/soleil/Sun";
import { LanguageSwitcher } from "@/components/soleil/LanguageSwitcher";

import { GlobalSearchBar } from "./GlobalSearchBar";
import { HeaderNav } from "./HeaderNav";
import { UserAvatar } from "./UserAvatar";

type Props = {
  user: User | null;
  /** Unread direct messages, used for the Messages nav badge. */
  unreadCount: number;
  /** Unread notifications, used for the bell badge. */
  unreadNotifications: number;
};

/**
 * Header global « Soleil péyi » — desktop (toutes pages) et mobile sur les
 * routes non refondues (SEO, guide, sous-pages profil…). Wordmark
 * demi-soleil + péyi, recherche, nav pilules (HeaderNav, actif inversé
 * forêt/crème), cloche notifications et pilule profil / connexion.
 */
export async function Header({ user, unreadCount, unreadNotifications }: Props) {
  const t = await getMessages();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-soleil-line bg-soleil-cream/95 text-soleil-forest backdrop-blur supports-[backdrop-filter]:bg-soleil-cream/85 dark:border-soleil-line-d dark:bg-soleil-night/95 dark:text-soleil-cream dark:supports-[backdrop-filter]:bg-soleil-night/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 lg:px-8">
        <Link
          href="/"
          aria-label={t.nav.home}
          className="flex shrink-0 items-end gap-1.5"
        >
          <Sun w={20} />
          <span className="font-display text-[22px] font-extrabold leading-[0.9] tracking-[-0.5px]">
            péyi
          </span>
        </Link>

        {/* Barre de recherche globale — sur mobile elle prend la place
            de la nav (cachée en lg-). Sur desktop elle est flanquée par
            la nav à sa droite. */}
        <GlobalSearchBar />

        <HeaderNav unreadCount={unreadCount} />

        {/* Drapeaux FR/BR/HT — desktop : accessibles sur toutes les pages,
            connecté ou non. Sur mobile ils vivent sur l'accueil. */}
        <LanguageSwitcher className="hidden lg:flex" />

        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `${t.nav.notifications} — ${tFormat(t.nav.unread, { n: unreadNotifications })}`
                  : t.nav.notifications
              }
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-soleil-border bg-soleil-input transition hover:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-forest dark:hover:border-soleil-cream"
            >
              <Bell className="h-4 w-4" aria-hidden />
              {unreadNotifications > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-soleil-orange px-1 text-[10px] font-extrabold text-soleil-forest ring-2 ring-soleil-cream dark:ring-soleil-night"
                >
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <Link
              href="/profil"
              className="flex min-h-[40px] items-center gap-2 rounded-full border-[1.5px] border-soleil-border bg-soleil-input py-1 pl-1.5 pr-2.5 text-sm font-bold transition hover:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-forest dark:hover:border-soleil-cream"
            >
              <UserAvatar username={user.username} avatarUrl={user.avatarUrl} />
              <span className="hidden max-w-[120px] truncate sm:inline">
                @{user.username}
              </span>
            </Link>
          ) : (
            <Link
              href="/connexion"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream transition active:scale-95 dark:bg-soleil-cream dark:text-soleil-forest"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {t.common.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
