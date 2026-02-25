# Stripe Subscription — User Stories

> **Date:** 2026-02-17
> **Source:** Ralph review of `docs/stripe/2026-01-30-stripe-subscription-design.md` + `2026-01-30-stripe-subscription-implementation-plan.md`
> **Status:** Ready for validation — NO implementation yet

---

## Corrections vs Documents Existants

Les points suivants ont ete identifies lors de la revue Ralph et doivent etre corriges dans les docs existants avant implementation :

| # | Correction | Impact |
|---|-----------|--------|
| C1 | Table `subscriptions` n'existe PAS — le plan dit "ALTER TABLE" mais il faut un **CREATE TABLE** complet | Migration a reecrire |
| C2 | Admin client = `getSupabaseAdmin()` (dans `lib/services/core/supabase-admin.ts`), PAS `createAdminSupabaseClient()` | Webhook handler + CRON |
| C3 | Email templates existants dans `emails/templates/`, PAS `lib/email/templates/` | Phase 8 (emails) |
| C4 | Billing access = role `admin` dans team_members uniquement (pas owner+admin+gestionnaire) | RLS policies |
| C5 | Systeme de coupons Stripe Dashboard : pourcentage uniquement, duree flexible | Nouveau chapitre design |
| C6 | Read-only impacte prestataires/locataires : message clair + interventions en cours continuent | Nouveau flow |
| C7 | Page billing = resume dans parametres + page dediee /gestionnaire/abonnement | Nouveau composant |
| C8 | Notification quand lot supprime : "Vous payez encore pour X lots. Reduire ?" + lien Portal | Nouveau composant |
| C9 | TVA = HT (prix affiches hors taxes, TVA ajoutee au Checkout) | UX pricing |
| C10 | Trial demarre a la creation de la team par le premier gestionnaire | Signup flow |
| C11 | Beta users : trial 30j a partir du deploiement Stripe | Migration data |

---

## User Stories

### Epic 1 : Foundation & Infrastructure

#### US-001 : Installation packages Stripe
**As a** developer,
**I want** Stripe SDK installed and configured,
**So that** I can interact with Stripe API from the SEIDO codebase.

**Acceptance Criteria:**
- [ ] `stripe` et `@stripe/stripe-js` installes dans package.json
- [ ] `lib/stripe.ts` cree avec API version `2025-09-30.clover`, STRIPE_PRICES, FREE_TIER_LIMIT, TRIAL_DAYS, calculatePrice(), calculateAnnualSavings()
- [ ] Variables d'environnement ajoutees a `.env.example` (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, CRON_SECRET)
- [ ] Typecheck passe (`npm run lint`)

**Priority:** 1 | **Size:** XS | **Layer:** Foundation | **Depends On:** —

---

#### US-002 : Migration DB — Schema Stripe complet
**As a** developer,
**I want** all Stripe-related database tables and functions created,
**So that** the subscription system has its data layer ready.

**Acceptance Criteria:**
- [ ] Table `subscriptions` creee (CREATE TABLE, pas ALTER) avec colonnes : id, team_id, stripe_customer_id, price_id, status, trial_start, trial_end, current_period_start, current_period_end, cancel_at_period_end, cancel_at, canceled_at, ended_at, subscribed_lots, billable_properties, updated_at
- [ ] Enum `subscription_status` cree avec valeurs : trialing, active, past_due, canceled, incomplete, free_tier, read_only, unpaid
- [ ] Table `stripe_customers` creee (team_id, stripe_customer_id)
- [ ] Table `stripe_invoices` creee (id, subscription_id, stripe_customer_id, amount_due, amount_paid, amount_remaining, currency, status, hosted_invoice_url, invoice_pdf, period_start, period_end, paid_at)
- [ ] Table `stripe_webhook_events` creee (event_id PK, event_type, processed_at, team_id)
- [ ] Trigger `tr_lots_subscription_count` cree (compte uniquement les lots, pas les buildings)
- [ ] Fonctions helper : `can_team_add_property()`, `is_team_read_only()`, `cleanup_old_webhook_events()`
- [ ] RLS policies : SELECT pour role `admin` dans team_members sur subscriptions, stripe_customers, stripe_invoices. Aucun acces authenticated sur stripe_webhook_events
- [ ] Index de performance sur team_id, status, subscription_id
- [ ] `npm run supabase:types` regenere database.types.ts
- [ ] Migration testee localement

