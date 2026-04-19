import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BadgeCheck, Save, Trash2, Upload } from "lucide-react";

import { requireUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserAvatar } from "@/components/layout/UserAvatar";

import {
  removeAvatarAction,
  updateAvatarAction,
  updateProfileAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier mon profil",
  description: "Mets à jour ton pseudo, ton e-mail et ton numéro de téléphone.",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ProfilEditPage(props: Props) {
  const searchParams = await props.searchParams;
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
          Change ton pseudo, ton e-mail ou ton numéro. Un changement d&apos;e-mail
          ou de numéro demande une confirmation.
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

      <section
        aria-labelledby="avatar-heading"
        className="mt-6 rounded-lg border border-border bg-card p-4"
      >
        <h2 id="avatar-heading" className="text-sm font-semibold">
          Photo de profil
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG ou WebP. 2 Mo maximum. Visible sur tes posts et commentaires.
        </p>

        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <UserAvatar
            username={user.username}
            avatarUrl={user.avatarUrl}
            size="lg"
          />

          <div className="flex w-full flex-col gap-2 sm:flex-1">
            <form
              action={updateAvatarAction}
              encType="multipart/form-data"
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <Label htmlFor="avatar" className="sr-only">
                Nouvelle photo de profil
              </Label>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="flex-1"
              />
              <SubmitButton size="sm" pendingLabel="Envoi…">
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Envoyer
              </SubmitButton>
            </form>

            {user.avatarUrl && (
              <form action={removeAvatarAction}>
                <SubmitButton
                  variant="outline"
                  size="sm"
                  pendingLabel="Suppression…"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Retirer la photo
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </section>

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
          <SubmitButton size="lg" className="flex-1" pendingLabel="Enregistrement…">
            <Save className="h-4 w-4" aria-hidden />
            Enregistrer
          </SubmitButton>
          <Button asChild variant="outline" size="lg">
            <Link href="/profil">Annuler</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
