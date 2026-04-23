# Checklist Search Console — Péyi

## 1) Propriété à déclarer
- Domaine principal à déclarer: `peyi.gf` (propriété Domaine).
- Vérifier aussi les variantes si utilisées en production:
  - `https://www.peyi.gf`
  - `https://peyi.gf`
  - (si actif) ancien domaine `https://peyi.com` pour suivi de transition/canonical.

## 2) Sitemaps à soumettre
- Index principal: `/sitemap.xml`
- Sous-sitemaps (automatiques):
  - `/sitemap-pages.xml`
  - `/sitemap-deals.xml`
  - `/sitemap-annonces.xml`
  - `/sitemap-images.xml`

## 3) Inspection URL (priorité haute)
- Vérifier indexation et canonical de:
  - `/bons-plans/guyane`
  - `/annonces/guyane`
  - `/bons-plans/cayenne`
  - `/annonces/cayenne`
  - `/annonces/voitures/guyane`
  - `/annonces/immobilier/guyane`
  - `/magasins/hyper-u-cayenne`
  - `/guide/bons-plans-guyane`

## 4) Suivi indexation
- Rapport "Pages":
  - Surveiller "Explorée, actuellement non indexée".
  - Contrôler que les pages privées restent non indexées (`/profil*`, `/messages*`, `/poster*`, `/notifications`, `/recherche`).
  - Vérifier l’absence d’indexation des variantes à query params (pages filtrées noindex).

## 5) Suivi performances SEO
- Rapport "Performances" avec filtres:
  - Requêtes contenant: `bons plans guyane`, `annonces guyane`, `annonces voiture guyane`, `annonces immobilier guyane`.
  - Requêtes locales ville + intention:
    - `bons plans cayenne`, `annonces cayenne`, `annonces kourou`, `annonces matoury`.
- Suivre CTR, position moyenne, URL qui gagnent/perdent.

## 6) Core Web Vitals
- Surveiller le rapport CWV mobile en priorité.
- Corriger en priorité les pages piliers et fiches détail si "Mauvais" ou "À améliorer".

## 7) Enhancements / Rich Results
- Contrôler les rapports d’enrichissements (Product/FAQ si détectés).
- Vérifier que les JSON-LD restent fidèles au contenu visible.
- Traiter rapidement les erreurs de propriétés manquantes/invalides.

## 8) Routine hebdo recommandée
- Re-soumettre sitemap si gros lot de nouvelles fiches.
- Inspecter 5 URLs piliers + 5 fiches récentes.
- Vérifier évolution des requêtes locales Guyane (impressions/clics).
