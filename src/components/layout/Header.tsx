import Link from "next/link";
import { Bell, LogIn, MapPin, MessageSquare, Plus } from "lucide-react";
import type { User } from "@prisma/client";

import { Wordmark } from "@/components/brand/Wordmark";
import { SoleilSearchField } from "@/components/home/soleil/SoleilSearchField";
import { VerticalTabs } from "@/components/layout/VerticalTabs";

import { UserAvatar } from "./UserAvatar";

type Props = {
  user: User | null;
  /** Unread direct messages, used for the Messages nav badge. */
  unreadCount: number;
  /** Unread notifications, used for the bell badge. */
  unreadNotifications: number;
};

/**
 * En-tête « Soleil péyi ».
 *
 * Deux lignes sur mobile : le wordmark et les actions, puis les onglets
 * des trois verticales. Sur desktop tout tient sur une ligne, les
 * onglets à côté du wordmark et les actions repoussées à droite.
 *
 * La barre de recherche globale a quitté l'en-tête. Dans la nouvelle
 * direction, la recherche est un champ souligné large, posé dans le
 * héros de chaque écran qui en a besoin (accueil, bons plans,
 * annonces) — plus grand et plus visible qu'auparavant, mais rendu par
 * la page et non par le chrome.
 *
 * La pilule de commune est pour l'instant un lien vers les pages
 * locales : la géolocalisation « · 10 km » de la maquette suppose une
 * permission navigateur et un rayon, qui n'existent pas encore côté
 * données.
 */
export function Header({ user, unreadCount, unreadNotifications }: Props) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex min-h-14 items-center justify-between gap-4 sm:min-h-16">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Wordmark />
            {/* Desktop : les onglets s'alignent sur le wordmark. */}
            <VerticalTabs className="hidden lg:flex" />
            {/* Desktop : la recherche prend la place laissée libre au
                centre de l'en-tête (maquette #5b). Sur mobile elle vit
                dans le héros de chaque écran, en plus grand. */}
            <SoleilSearchField className="hidden min-w-0 max-w-[420px] flex-1 lg:flex" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/bons-plans/cayenne"
              className="hidden items-center gap-1.5 rounded-full border-[1.5px] border-input px-3.5 py-1.5 text-[13px] font-bold text-foreground transition hover:border-peyi-orange-400 sm:inline-flex"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Cayenne
            </Link>

            {/* Messages n'existe QUE dans la barre du bas, qui est
                masquée au-dessus de `sm` : sans ce lien, la messagerie
                deviendrait inatteignable sur grand écran. La maquette
                desktop ne montre que l'état déconnecté, où la question
                ne se pose pas. */}
            {user && (
              <Link
                href="/messages"
                aria-label={
                  unreadCount > 0
                    ? `Messages — ${unreadCount} non lu${unreadCount > 1 ? "s" : ""}`
                    : "Messages"
                }
                className="relative hidden h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-input text-foreground transition hover:border-peyi-orange-400 sm:inline-flex"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                {unreadCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-peyi-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-background"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {user && (
              <Link
                href="/notifications"
                aria-label={
                  unreadNotifications > 0
                    ? `Notifications — ${unreadNotifications} non lue${unreadNotifications > 1 ? "s" : ""}`
                    : "Notifications"
                }
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-input text-foreground transition hover:border-peyi-orange-400"
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

            {/* CTA Poster — desktop seulement : sur mobile c'est le
                bouton rond central de la barre du bas qui le porte. */}
            <Link
              href="/poster"
              className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground transition hover:opacity-90 lg:inline-flex"
            >
              Poster
              <Plus className="h-4 w-4" aria-hidden strokeWidth={2.5} />
            </Link>

            {user ? (
              <Link
                href="/profil"
                className="flex items-center gap-2 rounded-full border-[1.5px] border-input py-1 pl-1 pr-1 text-sm font-bold transition hover:border-peyi-orange-400 sm:pr-3"
              >
                <UserAvatar
                  username={user.username}
                  avatarUrl={user.avatarUrl}
                />
                <span className="hidden max-w-[120px] truncate sm:inline">
                  @{user.username}
                </span>
              </Link>
            ) : (
              <Link
                href="/connexion"
                className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-input px-3.5 py-1.5 text-[13px] font-bold text-foreground transition hover:border-peyi-orange-400"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                Connexion
              </Link>
            )}
          </div>
        </div>

        {/* Mobile : les onglets prennent leur propre ligne, collés au
            filet du bas pour que le soulignement de 3 px se lise comme
            un onglet et non comme une décoration flottante. */}
        <VerticalTabs hideOnHome className="-mb-px lg:hidden" />
      </div>
    </header>
  );
}
