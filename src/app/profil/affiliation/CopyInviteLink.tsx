"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Bouton "Copier mon lien" qui utilise l'API Clipboard. Fallback discret
 * en cas d'échec (navigateur sans permission) : on sélectionne le lien
 * dans l'input pour que l'utilisateur le copie manuellement.
 *
 * L'API `navigator.share` est aussi proposée sur mobile (format natif
 * de partage iOS / Android) — l'utilisateur peut envoyer le lien par
 * WhatsApp, SMS, Messenger, etc. en un tap.
 */
export function CopyInviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById("invite-link-input") as HTMLInputElement | null;
      input?.select();
    }
  }

  async function handleShare() {
    if (typeof navigator.share !== "function") return handleCopy();
    try {
      await navigator.share({
        title: "Rejoins-moi sur Péyi",
        text: "Les meilleurs bons plans et petites annonces de Guyane. Inscris-toi avec mon lien :",
        url,
      });
    } catch {
      // user cancelled — silent
    }
  }

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <input
          id="invite-link-input"
          readOnly
          value={url}
          onClick={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono tracking-tight"
          aria-label="Mon lien d'invitation"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0 gap-1.5"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copié
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copier
            </>
          )}
        </Button>
      </div>
      {canShare && (
        <Button
          type="button"
          size="sm"
          onClick={handleShare}
          className="w-full gap-1.5"
        >
          <Share2 className="h-4 w-4" aria-hidden />
          Partager mon lien
        </Button>
      )}
    </div>
  );
}
