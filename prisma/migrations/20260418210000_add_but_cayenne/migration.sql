-- Ajout du magasin BUT Cayenne (ameublement & maison, zone commerciale
-- Cayenne). Absent du seed initial, ajouté maintenant pour pouvoir
-- ancrer les promos catalogue BUT Guyane.

INSERT INTO stores (id, name, slug, "cityId", "isVerified", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'BUT Cayenne', 'but-cayenne', c.id, true, NOW(), NOW()
  FROM cities c
 WHERE c.slug = 'cayenne'
ON CONFLICT (slug) DO NOTHING;
