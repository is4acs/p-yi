"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/current-user";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications/queries";

/**
 * Flip every unread notification to read for the current user. Submitted by
 * the "Tout marquer comme lu" button at the top of /notifications.
 */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser("/notifications");
  await markAllNotificationsAsRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout"); // drops the bell badge everywhere it is rendered
  redirect("/notifications");
}

/**
 * Mark a single notification as read. Called from NotificationLink's onClick
 * so the badge drops the moment the user clicks the row — we intentionally
 * don't `redirect` here, the <Link> next to the button handles navigation.
 */
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const user = await requireUser("/notifications");
  await markNotificationAsRead({ notificationId, userId: user.id });
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}
