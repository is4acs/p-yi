-- Alignement de la table `stores` sur la réalité terrain Guyane
--
-- Contexte : prisma/seed.ts a été mis à jour dans le commit 6c0b664 pour
-- refléter les vrais magasins de Guyane. Les upserts Prisma se font par
-- slug, donc un re-run de seed ne peut pas corriger les slugs historiques
-- tout seul — d'où cette migration explicite.
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
   SET slug = 'carrefour-matoury', name = 'Carrefour Matoury', "updatedAt" = NOW()
 WHERE slug = 'carrefour-family-matoury';

UPDATE stores
   SET slug = 'hyper-u-cayenne', name = 'Hyper U Cayenne', "updatedAt" = NOW()
 WHERE slug = 'super-u-cayenne';

UPDATE stores
   SET slug = 'geant-cayenne', name = 'Géant Cayenne', "updatedAt" = NOW()
 WHERE slug = 'cora-family-cayenne';

UPDATE stores
   SET slug = 'carrefour-market-remire-montjoly', name = 'Carrefour Market Rémire-Montjoly', "updatedAt" = NOW()
 WHERE slug = 'carrefour-contact-remire';

UPDATE stores
   SET slug = 'mr-bricolage-cayenne',
       name = 'Mr Bricolage Cayenne',
       "cityId" = (SELECT id FROM cities WHERE slug = 'cayenne'),
       "updatedAt" = NOW()
 WHERE slug = 'mr-bricolage-matoury';

-- 2) Réassigner les deals orphelins des enseignes supprimées. Géant
--    Matoury (inexistant, l'anchor Family Plaza est Carrefour) : bascule
--    sur carrefour-matoury. Les autres orphelins : storeId NULL.
UPDATE deals
   SET "storeId" = (SELECT id FROM stores WHERE slug = 'carrefour-matoury'),
       "updatedAt" = NOW()
 WHERE "storeId" IN (
   SELECT id FROM stores WHERE slug IN (
     'geant-matoury', 'super-u-matoury', 'boulanger-matoury'
   )
 );

UPDATE deals
   SET "storeId" = NULL, "updatedAt" = NOW()
 WHERE "storeId" IN (
   SELECT id FROM stores WHERE slug IN (
     'geant-kourou', 'leader-price-saint-laurent', 'carrefour-city-cayenne'
   )
 );

-- 3) Supprimer les enseignes fantômes.
DELETE FROM stores
 WHERE slug IN (
   'boulanger-matoury', 'carrefour-city-cayenne', 'geant-kourou',
   'geant-matoury', 'leader-price-saint-laurent', 'super-u-matoury'
 );

-- 4) Ajouter les magasins manquants (idempotent via ON CONFLICT).
INSERT INTO stores (id, name, slug, "cityId", "isVerified", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.name, v.slug, c.id, true, NOW(), NOW()
  FROM (VALUES
    ('Leader Price Cayenne', 'leader-price-cayenne', 'cayenne'),
    ('Leader Price Kourou',  'leader-price-kourou',  'kourou'),
    ('Weldom Cayenne',       'weldom-cayenne',       'cayenne')
  ) AS v(name, slug, city_slug)
  JOIN cities c ON c.slug = v.city_slug
ON CONFLICT (slug) DO NOTHING;

COMMIT;
