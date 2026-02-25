# Guide Admin Stripe — SEIDO

## Extension de Trial

Pour prolonger l'essai d'une equipe, executer dans le **Supabase SQL Editor** :

```sql
-- Prolonger de 7 jours
UPDATE subscriptions
SET trial_end = trial_end + INTERVAL '7 days',
    updated_at = now()
WHERE team_id = 'UUID_DE_LEQUIPE';

-- Prolonger de 30 jours
UPDATE subscriptions
SET trial_end = trial_end + INTERVAL '30 days',
    updated_at = now()
WHERE team_id = 'UUID_DE_LEQUIPE';

-- Verifier le resultat
SELECT team_id, status, trial_start, trial_end, billable_properties
FROM subscriptions
WHERE team_id = 'UUID_DE_LEQUIPE';
```

### Reinitialiser les flags de notification

Si l'essai est prolonge, reinitialiser les flags pour que les notifications J-7/J-3/J-1 soient renvoyees :

```sql
UPDATE subscriptions
SET notification_j7_sent = false,
    notification_j3_sent = false,
    notification_j1_sent = false,
    trial_expired_email_sent = false,
    updated_at = now()
WHERE team_id = 'UUID_DE_LEQUIPE';
```

### Reactiver un compte read_only en trial

```sql
UPDATE subscriptions
SET status = 'trialing',
    trial_end = now() + INTERVAL '30 days',
    notification_j7_sent = false,
    notification_j3_sent = false,
    notification_j1_sent = false,
    trial_expired_email_sent = false,
    updated_at = now()
WHERE team_id = 'UUID_DE_LEQUIPE';
```

## Trouver un Team ID

```sql
-- Par email de l'admin
SELECT t.id as team_id, t.name, tm.role, u.email
FROM teams t
JOIN team_members tm ON tm.team_id = t.id
JOIN users u ON u.id = tm.user_id
WHERE u.email = 'admin@example.com'
  AND tm.left_at IS NULL;

-- Par nom d'equipe
SELECT id, name FROM teams WHERE name ILIKE '%nom%';
```

## Verifier l'etat d'un abonnement

```sql
SELECT
  s.team_id,
  t.name as team_name,
  s.status,
  s.trial_start,
  s.trial_end,
  s.billable_properties,
  s.subscribed_lots,
  s.stripe_subscription_id,
  s.cancel_at_period_end,
  s.current_period_end
FROM subscriptions s
JOIN teams t ON t.id = s.team_id
WHERE s.team_id = 'UUID_DE_LEQUIPE';
```

## Gestion des Coupons

Voir `docs/stripe/coupon-strategy.md` pour la strategie et le guide de creation.
