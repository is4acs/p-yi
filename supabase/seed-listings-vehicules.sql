-- =============================================================================
-- Péyi — Seed annonces Véhicules (à coller dans le SQL editor Supabase)
-- =============================================================================
-- Couvre les 7 feuilles de la branche "vehicules" :
--   voitures · motos-scooters · quads-buggy · utilitaires-4x4
--   pirogues-bateaux · velos · pieces-accessoires-vehicules
--
-- Idempotent :
--   - les 12 demo users sont upsertés sur `username`
--   - les annonces de démo déjà insérées (auteur ∈ demo users
--     ET catégorie ∈ feuilles véhicules) sont supprimées avant
--     d'être re-créées. Les annonces réelles ne sont jamais touchées.
--
-- Prérequis : le seed de référence (`prisma/seed.ts`) doit avoir tourné
-- une fois pour peupler `cities` et `categories`.
-- =============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Upsert des 12 personas démo (username unique → ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, email, username, "fullName", "phoneVerified", "cityId", karma, level, "updatedAt")
VALUES
  (gen_random_uuid(), 'marie973@peyi.dev',      'marie973',       'Marie L.',    TRUE, (SELECT id FROM cities WHERE slug = 'cayenne'),                  1240, 'HUNTER',     NOW()),
  (gen_random_uuid(), 'jeanpaul_kw@peyi.dev',   'jeanpaul_kw',    'Jean-Paul M.',TRUE, (SELECT id FROM cities WHERE slug = 'kourou'),                   520,  'EXPERT',     NOW()),
  (gen_random_uuid(), 'sophie.mat@peyi.dev',    'sophie.mat',     'Sophie R.',   TRUE, (SELECT id FROM cities WHERE slug = 'matoury'),                  87,   'CURIOUS',    NOW()),
  (gen_random_uuid(), 'kevin_slm@peyi.dev',     'kevin_slm',      'Kevin T.',    TRUE, (SELECT id FROM cities WHERE slug = 'saint-laurent-du-maroni'),  2180, 'LEGEND',     NOW()),
  (gen_random_uuid(), 'clara_remire@peyi.dev',  'clara_remire',   'Clara D.',    TRUE, (SELECT id FROM cities WHERE slug = 'remire-montjoly'),          340,  'HUNTER',     NOW()),
  (gen_random_uuid(), 'david973@peyi.dev',      'david973',       'David P.',    TRUE, (SELECT id FROM cities WHERE slug = 'cayenne'),                  45,   'BEGINNER',   NOW()),
  (gen_random_uuid(), 'nadia_kourou@peyi.dev',  'nadia_kourou',   'Nadia B.',    TRUE, (SELECT id FROM cities WHERE slug = 'kourou'),                   780,  'EXPERT',     NOW()),
  (gen_random_uuid(), 'chris_cay@peyi.dev',     'chris_cay',      'Chris A.',    TRUE, (SELECT id FROM cities WHERE slug = 'cayenne'),                  3250, 'LEGEND',     NOW()),
  (gen_random_uuid(), 'lydie.matoury@peyi.dev', 'lydie.matoury',  'Lydie F.',    TRUE, (SELECT id FROM cities WHERE slug = 'matoury'),                  140,  'CURIOUS',    NOW()),
  (gen_random_uuid(), 'yann_973@peyi.dev',      'yann_973',       'Yann V.',     TRUE, (SELECT id FROM cities WHERE slug = 'remire-montjoly'),          960,  'EXPERT',     NOW()),
  (gen_random_uuid(), 'mama_cayenne@peyi.dev',  'mama_cayenne',   'Marthe S.',   TRUE, (SELECT id FROM cities WHERE slug = 'cayenne'),                  1820, 'LEGEND',     NOW()),
  (gen_random_uuid(), 'kwdeals_gf@peyi.dev',    'kwdeals_gf',     'Rudy G.',     TRUE, (SELECT id FROM cities WHERE slug = 'kourou'),                   5420, 'AMBASSADOR', NOW())
ON CONFLICT (username) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2) Purge des annonces de démo déjà posées dans ces catégories.
--    Les ListingImage sont supprimées en cascade via la FK.
-- ----------------------------------------------------------------------------
DELETE FROM listings
WHERE "authorId" IN (
        SELECT id FROM users
        WHERE username IN (
          'marie973','jeanpaul_kw','sophie.mat','kevin_slm','clara_remire',
          'david973','nadia_kourou','chris_cay','lydie.matoury','yann_973',
          'mama_cayenne','kwdeals_gf'
        )
      )
  AND "categoryId" IN (
        SELECT id FROM categories
        WHERE slug IN (
          'voitures','motos-scooters','quads-buggy','utilitaires-4x4',
          'pirogues-bateaux','velos','pieces-accessoires-vehicules'
        )
      );

-- ----------------------------------------------------------------------------
-- 3) Insertion des annonces véhicules
-- ----------------------------------------------------------------------------

