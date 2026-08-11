import Link from "next/link";
import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/current-user";
import { formatRelativeTime } from "@/lib/format";
import { fetchInbox, type InboxConversation } from "@/lib/messages/queries";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { getLocale, getMessages, type Messages } from "@/lib/i18n";
import { translateUserTexts } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages",
  description:
    "Tes conversations privées avec les vendeurs et les membres Péyi.",
  robots: { index: false, follow: false },
};

/** Fond d'avatar en alternance (maquette 4f) : forêt / orange / sable. */
const AVATAR_TONES = [
  "bg-soleil-forest text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest",
  "bg-soleil-orange text-soleil-forest",
  "bg-soleil-sand text-soleil-forest dark:bg-soleil-forest dark:text-soleil-cream",
] as const;

function isTeamAccount(username: string): boolean {
  return /^(equipe|équipe|team)[-_.]?peyi$|^peyi$/i.test(username.trim());
}

export default async function MessagesInboxPage() {
  const t = await getMessages();
  const locale = await getLocale();
  const user = await requireUser("/messages");
  const conversations = await fetchInbox(user.id);

  // Aperçus : les derniers messages reçus sont traduits vers la langue de
  // l'interface (comme dans le fil). Passthrough sans fournisseur.
  const previews = await translateUserTexts(
    conversations.map((c) =>
      c.lastMessage.isFromMe ? "" : c.lastMessage.content,
    ),
    locale,
  );

  return (
    <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md px-5 lg:max-w-2xl">
        <div className="flex items-center justify-between pt-4">
          <h1 className="font-display text-[22px] font-extrabold">{t.messagesPage.title}</h1>
          <Link
            href="/recherche"
            aria-label={t.messagesPage.searchAria}
            className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-soleil-border dark:border-soleil-border-d"
          >
            <Icon name="search" size={15} />
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="mt-8 rounded-[14px] bg-soleil-sand p-6 text-center dark:bg-soleil-forest">
            <p className="text-sm font-bold">{t.messagesPage.emptyTitle}</p>
            <p className="mt-1 text-xs text-soleil-body dark:text-soleil-body-d">
              {t.messagesPage.emptySub}
            </p>
            <Link
              href="/annonces"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-soleil-forest px-4 text-sm font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
            >
              {t.messagesPage.browse}
            </Link>
          </div>
        ) : (
          <>
            <ul className="pt-2">
              {conversations.map((c, i) => (
                <li
                  key={c.key}
                  className="border-b border-soleil-line last:border-0 dark:border-soleil-line-d"
                >
                  <ConversationRow
                    conversation={c}
                    index={i}
                    t={t}
                    preview={
                      c.lastMessage.isFromMe
                        ? c.lastMessage.content
                        : previews[i]?.text ?? c.lastMessage.content
                    }
                  />
                </li>
              ))}
            </ul>
            <p className="py-6 text-center text-[11px] text-soleil-muted dark:text-soleil-muted-d">
              {t.messagesPage.allForNow}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function ConversationRow({
  conversation: c,
  index,
  t,
  preview,
}: {
  conversation: InboxConversation;
  index: number;
  t: Messages;
  preview: string;
}) {
  const href = c.listing
    ? `/messages/${c.otherParty.username}?listing=${c.listing.slug}`
    : `/messages/${c.otherParty.username}`;

  const previewPrefix = c.lastMessage.isFromMe ? t.messagesPage.you : "";
  const isUnread = c.unreadCount > 0;
  const isTeam = isTeamAccount(c.otherParty.username);

  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3 transition active:scale-[0.99]"
    >
      {isTeam ? (
        <span
          aria-hidden
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full bg-soleil-valid dark:bg-soleil-valid-d"
        >
          {/* P du logo Péyi (même tracé que public/icons.svg#peyi-logo). */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 200 200"
            className="fill-soleil-forest"
          >
            <path d="M70 30 h55 a45 45 0 0 1 45 45 v0 a45 45 0 0 1 -45 45 h-35 v40 a12 12 0 0 1 -12 12 h-12 a12 12 0 0 1 -12 -12 v-118 a12 12 0 0 1 12 -12 z M90 62 v34 h30 a17 17 0 0 0 17 -17 v0 a17 17 0 0 0 -17 -17 z" />
          </svg>
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full text-[15px] font-extrabold",
            AVATAR_TONES[index % AVATAR_TONES.length],
          )}
        >
          {c.otherParty.username.trim()[0]?.toUpperCase() ?? "?"}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[13.5px]",
              isUnread ? "font-extrabold" : "font-bold",
            )}
          >
            {isTeam ? t.messagesPage.team : c.otherParty.username}
          </span>
          <span className="flex-none text-[10.5px] tabular-nums text-soleil-muted dark:text-soleil-muted-d">
            {formatRelativeTime(c.lastMessage.createdAt)}
          </span>
        </div>

        <p
          className={cn(
            "mt-0.5 line-clamp-1 text-xs",
            isUnread && !c.lastMessage.isFromMe
              ? "font-bold"
              : "text-soleil-muted dark:text-soleil-muted-d",
          )}
        >
          {previewPrefix}
          {preview}
        </p>

        {c.listing && (
          <p className="mt-0.5 truncate text-[10.5px] font-bold text-soleil-otext dark:text-soleil-otext-d">
            {c.listing.title}
          </p>
        )}
      </div>

      {isUnread && (
        <span
          aria-label={`${c.unreadCount} message${c.unreadCount > 1 ? "s" : ""} non lu${c.unreadCount > 1 ? "s" : ""}`}
          className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-soleil-orange text-[10.5px] font-extrabold text-soleil-forest"
        >
          {c.unreadCount > 9 ? "9+" : c.unreadCount}
        </span>
      )}
    </Link>
  );
}
