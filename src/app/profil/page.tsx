import Link from "next/link";
import type { Metadata } from "next";
import {
  BadgeCheck,
  Bell,
  BellRing,
  Bookmark,
  ChevronRight,
  Gift,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Phone,
  ShieldCheck,
  Trophy,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { fetchUnreadCount } from "@/lib/messages/queries";
import { fetchUnreadNotificationsCount } from "@/lib/notifications/queries";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { LevelProgress } from "@/components/gamification/LevelProgress";

import { signOutAction } from "../connexion/actions";

export const metadata: Metadata = {
  title: "Profil",
  description: "Ton profil Péyi : karma, badges et historique.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ProfilPage(props: Props) {
  const searchParams = await props.searchParams;
  const user = await requireUser("/profil");
  const [
    city,
    dealFavoriteCount,
    listingFavoriteCount,
    unreadCount,
    unreadNotifications,
    activeAlertsCount,
  ] = await Promise.all([
    user.cityId
      ? prisma.city.findUnique({
          where: { id: user.cityId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.favorite.count({
      where: { userId: user.id, dealId: { not: null } },
    }),
    prisma.favorite.count({
      where: { userId: user.id, listingId: { not: null } },
    }),
    fetchUnreadCount(user.id),
    fetchUnreadNotificationsCount(user.id),
    prisma.alert.count({ where: { userId: user.id, isActive: true } }),
  ]);
  const favoriteCount = dealFavoriteCount + listingFavoriteCount;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <section className="flex flex-col items-center text-center">
        <UserAvatar
          username={user.username}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
          @{user.username}
        </h1>
        {user.fullName && (
          <p className="text-sm text-muted-foreground">{user.fullName}</p>
        )}
      </section>

      <LevelProgress
        karma={user.karma}
        level={user.level}
        className="mt-5"
      />
      <Link
        href="/profil/recompenses"
        className="mt-2 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
      >
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-peyi-orange-600" aria-hidden />
          Voir mes récompenses et badges
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </Link>

      {searchParams.success && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-peyi-green-200 bg-peyi-green-50 p-3 text-sm text-peyi-green-800"
        >
          {searchParams.success}
        </div>
      )}
      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <section className="mt-6 space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
        <Row
          icon={<Mail className="h-4 w-4" />}
          label="E-mail"
          value={user.email}
        />
        <Row
          icon={<Phone className="h-4 w-4" />}
          label="Téléphone"
          value={
            user.phone ? (
              <span className="flex items-center gap-1.5">
                <span className="truncate">{user.phone}</span>
                {user.phoneVerified ? (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-peyi-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-peyi-green-700">
                    <BadgeCheck className="h-3 w-3" aria-hidden />
                    Vérifié
                  </span>
                ) : (
                  <Link
                    href={`/profil/verifier-telephone?phone=${encodeURIComponent(user.phone)}`}
                    className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200"
                  >
                    Vérifier
                  </Link>
                )}
              </span>
            ) : (
              "Non renseigné"
            )
          }
        />
        <Row
          icon={<MapPin className="h-4 w-4" />}
          label="Commune"
          value={city?.name ?? "Non renseignée"}
        />
      </section>

      <Button asChild variant="outline" size="sm" className="mt-3 w-full">
        <Link href="/profil/edit">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Modifier mon profil
        </Link>
      </Button>

      <nav className="mt-6 flex flex-col gap-2">
        <Link
          href="/messages"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
              <MessageSquare className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                Messagerie
              </span>
              <span className="text-xs text-muted-foreground">
                {unreadCount === 0
                  ? "Aucun message non lu"
                  : `${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}`}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span
                aria-hidden
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-peyi-orange-500 px-1.5 text-[11px] font-bold text-white"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <ChevronRight
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </span>
        </Link>

        <Link
          href="/notifications"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
              <Bell className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                Notifications
              </span>
              <span className="text-xs text-muted-foreground">
                {unreadNotifications === 0
                  ? "Tout est lu"
                  : `${unreadNotifications} non lue${unreadNotifications > 1 ? "s" : ""}`}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            {unreadNotifications > 0 && (
              <span
                aria-hidden
                className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-peyi-orange-500 px-1.5 text-[11px] font-bold text-white"
              >
                {unreadNotifications > 99 ? "99+" : unreadNotifications}
              </span>
            )}
            <ChevronRight
              className="h-4 w-4 text-muted-foreground"
              aria-hidden
            />
          </span>
        </Link>

        <Link
          href="/profil/favoris"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
              <Bookmark className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                Mes favoris
              </span>
              <span className="text-xs text-muted-foreground">
                {favoriteCount === 0
                  ? "Aucun favori"
                  : `${dealFavoriteCount} bon${dealFavoriteCount > 1 ? "s" : ""} plan${dealFavoriteCount > 1 ? "s" : ""} · ${listingFavoriteCount} annonce${listingFavoriteCount > 1 ? "s" : ""}`}
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>

        <Link
          href="/profil/alertes"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
              <BellRing className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                Mes alertes
              </span>
              <span className="text-xs text-muted-foreground">
                {activeAlertsCount === 0
                  ? "Aucune alerte active"
                  : `${activeAlertsCount} alerte${activeAlertsCount > 1 ? "s" : ""} active${activeAlertsCount > 1 ? "s" : ""}`}
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>

        <Link
          href="/profil/affiliation"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
              <Gift className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                Parrainage & affiliation
              </span>
              <span className="text-xs text-muted-foreground">
                Invite tes amis et gagne jusqu&apos;à 800 €
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>

        <Link
          href="/profil/confidentialite"
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-peyi-orange-100 text-peyi-orange-600">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">
                Confidentialité & données
              </span>
              <span className="text-xs text-muted-foreground">
                Télécharger mes données, supprimer mon compte
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </Link>
      </nav>

      <form action={signOutAction} className="mt-8">
        <SubmitButton
          variant="outline"
          size="lg"
          pendingLabel="Déconnexion…"
          className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Se déconnecter
        </SubmitButton>
      </form>
    </main>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {typeof value === "string" ? (
          <p className="truncate">{value}</p>
        ) : (
          <div className="truncate">{value}</div>
        )}
      </div>
    </div>
  );
}
