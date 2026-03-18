# Stripe Trial Payment Collection & Blocking UX

**Date**: 2026-03-13
**Status**: Validated

## Overview

Adapt Stripe billing so that users on free trial who enter payment info are NOT charged until the day after trial ends. Enhance warning banners to encourage payment info entry with "0 EUR today" messaging. Block properties and stop notifications when trial expires without payment.

## 1. Stripe Checkout with trial_end

### createCheckoutSessionAction changes
- When user is `trialing`, pass `subscription_data.trial_end` = current trial_end timestamp (unix)
- Stripe collects payment method, creates subscription in `trialing` status
- User sees "0,00 EUR today" natively on Stripe Checkout page
- `payment_method_collection: 'always'`

### verifyCheckoutSession changes
- Stripe returns `trialing` status (not `active`) — `mapStripeStatus()` already handles this
- Update subscription DB with `stripe_subscription_id`, `stripe_customer_id`
- Set `payment_method_added = true`
- Status stays `trialing` — no visible change for user

### Webhooks
- `customer.subscription.created`: received immediately → upsert with status `trialing`
- `customer.subscription.updated`: received at `trial_end` → status becomes `active`, first invoice
- No webhook handler changes needed — existing handlers cover all statuses

## 2. New DB Fields

```sql
ALTER TABLE subscriptions ADD COLUMN payment_method_added BOOLEAN DEFAULT FALSE;
ALTER TABLE subscriptions ADD COLUMN trial_warning_emails_sent TEXT[] DEFAULT '{}';
```

## 3. Trial Banner Messaging (Last 7 Days)

### If payment_method_added === false

| Days left | Color  | Icon          | Message | CTA |
|-----------|--------|---------------|---------|-----|
| 7-4       | Blue   | Zap           | "Votre essai se termine le [date]. Securisez votre acces — aucun debit avant la fin de l'essai." | "Ajouter mon moyen de paiement" |
| 3-2       | Amber  | Clock         | "Plus que X jours. Vos [N] lots et [M] interventions seront bloques sans abonnement." | "Continuer avec SEIDO — 0 EUR aujourd'hui" |
| 1         | Red    | AlertTriangle | "Dernier jour. Sans moyen de paiement, vos biens seront bloques et vous ne recevrez plus aucune notification." | "Activer maintenant — 0 EUR aujourd'hui" |

Sub-CTA line: "Annulation en 1 clic - Sans engagement"

### If payment_method_added === true

| Days left | Color | Message |
|-----------|-------|---------|
| 7-1       | Green | "Vous etes pret. Votre abonnement demarrera automatiquement le [date]. Aucun debit avant cette date." |

Dismissible, reassuring tone.

### Dismissibility
- 7-4 days: dismissible (24h via localStorage)
- 3-2 days: dismissible once per session (sessionStorage)
- 1 day: non-dismissible

### Visibility
- Gestionnaire admin only — team collaborators do NOT see billing banners

### Data needed
- `payment_method_added: boolean` (new)
- `lot_count: number` (existing via actual_lots)
- `intervention_count: number` (new count query)

## 4. Blocked Mode Post-Expiration

### Trigger
When CRON `trial-expiration` sets status to `read_only` (>2 lots) or `checkReadOnly()` returns true.

### List behavior (lots, buildings, interventions, contacts)
- Each card/row shows ONLY: name + address (or title for interventions)
- Rest of info is hidden (no status, no date, no tags)
- Cursor: cursor-not-allowed
- Click: disabled (no navigation)
- Reduced opacity: opacity-60 on items
- "Create" / "New" buttons: disabled with tooltip "Activez votre abonnement"

### Fixed banner on ALL gestionnaire pages

```
+---------------------------------------------------------------+
| Votre essai est termine. Vos donnees sont intactes.            |
|                                                                |
| Pour acceder a vos [N] lots, creer des interventions et       |
| recevoir les notifications de vos locataires, activez votre   |
| abonnement.                                                    |
|                                                                |
| [Activer SEIDO — a partir de 5 EUR/lot/mois]  [Voir les tarifs]|
|                                                                |
| Annulation en 1 clic - Sans engagement - Donnees preservees    |
|                                                                |
| Vous ne souhaitez pas continuer ? Contactez-nous pour          |
| demander un export de vos donnees.              [Nous contacter]|
+---------------------------------------------------------------+
```

Non-dismissible. Soft red background (destructive at 10% opacity), dark text.

### Detail pages
- If user navigates to `/lots/[id]` or `/interventions/[id]` (direct URL, bookmark):
  - Redirect to corresponding list (where they see blocked items + banner)
  - Do NOT render the detail page

### Notification blocking
- In notification service (email + push): check `subscription.status` before sending
- If `read_only` or `incomplete_expired` → skip silently
- Log for monitoring but no error

## 5. Login Modal (Day 28, 2 days remaining)

Shown once per session (sessionStorage flag). NOT shown if payment_method_added === true.

