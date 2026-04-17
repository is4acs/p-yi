import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, Save } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { updateProfileAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier mon profil",
  description: "Mets à jour ton pseudo, ton e-mail et ton numéro de téléphone.",
};

type Props = {
  searchParams: { error?: string };
};

export default async function ProfilEditPage({ searchParams }: Props) {
  const user = await requireUser("/profil/edit");

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 animate-in fade-in duration-300 sm:max-w-2xl sm:pt-10">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Profil
      </Link>

      <div className="mt-4">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Modifier mon profil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Change ton pseudo, ton e-mail ou ton numéro. Un changement d'e-mail ou
          de numéro demande une confirmation.
        </p>
      </div>

      {searchParams.error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {searchParams.error}
        </div>
      )}

      <form action={updateProfileAction} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="username">Pseudo *</Label>
          <Input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_.]+"
            defaultValue={user.username}
            placeholder="marie973"
          />
          <p className="text-xs text-muted-foreground">
            Minuscules, chiffres, points et underscores uniquement.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName">Nom complet</Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            maxLength={80}
            defaultValue={user.fullName ?? ""}
            placeholder="Marie Dupont"
          />
          <p className="text-xs text-muted-foreground">
            Facultatif, visible sur ton profil public.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={user.email}
          />
          <p className="text-xs text-muted-foreground">
            En cas de changement, tu recevras un lien de confirmation sur la
            nouvelle adresse.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone" className="flex items-center gap-1.5">
            Téléphone
            {user.phoneVerified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-peyi-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-peyi-green-700">
                <BadgeCheck className="h-3 w-3" aria-hidden />
                Vérifié
              </span>
            )}
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            defaultValue={user.phone ?? ""}
            placeholder="0694 12 34 56"
          />
          <p className="text-xs text-muted-foreground">
            Formats acceptés : <code>0694 12 34 56</code>,{" "}
            <code>+594 694 12 34 56</code>. Tu recevras un code par SMS pour
            vérifier le nouveau numéro.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" size="lg" className="flex-1">
            <Save className="h-4 w-4" aria-hidden />
            Enregistrer
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/profil">Annuler</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
