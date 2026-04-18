-- Ajout des 5 magasins de la chaîne Pli Bel Price (partenaire Intermarché
-- Guyane) : Cayenne Collery, Cayenne Liberté, Rémire-Montjoly, Matoury
-- Balata, Kourou. Les slugs sont idempotents via ON CONFLICT.

INSERT INTO stores (id, name, slug, "cityId", "isVerified", "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.name, v.slug, c.id, true, NOW(), NOW()
  FROM (VALUES
    ('Pli Bel Price Collery', 'pli-bel-price-collery', 'cayenne'),
    ('Pli Bel Price Liberté', 'pli-bel-price-liberte', 'cayenne'),
    ('Pli Bel Price Rémire',  'pli-bel-price-remire',  'remire-montjoly'),
    ('Pli Bel Price Balata',  'pli-bel-price-balata',  'matoury'),
    ('Pli Bel Price Kourou',  'pli-bel-price-kourou',  'kourou')
  ) AS v(name, slug, city_slug)
  JOIN cities c ON c.slug = v.city_slug
ON CONFLICT (slug) DO NOTHING;
