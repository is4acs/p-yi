-- =============================================================================
-- PÉYI — Contenu de démarrage pour la bêta (bons plans + petites annonces)
-- =============================================================================
-- À coller dans Supabase → SQL Editor → New query → Run.
--
-- CE QUE C'EST : du contenu éditorial de démarrage, entièrement attribué à
-- UN SEUL compte clairement identifié — @peyi_demo, « Contenu de
-- démonstration ». Aucun faux pseudo, aucun faux compteur : les vues, les
-- votes et les températures partent tous à zéro, ce sont les bêta-testeurs
-- qui les feront monter. Un testeur qui clique sur l'auteur voit
-- immédiatement qu'il s'agit de contenu de démonstration.
--
-- CE COMPTE NE PEUT PAS SE CONNECTER : il existe dans la table `users` mais
-- pas dans `auth.users` de Supabase. C'est voulu — personne ne peut s'en
-- servir, et les fiches restent non modifiables depuis le site.
--
-- POUR TOUT RETIRER APRÈS LA BÊTA (une seule commande, cascade incluse) :
--   DELETE FROM users WHERE username = 'peyi_demo';
--
-- Idempotent : rejouable sans créer de doublons (upsert par slug).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Compte éditorial de démonstration
-- -----------------------------------------------------------------------------
INSERT INTO "users" (
  "id", "email", "username", "fullName", "bio", "role", "level", "karma",
  "createdAt", "updatedAt", "lastActiveAt"
)
VALUES (
  '00000000-0000-4000-8000-0000000000de',
  'demo@peyi.gf',
  'peyi_demo',
  'Péyi — contenu de démonstration',
  'Compte éditorial : ces publications servent à faire découvrir Péyi pendant la bêta. Elles seront retirées à l''ouverture publique.',
  'USER', 'BEGINNER', 0,
  NOW(), NOW(), NOW()
)
ON CONFLICT ("username") DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Bons plans (12) — prix réels du marché guyanais, enseignes existantes
-- -----------------------------------------------------------------------------
INSERT INTO "deals" (
  "id", "authorId", "title", "slug", "description",
  "price", "originalPrice", "discountPercent", "currency",
  "categoryId", "cityId", "storeId",
  "expiresAt", "status", "publishedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  author."id",
  d.title, d.slug, d.description,
  d.price, d.original,
  CASE WHEN d.original IS NOT NULL AND d.original > 0
       THEN ROUND((1 - d.price / d.original) * 100)::int END,
  'EUR',
  c."id", ci."id", s."id",
  NOW() + (d.expires_days || ' days')::interval,
  'PUBLISHED',
  NOW() - (d.age_days || ' days')::interval,
  NOW() - (d.age_days || ' days')::interval,
  NOW()
FROM (VALUES
  ('Riz Uncle Ben''s 5 kg à 8,90 € au lieu de 13,50 €',
   'riz-uncle-bens-5kg-hyper-u-cayenne',
   E'Opération sur le riz longue conservation au rayon épicerie. Le format 5 kg est à 8,90 € contre 13,50 € habituellement.\n\nStock limité, c''est en tête de gondole à l''entrée du rayon. Pense à vérifier la date de péremption sur les derniers sacs.',
   8.90, 13.50, 'supermarche-alimentation', 'cayenne', 'hyper-u-cayenne', 0, 12),

  ('Pack 24 bouteilles d''eau Chanflor à 6,50 €',
   'pack-eau-chanflor-24-carrefour-matoury',
   E'Le pack de 24 × 50 cl passe à 6,50 € cette semaine, contre 8,20 € en prix courant.\n\nC''est le prix le plus bas que j''ai vu depuis le début de l''année sur cette référence. Limité à 3 packs par client.',
   6.50, 8.20, 'supermarche-alimentation', 'matoury', 'carrefour-matoury', 1, 9),

  ('Ventilateur colonne Rowenta 45 € au lieu de 79 €',
   'ventilateur-colonne-rowenta-but-cayenne',
   E'Déstockage fin de série sur les ventilateurs colonne. Le modèle Rowenta silencieux (3 vitesses, oscillation, minuteur) est à 45 €.\n\nIl en restait une dizaine en rayon. Utile avant la saison sèche.',
   45.00, 79.00, 'maison-electromenager', 'cayenne', 'but-cayenne', 2, 21),

  ('Vol Cayenne–Paris à 489 € A/R en septembre',
   'vol-cayenne-paris-489-septembre',
   E'Tarif aller-retour à 489 € sur les départs de septembre, bagage 23 kg inclus.\n\nLes dates les moins chères sont en milieu de semaine. Le prix remonte vite dès qu''on approche des vacances de la Toussaint — à réserver tôt.',
   489.00, 690.00, 'voyages-vols', NULL, NULL, 3, 25),

  ('Clim mobile 2600 W à 299 € chez Weldom Matoury',
   'clim-mobile-2600w-weldom-matoury',
   E'Climatiseur mobile 9000 BTU avec kit fenêtre fourni, à 299 € au lieu de 399 €.\n\nBonne option pour une chambre jusqu''à 25 m². Livraison possible sur l''île de Cayenne moyennant supplément.',
   299.00, 399.00, 'maison-electromenager', 'matoury', 'weldom-matoury', 4, 18),

  ('Couches Pampers taille 3 — 2 paquets achetés, 1 offert',
   'couches-pampers-t3-3pour2-geant-cayenne',
   E'Offre 3 pour 2 sur toute la gamme Pampers Baby-Dry, y compris les grands formats.\n\nÇa revient à environ 0,21 € la couche en taille 3 — nettement en dessous du prix habituel en Guyane.',
   19.90, 29.85, 'enfants-bebe', 'cayenne', 'geant-cayenne', 5, 6),

  ('Casque JBL Tune 520BT à 39 € (au lieu de 59 €)',
   'casque-jbl-tune-520bt-fnac-cayenne',
   E'Casque Bluetooth JBL Tune 520BT à 39 €, autonomie annoncée 57 h.\n\nDispo en noir et en blanc au moment où je poste. Le prix est aligné sur celui de l''Hexagone, ce qui est rare ici.',
   39.00, 59.00, 'tech-multimedia', 'cayenne', 'fnac-cayenne', 6, 14),

  ('Barbecue charbon 57 cm à 69 € chez Mr Bricolage',
   'barbecue-charbon-57cm-mr-bricolage-cayenne',
   E'Barbecue boule 57 cm avec couvercle et thermomètre, 69 € au lieu de 99 €.\n\nMonté en magasin pour l''exposition, il en restait 6 en stock. Parfait pour les week-ends en famille.',
   69.00, 99.00, 'bricolage-jardin', 'cayenne', 'mr-bricolage-cayenne', 7, 11),

  ('Lot de 3 draps de plage 100 % coton à 15 €',
   'lot-3-draps-plage-coton-destock-guyane',
   E'Lot de trois grandes serviettes de plage en coton éponge, 15 € le lot.\n\nArrivage récent, plusieurs coloris. À ce prix c''est difficile à battre pour Montjoly ou les îles.',
   15.00, 27.00, 'arrivages-conteneurs', 'matoury', 'destock-guyane', 8, 4),

  ('Menu du midi à 12 € au bourg de Kourou',
   'menu-midi-12-euros-kourou',
   E'Formule entrée + plat + jus local à 12 €, du lundi au vendredi entre 11 h 30 et 14 h.\n\nLa carte change chaque jour, avec souvent du poisson frais. Il vaut mieux arriver avant 12 h 30, ça se remplit vite.',
   12.00, NULL, 'restos-sorties', 'kourou', NULL, 9, 8),

  ('Rentrée : cartable + trousse garnie à 24,90 €',
   'pack-rentree-cartable-trousse-super-u-remire',
   E'Pack rentrée avec cartable 38 cm, trousse garnie et gourde, à 24,90 € au lieu de 39,90 €.\n\nPlusieurs modèles garçons et filles. L''offre court jusqu''à épuisement des stocks.',
   24.90, 39.90, 'enfants-bebe', 'remire-montjoly', 'super-u-remire', 10, 3),

  ('Perceuse visseuse 18 V + 2 batteries à 79 €',
   'perceuse-visseuse-18v-bricorama-cayenne',
   E'Perceuse-visseuse sans fil 18 V livrée avec deux batteries et une mallette, 79 € au lieu de 119 €.\n\nCouple annoncé 45 Nm, largement suffisant pour du montage de meuble et des petits travaux.',
   79.00, 119.00, 'bricolage-jardin', 'cayenne', 'bricorama-cayenne', 11, 16)
) AS d(title, slug, description, price, original, cat_slug, city_slug, store_slug, age_days, expires_days)
-- L'auteur est retrouvé par son pseudo, pas par un UUID en dur : si le
-- compte existait déjà avec un autre id, l'insertion reste correcte.
CROSS JOIN (SELECT "id" FROM "users" WHERE "username" = 'peyi_demo') AS author
JOIN "categories" c ON c."slug" = d.cat_slug
LEFT JOIN "cities" ci ON ci."slug" = d.city_slug
LEFT JOIN "stores" s ON s."slug" = d.store_slug
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "originalPrice" = EXCLUDED."originalPrice",
  "discountPercent" = EXCLUDED."discountPercent",
  "status" = EXCLUDED."status",
  "expiresAt" = EXCLUDED."expiresAt",
  "updatedAt" = NOW();

-- -----------------------------------------------------------------------------
-- 3. Petites annonces (12)
-- -----------------------------------------------------------------------------
-- `attributes` (JSON) et les colonnes dénormalisées (attrYear, attrBrand…)
-- doivent rester cohérents : ce sont ces colonnes qui alimentent les filtres.
-- Cf. `denormalizeAttributes` dans src/lib/listings/field-registry.ts.
INSERT INTO "listings" (
  "id", "authorId", "title", "slug", "description",
  "price", "priceType", "currency", "type", "condition",
  "categoryId", "cityId", "neighborhood",
  "attributes", "attrYear", "attrMileageKm", "attrSurfaceM2",
  "attrRooms", "attrBrand", "attrFuel", "attrContract",
  "allowMessages", "showPhone",
  "status", "expiresAt", "publishedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  author."id",
  l.title, l.slug, l.description,
  l.price, l.price_type::"PriceType", 'EUR', 'OFFER', l.cond::"ItemCondition",
  c."id", ci."id", l.neighborhood,
  l.attributes::jsonb,
  NULLIF((l.attributes::jsonb->>'annee'), '')::smallint,
  NULLIF((l.attributes::jsonb->>'kilometrage'), '')::int,
  NULLIF((l.attributes::jsonb->>'surface'), '')::smallint,
  NULLIF((l.attributes::jsonb->>'pieces'), '')::smallint,
  NULLIF(l.attributes::jsonb->>'marque', ''),
  NULLIF(l.attributes::jsonb->>'carburant', ''),
  NULLIF(l.attributes::jsonb->>'type_contrat', ''),
  TRUE, FALSE,
  'PUBLISHED',
  NOW() + (l.expires_days || ' days')::interval,
  NOW() - (l.age_days || ' days')::interval,
  NOW() - (l.age_days || ' days')::interval,
  NOW()
FROM (VALUES
  ('Toyota Yaris 1.0 essence — 2018, 68 000 km',
   'toyota-yaris-2018-68000km-cayenne',
   E'Yaris 1.0 VVT-i de 2018, 68 000 km au compteur, entretien suivi en concession.\n\nClimatisation, régulateur, Bluetooth. Pneus changés l''an dernier, contrôle technique valide jusqu''en mars prochain. Deuxième main, jamais accidentée.\n\nVisible sur Cayenne, essai possible sur rendez-vous.',
   9800, 'NEGOTIABLE', 'VERY_GOOD', 'voitures', 'cayenne', 'Montabo',
   '{"marque":"Toyota","modele":"Yaris","annee":2018,"kilometrage":68000,"carburant":"essence","boite":"manuelle","portes":"5","ct_valide":true}', 4, 55),

  ('Studio meublé 28 m² à Rémire — 620 €/mois',
   'studio-meuble-28m2-remire-montjoly',
   E'Studio entièrement meublé de 28 m², au premier étage d''une petite résidence calme et sécurisée.\n\nCuisine équipée (plaques, frigo, micro-ondes), climatisation dans la pièce de vie, salle d''eau avec douche à l''italienne. Place de parking privative incluse.\n\nCharges comprises dans le loyer (eau, entretien des parties communes). Libre à partir du mois prochain.',
   620, 'PER_MONTH', NULL, 'location-appartement', 'remire-montjoly', 'Bourg',
   '{"surface":28,"pieces":1,"meuble":true,"etage":1,"climatisation":true}', 5, 55),

  ('iPhone 13 128 Go — très bon état, sous garantie',
   'iphone-13-128go-tres-bon-etat-matoury',
   E'iPhone 13 128 Go noir, acheté en janvier, garantie Apple encore valable 5 mois (facture fournie).\n\nÉtat impeccable, toujours utilisé avec coque et verre trempé. Batterie à 94 %. Livré avec câble d''origine et boîte.\n\nRemise en main propre sur Matoury ou Cayenne.',
   520, 'FIXED', 'LIKE_NEW', 'multimedia-tech', 'matoury', NULL,
   '{"marque":"Apple","modele":"iPhone 13","stockage":"128 Go","couleur":"Noir"}', 2, 58),

  ('Canapé d''angle 5 places en tissu gris',
   'canape-angle-5-places-tissu-gris-cayenne',
   E'Canapé d''angle convertible 5 places, tissu gris anthracite, angle réversible (montable à gauche ou à droite).\n\nAcheté il y a deux ans, très peu utilisé, aucune tache ni accroc. Coffre de rangement sous l''assise. Dimensions : 260 × 180 cm.\n\nÀ enlever sur place, prévoir un utilitaire — je peux aider au chargement.',
   350, 'NEGOTIABLE', 'GOOD', 'maison-mobilier', 'cayenne', 'Cabassou',
   '{"matiere":"Tissu","couleur":"Gris anthracite","places":5}', 7, 53),

  ('Scooter Yamaha XMAX 125 — 2020, 14 000 km',
   'yamaha-xmax-125-2020-kourou',
   E'XMAX 125 de 2020, 14 000 km, révision faite il y a un mois (courroie, galets, vidange).\n\nTop-case 39 L inclus, pare-brise haut, pneus à 70 %. Bien entretenu, factures d''entretien disponibles.\n\nIdéal pour les trajets Kourou–Cayenne. Visible à Kourou.',
   3200, 'NEGOTIABLE', 'VERY_GOOD', 'motos-scooters', 'kourou', NULL,
   '{"marque":"Yamaha","modele":"XMAX 125","annee":2020,"kilometrage":14000,"cylindree":125}', 9, 51),

  ('Recherche aide-cuisinier — CDD 6 mois, Cayenne',
   'aide-cuisinier-cdd-6-mois-cayenne',
   E'Restaurant du centre-ville de Cayenne recherche un aide-cuisinier pour un CDD de 6 mois, temps plein.\n\nMissions : préparation des entrées et des desserts, mise en place, plonge en renfort le week-end. Service du midi principalement, deux soirs par semaine.\n\nDébutant accepté si motivé — la formation se fait sur place. Repas fournis.',
   1600, 'PER_MONTH', NULL, 'emploi-services', 'cayenne', 'Centre-ville',
   '{"type_contrat":"cdd","temps_travail":"temps_plein","experience_requise":"debutant","secteur":"Restauration"}', 3, 57),

  ('Maison T4 avec jardin à Macouria — 1 450 €/mois',
   'maison-t4-jardin-macouria',
   E'Maison individuelle de 4 pièces, 95 m² habitables sur un terrain clôturé de 500 m².\n\nTrois chambres avec placards, séjour traversant, cuisine américaine équipée, deux salles d''eau. Terrasse couverte et carbet au fond du jardin. Portail motorisé, deux places de stationnement.\n\nQuartier calme, à 5 minutes de l''école. Libre immédiatement.',
   1450, 'PER_MONTH', NULL, 'location-maison', 'macouria', 'Soula',
   '{"surface":95,"pieces":4,"chambres":3,"terrain":500,"jardin":true,"parking":true}', 6, 54),

  ('Vélo VTT 27,5" Decathlon Rockrider ST 120',
   'vtt-rockrider-st120-275-remire',
   E'VTT Rockrider ST 120 en taille M, roues 27,5 pouces, 21 vitesses Shimano.\n\nServi une saison, révisé récemment (freins et transmission réglés). Quelques micro-rayures sur le cadre, rien de structurel.\n\nLivré avec antivol en U et compteur.',
   180, 'NEGOTIABLE', 'GOOD', 'velos', 'remire-montjoly', NULL,
   '{"marque":"Decathlon","taille":"M","roues":"27,5\""}', 11, 49),

  ('Machine à laver Whirlpool 8 kg — bon état',
   'machine-a-laver-whirlpool-8kg-matoury',
   E'Lave-linge hublot Whirlpool 8 kg, 1200 tours, classe A.\n\nEn parfait état de marche, utilisé trois ans dans un foyer de deux personnes. Je le vends parce que je déménage en meublé.\n\nÀ récupérer sur Matoury, je peux aider à le charger.',
   180, 'FIXED', 'GOOD', 'maison-mobilier', 'matoury', 'Balata',
   '{"marque":"Whirlpool","capacite":"8 kg"}', 13, 47),

  ('Cours particuliers de maths — collège et lycée',
   'cours-particuliers-maths-college-lycee-cayenne',
   E'Étudiant en licence de mathématiques, je propose des cours particuliers du collège à la terminale.\n\nMéthode axée sur la compréhension plutôt que sur le par-cœur : on reprend les bases manquantes avant d''attaquer le programme en cours. Suivi des devoirs et préparation aux contrôles.\n\nDéplacement possible sur l''île de Cayenne. Première séance d''essai à tarif réduit.',
   25, 'PER_DAY', NULL, 'emploi-services', 'cayenne', NULL,
   '{"type_contrat":"freelance","secteur":"Cours particuliers"}', 8, 52),

  ('Peugeot Partner utilitaire — 2017, diesel',
   'peugeot-partner-2017-diesel-saint-laurent',
   E'Partner utilitaire 1.6 HDi de 2017, 112 000 km, trois places à l''avant.\n\nCloison de séparation, plancher bois, deux portes latérales coulissantes. Entretien à jour, distribution faite à 100 000 km. CT vierge de novembre.\n\nVéhicule d''artisan, propre, non fumeur. Visible à Saint-Laurent-du-Maroni.',
   7500, 'NEGOTIABLE', 'GOOD', 'utilitaires-4x4', 'saint-laurent-du-maroni', NULL,
   '{"marque":"Peugeot","modele":"Partner","annee":2017,"kilometrage":112000,"carburant":"diesel","boite":"manuelle"}', 15, 45),

  ('Table à manger en bois massif + 6 chaises',
   'table-bois-massif-6-chaises-kourou',
   E'Table rectangulaire en bois massif (180 × 90 cm) avec ses six chaises assorties.\n\nEnsemble solide, quelques marques d''usage sur le plateau qui partiraient avec un ponçage léger. Les chaises sont toutes stables, aucune réparation à prévoir.\n\nÀ enlever sur Kourou, prévoir un grand véhicule.',
   220, 'NEGOTIABLE', 'ACCEPTABLE', 'maison-mobilier', 'kourou', NULL,
   '{"matiere":"Bois massif","couleur":"Bois naturel","places":6}', 17, 43)
) AS l(title, slug, description, price, price_type, cond, cat_slug, city_slug, neighborhood, attributes, age_days, expires_days)
CROSS JOIN (SELECT "id" FROM "users" WHERE "username" = 'peyi_demo') AS author
JOIN "categories" c ON c."slug" = l.cat_slug
JOIN "cities" ci ON ci."slug" = l.city_slug
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "price" = EXCLUDED."price",
  "priceType" = EXCLUDED."priceType",
  "condition" = EXCLUDED."condition",
  "attributes" = EXCLUDED."attributes",
  "attrYear" = EXCLUDED."attrYear",
  "attrMileageKm" = EXCLUDED."attrMileageKm",
  "attrSurfaceM2" = EXCLUDED."attrSurfaceM2",
  "attrRooms" = EXCLUDED."attrRooms",
  "attrBrand" = EXCLUDED."attrBrand",
  "attrFuel" = EXCLUDED."attrFuel",
  "attrContract" = EXCLUDED."attrContract",
  "status" = EXCLUDED."status",
  "expiresAt" = EXCLUDED."expiresAt",
  "updatedAt" = NOW();

COMMIT;

-- -----------------------------------------------------------------------------
-- Vérification (à lancer après le COMMIT)
-- -----------------------------------------------------------------------------
-- SELECT
--   (SELECT count(*) FROM deals    WHERE "authorId" = '00000000-0000-4000-8000-0000000000de') AS bons_plans,
--   (SELECT count(*) FROM listings WHERE "authorId" = '00000000-0000-4000-8000-0000000000de') AS annonces;
