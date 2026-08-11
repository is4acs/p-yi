"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { useMessages } from "@/components/soleil/I18nProvider";

import { GoogleSignInButton } from "./google-sign-in-button";

/**
 * Formulaire connexion / inscription « Soleil péyi ».
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

const LABEL_CLASS =
  "text-[11px] font-extrabold uppercase tracking-[0.5px] text-soleil-muted2 dark:text-soleil-muted-d";

const INPUT_CLASS =
  "w-full rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-input px-3.5 py-3 text-[14px] font-semibold text-soleil-forest placeholder:font-medium placeholder:text-soleil-muted focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus:border-soleil-cream";

export function AuthForm({
  initialMode,
  next,
  signInAction,
  signUpAction,
}: Props) {
  const t = useMessages();
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const isSignup = mode === "signup";

  return (
    <>
      <div
        role="tablist"
        aria-label={t.auth.tabsAria}
        className="mt-6 grid grid-cols-2 rounded-full border-[1.5px] border-soleil-border bg-soleil-input p-1 text-sm dark:border-soleil-border-d dark:bg-soleil-forest"
      >
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "min-h-[40px] rounded-full px-3 text-center font-bold transition",
              mode === value
                ? "bg-soleil-forest font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
                : "text-soleil-muted2 dark:text-soleil-muted-d",
            )}
          >
            {value === "signin" ? t.auth.signin : t.auth.signup}
          </button>
        ))}
      </div>

      <GoogleSignInButton next={next} />

      <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.5px] text-soleil-muted dark:text-soleil-muted-d">
        <span
          className="h-px flex-1 bg-soleil-line dark:bg-soleil-line-d"
          aria-hidden
        />
        <span>{t.auth.orByEmail}</span>
        <span
          className="h-px flex-1 bg-soleil-line dark:bg-soleil-line-d"
          aria-hidden
        />
      </div>

      <form action={isSignup ? signUpAction : signInAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-1.5">
          <label htmlFor="email" className={LABEL_CLASS}>
            {t.auth.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder={t.auth.emailPlaceholder}
            className={INPUT_CLASS}
          />
        </div>

        {/*
          Champ monté en permanence mais masqué hors inscription : le
          navigateur conserve ainsi la valeur saisie si l'utilisateur
          bascule d'onglet par erreur. `disabled` l'exclut de l'envoi en
          mode connexion.
        */}
        <div className={cn("space-y-1.5", !isSignup && "hidden")}>
          <label htmlFor="username" className={LABEL_CLASS}>
            {t.auth.username}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required={isSignup}
            disabled={!isSignup}
            autoComplete="username"
            pattern="[a-z0-9_.]{3,20}"
            placeholder={t.auth.usernamePlaceholder}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-soleil-muted dark:text-soleil-muted-d">
            {t.auth.usernameHelp}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className={LABEL_CLASS}>
            {t.auth.password}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={t.auth.passwordPlaceholder}
              className={cn(INPUT_CLASS, "pr-12")}
            />
            {/* Voir son mot de passe évite l'aller-retour « mot de passe
                incorrect » sur clavier mobile. Cible tactile 44px. */}
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? t.auth.hidePassword : t.auth.showPassword
              }
              className="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-soleil-muted transition hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:text-soleil-cream"
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
                className="text-xs font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
              >
                {t.auth.forgot}
              </Link>
            </div>
          )}
        </div>

        <SubmitButton
          className="min-h-[48px] w-full rounded-full bg-soleil-forest text-[14px] font-extrabold text-soleil-cream hover:bg-soleil-forest/90 dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream/90"
          pendingLabel={isSignup ? t.auth.signupPending : t.auth.signinPending}
        >
          {isSignup ? t.auth.createAccount : t.auth.signin}
        </SubmitButton>
      </form>
    </>
  );
}