**Priority:** 1 | **Size:** M | **Layer:** Schema | **Depends On:** US-001

---

#### US-003 : Migration donnees beta users
**As a** product owner,
**I want** existing beta users to receive a 30-day trial from Stripe deployment date,
**So that** they have time to evaluate the paid offering without losing access.

**Acceptance Criteria:**
- [ ] Script de migration qui cree un record `subscriptions` pour chaque team existante
- [ ] Status = `trialing`, trial_end = date de deploiement + 30 jours
- [ ] Stripe Customer cree pour chaque team existante (via script batch)
- [ ] Teams avec ≤ 2 lots : status = `free_tier` (pas de trial necessaire)
- [ ] Idempotent : peut etre relance sans creer de doublons
- [ ] Valide sur staging avant production

**Priority:** 1 | **Size:** S | **Layer:** Schema | **Depends On:** US-002

---

### Epic 2 : Subscription Service Layer

#### US-004 : Repository Subscription
**As a** developer,
**I want** a SubscriptionRepository following the SEIDO Repository Pattern,
**So that** all subscription data access is centralized and type-safe.

**Acceptance Criteria:**
- [ ] `lib/services/repositories/subscription.repository.ts` cree
- [ ] Methodes : findByTeamId, findByStripeSubscriptionId, create, update, updateByTeamId, upsertByTeamId, getLotCount
- [ ] Utilise `.limit(1).maybeSingle()` (pas `.single()`) — multi-team safe
- [ ] Exporte dans `lib/services/index.ts`
- [ ] Typecheck passe

**Priority:** 2 | **Size:** S | **Layer:** Backend | **Depends On:** US-002

---

#### US-005 : Repository Stripe Customer
**As a** developer,
**I want** a StripeCustomerRepository,
**So that** Stripe customer mapping is managed via the repository pattern.

**Acceptance Criteria:**
- [ ] `lib/services/repositories/stripe-customer.repository.ts` cree
- [ ] Methodes : findByTeamId, findByStripeCustomerId, create
- [ ] Utilise `.limit(1).maybeSingle()`
- [ ] Exporte dans `lib/services/index.ts`
- [ ] Typecheck passe

**Priority:** 2 | **Size:** XS | **Layer:** Backend | **Depends On:** US-002

---

#### US-006 : SubscriptionService — Core
**As a** developer,
**I want** a complete SubscriptionService with all business logic,
**So that** subscription state management is centralized.

**Acceptance Criteria:**
- [ ] `lib/services/domain/subscription.service.ts` cree
- [ ] Types exports : SubscriptionStatus, SubscriptionInfo, UpgradePreview
- [ ] Methodes :
  - `getSubscriptionInfo(teamId)` — retourne status complet avec is_read_only, can_add_property, days_left_trial
  - `canAddProperty(teamId)` — check limite avec raison + upgrade_needed
  - `hasPaymentMethod(teamId)` — verifie CB sauvegardee via Stripe API
  - `getOrCreateStripeCustomer(teamId, email, name)` — idempotent
  - `createCheckoutSession(teamId, customerId, priceId, quantity, successUrl, cancelUrl)` — allow_promotion_codes: true
  - `upgradeSubscriptionDirect(teamId, additionalLots)` — subscriptions.update() avec proration_behavior: 'always_invoice'
  - `previewUpgrade(teamId, additionalLots)` — invoices.createPreview() avec is_estimate flag
  - `createPortalSession(teamId, returnUrl)`
  - `initializeTrialSubscription(teamId, stripeCustomerId)` — app-managed trial, no Stripe sub
  - `isReadOnlyMode(teamId)`
- [ ] Exporte dans `lib/services/index.ts`
- [ ] Typecheck passe

**Priority:** 2 | **Size:** L | **Layer:** Backend | **Depends On:** US-004, US-005

---

### Epic 3 : Webhook Handler

#### US-007 : Webhook API Route
**As a** developer,
**I want** a Stripe webhook handler at `/api/stripe/webhook`,
**So that** all Stripe events are securely processed and synced to our DB.

**Acceptance Criteria:**
- [ ] `app/api/stripe/webhook/route.ts` cree
- [ ] Verification signature Stripe (`constructEvent`)
- [ ] Idempotency check via `stripe_webhook_events` table (insert BEFORE processing)
- [ ] Events geres :
  - `checkout.session.completed` — log, delegation au handler subscription
  - `customer.subscription.created` / `updated` — upsert dans subscriptions (onConflict: team_id)
  - `customer.subscription.deleted` — status read_only ou free_tier selon lot count
  - `invoice.paid` — upsert dans stripe_invoices
  - `invoice.payment_failed` — status past_due
