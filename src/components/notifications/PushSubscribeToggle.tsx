"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * PushSubscribeToggle — bouton "Activer/Désactiver" les notifications
 * push pour le device courant. Rendu uniquement si le navigateur
 * supporte Notification + Push + Service Worker.
 *
 * Flow d'activation (happy path) :
 *  1. Click → on demande Notification.requestPermission()
 *  2. Si accordé → on récupère la clé VAPID publique depuis /api/
 *     notifications/vapid-key
 *  3. On subscribe via pushManager.subscribe()
 *  4. On POST l'abonnement sur /api/notifications/subscribe
 *  5. On met à jour l'UI en mode "activé"
 *
 * Flow de désactivation :
 *  1. Click → on récupère l'abonnement courant via pushManager
 *  2. On POST /api/notifications/unsubscribe avec l'endpoint
 *  3. On unsubscribe() côté navigateur
 *  4. UI revient en mode "désactivé"
 *
 * Cas limites :
 *  - Permission refusée : on affiche un message demandant à débloquer
 *    dans les paramètres navigateur (pas de recovery automatique possible)
 *  - iOS < 16.4 : Notification / Push absent → le composant ne se rend pas
 *  - Push non configuré côté serveur (VAPID absent) : idem, on cache.
 */

type State = "loading" | "unavailable" | "blocked" | "off" | "on" | "working";

// Retour typé ArrayBuffer (et pas Uint8Array) pour satisfaire la
// signature de `applicationServerKey` qui demande un BufferSource
// backé par un vrai ArrayBuffer, pas un SharedArrayBuffer.
function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) view[i] = raw.charCodeAt(i);
  return buffer;
}

async function fetchVapidKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/notifications/vapid-key", { cache: "no-store" });
    if (!res.ok) return null;
    const { publicKey } = (await res.json()) as { publicKey?: string };
    return publicKey ?? null;
  } catch {
    return null;
  }
}

export function PushSubscribeToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setState("unavailable");
        return;
      }

      const vapid = await fetchVapidKey();
      if (!vapid) {
        if (!cancelled) setState("unavailable");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (!cancelled) setState(existing ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const vapid = await fetchVapidKey();
      if (!vapid) throw new Error("Clé VAPID indisponible côté serveur.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapid),
      });
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("Enregistrement serveur échoué.");
      setState("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => null);
        await sub.unsubscribe().catch(() => null);
      }
      setState("off");
    } catch {
      setError("Désactivation échouée.");
      setState("on");
    }
  }

  if (state === "loading") {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Chargement…
      </div>
    );
  }
  if (state === "unavailable") {
    return null; // Rien à offrir si l'OS ou le serveur ne supporte pas.
  }
  if (state === "blocked") {
    return (
      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Les notifications sont bloquées pour ce navigateur. Débloque-les
        dans les paramètres du site pour recevoir les alertes Péyi.
      </p>
    );
  }

  const isOn = state === "on";
  const isWorking = state === "working";

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={isOn ? disable : enable}
        disabled={isWorking}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition",
          isOn
            ? "border-peyi-green-300 bg-peyi-green-50 text-peyi-green-900 hover:border-peyi-green-400"
            : "border-border bg-card text-foreground hover:border-peyi-orange-300",
          isWorking && "opacity-60",
        )}
      >
        {isWorking ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : isOn ? (
          <Bell className="h-4 w-4" aria-hidden />
        ) : (
          <BellOff className="h-4 w-4" aria-hidden />
        )}
        {isOn
          ? "Notifications push activées"
          : "Activer les notifications push"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
      {isOn && (
        <p className="text-xs text-muted-foreground">
          Tu recevras une notif pour les messages privés, les matchs
          d&apos;alertes et les étapes d&apos;affiliation. Tu peux
          désactiver à tout moment.
        </p>
      )}
    </div>
  );
}
