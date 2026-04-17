import type { Metadata } from "next";
import { LogOut, MapPin, Mail } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";
import { LEVEL_META } from "@/lib/deals/user-level";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/layout/UserAvatar";

import { signOutAction } from "../connexion/actions";

export const metadata: Metadata = {
  title: "Profil",
  description: "Ton profil Péyi : karma, badges et historique.",
};

export default async function ProfilPage() {
  const user = await requireUser("/profil");
  const city = user.cityId
    ? await prisma.city.findUnique({
        where: { id: user.cityId },
        select: { name: true },
      })
    : null;
  const level = LEVEL_META[user.level];

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl sm:pt-10">
      <section className="flex flex-col items-center text-center">
        <UserAvatar
          username={user.username}
          avatarUrl={user.avatarUrl}
          size="lg"
        />
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
          @{user.username}
        </h1>
        {user.fullName && (
          <p className="text-sm text-muted-foreground">{user.fullName}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          <span aria-hidden>{level.emoji}</span> {level.label} ·{" "}
          <span className="tabular-nums">
            {user.karma.toLocaleString("fr-FR")}
          </span>{" "}
          karma
        </p>
      </section>

      <section className="mt-6 space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
        <Row
          icon={<Mail className="h-4 w-4" />}
          label="E-mail"
          value={user.email}
        />
        <Row
          icon={<MapPin className="h-4 w-4" />}
          label="Commune"
          value={city?.name ?? "Non renseignée"}
        />
      </section>

      <section className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        Tes bons plans, annonces et badges apparaîtront ici bientôt.
      </section>

      <form action={signOutAction} className="mt-8">
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Se déconnecter
        </Button>
      </form>
    </main>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate">{value}</p>
      </div>
    </div>
  );
}
