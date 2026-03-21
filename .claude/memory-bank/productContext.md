# SEIDO Product Context

## Problème Résolu

Les gestionnaires immobiliers passent 70-80% de leur temps en mode "pompier" :
- 2h/jour à chercher des informations dispersées
- 50 appels téléphoniques/jour pour des mises à jour de statut
- Aucune visibilité sur le travail des prestataires
- Chaos multi-canal (WhatsApp, email, SMS, téléphone)

## Solution SEIDO

1. **Plateforme unifiée** - Toutes les communications en un lieu
2. **Suivi temps réel** - Statut intervention visible par tous les acteurs
3. **Portails self-service** - Réduction 70% du volume d'appels
4. **Automatisation** - Templates, actions bulk, notifications intelligentes
5. **Facturation transparente** - Abonnement mensuel/annuel basé sur le nombre de propriétés

## Frustrations par Persona

### Gestionnaire (Thomas - 70% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "2h/jour à chercher les infos" | ContextPanel toujours visible, recherche globale |
| "50 appels/jour pour des statuts" | Portails self-service, statut temps réel |
| "Le prestataire est un trou noir" | Timeline end-to-end, timers SLA |
| "Pas de visibilité sur les coûts" | Facturation claire, essai gratuit 14 jours |

### Prestataire (Marc - 20% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "Infos manquantes sur site" | Indicateur complétude, toutes infos avant déplacement |
| "Délais devis 2 semaines" | Notifications temps réel, suivi deadlines |
| "Annulations dernière minute" | Confirmation J-1, pénalités |

### Locataire (Emma - 10% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "Ne sais pas où en est ma demande" | Timeline 8 étapes style Deliveroo |
| "Délais vagues" | Créneaux précis, rappel J-1 |
| "Documents perdus" | Espace documents centralisé |

## Modules Implémentés

### Phase 1 ✅ Core Architecture
- Authentification (JWT + OAuth Google)
- Gestion utilisateurs, équipes, entreprises
- Invitations avec magic links

### Phase 2 ✅ Property Management
- Biens immobiliers (immeubles, lots)
- Contacts associés
- Documents de propriété

### Phase 3 ✅ Interventions & Communication
- Workflow interventions (9 statuts - simplifié 2026-01)
- Chat/Conversations temps réel (5 thread types - étendu 2026-02)
- Notifications multi-canal (Email + In-App + Push)
- Email (IMAP/SMTP sync)

### Phase 4 ✅ Contracts & Import
- Gestion des contrats
- Documents contractuels
- Jobs d'import

### Phase 5 ✅ UX Improvements (Complete 2026-02)
- [x] Google OAuth integration
- [x] Onboarding modal (5 slides)
- [x] Avatar system
- [x] Email quote stripping improvements
- [x] Gmail OAuth integration (conversation threading)
- [x] Email link tracking (email_links table)
- [x] Memory Bank implementation
- [x] **PWA Push Notifications** (personal user alerts)
- [x] Chat message bubble layout enhancements
- [x] **Confirmation participants** (multi-step validation flow)
- [x] **Intervention types dynamiques** (37 types, admin UI)
- [x] **Individual conversation threads** (NEW 2026-02)
- [x] **Quote workflow notifications** (Email + In-App + Push)

### Phase 6 ✅ Performance & Polish (Complete 2026-02)
- [x] Auth API optimization (250+ calls → 1 per navigation)
- [x] Infinite refresh loop fix (intervention detail page)
- [x] **Property Documents** (upload with slot configs, expiry dates, multi-lot support)
- [x] **Property Interventions Step** (5-step wizard for building/lot creation with scheduled interventions)
- [x] **Intervention Workflow Polish** (7 themes: flag-based quotes, status alignment, finalization)
- [x] **Code Review Fixes** (TDZ, multi-lot bugs, Zod validation, role checks)
- [x] **SEO Landing Page Optimization** (score 52→78/100, JSON-LD, FAQ schema)
- [x] **Blog Section** (landing preview, /blog index with filters, /blog/[slug] articles, sitemap SEO)

### Phase 7 ✅ Stripe Subscription Integration (Complete 2026-02-22)
- [x] **Subscription System** (trial, monthly, yearly plans)
- [x] **Trial Management** (14-day trial, 2 properties free, auto-expire)
- [x] **Lot Access Restriction** (trial overage banner, locked lot cards, server-side gates)
- [x] **Billing Audit Fixes** (mapStripeStatus consolidation, fail-closed patterns, error boundaries)
- [x] **Billing UI** (settings page, Stripe portal, trial notifications)

**Stripe Subscription Features (67 stories implemented):**

1. **Trial System**
   - 14-day trial with 2 properties included free
   - Auto-expire trial after 14 days
   - Trial notifications (7-day, 3-day, 1-day, expired)
   - OAuth signup trial initialization