```
+---------------------------------------------------------------+
|                                                                |
|   Votre essai se termine dans 2 jours.                        |
|                                                                |
|   Vous avez cree [N] lots et gere [M] interventions.          |
|   Ne perdez pas cet elan.                                      |
|                                                                |
|   [Activer mon abonnement — 0 EUR aujourd'hui]                |
|                                                                |
|   Aucun debit avant le [date] - Annulation en 1 clic          |
|                                                                |
|                          Plus tard                             |
+---------------------------------------------------------------+
```

- Radix Dialog, semi-transparent backdrop
- "Plus tard" = discreet text link, closes modal
- Only on dashboard load after login, NEVER during workflow

## 6. Billing Page Badge

When user is `trialing` and visits `/settings/billing`:

```
+--------------------------------------+
|  check Essai en cours                |
|  0 EUR maintenant                    |
|  Premier paiement le [date]          |
+--------------------------------------+
```

Green badge next to subscription button.

## 7. Warning Emails

### New CRON job: trial-warnings (daily)

| Day | Subject | Key content |
|-----|---------|-------------|
| J23 (7d left) | "Votre essai SEIDO se termine le [date]" | Activity recap. CTA: "Ajouter mon moyen de paiement — 0 EUR aujourd'hui" |
| J27 (3d left) | "Plus que 3 jours pour continuer avec SEIDO" | Consequences: blocked + no notifications. CTA: "Continuer avec SEIDO — 0 EUR aujourd'hui" |
| J29 (1d left) | "Dernier jour d'essai — securisez votre acces" | Direct tone. CTA: "Activer maintenant — 0 EUR aujourd'hui" |

NOT sent if `payment_method_added === true`.

### Post-expiration emails (only if read_only + no payment method)

| Day | Subject | Tone |
|-----|---------|------|
| J34 (4d after) | "Vos donnees vous attendent sur SEIDO" | Gentle reminder |
| J44 (14d after) | "Comment pouvons-nous vous aider ?" | Human, propose a call |

### Tracking
`trial_warning_emails_sent TEXT[]` — CRON appends 'J23', 'J27', 'J29' after each send → idempotent.

### Modified email: trial-expired.tsx
- >2 lots, no payment: add consequences + CTA + discreet "Contactez-nous pour un export de vos donnees"
- >2 lots, with payment: email NOT sent (Stripe handles transition)

## 8. Tenant / Supplier Blocked

### Detection
New helper: `isTeamSubscriptionBlocked(teamId)` — checks subscription status of the team

### Tenant behavior
- Property list: name visible, rest hidden, non-clickable, opacity-60
- "Report a problem" button: disabled
- Fixed banner (neutral gray, NOT red):
  ```
  Les services pour ce bien sont temporairement suspendus.
  Votre gestionnaire a ete informe.
  Pour toute urgence, contactez directement votre gestionnaire ou notre support. [Nous contacter]
  Pour toute question concernant vos donnees, contactez votre gestionnaire ou notre support.
  ```

### Supplier behavior
- Intervention list: title visible, rest hidden, non-clickable
- **EXCEPTION**: Interventions with status `en_cours`, `planifiee`, or `en_attente_devis` remain FULLY accessible (read + write)
- New assignments: impossible
- Fixed banner:
  ```
  L'acces a certains biens est temporairement limite.
  Les interventions en cours restent accessibles.
  Pour toute question, contactez notre support. [Nous contacter]
  ```

## Files Impact Summary

### Modified files (~15)
- `app/actions/subscription-actions.ts` — createCheckoutSessionAction, verifyCheckoutSession, getSubscriptionInfo
- `components/billing/trial-banner.tsx` — new messaging matrix
- `components/billing/read-only-banner.tsx` — new blocked mode design
- `components/billing/subscription-banners.tsx` — pass new props
- `components/billing/subscription-sidebar-card.tsx` — reflect payment_method_added
- `app/gestionnaire/(with-navbar)/settings/billing/billing-page-client.tsx` — green badge
- `lib/services/domain/subscription.service.ts` — getSubscriptionInfo, checkReadOnly
- `lib/services/domain/stripe-webhook.handler.ts` — set payment_method_added on subscription.created
- `app/api/cron/trial-expiration/route.ts` — skip teams with payment_method_added
- `emails/templates/billing/trial-expired.tsx` — add export data link
- List components (lots, buildings, interventions, contacts) — blocked mode rendering
- Tenant/supplier layouts — subscription check + banners

### New files (~8)
- Migration: payment_method_added + trial_warning_emails_sent columns
- `app/api/cron/trial-warnings/route.ts` — new daily CRON
- `emails/templates/billing/trial-warning-7d.tsx`
- `emails/templates/billing/trial-warning-3d.tsx`
- `emails/templates/billing/trial-warning-1d.tsx`
- `emails/templates/billing/trial-reminder-4d.tsx`
- `emails/templates/billing/trial-reminder-14d.tsx`
- Dashboard login modal component
