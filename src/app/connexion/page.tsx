import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signInAction, signUpAction } from "./actions";
import { GoogleSignInButton } from "./google-sign-in-button";

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
};

export default function ConnexionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const isSignup = searchParams.mode === "signup";
  const error = searchParams.error;
  const confirmSent = searchParams.confirmSent === "1";

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col px-4 pb-16 pt-6 sm:max-w-md sm:pt-12">
      <Link
        href="/bons-plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {isSignup ? "Rejoins Péyi" : "Bon retour"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup
            ? "Crée ton compte pour partager et vendre en Guyane."
            : "Connecte-toi pour poster et chatter."}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Connexion ou inscription"
        className="mt-6 grid grid-cols-2 rounded-full border border-border bg-muted p-1 text-sm font-medium"
      >
        <Link
          href="/connexion"
          role="tab"
          aria-selected={!isSignup}
          className={cn(
            "rounded-full px-3 py-2 text-center transition",
            !isSignup
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Se connecter
        </Link>
        <Link
          href="/connexion?mode=signup"
          role="tab"
          aria-selected={isSignup}
          className={cn(
            "rounded-full px-3 py-2 text-center transition",
            isSignup
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Créer un compte
        </Link>
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
              Clique sur le lien qu&apos;on vient de t&apos;envoyer pour activer ton
              compte.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <GoogleSignInButton />

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span>ou {isSignup ? "avec un e-mail" : "e-mail"}</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <form
        action={isSignup ? signUpAction : signInAction}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="toi@exemple.gf"
          />
        </div>

        {isSignup && (
          <div className="space-y-1.5">
            <Label htmlFor="username">Pseudo</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              pattern="[a-z0-9_.]{3,20}"
              placeholder="marie973"
            />
            <p className="text-xs text-muted-foreground">
              3 à 20 caractères, minuscules, chiffres, _ et . uniquement.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="8 caractères minimum"
          />
        </div>

        <Button type="submit" size="lg" className="w-full">
          {isSignup ? (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Créer mon compte
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        En continuant, tu acceptes nos conditions et notre politique de
        confidentialité.
      </p>
    </main>
  );
}