2. **Subscription Plans**
   - Essential: 2 properties (free trial), then €9.99/month per property
   - Professional: 10 properties, €89.99/month
   - Enterprise: Unlimited properties, custom pricing
   - Monthly and yearly billing intervals

3. **Access Control**
   - Server-side gates on lot detail/edit pages
   - Building detail interventions tab restricted
   - Intervention action guards on locked lots
   - Server Action guards (createLotAction, updateCompleteProperty)

4. **UI Components**
   - Trial overage banner (dismissible, amber theme)
   - Locked lot cards (semi-transparent overlay + "Déverrouiller" button)
   - Billing settings page with Stripe portal integration
   - Subscription status display on dashboard

5. **Behavioral Triggers (CRON Jobs)**
   - Trial expiration check (daily)
   - Trial notifications (7d, 3d, 1d before expiration)
   - Behavioral engagement triggers
   - Webhook event cleanup (7-day retention)

6. **Webhook Handler**
   - 8 Stripe event types: invoice.*, customer.subscription.*
   - Idempotent processing with stripe_webhook_events table
   - Automatic subscription sync from Stripe
   - Payment failure notifications

**Technical Implementation:**
- 4 DB migrations (subscriptions, stripe_customers, stripe_invoices, webhook_events)
- 5 DB functions (billable_properties_count, subscription_status, can_add_property, accessible_lot_ids)
- 2 services (SubscriptionService, SubscriptionEmailService)
- 2 repositories (SubscriptionRepository, StripeCustomerRepository)
- 11 UI components (billing settings, banners, cards)
- 249 test cases (218 unit + 15 integration + 16 E2E)

### Phase 8 🚧 Content & Supplier Management (Mar 2026)
- [x] **Email Section Refonte Phase 1** (12 stories: counts system, navigation, dead code cleanup)
- [x] **AI Phone Assistant Phase 1** (13 stories: webhook hardening, email notifications)
- [x] **Blog Hub/Cluster Architecture** (23 articles, sibling navigation, hub frontmatter)
- [x] **Intervention Planner Refactoring** (6 stories: shared InterventionPlannerStep component)
- [x] **Supplier Contracts** (new entity: DB tables, repository, service, card UI, wizard steps)
- [x] **Email Section Cleanup + Visibility Plumbing** (2026-03-19: 30 files, console->logger, any->unknown, type consolidation, compose modal z-index fix, OAuth/IMAP visibility wiring)
- [x] **Operations Section + Reminders/Recurrence** (2026-03-20: 118 files, 3 new tables, route restructuring, RRULE cron engine)
- [x] **QA Bot E2E Test Suite** (2026-03-21: Playwright, 114 tests, 8 shards, 10 POMs, GitHub Actions CI)
- [x] **Admin Invite** (2026-03-21: `inviteGestionnaireAction` — magic link + Resend email)
- [x] **cancelIntervention bug fix** (2026-03-21: `string | CancellationData` union type)
- [ ] **AI Intervention Agent** (design validated — `docs/AI/ai-intervention-agent-design.md`, Phase 1: 8 stories, Phase 2: 4 stories)
- [ ] **Email Visibility Phase 2** (sharing UI, permission management, end-to-end testing)
- [ ] Landing page redesign (plan exists in docs/plans/)

### Metriques Infrastructure (2026-03-21)
- **420 composants** (UI + dashboards + workflow + blog + billing + contracts + operations)
- **66 hooks** custom
- **25 repositories** + **40 domain services**
- **130 API routes**
- **201 migrations SQL**
- **49 DB tables**
- **23 blog articles** (SEO-optimized, sourced, hub-cluster architecture)
- **168 AGENTS.md learnings**
- **114 Playwright E2E tests** (8 shards, 10 POMs, GitHub Actions CI)

## Fonctionnalités Prévues
- [ ] AI Intervention Agent (Phase 1: manual analysis) - Priorité: Haute - Design: `docs/AI/ai-intervention-agent-design.md`
- [ ] AI Phone Assistant Phase 2 - Priorité: Haute
- [ ] Supplier Contracts Phase 2 (documents, renewal alerts) - Priorité: Moyenne
- [ ] Export PDF rapports - Priorité: Moyenne
- [ ] Integration calendrier - Priorité: Moyenne
- [ ] Dashboard analytics avancé - Priorité: Haute

---
*Derniere mise a jour: 2026-03-21*
*Références: docs/design/persona-gestionnaire-unifie.md, persona-prestataire.md, persona-locataire.md*
*Stripe: docs/stripe/admin-guide.md, docs/stripe/coupon-strategy.md, docs/stripe/production-checklist.md*
