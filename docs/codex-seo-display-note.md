# Note CODEX — Optimisation affichage bloc SEO home

Date: 2026-04-23  
Branche: `codex/seo-local-guyane-architecture`

## Contexte
Le bloc "Explorer la Guyane par ville et catégorie" était SEO-riche mais visuellement trop dense (longues ancres répétitives), ce qui nuisait à la lisibilité sur desktop et mobile.

## Changements appliqués
- Refonte du composant `src/components/seo/HomePillarLinks.tsx`.
- Ajustement de layout home dans `src/app/page.tsx`:
  - largeur max desktop activée plus tôt (`lg:max-w-5xl`)
  - section deals/annonces en split layout dès `lg` (et non `xl`)
  - objectif: éviter un bloc SEO très dense au-dessus d'un contenu trop étroit.
- Conservation de tous les liens piliers SEO importants (Guyane, villes, catégories).
- Réorganisation UX en 2 colonnes claires:
  - `Bons plans`
  - `Petites annonces`
- Hiérarchie interne explicite:
  - sous-bloc `Villes`
  - sous-bloc `Catégories`
- Ancres raccourcies et plus lisibles, tout en restant descriptives SEO:
  - ex. `Bons plans Cayenne`, `Annonces Immobilier Guyane`.
- Passage des listes longues à une grille de liens "pill" pour améliorer le scan visuel et réduire l'effet "mur de texte".

## Effet attendu
- Meilleure UX (lecture + navigation) sans sacrifier le maillage interne SEO.
- Plus forte probabilité de clic sur les pages piliers (villes/catégories).
- Bloc SEO perçu comme utile par l'utilisateur, pas comme "texte optimisé" trop répétitif.

## Point de vigilance
- Après mise en prod, vérifier le CTR des pages piliers dans Search Console (requêtes locales + pages d'atterrissage) pour confirmer le gain UX/SEO.
