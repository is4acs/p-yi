import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { fetchUnreadNotificationsCount } from "@/lib/notifications/queries";
import {
  isOptimizableImageUrl,
  isRenderableImageUrl,
} from "@/lib/images";
import { SubmitButton } from "@/components/ui/submit-button";
import { LanguageSwitcher } from "@/components/soleil/LanguageSwitcher";
import { NightModeToggle } from "@/components/soleil/NightModeToggle";
import { getMessages, tFormat } from "@/lib/i18n";

import { signOutAction } from "../connexion/actions";

export const metadata: Metadata = {
  title: "Profil",
  description: "Ton profil Péyi : karma, badges et historique.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

export default async function ProfilPage(props: Props) {
  const searchParams = await props.searchParams;
  const t = await getMessages();
  const user = await requireUser("/profil");
  const [
    city,
    dealCount,
    listingCount,
    dealFavoriteCount,
    listingFavoriteCount,
    unreadNotifications,
    activeAlertsCount,
  ] = await Promise.all([
    user.cityId
      ? prisma.city.findUnique({
          where: { id: user.cityId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.deal.count({
      where: { authorId: user.id, status: "PUBLISHED" },
    }),
    prisma.listing.count({
      where: { authorId: user.id, status: "PUBLISHED" },
    }),
    prisma.favorite.count({
      where: { userId: user.id, dealId: { not: null } },
    }),
    prisma.favorite.count({
      where: { userId: user.id, listingId: { not: null } },
    }),
    fetchUnreadNotificationsCount(user.id),
    prisma.alert.count({ where: { userId: user.id, isActive: true } }),
  ]);
  const favoriteCount = dealFavoriteCount + listingFavoriteCount;

  const displayName = user.fullName ?? user.username;
  const memberSince = user.createdAt.getFullYear();

  return (
    <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md px-5 lg:max-w-2xl">
        {/* En-tête centré : avatar, nom, meta. */}
        <section className="flex flex-col items-center pt-6 text-center">
          {isRenderableImageUrl(user.avatarUrl) ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={64}
              height={64}
              unoptimized={!isOptimizableImageUrl(user.avatarUrl)}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-16 w-16 items-center justify-center rounded-full bg-soleil-forest font-display text-xl font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
            >
              {initialsFrom(displayName)}
            </span>
          )}
          <h1 className="mt-2.5 font-display text-[22px] font-extrabold">
            {displayName}
          </h1>
          <p className="mt-[3px] text-[11.5px] text-soleil-muted2 dark:text-soleil-muted-d">
            {city?.name ? `${city.name} · ` : ""}
            {tFormat(t.profile.memberSince, { year: memberSince })}
          </p>
        </section>

        {searchParams.success && (
          <div
            role="status"
            className="mt-4 rounded-[14px] bg-soleil-valid p-3 text-sm font-semibold text-soleil-forest dark:bg-soleil-valid-d"
          >
            {searchParams.success}
          </div>
        )}
        {searchParams.error && (
          <div
            role="alert"
            className="mt-4 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {searchParams.error}
          </div>
        )}

        {/* Stats 3 colonnes : deals postés / annonces / mercis (karma). */}
        <section className="mt-4 grid grid-cols-3 overflow-hidden rounded-2xl border-[1.5px] border-soleil-border dark:border-soleil-border-d">
          <div className="py-3 text-center">
            <div className="font-display text-[19px] font-extrabold">
              {dealCount}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-soleil-muted2 dark:text-soleil-muted-d">
              {t.profile.statsDeals}
            </div>
          </div>
          <div className="border-x-[1.5px] border-soleil-border py-3 text-center dark:border-soleil-border-d">
            <div className="font-display text-[19px] font-extrabold">
              {listingCount}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-soleil-muted2 dark:text-soleil-muted-d">
              {t.profile.statsListings}
            </div>
          </div>
          <div className="py-3 text-center">
            <div className="font-display text-[19px] font-extrabold text-soleil-otext dark:text-soleil-otext-d">
              {user.karma.toLocaleString("fr-FR")}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-soleil-muted2 dark:text-soleil-muted-d">
              {t.profile.statsThanks}
            </div>
          </div>
        </section>

        {/* Menu */}
        <nav className="mt-2.5">
          <MenuRow
            href="/profil/favoris"
            label={t.profile.favorites}
            sub={
              favoriteCount === 0
                ? t.profile.noFavorites
                : tFormat(t.profile.favoritesCount, {
                    deals: dealFavoriteCount,
                    listings: listingFavoriteCount,
                  })
            }
          />
          <MenuRow
            href="/profil/alertes"
            label={t.profile.alerts}
            sub={
              activeAlertsCount === 0
                ? t.profile.noAlerts
                : tFormat(t.profile.alertsCount, { n: activeAlertsCount })
            }
          />
          <MenuRow
            href="/notifications"
            label={t.profile.notifications}
            sub={
              unreadNotifications === 0
                ? t.profile.allRead
                : tFormat(t.profile.unreadCount, { n: unreadNotifications })
            }
            badge={unreadNotifications}
          />

          {/* Mode nuit — toggle branché sur next-themes. */}
          <div className="flex items-center justify-between gap-3 border-b border-soleil-line py-3.5 dark:border-soleil-line-d">
            <div className="min-w-0">
              <div className="text-sm font-bold">{t.profile.nightMode}</div>
              <div className="mt-0.5 text-[10.5px] text-soleil-muted2 dark:text-soleil-muted-d">
                {t.profile.nightModeSub}
              </div>
            </div>
            <NightModeToggle />
          </div>

          {/* Langue de l'interface — FR / PT (Brésil) / Kreyòl. */}
          <div className="flex items-center justify-between gap-3 border-b border-soleil-line py-3.5 dark:border-soleil-line-d">
            <div className="min-w-0">
              <div className="text-sm font-bold">{t.profile.language}</div>
            </div>
            <LanguageSwitcher />
          </div>

          <MenuRow
            href="/profil/recompenses"
            label={t.profile.rewards}
            sub={`${user.karma.toLocaleString("fr-FR")} karma`}
          />
          <MenuRow
            href="/profil/affiliation"
            label={t.profile.referral}
            sub={t.profile.referralSub}
          />
          <MenuRow
            href="/profil/edit"
            label={t.profile.settings}
            sub={t.profile.settingsSub}
          />
          <MenuRow
            href="/profil/confidentialite"
            label={t.profile.privacy}
          />
          <MenuRow
            href="mailto:contact@peyi.gf"
            label={t.profile.help}
            last
          />
        </nav>

        <form action={signOutAction} className="mt-3 text-center">
          <SubmitButton
            variant="ghost"
            size="sm"
            pendingLabel={t.profile.loggingOut}
            className="text-xs font-bold text-soleil-muted2 hover:bg-transparent hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:text-soleil-cream"
          >
            {t.profile.logout}
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}

function MenuRow({
  href,
  label,
  sub,
  badge = 0,
  last = false,
}: {
  href: string;
  label: string;
  sub?: string;
  badge?: number;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "flex min-h-[52px] items-center justify-between gap-3 py-3.5 transition active:scale-[0.99] " +
        (last
          ? ""
          : "border-b border-soleil-line dark:border-soleil-line-d")
      }
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        {sub && (
          <span className="mt-0.5 block text-[10.5px] text-soleil-muted2 dark:text-soleil-muted-d">
            {sub}
          </span>
        )}
      </span>
      <span className="flex flex-none items-center gap-2">
        {badge > 0 && (
          <span
            aria-hidden
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-soleil-orange px-1.5 text-[10.5px] font-extrabold text-soleil-forest"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        <span
          aria-hidden
          className="text-soleil-muted2 dark:text-soleil-muted-d"
        >
          ›
        </span>
      </span>
    </Link>
  );
}
