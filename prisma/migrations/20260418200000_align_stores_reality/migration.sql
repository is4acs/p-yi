-- Alignement de la table `stores` sur la réalité terrain Guyane
--
-- Contexte : prisma/seed.ts a été mis à jour dans le commit 6c0b664 pour
-- refléter les vrais magasins de Guyane (Carrefour Guyane officiel,
-- Magasins U Guyane, Leader Price Guyane, LSA, Pages Jaunes). Les
-- upserts de seed.ts se font sur `slug`, donc un re-run du seed créerait
-- juste les nouveaux slugs sans toucher aux anciens → il faut une
-- migration SQL explicite.
--
-- 5 renames (préserve les FK deals → stores) :
--   super-u-cayenne           → hyper-u-cayenne
--   cora-family-cayenne       → geant-cayenne          (rebranding Ho Hio Hen 2025)
--   carrefour-family-matoury  → carrefour-matoury      (Family Plaza Zone Terca)
--   carrefour-contact-remire  → carrefour-market-remire-montjoly
--   mr-bricolage-matoury      → mr-bricolage-cayenne   (magasin situé à Cayenne)
--
-- 6 suppressions (enseignes non implantées en Guyane) :
--   boulanger-matoury, carrefour-city-cayenne, geant-kourou,
--   geant-matoury, leader-price-saint-laurent, super-u-matoury
--
-- 3 ajouts (magasins existants manquants dans le seed initial) :
--   leader-price-cayenne, leader-price-kourou, weldom-cayenne

BEGIN;

-- 1) Renommage des slugs (les FK pointent par id, pas par slug, donc
--    les deals existants restent rattachés).
UPDATE stores
   SET slug = 'carrefour-matoury', name = 'Carrefour Matoury'
 WHERE slug = 'carrefour-family-matoury';

UPDATE stores
   SET slug = 'hyper-u-cayenne', name = 'Hyper U Cayenne'
 WHERE slug = 'super-u-cayenne';

UPDATE stores
   SET slug = 'geant-cayenne', name = 'Géant Cayenne'
 WHERE slug = 'cora-family-cayenne';

UPDATE stores
   SET slug = 'carrefour-market-remire-montjoly', name = 'Carrefour Market Rémire-Montjoly'
 WHERE slug = 'carrefour-contact-remire';

UPDATE stores
   SET slug = 'mr-bricolage-cayenne',
       name = 'Mr Bricolage Cayenne',
       "cityId" = (SELECT id FROM cities WHERE slug = 'cayenne')
 WHERE slug = 'mr-bricolage-matoury';

-- 2) Réassigner les deals orphelins des enseignes supprimées vers un
--    magasin plausible avant de drop. Pour Géant Matoury (inexistant,
--    l'anchor Family Plaza est Carrefour) : bascule sur carrefour-matoury.
UPDATE deals
   SET "storeId" = (SELECT id FROM stores WHERE slug = 'carrefour-matoury')
 WHERE "storeId" IN (
   SELECT id FROM stores WHERE slug IN (
     'geant-matoury',
     'super-u-matoury',
     'boulanger-matoury'
   )
 );

-- Pour les deals orphelins à Kourou / Saint-Laurent / Carrefour City :
-- on retire juste la liaison store (le citySlug + description suffisent).
UPDATE deals
   SET "storeId" = NULL
 WHERE "storeId" IN (
   SELECT id FROM stores WHERE slug IN (
     'geant-kourou',
     'leader-price-saint-laurent',
     'carrefour-city-cayenne'
   )
 );

-- 3) Supprimer les enseignes fantômes (plus aucun deal rattaché après
--    l'étape précédente).
DELETE FROM stores
 WHERE slug IN (
   'boulanger-matoury',
   'carrefour-city-cayenne',
   'geant-kourou',
   'geant-matoury',
   'leader-price-saint-laurent',
   'super-u-matoury'
 );

-- 4) Ajouter les magasins manquants (idempotent via ON CONFLICT).
INSERT INTO stores (id, name, slug, "cityId", "isVerified")
SELECT gen_random_uuid(), v.name, v.slug, c.id, true
  FROM (VALUES
    ('Leader Price Cayenne', 'leader-price-cayenne', 'cayenne'),
    ('Leader Price Kourou',  'leader-price-kourou',  'kourou'),
    ('Weldom Cayenne',       'weldom-cayenne',       'cayenne')
  ) AS v(name, slug, city_slug)
  JOIN cities c ON c.slug = v.city_slug
ON CONFLICT (slug) DO NOTHING;

COMMIT;
