-- =============================================================================
-- Péyi — Logos d'enseigne (à coller dans le SQL editor Supabase)
-- =============================================================================
-- Remplit `stores.logoUrl` pour les enseignes dont on a le fichier
-- (hébergé dans `public/logos/stores/`). Le composant <DealCover>
-- utilise ensuite ce logo comme photo de couverture d'un deal quand
-- aucune cover n'a été uploadée par l'auteur — ça remplace le gradient
-- + emoji générique par quelque chose de bien plus parlant.
--
-- Les stores sans logo (la majorité pour l'instant) gardent `logoUrl`
-- NULL et continuent à afficher le placeholder historique.
--
-- Convention : `/logos/stores/<slug>.<ext>` — self-hosted depuis
-- `public/`, pas de whitelist `next.config` à bouger.
--
-- Idempotent : simple UPDATE par slug, rejouable à volonté.
-- =============================================================================

BEGIN;

-- Pli Bel Price — 5 magasins (chaîne Intermarché Guyane), même logo
UPDATE stores SET "logoUrl" = '/logos/stores/pli-bel-price.png'
WHERE slug IN (
  'pli-bel-price-kourou',
  'pli-bel-price-collery',
  'pli-bel-price-liberte',
  'pli-bel-price-remire',
  'pli-bel-price-balata'
);

-- Mobilia Cayenne — 1 magasin
UPDATE stores SET "logoUrl" = '/logos/stores/mobilia-cayenne.webp'
WHERE slug = 'mobilia-cayenne';

COMMIT;

-- =============================================================================
-- Vérification :
--
--   SELECT slug, name, "logoUrl" FROM stores
--   WHERE "logoUrl" IS NOT NULL
--   ORDER BY slug;
-- =============================================================================