-- --- Voitures ---------------------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition, neighborhood,
  attributes, "attrYear", "attrMileageKm", "attrBrand", "attrFuel",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'marie973'),
  (SELECT id FROM categories WHERE slug = 'voitures'),
  (SELECT id FROM cities WHERE slug = 'cayenne'),
  'Toyota Hilux 2020 — 85 000 km, très bon état',
  'toyota-hilux-2020-85000-km-' || substr(md5(random()::text), 1, 6),
  'Pick-up double cabine entretenu chez Toyota Cayenne, carnet à jour. 4 pneus récents, attelage, galerie de toit. CT OK. Visible après 17h sur Cayenne.',
  32500, 'NEGOTIABLE', 'OFFER', 'VERY_GOOD', 'Cayenne centre',
  '{"marque":"Toyota","modele":"Hilux Double Cabine","annee":2020,"kilometrage":85000,"carburant":"diesel","boite":"manuelle","puissance":150,"portes":"4","places":5,"couleur":"Gris métal","ct_valide":true}'::jsonb,
  2020, 85000, 'Toyota', 'diesel',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition, neighborhood,
  attributes, "attrYear", "attrMileageKm", "attrBrand", "attrFuel",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'clara_remire'),
  (SELECT id FROM categories WHERE slug = 'voitures'),
  (SELECT id FROM cities WHERE slug = 'remire-montjoly'),
  'Peugeot 208 essence 2019 — idéale 1er achat',
  'peugeot-208-essence-2019-' || substr(md5(random()::text), 1, 6),
  'Citadine parfaite pour Cayenne/Rémire. Climatisation OK, Bluetooth, 4 pneus bon état. Entretien à jour, clés de rechange. Pas d''accident.',
  11900, 'FIXED', 'OFFER', 'GOOD', 'Montjoly',
  '{"marque":"Peugeot","modele":"208","annee":2019,"kilometrage":62000,"carburant":"essence","boite":"manuelle","puissance":82,"portes":"5","places":5,"couleur":"Blanc","ct_valide":true}'::jsonb,
  2019, 62000, 'Peugeot', 'essence',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

-- --- Motos & Scooters -------------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrYear", "attrMileageKm", "attrBrand",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'yann_973'),
  (SELECT id FROM categories WHERE slug = 'motos-scooters'),
  (SELECT id FROM cities WHERE slug = 'remire-montjoly'),
  'Yamaha MT-07 2021 — 12 000 km',
  'yamaha-mt-07-2021-' || substr(md5(random()::text), 1, 6),
  'Moto en parfait état, pneus Michelin récents. Échappement d''origine + Akrapovic fourni. Gravage SRA. Première main.',
  6500, 'NEGOTIABLE', 'OFFER', 'LIKE_NEW',
  '{"marque":"Yamaha","modele":"MT-07","annee":2021,"kilometrage":12000,"cylindree":689,"permis":"A2","ct_valide":true}'::jsonb,
  2021, 12000, 'Yamaha',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrYear", "attrMileageKm", "attrBrand",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'david973'),
  (SELECT id FROM categories WHERE slug = 'motos-scooters'),
  (SELECT id FROM cities WHERE slug = 'cayenne'),
  'Scooter Peugeot Kisbee 50 — idéal trajets ville',
  'scooter-peugeot-kisbee-50-' || substr(md5(random()::text), 1, 6),
  'Scooter 50cc carburation neuve, démarre au quart de tour. Top-case 30L inclus. Parfait pour livreurs / étudiants.',
  1100, 'NEGOTIABLE', 'OFFER', 'GOOD',
  '{"marque":"Peugeot","modele":"Kisbee 50","annee":2018,"kilometrage":9400,"cylindree":50,"permis":"AM"}'::jsonb,
  2018, 9400, 'Peugeot',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

-- --- Quads & Buggy ----------------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrYear", "attrMileageKm", "attrBrand",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'jeanpaul_kw'),
  (SELECT id FROM categories WHERE slug = 'quads-buggy'),
  (SELECT id FROM cities WHERE slug = 'kourou'),
  'Quad CF Moto 450L 2022 — utilitaire forestier',
  'quad-cf-moto-450l-2022-' || substr(md5(random()::text), 1, 6),
  'Utilisé en piste Kourou-Sinnamary, treuil Warn 3500, pneus boue neufs. Carte grise quad routier.',
  6800, 'FIXED', 'OFFER', 'VERY_GOOD',
  '{"marque":"CF Moto","modele":"CForce 450L","annee":2022,"kilometrage":3200,"cylindree":400,"permis":"A","ct_valide":true}'::jsonb,
  2022, 3200, 'CF Moto',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

