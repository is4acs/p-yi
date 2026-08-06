"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

/**
 * LoadMoreFeed — feed continu pour `/bons-plans` et `/annonces` (V2).
 *
 * Remplace la pagination « Précédent / Suivant », qui obligeait à un
 * aller-retour serveur complet + un scroll-to-top à chaque page. Sur
 * mobile — l'écrasante majorité du trafic Péyi — ce pattern casse le
 * flux de découverte : on perd sa place, le hero et la barre de filtres
 * se re-rendent, et l'utilisateur doit re-scroller pour reprendre où il
 * était.
 *
 * Le pattern retenu est celui de Dealabs (« Voir plus » + chargement
 * automatique au scroll), pas l'infinite scroll pur de certains flux
 * sociaux :
 *
 *  - **Auto-load limité** (`autoLoadLimit`, 3 par défaut). Passé ce
 *    seuil, on exige un clic. L'infinite scroll illimité empêche
 *    d'atteindre le footer (liens SEO, mentions légales) et donne une
 *    sensation de piège. Trois auto-chargements = ~80 résultats, au-delà
 *    l'utilisateur cherche autre chose : mieux vaut qu'il affine.
 *  - **Le bouton existe toujours**, même pendant la phase auto. C'est
 *    le chemin accessible (clavier, lecteur d'écran, `prefers-reduced-
 *    motion`) et le filet si l'IntersectionObserver ne se déclenche pas
 *    (Safari iOS en `bfcache`, onglet en arrière-plan).
 *  - **Annonce `aria-live`** à chaque lot : sans ça un lecteur d'écran
 *    ne signale rien, le contenu apparaît en silence.
 *
 * Les items sont rendus **côté serveur** : `loadMore` est une server
 * action qui renvoie directement du JSX (les `<DealCard>` / `<Listing
 * CardTile>` sont des composants serveur). On évite ainsi de dupliquer
 * les cartes en version client et de sérialiser des `Decimal` Prisma —
 * Next renvoie un payload RSC que React insère tel quel.
 *
 * Remontage sur changement de filtre : la page passe une `key` dérivée
 * des filtres actifs, donc l'état interne (chunks chargés, compteur
 * d'auto-load) repart de zéro quand l'utilisateur change de tri ou de
 * catégorie. Sans ça, les résultats de l'ancien filtre resteraient
 * collés sous les nouveaux.
 */

export type FeedChunk = {
  /** Le JSX des nouveaux items (des `<li>`), rendu côté serveur. */
  nodes: React.ReactNode;
  hasMore: boolean;
  /** Page à demander au prochain appel. */
  nextPage: number;
  /** Message d'erreur métier (DB indisponible, etc.). */
  error?: string;
  /** Nombre d'items dans ce lot — sert à l'annonce a11y. */
  count: number;
};

type Props = {
  /** Les items de la première page, rendus par le serveur. */
  children: React.ReactNode;
  initialHasMore: boolean;
  /** Numéro de la page à charger au premier « Voir plus ». */
  initialNextPage: number;
  loadMore: (page: number) => Promise<FeedChunk>;
  /** Classes du `<ul>` — grille (annonces) ou colonne (deals). */
  listClassName?: string;
  /** Nom au pluriel pour l'annonce a11y : « bons plans », « annonces ». */
  itemLabel: string;
  /** Texte du bouton — fourni en entier car le français élide
   *  (« Voir plus **d'**annonces » vs « Voir plus **de** bons plans ») et
   *  ce genre d'accord ne se dérive pas proprement d'un nom seul. */
  moreLabel: string;
  /** Message de fin de liste, accordé lui aussi par l'appelant. */
  endLabel: string;
  /** Nombre de chargements automatiques avant de passer en manuel. */
  autoLoadLimit?: number;
  "aria-label"?: string;
};

export function LoadMoreFeed({
  children,
  initialHasMore,
  initialNextPage,
  loadMore,
  listClassName,
  itemLabel,
  moreLabel,
  endLabel,
  autoLoadLimit = 3,
  "aria-label": ariaLabel,
}: Props) {
  const [chunks, setChunks] = useState<React.ReactNode[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextPage, setNextPage] = useState(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoads, setAutoLoads] = useState(0);
  const [announcement, setAnnouncement] = useState("");

  // Verrou synchrone : `loading` (state) est mis à jour de façon
  // asynchrone, donc deux déclenchements rapprochés (observer + clic)
  // pourraient passer tous les deux le test et charger la même page
  // en double. Le ref, lui, est écrit immédiatement.
  const inFlight = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(
    async (viaObserver: boolean) => {
      if (inFlight.current || !hasMore) return;
      inFlight.current = true;
      setLoading(true);
      setError(null);

      try {
        const res = await loadMore(nextPage);
        if (res.error) {
          setError(res.error);
          return;
        }
        setChunks((prev) => [...prev, res.nodes]);
        setHasMore(res.hasMore);
        setNextPage(res.nextPage);
        if (viaObserver) setAutoLoads((n) => n + 1);
        // Formulation volontairement sans participe accordé
        // (« chargés »/« chargées ») : le composant sert des noms des
        // deux genres, on évite d'avoir à les accorder.
        setAnnouncement(
          res.count > 0
            ? `${res.count} ${itemLabel} en plus.`
            : "Fin des résultats.",
        );
      } catch {
        // Réseau coupé, action rejetée, timeout serveur… On garde le
        // bouton actif pour permettre un retry manuel.
        setError("Impossible de charger la suite. Réessaie.");
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [hasMore, loadMore, nextPage, itemLabel],
  );

  // Auto-load : on observe une sentinelle placée sous la liste, avec
  // 400px de marge pour que le lot suivant arrive avant que l'utilisateur
  // n'atteigne le bas (pas de "trou" perceptible pendant le fetch).
  const autoEnabled = hasMore && !error && autoLoads < autoLoadLimit;

  useEffect(() => {
    if (!autoEnabled) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void load(true);
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoEnabled, load]);

  return (
    <>
      <ul className={listClassName} aria-label={ariaLabel}>
        {children}
        {chunks.map((chunk, i) => (
          // Les chunks sont append-only et jamais réordonnés : l'index
          // est une clé stable ici.
          // eslint-disable-next-line react/no-array-index-key
          <FeedChunkGroup key={i}>{chunk}</FeedChunkGroup>
        ))}
      </ul>

      {/* Région live : annonce discrètement chaque lot chargé. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {(hasMore || error) && (
        <div className="mt-5 flex flex-col items-center gap-2">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void load(false)}
            disabled={loading}
            className={cn(
              "inline-flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground transition",
              "hover:border-peyi-orange-300 hover:text-peyi-orange-700",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-300 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {loading ? (
              <>
                <Spinner label="Chargement des résultats" />
                Chargement…
              </>
            ) : (
              moreLabel
            )}
          </button>
        </div>
      )}

      {!hasMore && !error && chunks.length > 0 && (
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {endLabel}
        </p>
      )}
    </>
  );
}

/**
 * Les server actions renvoient un fragment contenant plusieurs `<li>`.
 * On ne peut pas insérer un `<Fragment key>` porteur de DOM dans un
 * `<ul>` sans casser la sémantique liste (un `<div>` entre `<ul>` et
 * `<li>` invalide le HTML et perturbe les lecteurs d'écran). Ce
 * wrapper renvoie donc les enfants tels quels — il n'existe que pour
 * porter la `key` du chunk.
 */
function FeedChunkGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
