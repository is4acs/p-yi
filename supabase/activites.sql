-- =============================================================================
-- PÉYI — Verticale « activités » : schéma + 33 activités
-- =============================================================================
-- Généré par `npm run sql:activites` — NE PAS ÉDITER À LA MAIN.
-- Source des données : prisma/data/activities.ts
--
-- À coller tel quel dans l'éditeur SQL de Supabase (SQL Editor → New query),
-- puis « Run ». Le script est idempotent : le rejouer ne casse rien et met
-- simplement les fiches à jour.
--
-- Il enregistre aussi les deux migrations dans _prisma_migrations, pour que
-- le `prisma migrate deploy` du prochain `npm run build` les considère comme
-- déjà appliquées au lieu d'essayer de les rejouer.
-- =============================================================================

BEGIN;


-- -----------------------------------------------------------------------------
-- Migration 20260810000000_add_activities
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "ActivityCategory" AS ENUM ('NATURE', 'WILDLIFE', 'CULTURE', 'HERITAGE', 'SPACE', 'NAUTICAL', 'ADVENTURE', 'GASTRONOMY', 'WELLNESS', 'FAMILY');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type ActivityCategory déjà présent, ignoré';
END $$;
DO $$ BEGIN
  CREATE TYPE "AccessMode" AS ENUM ('CAR', 'TRACK', 'FOUR_WHEEL_DRIVE', 'PIROGUE', 'BOAT', 'PLANE', 'WALK');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type AccessMode déjà présent, ignoré';
END $$;
DO $$ BEGIN
  CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD', 'EXPERT');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type Difficulty déjà présent, ignoré';
END $$;
DO $$ BEGIN
  CREATE TYPE "Season" AS ENUM ('MAIN_DRY_SEASON', 'SHORT_DRY_SEASON', 'RAINY_SEASON', 'ALL_YEAR');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type Season déjà présent, ignoré';
END $$;
DO $$ BEGIN
  CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type ActivityStatus déjà présent, ignoré';
END $$;
CREATE TABLE IF NOT EXISTS "activities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "tags" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "cityId" TEXT NOT NULL,
    "address" TEXT,
    "startPoint" TEXT,
    "accessModes" "AccessMode"[],
    "durationMinutes" INTEGER,
    "difficulty" "Difficulty",
    "seasons" "Season"[],
    "accessNote" TEXT,
    "priceMinCents" INTEGER,
    "priceMaxCents" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "bookingRequired" BOOLEAN NOT NULL DEFAULT false,
    "bookingUrl" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "openingHours" JSONB,
    "operatorId" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "activity_images" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_images_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "operators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "activities_slug_key" ON "activities"("slug");
CREATE INDEX IF NOT EXISTS "activities_status_category_idx" ON "activities"("status", "category");
CREATE INDEX IF NOT EXISTS "activities_latitude_longitude_idx" ON "activities"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "activities_cityId_status_idx" ON "activities"("cityId", "status");
CREATE INDEX IF NOT EXISTS "activities_operatorId_idx" ON "activities"("operatorId");
CREATE INDEX IF NOT EXISTS "activity_images_activityId_sortOrder_idx" ON "activity_images"("activityId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "operators_slug_key" ON "operators"("slug");
DO $$ BEGIN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'contrainte activities_cityId_fkey déjà présente, ignorée';
END $$;
DO $$ BEGIN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'contrainte activities_operatorId_fkey déjà présente, ignorée';
END $$;
DO $$ BEGIN
  ALTER TABLE "activity_images" ADD CONSTRAINT "activity_images_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'contrainte activity_images_activityId_fkey déjà présente, ignorée';
END $$;

-- -----------------------------------------------------------------------------
-- Migration 20260810120000_admin_activity_audit
-- -----------------------------------------------------------------------------
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'CREATE_ACTIVITY';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'UPDATE_ACTIVITY';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'DELETE_ACTIVITY';
ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'SET_ACTIVITY_STATUS';
ALTER TYPE "AdminTargetType" ADD VALUE IF NOT EXISTS 'ACTIVITY';

-- -----------------------------------------------------------------------------
-- Migration 20260811000000_activity_image_credit
-- -----------------------------------------------------------------------------
ALTER TABLE "activity_images" ADD COLUMN IF NOT EXISTS "credit" TEXT;


-- -----------------------------------------------------------------------------
-- Communes référencées par les activités (créées si absentes)
-- -----------------------------------------------------------------------------
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Cayenne', 'cayenne', '97300', 4.9227, -52.3269)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Rémire-Montjoly', 'remire-montjoly', '97354', 4.8951, -52.2713)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Kourou', 'kourou', '97310', 5.1595, -52.6503)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Saint-Laurent-du-Maroni', 'saint-laurent-du-maroni', '97320', 5.5018, -54.028)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Macouria', 'macouria', '97355', 4.9797, -52.4275)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Roura', 'roura', '97311', 4.7264, -52.3411)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Montsinéry-Tonnegrande', 'montsinery-tonnegrande', '97356', 4.8878, -52.515)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Régina', 'regina', '97390', 4.3125, -52.135)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Awala-Yalimapo', 'awala-yalimapo', '97319', 5.7425, -53.9289)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Saül', 'saul', '97314', 3.6219, -53.205)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Matoury', 'matoury', '97351', 4.8513, -52.3275)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Sinnamary', 'sinnamary', '97315', 5.3816, -52.9516)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Iracoubo', 'iracoubo', '97350', 5.4807, -53.2009)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Saint-Georges', 'saint-georges', '97313', 3.8934, -51.805)
ON CONFLICT ("slug") DO NOTHING;
INSERT INTO "cities" ("id", "name", "slug", "postcode", "latitude", "longitude")
VALUES (gen_random_uuid()::text, 'Maripasoula', 'maripasoula', '97370', 3.64, -54.0275)
ON CONFLICT ("slug") DO NOTHING;


-- -----------------------------------------------------------------------------
-- Activités (33) — publiées, rattachées à leur commune par slug
-- -----------------------------------------------------------------------------
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'iles-du-salut', 'Îles du Salut', 'L''archipel du bagne : vestiges chargés d''histoire, cocotiers et eaux turquoise au large de Kourou.',
  'Royale, Saint-Joseph et l''île du Diable forment l''archipel le plus célèbre de Guyane. On y débarque après ~1h de traversée depuis Kourou pour arpenter les vestiges du bagne (quartiers des condamnés, chapelle, hôpital), croiser agoutis, paons et singes, et se baigner dans la piscine des bagnards côté Saint-Joseph.

