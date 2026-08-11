import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { fetchUnreadNotificationsCount } from "@/lib/notifications/queries";
import { isRenderableImageUrl } from "@/lib/images";
import { SubmitButton } from "@/components/ui/submit-button";
import { NightModeToggle } from "@/components/soleil/NightModeToggle";

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
    <main className="bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md px-5 lg:max-w-2xl">
        {/* En-tête centré : avatar, nom, meta. */}
        <section className="flex flex-col items-center pt-6 text-center">
          {isRenderableImageUrl(user.avatarUrl) ? (
            <Image
              src={user.avatarUrl}
              alt=""
              width={64}
              height={64}
              unoptimized
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
          <p className="mt-[3px] text-[11.5px] text-soleil-muted dark:text-soleil-muted-d">
            {city?.name ? `${city.name} · ` : ""}membre depuis {memberSince}
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
            <div className="mt-0.5 text-[10px] font-bold uppercase text-soleil-muted dark:text-soleil-muted-d">
              Deals postés
            </div>
          </div>
          <div className="border-x-[1.5px] border-soleil-border py-3 text-center dark:border-soleil-border-d">
            <div className="font-display text-[19px] font-extrabold">
              {listingCount}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-soleil-muted dark:text-soleil-muted-d">
              Annonces
            </div>
          </div>
          <div className="py-3 text-center">
            <div className="font-display text-[19px] font-extrabold text-soleil-otext dark:text-soleil-otext-d">
              {user.karma.toLocaleString("fr-FR")}
            </div>
            <div className="mt-0.5 text-[10px] font-bold uppercase text-soleil-muted dark:text-soleil-muted-d">
              Mercis reçus
            </div>
          </div>
        </section>

        {/* Menu */}
        <nav className="mt-2.5">
          <MenuRow
            href="/profil/favoris"
            label="Favoris"
            sub={
              favoriteCount === 0
                ? "Aucun favori"
                : `${dealFavoriteCount} bon${dealFavoriteCount > 1 ? "s" : ""} plan${dealFavoriteCount > 1 ? "s" : ""} · ${listingFavoriteCount} annonce${listingFavoriteCount > 1 ? "s" : ""}`
            }
          />
          <MenuRow
            href="/profil/alertes"
            label="Alertes deals"
            sub={
              activeAlertsCount === 0
                ? "Aucune alerte active"
                : `${activeAlertsCount} alerte${activeAlertsCount > 1 ? "s" : ""} active${activeAlertsCount > 1 ? "s" : ""}`
            }
          />
          <MenuRow
            href="/notifications"
            label="Notifications"
            sub={
              unreadNotifications === 0
                ? "Tout est lu"
                : `${unreadNotifications} non lue${unreadNotifications > 1 ? "s" : ""}`
            }
            badge={unreadNotifications}
          />

          {/* Mode nuit — toggle branché sur next-themes. */}
          <div className="flex items-center justify-between gap-3 border-b border-soleil-line py-3.5 dark:border-soleil-line-d">
            <div className="min-w-0">
              <div className="text-sm font-bold">Mode nuit</div>
              <div className="mt-0.5 text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
                Auto au coucher du soleil — 18 h 45 à Cayenne
              </div>
            </div>
            <NightModeToggle />
          </div>

          <MenuRow
            href="/profil/recompenses"
            label="Récompenses & badges"
            sub={`${user.karma.toLocaleString("fr-FR")} karma`}
          />
          <MenuRow
            href="/profil/affiliation"
            label="Parrainage & affiliation"
            sub="Invite tes amis et gagne jusqu'à 800 €"
          />
          <MenuRow
            href="/profil/edit"
            label="Paramètres"
            sub="Profil, e-mail, téléphone, commune"
          />
          <MenuRow
            href="/profil/confidentialite"
            label="Confidentialité & données"
          />
          <MenuRow
            href="mailto:contact@peyi.gf"
            label="Aide & contact"
            last
          />
        </nav>

        <form action={signOutAction} className="mt-3 text-center">
          <SubmitButton
            variant="ghost"
            size="sm"
            pendingLabel="Déconnexion…"
            className="text-xs font-bold text-soleil-muted hover:bg-transparent hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:text-soleil-cream"
          >
            Se déconnecter
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
          <span className="mt-0.5 block text-[10.5px] text-soleil-muted dark:text-soleil-muted-d">
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
          className="text-soleil-muted dark:text-soleil-muted-d"
        >
          ›
        </span>
      </span>
    </Link>
  );
}
