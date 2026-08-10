import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";

import { safeInternalPath } from "@/lib/safe-redirect";

import { signInAction, signUpAction } from "./actions";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connecte-toi à Péyi pour poster tes bons plans et tes annonces.",
  alternates: { canonical: "/connexion" },
  // Page d'action (formulaire de connexion) : pas de valeur SEO,
  // on évite que Google l'indexe au détriment de contenus plus utiles.
  robots: { index: false, follow: true },
};

type SearchParams = {
  mode?: string;
  error?: string;
  confirmSent?: string;
  next?: string;
};

export default async function ConnexionPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const isSignup = searchParams.mode === "signup";
  const confirmSent = searchParams.confirmSent === "1";
  // `next` vient de l'URL, donc de l'utilisateur : on le contraint à un
  // chemin interne dès l'entrée (cf. safe-redirect) avant de le confier au
  // formulaire ou au bouton Google.
  const next = safeInternalPath(searchParams.next, "/bons-plans");

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col px-4 pb-16 pt-6 sm:pt-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-display text-title-md font-bold tracking-tight">
          Péyi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bons plans, annonces et activités — 100&nbsp;% Guyane.
        </p>
      </div>

      {confirmSent && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 rounded-lg border border-peyi-green-300 bg-peyi-green-50 p-3 text-sm text-peyi-green-800"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Vérifie ta boîte mail</p>
            <p className="text-xs">
              Clique sur le lien qu&apos;on vient de t&apos;envoyer pour
              activer ton compte.
            </p>
          </div>
        </div>
      )}

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{searchParams.error}</span>
        </div>
      )}

      <AuthForm
        initialMode={isSignup ? "signup" : "signin"}
        next={next}
        signInAction={signInAction}
        signUpAction={signUpAction}
      />

      <p className="mt-6 text-center text-xs text-muted-foreground">
        En continuant, tu acceptes nos{" "}
        <Link href="/cgu" className="underline hover:text-foreground">
          conditions
        </Link>{" "}
        et notre{" "}
        <Link href="/confidentialite" className="underline hover:text-foreground">
          politique de confidentialité
        </Link>
        .
      </p>
    </main>
  );
}
