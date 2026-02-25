# SEIDO Architecture — Ruby on Rails Rebuild Guide

> **Document Version**: 3.0.0
> **Last Updated**: 2026-02-24
> **Target Framework**: Ruby on Rails 7.2+ / 8.0 + PostgreSQL 16+
> **Language**: English
>
> **PURPOSE**: Complete architectural specification for rebuilding SEIDO from scratch using Ruby on Rails.
> Designed for developers with no prior knowledge of the existing application.
>
> ---
>
> **POSTGRESQL SHARED** — Both applications use PostgreSQL:
> - **Current app**: Next.js 15 + Supabase (PostgreSQL 15 with RLS)
> - **Target Rails app**: Rails 7.2+ / 8.0 + PostgreSQL 16+
>
> **Implication**: Database schema, functions, triggers, and enums are **directly reusable**.
>
> | Element | Count | Rails Migration |
> |---------|-------|-----------------|
> | Tables | **44** | Structure directly reusable |
> | PostgreSQL Functions | **84** | Keep helpers, convert RLS → Pundit |
> | Triggers | **47** | Review for conversion to callbacks |
> | Enums | **42** | Directly reusable |
> | Indexes | **209** | Review for Rails optimization |
> | Views | **6** | Convert to ActiveRecord scopes |
> | RLS Policies | **50+** | **Convert to Pundit policies** |
> | Migrations | **174** | Supabase SQL migrations |

---

## Document Structure

This guide is split into a **base file** (this document) and **13 satellite files** for easier navigation.

### Quick Start

| # | Document | Description | Key Content |
|---|----------|-------------|-------------|
| 0 | [Getting Started](rails/00-getting-started.md) | Prerequisites, project setup, first run | Ruby, PostgreSQL, Redis setup |

### Core Architecture (Satellites 1-7)

| # | Document | Description | Key Content |
|---|----------|-------------|-------------|
| 1 | [Overview & Personas](rails/01-overview-personas.md) | What SEIDO does, who uses it, intervention workflow | 4 personas, 9 statuses, quote lifecycle |
| 2 | [Tech Stack](rails/02-tech-stack.md) | Gems, libraries, configuration | Rails 7.2+, Devise, Pundit, AASM, Sidekiq |
| 3 | [Data Models](rails/03-data-models.md) | All 44 ActiveRecord models | Users, properties, interventions, emails, Stripe |
| 4 | [Database Migrations](rails/04-database-migrations.md) | Raw PostgreSQL SQL | Extensions, enums, tables, indexes, triggers |
| 5 | [Authorization](rails/05-authorization.md) | Pundit policies, multi-tenant, permissions | 4 roles, team scoping, permission system |
| 6 | [State Machines](rails/06-state-machines.md) | AASM workflows | Interventions, quotes, contracts, subscriptions |
| 7 | [Services & Jobs](rails/07-services-jobs.md) | Service objects, background jobs, Stripe | Creator, StatusUpdater, EmailSync, StripeWebhook |

### Communication & API (Satellite 8)

| # | Document | Description | Key Content |
|---|----------|-------------|-------------|
| 8 | [Real-time & API](rails/08-realtime-api.md) | ActionCable, REST API, auth | WebSocket channels, JWT, serializers |

### Quality & Operations (Satellites 9-12)

