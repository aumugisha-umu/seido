# Design: AI Pricing Addon on Landing Page

**Date:** 2026-03-29
**Scope:** `components/pricing-cards.tsx` + `components/landing/landing-page.tsx` + `lib/stripe.ts`

## Layout

```
[Toggle Mensuel / Annuel]
[Slider nombre de biens]
[Card Gestion unique — prix switch selon toggle]
[Bloc Addon IA — 3 tiers, prix switch selon toggle]
  [Solo 49€] [Equipe 99€] [Agence 199€]
```

## Changes

### 1. Toggle mois/an above pricing
- New state `billingInterval: 'month' | 'year'` in landing-page.tsx
- Toggle component above the slider

### 2. Single Gestion card (replaces 2-card grid)
- Shows 5€/lot/mois or 50€/lot/an based on toggle
- Badge "-17%" on annual
- Badge "Import Pro Offert" only on annual
- Combined features from both cards

### 3. AI Addon bloc below
- Title: "Assistant IA" + badge "Addon"
- 3 tiers: Solo / Equipe (popular) / Agence
- Prices from AI_TIER_CONFIG (updated: agence = 199€, 600 min)

### AI Tier Config (updated)

| | Solo | Equipe | Agence |
|---|---|---|---|
| Prix mois | 49€ | 99€ | 199€ |
| Minutes | 60 | 180 | 600 |
| Top-up | 0.50€/min | 0.40€/min | 0.30€/min |
| Headline | Independants | Equipes | Agences |

### Features per tier (value-oriented)
- Repondez 24/7 a vos locataires
- WhatsApp + SMS + Appels vocaux
- Interventions creees automatiquement
- Numero dedie (Equipe+Agence)
- Support prioritaire IA (Agence only)