Compte une journée complète : tour de Royale (1h30 de marche), traversée en surf-boat vers Saint-Joseph selon la mer, déjeuner tiré du sac ou à l''auberge. L''île du Diable, elle, ne se visite pas.', 'HERITAGE'::"ActivityCategory", ARRAY['incontournable', 'histoire', 'famille', 'îlet']::TEXT[],
  5.287, -52.5896, c."id", NULL, 'Ponton des Roches, Kourou (navettes catamaran)',
  ARRAY['BOAT']::"AccessMode"[], 480,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Traversée ~1h, mer parfois agitée en début de journée — réserve la navette la veille, départs le matin.',
  4500, 6900,
  false, true, 'https://www.promaritimeguyane.fr/billetterie',
  '05 94 28 42 36', NULL, 'https://www.promaritimeguyane.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'kourou'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'savane-roche-virginie', 'Savane-roche Virginie', 'Le seul inselberg accessible depuis la route : 2h de forêt primaire pour un panorama à 360° sur la canopée.',
  'Un sentier ONF de 2,9 km (comptez ~2h aller) traverse forêt primaire, talwegs et zones humides avant de déboucher sur la dalle rocheuse : un inselberg de 138 m d''altitude posé au milieu de l''océan vert, avec ses broméliacées et ses mares temporaires.

Le site est classé réserve biologique depuis 2022. Bivouac possible sur la zone aménagée en contrebas de la roche — lever de soleil inoubliable.', 'NATURE'::"ActivityCategory", ARRAY['rando', 'inselberg', 'bivouac', 'panorama']::TEXT[],
  4.19653, -52.15208, c."id", NULL, 'PK 122,5 de la RN2 direction Saint-Georges (parking du sentier ONF)',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 300,
  'MODERATE'::"Difficulty",
  ARRAY['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON']::"Season"[], 'Sentier boueux et glissant en saison des pluies. Pars tôt : la roche est brûlante à la mi-journée, emporte 2 L d''eau par personne.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'regina'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'plage-des-hattes', 'Plage des Hattes — ponte des tortues luths', 'L''un des premiers sites de ponte de tortues luths au monde, sur la plage du village kali''na d''Awala-Yalimapo.',
  'Face à l''embouchure du Maroni, la plage des Hattes accueille chaque année l''un des plus grands rassemblements de tortues luths de la planète — jusqu''à plusieurs dizaines de pontes par nuit en pic de saison, ainsi que des tortues vertes.

La ponte s''observe de nuit, à marée haute, d''avril à juillet ; les éclosions se poursuivent jusqu''en septembre. Reste à distance, sans lampe blanche ni flash — des éco-volontaires encadrent le site en saison.', 'WILDLIFE'::"ActivityCategory", ARRAY['tortues', 'famille', 'gratuit', 'plage']::TEXT[],
  5.744, -53.9345, c."id", NULL, 'Plage de Yalimapo, face à l''embouchure du Maroni',
  ARRAY['CAR']::"AccessMode"[], 120,
  'EASY'::"Difficulty",
  ARRAY['RAINY_SEASON', 'MAIN_DRY_SEASON']::"Season"[], 'Ponte d''avril à juillet, de nuit à marée haute ; éclosions jusqu''en septembre. 3h30 de route depuis Cayenne — prévois de dormir sur place.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'awala-yalimapo'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'centre-spatial-guyanais', 'Centre spatial guyanais & Musée de l''espace', 'Le port spatial de l''Europe : visite des installations de lancement Ariane 6 et Vega, et musée de l''espace.',
  'Impossible de passer à Kourou sans voir d''où décollent Ariane 6 et Vega. La visite guidée en bus (~3h, gratuite sur réservation) emmène au pied des ensembles de lancement et au centre de contrôle Jupiter ; le Musée de l''espace complète avec ses salles interactives et son planétarium.

Les jours de lancement, les visites sont suspendues — mais des sites d''observation publics permettent de vivre un décollage, l''expérience la plus marquante de Guyane.', 'SPACE'::"ActivityCategory", ARRAY['espace', 'fusée', 'famille', 'visite guidée']::TEXT[],
  5.1721, -52.687, c."id", 'Centre spatial guyanais, Kourou', NULL,
  ARRAY['CAR']::"AccessMode"[], 180,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Visites du CSG gratuites sur réservation (pièce d''identité obligatoire, enfants 8 ans et +). Planning suspendu les jours de lancement.',
  400, 700,
  false, true, NULL,
  '05 94 33 77 77', NULL, 'https://centrespatialguyanais.cnes.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'kourou'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'camp-de-la-transportation', 'Camp de la Transportation', 'Le camp d''arrivée de tous les bagnards de Guyane, au cœur de Saint-Laurent-du-Maroni.',
  'Entre 1858 et 1946, tous les condamnés à la transportation débarquaient ici avant d''être répartis dans les camps de la colonie pénitentiaire. Cases, quartier de réclusion, cellule attribuée à Papillon : le site, remarquablement conservé, se découvre en visite guidée depuis le CIAP.

Prolonge avec les rues coloniales du quartier officiel et les bords du Maroni, face au Suriname.', 'HERITAGE'::"ActivityCategory", ARRAY['bagne', 'histoire', 'visite guidée', 'famille']::TEXT[],
  5.5037, -54.0299, c."id", 'Esplanade Laurent Baudin, Saint-Laurent-du-Maroni', NULL,
  ARRAY['CAR']::"AccessMode"[], 90,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Accès libre à la cour ; l''intérieur (réclusion, cellules) se visite uniquement en visite guidée, plusieurs départs par jour.',
  500, 850,
  false, false, NULL,
  NULL, NULL, 'https://www.saintlaurentdumaroni.fr/centre-interpretation-art-patrimoine/', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'saint-laurent-du-maroni'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'marche-de-cacao', 'Marché de Cacao', 'Le dimanche matin, le village hmong de Cacao devient le plus savoureux marché de Guyane.',
  'Installée sur les collines de la Comté depuis 1977, la communauté hmong a fait de Cacao le potager de la Guyane. Chaque dimanche, son marché déborde de fruits, légumes, broderies et surtout de soupes chinoises et nems dévorés sur place dès le matin.

