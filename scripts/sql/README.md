# SQL Pack - Stabilisation annonces / bons plans

Ce dossier contient un pack SQL PostgreSQL/Supabase pour:

- remettre en place les référentiels critiques (villes, catégories, magasins SEO),
- fiabiliser les données (normalisation + expiration automatique des contenus périmés),
- améliorer les performances des requêtes liste/détail (et réduire les timeouts),
- fournir des fonctions d'upsert robustes pour l'ingestion.

## Ordre d'exécution recommandé

1. `01_seed_reference_marketplace.sql`
2. `02_harden_marketplace_queries_and_data.sql`
3. `03_upsert_functions_for_ingest.sql`
4. `04_post_import_checks.sql`

## Où exécuter

- Supabase SQL Editor, ou
- `psql` connecté à la base de prod/staging.

## Notes

- Les scripts sont idempotents (`ON CONFLICT`, `IF NOT EXISTS`, `CREATE OR REPLACE`).
- Le script `02` crée des index; idéalement l'exécuter en période de trafic bas.
- Le script `03` centralise les validations métiers (catégorie, ville, magasin, slug unique) pour éviter d'injecter des lignes cassées.

## Exemples d'upsert (script 03)

```sql
SELECT public.peyi_upsert_deal(
  p_author_id      => 'USER_ID',
  p_title          => 'Promo riz 5kg',
  p_description    => 'Sac de riz 5kg en promo cette semaine.',
  p_price          => 8.90,
  p_original_price => 11.50,
  p_category_slug  => 'supermarche-alimentation',
  p_city_slug      => 'cayenne',
  p_store_slug     => 'hyper-u-cayenne',
  p_external_url   => 'https://exemple.tld/promo-riz'
);
```

```sql
SELECT public.peyi_upsert_listing(
  p_author_id      => 'USER_ID',
  p_title          => 'Toyota Yaris 2018',
  p_description    => 'Bon etat, entretien a jour.',
  p_category_slug  => 'voitures',
  p_city_slug      => 'matoury',
  p_price          => 8900,
  p_attributes     => '{\"brand\":\"Toyota\",\"year\":2018,\"fuel\":\"essence\"}'::jsonb
);
```
