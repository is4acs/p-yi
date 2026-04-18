-- Ajout du magasin Conforama Cayenne (ameublement & électroménager,
-- zone commerciale Cayenne). Absent du seed initial.

INSERT INTO stores (id, name, slug, "cityId", "isVerified", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Conforama Cayenne', 'conforama-cayenne', c.id, true, NOW(), NOW()
  FROM cities c
 WHERE c.slug = 'cayenne'
ON CONFLICT (slug) DO NOTHING;
