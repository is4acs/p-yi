-- =============================================================================
-- Péyi — Photos démo pour les annonces Véhicules
-- =============================================================================
-- À coller après `supabase/seed-listings-vehicules.sql`.
-- Rattache 1-2 photos Unsplash (libres, usage commercial OK) à chaque
-- annonce véhicule de démo, en s'appuyant sur le titre exact comme clé.
--
-- Idempotent : les images existantes pour ces listings sont supprimées
-- avant d'être re-créées.
--
-- Si une URL donne 404, remplace juste l'ID qui suit `/photo-` par
-- n'importe quelle photo Unsplash (clic droit → copier l'URL de l'image).
-- =============================================================================

BEGIN;

-- Titres exacts des 10 annonces véhicules (doivent matcher ceux du
-- seed principal à la virgule près).
WITH target AS (
  SELECT id FROM listings WHERE title IN (
    'Toyota Hilux 2020 — 85 000 km, très bon état',
    'Peugeot 208 essence 2019 — idéale 1er achat',
    'Yamaha MT-07 2021 — 12 000 km',
    'Scooter Peugeot Kisbee 50 — idéal trajets ville',
    'Quad CF Moto 450L 2022 — utilitaire forestier',
    'Renault Master L2H2 2019 — fourgon pro',
    'Pirogue alu 7m + Yamaha 40 CV',
    'VTT électrique Rockrider E-ST 500 — très peu servi',
    'Vélo enfant 20 pouces — à donner',
    'Jantes Toyota Hilux 17" + pneus BF Goodrich'
  )
)
DELETE FROM listing_images WHERE "listingId" IN (SELECT id FROM target);

-- ----------------------------------------------------------------------------
-- Cover images : un UPDATE par annonce, matching sur le titre exact.
-- On stocke une taille généreuse (1600w) — next/image se chargera du
-- resize et du format moderne.
-- ----------------------------------------------------------------------------
UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Toyota Hilux 2020 — 85 000 km, très bon état';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Peugeot 208 essence 2019 — idéale 1er achat';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Yamaha MT-07 2021 — 12 000 km';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Scooter Peugeot Kisbee 50 — idéal trajets ville';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1621932953986-15fcfb73cea2?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Quad CF Moto 450L 2022 — utilitaire forestier';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1617867023814-0e4c57e1cf7f?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Renault Master L2H2 2019 — fourgon pro';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Pirogue alu 7m + Yamaha 40 CV';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'VTT électrique Rockrider E-ST 500 — très peu servi';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Vélo enfant 20 pouces — à donner';

UPDATE listings SET "coverImageUrl" = 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1600&auto=format&fit=crop&q=80'
  WHERE title = 'Jantes Toyota Hilux 17" + pneus BF Goodrich';

-- ----------------------------------------------------------------------------
-- Galerie : 1 à 2 entrées par annonce, la cover est répétée en sortOrder=0
-- pour que le lightbox plein écran ait bien une première image.
-- ----------------------------------------------------------------------------

-- Toyota Hilux — 2 photos
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Toyota Hilux 2020 — 85 000 km, très bon état';
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=1600&auto=format&fit=crop&q=80', 1
FROM listings WHERE title = 'Toyota Hilux 2020 — 85 000 km, très bon état';

-- Peugeot 208 — 1 photo
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Peugeot 208 essence 2019 — idéale 1er achat';

-- Yamaha MT-07 — 2 photos
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Yamaha MT-07 2021 — 12 000 km';
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1600&auto=format&fit=crop&q=80', 1
FROM listings WHERE title = 'Yamaha MT-07 2021 — 12 000 km';

-- Kisbee 50 — 1 photo
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1591378603223-e15b45a81640?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Scooter Peugeot Kisbee 50 — idéal trajets ville';

-- Quad CF Moto — 1 photo
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1621932953986-15fcfb73cea2?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Quad CF Moto 450L 2022 — utilitaire forestier';

-- Renault Master — 1 photo
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1617867023814-0e4c57e1cf7f?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Renault Master L2H2 2019 — fourgon pro';

-- Pirogue alu — 2 photos
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Pirogue alu 7m + Yamaha 40 CV';
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=1600&auto=format&fit=crop&q=80', 1
FROM listings WHERE title = 'Pirogue alu 7m + Yamaha 40 CV';

-- VTT électrique Rockrider — 2 photos
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'VTT électrique Rockrider E-ST 500 — très peu servi';
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1600&auto=format&fit=crop&q=80', 1
FROM listings WHERE title = 'VTT électrique Rockrider E-ST 500 — très peu servi';

-- Vélo enfant — 1 photo
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Vélo enfant 20 pouces — à donner';

-- Jantes Hilux — 1 photo
INSERT INTO listing_images (id, "listingId", url, "sortOrder")
SELECT gen_random_uuid(), id,
       'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1600&auto=format&fit=crop&q=80', 0
FROM listings WHERE title = 'Jantes Toyota Hilux 17" + pneus BF Goodrich';

COMMIT;

-- =============================================================================
-- Vérification :
--
--   SELECT l.title, l."coverImageUrl", COUNT(li.id) AS n_photos
--   FROM listings l
--   LEFT JOIN listing_images li ON li."listingId" = l.id
--   WHERE l.title LIKE '%Hilux%' OR l.title LIKE '%MT-07%' OR l.title LIKE '%208%'
--      OR l.title LIKE '%Kisbee%' OR l.title LIKE '%CF Moto%'
--      OR l.title LIKE '%Master%' OR l.title LIKE '%Pirogue%'
--      OR l.title LIKE '%Rockrider%' OR l.title LIKE '%enfant 20%'
--      OR l.title LIKE '%Jantes%'
--   GROUP BY l.id, l.title, l."coverImageUrl"
--   ORDER BY l.title;
-- =============================================================================
