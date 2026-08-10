import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Flame, Tag } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/current-user";
import { rethrowIfNextInternal } from "@/lib/next-errors";
import { withTimeout } from "@/lib/async/with-timeout";
import { cn } from "@/lib/utils";

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

type Choice = {
  href: string;
  icon: typeof Flame;
  eyebrow: string;
  title: string;
  description: string;
  examples: string;
  /** Classes complètes — Tailwind ne peut pas résoudre un nom construit
   *  dynamiquement (`bg-${x}-50` serait purgé au build). */
  iconClass: string;
};

const CHOICES: Choice[] = [
  {
    href: "/poster/bon-plan",
    icon: Flame,
    eyebrow: "Gratuit · +5 karma",
    title: "Un bon plan",
    description:
      "Une promo, un arrivage, un prix cassé que tu viens de repérer. La communauté vote, les meilleurs deals remontent.",
    examples: "Promo supermarché, déstockage, vol pas cher…",
    iconClass: "bg-peyi-orange-50 text-peyi-orange-700",
  },
  {
    href: "/poster/annonce",
    icon: Tag,
    eyebrow: "Gratuit · 60 jours en ligne",
    title: "Une petite annonce",
    description:
      "Tu vends, tu loues ou tu proposes un service. Photos, prix, description : ton annonce est visible par toute la Guyane.",
    examples: "Voiture, appartement, mobilier, job…",
    iconClass: "bg-peyi-green-50 text-peyi-green-700",
  },
];

export default async function PosterPage() {
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
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:pt-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Qu&apos;est-ce que tu veux publier&nbsp;?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {username
            ? `Choisis le type de publication, @${username}.`
            : "Choisis le type de publication — la connexion se fait juste après."}
        </p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          return (
            <Link
              key={choice.href}
              href={choice.href}
              className="group flex flex-col rounded-lg border border-border bg-card p-5 transition duration-base hover:-translate-y-0.5 hover:border-peyi-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-full",
                  choice.iconClass,
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>

              <p className="mt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {choice.eyebrow}
              </p>
              <h2 className="mt-0.5 font-display text-lg font-bold">
                {choice.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {choice.description}
              </p>
              <p className="mt-2 text-xs italic text-muted-foreground">
                {choice.examples}
              </p>

              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-peyi-orange-700">
                Commencer
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        Tu cherches à référencer une activité touristique (sentier, sortie
        pirogue, site à visiter)&nbsp;? Écris-nous&nbsp;: les fiches de la{" "}
        <Link href="/activites" className="underline hover:text-foreground">
          carte des activités
        </Link>{" "}
        sont validées par l&apos;équipe Péyi.
      </p>
    </main>
  );
}