-- --- Utilitaires & 4×4 ------------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrYear", "attrMileageKm", "attrBrand", "attrFuel",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'kwdeals_gf'),
  (SELECT id FROM categories WHERE slug = 'utilitaires-4x4'),
  (SELECT id FROM cities WHERE slug = 'kourou'),
  'Renault Master L2H2 2019 — fourgon pro',
  'renault-master-l2h2-2019-' || substr(md5(random()::text), 1, 6),
  'Fourgon aménagé bois au sol et cloisons. Clim, caméra de recul, 3 places. Suivi concession. Prêt pour artisan BTP.',
  18900, 'NEGOTIABLE', 'OFFER', 'GOOD',
  '{"marque":"Renault","modele":"Master L2H2","annee":2019,"kilometrage":135000,"carburant":"diesel","boite":"manuelle","charge_utile":1200,"places":3,"volume_coffre":10}'::jsonb,
  2019, 135000, 'Renault', 'diesel',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

-- --- Pirogues & Bateaux -----------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrYear",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'kwdeals_gf'),
  (SELECT id FROM categories WHERE slug = 'pirogues-bateaux'),
  (SELECT id FROM cities WHERE slug = 'saint-laurent-du-maroni'),
  'Pirogue alu 7m + Yamaha 40 CV',
  'pirogue-alu-7m-yamaha-40cv-' || substr(md5(random()::text), 1, 6),
  'Pirogue alu 7m, coque saine. Moteur Yamaha 40 CV 2 temps, démarrage électrique, 420 h. Remorque simple essieu incluse. Idéale Maroni.',
  8500, 'NEGOTIABLE', 'OFFER', 'GOOD',
  '{"type_embarcation":"Pirogue alu","longueur":7,"annee":2015,"moteur":"Yamaha 40 CV 2T","heures_moteur":420,"remorque_incluse":true}'::jsonb,
  2015,
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

-- --- Vélos ------------------------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrYear", "attrBrand",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'yann_973'),
  (SELECT id FROM categories WHERE slug = 'velos'),
  (SELECT id FROM cities WHERE slug = 'remire-montjoly'),
  'VTT électrique Rockrider E-ST 500 — très peu servi',
  'vtt-electrique-rockrider-est500-' || substr(md5(random()::text), 1, 6),
  'VAE semi-rigide, batterie 418 Wh, autonomie 70 km. Compteur d''origine. Révision Decathlon faite. Taille M cadre alu.',
  950, 'FIXED', 'OFFER', 'LIKE_NEW',
  '{"type_velo":"vae","marque":"Rockrider","taille_cadre":"M","annee":2023}'::jsonb,
  2023, 'Rockrider',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes, "attrBrand",
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'nadia_kourou'),
  (SELECT id FROM categories WHERE slug = 'velos'),
  (SELECT id FROM cities WHERE slug = 'kourou'),
  'Vélo enfant 20 pouces — à donner',
  'velo-enfant-20-pouces-donner-' || substr(md5(random()::text), 1, 6),
  'Vélo 20" pour enfant 7-10 ans. Fonctionnel, à rafraîchir (selle + poignées). À récupérer sur place.',
  NULL, 'FREE', 'DONATION', 'ACCEPTABLE',
  '{"type_velo":"enfant","marque":"Btwin"}'::jsonb,
  'Btwin',
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

-- --- Pièces & Accessoires ---------------------------------------------------
INSERT INTO listings (
  id, "authorId", "categoryId", "cityId",
  title, slug, description,
  price, "priceType", type, condition,
  attributes,
  "showPhone", "allowMessages", status,
  "publishedAt", "expiresAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'marie973'),
  (SELECT id FROM categories WHERE slug = 'pieces-accessoires-vehicules'),
  (SELECT id FROM cities WHERE slug = 'cayenne'),
  'Jantes Toyota Hilux 17" + pneus BF Goodrich',
  'jantes-hilux-17-bf-goodrich-' || substr(md5(random()::text), 1, 6),
  '4 jantes alu d''origine Hilux 2020 avec pneus AT BF Goodrich 265/65 R17 — 60 % de gomme restante. Prêt à monter.',
  650, 'NEGOTIABLE', 'OFFER', 'VERY_GOOD',
  '{"type_piece":"roues_pneus","etat_piece":"occasion","marque_vehicule":"Toyota","modele_vehicule":"Hilux"}'::jsonb,
  FALSE, TRUE, 'PUBLISHED',
  NOW(), NOW() + INTERVAL '30 days', NOW()
);

COMMIT;

-- =============================================================================
-- Vérification (à lancer à part, hors transaction) :
--
--   SELECT c.slug, COUNT(*) AS n
--   FROM listings l
--   JOIN categories c ON c.id = l."categoryId"
--   WHERE c.slug IN (
--     'voitures','motos-scooters','quads-buggy','utilitaires-4x4',
--     'pirogues-bateaux','velos','pieces-accessoires-vehicules'
--   )
--   GROUP BY c.slug ORDER BY c.slug;
-- =============================================================================