| # | Document | Description | Key Content |
|---|----------|-------------|-------------|
| 9 | [Testing](rails/09-testing.md) | Test strategy + enhancements | RSpec, factories, system tests, coverage |
| 10 | [Deployment & DevOps](rails/10-deployment-devops.md) | Docker, CI/CD, monitoring | Puma, Sidekiq, Sentry, backups |
| 11 | [Production Quality](rails/11-production-quality.md) | Performance, security, scalability | N+1, caching, rate limiting, encryption |
| 12 | [Appendices](rails/12-appendices.md) | Seeds, API reference, cheatsheet | Seed data, API endpoints, quick ref |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SEIDO RAILS ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (Hotwire + Tailwind)                      │   │
│  │  Turbo Frames (partial updates)  │  Stimulus (interactivity)         │   │
│  │  Turbo Streams (real-time)       │  ViewComponents (reusable UI)     │   │
│  └──────────────────────────────────┴───────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CONTROLLERS (by role namespace)                     │   │
│  │  Gestionnaire::      │  Prestataire::      │  Locataire::            │   │
│  │  Admin::             │  API::V1::          │  Webhooks::             │   │
│  └──────────────────────┴─────────────────────┴─────────────────────────┘   │
│                                    │                                        │
│                          ┌─────────┴─────────┐                             │
│                          │                   │                             │
│                          ▼                   ▼                             │
│  ┌──────────────────────────┐  ┌──────────────────────────┐               │
│  │      PUNDIT POLICIES      │  │     SERVICE OBJECTS       │               │
│  │  (Authorization)          │  │  (Business Logic)         │               │
│  │                           │  │                           │               │
│  │  BuildingPolicy           │  │  Interventions::Creator   │               │
│  │  InterventionPolicy       │  │  Notifications::Creator   │               │
│  │  LotPolicy                │  │  Stripe::WebhookHandler   │               │
│  │  ContractPolicy           │  │  Emails::SyncService      │               │
│  └──────────────────────────┘  │  Emails::ComposeService    │               │
│                                │  Emails::EntityLinker       │               │
│                                └──────────────────────────┘               │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ACTIVERECORD MODELS (44 tables)                     │   │
│  │  User, Team, Building, Lot, Intervention, Contract, Email             │   │
│  │  Subscription, StripeCustomer, Notification, ConversationThread       │   │
│  │                                                                       │   │
│  │  Concerns: TeamScoped, Discard, PermissionHelper, TranslatableEnum   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    POSTGRESQL 16+ (44 tables)                         │   │
│  │                                                                       │   │
│  │  84 functions │ 47 triggers │ 42 enums │ 209 indexes │ 6 views       │   │
│  │                                                                       │   │
│  │  Multi-tenant: acts_as_tenant + team_id on ALL business tables       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    BACKGROUND JOBS (Sidekiq + Redis)                   │   │
│  │                                                                       │   │
│  │  EmailSyncJob          │  PushNotificationJob    │  TrialExpirationJob│   │
│  │  EmailSyncAllJob       │  ReminderNotificationJob│  TrialNotifyJob    │   │
│  │  EmailDeliveryJob      │  ExpireQuotesJob        │  WebhookCleanupJob │   │
│  │  SyncStripeSubscriptions│ ExpireInvitationsJob   │  CleanupNotifications│  │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    EXTERNAL SERVICES                                   │   │
│  │                                                                       │   │
│  │  Stripe (billing)     │  Resend (email)      │  S3 (file storage)    │   │
│  │  Redis (cache/jobs)   │  ActionCable (WS)    │  Google Maps (geo)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current Application Metrics (2026-02-24)

> These metrics reflect the current Next.js/Supabase implementation state.
> The Rails rebuild should achieve feature parity.

