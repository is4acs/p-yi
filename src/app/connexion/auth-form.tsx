"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

import { GoogleSignInButton } from "./google-sign-in-button";

/**
 * Formulaire connexion / inscription.
 *
 * Le basculement entre les deux onglets est purement client : avant, chaque
 * clic sur « Créer un compte » déclenchait une navigation serveur complète
 * (`/connexion?mode=signup`) — un aller-retour réseau pour afficher un champ
 * de plus, ce qui se sent immédiatement sur le réseau mobile guyanais. Ici
 * c'est instantané, et l'e-mail déjà saisi n'est pas perdu au passage.
 *
 * Les Server Actions restent la cible du `<form>` : on ne perd ni le
 * rate-limiting, ni la validation zod, ni le fonctionnement sans JavaScript.
 * `next` est propagé en champ caché (formulaire) et en paramètre du callback
 * OAuth (Google) — sans lui, l'utilisateur qui se connecte depuis « Poster »
 * atterrissait sur le flux des bons plans au lieu de revenir à son
 * formulaire.
 */

type Props = {
  initialMode: "signin" | "signup";
  /** Chemin interne déjà validé côté serveur. */
  next: string;
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
};

export function AuthForm({
  initialMode,
  next,
  signInAction,
  signUpAction,
}: Props) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";

  return (
    <>
      <div
        role="tablist"
        aria-label="Connexion ou inscription"
        className="mt-6 grid grid-cols-2 rounded-full border border-border bg-muted p-1 text-sm font-medium"
      >
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-full px-3 py-2 text-center transition duration-base",
              mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "signin" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      <GoogleSignInButton next={next} />

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden />
        <span>ou par e-mail</span>
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>

      <form action={isSignup ? signUpAction : signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder="toi@exemple.gf"
          />
        </div>

        {/*
          Champ monté en permanence mais masqué hors inscription : le
          navigateur conserve ainsi la valeur saisie si l'utilisateur
          bascule d'onglet par erreur. `disabled` l'exclut de l'envoi en
          mode connexion.
        */}
        <div className={cn("space-y-1.5", !isSignup && "hidden")}>
          <Label htmlFor="username">Pseudo</Label>
          <Input
            id="username"
            name="username"
            type="text"
            required={isSignup}
            disabled={!isSignup}
            autoComplete="username"
            pattern="[a-z0-9_.]{3,20}"
            placeholder="marie973"
          />
          <p className="text-xs text-muted-foreground">
            3 à 20 caractères : minuscules, chiffres, _ et . uniquement.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="8 caractères minimum"
              className="pr-12"
            />
            {/* Voir son mot de passe évite l'aller-retour « mot de passe
                incorrect » sur clavier mobile. Cible tactile 44px. */}
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {!isSignup && (
            <div className="text-right">
              <Link
                href="/connexion/mot-de-passe-oublie"
                className="text-xs font-medium text-peyi-orange-700 hover:underline"
              >
                Mot de passe oublié&nbsp;?
              </Link>
            </div>
          )}
        </div>

        <SubmitButton
          size="lg"
          variant="peyi"
          className="w-full"
          pendingLabel={isSignup ? "Création…" : "Connexion…"}
        >
          {isSignup ? (
            <>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Créer mon compte
            </>
          ) : (
            "Se connecter"
          )}
        </SubmitButton>
      </form>
    </>
  );
}