Complète la sortie avec le musée « Le Planeur bleu » (insectes et papillons) et une balade au bord de la rivière.', 'GASTRONOMY'::"ActivityCategory", ARRAY['marché', 'hmong', 'famille', 'dimanche']::TEXT[],
  4.5747, -52.4653, c."id", 'Bourg de Cacao, Roura', NULL,
  ARRAY['CAR']::"AccessMode"[], 120,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Route de montagne sinueuse après la RN2 — compte ~1h15 depuis Cayenne et arrive avant 9h pour les soupes.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  '{"sunday":[["08:00","13:00"]]}'::jsonb,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'roura'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'marais-de-kaw', 'Marais de Kaw', 'Une des plus grandes zones humides de France : caïmans rouges la nuit, oiseaux à l''aube, en pirogue.',
  'Au pied de la montagne de Kaw, 94 000 hectares de marais abritent caïmans noirs et rouges, ibis rouges, hoazins et une flore aquatique spectaculaire. Les sorties se font en pirogue depuis le dégrad, de jour pour les oiseaux ou de nuit pour approcher les caïmans à la lampe.

Plusieurs opérateurs proposent aussi la nuit en carbet flottant au milieu du marais — brume de l''aube garantie.', 'WILDLIFE'::"ActivityCategory", ARRAY['caïmans', 'pirogue', 'nocturne', 'oiseaux']::TEXT[],
  4.493, -52.048, c."id", NULL, 'Dégrad de Kaw, au bout de la D6 (montagne de Kaw)',
  ARRAY['CAR', 'PIROGUE']::"AccessMode"[], 240,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Route de la montagne de Kaw par endroits dégradée — prudence de nuit et par temps de pluie. Sorties uniquement avec un piroguier agréé.',
  4500, 6500,
  false, true, NULL,
  '0694 25 58 82', '0694255882', 'https://www.ms-evasion.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'roura'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'sentier-du-rorota', 'Sentier du Rorota', 'La boucle familiale de l''île de Cayenne : lacs, paresseux et vues sur les îlets de Rémire.',
  'Au-dessus de Rémire-Montjoly, cette boucle de ~6,5 km fait le tour des lacs du Rorota qui alimentaient autrefois Cayenne en eau. Sous-bois frais, passages aménagés, points de vue sur l''océan et les îlets — et de vraies chances d''apercevoir paresseux à trois doigts, tamarins et iguanes.

C''est LA rando d''initiation de l''île de Cayenne, faisable avec des enfants habitués à marcher.', 'NATURE'::"ActivityCategory", ARRAY['rando', 'famille', 'lacs', 'paresseux']::TEXT[],
  4.8877, -52.2585, c."id", NULL, 'Parking du sentier, route de Rémire (PK 7)',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 150,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Passages glissants après la pluie — bonnes chaussures et eau. Départ avant 9h pour la fraîcheur et les animaux.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'remire-montjoly'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'ilet-la-mere', 'Îlet la Mère', 'À 40 minutes de bateau du Dégrad-des-Cannes, l''îlet aux saïmiris curieux et aux sentiers face à l''océan.',
  'Ancienne léproserie puis annexe du bagne, l''îlet la Mère est aujourd''hui un site du Conservatoire du littoral peuplé d''une colonie de saïmiris (singes-écureuils) peu farouches. Deux sentiers en boucle font le tour de l''île entre vestiges, cocotiers et rochers de bord de mer.

Traversée en navette depuis la marina du Dégrad-des-Cannes, journée pique-nique idéale avec des enfants.', 'NATURE'::"ActivityCategory", ARRAY['îlet', 'saïmiris', 'pique-nique', 'famille']::TEXT[],
  4.892, -52.1844, c."id", NULL, 'Marina du Dégrad-des-Cannes (navettes)',
  ARRAY['BOAT']::"AccessMode"[], 300,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Ni eau potable ni vente sur place : emporte pique-nique et eau. Ne nourris pas les saïmiris, ils se servent tout seuls dans les sacs ouverts.',
  3000, 4000,
  false, true, NULL,
  '0694 41 05 20', '0694410520', 'https://www.t-airnatureguyane.com/excursion/ilet-la-mere/', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'remire-montjoly'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'chutes-voltaire', 'Chutes Voltaire', '73 km de piste puis 1h de layon pour se baigner au pied des chutes mythiques de l''Ouest guyanais.',
  'Les chutes Voltaire dévalent une série de gradins rocheux au cœur de la forêt, au bout de la piste Paul-Isnard. Après le parking de l''auberge, un sentier de ~3,3 km longe la crique jusqu''aux vasques où l''on se baigne dans une eau ambrée.

L''aventure, c''est la piste elle-même : 73 km de latérite depuis Saint-Laurent, ponts de bois et bourbiers selon la saison.', 'ADVENTURE'::"ActivityCategory", ARRAY['cascade', 'piste', 'baignade', '4x4']::TEXT[],
  5.05199, -54.08963, c."id", NULL, 'Piste Paul-Isnard PK 73 (parking de l''auberge), puis sentier 3,3 km',
  ARRAY['FOUR_WHEEL_DRIVE', 'WALK']::"AccessMode"[], 480,
  'MODERATE'::"Difficulty",
  ARRAY['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON']::"Season"[], 'Piste Paul-Isnard : 4x4 obligatoire, souvent impraticable après de fortes pluies. Fais le plein à Saint-Laurent et préviens quelqu''un de ton itinéraire.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'saint-laurent-du-maroni'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'saul', 'Saül et ses sentiers', 'Le village du bout du monde, accessible uniquement en avion, au départ de dizaines de km de sentiers balisés.',
  'Enclavé au centre exact de la Guyane, Saül (une centaine d''habitants) n''est relié au littoral que par les airs. Autour du bourg et de son église en bois, un réseau de sentiers entretenus — Belvédère, Roche Bateau, Gros Arbres, Monts La Fumée — plonge dans une forêt primaire exceptionnelle, porte d''entrée du Parc amazonien.

