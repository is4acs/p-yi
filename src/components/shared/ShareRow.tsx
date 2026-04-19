"use client";

import { useState } from "react";
import { Check, Copy, Link2, MessageCircle, Send, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * ShareRow — boutons de partage pour un deal / une annonce.
 *
 * Cibles prioritaires pour la Guyane (WhatsApp largement devant Facebook) :
 *   - WhatsApp : deep link `https://wa.me/?text=` avec pré-remplissage.
 *     Fonctionne sur mobile (ouvre l'app) et desktop (web.whatsapp.com).
 *   - Messenger : deep link `https://www.facebook.com/dialog/send`.
 *     Nécessite un app_id côté Facebook pour fonctionner partout sans
 *     friction, on fallback donc sur un simple `fb-messenger://share?link=…`
 *     côté mobile et un partage via l'API Web Share côté desktop.
 *   - Copier le lien : ClipBoard API, feedback visuel "Copié !" 2 secondes.
 *   - "Plus" : déclenche l'API Web Share native (mobile) quand disponible,
 *     sinon masqué. Ouvre la feuille d'actions iOS/Android habituelle.
 *
 * Pourquoi pas Twitter/X/LinkedIn/etc. : hors cœur de cible Guyane, on
 * évite le clutter. Réintégrables plus tard si la data Mixpanel montre
 * de la demande.
 *
 * Accessibility :
 *   - Chaque bouton a `aria-label` distinct
 *   - État "Copié !" annoncé via `role="status"` pour lecteur d'écran
 *   - Focus visible conservé via les styles tokens
 */

type Props = {
  /** URL absolue à partager — on ne fait pas le résolveur site-url ici, la
   *  page parent (server component) doit passer l'URL déjà construite. */
  url: string;
  /** Texte qui sera pré-rempli dans WhatsApp / Messenger / Web Share. */
  text: string;
  className?: string;
};

export function ShareRow({ url, text, className }: Props) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${text} ${url}`);

  const whatsappHref = `https://wa.me/?text=${encodedText}`;
  // Messenger : on utilise le scheme URL qui ouvre l'app Messenger sur
  // mobile et redirige vers facebook.com/sharer sur desktop. Fallback
  // acceptable sans app_id Facebook.
  const messengerHref = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback : ouvre un prompt avec la valeur pour que l'utilisateur
      // copie manuellement. Clipboard API peut échouer sur HTTP ou
      // dans un iframe cross-origin.
      window.prompt("Copie le lien :", url);
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: text, text, url });
      } catch {
        // User a fermé la feuille de partage — pas une erreur.
      }
    }
  }

  const canNativeShare =
    typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs",
        className,
      )}
    >
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager sur WhatsApp"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium hover:border-peyi-green-400 hover:bg-peyi-green-50 hover:text-peyi-green-800"
      >
        <MessageCircle className="h-3.5 w-3.5" aria-hidden />
        WhatsApp
      </a>

      <a
        href={messengerHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Partager via Messenger"
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium hover:border-sky-400 hover:bg-sky-50 hover:text-sky-800"
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        Messenger
      </a>

      <button
        type="button"
        onClick={copyLink}
        aria-label={copied ? "Lien copié" : "Copier le lien"}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium hover:border-peyi-orange-400 hover:bg-peyi-orange-50 hover:text-peyi-orange-800"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden />
            <span role="status">Copié !</span>
          </>
        ) : (
          <>
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Copier
          </>
        )}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          aria-label="Plus d'options de partage"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 font-medium hover:border-peyi-orange-400"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          Plus
        </button>
      )}
    </div>
  );
}

// re-export pour permettre un dummy import qui force le "use client"
// à être chargé — utile pour Suspense boundaries.
export { Copy };
