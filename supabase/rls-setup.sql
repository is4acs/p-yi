-- ============================================================================
-- Péyi — Row Level Security (RLS) pour les tables publiques
-- Copy-paste dans Supabase Dashboard → SQL Editor et exécute une fois.
-- Re-exécutable en toute sécurité (idempotent).
-- ============================================================================
--
-- Contexte
--   Toutes les lectures/écritures côté serveur transitent par Prisma via
--   DATABASE_URL. En Supabase hébergé ce DSN utilise le rôle `postgres`, qui
--   est SUPERUSER et donc bypasse RLS automatiquement. Les policies
--   ci-dessous n'affectent QUE les clients qui passent par l'API PostgREST
--   (clé `anon` ou `authenticated`).
--
--   Aujourd'hui, le browser client `@supabase/ssr` n'est utilisé que pour
--   l'auth OAuth et Storage — il ne fait AUCUN `supabase.from('deals')…`.
--   Ces policies sont donc de la **défense en profondeur** :
--     - si la clé `anon` fuitait, un attaquant ne pourrait pas exfiltrer les
--       brouillons/contenus non publiés ni les données privées (messages,
--       signalements, logs admin…) ;
--     - si on introduit un jour un appel table côté client, les policies
--       constituent le filet de sécurité.
--
-- Stratégie générale
--   1. On enable RLS sur TOUTES les tables publiques.
--   2. Tables avec du contenu public → policy SELECT restreinte au
--      contenu réellement publié (status='PUBLISHED').
--   3. Tables de référence (catégories, villes, magasins, marchands,
--      badges, tags, plans pro) → SELECT ouvert (ces données s'affichent
--      déjà partout).
--   4. Tables privées (messages, notifications, sessions, favoris, votes,
--      alertes, signalements, logs admin, gamification, affiliation) →
--      AUCUNE policy = deny all par défaut. Les utilisateurs y accèdent
--      uniquement via Prisma côté serveur après authentification.
--   5. INSERT/UPDATE/DELETE non exposés aux clients anon/auth → pas de
--      policy d'écriture (les écritures passent toutes par des server
--      actions Prisma).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tables de contenu utilisateur — SELECT restreint
-- ----------------------------------------------------------------------------

ALTER TABLE public.deals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_images    ENABLE ROW LEVEL SECURITY;

-- Deals publiés uniquement (on EXCLUT DRAFT, PENDING_REVIEW, REJECTED,
-- REMOVED). EXPIRED reste lisible pour conserver l'historique accessible.
DROP POLICY IF EXISTS "deals_select_published" ON public.deals;
CREATE POLICY "deals_select_published"
ON public.deals FOR SELECT
TO anon, authenticated
USING (status IN ('PUBLISHED', 'EXPIRED'));

-- Listings publiés ou vendus/loués/archivés (tout ce qui a déjà été publié
-- au moins une fois). DRAFT/PENDING_REVIEW/REJECTED/REMOVED → privés.
DROP POLICY IF EXISTS "listings_select_public" ON public.listings;
CREATE POLICY "listings_select_public"
ON public.listings FOR SELECT
TO anon, authenticated
USING (status IN ('PUBLISHED', 'SOLD', 'EXPIRED', 'ARCHIVED'));

-- Commentaires : lisibles s'ils ne sont pas marqués supprimés. La
-- suppression logique est utilisée par la modération.
DROP POLICY IF EXISTS "comments_select_not_deleted" ON public.comments;
CREATE POLICY "comments_select_not_deleted"
ON public.comments FOR SELECT
TO anon, authenticated
USING ("isDeleted" = false);

-- Images attachées : accessibles si le post parent l'est. On se contente
-- d'un SELECT ouvert car les URLs sont des liens Supabase Storage signés
-- par un bucket public (cf. storage-setup.sql).
DROP POLICY IF EXISTS "deal_images_select_public" ON public.deal_images;
CREATE POLICY "deal_images_select_public"
ON public.deal_images FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "listing_images_select_public" ON public.listing_images;
CREATE POLICY "listing_images_select_public"
ON public.listing_images FOR SELECT
TO anon, authenticated
USING (true);

-- ----------------------------------------------------------------------------
-- 2) Tables de référence publique — SELECT ouvert
-- ----------------------------------------------------------------------------
-- Ces tables ne contiennent aucune donnée personnelle et sont déjà
-- affichées publiquement (listes déroulantes, filtres, pages catégorie…).

ALTER TABLE public.cities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_plans   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cities_select_all" ON public.cities;
CREATE POLICY "cities_select_all" ON public.cities FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_select_active" ON public.categories;
CREATE POLICY "categories_select_active" ON public.categories FOR SELECT TO anon, authenticated USING ("isActive" = true);

DROP POLICY IF EXISTS "stores_select_all" ON public.stores;
CREATE POLICY "stores_select_all" ON public.stores FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "merchants_select_all" ON public.merchants;
CREATE POLICY "merchants_select_all" ON public.merchants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tags_select_all" ON public.tags;
CREATE POLICY "tags_select_all" ON public.tags FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all" ON public.badges FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pro_plans_select_active" ON public.pro_plans;
CREATE POLICY "pro_plans_select_active" ON public.pro_plans FOR SELECT TO anon, authenticated USING ("isActive" = true);

-- ----------------------------------------------------------------------------
-- 3) Users — SELECT ultra restreint (champs publics seulement)
-- ----------------------------------------------------------------------------
-- Les utilisateurs sont affichés publiquement (auteur d'un deal, profil
-- public, classement karma). On autorise la SELECT sur la table mais on
-- ne l'utilise pas côté client — les server actions Prisma sélectionnent
-- elles-mêmes uniquement les champs appropriés. Les bannis et
-- shadow-bannés restent visibles (sinon on casse les threads).
-- NB : la colonne `email` reste présente dans la table mais les requêtes
-- passent par Prisma côté serveur — aucun client anon/auth n'a besoin
-- d'un SELECT direct. On ferme donc totalement.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Aucune policy SELECT → deny all pour anon/authenticated.
-- (Si un jour on veut exposer un profil public via supabase-js côté
-- client, on ajoutera ici un CREATE POLICY SELECT avec un USING
-- limité à id/username/avatarUrl/karma/level.)

-- ----------------------------------------------------------------------------
-- 4) Tables strictement privées — RLS ON, aucune policy = deny all
-- ----------------------------------------------------------------------------
-- Ces tables ne DOIVENT jamais être exposées à un client anon/auth.
-- L'accès se fait uniquement via Prisma après une vérification
-- `requireActiveUser()` côté serveur.

ALTER TABLE public.sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karma_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks      ENABLE ROW LEVEL SECURITY;

-- (Pas de CREATE POLICY — l'absence volontaire de policy empêche toute
-- lecture/écriture via supabase-js. Prisma continue d'y accéder via le
-- rôle `postgres` qui bypasse RLS.)

-- ----------------------------------------------------------------------------
-- 5) Tables de jointure many-to-many
-- ----------------------------------------------------------------------------
-- Prisma nomme ses tables implicites `_DealTags`, `_ListingTags`, `_BadgeToUser`.
-- On les trouve avec :
--   SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '\_%';
-- On active RLS dessus pour le principe, sans policy (écriture uniquement
-- via Prisma). Si le nom diffère dans ton déploiement (Prisma peut générer
-- une variante), adapte.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename LIKE '\_%' ESCAPE '\'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ============================================================================
-- Fin. Vérification manuelle recommandée :
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname='public'
--   ORDER BY tablename;
-- Toutes les lignes doivent avoir `rowsecurity = true`.
-- ============================================================================