On y reste deux jours minimum : gîtes et carbets au village, ravitaillement limité à l''épicerie locale.', 'NATURE'::"ActivityCategory", ARRAY['rando', 'forêt primaire', 'insolite', 'parc amazonien']::TEXT[],
  3.6219, -53.2042, c."id", NULL, 'Aérodrome de Saül (vols quotidiens depuis Cayenne-Matoury)',
  ARRAY['PLANE']::"AccessMode"[], 2880,
  'MODERATE'::"Difficulty",
  ARRAY['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON']::"Season"[], 'Vol ~50 min depuis Cayenne (petits porteurs vite complets, réserve tôt). Aucune route n''arrive à Saül — pas de distributeur ni de réseau fiable.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'saul'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'centre-amerindien-kalawachi', 'Centre amérindien Kalawachi', 'Six peuples autochtones transmettent leurs savoirs dans ce village reconstitué au bord de la crique Passoura.',
  'Sur 3 hectares en bordure de crique, l''association Kalawachi (Kali''na, Arawak, Wayana, Palikur, Teko, Wayampi) a reconstitué carbets et habitats traditionnels pour faire vivre les cultures amérindiennes de Guyane : artisanat, cachiri, contes, danses et cuisine traditionnelle.

Visites et journées découvertes sur réservation, souvent couplées à une baignade en crique — une immersion culturelle rare à 10 minutes de Kourou.', 'CULTURE'::"ActivityCategory", ARRAY['amérindien', 'artisanat', 'famille', 'carbet']::TEXT[],
  5.1318, -52.6452, c."id", NULL, 'Route du Dégrad Saramaka, PK 3,5 (Kourou)',
  ARRAY['CAR']::"AccessMode"[], 180,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], NULL,
  1500, 4500,
  false, true, NULL,
  NULL, NULL, 'https://www.facebook.com/centreamerindienkalawachi/', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'kourou'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'bagne-des-annamites', 'Bagne des Annamites', 'Dans la forêt de Montsinéry, les vestiges émouvants du camp des prisonniers indochinois, crique de baignade au bout.',
  'De 1931 à 1946, le camp Crique Anguille détint plus de 500 prisonniers indochinois condamnés aux travaux forcés. Un sentier sur caillebotis (~5 km aller-retour) mène aux vestiges envahis par la forêt — cases, cachots, four à pain — avec des panneaux qui racontent cette histoire méconnue.

La balade se termine à la crique Anguille, parfaite pour se rafraîchir avant le retour.', 'HERITAGE'::"ActivityCategory", ARRAY['bagne', 'rando', 'histoire', 'baignade']::TEXT[],
  4.82587, -52.51642, c."id", NULL, 'Parking du sentier, PK 14,5 de la D5 (route de Tonnégrande)',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 150,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Caillebotis glissants après la pluie, anti-moustiques indispensable. Maillot conseillé pour la crique Anguille.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'http://www.montsinery-tonnegrande.fr/culture-sport-et-loisirs/activites-culturelles-et-patrimoine/bagne-des-annamites/', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'montsinery-tonnegrande'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'zoo-de-guyane', 'Zoo de Guyane', '450 animaux guyanais qu''on ne croise (presque) jamais en forêt, et une passerelle dans la canopée.',
  'Jaguars, tapirs, loutres géantes, singes atèles, harpie féroce : le zoo-refuge de Macouria présente 75 espèces exclusivement guyanaises dans un parc ombragé de 6 hectares, dont beaucoup d''animaux saisis ou recueillis. Le parcours de canopée sur passerelles suspendues offre un point de vue unique sur les enclos.

Prévois une demi-journée, en fin d''après-midi pour les nourrissages — poussettes OK sur la majorité du circuit.', 'FAMILY'::"ActivityCategory", ARRAY['famille', 'animaux', 'canopée', 'poussette']::TEXT[],
  4.948, -52.4923, c."id", 'CD5 PK 29, route du Gallion, Macouria', NULL,
  ARRAY['CAR']::"AccessMode"[], 180,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], NULL,
  1050, 1700,
  false, false, NULL,
  '05 94 31 73 06', NULL, 'https://www.zoodeguyane.com', NULL,
  '{"monday":[["09:30","17:30"]],"tuesday":[["09:30","17:30"]],"wednesday":[["09:30","17:30"]],"thursday":[["09:30","17:30"]],"friday":[["09:30","17:30"]],"saturday":[["09:30","17:30"]],"sunday":[["09:30","17:30"]]}'::jsonb,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'macouria'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'crique-gabrielle', 'Crique Gabrielle', 'Balade en pirogue sur l''eau noire entre les fromagers, pontons de baignade et carbets, à 40 min de Cayenne.',
  'Affluent de la rivière Oyak, la crique Gabrielle est la sortie pirogue classique des familles de l''île de Cayenne : embarquement au pont de Roura ou au village Dacca, remontée de l''eau sombre sous la voûte forestière, arrêt baignade aux pontons et repas au carbet.

Une immersion amazonienne accessible à tous, sans marche d''approche — parfaite première crique.', 'NAUTICAL'::"ActivityCategory", ARRAY['pirogue', 'baignade', 'famille', 'carbet']::TEXT[],
  4.7195, -52.333, c."id", NULL, 'Embarcadère du pont de Roura ou village Dacca (départs pirogue)',
  ARRAY['CAR', 'PIROGUE']::"AccessMode"[], 180,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Courant et niveau d''eau hauts en pleine saison des pluies — les sorties partent surtout le matin.',
  2900, 4400,
  false, true, NULL,
  '0694 41 05 20', '0694410520', 'https://www.t-airnatureguyane.com/excursion/crique-gabriel/', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'roura'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'cascades-de-fourgassie', 'Cascades de Fourgassié', 'La cascade la plus accessible de Guyane : 15 minutes de marche depuis la piste, vasques et rochers plats pour la journée.',
  'À trois quarts d''heure de Cayenne, la crique Fourgassié dévale une succession de dalles rocheuses dans un décor de forêt. Un sentier aménagé de caillebotis et de passerelles mène aux chutes en un quart d''heure ; un second itinéraire longe la crique sur 45 minutes pour ceux qui veulent marcher un peu plus.

