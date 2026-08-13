import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Package } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { formatRelativeTime } from "@/lib/format";
import { LEVEL_META } from "@/lib/deals/user-level";
import {
  isOptimizableImageUrl,
  isRenderableImageUrl,
} from "@/lib/images";
import { formatPriceType } from "@/lib/listings/queries";
import {
  fetchThread,
  markThreadAsRead,
  type ThreadMessage,
  type ThreadOther,
  type ThreadListing,
} from "@/lib/messages/queries";
import { getLocale, getMessages, tFormat, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { firstParam } from "@/lib/url-params";
import {
  translateUserTexts,
  type TranslatedText,
} from "@/lib/i18n/translate";
import { UserAvatar } from "@/components/layout/UserAvatar";
import { ReplySendButton } from "@/components/messages/ReplySendButton";

import { sendMessageAction } from "../actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
  // Valeurs potentiellement en tableau si le paramètre est répété —
  // lecture via `firstParam` uniquement.
  searchParams: Promise<{
    listing?: string | string[];
    error?: string | string[];
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `Conversation avec @${params.username}`,
    description: "Messagerie privée sur Péyi.",
    robots: { index: false, follow: false },
  };
}

export default async function ThreadPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const listingSlug = firstParam(searchParams.listing) ?? null;
  const errorMessage = firstParam(searchParams.error) ?? null;
  const t = await getMessages();
  const locale = await getLocale();
  const user = await requireUser(
    `/messages/${params.username}${listingSlug ? `?listing=${listingSlug}` : ""}`,
  );

  const thread = await fetchThread({
    userId: user.id,
    otherUsername: params.username,
    listingSlug,
  });
  if (!thread) notFound();

  // Mark the messages received from the other user as read. Done server-side
  // on render so the badge drops as soon as the page loads.
  await markThreadAsRead({
    userId: user.id,
    otherUserId: thread.other.id,
    listingId: thread.listing?.id ?? null,
  });

  // Traduction automatique des messages REÇUS vers la langue de
  // l'interface — c'est ici qu'un vendeur haïtien et un acheteur
  // brésilien se parlent. `sensitive` : un DM ne part JAMAIS vers
  // l'endpoint public sans clé — passthrough tant qu'aucun fournisseur
  // contractuel n'est configuré.
  const received = thread.messages.filter((m) => m.senderId !== user.id);
  const receivedMt = await translateUserTexts(
    received.map((m) => m.content),
    locale,
    { sensitive: true },
  );
  const mtById = new Map<string, TranslatedText>();
  received.forEach((m, i) => mtById.set(m.id, receivedMt[i]));

  return (
    <main className="bg-soleil-cream text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-md flex-col px-4 pb-4 pt-4 sm:max-w-2xl lg:min-h-[calc(100dvh-4rem)] lg:pt-8">
        <Link
          href="/messages"
          className="inline-flex min-h-[44px] items-center gap-2 self-start text-sm font-bold text-soleil-muted2 transition hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:text-soleil-cream"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.messagesPage.backToInbox}
        </Link>

        <ThreadHeader other={thread.other} />

        {thread.listing && (
          <ListingContextCard listing={thread.listing} t={t} locale={locale} />
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive"
          >
            {errorMessage}
          </div>
        )}

        <section
          aria-label={tFormat(t.messagesPage.conversationWith, {
            username: thread.other.username,
          })}
          className="mt-5 flex flex-1 flex-col gap-2"
        >
          {thread.messages.length === 0 ? (
            <div className="my-8 rounded-[14px] bg-soleil-sand p-4 text-center text-sm font-semibold text-soleil-body dark:bg-soleil-forest dark:text-soleil-body-d">
              {t.messagesPage.noMessagesYet}
            </div>
          ) : (
            thread.messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isFromMe={m.senderId === user.id}
                mt={mtById.get(m.id)}
                t={t}
                locale={locale}
              />
            ))
          )}
        </section>

        <ReplyForm
          recipientUsername={thread.other.username}
          listingSlug={thread.listing?.slug ?? null}
          t={t}
        />
      </div>
    </main>
  );
}

