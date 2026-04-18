-- Ajout du magasin Mobilia Cayenne (ameublement Guyane).
-- "Le meuble, c'est notre métier !"

INSERT INTO stores (id, name, slug, "cityId", "isVerified", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Mobilia Cayenne', 'mobilia-cayenne', c.id, true, NOW(), NOW()
  FROM cities c
 WHERE c.slug = 'cayenne'
ON CONFLICT (slug) DO NOTHING;