| Component | Count | Notes |
|-----------|-------|-------|
| **Database Tables** | **44** | PostgreSQL (directly reusable) |
| **PostgreSQL Functions** | **84** | 32 RLS → Pundit, 52 utilities → keep or convert to callbacks |
| **Triggers** | **47** | Review: keep DB-level or convert to ActiveRecord callbacks |
| **Enums** | **42** | Directly reusable (39 base + 3 Stripe) |
| **Indexes** | **209** | Performance optimization (review for Rails conventions) |
| **Views** | **6** | Convert to ActiveRecord scopes (default_scope with `kept`) |
| **API Routes** | **120** | 10 domains + billing CRON |
| **Pages** | **89** | 5+ route groups by role |
| **Components** | **381** | → ViewComponents (Hotwire) |
| **Custom Hooks** | **70** | → Stimulus controllers + Turbo Frames |
| **Domain Services** | **34** | → Service objects (app/services/) |
| **Repositories** | **21** | → ActiveRecord models (Repository pattern not needed in Rails) |
| **Server Actions** | **17 files** | → Controller actions |
| **Intervention Statuses** | **9** | AASM state machine |
| **Quote Statuses** | **7** | draft, pending, sent, accepted, rejected, expired, cancelled |
| **Conversation Thread Types** | **6** | group, tenants_group, providers_group, tenant_to_managers, provider_to_managers |
| **Email Templates** | **18** | ActionMailer views |
| **Migrations** | **174** | Supabase SQL → Rails migrations |
| **Blog Articles** | **2** | Markdown with YAML frontmatter |
| **Stripe Tables** | **4** | subscriptions, stripe_customers, stripe_invoices, stripe_webhook_events |
| **CRON Jobs** | **4** | trial-expiration, trial-notifications, behavioral-triggers, cleanup-webhooks |
| **E2E Tests** | **25+** | Puppeteer → System tests (Capybara) |
| **Unit Tests** | **12 files** | Vitest → RSpec |
| **Integration Tests** | **5 files** | → Request specs |

---

## Key Domain Concepts

### The Intervention Workflow (Core Business Logic)

The **Intervention** is the central entity — a maintenance request moving through a 9-status lifecycle:

```
demande → approuvee → planification → planifiee → cloturee_par_prestataire → cloturee_par_locataire → cloturee_par_gestionnaire
                                                                                                              ↓
demande → rejetee (terminal)                                            Any non-terminal → annulee (terminal)
```

**Quote Management** is decoupled from status via `requires_quote` boolean + `intervention_quotes` table (7-status lifecycle: draft → pending → sent → accepted/rejected → expired/cancelled).