C''est le spot familial du week-end : rochers plats pour poser les affaires, vasques peu profondes, ombre permanente. Arrive tôt le dimanche, le parking se remplit vite.', 'NATURE'::"ActivityCategory", ARRAY['cascade', 'baignade', 'famille', 'gratuit']::TEXT[],
  4.64443, -52.30028, c."id", NULL, 'Piste de Fourgassié, ~12 km après le bourg de Roura sur la route de Kaw',
  ARRAY['CAR', 'TRACK', 'WALK']::"AccessMode"[], 120,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Les 3 derniers kilomètres se font sur une piste en bon état, praticable en voiture de tourisme par temps sec. Rochers glissants.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'roura'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'reserve-naturelle-tresor', 'Réserve naturelle régionale Trésor', 'Un sentier botanique sur caillebotis à flanc de montagne de Kaw, dans l''une des forêts les plus riches de Guyane.',
  'Sur les pentes de la montagne de Kaw, la réserve Trésor protège 2 500 hectares de forêt primaire. Son sentier botanique de 1,8 km, entièrement sécurisé et jalonné de panneaux, traverse plusieurs étages de végétation : bas-fonds humides, forêt de pente, crête. Un second sentier « carbone » de 1,4 km complète la visite.

L''un des rares endroits où l''on comprend concrètement ce qu''est la biodiversité amazonienne, sans matériel ni guide obligatoire.', 'NATURE'::"ActivityCategory", ARRAY['sentier', 'botanique', 'famille', 'gratuit', 'forêt primaire']::TEXT[],
  4.61028, -52.27917, c."id", NULL, 'PK 27,3 de la route de Kaw (D6), à ~18 km du bourg de Roura',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 120,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Caillebotis glissants après la pluie. Route de Kaw sinueuse — prudence, surtout au retour de nuit.',
  NULL, NULL,
  true, false, NULL,
  '05 94 38 12 89', NULL, 'https://reserves-naturelles.org/reserves/tresor/', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'roura'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'montagne-des-singes', 'Montagne des Singes', 'La rando classique de Kourou : une grande boucle en forêt jusqu’au sommet, avec de vraies chances de croiser des singes.',
  'À une douzaine de kilomètres au sud-ouest de Kourou, ce massif de 161 m culmine au-dessus de la savane. L''ONF y a aménagé deux parcours : un sentier botanique court (650 m) et la « grande boucle », 2 à 2h30 de marche en forêt avec quelques belles montées.

Sapajous et singes hurleurs se font entendre tôt le matin, et la vue depuis la crête porte jusqu''au Centre spatial.', 'NATURE'::"ActivityCategory", ARRAY['rando', 'singes', 'forêt', 'gratuit']::TEXT[],
  5.07172, -52.69279, c."id", NULL, 'Parking du sentier, route du Dégrad Saramaka (PK 14-15) depuis la RN1',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 150,
  'MODERATE'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Site privé du CNES géré par l''ONF : accès piéton libre, mais reste sur les sentiers balisés. Pars tôt pour la faune et la fraîcheur.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'kourou'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'saut-maripa', 'Saut Maripa', 'Le plus spectaculaire saut de l''Oyapock, à la frontière brésilienne, remonté en pirogue depuis Saint-Georges.',
  'En amont de Saint-Georges, l''Oyapock se brise sur une barre rocheuse dans un fracas permanent : le saut Maripa marque la limite de remontée de la marée sur le fleuve. On l''atteint en pirogue depuis Saint-Georges (environ une heure), avec un débarquement à Pied-Saut puis 2 km de marche sur l''ancienne voie ferrée du bagne.

Un sentier botanique aménagé longe la rive gauche — la rive droite, c''est déjà le Brésil.', 'NAUTICAL'::"ActivityCategory", ARRAY['saut', 'pirogue', 'frontière', 'oyapock']::TEXT[],
  3.9025, -51.8133, c."id", NULL, 'Dégrad de Saint-Georges (pirogue) ou entrée de piste sur la RN2',
  ARRAY['PIROGUE', 'FOUR_WHEEL_DRIVE', 'WALK']::"AccessMode"[], 300,
  'MODERATE'::"Difficulty",
  ARRAY['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON']::"Season"[], 'Saut réputé dangereux : ne t''approche pas des rapides et pars avec un piroguier du coin. La piste d''accès (20 km) demande un 4x4, surtout en saison des pluies.',
  3500, 6000,
  false, true, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'saint-georges'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'ile-du-grand-connetable', 'Réserve naturelle de l’île du Grand-Connétable', 'Un rocher au large de l''Approuague, seul site de nidification d''oiseaux marins entre l''Amazone et l''Orénoque.',
  'À 18 km au large de l''embouchure de l''Approuague, les îles du Grand et du Petit Connétable abritent des dizaines de milliers d''oiseaux marins : frégates superbes, sternes de Cayenne et royales, mouettes atricilles, noddis bruns. C''est le seul site de reproduction sur 2 000 km de côte.

Le débarquement est interdit, mais les sorties encadrées longent l''île au plus près — spectacle garanti, notamment en période de nidification.', 'WILDLIFE'::"ActivityCategory", ARRAY['oiseaux', 'bateau', 'réserve', 'insolite']::TEXT[],
  4.82668, -51.94394, c."id", NULL, 'Sorties en mer encadrées depuis l''Approuague ou Cayenne',
  ARRAY['BOAT']::"AccessMode"[], 480,
  'MODERATE'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Débarquement interdit (réserve naturelle nationale). Sorties uniquement avec un opérateur agréé et selon l''état de la mer — prévois de quoi lutter contre le mal de mer.',
  9000, 15000,
  false, true, NULL,
  NULL, NULL, 'https://www.reserve-connetable.com', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'regina'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'assister-a-un-lancement', 'Assister à un lancement depuis Kourou', 'Le sol qui tremble, la nuit qui devient jour : voir décoller Ariane 6 ou Vega, l’expérience guyanaise par excellence.',
  'Quelques fois par an, la Guyane retient son souffle. Depuis les sites d''observation du CNES (Toucan, Ibis, Agami, Colibri) ou depuis les points publics gratuits — plage de Kourou, bord de mer, colline de la Carapa — on assiste au décollage à quelques kilomètres du pas de tir.

