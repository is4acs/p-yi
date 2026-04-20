import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

import { requestPasswordResetAction } from "./actions";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  description:
    "Réinitialise ton mot de passe Péyi — on t'envoie un lien par e-mail.",
  alternates: { canonical: "/connexion/mot-de-passe-oublie" },
  robots: { index: false, follow: true },
};

type SearchParams = {
  error?: string;
  sent?: string;
};

export default async function MotDePasseOubliePage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error;
  const sent = searchParams.sent === "1";

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col px-4 pb-16 pt-6 sm:pt-12">
      <Link
        href="/connexion"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour à la connexion
      </Link>

      <div className="mt-6 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mot de passe oublié&nbsp;?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saisis ton e-mail, on t&apos;envoie un lien pour choisir un nouveau
          mot de passe.
        </p>
      </div>

      {sent ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-2 rounded-lg border border-peyi-green-300 bg-peyi-green-50 p-4 text-sm text-peyi-green-900"
        >
          <Mail className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Vérifie ta boîte mail</p>
            <p className="mt-1 text-xs">
              Si un compte existe pour cette adresse, tu recevras un e-mail
              dans quelques minutes. Pense à regarder tes spams.
            </p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <form action={requestPasswordResetAction} className="mt-6 space-y-4">
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

            <SubmitButton
              size="lg"
              className="w-full"
              pendingLabel="Envoi…"
            >
              Envoyer le lien
            </SubmitButton>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Tu te souviens&nbsp;?{" "}
        <Link
          href="/connexion"
          className="font-medium text-peyi-orange-700 hover:underline"
        >
          Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
