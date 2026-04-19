-- =============================================================================
-- Péyi — Logos d'enseigne (à coller dans le SQL editor Supabase)
-- =============================================================================
-- Remplit `stores.logoUrl` pour les enseignes dont on a le fichier
-- (hébergé dans `public/logos/stores/`). Les autres stores gardent
-- `logoUrl` NULL — le composant <StoreLogo> affiche alors un monogramme
-- coloré stable (hash du nom), donc l'UI reste propre sans fichier.
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
