"use client";

import Link from "next/link";
import { useTransition } from "react";

import { markNotificationReadAction } from "@/app/notifications/actions";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  href: string;
  isRead: boolean;
  children: React.ReactNode;
  className?: string;
};

/**
 * Wraps a row in a <Link> and fires mark-as-read in a transition when the
 * user clicks. The click feels instant — navigation is not awaited on the
 * action; the bell badge refreshes on the next server render thanks to the
 * revalidatePath("/", "layout") inside the action.
 *
 * Kept as a client component (instead of a form-button) so the markup is a
 * real anchor : right-click → "Open in new tab" works, middle-click opens
 * a tab, screen-readers announce it as a link. The tradeoff is a few KB of
 * client JS, fine for a page this small.
 */
export function NotificationLink({
  id,
  href,
  isRead,
  children,
  className,
}: Props) {
  const [, startTransition] = useTransition();

  return (
    <Link
      href={href}
      className={cn(className)}
      onClick={() => {
        if (isRead) return;
        startTransition(() => {
          // Fire-and-forget : don't block navigation on the mutation.
          void markNotificationReadAction(id);
        });
      }}
    >
      {children}
    </Link>
  );
}
