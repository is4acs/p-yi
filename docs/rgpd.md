# RGPD — Runbook développeur

Ce document regroupe **tout ce qu'il faut savoir** sur la conformité
RGPD de Péyi : où sont les droits utilisateurs dans le code, comment
répondre à une demande manuelle, quelle durée de rétention on applique,
quels sont les sous-traitants. À maintenir à jour à chaque fois que
la collecte ou le traitement de données évolue.

Les pages publiques côté utilisateur sont :
- `/confidentialite` — politique de confidentialité
- `/cgu` — CGU
- `/cookies` — politique cookies
- `/mentions-legales` — éditeur, hébergeur

Le hub utilisateur (connecté) est `/profil/confidentialite`.

---

## 1. Droits RGPD — où sont-ils dans le code

| Droit | Art. | Accès utilisateur | Code |
|-------|------|-------------------|------|
| Information | 13 | `/confidentialite` | `src/app/confidentialite/page.tsx` |
| Accès | 15 | `/profil` + `/api/me/export` | `src/app/profil/page.tsx`, `src/app/api/me/export/route.ts` |
| Rectification | 16 | `/profil/edit` | `src/app/profil/edit/actions.ts` |
| Effacement | 17 | `/profil/confidentialite/supprimer` | `src/app/profil/confidentialite/supprimer/actions.ts` |
| Portabilité | 20 | `/api/me/export` (JSON) | `src/app/api/me/export/route.ts` |
| Opposition | 21 | `/notifications` (préférences) | `src/app/notifications/...` |
| Limitation | 18 | Par email à `contact@peyi.gf` | CLI : `npm run delete-user -- <email>` pour effacement |

Aucun droit n'est conditionné au statut du compte (un user banni peut
toujours exercer ses droits — c'est une exigence légale).

---

## 2. Répondre à une demande manuelle (arrivée par email / courrier)

### A. Demande d'accès / export
1. Vérifier l'identité (pour un email de demande : confirmer que
   l'adresse correspond à l'email du compte — sinon exiger une pièce
   d'identité scannée).
2. Générer l'export JSON avec la même query que `/api/me/export`
   (voir le code). Ou demander à l'utilisateur de se connecter et
   d'utiliser le bouton du hub.
3. Envoyer le JSON par email chiffré (ou via un lien Supabase Storage
   signé à durée limitée).
4. **Délai légal : 1 mois**, extensible à 3 mois si demande complexe.

### B. Demande de rectification
1. Vérifier l'identité.
2. Faire la modification via Prisma Studio (`npm run db:studio`) ou
   une UPDATE SQL ciblée.
3. Documenter dans un fichier interne qui, quoi, quand.

### C. Demande d'effacement (RGPD art. 17)
1. Vérifier l'identité.
2. Lancer la CLI :
   ```bash
   npm run delete-user -- <email>
   ```
   Ce script reproduit exactement la logique de `deleteMyAccountAction`.
   Il demande une confirmation interactive ("tape SUPPRIMER").
3. Notifier l'utilisateur par email une fois la suppression effectuée.

### D. Demande d'opposition / limitation
Cas rare en pratique sur Péyi (pas de profiling publicitaire). Si un
user demande l'arrêt du traitement sans effacement :
- Désactiver les notifications (UPDATE `notificationSettings`)
- Passer `isBanned=true` avec `banReason="Opposition RGPD art. 21"`
  pour bloquer toute création de contenu

---

## 3. Stratégie de suppression — ce qui se passe techniquement

Voir `src/app/profil/confidentialite/supprimer/actions.ts` pour
l'implémentation canonique. Résumé :

### Supprimé par cascade Prisma (onDelete: Cascade)
- Session, Deal (+DealImage, Vote, Favorite, Click, Report deal)
- Listing (+ListingImage, Favorite, Report listing)
- Vote, Favorite, Alert, KarmaHistory, Notification reçues
- Commentaires **sans replies tierces**

### Anonymisé (réattaché au user système `__deleted__`)
- Commentaires avec replies d'autres users → content `[compte supprimé]`, `isDeleted=true`
- Messages envoyés → content `[message supprimé par un utilisateur]`, senderId → système
- Messages reçus → recipientId → système (contenu conservé pour l'autre partie)
- Reports → reporterId → système
- AdminActionLog → adminId → système

### Détaché
- Report.reportedUserId → null

### Pré-traitement
- `Message.listingId` pour les listings de l'user → NULL (la FK
  Message→Listing n'a pas de cascade, il faut casser la référence
  AVANT le cascade User→Listing)

### Post-traitement
- Vider `listings/<uid>/*` et `deals/<uid>/*` dans Supabase Storage
- Supprimer l'entrée `auth.users` via service role

