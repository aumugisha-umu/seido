# Strategie Coupons Stripe — SEIDO

## Principes

- **Pourcentage uniquement** (pas de montant fixe) — simplifie la gestion multi-devise future
- **Durees flexibles** : `once` (1ere facture), `repeating` (N mois), `forever`
- **Promotion codes** actives dans Checkout via `allow_promotion_codes: true`
- Les coupons sont crees dans le Stripe Dashboard (pas en code)

## Coupons Configures

### Mode Test

| Code | Reduction | Duree | Expiration | Usage |
|------|-----------|-------|------------|-------|
| SEIDOBETA26 | 25% | Forever | 1 avril 2026 | Beta testers early adopters |

### Production (a creer)

| Code | Reduction | Duree | Expiration | Usage |
|------|-----------|-------|------------|-------|
| EARLY2026 | 100% | 3 mois (repeating) | 30 juin 2026 | Premiers clients — 3 mois gratuits |
| REFERRAL | 100% | 1 mois (once) | Pas d'expiration | Parrainage — 1 mois gratuit |
| ANNUAL20 | 20% | Forever | Pas d'expiration | Incentive long terme pour annuel |

## Guide Creation Coupon

1. **Stripe Dashboard** > Produits > Coupons > + Nouveau coupon
2. Type : **Pourcentage**
3. Reduction : X%
4. Duree : `once` / `repeating` (N mois) / `forever`
5. Code promo : **Creer un code** (le coupon seul ne suffit pas pour Checkout)
6. Restrictions optionnelles :
   - Date d'expiration
   - Nombre max d'utilisations
   - Premier paiement uniquement
   - Prix specifique (annuel/mensuel)

## Configuration Code

```typescript
// lib/services/domain/subscription.service.ts — createCheckoutSession()
const session = await stripe.checkout.sessions.create({
  // ...
  allow_promotion_codes: true,  // Active le champ "Code promo" dans Checkout
})
```

## Bonnes Pratiques

- **Ne pas creer de coupons 100% forever** — risque de perte de revenus permanente
- **Toujours mettre une expiration** sur les coupons marketing (3-6 mois max)
- **Coupons parrainage** : `once` (1 mois) pour limiter l'impact financier
- **Tracker l'usage** dans Stripe Dashboard > Coupons > Analytics
- **Tester en mode test** avant de creer en production

## Win-back Integration

Le template `win-back.tsx` accepte un `promoCode` et `promoDiscount` optionnels.
Si un coupon win-back est actif, le CRON behavioral-triggers peut l'inclure dans l'email.

```typescript
await emailService.sendWinBack(email, {
  // ...
  promoCode: 'SEIDOBETA26',
  promoDiscount: 25,
})
```
