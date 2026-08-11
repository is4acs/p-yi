import Link from "next/link";
import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth/current-user";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import { withTimeout } from "@/lib/async/with-timeout";
import { BackHeader } from "@/components/soleil/BackHeader";
import { ConseilPeyi } from "@/components/soleil/ConseilPeyi";
import { PosterFork } from "@/components/soleil/PosterFork";
import { getMessages, tFormat } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Poster sur Péyi",
  description:
    "Partage un bon plan ou publie une petite annonce en Guyane, en quelques minutes.",
  robots: { index: false, follow: true },
};

const AUTH_TIMEOUT_MS = 2_000;

/**
 * Point d'entrée unique de la publication : on choisit d'abord CE qu'on
 * publie, puis on remplit le bon formulaire.
 *
 * Avant, `/poster` était directement le formulaire « bon plan » et les
 * annonces vivaient derrière `/poster/annonce`, sans aucun lien entre les
 * deux — le bouton central de la barre de navigation menait donc toujours
 * aux bons plans, et rien n'indiquait qu'on pouvait aussi déposer une
 * annonce. Le formulaire a déménagé vers `/poster/bon-plan` ; cette page
 * pose le choix.
 *
 * Volontairement accessible sans être connecté : on montre ce qui est
 * possible avant de demander un compte. Chaque formulaire exige ensuite
 * l'authentification et renvoie ici via `?next=`, donc l'utilisateur
 * retombe sur le bon écran après connexion.
 */

export default async function PosterPage() {
  const t = await getMessages();
  // On ne bloque pas la page si l'auth est lente ou indisponible : le nom
  // n'est qu'un agrément, les choix restent affichés.
  let username: string | null = null;
  try {
    const user = await withTimeout(
      getCurrentUser(),
      AUTH_TIMEOUT_MS,
      "poster/current-user",
    );
    username = user?.username ?? null;
  } catch (err) {
    rethrowIfNextInternal(err);
    // eslint-disable-next-line no-console
    console.error("[poster] current user load failed", err);
  }

  return (
    <main className="min-h-screen bg-soleil-cream pb-16 text-soleil-forest animate-in fade-in duration-300 dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto w-full max-w-md lg:max-w-2xl">
        <BackHeader title={t.poster.title} backHref="/" />
        <h1 className="sr-only">Poster sur Péyi</h1>

        <div className="px-5">
          <p className="pt-4 text-[13px] leading-relaxed text-soleil-body dark:text-soleil-body-d">
            {username
              ? tFormat(t.poster.intro, { name: username })
              : t.poster.introAnon}
          </p>

          <PosterFork className="pt-4" />

          <ConseilPeyi className="mt-6">
            {t.poster.activityNote.split("{link}")[0]}
            <Link href="/activites" className="font-bold underline">
              {t.poster.activityMapLink}
            </Link>
            {t.poster.activityNote.split("{link}")[1] ?? ""}
          </ConseilPeyi>
        </div>
      </div>
    </main>
  );
}