### Compte système `__deleted__`
Créé à la demande par `getOrCreateDeletedUser()` dans
`src/lib/auth/deleted-user.ts`. Marqué `isBanned=true` pour qu'il
n'apparaisse jamais comme actif.

---

## 4. Durée de rétention

| Donnée | Durée | Justification |
|--------|-------|---------------|
| Compte actif (profil, préférences) | Tant que le compte existe | Consentement utilisateur |
| Compte inactif (pas de connexion) | 3 ans puis email de réactivation, puis suppression | Recommandation CNIL |
| Annonces | Tant que le compte existe, sauf archivage manuel | Utilité métier |
| Bons plans | Tant que le compte existe | Utilité métier |
| Messages privés | Tant que les 2 comptes existent | Utilité utilisateur |
| Logs admin (AdminActionLog) | 3 ans | Audit de modération, obligation légale |
| Logs d'authentification (Supabase Auth) | 90 jours (défaut Supabase) | Sécurité |
| Logs applicatifs (Vercel) | 30 jours (défaut Vercel) | Debug |
| Sessions | 30 jours (TTL Supabase) | Sécurité |
| Clicks (tracking) | 2 ans | Analytics affiliation |
| Données post-suppression utilisateur | 0 (suppression immédiate) | RGPD art. 17 |

⚠️ La règle "3 ans d'inactivité puis suppression" n'est PAS encore
implémentée (pas de CRON). À faire en S23+.

---

## 5. Sous-traitants (art. 28 RGPD)

| Sous-traitant | Rôle | Localisation | Base légale transfert |
|---------------|------|--------------|----------------------|
| Vercel Inc. | Hébergement web (PaaS) | États-Unis | DPF + CCT |
| Supabase Inc. | Base de données + Auth + Storage | Singapour (région AP) | CCT |
| Upstash Inc. | Redis (rate limiting + cache) | États-Unis | DPF + CCT |
| Twilio Inc. | SMS OTP pour vérification téléphone | États-Unis | DPF + CCT |
| Google LLC | OAuth login (optionnel) | États-Unis | DPF + CCT |

Aucune donnée n'est envoyée à des régies publicitaires ou à des
plateformes d'analytics tiers (pas de Google Analytics, pas de Meta
Pixel, pas de Hotjar…). Voir `/cookies` pour les détails.

---

## 6. Cookies et traceurs

Cf. `src/app/cookies/page.tsx`. Péyi n'utilise QUE des cookies
strictement nécessaires :
- `sb-*-auth-token` (Supabase session)
- `sb-*-auth-token-code-verifier` (anti-CSRF OAuth/OTP, 10 min)

→ **Pas de bannière de consentement** (art. 82 Loi Informatique et
Libertés — exemption CNIL pour les cookies essentiels).

Si un traceur analytics est ajouté à l'avenir (ex. Plausible,
Vercel Analytics), ce doc doit être mis à jour ET :
- Soit l'outil est "privacy-first" sans cookie (Plausible) → pas
  de bannière mais mise à jour de `/cookies` et `/confidentialite`
- Soit l'outil pose un cookie non-essentiel (Vercel Analytics,
  Google Analytics) → bannière de consentement obligatoire

---

## 7. Procédure en cas de violation de données (art. 33)

Si une fuite est suspectée ou confirmée :

1. **0-1h** : Arrêter la fuite (revoquer clés, bannir IP, rollback
   déploiement).
2. **1-24h** : Évaluer l'ampleur (quelles tables, combien d'users,
   quels champs).
3. **< 72h** : Notifier la CNIL si risque pour les droits et libertés
   des personnes → formulaire en ligne.
4. **Sans délai** : Notifier les utilisateurs concernés si risque
   élevé → email + push + message in-app.

Contact CNIL : [cnil.fr/notifier-fuite](https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles).

---

## 8. Contact DPO

Péyi n'a pas de DPO désigné (seuil non atteint : < 250 salariés,
pas de traitement à grande échelle de données sensibles). Les
demandes RGPD passent par `contact@peyi.gf`.

Si le seuil est franchi (ex. > 5000 users actifs mensuels avec
catégories sensibles), désigner un DPO et déclarer à la CNIL.

---

## 9. Checklist par release

À cocher à chaque déploiement d'une feature qui touche aux données
personnelles :

- [ ] Les nouvelles données collectées sont-elles listées dans
      `/confidentialite` ?
- [ ] La base légale du traitement est-elle identifiée ?
- [ ] La durée de rétention est-elle documentée dans ce fichier ?
- [ ] Les nouvelles données sont-elles incluses dans `/api/me/export` ?
- [ ] La suppression de compte (CLI + UI) gère-t-elle ces nouvelles
      données ?
- [ ] Si sous-traitant ajouté : listé section 5 + CCT/DPF vérifiés ?
