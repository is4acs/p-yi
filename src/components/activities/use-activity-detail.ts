"use client";

import { useEffect, useRef, useState } from "react";

import type { ActivityDetailPayload } from "@/lib/activities/types";

/**
 * Chargement à la demande du détail d'une activité (au clic sur un
 * marqueur/card) avec cache mémoire par slug : re-sélectionner un point
 * déjà visité est instantané et n'émet aucune requête — précieux en 3G.
 */

export type ActivityDetailState =
  | { slug: string; status: "loading" }
  | { slug: string; status: "error" }
  | { slug: string; status: "ready"; detail: ActivityDetailPayload };

export function useActivityDetail(
  slug: string | null,
): ActivityDetailState | null {
  const [state, setState] = useState<ActivityDetailState | null>(null);
  const cacheRef = useRef(new Map<string, ActivityDetailPayload>());

  useEffect(() => {
    if (!slug) {
      setState(null);
      return;
    }

    const cached = cacheRef.current.get(slug);
    if (cached) {
      setState({ slug, status: "ready", detail: cached });
      return;
    }

    let cancelled = false;
    setState({ slug, status: "loading" });

    fetch(`/api/activites/${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`detail HTTP ${response.status}`);
        const detail = (await response.json()) as ActivityDetailPayload;
        cacheRef.current.set(slug, detail);
        if (!cancelled) setState({ slug, status: "ready", detail });
      })
      .catch(() => {
        if (!cancelled) setState({ slug, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
