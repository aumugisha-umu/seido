# Admin Notification Emails — Design

**Date**: 2026-03-16
**Status**: Validated

## Objectif

Envoyer des emails internes riches à l'équipe fondateur (`ADMIN_NOTIFICATION_EMAILS`) pour 4 événements clés du cycle de vie utilisateur, avec suivi MRR/ARR individuel et plateforme.

## Configuration

```env
ADMIN_NOTIFICATION_EMAILS=arthur@seido-app.pm
# Supporte multiple : arthur@seido-app.pm,co-founder@seido-app.pm
```

Parse via `split(',').map(trim).filter(Boolean)` — fonctionne avec 1 ou N adresses.

## 4 Événements

### 1. Nouvel inscrit

**Sujet** : `[SEIDO] 🟢 Nouvel inscrit — {Prénom Nom}`

| Champ | Source |
|-------|--------|
| Nom complet | `users.first_name` + `users.last_name` |
| Email | `users.email` |
| Méthode d'inscription | Email / Google OAuth (déduit du flow) |
| Date/heure | `now()` |
| Total utilisateurs plateforme | `COUNT(*)` sur `users` |

**Point d'accroche** :
- Email signup : `app/auth/callback/page.tsx` (après confirmation)
- OAuth signup : `app/auth/complete-profile/actions.ts` (après `completeOAuthProfileAction`)

### 2. Abonnement créé / lots modifiés

**Sujet upgrade** : `[SEIDO] 🔵 +€{delta}MRR — {Nom} (+{n} lots)`
**Sujet downgrade** : `[SEIDO] 🟠 -€{delta}MRR — {Nom} (-{n} lots)`

| Champ | Source |
|-------|--------|
| Nom complet | `users.first_name` + `users.last_name` |
| Email | `users.email` |
| Équipe | `teams.name` |
| Plan | Déduit de `price_id` (annuel/mensuel) |
| Lots | ancien → nouveau (delta) |
| MRR individuel | `calculateIndividualMrr(lots, priceId)` |
| ARR individuel | MRR × 12 |
| Delta MRR | nouveau MRR - ancien MRR |
| MRR plateforme | `calculatePlatformMrr()` |
| ARR plateforme | MRR plateforme × 12 |

**Point d'accroche** : `stripe-webhook.handler.ts` après `handleSubscriptionCreated` et `handleSubscriptionUpdated` (quand `subscribed_lots` change)

### 3. Abonnement annulé (Churn)

**Sujet** : `[SEIDO] 🔴 -€{mrr}MRR — Churn {Nom}`

| Champ | Source |
|-------|--------|
| Nom complet | `users.first_name` + `users.last_name` |
| Email | `users.email` |
| Équipe | `teams.name` |
| Plan perdu | Déduit de `price_id` |
| Lots perdus | `subscribed_lots` avant annulation |
| MRR perdu | `calculateIndividualMrr(lots, priceId)` |
| ARR perdu | MRR × 12 |
| Durée d'abonnement | `current_period_start` initial → now |
| MRR plateforme | `calculatePlatformMrr()` (post-annulation) |
| ARR plateforme | MRR plateforme × 12 |

**Point d'accroche** : `stripe-webhook.handler.ts` après `handleSubscriptionDeleted`

### 4. Trial expiré

**Sujet** : `[SEIDO] ⚪ Trial expiré — {Nom} → {nouveau_statut}`

| Champ | Source |
|-------|--------|
| Nom complet | `users.first_name` + `users.last_name` |
| Email | `users.email` |
| Équipe | `teams.name` |
| Nouveau statut | `free_tier` / `read_only` |
| Lots au moment de l'expiration | `billable_properties` |
| Durée d'utilisation | `trial_start` → `trial_end` |
| Interventions créées | `COUNT(*)` sur `interventions` pour le `team_id` |

**Point d'accroche** : `app/api/cron/trial-expiration/route.ts` après basculement de statut

## Architecture

### Structure fichiers

```
lib/services/domain/admin-notification/
  ├── admin-notification.service.ts   // 4 méthodes publiques
  ├── admin-email-builder.ts          // Génère le HTML (template unique paramétré)
  └── admin-mrr.helper.ts             // Calculs MRR/ARR individuel + plateforme
```

### Service principal — `AdminNotificationService`

```typescript
class AdminNotificationService {
  notifyNewSignup(user, method: 'email' | 'oauth')
  notifySubscriptionChange(teamId, oldLots, newLots, priceId)
  notifySubscriptionCancelled(teamId, lotsLost, priceId, subscriptionStart)
  notifyTrialExpired(teamId, lotCount, newStatus, signupDate, interventionCount)
}
```

- Utilise `EmailService.send()` (Resend) existant
- Non-bloquant : appelé via `after()` ou fire-and-forget dans les webhooks
- Échec silencieux (log error, ne bloque pas le flow principal)

### Calcul MRR

```typescript
// Individuel
function calculateIndividualMrr(lots: number, priceId: string): number {
  const isAnnual = priceId === STRIPE_PRICES.annual
  return isAnnual ? (lots * 5000) / 12 : lots * 500  // centimes
}

// Plateforme — SUM sur toutes les subscriptions actives
async function calculatePlatformMrr(supabase): Promise<number> {
  // Requête SQL :
  // SELECT SUM(CASE
  //   WHEN price_id = {ANNUAL_PRICE_ID} THEN subscribed_lots * 5000 / 12
  //   ELSE subscribed_lots * 500
  // END) FROM subscriptions
  // WHERE status IN ('active', 'trialing')
}
```

### Template HTML

- HTML inline minimaliste, fond blanc, tableau bordures légères
- Badge coloré en haut selon le type :
  - 🟢 Vert : inscription
  - 🔵 Bleu : upgrade / nouvel abonnement
  - 🟠 Orange : downgrade
  - 🔴 Rouge : churn
  - ⚪ Gris : trial expiré
- Pas de logo, pas de footer marketing
- Police système (`-apple-system, Arial`)
- Responsive (une seule colonne)
- Un seul template paramétré par type/couleur

### Env var parsing

```typescript
function getAdminRecipients(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS ?? ''
  return raw.split(',').map(e => e.trim()).filter(Boolean)
}
```

## Points d'attention

- **Non-bloquant** : les emails admin ne doivent JAMAIS bloquer le flow utilisateur
- **Idempotence webhook** : la table `stripe_webhook_events` empêche déjà les doublons
- **subscribed_lots delta** : comparer ancien vs nouveau dans `handleSubscriptionUpdated` pour ne pas spammer si rien ne change
- **Service role** pour `calculatePlatformMrr()` : requête cross-team, pas d'accès via RLS utilisateur
- **Graceful degradation** : si `ADMIN_NOTIFICATION_EMAILS` est vide, ne rien envoyer (pas d'erreur)
