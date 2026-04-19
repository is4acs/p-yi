"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { ReportReason } from "@prisma/client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { createReportAction } from "./actions";

type TargetKind = "listing" | "deal" | "comment" | "user";

type Props = {
  kind: TargetKind;
  targetId: string;
  /** Libellé du bouton déclencheur — défaut "Signaler". */
  label?: string;
  /** Style : icon-only pour les actions compactes, texte pour les CTA contextuels. */
  variant?: "icon" | "text" | "ghost";
  /** Override du texte du titre du dialog (ex. "Signaler cette annonce"). */
  title?: string;
};

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: ReportReason.SCAM, label: "Arnaque" },
  { value: ReportReason.FAKE_PRICE, label: "Prix faux / trompeur" },
  { value: ReportReason.DUPLICATE, label: "Doublon" },
  { value: ReportReason.EXPIRED, label: "Offre expirée" },
  { value: ReportReason.OFFENSIVE, label: "Contenu offensant" },
  { value: ReportReason.WRONG_CATEGORY, label: "Mauvaise catégorie" },
  { value: ReportReason.SPAM, label: "Spam" },
  { value: ReportReason.ILLEGAL, label: "Contenu illégal" },
  { value: ReportReason.OTHER, label: "Autre" },
];

/**
 * Dialog de signalement utilisateur → modération.
 *
 * Utilisable sur n'importe quelle cible via `kind` : "listing", "deal",
 * "comment" ou "user". Appelle createReportAction qui se charge du
 * rate-limit, de l'anti-doublon 24h et de l'incrémentation du
 * reportCount.
 *
 * Après un signalement réussi, on ferme le dialog et on affiche un
 * message de confirmation inline. Pas de toast lib externe ici —
 * sonner est disponible mais ça rajouterait une dépendance au parent.
 */
export function ReportDialog({
  kind,
  targetId,
  label = "Signaler",
  variant = "ghost",
  title,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>(ReportReason.SCAM);
  const [description, setDescription] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setSubmitError(null);
    startTransition(async () => {
      formData.set("kind", kind);
      formData.set("targetId", targetId);
      formData.set("reason", reason);
      formData.set("description", description);
      const result = await createReportAction(formData);
      if (result.ok) {
        setSubmitted(true);
        setDescription("");
        // Auto-close après 2s pour libérer l'UI.
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
        }, 2000);
      } else {
        setSubmitError(result.error);
      }
    });
  };

  const triggerClass =
    variant === "icon"
      ? "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-700"
      : variant === "text"
      ? "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-700"
      : "inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-red-300 hover:text-red-700";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          // Reset à la fermeture pour que la prochaine ouverture parte clean.
          setSubmitError(null);
          setSubmitted(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-label={label}
          title={label}
        >
          <Flag className={variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
          {variant !== "icon" && <span>{label}</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || "Signaler ce contenu"}</DialogTitle>
          <DialogDescription>
            Un modérateur examinera ton signalement. Les signalements abusifs
            répétés peuvent entraîner une sanction.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="rounded-md border border-peyi-green-300 bg-peyi-green-50 px-3 py-3 text-sm text-peyi-green-900">
            Merci — ton signalement a été transmis à la modération.
          </p>
        ) : (
          <form
            action={handleSubmit}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-reason" className="text-sm font-medium">
                Motif
              </label>
              <select
                id="report-reason"
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
                disabled={isPending}
              >
                {REASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="report-description" className="text-sm font-medium">
                Détails <span className="text-muted-foreground">(optionnel)</span>
              </label>
              <textarea
                id="report-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Décris ce qui pose problème (max 1000 caractères)…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500"
                disabled={isPending}
              />
              <p className="text-right text-xs text-muted-foreground">
                {description.length} / 1000
              </p>
            </div>

            {submitError && (
              <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
                {submitError}
              </p>
            )}

            <DialogFooter className="mt-1 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <SubmitButton
                pending={isPending}
                pendingLabel="Envoi…"
                className="bg-red-600 hover:bg-red-700"
              >
                Signaler
              </SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
