import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";

import { safeInternalPath } from "@/lib/safe-redirect";
import { getMessages } from "@/lib/i18n";
import { Sun } from "@/components/soleil/Sun";

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
  const t = await getMessages();
  const isSignup = searchParams.mode === "signup";
  const confirmSent = searchParams.confirmSent === "1";
  // `next` vient de l'URL, donc de l'utilisateur : on le contraint à un
  // chemin interne dès l'entrée (cf. safe-redirect) avant de le confier au
  // formulaire ou au bouton Google.
  const next = safeInternalPath(searchParams.next, "/bons-plans");

  // Le template CGU contient {terms} et {privacy} : on le découpe pour
  // intercaler les liens sans dangerouslySetInnerHTML.
  const termsParts = t.auth.terms.split(/(\{terms\}|\{privacy\})/);

  return (
    <main className="min-h-screen bg-soleil-cream px-4 pb-10 text-soleil-forest dark:bg-soleil-night dark:text-soleil-cream">
      <div className="mx-auto flex w-full max-w-md flex-col pt-4">
        <Link
          href="/"
          aria-label={t.common.back}
          className="inline-flex h-11 w-11 items-center justify-center self-start rounded-full border-[1.5px] border-soleil-border bg-soleil-input transition active:scale-95 dark:border-soleil-border-d dark:bg-soleil-forest"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>

        <div className="mt-7 flex flex-col items-center text-center">
          <span className="flex items-end gap-2">
            <Sun w={26} />
            <span className="font-display text-[32px] font-extrabold leading-[0.85] tracking-[-0.5px]">
              péyi
            </span>
          </span>
          <p className="mt-3 text-[13px] font-semibold text-soleil-muted2 dark:text-soleil-muted-d">
            {t.auth.tagline}
          </p>
        </div>

        {confirmSent && (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-[14px] bg-soleil-valid p-3.5 text-sm text-soleil-forest dark:bg-soleil-valid-d"
          >
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-extrabold">{t.auth.checkInbox}</p>
              <p className="mt-0.5 text-xs font-medium">{t.auth.checkInboxSub}</p>
            </div>
          </div>
        )}

        {searchParams.error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-[14px] border-[1.5px] border-destructive/40 bg-destructive/10 p-3.5 text-sm font-semibold text-destructive"
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

        <p className="mt-7 text-center text-xs leading-relaxed text-soleil-muted2 dark:text-soleil-muted-d">
          {termsParts.map((part, i) => {
            if (part === "{terms}") {
              return (
                <Link
                  key={i}
                  href="/cgu"
                  className="font-semibold underline hover:text-soleil-forest dark:hover:text-soleil-cream"
                >
                  {t.auth.termsLink}
                </Link>
              );
            }
            if (part === "{privacy}") {
              return (
                <Link
                  key={i}
                  href="/confidentialite"
                  className="font-semibold underline hover:text-soleil-forest dark:hover:text-soleil-cream"
                >
                  {t.auth.privacyLink}
                </Link>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>
    </main>
  );
}
