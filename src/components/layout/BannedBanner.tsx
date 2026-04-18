import Link from "next/link";
import { Ban } from "lucide-react";

type Props = {
  bannedUntil: Date | null;
};

/**
 * Bandeau d'alerte rouge en haut de page pour les utilisateurs bannis
 * activement. Le ban ne les déconnecte pas (ils peuvent continuer à
 * consulter), mais ils voient en permanence qu'ils ne peuvent plus
 * publier. Un clic sur "Voir les détails" mène à /banni où figurent
 * motif + durée + CTA contestation.
 *
 * On s'appuie sur le parent pour ne pas afficher ce bandeau si le ban
 * est temporairement expiré (la logique d'auto-débannissement vit
 * côté requireActiveUser / /banni).
 */
export function BannedBanner({ bannedUntil }: Props) {
  const isTemporary = Boolean(bannedUntil);
  return (
    <div className="sticky top-0 z-40 border-b border-red-300 bg-red-600 text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm">
        <Ban className="h-4 w-4 shrink-0" aria-hidden />
        <p className="flex-1">
          Ton compte est suspendu
          {isTemporary && bannedUntil
            ? ` jusqu'au ${new Intl.DateTimeFormat("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(bannedUntil)}`
            : ""}
          {" "}— tu ne peux plus publier, voter ni envoyer de messages.
        </p>
        <Link
          href="/banni"
          className="shrink-0 rounded-md border border-white/40 bg-white/10 px-2.5 py-1 text-xs font-semibold hover:bg-white/20"
        >
          Détails
        </Link>
      </div>
    </div>
  );
}
