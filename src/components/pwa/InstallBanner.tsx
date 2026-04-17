"use client";

import { useEffect, useState } from "react";
import { Share, Smartphone, X } from "lucide-react";

/**
 * Custom "install app" banner.
 *
 * Two platforms to handle :
 *   1. Chrome / Edge / Samsung / any Chromium-based Android : the browser
 *      fires `beforeinstallprompt`. We capture the event, show our banner,
 *      and call `prompt()` when the user taps "Installer".
 *   2. iOS Safari : there is NO programmatic install. We detect iOS + Safari
 *      and show a banner that walks the user through Share → "Sur l'écran
 *      d'accueil".
 *
 * A dismissal is remembered for 7 days via localStorage so we don't nag.
 * Already-installed users (detected via `display-mode: standalone`) never
 * see the banner.
 */

const DISMISSED_KEY = "peyi:install-banner:dismissed-at";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Chromium's beforeinstallprompt is not in lib.dom.d.ts.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Variant = "native" | "ios";

export function InstallBanner() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed ? Skip.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS sets navigator.standalone on the home-screen Safari instance.
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (isStandalone) return;

    // Recently dismissed ? Skip.
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_WINDOW_MS) return;

    // Chromium path.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVariant("native");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // iOS Safari path. Do NOT show in in-app browsers (FB, Instagram) —
    // those can't install to home screen anyway.
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|WhatsApp/.test(ua);
    if (isIOS && isSafari && !isInAppBrowser) {
      setVariant("ios");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVariant(null);
    setPromptEvent(null);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // Regardless of outcome, tuck it away — if accepted we won't show again
    // once installed; if dismissed we honour the cooldown.
    dismiss();
    // `outcome` is available for future analytics.
    void outcome;
  }

  if (!variant) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-banner-title"
      className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-height,64px)+12px)] z-40 mx-auto max-w-md rounded-xl border border-peyi-orange-200 bg-white p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-[22rem]"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-peyi-orange-400 to-peyi-orange-600 text-white">
          <Smartphone className="h-5 w-5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1 pr-5">
          <p
            id="install-banner-title"
            className="font-display text-sm font-bold"
          >
            Installe Péyi sur ton téléphone
          </p>

          {variant === "native" ? (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Accès en un tap depuis ton écran d&apos;accueil.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-peyi-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-peyi-orange-600 active:scale-95"
                >
                  Installer
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="inline-flex h-8 items-center rounded-md px-3 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Plus tard
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Appuie sur{" "}
                <Share
                  className="inline h-3.5 w-3.5 align-text-bottom"
                  aria-hidden
                />{" "}
                <span className="font-medium text-foreground">Partager</span>{" "}
                puis <span className="font-medium text-foreground">
                  Sur l&apos;écran d&apos;accueil
                </span>
                .
              </p>
              <button
                type="button"
                onClick={dismiss}
                className="mt-3 inline-flex h-8 items-center rounded-md bg-muted px-3 text-xs font-medium text-foreground transition hover:bg-muted/70"
              >
                OK, compris
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
