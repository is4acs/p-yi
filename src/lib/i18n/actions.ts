"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, parseLocale } from "./config";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

/** Change la langue de l'interface (cookie, un an). */
export async function setLocaleAction(locale: string): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, parseLocale(locale), {
    path: "/",
    maxAge: ONE_YEAR_S,
    sameSite: "lax",
  });
}
