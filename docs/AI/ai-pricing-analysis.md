# SEIDO AI Assistant — Analyse Pricing & Modele Implemente

**Date** : 2026-03-28
**Statut** : Implemente — modele en production
**Auteur** : Analyse automatisee (Claude) + recherche marche
**Documents sources** : `ai-phone-assistant-plan.md` (v3.6), `ai-whatsapp-agent-plan.md` (v1.0), `Sales/sales-pitch-kit.md`, `Sales/sales-deck-seido.md`, implementation Stripe (mars 2026)

---

## Table des matieres

1. [Resume executif](#1--resume-executif)
2. [Modele implemente](#2--modele-implemente)
3. [Benchmark marche 2025-2026](#3--benchmark-marche-2025-2026)
4. [Economie unitaire](#4--economie-unitaire)
5. [Architecture Stripe](#5--architecture-stripe)
6. [Alignement avec le sales kit](#6--alignement-avec-le-sales-kit)
7. [Scenarios et projections](#7--scenarios-et-projections)
8. [Roadmap pricing](#8--roadmap-pricing)

---

## 1 — Resume executif

### Modele actuel

L'assistant IA SEIDO est facture en **add-on sur l'abonnement unique** (single subscription model). Le gestionnaire a un seul abonnement Stripe qui peut contenir 1 ou 2 line items : le plan SEIDO de base (per-lot) + l'add-on IA (flat monthly/annual).

**Unite de facturation : la conversation** (WhatsApp aujourd'hui, SMS prevu ensuite).

### Grille tarifaire deployee

| Pack | Prix/mois | Prix/an (-17%) | Conversations incluses / mois | Cible |
|------|-----------|----------------|-------------------------------|-------|
| **Solo** | 29 EUR | 290 EUR | 200 conversations | Independant 1-30 lots |
| **Equipe** | 49 EUR | 490 EUR | 500 conversations | Petite agence 30-100 lots |
| **Agence** | 99 EUR | 990 EUR | 1 500 conversations | Agence structuree 100+ lots |

**Canaux couverts :**
- WhatsApp Business API (operationnel)
- SMS (prevu — meme infrastructure Twilio)

### Decisions cles

1. **Conversations, pas minutes** : L'unite "minute" etait un heritage du modele vocal ElevenLabs. Une conversation WhatsApp/SMS n'a pas de duree — elle a un resultat (intervention creee, info transmise).
2. **Prix agressifs** : 29/49/99 EUR contre 49/99/149 du plan initial. Entry price sous la barre des 30 EUR pour maximiser l'adoption.
3. **Abonnement unifie** : Plus d'abonnement AI separe. L'add-on est un line item sur le meme abonnement Stripe, avec facturation alignee (meme date de renouvellement).
4. **Annuel avec -17%** : Disponible pour les utilisateurs en trial qui passent par Checkout. Les abonnes actifs gardent leur intervalle existant.

---

## 2 — Modele implemente

### 2.1 Definition d'une "conversation"

> **1 conversation = 1 echange complet avec un locataire aboutissant a un resultat**
> (intervention creee, information transmise, ou demande classee)

- Inclut tous les messages echanges dans une session (typiquement 5-10 messages)
- Inclut les photos/medias envoyes par le locataire
- Inclut l'extraction structuree et la creation d'intervention
- Une session qui expire sans resultat (abandon apres 1-2 messages) = **non comptabilisee**

### 2.2 Fonctionnalites par tier

| Fonctionnalite | Solo (29 EUR) | Equipe (49 EUR) | Agence (99 EUR) |
|----------------|---------------|-----------------|-----------------|
| Numero WhatsApp dedie | Oui | Oui | Oui |
| Reponse automatique 24/7 | Oui | Oui | Oui |
| Transcription des conversations | Oui | Oui | Oui |
| Notifications en temps reel | Oui | Oui | Oui |
| Instructions personnalisees | — | Oui | Oui |
| Priorite de traitement | — | Oui | Oui |
| Rapport mensuel detaille | — | Oui | Oui |
| Support prioritaire | — | Oui | Oui |
| Conversations supplementaires a prix reduit | — | — | Oui |
| Integration CRM avancee | — | — | Oui |
| Analyses et statistiques | — | — | Oui |
| Account manager dedie | — | — | Oui |

### 2.3 Top-up (recharge)

Prix du top-up = prix unitaire du forfait + 50%.

| Pack | Prix/conv forfait | Prix/conv top-up (+50%) | Top-up (100 conv) |
|------|-------------------|-------------------------|-------------------|
| Solo | 0.145 EUR | 0.22 EUR | 22 EUR |
| Equipe | 0.098 EUR | 0.15 EUR | 15 EUR |
| Agence | 0.066 EUR | 0.10 EUR | 10 EUR |

Auto-recharge disponible : ajouter automatiquement 100 conversations quand le quota est atteint.

### 2.4 Parcours utilisateur

```
Trial SEIDO → Page "Assistant IA" → Choix du tier + intervalle (mois/an)
  → Stripe Checkout (billing_cycle_anchor = fin du trial)
  → Provisioning WhatsApp automatique
  → Page active : numero, usage, instructions, historique

Abonne actif → Page "Assistant IA" → Choix du tier
  → Modal de confirmation avec montant au prorata (invoices.createPreview)
  → Ajout immediat du line item sur l'abonnement existant
  → Provisioning WhatsApp automatique
```

---

## 3 — Benchmark marche 2025-2026

### 3.1 AI Chatbot/Assistant SaaS — Pricing par resolution/conversation

| Plateforme | Modele | Prix/resolution | Plateforme base |
|------------|--------|-----------------|-----------------|
| **Intercom Fin** | Per resolution | **$0.99/resolution** | $29-139/seat/mois |
| **Zendesk AI Agents** | Per resolution | **$1.50** (engage) / **$2.00** (PAYG) | $115-169/agent/mois |
| **Tidio Lyro** | Per conversation | **~$0.50/conversation** | $29-349/mois |
| **Freshdesk Freddy** | Per session | **$0.10/session** (1000 = $100) | $49/agent/mois |
| **Crescendo.ai** | Per resolution | **$1.25/resolution** | Custom |

> **Fourchette marche : $0.10 - $2.00 par conversation/resolution IA**
> **Median : ~$0.75-1.00/conversation**

### 3.2 PropTech AI — Pricing specifique immobilier

| Plateforme | Modele | Prix | AI incluse ? |
|------------|--------|------|-------------|
| **AppFolio** (Lisa AI, Realm-X) | Per-unit/month | $1.49-5.00/unit/mois | Bundlee dans le plan |
| **Buildium** (Lumina AI) | Tiered monthly | $62-400/mois | AI dans le plan Premium ($400/mo) |
| **EliseAI** | Per-unit/month | Custom (enterprise) | AI = le produit |
| **NAITIVE** | Flat monthly | $299-599/mois | AI phone agent standalone |

> **Tendance PropTech : AI bundlee dans le plan (per-unit) ou flat monthly**
> Pas d'exemples de per-conversation en PropTech — **opportunite de differenciation**

### 3.3 Meta WhatsApp Business API — Couts 2025-2026

| Type de message | Cout (Europe) | Applicable SEIDO ? |
|-----------------|---------------|---------------------|
| **Service messages** | **GRATUIT** | **Oui — 100% des cas** |
| Utility templates | ~$0.005-0.03 | Post-MVP (rappels RDV) |
| Marketing templates | ~$0.06-0.22 | Non pertinent |

> Pour le use case SEIDO (conversations initiees par le locataire), **le cout WhatsApp Meta est nul**.

### 3.4 Positionnement SEIDO

| Metrique | SEIDO Solo | SEIDO Equipe | SEIDO Agence | Marche (median) |
|----------|------------|--------------|--------------|-----------------|
| Prix/conv (pack) | 0.15 EUR | 0.10 EUR | 0.07 EUR | 0.75-1.00 EUR |
| Entry price | 29 EUR/mois | — | — | 29-99 EUR/mois |
| Top-up/conv | 0.50 EUR | 0.40 EUR | 0.30 EUR | 0.50-2.00 EUR |

**Analyse :** SEIDO est positionne **tres en-dessous du marche** en prix effectif/conversation, mais **aligne** en prix d'entree mensuel. C'est un avantage competitif pour les petits gestionnaires (volume faible, prix attractif), mais un sous-pricing potentiel pour les gros volumes.

---

## 4 — Economie unitaire

### 4.1 Cout variable par conversation (WhatsApp text-only)

| Poste | Cout | Source |
|-------|------|--------|
| Claude Haiku 4.5 (conversation ~5 msgs) | ~$0.001 | ~500 tokens in + ~200 tokens out x 5 |
| Claude Haiku 4.5 (extraction structuree) | ~$0.0005 | ~300 tokens extraction |
| Meta WhatsApp service messages | $0.00 | Customer-initiated = gratuit |
| Supabase (storage + DB writes) | ~$0.0001 | Negligeable |
| **Total cout variable** | **~$0.0016/conv** | **~EUR 0.0015/conv** |

### 4.2 Cout variable par conversation (SMS — previsionnel)

| Poste | Cout | Source |
|-------|------|--------|
| Claude Haiku 4.5 (idem WhatsApp) | ~$0.0015 | Meme pipeline |
| Twilio SMS inbound (Belgique) | $0.0075/msg | ~5 msgs = $0.0375 |
| Twilio SMS outbound (Belgique) | $0.07/msg | ~5 msgs = $0.35 |
| **Total cout variable SMS** | **~$0.39/conv** | **~EUR 0.36/conv** |

> **Attention :** Le SMS est **~240x plus cher** que WhatsApp a cause des couts Twilio outbound. A 0.36 EUR/conv, les marges restent positives sur les packs (prix effectif 0.07-0.15 EUR/conv WhatsApp), mais **negatives sur SMS** pour les gros volumes. Strategie : encourager WhatsApp, utiliser SMS comme fallback.

### 4.3 Marge brute par pack (WhatsApp-only)

| Pack | Revenue/mois | Cout variable (100% usage) | Cout fixe (numero) | **Marge brute** |
|------|-------------|---------------------------|---------------------|-----------------|
| **Solo** (200 conv) | EUR 29 | EUR 0.30 | EUR 0.92 | **EUR 27.78 (96%)** |
| **Equipe** (500 conv) | EUR 49 | EUR 0.75 | EUR 0.92 | **EUR 47.33 (97%)** |
| **Agence** (1500 conv) | EUR 99 | EUR 2.25 | EUR 0.92 | **EUR 95.83 (97%)** |

### 4.4 Marge brute par pack (mix WhatsApp 80% + SMS 20% — scenario futur)

| Pack | Revenue/mois | Cout variable (80% WA + 20% SMS) | **Marge brute** |
|------|-------------|-----------------------------------|-----------------|
| **Solo** (200 conv) | EUR 29 | EUR 14.66 | **EUR 13.42 (46%)** |
| **Equipe** (500 conv) | EUR 49 | EUR 36.60 | **EUR 11.48 (23%)** |
| **Agence** (1500 conv) | EUR 99 | EUR 109.80 | **EUR -11.72 (-12%)** |

> **Risque identifie :** Si le SMS represente 20%+ des conversations, les marges s'effondrent. Strategies de mitigation :
> 1. **Encourager WhatsApp** : premier message = lien WhatsApp, SMS = fallback uniquement
> 2. **Limiter le SMS** : quotas SMS separes ou prix differentie
> 3. **Revoir les prix** si le SMS prend une part significative

### 4.5 Marge sur les top-ups

Prix top-up = prix unitaire du forfait + 50%.

| Pack | Prix top-up (100 conv) | Cout reel (100 conv WA) | Marge unitaire |
|------|------------------------|-------------------------|----------------|
| Solo | EUR 22 | EUR 0.15 | **EUR 21.85 (>99%)** |
| Equipe | EUR 15 | EUR 0.15 | **EUR 14.85 (>99%)** |
| Agence | EUR 10 | EUR 0.15 | **EUR 9.85 (>98%)** |

### 4.6 Break-even plateforme

| Cout fixe | Montant | Amorti par |
|-----------|---------|-----------|
| Twilio numero WhatsApp | ~EUR 1/numero/mois | Inclus dans chaque pack |
| Supabase (marginal) | ~EUR 0 (deja paye) | Absorbe par SEIDO |
| Vercel (marginal) | ~EUR 0 (deja paye) | Absorbe par SEIDO |
| **Total fixe** | **~EUR 1/equipe/mois** | **Break-even : 1 equipe** |

> **Break-even immediat** des le premier client (WhatsApp-only).

---

## 5 — Architecture Stripe

### 5.1 Modele : Single Subscription avec Add-on

```
Stripe Subscription (par equipe)
  ├── Line Item 1 : Plan SEIDO de base (per-lot, metered)
  │   ├── Price "monthly" : X EUR/lot/mois
  │   └── Price "annual"  : X EUR/lot/an
  │
  └── Line Item 2 (optionnel) : Add-on Assistant IA
      ├── Price "solo_monthly"   : 2900 cents/mois
      ├── Price "solo_annual"    : 29000 cents/an
      ├── Price "equipe_monthly" : 4900 cents/mois
      ├── Price "equipe_annual"  : 49000 cents/an
      ├── Price "agence_monthly" : 9900 cents/mois
      └── Price "agence_annual"  : 99000 cents/an
```

### 5.2 Helpers implementes (lib/stripe.ts)

| Helper | Usage |
|--------|-------|
| `STRIPE_AI_PRICES` | Map nested `{month, year}` par tier |
| `AI_PRICE_IDS` | Set de tous les price IDs AI |
| `isAiPrice(priceId)` | Detecte si un price ID est AI |
| `isMainPrice(priceId)` | Detecte si un price ID est le plan de base |
| `getTierFromPriceId(priceId)` | Retourne le tier (`solo`/`equipe`/`agence`) |
| `getIntervalFromAiPriceId(priceId)` | Retourne `month` ou `year` |

### 5.3 Flux Stripe

**Ajout AI (trial):**
```
createAiCheckoutAction(tier, interval)
  → Stripe Checkout Session
  → billing_cycle_anchor = trial end date
  → success_url → verifyAiCheckoutSession → provisioning
```

**Ajout AI (abonne actif):**
```
previewAiAddonAction(tier)
  → invoices.createPreview (montant prorata)
  → Confirmation utilisateur
  → createAiCheckoutAction(tier)
  → subscriptions.update (ajout line item)
  → provisioning immediat
```

**Suppression AI:**
```
removeAiAddonAction()
  → Si 1 seul item : subscriptions.cancel
  → Si 2+ items : subscriptionItems.del (AI item)
  → deprovision WhatsApp
```

### 5.4 Detection items (anti-pattern corrige)

**Avant (fragile) :**
```typescript
const mainItem = subscription.items.data[0] // Stripe ne garantit PAS l'ordre !
```

**Apres (robuste) :**
```typescript
const mainItem = subscription.items.data.find(i => !isAiPrice(i.price.id))
const aiItem = subscription.items.data.find(i => isAiPrice(i.price.id))
```

---

## 6 — Alignement avec le sales kit

### 6.1 ROI specifique a l'add-on IA

| Taille | Demandes/mois (estimees) | Traitees par IA (70%) | Temps economise | Valeur (45 EUR/h) | Cout add-on | **ROI** |
|--------|--------------------------|----------------------|-----------------|-------------------|-------------|---------|
| 20 lots | ~10 | ~7 | ~2h | ~EUR 90/mois | EUR 29 (Solo) | **3.1x** |
| 50 lots | ~25 | ~18 | ~6h | ~EUR 270/mois | EUR 49 (Equipe) | **5.5x** |
| 100 lots | ~50 | ~35 | ~12h | ~EUR 540/mois | EUR 49 (Equipe) | **11x** |
| 200 lots | ~100 | ~70 | ~23h | ~EUR 1 035/mois | EUR 99 (Agence) | **10.5x** |

### 6.2 Proposition de framing

> "SEIDO, c'est le squelette — tout centralise. Les reflexes — tout automatise. Et maintenant, le cerveau — l'IA qui premache le travail.
>
> Avec l'assistant IA, vos locataires signalent un probleme en 2 minutes par WhatsApp — avec photos. L'IA collecte toutes les informations, cree l'intervention dans SEIDO, et vous notifie avec un resume complet. Vous n'avez qu'a valider.
>
> Chaque demande traitee par l'IA, c'est 20 minutes de gagnees. Sur 35 demandes par mois, ca fait 12 heures. En valeur, c'est 540 euros par mois — pour un add-on a 49 euros."

### 6.3 Objections specifiques a l'IA

| Objection | Reponse |
|-----------|---------|
| "L'IA ne comprendra pas mes locataires" | "L'assistant est entraine specifiquement pour la prise de demandes d'intervention. Il parle francais, neerlandais et anglais, et il suit un script valide par des gestionnaires terrain." |
| "C'est quoi une conversation ?" | "Un echange complet avec un locataire : il decrit son probleme, envoie des photos si necessaire, et l'IA cree l'intervention dans SEIDO. Typiquement 5-10 messages en 3 minutes." |
| "Et si le locataire n'utilise pas WhatsApp ?" | "91% des Belges utilisent WhatsApp. On ajoutera aussi le SMS comme canal alternatif. Et le locataire peut toujours creer sa demande via le portail SEIDO." |
| "C'est pas cher pour de l'IA ?" | "L'IA travaille pour vous 24h/24. A 49 EUR/mois pour 500 conversations, c'est moins de 10 centimes par demande traitee. Un appel telephonique vous coute 15 minutes — 11 EUR en temps." |
| "Et si je depasse mon quota ?" | "Vous etes prevenu a 80% et 100%. Vous pouvez recharger 100 conversations supplementaires, ou activer la recharge automatique." |

---

## 7 — Scenarios et projections

### 7.1 Projections de revenus

| Equipes | Mix | Revenue/mois | Cout/mois | **Profit/mois** | **Marge** |
|---------|-----|-------------|-----------|-----------------|-----------|
| 5 | 3 Solo + 2 Equipe | EUR 185 | ~EUR 5 | **~EUR 180** | 97% |
| 10 | 4 Solo + 4 Equipe + 2 Agence | EUR 510 | ~EUR 10 | **~EUR 500** | 98% |
| 25 | 8 Solo + 12 Equipe + 5 Agence | EUR 1 315 | ~EUR 25 | **~EUR 1 290** | 98% |
| 50 | 15 Solo + 25 Equipe + 10 Agence | EUR 2 650 | ~EUR 50 | **~EUR 2 600** | 98% |
| 100 | 25 Solo + 50 Equipe + 25 Agence | EUR 5 650 | ~EUR 100 | **~EUR 5 550** | 98% |

### 7.2 Revenue avec top-ups (scenario realiste)

En supposant que 30% des clients depassent leur quota et rechargent une fois :

| Equipes | Revenue packs | Revenue top-ups (estime) | **Revenue total** |
|---------|--------------|--------------------------|-------------------|
| 10 | EUR 510 | ~EUR 40 | **EUR 550** |
| 25 | EUR 1 315 | ~EUR 100 | **EUR 1 415** |
| 50 | EUR 2 650 | ~EUR 200 | **EUR 2 850** |

### 7.3 Revenue annuel (avec -17% annuel)

En supposant 30% des clients en annuel :

| Equipes | Revenue/mois (70% mensuel + 30% annuel) | **ARR** |
|---------|------------------------------------------|---------|
| 10 | ~EUR 483 | **~EUR 5 800** |
| 25 | ~EUR 1 249 | **~EUR 15 000** |
| 50 | ~EUR 2 516 | **~EUR 30 200** |
| 100 | ~EUR 5 367 | **~EUR 64 400** |

---

## 8 — Roadmap pricing

### 8.1 Phase actuelle (mars 2026)

- [x] Modele 3 tiers a la conversation (Solo/Equipe/Agence)
- [x] Prix 29/49/99 EUR/mois avec option annuelle -17%
- [x] Add-on sur abonnement unifie (single subscription)
- [x] Top-ups 50/40/30 EUR par 100 conversations
- [x] Proration automatique via Stripe
- [x] WhatsApp comme canal principal

### 8.2 Phase 2 (Q2 2026) — SMS

- [ ] Ajout du canal SMS (meme infrastructure Twilio)
- [ ] **Analyser les marges SMS** : cout ~0.36 EUR/conv vs ~0.0015 EUR WhatsApp
- [ ] Decision : prix unique tous canaux OU quotas SMS separes
- [ ] Strategie UX : prioriser WhatsApp, SMS = fallback

### 8.3 Phase 3 (Q3-Q4 2026) — Scaling

- [ ] Tier Enterprise (sur devis, conversations illimitees)
- [ ] Option per-lot (+1.50 EUR/lot/mois) pour grands comptes (500+ lots)
- [ ] Metered billing Stripe pour overage automatique (vs top-ups manuels)
- [ ] Revision des prix basee sur 6 mois de donnees d'usage

### 8.4 Risques a monitorer

| Risque | Probabilite | Impact | Mitigation |
|--------|-------------|--------|-----------|
| SMS prend >20% du mix | Moyenne | Marges negatives sur Agence | Quotas SMS, prix differentie |
| Sous-pricing vs valeur | Moyenne | Revenue inferieur au potentiel | Ajuster apres 6 mois de data |
| Concurrent PropTech WhatsApp AI en Belgique | Faible | Pression sur les prix | First-mover + integration SEIDO = moat |
| Cout Claude API augmente | Faible | Erosion marge WhatsApp | Marge >96% absorbe toute hausse raisonnable |
| Abus (spam de conversations) | Faible | Surconsommation | Conversations non abouties non comptabilisees |

---

**Derniere mise a jour** : 2026-03-28
**Basee sur** : Implementation Stripe deployee, ai-phone-assistant-plan.md (v3.6), ai-whatsapp-agent-plan.md (v1.0), benchmark marche mars 2026