- [ ] Utilise `getSupabaseAdmin()` (service_role) pour les ecritures
- [ ] Repond 200 en < 20s (pas d'email sending dans le handler)
- [ ] Repond 500 en cas d'erreur (Stripe retry)
- [ ] Typecheck passe

**Priority:** 2 | **Size:** M | **Layer:** Backend | **Depends On:** US-006

---

### Epic 4 : Server Actions

#### US-008 : Server Actions Subscription
**As a** gestionnaire admin,
**I want** server actions to manage my team's subscription,
**So that** I can check status, upgrade, and manage billing from the app.

**Acceptance Criteria:**
- [ ] `app/actions/subscription-actions.ts` cree avec 'use server'
- [ ] Helper `getTeamContext()` utilise `.limit(1).maybeSingle()` sur team_members
- [ ] Actions :
  - `getSubscriptionStatus()` — full SubscriptionInfo
  - `checkCanAddProperty()` — allowed + reason + upgrade_needed
  - `checkHasPaymentMethod()` — boolean
  - `isReadOnlyMode()` — boolean
  - `createCheckoutSessionAction(interval = 'annual')` — retourne {url}. Quantite = max(lot_count, FREE_TIER_LIMIT + 1)
  - `upgradeSubscriptionDirect(additionalLots = 1)` — retourne {success, invoice_amount}
  - `getUpgradePreview(additionalLots)` — retourne UpgradePreview
  - `verifyCheckoutSession(sessionId)` — verification post-Checkout (anti-spoofing)
  - `createPortalSessionAction()` — retourne {url}
- [ ] Typecheck passe

**Priority:** 2 | **Size:** M | **Layer:** Backend | **Depends On:** US-006

---

### Epic 5 : Signup & Trial Initialization

#### US-009 : Integration trial dans le signup flow
**As a** nouveau gestionnaire,
**I want** my 30-day trial to start automatically when I create my team,
**So that** I can immediately use all features without entering payment info.

**Acceptance Criteria:**
- [ ] Apres creation team dans le callback auth, appeler `initializeTrialSubscription()`
- [ ] Stripe Customer cree (sans subscription Stripe)
- [ ] Record subscriptions cree : status=trialing, trial_end=now+30d, id=NULL
- [ ] Si ≤ 2 lots : status=free_tier directement
- [ ] L'utilisateur voit un message de bienvenue confirmant le trial
- [ ] Email de bienvenue envoye (J+1)

**Priority:** 2 | **Size:** S | **Layer:** Backend | **Depends On:** US-006

---

### Epic 6 : UI — Billing Components

#### US-010 : Page dediee Abonnement (/gestionnaire/abonnement)
**As a** gestionnaire admin,
**I want** a dedicated billing page showing my subscription details,
**So that** I can see my plan, usage, invoices, and manage my subscription.

**Acceptance Criteria:**
- [ ] Page `/gestionnaire/abonnement/page.tsx` creee (Server Component avec `getServerAuthContext`)
- [ ] Affiche : statut actuel, plan (annuel/mensuel), nombre de lots (utilises/abonnes), prochaine facture, date de renouvellement
- [ ] Section factures : liste des stripe_invoices avec liens PDF
- [ ] Bouton "Gerer mon abonnement" → Stripe Customer Portal
- [ ] Bouton "Mettre a niveau" si upgrade possible
- [ ] ValueCalculator : heures/argent economises
- [ ] Accessible uniquement aux team_members role=admin
- [ ] Mobile responsive
- [ ] Typecheck passe

**Priority:** 3 | **Size:** M | **Layer:** UI | **Depends On:** US-008

---

#### US-011 : Resume abonnement dans la page Parametres
**As a** gestionnaire admin,
**I want** a subscription summary card in the settings page,
**So that** I can quickly see my plan status without leaving settings.

**Acceptance Criteria:**
- [ ] Section ajoutee dans `/gestionnaire/parametres` (remplace le composant beta desactive)
- [ ] Affiche : statut, plan, lots utilises/abonnes, jours restants trial
- [ ] Lien "Voir les details →" vers `/gestionnaire/abonnement`
- [ ] Si trial : affiche compte a rebours + CTA annuel
- [ ] Si read-only : banner rouge + CTA reactivation
- [ ] Si free_tier : badge "Gratuit" + CTA upgrade quand > 2 lots
- [ ] Visible uniquement pour role=admin
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-008

---

#### US-012 : Trial Banner
**As a** gestionnaire en periode d'essai,
**I want** to see a banner showing my trial progress,
**So that** I know when my trial ends and can subscribe before losing access.

**Acceptance Criteria:**
- [ ] `components/billing/trial-banner.tsx` cree
- [ ] Affiche uniquement les 7 derniers jours du trial
- [ ] Progress bar avec shift de couleur : bleu (>7j) → orange (3-7j) → rouge (≤1j)
- [ ] CTA pointe TOUJOURS vers Checkout annuel
- [ ] Dismissable pour 24h (localStorage)
- [ ] Message loss aversion les jours critiques : "Ne perdez pas l'acces a X lots, X interventions"
- [ ] Integre dans le layout gestionnaire (avant le contenu principal)
- [ ] Mobile responsive
- [ ] Typecheck passe

**Priority:** 3 | **Size:** M | **Layer:** UI | **Depends On:** US-008

---

#### US-013 : Read-Only Banner
**As a** gestionnaire dont l'essai a expire,
**I want** to see a permanent banner explaining my read-only status,
**So that** I understand why I can't create new content and how to regain access.

**Acceptance Criteria:**
- [ ] `components/billing/read-only-banner.tsx` cree
- [ ] Permanent, non-dismissable
- [ ] Message : "Votre compte est en lecture seule. Souscrivez pour retrouver l'acces complet."
- [ ] CTA primaire : "Choisir l'abonnement annuel →"
- [ ] Lien secondaire : "ou payer mensuellement"
- [ ] Integre dans le layout gestionnaire ET locataire/prestataire (adapte selon role)
- [ ] Locataire/prestataire : "Les demandes d'intervention sont temporairement indisponibles. Veuillez contacter votre gestionnaire."
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-008

---

#### US-014 : Upgrade Modal (double mode)
**As a** gestionnaire qui atteint sa limite de lots,
**I want** an upgrade modal that adapts to whether I have a saved card,
**So that** I can upgrade with minimal friction.

**Acceptance Criteria:**
- [ ] `components/billing/upgrade-modal.tsx` cree
- [ ] **Mode A (CB sauvegardee)** : confirmation inline, montant prorate affiche, bouton "Confirmer (+X€)" en 1 clic → `upgradeSubscriptionDirect()`
- [ ] **Mode B (pas de CB)** : PricingCard avec annuel pre-selectionne, bouton "S'abonner (annuel)" → Checkout redirect
- [ ] Disclaimer sur le montant : "Montant estime. Le montant exact sera calcule au moment du paiement."
- [ ] Slot pour le champ code promo (lien "J'ai un code promo" → Checkout avec `allow_promotion_codes: true`)
- [ ] Accessible depuis : formulaire creation lot, formulaire creation intervention (quand limite atteinte)
- [ ] Typecheck passe

**Priority:** 3 | **Size:** M | **Layer:** UI | **Depends On:** US-008

---

#### US-015 : Pricing Card (annual-aggressive)
**As a** gestionnaire potentiel,
**I want** to see pricing that clearly highlights annual savings,
**So that** I'm incentivized to choose the annual plan.

**Acceptance Criteria:**
- [ ] `components/billing/pricing-card.tsx` cree
- [ ] Annuel : carte highlight, badge "Recommande — Economisez 17%", prix barre mensuel, CTA primaire large
- [ ] Mensuel : petit lien muted "ou payer mensuellement (5€ HT/lot/mois)"
- [ ] Prix affiches HT avec mention "+ TVA applicable"
- [ ] Calcul dynamique : total = nb_lots × prix/lot
- [ ] Economies annuelles affichees en euros (pas juste %)
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** —

---

#### US-016 : Contextual Upgrade Prompt
**As a** gestionnaire bloque par une limite,
**I want** a contextual message explaining why I'm blocked and how to upgrade,
**So that** I understand the value of upgrading in the moment.

**Acceptance Criteria:**
- [ ] `components/billing/upgrade-prompt.tsx` cree
- [ ] Contextes : add_lot, add_intervention, export_data, ai_feature
- [ ] Chaque contexte a son icone, message, et CTA specifique
- [ ] Tous les CTA pointent vers l'annuel par defaut
- [ ] Utilise dans les formulaires lot + intervention + export
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-008

---

#### US-017 : Value Calculator
**As a** gestionnaire en trial,
**I want** to see how much time and money SEIDO has saved me,
**So that** I feel the value and am more likely to subscribe.

**Acceptance Criteria:**
- [ ] `components/billing/value-calculator.tsx` cree
- [ ] Calcul : interventions cloturees × 30min gain moyen × 45€/h taux gestionnaire
- [ ] Affiche : heures economisees, equivalent monetaire, nombre d'interventions
- [ ] Affiche sur la page abonnement et dans les emails J-7/J-3/J-1
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-008

---

### Epic 7 : Integration & Hooks

#### US-018 : Hook useSubscription
**As a** developer,
**I want** a client-side hook for subscription state,
**So that** any component can check subscription status reactively.

**Acceptance Criteria:**
- [ ] `hooks/use-subscription.ts` cree
- [ ] Expose : status (SubscriptionInfo), loading, refresh(), canAddProperty(), hasPaymentMethod()
- [ ] Cache le resultat (ne refetch pas a chaque render)
- [ ] refresh() appelee apres upgrade/checkout success
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-008

---

#### US-019 : Integration limite lots dans formulaires
**As a** gestionnaire,
**I want** lot creation forms to check my subscription limit,
**So that** I'm prompted to upgrade if I've reached my limit.

**Acceptance Criteria:**
- [ ] Formulaire creation lot : check `canAddProperty()` avant submit
- [ ] Si limite atteinte + upgrade_needed → affiche UpgradeModal
- [ ] Si read_only → boutons de creation desactives + UpgradePrompt
- [ ] Formulaire creation building : meme logique si building cree des lots
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-014, US-018

---

#### US-020 : Enforcement read-only cross-app
**As a** developer,
**I want** read-only mode enforced across the entire app,
**So that** expired/canceled users can view but not modify data.

**Acceptance Criteria:**
- [ ] Layout gestionnaire : banners trial/read-only integres
- [ ] Boutons "Nouveau" desactives en read-only (lots, interventions, contrats)
- [ ] Formulaires de modification desactives en read-only
- [ ] Export toujours accessible (RGPD)
- [ ] Notifications toujours recues
- [ ] Vue locataire : message "demandes d'intervention temporairement indisponibles" quand la team gestionnaire est read-only
- [ ] Vue prestataire : interventions en cours continuent, pas de nouvelles assignations
- [ ] Typecheck passe

**Priority:** 3 | **Size:** M | **Layer:** UI | **Depends On:** US-013, US-018

---

#### US-021 : Notification suppression lot → lien Portal
**As a** gestionnaire qui supprime un lot,
**I want** to be notified that I'm still paying for the old quantity,
**So that** I can reduce my subscription if needed.

**Acceptance Criteria:**
- [ ] Apres suppression/archivage d'un lot, si subscribed_lots > actual_lots :
  - Toast : "Vous payez encore pour X lots mais n'en utilisez que Y."
  - Bouton "Reduire mon abonnement →" ouvre le Stripe Portal
- [ ] Pas de reduction automatique (l'utilisateur doit aller dans le Portal)
- [ ] Typecheck passe

**Priority:** 3 | **Size:** XS | **Layer:** UI | **Depends On:** US-018

---

### Epic 8 : Checkout & Post-Checkout

#### US-022 : Flow Checkout success + verification
**As a** gestionnaire qui vient de payer,
**I want** my payment verified server-side before seeing the success message,
**So that** I know my subscription is truly active.

**Acceptance Criteria:**
- [ ] Page parametres detecte `?checkout=success&session_id=cs_xxx`
- [ ] Appelle `verifyCheckoutSession(sessionId)` server-side
- [ ] Verifie `payment_status === 'paid'` ET `team_id` correspond
- [ ] Si verifie → message succes "Abonnement active !"
- [ ] Si non verifie → message "Verification en cours..." + polling
- [ ] Navigation manuelle vers `?checkout=success` sans session_id → pas de message succes
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-008

---

### Epic 9 : CRON Jobs & Trial Management

#### US-023 : CRON — Notifications trial (J-7, J-3, J-1)
**As a** product owner,
**I want** automated emails sent before trial expiry,
**So that** users are reminded to subscribe and don't lose access by surprise.

**Acceptance Criteria:**
- [ ] `app/api/cron/trial-notifications/route.ts` cree
- [ ] Auth par Bearer token (CRON_SECRET)
- [ ] J-7 : email informatif avec stats + CTA annuel
- [ ] J-3 : email urgent avec loss aversion + CTA annuel
- [ ] J-1 : email critique avec stats detaillees (lots, interventions, documents) + CTA annuel
- [ ] Idempotent : ne renvoie pas si deja envoye (tracking flag)
- [ ] Typecheck passe

**Priority:** 4 | **Size:** M | **Layer:** Backend | **Depends On:** US-006, US-025

---

#### US-024 : CRON — Expiration trial
**As a** product owner,
**I want** expired trials automatically transitioned to read-only or free tier,
**So that** the subscription state stays accurate.

**Acceptance Criteria:**
- [ ] `app/api/cron/trial-expiration/route.ts` cree
- [ ] Trouve subscriptions : status=trialing AND trial_end < now()
- [ ] Si lot_count ≤ 2 → status = free_tier
- [ ] Si lot_count > 2 → status = read_only
- [ ] Email "Trial expire" envoye
- [ ] Idempotent
- [ ] Typecheck passe

**Priority:** 4 | **Size:** S | **Layer:** Backend | **Depends On:** US-006, US-025

---

#### US-025 : Email templates billing (React Email + Resend)
**As a** developer,
**I want** all billing email templates created,
**So that** the CRON jobs and events can send properly formatted emails.

**Acceptance Criteria:**
- [ ] Templates dans `emails/templates/billing/` (alignes avec pattern existant) :
  - `welcome.tsx` — J+1, onboarding steps
  - `trial-ending.tsx` — parametrique J-7/J-3/J-1, urgence croissante
  - `trial-expired.tsx` — acces read-only, CTA reactivation
  - `win-back.tsx` — J+3 post-expiry, code -20% annuel
  - `payment-failed.tsx` — CB rejetee, lien mise a jour
  - `subscription-activated.tsx` — confirmation activation
- [ ] Tous les CTAs pointent vers l'annuel par defaut
- [ ] Stats personnalisees (nb lots, nb interventions, heures economisees) dans J-7/J-3/J-1
- [ ] Prix affiches HT + mention TVA
- [ ] Service d'envoi : `lib/services/domain/subscription-email.service.ts`
- [ ] Typecheck passe

**Priority:** 3 | **Size:** M | **Layer:** Backend | **Depends On:** US-002

---

#### US-026 : CRON — Behavioral triggers
**As a** product owner,
**I want** usage-based conversion emails sent to engaged trial users,
**So that** users who have experienced value are prompted to subscribe at the right moment.

**Acceptance Criteria:**
- [ ] `app/api/cron/behavioral-triggers/route.ts` cree
- [ ] Triggers : ≥ 3 lots crees, ≥ 1 intervention cloturee, ≥ 1 team member ajoute
- [ ] Email personnalise avec stats d'usage + CTA annuel
- [ ] Anti-spam : max 1 email comportemental par team par 7 jours
- [ ] Ne s'applique qu'aux teams en trial (pas free_tier ni active)
- [ ] Typecheck passe

**Priority:** 4 | **Size:** S | **Layer:** Backend | **Depends On:** US-025

---

#### US-027 : CRON — Cleanup webhook events
**As a** developer,
**I want** old webhook events cleaned up automatically,
**So that** the idempotency table doesn't grow indefinitely.

**Acceptance Criteria:**
- [ ] `app/api/cron/cleanup-webhook-events/route.ts` cree
- [ ] Supprime events > 30 jours
- [ ] Schedule : hebdomadaire
- [ ] Typecheck passe

**Priority:** 4 | **Size:** XS | **Layer:** Backend | **Depends On:** US-002

---

#### US-028 : Configuration Vercel CRON
**As a** developer,
**I want** all CRON jobs registered in vercel.json,
**So that** they run automatically in production.

**Acceptance Criteria:**
- [ ] `vercel.json` mis a jour avec 4 nouveaux crons (en plus des 2 existants) :
  - trial-notifications : 0 9 * * * (9h quotidien)
  - trial-expiration : 0 0 * * * (minuit quotidien)
  - behavioral-triggers : 0 10 * * * (10h quotidien)
  - cleanup-webhook-events : 0 3 * * 0 (3h hebdomadaire)
- [ ] CRONs existants (sync-emails, intervention-reminders) preserves
- [ ] Typecheck passe

**Priority:** 4 | **Size:** XS | **Layer:** Config | **Depends On:** US-023, US-024, US-026, US-027

---

### Epic 10 : Systeme de Coupons (Stripe Dashboard)

#### US-029 : Documentation coupons Stripe + configuration
**As a** product owner,
**I want** a clear coupon strategy documented and configured in Stripe Dashboard,
**So that** I can create and manage promotional offers flexibly.

**Acceptance Criteria:**
- [ ] Documentation dans `docs/stripe/` : types de coupons, regles de creation, bonnes pratiques
- [ ] Configuration Stripe Dashboard :
  - Coupon `EARLY2026` : 100% off, duree 3 mois, usage limite
  - Coupon `REFERRAL` : 100% off, duree 1 mois, multi-usage
  - Coupon `ANNUAL20` : 20% off, duree forever, usage pour win-back
  - Structure : pourcentage uniquement, duree flexible (once / repeating X mois / forever)
- [ ] Checkout Sessions creees avec `allow_promotion_codes: true`
- [ ] Guide interne pour creer un nouveau coupon (etapes Dashboard)
- [ ] Test : appliquer un code dans un Checkout test mode

**Priority:** 3 | **Size:** S | **Layer:** Config | **Depends On:** US-001

---

### Epic 11 : Reactivation & Admin

#### US-030 : Flow reactivation (read-only → paid)
**As a** gestionnaire dont l'abonnement a expire,
**I want** to reactivate my subscription easily,
**So that** I can regain full access to my data and features.

**Acceptance Criteria:**
- [ ] Banner permanent read-only avec "Reactiver mon abonnement" CTA
- [ ] Click → `createCheckoutSessionAction('annual')` (annuel pre-selectionne)
- [ ] Checkout → webhook subscription.created → status=active
- [ ] Acces restore immediatement apres webhook processing
- [ ] Email confirmation d'activation envoye
- [ ] Typecheck passe

**Priority:** 3 | **Size:** S | **Layer:** UI | **Depends On:** US-013, US-008

---

#### US-031 : Admin — Extension trial
**As an** admin SEIDO,
**I want** to extend a team's trial period,
**So that** I can help clients who need more time to evaluate.

**Acceptance Criteria:**
- [ ] Script SQL ou server action admin :
  ```sql
  UPDATE subscriptions SET trial_end = trial_end + INTERVAL 'X days', status = 'trialing' WHERE team_id = :team_id
  ```
- [ ] Peut etre execute via Supabase SQL Editor ou future interface admin
- [ ] Documente dans le guide admin

**Priority:** 4 | **Size:** XS | **Layer:** Backend | **Depends On:** US-002

---

### Epic 12 : Testing & Deployment

#### US-032 : Configuration Stripe Dashboard production
**As a** developer,
**I want** Stripe Dashboard fully configured for production,
**So that** all features work end-to-end.

**Acceptance Criteria:**
- [ ] Produit "SEIDO Subscription" cree avec 2 prix :
  - Annuel : 50€ HT/unit/year (recurring, per unit)
  - Mensuel : 5€ HT/unit/month (recurring, per unit)
- [ ] Webhook endpoint configure : `https://app.seido.be/api/stripe/webhook` avec tous les events
- [ ] Smart Retries active (Revenue Recovery)
- [ ] Dunning emails Stripe actives
- [ ] Customer Portal configure : update CB, cancel, change plan/quantity
- [ ] Stripe Tax : Belgium 21% VAT, exclusive, automatic
- [ ] Coupons crees (EARLY2026, REFERRAL, ANNUAL20)

**Priority:** 5 | **Size:** S | **Layer:** Config | **Depends On:** US-001

---

#### US-033 : Tests end-to-end (Stripe test mode)
**As a** developer,
**I want** all subscription flows tested with Stripe test cards,
**So that** I'm confident the integration works before going live.

**Acceptance Criteria:**
- [ ] Tests manuels (checklist) :
  - Nouveau signup → trial demarre, pas de Stripe sub
  - J-7/J-3/J-1 → CRON envoie emails
  - Trial expire > 2 lots → read_only
  - Trial expire ≤ 2 lots → free_tier
  - Subscribe (annuel) → Checkout → active
  - Add lot > limite (CB sauvee) → upgrade direct → prorate
  - Add lot > limite (pas CB) → Checkout
  - Free tier → 3e lot → Checkout
  - Annulation via Portal → cancel_at_period_end → read_only
  - Payment failed (carte 4000000000000341) → past_due
  - Reactivation → nouvelle subscription → active
  - Webhook doublon → idempotency OK
  - Code promo → reduction appliquee
- [ ] Stripe CLI pour tester webhooks localement
- [ ] Rapport de test documente

**Priority:** 5 | **Size:** M | **Layer:** Testing | **Depends On:** all previous

---

### Epic 13 : UX Avancee (Post-MVP)

#### US-034 : Social proof dans trial banner
**As a** gestionnaire en trial,
**I want** to see how many other managers use SEIDO,
**So that** I feel more confident about subscribing.

**Acceptance Criteria:**
- [ ] Compteur dans le trial banner : "Rejoint par X+ gestionnaires ce mois"
- [ ] Source : count teams WHERE status IN ('active', 'trialing') — mis en cache
- [ ] Desktop uniquement (masque sur mobile)

**Priority:** 5 | **Size:** XS | **Layer:** UI | **Depends On:** US-012

---

#### US-035 : Onboarding checklist gamifie
**As a** nouveau gestionnaire en trial,
**I want** a progress checklist guiding me through SEIDO features,
**So that** I discover all value before my trial ends.

**Acceptance Criteria:**
- [ ] Checklist : creer 1 lot, creer 1 intervention, inviter 1 prestataire, uploader 1 document, cloturer 1 intervention
- [ ] Barre de progression visuelle
- [ ] Badge/celebration a chaque etape completee
- [ ] CTA upgrade discret apres 3+ etapes completees

**Priority:** 5 | **Size:** M | **Layer:** UI | **Depends On:** US-018

---

#### US-036 : Strategic in-app notifications
**As a** gestionnaire,
**I want** upgrade prompts at positive moments (after closing interventions, milestones),
**So that** I'm reminded of SEIDO's value at the right time.

**Acceptance Criteria:**
- [ ] Prompts apres : intervention cloturee ("Vous avez economise ~30min"), 10 interventions, 90% quota
- [ ] CTA upgrade uniquement dans les 7 derniers jours du trial ou quand a la limite
- [ ] Pas plus de 1 notification strategique par session

**Priority:** 5 | **Size:** S | **Layer:** UI | **Depends On:** US-018

---

## Resume

| Epic | Stories | Priorite | Estimation |
|------|---------|----------|------------|
| 1 — Foundation | US-001 → US-003 | P1 | XS + M + S |
| 2 — Service Layer | US-004 → US-006 | P2 | S + XS + L |
| 3 — Webhook | US-007 | P2 | M |
| 4 — Server Actions | US-008 | P2 | M |
| 5 — Signup/Trial | US-009 | P2 | S |
| 6 — UI Billing | US-010 → US-017 | P3 | M+S+M+S+M+S+S+S |
| 7 — Integration | US-018 → US-022 | P3 | S+S+M+XS+S |
| 8 — CRON/Emails | US-023 → US-028 | P3-P4 | M+S+M+S+XS+XS |
| 9 — Coupons | US-029 | P3 | S |
| 10 — Reactivation | US-030 → US-031 | P3-P4 | S+XS |
| 11 — Testing | US-032 → US-033 | P5 | S+M |
| 12 — UX Avancee | US-034 → US-036 | P5 | XS+M+S |

**Total : 36 user stories** reparties en 12 epics.

**Ordre d'implementation recommande :**
```
Phase 1 (Backend core) : US-001 → US-009 (9 stories)
Phase 2 (UI + Integration) : US-010 → US-022 (13 stories)
Phase 3 (CRON + Emails) : US-023 → US-029 (7 stories)
Phase 4 (Polish) : US-030 → US-033 (4 stories)
Phase 5 (Post-MVP) : US-034 → US-036 (3 stories)
```

---

## Dependances Externes (Pre-requis manuels)

| Action | Qui | Quand |
|--------|-----|-------|
| Creer compte Stripe (si pas deja fait) | Admin SEIDO | Avant Phase 1 |
| Creer produit + 2 prix dans Stripe Dashboard | Admin SEIDO | Avant US-001 |
| Copier les clefs API dans `.env.local` | Developer | Pendant US-001 |
| Configurer webhook endpoint dans Stripe | Developer | Apres US-007 deploy |
| Activer Smart Retries dans Revenue Recovery | Admin SEIDO | Avant go-live |
| Configurer Customer Portal dans Stripe | Admin SEIDO | Avant US-010 |
| Creer les 3 coupons initiaux | Admin SEIDO | Avant US-029 |
| Configurer Stripe Tax (Belgium 21% VAT) | Admin SEIDO | Avant go-live |