Le grondement arrive plusieurs secondes après la lumière, et la trajectoire reste visible plusieurs minutes au-dessus de l''Atlantique. Cale ton séjour sur un lancement si tu peux : rien d''autre en Guyane ne produit cet effet.', 'SPACE'::"ActivityCategory", ARRAY['fusée', 'espace', 'incontournable', 'gratuit', 'famille']::TEXT[],
  5.1595, -52.6503, c."id", NULL, 'Sites d’observation du CNES (sur inscription) ou points publics gratuits à Kourou',
  ARRAY['CAR']::"AccessMode"[], 240,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Calendrier des lancements souvent décalé à la dernière minute (météo, technique) : garde de la souplesse. Les sites CNES demandent une inscription préalable et une pièce d''identité ; les points publics de Kourou restent libres d''accès.',
  NULL, NULL,
  true, true, NULL,
  '05 94 33 77 77', NULL, 'https://centrespatialguyanais.cnes.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'kourou'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'fort-ceperou', 'Fort Cépérou', 'Le berceau de Cayenne : les vestiges du fort de 1643 et le plus beau point de vue sur la ville et l''estuaire.',
  'C''est ici que Cayenne est née, sur la colline dominant l''embouchure du fleuve. Le fort érigé en 1643 porte le nom d''un chef amérindien ; Vauban fortifia ensuite toute la ville, avant que les Portugais ne détruisent l''essentiel entre 1809 et 1817.

Il reste des pans de murs, un phare et surtout un panorama à 180° : le port, le Vieux Cayenne, la mer couleur latérite et, au sud-ouest, la rivière de Cayenne.', 'HERITAGE'::"ActivityCategory", ARRAY['histoire', 'panorama', 'gratuit', 'centre-ville']::TEXT[],
  4.93763, -52.336843, c."id", 'Colline de Cépérou, au-dessus du port, Cayenne', NULL,
  ARRAY['CAR', 'WALK']::"AccessMode"[], 45,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Montée à pied depuis la place du Coq ou le port. Évite le site à la nuit tombée.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'cayenne'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'mont-grand-matoury', 'Réserve naturelle du Mont Grand Matoury', 'La plus grande réserve périurbaine de France : 2 123 hectares de forêt primaire aux portes de Cayenne.',
  'Un morceau de forêt tropicale humide intact à vingt minutes de l''aéroport. Le sentier de Lamirande grimpe jusqu''au sommet (234 m) en traversant plusieurs types de forêt ; le sentier des Américains, boucle de 3 km, suit la vallée de la crique Tompic entre le Mont Grand Matoury et le Mont de la Désirée.

Idéal pour une demi-journée quand on n''a pas le temps de descendre sur Kaw ou Roura.', 'NATURE'::"ActivityCategory", ARRAY['rando', 'forêt primaire', 'gratuit', 'proche cayenne']::TEXT[],
  4.8637, -52.3565, c."id", NULL, 'Sentier de Lamirande, accès depuis la RN2 (entre PROGT et la mairie de Matoury)',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 240,
  'MODERATE'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Montée raide et glissante après la pluie. Emporte 2 L d’eau : il n’y a aucun point d’eau sur le parcours.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'matoury'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'marche-de-cayenne', 'Marché de Cayenne', 'Bouillon d’awara, soupe chinoise, piments et paniers en arouman : le ventre de la Guyane sous une halle métallique.',
  'La halle du marché de Cayenne concentre tout le métissage guyanais : maraîchers hmong, épices créoles, poissons du littoral, plantes médicinales, artisanat amérindien et bushinengué, et les fameuses soupes vietnamiennes servies dès le petit matin.

Viens tôt et le ventre vide. C''est le meilleur endroit pour repartir avec du couac, du piment végétarien et de l''huile de carapa.', 'GASTRONOMY'::"ActivityCategory", ARRAY['marché', 'street food', 'artisanat', 'gratuit', 'centre-ville']::TEXT[],
  4.9355, -52.3322, c."id", 'Halle du marché, centre-ville de Cayenne', NULL,
  ARRAY['CAR']::"AccessMode"[], 90,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], NULL,
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  '{"wednesday":[["06:00","13:00"]],"friday":[["06:00","13:00"]],"saturday":[["06:00","13:00"]],"exceptions":["Horaires indicatifs — le marché est surtout animé les mercredi, vendredi et samedi matin."]}'::jsonb,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'cayenne'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'place-des-palmistes', 'Place des Palmistes et Vieux Cayenne', 'Palmiers royaux, maisons créoles et terrasses : le cœur historique de Cayenne se visite à pied.',
  'La place des Palmistes et ses grands palmiers royaux forment le salon de Cayenne : marchands de glaces le soir, concerts, parties de dominos. Autour, le Vieux Cayenne aligne ses maisons créoles à balcons de bois, la préfecture (ancienne habitation jésuite), l''hôtel de ville et le musée départemental Alexandre-Franconie.

Une boucle d''une heure suffit pour en faire le tour — à combiner avec le marché et le fort Cépérou.', 'CULTURE'::"ActivityCategory", ARRAY['patrimoine', 'balade', 'gratuit', 'centre-ville', 'famille']::TEXT[],
  4.9372, -52.3297, c."id", 'Place des Palmistes, Cayenne', NULL,
  ARRAY['CAR', 'WALK']::"AccessMode"[], 60,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], NULL,
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'cayenne'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'eglise-saint-joseph-iracoubo', 'Église Saint-Joseph d’Iracoubo', 'L''intérieur entièrement peint par un bagnard : la plus étonnante église de Guyane, au bord de la RN1.',
  'Vue de l''extérieur, une modeste église de bourg. À l''intérieur, une explosion de couleurs : entre 1893 et 1898, le bagnard Pierre Huguet a couvert chaque centimètre de voûte, de mur et de colonne de motifs et de scènes religieuses, en échange de sa liberté.

Classée monument historique, elle se visite gratuitement et vaut largement l''arrêt sur la route de Saint-Laurent.', 'HERITAGE'::"ActivityCategory", ARRAY['bagne', 'patrimoine', 'gratuit', 'insolite']::TEXT[],
  5.4807, -53.2009, c."id", 'Bourg d’Iracoubo, en bordure de la RN1', NULL,
  ARRAY['CAR']::"AccessMode"[], 45,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Ouverture parfois irrégulière : demande la clé à la mairie ou au presbytère si l''église est fermée.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'iracoubo'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'saint-georges-de-l-oyapock', 'Saint-Georges-de-l’Oyapock et le pont frontière', 'Le bout de la RN2 : un bourg fluvial franco-brésilien, son marché et le pont qui enjambe l’Oyapock.',
  'Terminus de la route de l''Est, Saint-Georges vit au rythme du fleuve et de la frontière. On y traverse en pirogue vers Oiapoque côté brésilien en dix minutes, on y mange açaí et tapioca, et le pont binational — inauguré en 2017 — enjambe l''Oyapock quelques kilomètres en amont.