> Full details: [Overview & Personas → Intervention Workflow](rails/01-overview-personas.md#13-the-intervention-workflow)

### Multi-Tenant Isolation

Every business entity has a `team_id` foreign key. In Rails, use `acts_as_tenant(:team)` to automatically scope ALL queries.

| Current (Supabase) | Rails Equivalent |
|---------------------|-----------------|
| RLS policies on every table | `acts_as_tenant(:team)` gem |
| `get_my_profile_ids()` function | `current_user.teams` |
| `is_team_manager(team_id)` | Pundit policy check |
| `getServerAuthContext('role')` | `before_action :authenticate_user!` + `set_current_tenant` |

> Full details: [Authorization](rails/05-authorization.md)

### Email Module

Full email integration with IMAP sync, SMTP send, conversation threading, entity linking, and blacklist:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  IMAP Sync Job   │────▶│     emails       │────▶│  email_links     │
│  (every 5 min)   │     │  (44 columns)    │     │  (entity linking)│
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
          ┌──────────────┐ ┌──────────┐ ┌──────────────┐
          │ email_       │ │ email_   │ │ Conversation  │
          │ attachments  │ │ blacklist│ │ Grouping      │
          └──────────────┘ └──────────┘ │ (RFC 5322)    │
                                        └──────────────┘
```

**Threading**: Uses RFC 5322 headers (`message_id`, `in_reply_to_header`, `references`) to group emails into conversations client-side.

**Entity Linking**: Emails can be linked to buildings, lots, interventions, contracts, or contacts via the `email_links` junction table. When linking one email from a thread, ALL emails in that thread are batch-linked (with duplicate tolerance).

> Full details: [Data Models → Email](rails/03-data-models.md#367-email-module) | [Services → Email](rails/07-services-jobs.md)

### Stripe Billing

App-managed trial with Stripe subscription integration:

```
┌─────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION LIFECYCLE                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Signup → trialing (14 days, 2 free properties)              │
│              │                                                │
│              ├─→ Checkout → active (Stripe subscription)     │
│              │                                                │
│              └─→ Expired → read-only (no new properties)     │
│                                                               │
│  active → past_due → unpaid → canceled                       │
│  active → paused (read-only)                                 │
│  active → canceled (by user, at period end)                  │
│                                                               │
│  GATES:                                                       │
│  - Lot creation: check quota (properties_included + extra)   │
│  - Lot editing: check accessible lot IDs                     │
│  - Building creation: batch quota check                      │
│  - Read-only mode: trial expired, unpaid, paused             │
│                                                               │
│  FAIL PATTERN:                                                │
│  - Service level: fail-closed (error → block operation)      │
│  - Page level: fail-open (error → show all + warning)        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

> Full details: [State Machines → Subscriptions](rails/06-state-machines.md) | [Services → Stripe](rails/07-services-jobs.md)

---

## Database Schema Overview (44 Tables)

| Phase | Domain | Tables | Key Models |
|-------|--------|--------|------------|
| **1** | Users & Teams | 8 | User, Team, TeamMember, Company, UserInvitation, CompanyMember, Permission, RoleDefaultPermission |
| **CRM** | Contacts & Addresses | 3 | Contact, Address, Document (polymorphic) |
| **2** | Properties | 4 | Building, Lot, BuildingContact, LotContact |
| **3** | Interventions | 12 | Intervention, InterventionAssignment, InterventionTimeSlot, TimeSlotResponse, InterventionQuote, QuoteAttachment, QuoteDocument, InterventionComment, InterventionReport, InterventionLink, InterventionType, InterventionTypeCategory |
| **3** | Communication | 6 | ConversationThread, ConversationMessage, ConversationParticipant, Notification, ActivityLog, PushSubscription |
| **3** | Email | 5 | Email, TeamEmailConnection, EmailAttachment, EmailLink, EmailBlacklist |
| **4** | Contracts & Import | 3 | Contract, ContractContact, ImportJob |
| **Billing** | Stripe | 4 | Subscription, StripeCustomer, StripeInvoice, StripeWebhookEvent |

> **XOR Constraint**: `interventions` has `building_id XOR lot_id` — building-level OR lot-level, never both.
>
> **Soft Delete**: Most tables use `discarded_at` / `discarded_by` (Discard gem). 6 PostgreSQL views (`*_active`) auto-filter deleted records.

> Full details: [Data Models](rails/03-data-models.md) | [Database Migrations](rails/04-database-migrations.md)

---

## Notification Architecture

Multi-channel notifications across 4 delivery methods:

| Channel | Technology | Purpose |
|---------|-----------|---------|
| **In-app** | Database + ActionCable broadcast | Badge counts, notification center |
| **Push** | Web Push (VAPID) via Sidekiq job | Mobile/PWA real-time alerts |
| **Email** | Resend API via ActionMailer | Formal notifications, magic links |
| **Real-time** | ActionCable WebSocket | Live updates (chat, status changes) |

**20 notification triggers** including intervention lifecycle, quote events, contract expiration, document uploads.

> Full details: [Services → Notifications](rails/07-services-jobs.md) | [Real-time](rails/08-realtime-api.md)

---

## 4 User Roles

| Role | Access | Primary Interface | Key Features |
|------|--------|-------------------|--------------|
| **Admin** | All teams, all data | Desktop dashboard | User management, system config |
| **Gestionnaire** | Own team properties | Desktop + mobile (70% users) | Intervention management, quotes, reporting |
| **Prestataire** | Assigned interventions | Mobile-first (75% mobile) | Job details, time slots, quote submission |
| **Locataire** | Own lot/interventions | Mobile-first, occasional use | Report issues, track status, confirm work |

> Full details: [Overview & Personas](rails/01-overview-personas.md#12-user-personas)

---

## Key Architectural Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| **acts_as_tenant** | Multi-tenant isolation without RLS complexity | All queries auto-scoped |
| **Pundit** | Fine-grained authorization by role + team | 12+ policy files |
| **AASM** | Explicit state machine for intervention workflow | 9 states, guard clauses |
| **Sidekiq** | Background jobs for email sync, notifications, Stripe | 12+ job classes |
| **Discard** | Soft delete with audit trail | `discarded_at`, `discarded_by` |
| **Devise + JWT** | Dual auth: session (web) + JWT (API/mobile) | Token refresh, revocation |
| **ActionCable** | Real-time for chat, notifications, dashboards | 4 channel types |
| **Resend** | Email delivery with React Email templates | 18 templates |
| **Stripe** | Subscription billing with app-managed trial | Lazy sync, fail-closed |
| **ViewComponents** | Reusable UI components (like React components) | 15+ shared cards |
| **Hotwire** | SPA-like UX without heavy JS framework | Turbo Frames + Streams |

---

## Critical Learnings from Current Implementation

These patterns were discovered through months of production development. Apply them in the Rails rebuild:

### Database Patterns
1. **XOR constraints** (`building_id XOR lot_id`): Always query BOTH sides with `.or()` — `NULL IN (...)` is always false
2. **Conversation thread creation order**: Insert intervention → threads → assignments → time slots (triggers depend on this order)
3. **Trigger guards**: Always check `auth_user_id IS NOT NULL` before adding conversation participants
4. **Soft delete awareness**: Not all tables have `deleted_at` — verify before filtering

### Auth & Security
5. **Multi-team users**: Never use `.single()` / `.first!` — users can belong to multiple teams
6. **Fail-closed at service level**: Subscription/access checks return empty on error (security first)
7. **Fail-open at page level**: UI shows degraded experience on error (UX first)
8. **CRUD access checklist**: When restricting an entity, gate ALL 5 operations (List, View, Create, Edit, Delete)

### Email Module
9. **Threading headers are algorithm-critical**: `message_id`, `in_reply_to_header`, `references` MUST be preserved in all DTOs
10. **Batch entity-linking**: When linking an email from a thread, link ALL emails in the thread (with duplicate tolerance)
11. **Blacklist check on sync**: Skip emails from blacklisted senders during IMAP sync

### Stripe Integration
12. **App-managed trial**: Store `trial_end` in your own DB, use CRON for notifications — no Stripe Subscription needed during trial
13. **Stale customer IDs**: Always verify via `retrieve()` before use — deleted customers return `{ deleted: true }`, don't throw
14. **Metered vs Standard pricing**: Per-unit billing needs Standard/Licensed, NOT Metered (rejects `quantity` param)
15. **OAuth signup bypasses DB triggers**: Mirror trial init logic in OAuth profile completion action

### UI/UX
16. **Quote status is `accepted` NOT `approved`**: DB enum must match everywhere
17. **Time slot confirmed = `status === 'selected'`** NOT `'confirmed'`
18. **Badge hierarchy**: `destructive` (red) for action-required, `outline` for informational

> Full learnings: See `AGENTS.md` (83 learnings) in the project root.

---

## Getting Started

To begin the Rails rebuild:

1. **Read** [Getting Started](rails/00-getting-started.md) — Set up your development environment
2. **Understand** [Overview & Personas](rails/01-overview-personas.md) — Learn what SEIDO does
3. **Study** [Data Models](rails/03-data-models.md) — Understand the 44-table schema
4. **Implement** [Authorization](rails/05-authorization.md) — Set up multi-tenant isolation first
5. **Build** [State Machines](rails/06-state-machines.md) — Implement the intervention workflow
6. **Add** [Services & Jobs](rails/07-services-jobs.md) — Business logic and background processing
7. **Test** [Testing](rails/09-testing.md) — Comprehensive test strategy

---

## Reference Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | 83 hard-won learnings from development |
| `.claude/memory-bank/techContext.md` | Current technical state (tables, enums, functions) |
| `.claude/memory-bank/systemPatterns.md` | Architecture patterns and anti-patterns |
| `.claude/memory-bank/productContext.md` | Persona frustrations and UX requirements |
| `lib/database.types.ts` | Auto-generated TypeScript types (source of truth for schema) |
| `supabase/migrations/` | 174 SQL migrations (raw schema definitions) |

---

*Last Updated: 2026-02-24*
*Document Version: 3.0.0*
*Status: Production-ready specification for Rails rebuild*
*Current Focus: Email module + Stripe billing + Blog + E2E testing complete*