function ThreadHeader({ other }: { other: ThreadOther }) {
  const level = LEVEL_META[other.level] ?? LEVEL_META.BEGINNER;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[14px] bg-soleil-sand p-3 dark:bg-soleil-forest">
      <UserAvatar
        username={other.username}
        avatarUrl={other.avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">@{other.username}</p>
        <p className="truncate text-xs text-soleil-muted2 dark:text-soleil-muted-d">
          {level.label} · {other.karma.toLocaleString("fr-FR")} karma
          {other.city?.name ? ` · ${other.city.name}` : ""}
        </p>
      </div>
    </div>
  );
}

function ListingContextCard({
  listing,
  t,
  locale,
}: {
  listing: ThreadListing;
  t: Messages;
  locale: Locale;
}) {
  const price = formatPriceType(listing.priceType, listing.price, locale);
  return (
    <Link
      href={`/annonces/${listing.slug}`}
      className="mt-2 flex items-center gap-3 rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-input p-2.5 text-sm transition hover:border-soleil-forest dark:border-soleil-border-d dark:bg-soleil-forest dark:hover:border-soleil-cream"
    >
      {isRenderableImageUrl(listing.coverImageUrl) ? (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px]">
          <Image
            src={listing.coverImageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
            unoptimized={!isOptimizableImageUrl(listing.coverImageUrl)}
          />
        </div>
      ) : (
        <div
          className="soleil-ph flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] text-soleil-muted2 dark:text-soleil-muted-d"
          aria-hidden
        >
          <Package className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.5px] text-soleil-otext dark:text-soleil-otext-d">
          {t.messagesPage.threadAbout}
        </p>
        <p className="truncate font-bold">{listing.title}</p>
        <p className="text-xs text-soleil-muted2 dark:text-soleil-muted-d">
          {price}
        </p>
      </div>
    </Link>
  );
}

function MessageBubble({
  message,
  isFromMe,
  mt,
  t,
  locale,
}: {
  message: ThreadMessage;
  isFromMe: boolean;
  mt?: TranslatedText;
  t: Messages;
  locale: Locale;
}) {
  const content = mt?.translated ? mt.text : message.content;
  return (
    <div
      className={"flex w-full " + (isFromMe ? "justify-end" : "justify-start")}
    >
      <div
        className={
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm " +
          (isFromMe
            ? "rounded-br-sm bg-soleil-forest text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
            : "rounded-bl-sm bg-soleil-sand text-soleil-forest dark:bg-soleil-forest dark:text-soleil-cream")
        }
      >
        <p className="whitespace-pre-wrap break-words font-medium">{content}</p>
        {mt?.translated && (
          <details className="mt-1 text-[10.5px] opacity-80">
            <summary className="cursor-pointer font-semibold">
              {t.mt.translated} · {t.mt.seeOriginal}
            </summary>
            <p className="mt-1 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          </details>
        )}
        <p className="mt-1 text-[10px] opacity-70">
          {formatRelativeTime(message.createdAt, locale)}
        </p>
      </div>
    </div>
  );
}

function ReplyForm({
  recipientUsername,
  listingSlug,
  t,
}: {
  recipientUsername: string;
  listingSlug: string | null;
  t: Messages;
}) {
  return (
    <form
      action={sendMessageAction}
      className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mt-4 flex items-end gap-2 border-t border-soleil-line bg-soleil-cream/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-soleil-cream/80 dark:border-soleil-line-d dark:bg-soleil-night/95 dark:supports-[backdrop-filter]:bg-soleil-night/80 lg:bottom-0"
    >
      <input type="hidden" name="recipientUsername" value={recipientUsername} />
      {listingSlug && (
        <input type="hidden" name="listingSlug" value={listingSlug} />
      )}
      <label htmlFor="reply-content" className="sr-only">
        {t.messagesPage.yourMessage}
      </label>
      <textarea
        id="reply-content"
        name="content"
        required
        maxLength={2000}
        rows={1}
        placeholder={tFormat(t.messagesPage.replyTo, {
          username: recipientUsername,
        })}
        className="min-h-[44px] max-h-32 w-full resize-y rounded-[22px] border-[1.5px] border-soleil-border bg-soleil-input px-4 py-2.5 text-sm font-semibold text-soleil-forest placeholder:font-medium placeholder:text-soleil-muted focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus:border-soleil-cream"
      />
      <ReplySendButton />
    </form>
  );
}