Point de départ des remontées vers le saut Maripa et les villages du haut Oyapock.', 'CULTURE'::"ActivityCategory", ARRAY['frontière', 'fleuve', 'brésil', 'marché']::TEXT[],
  3.8934, -51.805, c."id", NULL, 'Bourg et dégrad de Saint-Georges, terminus de la RN2',
  ARRAY['CAR', 'PIROGUE']::"AccessMode"[], 480,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], '190 km de RN2 goudronnée depuis Cayenne (~3h). Passeport ou CNI obligatoire pour passer côté brésilien, et contrôles fréquents sur la route.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'saint-georges'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'maripasoula-haut-maroni', 'Maripasoula et le Haut-Maroni', 'La plus vaste commune de France, accessible en avion ou après deux jours de pirogue : la porte du pays wayana.',
  'Maripasoula, c''est 18 360 km² — la plus grande commune de France — et aucune route pour y arriver. On y vient en avion depuis Cayenne (1h) ou en remontant le Maroni en pirogue depuis Saint-Laurent, deux jours de sauts et de forêt.

Sur place : orpaillage légal, artisanat wayana et aluku, remontée vers les villages du Haut-Maroni et immersion dans une Guyane que la côte ne laisse pas soupçonner.', 'ADVENTURE'::"ActivityCategory", ARRAY['fleuve', 'insolite', 'wayana', 'avion', 'pirogue']::TEXT[],
  3.64, -54.0275, c."id", NULL, 'Aérodrome de Maripasoula (vols depuis Cayenne) ou dégrad de Saint-Laurent en pirogue',
  ARRAY['PLANE', 'PIROGUE']::"AccessMode"[], 4320,
  'HARD'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Aucune route n''arrive à Maripasoula. Vols vite complets, distributeur unique et réseau capricieux : prévois du liquide et de la marge sur ton retour.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'maripasoula'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'descente-du-maroni-en-pirogue', 'Le Maroni en pirogue', 'Remonter le fleuve-frontière depuis Saint-Laurent, entre villages bushinengué, criques et sauts.',
  'Le Maroni est l''autoroute de l''Ouest guyanais. Depuis le dégrad de Saint-Laurent, les pirogues remontent vers Apatou, Grand-Santi et Papaïchton, en longeant les villages aluku et ndjuka installés sur les deux rives — la gauche, c''est le Suriname.

Les sorties à la journée combinent en général passage de sauts, arrêt baignade et déjeuner dans un village. C''est la manière la plus juste de comprendre l''Ouest.', 'NAUTICAL'::"ActivityCategory", ARRAY['pirogue', 'fleuve', 'bushinengué', 'frontière']::TEXT[],
  5.506, -54.034, c."id", NULL, 'Dégrad de Saint-Laurent-du-Maroni (départs pirogue)',
  ARRAY['PIROGUE']::"AccessMode"[], 360,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Niveau du fleuve très variable : en saison sèche, certains sauts se franchissent à pied à côté de la pirogue. Passage côté Suriname = sortie de territoire, prends une pièce d''identité.',
  3000, 8000,
  false, true, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'saint-laurent-du-maroni'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'pripris-de-yiyi', 'Pripris de Yiyi et Maison de la Nature', '15 000 hectares de marais côtiers, un sentier sur pilotis et deux observatoires pour la faune.',
  'Entre Kourou et Sinnamary, les pripris de Yiyi étalent leurs prairies flottantes, îlots de palmiers et savanes marécageuses. Un sentier de 2,5 km sur caillebotis les traverse, avec deux observatoires pour guetter caïmans, ibis et hoccos. Deux itinéraires nautiques permettent aussi de s''y enfoncer en canoë.

À l''entrée, la Maison de la Nature abrite expositions, aquarium et vivarium — bonne mise en jambes pour les enfants.', 'WILDLIFE'::"ActivityCategory", ARRAY['marais', 'oiseaux', 'famille', 'gratuit', 'sentier']::TEXT[],
  5.415, -53.0356, c."id", NULL, 'Maison de la Nature de Sinnamary, PK 125 de la RN1',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 120,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Anti-moustiques indispensable, surtout en fin de journée. Le sentier est praticable toute l’année mais glissant après la pluie.',
  NULL, NULL,
  true, false, NULL,
  '06 94 26 88 76', NULL, 'https://www.ville-sinnamary.fr/mes-loisirs/maison-de-la-nature/', NULL,
  '{"wednesday":[["09:00","12:00"],["13:30","17:30"]],"saturday":[["09:00","12:00"],["13:30","17:30"]],"sunday":[["09:00","12:00"],["13:30","17:30"]],"exceptions":["Horaires de la Maison de la Nature — le sentier reste accessible en dehors."]}'::jsonb,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'sinnamary'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'habitation-loyola', 'Habitation Loyola', 'La plus grande plantation jésuite de Guyane, fouillée depuis 1994 : moulin, chapelle et mémoire de l''esclavage.',
  'Fondée en 1668 et exploitée par les jésuites jusqu''en 1769, Loyola couvrait plus de 1 000 hectares où travaillaient jusqu''à 500 personnes réduites en esclavage. Le site produisait la moitié du cacao et du café de la colonie.

Les fouilles ont dégagé la maison de maître, la chapelle et son cimetière, la forge, les magasins et un moulin à vent en pierre de taille. Le sentier est en accès libre ; les visites guidées, elles, racontent vraiment le site.', 'HERITAGE'::"ActivityCategory", ARRAY['histoire', 'esclavage', 'archéologie', 'gratuit']::TEXT[],
  4.8853, -52.2806, c."id", NULL, 'Entrée du sentier sur la route du bourg de Rémire, à proximité de Guyane 1ère',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 90,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Sentier en accès libre toute l''année. Visites guidées ponctuelles (Journées du patrimoine, campagnes de fouilles) — vérifie les dates avant de venir pour ça.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://habitationloyola.org', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'remire-montjoly'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'sentier-molokoi', 'Sentier Molokoï', 'Le plus long itinéraire balisé de Guyane : 18 km et 560 m de dénivelé entre la RN2 et le village de Cacao.',
  'Le Molokoï relie l''Auberge des Orpailleurs, sur la route de l''Est, au village hmong de Cacao : 18 km de forêt primaire sur les flancs de la montagne Cacao, jusqu''à 376 m d''altitude. Onze kilomètres jusqu''au carbet de bivouac, sept ensuite pour redescendre sur Cacao.

Faisable en une journée si tu marches bien, mais la version deux jours avec nuit en hamac au carbet (point d''eau sur la crique Boulanger) est nettement plus belle.', 'ADVENTURE'::"ActivityCategory", ARRAY['rando', 'bivouac', 'forêt primaire', 'sportif', 'gratuit']::TEXT[],
  4.572, -52.462, c."id", NULL, 'Deux départs : Auberge des Orpailleurs (RN2) ou village de Cacao',
  ARRAY['CAR', 'WALK']::"AccessMode"[], 600,
  'HARD'::"Difficulty",
  ARRAY['MAIN_DRY_SEASON', 'SHORT_DRY_SEASON']::"Season"[], 'Itinéraire engagé : préviens quelqu''un, emporte hamac, moustiquaire et 3 L d''eau. Boueux et glissant en saison des pluies. Organise ta récupération à l''autre bout.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'roura'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();
INSERT INTO "activities" (
  "id", "slug", "name", "tagline", "description", "category", "tags",
  "latitude", "longitude", "cityId", "address", "startPoint",
  "accessModes", "durationMinutes", "difficulty", "seasons", "accessNote",
  "priceMinCents", "priceMaxCents", "isFree", "bookingRequired", "bookingUrl",
  "phone", "whatsapp", "website", "instagram", "openingHours",
  "status", "isFeatured", "viewCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text, 'plage-de-montjoly', 'Plage de Montjoly', 'La grande plage de l’île de Cayenne : cocotiers, coureurs au coucher du soleil et pontes de tortues en saison.',
  'Plusieurs kilomètres de sable bordés de cocotiers et de raisiniers, entre la pointe de Montjoly et la plage de Gosselin. C''est le rendez-vous de fin de journée de l''île de Cayenne : marche, footing, foot sur le sable, carbets à pique-nique.

D''avril à juillet, des tortues vertes et olivâtres viennent y pondre — les associations locales organisent des veilles encadrées. La baignade, elle, reste peu profonde et l''eau chargée de limon amazonien.', 'FAMILY'::"ActivityCategory", ARRAY['plage', 'famille', 'gratuit', 'tortues', 'coucher de soleil']::TEXT[],
  4.879, -52.252, c."id", 'Front de mer de Montjoly, Rémire-Montjoly', NULL,
  ARRAY['CAR', 'WALK']::"AccessMode"[], 180,
  'EASY'::"Difficulty",
  ARRAY['ALL_YEAR']::"Season"[], 'Baignade sans surveillance et eau turbide (limon de l''Amazone, c''est normal). En saison de ponte, pas de lampe blanche ni de flash sur la plage la nuit.',
  NULL, NULL,
  true, false, NULL,
  NULL, NULL, 'https://www.guyane-amazonie.fr', NULL,
  NULL,
  'PUBLISHED'::"ActivityStatus", false, 0, NOW(), NOW()
FROM "cities" c WHERE c."slug" = 'remire-montjoly'
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "tagline" = EXCLUDED."tagline",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "tags" = EXCLUDED."tags",
  "latitude" = EXCLUDED."latitude",
  "longitude" = EXCLUDED."longitude",
  "cityId" = EXCLUDED."cityId",
  "address" = EXCLUDED."address",
  "startPoint" = EXCLUDED."startPoint",
  "accessModes" = EXCLUDED."accessModes",
  "durationMinutes" = EXCLUDED."durationMinutes",
  "difficulty" = EXCLUDED."difficulty",
  "seasons" = EXCLUDED."seasons",
  "accessNote" = EXCLUDED."accessNote",
  "priceMinCents" = EXCLUDED."priceMinCents",
  "priceMaxCents" = EXCLUDED."priceMaxCents",
  "isFree" = EXCLUDED."isFree",
  "bookingRequired" = EXCLUDED."bookingRequired",
  "bookingUrl" = EXCLUDED."bookingUrl",
  "phone" = EXCLUDED."phone",
  "whatsapp" = EXCLUDED."whatsapp",
  "website" = EXCLUDED."website",
  "instagram" = EXCLUDED."instagram",
  "openingHours" = EXCLUDED."openingHours",
  "status" = EXCLUDED."status",
  "updatedAt" = NOW();


-- -----------------------------------------------------------------------------
-- Marque les deux migrations comme appliquées (checksums réels des fichiers)
-- Sans ça, le `prisma migrate deploy` du prochain build tenterait de les
-- rejouer et planterait sur « type already exists ».
-- -----------------------------------------------------------------------------
INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name", "logs",
  "rolled_back_at", "started_at", "applied_steps_count"
)
VALUES (
  gen_random_uuid()::text, '773d5c218a1a546e5c0f943547062a68ccd37a20142f2f86049e5ad8a8cf4568', NOW(), '20260810000000_add_activities', NULL,
  NULL, NOW(), 1
)
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name", "logs",
  "rolled_back_at", "started_at", "applied_steps_count"
)
VALUES (
  gen_random_uuid()::text, '959df8a7a40966371624dbf5a0bcbfde0d5a70f7b139cd1219a2fcf536a158d4', NOW(), '20260810120000_admin_activity_audit', NULL,
  NULL, NOW(), 1
)
ON CONFLICT ("id") DO NOTHING;
INSERT INTO "_prisma_migrations" (
  "id", "checksum", "finished_at", "migration_name", "logs",
  "rolled_back_at", "started_at", "applied_steps_count"
)
VALUES (
  gen_random_uuid()::text, '4126dfbf3fdc2186a62a88039e5b536361720e716c9381094cdf9f34315c97ea', NOW(), '20260811000000_activity_image_credit', NULL,
  NULL, NOW(), 1
)
ON CONFLICT ("id") DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- Vérification (à lancer après le COMMIT)
-- -----------------------------------------------------------------------------
-- SELECT count(*) AS activites FROM "activities" WHERE "status" = 'PUBLISHED';
-- SELECT c."name" AS commune, count(*) FROM "activities" a
--   JOIN "cities" c ON c."id" = a."cityId" GROUP BY 1 ORDER BY 2 DESC;

