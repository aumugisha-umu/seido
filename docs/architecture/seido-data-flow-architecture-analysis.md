# SEIDO Data Flow and Architecture Analysis

**Date:** 2026-02-24
**Platform:** SEIDO Real Estate Management Platform
**Version:** Production (Preview branch)
**Author:** Architecture Analysis — Claude Code

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Database Schema](#3-database-schema)
4. [Data Flow Patterns](#4-data-flow-patterns)
5. [Authentication and Authorization](#5-authentication-and-authorization)
6. [Intervention Workflow](#6-intervention-workflow)
7. [Email Module Architecture](#7-email-module-architecture)
8. [Stripe Billing Architecture](#8-stripe-billing-architecture)
9. [Communication System](#9-communication-system)
10. [Performance Patterns](#10-performance-patterns)
11. [Key Architectural Decisions and Learnings](#11-key-architectural-decisions-and-learnings)

---

## 1. Executive Summary

SEIDO is a multi-tenant real estate management platform serving four distinct user roles: property managers (gestionnaire), service providers (prestataire), tenants (locataire), and administrators (admin). The platform handles the full lifecycle of property management — from building and lot management through intervention workflows, communication threading, email integration, and subscription billing.

### Platform at a Glance

| Dimension | Count |
|-----------|-------|
| PostgreSQL tables | 44 |
| PostgreSQL functions | 84 (32 RLS + 52 utilities) |
| Triggers | 47 |
| Enums | 42 (39 base + 3 Stripe) |
| Indexes | 209 |
| Migrations | 174 |
| Pages | 89 (across 5+ route groups) |
| API routes | 120 (10 domains + billing CRON) |
| Server action files | 17 |
| Components | 381 (22 directories) |
| Custom hooks | 70 |
| Domain services | 34 |
| Repositories | 21 |
| E-mail templates | 18 |

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.2.6 |
| UI Library | React | 19 |
| Language | TypeScript | 5 (strict mode) |
| Styling | Tailwind CSS | v4 |
| Component Library | shadcn/ui | 50+ components |
| Icons | Lucide React | latest |
| Backend / Database | Supabase (PostgreSQL + RLS) | latest |
| Authentication | @supabase/ssr | SSR cookies |
| Forms | React Hook Form + Zod | latest |
| Billing | Stripe | Subscription API |
| Transactional Email | Resend + React Email | latest |
| Testing | Vitest + Puppeteer | Unit, Integration, E2E |
| Content | gray-matter + react-markdown | Blog system |
| Push Notifications | Web Push (VAPID) | PWA |

---

## 2. System Architecture Overview

### Layered Architecture Diagram

```
+=========================================================================+
|                         BROWSER / CLIENT                                |
|  +-------------------+  +-------------------+  +---------------------+  |
|  | Server Components |  | Client Components |  | PWA Service Worker  |  |
|  | (default, SSR)    |  | (minimal, 'use    |  | (push, offline)     |  |
|  |                   |  |  client')          |  |                     |  |
|  +--------+----------+  +--------+----------+  +---------------------+  |
+=========================================================================+
             |                       |
             v                       v
+=========================================================================+
|                        NEXT.JS 15 APP ROUTER                            |
|                                                                         |
|  +-------------------+  +-------------------+  +---------------------+  |
|  | Server Components |  | API Routes (120)  |  | Server Actions (17) |  |
|  | getServerAuth()   |  | /api/[domain]/... |  | app/actions/*.ts    |  |
|  | SSR data loading  |  | REST endpoints    |  | Form mutations      |  |
|  +--------+----------+  +--------+----------+  +----------+----------+  |
+=========================================================================+
             |                       |                        |
             v                       v                        v
+=========================================================================+
|                       DOMAIN SERVICES (34)                              |
|                                                                         |
|  intervention | notification | email-notification | subscription        |
|  scheduling   | email-sync   | smtp              | subscription-email   |
|  gmail-oauth  | email-reply  | email-to-conversation | ...              |
+=========================================================================+
             |
             v
+=========================================================================+
|                       REPOSITORIES (21)                                 |
|                                                                         |
|  intervention | user       | building    | lot          | notification  |
|  contract     | email      | email-link  | subscription | stripe-cust.  |
|  conversation | activity   | quote       | document     | ...           |
+=========================================================================+
             |
             v
+=========================================================================+
|                    SUPABASE (PostgreSQL + RLS)                          |
|                                                                         |
|  44 tables | 84 functions | 47 triggers | 209 indexes | 42 enums      |
|  6 views (_active, _with_user) | RLS on all tables                     |
+=========================================================================+
             |
             +-----> Supabase Storage (documents, avatars)
             +-----> Supabase Realtime (conversations, notifications)
             +-----> Stripe API (billing, subscriptions)
             +-----> Resend API (transactional email)
             +-----> IMAP servers (email sync)
```

### Folder Structure

```
Seido-app/
|
+-- app/
|   +-- [role]/                     # Role-scoped routes (4 roles)
|   |   +-- admin/                  #   System administration
|   |   +-- gestionnaire/           #   Property manager (70% of users)
|   |   +-- prestataire/            #   Service provider (75% mobile)
|   |   +-- locataire/              #   Tenant
|   +-- api/                        # 120 API routes across 10 domains
|   |   +-- auth/                   #   Authentication callbacks
|   |   +-- buildings/              #   Building CRUD
|   |   +-- contacts/               #   Contact management
|   |   +-- conversations/          #   Thread & message operations
|   |   +-- emails/                 #   IMAP sync, SMTP send, blacklist
|   |   +-- interventions/          #   Intervention lifecycle
|   |   +-- notifications/          #   Notification management
|   |   +-- stripe/                 #   Webhook handler
|   |   +-- cron/                   #   4 CRON jobs (billing)
|   |   +-- upload-avatar/          #   Avatar uploads
|   +-- actions/                    # 17 server action files
|   +-- auth/                       # Login, callback, signup
|   +-- blog/                       # Blog index + [slug] pages
|
+-- components/                     # 381 components (22 directories)
|   +-- ui/                         #   shadcn/ui base components
|   +-- interventions/              #   Intervention-specific components
|   |   +-- shared/cards/           #     15 shared card components
|   +-- billing/                    #   11 billing UI components
|   +-- auth/                       #   Login, onboarding
|   +-- blog/                       #   Blog rendering
|
+-- hooks/                          # 70 custom hooks
|
+-- lib/
|   +-- services/
|   |   +-- core/                   #   Supabase clients (4 types), base repo
|   |   +-- repositories/           #   21 repositories (data access)
|   |   +-- domain/                 #   34 services (business logic)
|   |   |   +-- email-notification/ #     15-file notification module
|   |   +-- client/                 #   Client-side service adapters
|   +-- stripe.ts                   #   Stripe client initialization
|   +-- server-context.ts           #   getServerAuthContext()
|   +-- database.types.ts           #   Auto-generated DB types
|
+-- contexts/                       # 3 React contexts (auth, team, realtime)
|
+-- tests/
|   +-- e2e/                        # Puppeteer + Vitest E2E tests
|   +-- integration/                # Integration tests with real Supabase
|   +-- unit/                       # Vitest unit tests
|
+-- supabase/
|   +-- migrations/                 # 174 SQL migrations
|
+-- blog/articles/                  # Markdown blog articles
+-- docs/                           # 226+ documentation files
```

### Four Supabase Client Types

```
+----------------------------------+-------------------------------------------+
| Client Type                      | Usage Context                             |
+----------------------------------+-------------------------------------------+
| createBrowserSupabaseClient()    | Client Components ('use client')          |
| createServerSupabaseClient()     | Server Components, Server Actions         |
| createServiceRoleSupabaseClient()| API routes needing RLS bypass (storage,   |
|                                  | webhooks, CRON jobs)                      |
| createTestSupabaseClient()       | Integration tests (service role)          |
+----------------------------------+-------------------------------------------+
```

---

## 3. Database Schema

### 44 Tables Organized by Phase

```
+=======================================================================+
|  PHASE 1: USERS & TEAMS (6 tables)                                   |
|                                                                       |
|  users --------+------> teams <------- team_members                  |
|  |             |           ^                                          |
|  |             v           |                                          |
|  |        companies ----> company_members                            |
|  |                                                                    |
|  +---> user_invitations                                              |
+=======================================================================+

+=======================================================================+
|  PHASE 2: PROPERTIES (6 tables)                                       |
|                                                                       |
|  buildings ---+---> building_contacts ---> users                     |
|  |            |                                                       |
|  +---> lots --+---> lot_contacts -------> users                      |
|  |            |                                                       |
|  +---> addresses (shared, Google Maps geocoding)                     |
|  |                                                                    |
|  +---> property_documents                                            |
+=======================================================================+

+=======================================================================+
|  PHASE 3: INTERVENTIONS (12 tables)                                   |
|                                                                       |
|  interventions (XOR: building_id OR lot_id)                          |
|  |                                                                    |
|  +---> intervention_assignments (user + role)                        |
|  +---> intervention_time_slots ---> time_slot_responses              |
|  +---> intervention_quotes ------> quote_attachments                 |
|  |                           +---> quote_documents                   |
|  +---> intervention_comments                                         |
|  +---> intervention_reports                                          |
|  +---> intervention_links                                            |
|  +---> intervention_types <--- intervention_type_categories          |
+=======================================================================+

+=======================================================================+
|  PHASE 3: COMMUNICATION (6 tables)                                    |
|                                                                       |
|  conversation_threads ---> conversation_messages                     |
|         |                                                             |
|         +---> conversation_participants                               |
|                                                                       |
|  notifications                                                        |
|  activity_logs                                                        |
|  push_subscriptions                                                   |
+=======================================================================+

+=======================================================================+
|  PHASE 3: EMAIL (4 tables)                                            |
|                                                                       |
|  emails (+ team_email_connections for IMAP/OAuth config)             |
|  |                                                                    |
|  +---> email_attachments                                             |
|  +---> email_links (email -> building/lot/intervention/contract)     |
|  +---> email_blacklist (per-team address filtering)                  |
+=======================================================================+

+=======================================================================+
|  PHASE 4: CONTRACTS (4 tables)                                        |
|                                                                       |
|  contracts ---> contract_contacts                                    |
|  |         +---> contract_documents                                  |
|  |                                                                    |
|  import_jobs (CSV/Excel import tracking)                             |
+=======================================================================+

+=======================================================================+
|  PHASE 5: BILLING (4 tables)                                          |
|                                                                       |
|  subscriptions (team_id, plan, trial, limits)                        |
|  stripe_customers (team_id -> stripe_customer_id mapping)            |
|  stripe_invoices (invoice history)                                   |
|  stripe_webhook_events (idempotency + debugging)                     |
+=======================================================================+
```

### Tables Detail by Phase

#### Phase 1: Users and Teams (6 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `users` | id, auth_user_id, email, role, team_id, is_active | Unified user system (authenticated + contacts) |
| `teams` | id, name, created_by | Multi-tenant isolation root |
| `team_members` | team_id, user_id, role (admin/member) | Team membership junction |
| `companies` | id, name, address_id, team_id | Company entities |
| `company_members` | company_id, user_id | Company membership |
| `user_invitations` | id, email, team_id, role, token | Pending team invitations |

#### Phase 2: Properties (6 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `buildings` | id, name, address_id, team_id, total_lots | Building entities |
| `lots` | id, building_id (nullable), reference, category, is_occupied, team_id, address_id | Individual property units |
| `building_contacts` | building_id, user_id, is_primary, start_date, end_date | Building-user junction |
| `lot_contacts` | lot_id, user_id, is_primary, start_date, end_date | Lot-user junction |
| `property_documents` | id, building_id/lot_id, storage_path, mime_type | Property document storage |
| `addresses` | id, street, postal_code, city, country, lat/lng, place_id, team_id | Centralized addresses (Google Maps) |

#### Phase 3: Interventions (12 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `interventions` | id, reference, title, status, building_id XOR lot_id, tenant_id, team_id, requires_quote | Core intervention entity |
| `intervention_assignments` | intervention_id, user_id, role, is_primary | User-intervention assignments |
| `intervention_time_slots` | intervention_id, proposed_date, status | Scheduling proposals |
| `time_slot_responses` | time_slot_id, user_id, response | Per-user slot responses |
| `intervention_quotes` | intervention_id, provider_id, labor_cost, materials_cost, total_amount, status, quote_type | Quote proposals (estimation/final) |
| `quote_attachments` | quote_id, storage_path | Quote file attachments |
| `quote_documents` | quote_id, storage_path | Quote formal documents |
| `intervention_comments` | intervention_id, user_id, content, is_internal | Discussion thread |
| `intervention_reports` | intervention_id, report_type, content | Closure reports (provider/tenant/manager) |
| `intervention_links` | intervention_id, entity_type, entity_id | Cross-entity linking |
| `intervention_types` | id, name, category_id | Intervention type catalog |
| `intervention_type_categories` | id, name | Type category grouping |

#### Phase 3: Communication (6 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `conversation_threads` | id, intervention_id, thread_type | Conversation containers |
| `conversation_messages` | id, thread_id, sender_id, content | Individual messages |
| `conversation_participants` | thread_id, user_id | Thread membership |
| `notifications` | id, user_id, type, title, read, data | In-app notifications |
| `activity_logs` | id, entity_type, entity_id, action, user_id | Audit trail |
| `push_subscriptions` | id, user_id, endpoint, keys | Web Push subscriptions |

#### Phase 3: Email (4 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `emails` | id, team_id, message_id, in_reply_to_header, references, subject, from/to, direction | Email storage + team connection config |
| `email_attachments` | id, email_id, filename, storage_path | Email file attachments |
| `email_links` | id, email_id, entity_type, entity_id | Entity linking (email to building/lot/intervention/contract/contact) |
| `email_blacklist` | id, team_id, email_address, reason | Per-team email filtering |

#### Phase 4: Contracts (4 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `contracts` | id, team_id, type, start_date, end_date, status | Contract management |
| `contract_contacts` | contract_id, user_id, role | Contract party assignments |
| `contract_documents` | contract_id, storage_path | Contract documents |
| `import_jobs` | id, team_id, type, status, file_path | Bulk import tracking |

#### Phase 5: Billing (4 tables)

| Table | Key Columns | Purpose |
|-------|------------|---------|
| `subscriptions` | id, team_id, stripe_subscription_id, status, plan_type, properties_included, trial_start/end, billable_properties (generated) | Subscription management |
| `stripe_customers` | id, team_id, stripe_customer_id, email | Stripe customer mapping |
| `stripe_invoices` | id, team_id, stripe_invoice_id, amount_due/paid, status, invoice_pdf | Invoice history |
| `stripe_webhook_events` | id, stripe_event_id, event_type, processed, payload | Webhook idempotency |

### Enums (42 total)

#### Core Enums (39)

| Enum | Values | Notes |
|------|--------|-------|
| `user_role` | admin, gestionnaire, prestataire, locataire | 4 roles |
| `intervention_status` | demande, rejetee, approuvee, planification, planifiee, cloturee_par_prestataire, cloturee_par_locataire, cloturee_par_gestionnaire, annulee | 9 statuses (French) |
| `quote_status` | draft, pending, sent, accepted, rejected, expired, cancelled | 7 statuses |
| `conversation_thread_type` | group, tenants_group, providers_group, tenant_to_managers, provider_to_managers | 5 (+1 implicit) types |
| `priority_type` | basse, moyenne, haute, urgente | 4 levels |
| `lot_category` | appartement, maison, studio, commerce, bureau, garage, cave, autre | 8 categories |
| `country` | belgique, france, luxembourg | 3 countries |
| `quote_type` | estimation, final | 2 types (CHECK constraint) |
| `time_slot_status` | requested, selected, cancelled | 3 statuses |

#### Stripe Enums (3)

| Enum | Values |
|------|--------|
| `subscription_status` | trialing, active, past_due, canceled, unpaid, paused |
| `subscription_plan` | essential, professional, enterprise |
| `billing_interval` | monthly, yearly |
| `invoice_status` | draft, open, paid, uncollectible, void |

### PostgreSQL Functions (84)

#### RLS Helper Functions (32)

These functions are called from RLS policies to check permissions:

```
is_admin()                           -- Check if current user is admin
is_gestionnaire()                    -- Check if current user is gestionnaire
is_team_manager(team_id)             -- Check team management permission
get_my_profile_ids()                 -- Return ALL profile IDs for multi-team users
get_building_team_id(building_id)    -- Resolve building -> team
get_lot_team_id(lot_id)              -- Resolve lot -> team
is_tenant_of_lot(lot_id)            -- Check tenant-lot relationship
can_view_building(building_id)       -- Composite building access check
can_view_lot(lot_id)                 -- Composite lot access check
get_current_user_id()                -- Current authenticated user
is_assigned_to_intervention(id)      -- Check intervention assignment
can_view_conversation(thread_id)     -- Multi-profile conversation access
```

#### Utility Functions (52)

```
-- Trigger functions (tr_* prefix)
tr_denormalize_team_id_*()           -- Auto-copy team_id from parent
sync_lot_occupancy()                 -- Compute is_occupied from lot_contacts
update_*_at()                        -- Timestamp maintenance

-- Conversation auto-wiring
add_team_managers_to_thread()        -- Auto-add managers on thread creation
add_assignment_to_conversation_participants()  -- Auto-add assigned users

-- Subscription helpers (5 new)
get_billable_properties_count(team_id)
get_subscription_status(team_id)
check_subscription_can_add_property(team_id)
get_accessible_lot_ids(team_id)
update_subscription_updated_at()
```

### Views (6)

| View | Base Table | Filter |
|------|-----------|--------|
| `interventions_active` | interventions | `deleted_at IS NULL` |
| `buildings_active` | buildings | `deleted_at IS NULL` |
| `lots_active` | lots | `deleted_at IS NULL` |
| `contracts_active` | contracts | `deleted_at IS NULL` |
| `activity_logs_with_user` | activity_logs | Join with users |
| (+ 1 additional) | - | - |

### Soft Delete Pattern

Most business tables use soft delete with two columns:
- `deleted_at TIMESTAMPTZ` - Deletion timestamp
- `deleted_by UUID REFERENCES users(id)` - Who deleted it

Active record views (`*_active`) automatically filter `WHERE deleted_at IS NULL`.

---

## 4. Data Flow Patterns

### Pattern 1: SSR Initial Load + Client Refresh

This is the most common data flow in SEIDO. The server renders the initial page with full data, then the client can refresh via API calls.

```
+-------------------+         +------------------+         +----------------+
|  Server Component |         |  Client Component|         |   API Route    |
|  (page.tsx)       |         |  (*-client.tsx)  |         |  /api/[domain] |
+--------+----------+         +--------+---------+         +--------+-------+
         |                             |                            |
         | 1. getServerAuthContext()   |                            |
         | 2. service.getData(teamId)  |                            |
         | 3. <Client data={data} />   |                            |
         +----------+----------------->|                            |
                    |  props (SSR)     |                            |
                    |                  | 4. User triggers refresh   |
                    |                  +--------------------------->|
                    |                  |  fetch('/api/domain')      |
                    |                  |                            |
                    |                  |<---------------------------+
                    |                  |  JSON response             |
                    |                  |                            |
                    |                  | 5. Update local state      |
                    |                  |                            |
```

**Critical rule:** Both SSR and API refresh MUST use the same query logic (same repository methods, same joins, same filters). Divergence causes hydration mismatches and stale data bugs.

### Pattern 2: Separate Queries with Promise.all

PostgREST nested selects fail silently when RLS blocks inner relations. SEIDO uses separate queries combined with `Promise.all` instead:

```typescript
// CORRECT: Separate queries + Promise.all
const [interventions, assignments, threads] = await Promise.all([
  interventionRepo.findByTeamId(teamId),
  assignmentRepo.findByTeamId(teamId),
  conversationRepo.findByTeamId(teamId),
])

// INCORRECT: Nested PostgREST select (RLS silently drops inner data)
const { data } = await supabase
  .from('interventions')
  .select('*, assignments(*), threads(*)')
```

### Pattern 3: Batch Entity Linking with Promise.allSettled

When linking emails to multiple entities (buildings, lots, interventions, contacts), SEIDO uses `Promise.allSettled` with 409 conflict tolerance:

```
+------------+     +----------------+     +------------------+
|  Email     | --> | Link Service   | --> | Promise.allSettled|
|  received  |     | (batch links)  |     | (N entity links) |
+------------+     +----------------+     +--------+---------+
                                                   |
                         +-----------+-------------+----------+
                         |           |             |          |
                    link to     link to       link to    link to
                    building    lot           interv.    contact
                         |           |             |          |
                    201/409     201/409       201/409    201/409
                    (ok/dup)    (ok/dup)      (ok/dup)   (ok/dup)
```

### Pattern 4: Server Actions for Mutations

For form submissions and state mutations that need server-side validation:

```
Client Component                  Server Action                  Service Layer
+----------------+               +------------------+           +------------------+
| form.onSubmit  | -- formData ->| validateZod()    |           |                  |
|                |               | getAuthContext() |---------->| service.create() |
|                |               | revalidatePath() |           | repo.insert()    |
|                |<-- result  ---|                  |<----------| return data      |
+----------------+               +------------------+           +------------------+
```

### Pattern 5: Realtime Subscriptions

For conversations and notifications, Supabase Realtime provides live updates:

```
+-------------------+     +--------------------+     +------------------+
| RealtimeProvider  |     | Supabase Realtime  |     | PostgreSQL       |
| (React Context)   |<--->| (WebSocket)        |<--->| (Changes API)    |
+-------------------+     +--------------------+     +------------------+
        |
        v
+-------------------+
| useConversation() |  -- subscribes to conversation_messages
| useNotification() |  -- subscribes to notifications
+-------------------+
```

### Data Flow: Complete Intervention Creation

```
1. Tenant submits form
   |
2. Server Action: validateInterventionData()
   |
3. InterventionService.create()
   |
   +-- 3a. InterventionRepository.insert(intervention)
   |        -> triggers: auto-generate reference, denormalize team_id
   |
   +-- 3b. ConversationService.createThreads(interventionId)
   |        -> INSERT conversation_threads (group, tenants_group, providers_group)
   |        -> trigger: add_team_managers_to_thread() auto-adds managers
   |
   +-- 3c. AssignmentService.assign(interventionId, users)
   |        -> INSERT intervention_assignments
   |        -> trigger: add_assignment_to_conversation_participants()
   |
   +-- 3d. TimeSlotService.propose(interventionId, dates)
   |        -> INSERT intervention_time_slots
   |        -> trigger: denormalize team_id
   |
4. NotificationService.notifyInterventionCreated()
   |
   +-- 4a. In-app notification (INSERT notifications)
   +-- 4b. Push notification (Web Push via VAPID)
   +-- 4c. Email notification (Resend API)
   |
5. revalidatePath('/gestionnaire/interventions')
```

**Critical ordering:** Threads BEFORE assignments. The assignment trigger auto-adds users to existing threads, so threads must exist first.

---

## 5. Authentication and Authorization

### Server Authentication Pattern

Every Server Component page uses the centralized `getServerAuthContext()`:

```
+---------------------+     +-------------------------+     +------------------+
| Server Component    |     | getServerAuthContext()   |     | Supabase Auth    |
| (page.tsx)          |---->| lib/server-context.ts    |---->| (SSR cookies)    |
|                     |     |                         |     |                  |
| Receives:           |     | 1. createServerClient() |     | Returns:         |
|  - user             |     | 2. auth.getUser()       |     |  - auth user     |
|  - profile          |     | 3. fetch profile        |     |  - session       |
|  - team             |     | 4. fetch team           |     |                  |
|  - supabase client  |     | 5. validate role        |     |                  |
+---------------------+     +-------------------------+     +------------------+
```

```typescript
// Usage in every page (MANDATORY pattern)
import { getServerAuthContext } from '@/lib/server-context'

export default async function InterventionsPage() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  const service = new InterventionService(supabase)
  const data = await service.getByTeamId(team.id)
  return <InterventionsClient data={data} />
}
```

### Authorization Model

```
+---------------------------------------------------------------------+
|                    ROLE-BASED ACCESS CONTROL                        |
+---------------------------------------------------------------------+
|                                                                     |
|  admin                                                              |
|  +-- Full system access                                             |
|  +-- User management across all teams                               |
|                                                                     |
|  gestionnaire (70% of users)                                        |
|  +-- Full CRUD on team buildings, lots, contracts                   |
|  +-- Intervention lifecycle management                              |
|  +-- Quote approval/rejection                                       |
|  +-- All conversation threads visible                               |
|  +-- Email module access (IMAP sync, compose)                       |
|                                                                     |
|  prestataire (75% mobile)                                           |
|  +-- View assigned interventions only                               |
|  +-- Submit quotes, time slot responses                             |
|  +-- Closure reports                                                |
|  +-- provider_to_managers conversations                             |
|                                                                     |
|  locataire                                                          |
|  +-- Create intervention requests                                   |
|  +-- View own interventions + assigned lot data                     |
|  +-- Tenant validation on closure                                   |
|  +-- tenant_to_managers conversations                               |
+---------------------------------------------------------------------+
```

### RLS Implementation

All 44 tables have Row Level Security enabled. The pattern uses team-based isolation as the primary boundary:

```sql
-- Standard team-based RLS pattern
CREATE POLICY "team_members_select" ON buildings FOR SELECT
USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);

-- Multi-profile support (users in multiple teams)
CREATE FUNCTION get_my_profile_ids() RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT id FROM users WHERE auth_user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### RLS Policy Structure

| Pattern | Tables | Access Logic |
|---------|--------|-------------|
| Team-based | buildings, lots, contracts, emails | `team_id IN (user's teams)` |
| Assignment-based | interventions | Team member OR assigned provider/tenant |
| Participant-based | conversation_threads/messages | `can_view_conversation(thread_id)` |
| Owner-based | notifications, push_subscriptions | `user_id = current user` |
| Service-role only | stripe_*, subscriptions (writes) | All writes via service role client |

### Key RLS Considerations

1. **PERMISSIVE policy merging**: Multiple PERMISSIVE policies on the same (table, role, action) combine with OR. Merge overlapping policies into a single policy to avoid linter warnings.
2. **FOR ALL overlap**: A `FOR ALL` policy overlaps with EVERY action-specific policy. Use individual INSERT/UPDATE/DELETE instead.
3. **`.single()` trap**: Multi-team users can have multiple profiles. Use `.limit(1)` + `data?.[0]` instead of `.single()`.
4. **Service role bypass**: All Stripe-related writes use `createServiceRoleSupabaseClient()` because the authenticated client silently fails on billing table RLS.

---

## 6. Intervention Workflow

### 9-Status Lifecycle

```
+-----------+        +-----------+
|  demande  |------->|  rejetee  |-------> [END]
+-----------+   |    +-----------+
     |          |
     |   reject |
     v          |
+-----------+   |    +-----------+
| approuvee |---+--->|  annulee  |-------> [END]
+-----------+        +-----------+
     |                    ^  ^  ^
     |                    |  |  |
     v                    |  |  |  (annulee reachable from
+--------------+          |  |  |   any active status)
| planification|----------+  |  |
+--------------+             |  |
     |                       |  |
     | (schedule set)        |  |
     v                       |  |
+-----------+                |  |
| planifiee |----------------+  |
+-----------+                   |
     |                          |
     | (work done)              |
     v                          |
+---------------------------+   |
| cloturee_par_prestataire  |---+
+---------------------------+
     |
     | (tenant validates)
     v
+---------------------------+
| cloturee_par_locataire    |
+---------------------------+
     |
     | (manager finalizes)
     v
+---------------------------+
| cloturee_par_gestionnaire |-------> [END]
+---------------------------+
```

### Valid Status Transitions

| From | To | Actor |
|------|----|-------|
| `demande` | `approuvee`, `rejetee`, `annulee` | Gestionnaire |
| `approuvee` | `planification`, `annulee` | Gestionnaire |
| `planification` | `planifiee`, `annulee` | Gestionnaire |
| `planifiee` | `cloturee_par_prestataire`, `annulee` | Prestataire / Gestionnaire |
| `cloturee_par_prestataire` | `cloturee_par_locataire`, `annulee` | Locataire / Gestionnaire |
| `cloturee_par_locataire` | `cloturee_par_gestionnaire` | Gestionnaire |

### Quote Lifecycle (Separate from Status)

Quotes are managed independently via the `requires_quote` flag on interventions and the `intervention_quotes` table. The intervention status remains `planification` throughout the quote process.

```
+------------------+
| requires_quote   |
| = true           |
+--------+---------+
         |
         v
+--------+---------+     +-----------+     +-----------+
|  draft           |---->|  pending  |---->|   sent    |
+------------------+     +-----------+     +-----+-----+
                                                 |
                              +------------------+------------------+
                              |                  |                  |
                              v                  v                  v
                         +---------+       +-----------+     +-----------+
                         | accepted|       | rejected  |     | expired   |
                         +---------+       +-----------+     +-----------+
                              |
                              v
                    +-------------------+
                    | selected_quote_id |  (on intervention)
                    | set to this quote |
                    +-------------------+
```

**Quote types:** `estimation` (preliminary) or `final` (binding). Never use `estimate` (CHECK constraint enforces `valid_quote_type`).

**Quote status:** `accepted` (not `approved`). The DB enum is: draft, pending, sent, accepted, rejected, expired, cancelled.

### XOR Constraint: Building vs Lot

Interventions must reference either a building OR a lot, never both, never neither:

```sql
-- CHECK constraint on interventions table
CHECK (
  (building_id IS NOT NULL AND lot_id IS NULL)
  OR
  (building_id IS NULL AND lot_id IS NOT NULL)
)
```

**Query implication:** When querying interventions for a building, you must check BOTH columns:
```typescript
.or('building_id.eq.X,lot_id.in.(Y)')  // Y = lot IDs of building X
```

`NULL IN (...)` is always false in SQL, so `.in()` alone silently misses NULL rows.

### Three-Phase Closure

```
Phase 1: Provider Closure
  - Provider submits intervention_reports (type: provider_report)
  - Status -> cloturee_par_prestataire

Phase 2: Tenant Validation
  - Tenant reviews + submits intervention_reports (type: tenant_report)
  - Status -> cloturee_par_locataire

Phase 3: Manager Finalization
  - Manager reviews all reports
  - Submits intervention_reports (type: manager_report)
  - Status -> cloturee_par_gestionnaire (terminal)
```

---

## 7. Email Module Architecture

### Overview

The email module provides bidirectional email integration for property managers, including IMAP synchronization, SMTP sending, conversation threading, entity linking, and blacklist management.

```
+===========================================================================+
|                        EMAIL MODULE                                       |
+===========================================================================+
|                                                                           |
|  INBOUND (IMAP Sync)                  OUTBOUND (SMTP via Resend)         |
|  +------------------------+           +---------------------------+       |
|  | team_email_connections |           | Resend API                |       |
|  | (OAuth or credentials) |           | (React Email templates)   |       |
|  +----------+-------------+           +-------------+-------------+       |
|             |                                       ^                     |
|             v                                       |                     |
|  +----------+-------------+           +-------------+-------------+       |
|  | email-sync.service.ts  |           | smtp.service.ts           |       |
|  | (IMAP fetch + parse)   |           | (compose + send)          |       |
|  +----------+-------------+           +---------------------------+       |
|             |                                                             |
|             v                                                             |
|  +----------+--------------------------------------------------+         |
|  |                    emails table                              |         |
|  |  message_id | in_reply_to_header | references | subject     |         |
|  |  from_address | to_addresses | body_html | direction        |         |
|  +----------+--------------------------------------------------+         |
|             |                                                             |
|             +----> email_attachments                                      |
|             +----> email_links (entity linking)                           |
|             +----> email_blacklist (per-team filtering)                   |
|                                                                           |
+===========================================================================+
```

### Conversation Threading (RFC 5322)

Emails are grouped into conversations using standard email headers:

```
generateConversationId(email):
  1. Check in_reply_to_header -> find parent email -> use its conversation_id
  2. Check references array -> find any referenced email -> use its conversation_id
  3. Fallback: generate new conversation_id from message_id

groupEmailsByConversation(emails[]):
  1. Sort emails by date
  2. For each email, call generateConversationId()
  3. Group by conversation_id
  4. Return Map<conversationId, Email[]>
```

### Entity Linking

The `email_links` table connects emails to business entities:

```
email_links
+----------+-------------+-----------+
| email_id | entity_type | entity_id |
+----------+-------------+-----------+
| uuid     | building    | uuid      |
| uuid     | lot         | uuid      |
| uuid     | intervention| uuid      |
| uuid     | contract    | uuid      |
| uuid     | contact     | uuid      |
+----------+-------------+-----------+
```

Entity linking uses batch `Promise.allSettled` with 409 conflict tolerance for deduplication.

### Email Services

| Service | File | Purpose |
|---------|------|---------|
| EmailSyncService | `email-sync.service.ts` | IMAP fetch, parse, store |
| SmtpService | `smtp.service.ts` | Compose and send via Resend |
| EmailReplyService | `email-reply.service.ts` | Process inbound reply emails |
| EmailToConversationService | `email-to-conversation.service.ts` | Sync emails into conversation threads |
| GmailOAuthService | `gmail-oauth.service.ts` | Gmail OAuth token management |
| EmailClientService | `email-client.service.ts` | Client-side email operations |

### Email Notification Module (15 files)

Transactional email notifications use a modular builder pattern:

```
lib/services/domain/
+-- email-notification.service.ts       <- Facade (re-export)
+-- email-notification.factory.ts       <- Factory (webpack-safe)
+-- email-notification/
    +-- index.ts                        <- Re-exports
    +-- types.ts                        <- Interfaces
    +-- constants.ts                    <- Config
    +-- helpers.ts                      <- Utilities
    +-- action-link-generators.ts       <- Magic links
    +-- data-enricher.ts               <- Data fetching
    +-- email-sender.ts                <- Batch sending
    +-- email-notification.service.ts  <- Orchestrator
    +-- builders/                       <- 7 builders
        +-- intervention-created.builder.ts
        +-- intervention-scheduled.builder.ts
        +-- time-slots-proposed.builder.ts
        +-- intervention-completed.builder.ts
        +-- intervention-status-changed.builder.ts
        +-- quote-emails.builder.ts     <- 4 quote builders
```

Total: 2,616 lines across 15 files (all under 500 lines each).

---

## 8. Stripe Billing Architecture

### Overview

SEIDO uses an app-managed trial model with Stripe for subscription billing. New teams start with a 14-day free trial including 2 free properties. No credit card is required for signup.

```
+===========================================================================+
|                      STRIPE BILLING ARCHITECTURE                         |
+===========================================================================+
|                                                                           |
|  TRIAL PHASE (14 days, no card)       PAID PHASE (Stripe managed)        |
|  +---------------------------+        +------------------------------+    |
|  | App-managed trial         |        | Stripe Subscription API      |    |
|  | 2 free properties         |------->| Monthly or Yearly billing    |    |
|  | No Stripe objects yet     |        | Per-property pricing         |    |
|  +---------------------------+        +------------------------------+    |
|                                                                           |
|  +-----------------------------------------------------------------+     |
|  |                    4 DATABASE TABLES                             |     |
|  |  subscriptions | stripe_customers | stripe_invoices | webhooks  |     |
|  +-----------------------------------------------------------------+     |
|                                                                           |
|  +-----------------------------------------------------------------+     |
|  |                    CRON JOBS (4)                                 |     |
|  |  trial-expiration      | trial-notifications                    |     |
|  |  behavioral-triggers   | cleanup-webhook-events                 |     |
|  +-----------------------------------------------------------------+     |
|                                                                           |
|  +-----------------------------------------------------------------+     |
|  |                    WEBHOOK HANDLER (8 events)                   |     |
|  |  invoice.payment_succeeded  | invoice.payment_failed            |     |
|  |  invoice.created            | invoice.finalized                 |     |
|  |  customer.subscription.created                                  |     |
|  |  customer.subscription.updated                                  |     |
|  |  customer.subscription.deleted                                  |     |
|  |  customer.subscription.trial_will_end                           |     |
|  +-----------------------------------------------------------------+     |
|                                                                           |
+===========================================================================+
```

### Subscription Plans

| Plan | Properties Included | Target |
|------|-------------------|--------|
| Essential (trial) | 2 free | New users, small portfolios |
| Professional | 10 | Growing managers |
| Enterprise | Unlimited | Large portfolios |

### Layered Fail Pattern

SEIDO applies different failure strategies at different layers:

```
+----------------------------------+    +----------------------------------+
|     SERVICE LAYER                |    |     PAGE LAYER                   |
|     (Fail-Closed)                |    |     (Fail-Open)                  |
+----------------------------------+    +----------------------------------+
|                                  |    |                                  |
| getAccessibleLotIds()            |    | Lots page                        |
|   error -> return [] (empty)     |    |   error -> show ALL lots + banner|
|   = block all access             |    |   = graceful degradation         |
|                                  |    |                                  |
| checkCanAddProperty()            |    | Lot creation page                |
|   error -> { allowed: false }    |    |   error -> allow creation + warn |
|   = block operation              |    |   = prevent data loss            |
|                                  |    |                                  |
| Security first                   |    | UX first                         |
+----------------------------------+    +----------------------------------+
```

### Lot Access Restriction

When a team exceeds their property quota:

```
Accessible lots = first N lots ordered by created_at
  where N = properties_included + extra_properties

Excess lots:
  +-- List view: visible but with locked overlay
  +-- Detail view: redirected to billing page
  +-- Edit/Delete: blocked at service level
  +-- Trial overage banner: amber, dismissible per session
```

### Stripe Service Architecture

| Component | File | Purpose |
|-----------|------|---------|
| SubscriptionService | `subscription.service.ts` | Core logic: access control, lazy sync, quota checks |
| SubscriptionEmailService | `subscription-email.service.ts` | Trial notifications, payment failure emails |
| SubscriptionRepository | `subscription.repository.ts` | CRUD on subscriptions table |
| StripeCustomerRepository | `stripe-customer.repository.ts` | CRUD on stripe_customers table |
| Stripe Webhook Handler | `stripe-webhook.handler.ts` | Process 8 Stripe event types |
| Subscription Actions | `subscription-actions.ts` | Server actions for checkout, portal, cancel |
| Billing UI Components | `components/billing/` | 11 components (trial banner, locked cards, etc.) |

### Key Stripe Patterns

1. **Lazy sync**: Subscription data is only synced from Stripe API when needed, not on every page load.
2. **Computed column**: `subscriptions.billable_properties` is a GENERATED column using `get_billable_properties_count(team_id)`.
3. **Stale customer IDs**: Always verify via `stripe.customers.retrieve()` before use; recreate if `{ deleted: true }`.
4. **OAuth gap**: OAuth signup bypasses the `handle_new_user_confirmed()` trigger. Subscription init must be mirrored in `completeOAuthProfileAction()`.
5. **All writes via service role**: Billing table RLS blocks authenticated client writes silently.

---

## 9. Communication System

### Conversation Thread Architecture

Each intervention creates multiple conversation threads to enforce privacy boundaries:

```
Intervention Created
|
+---> group thread               (ALL participants)
+---> tenants_group thread        (all tenants + managers)
+---> providers_group thread      (all providers + managers)
+---> tenant_to_managers thread   (1 specific tenant + managers)
+---> provider_to_managers thread (1 specific provider + managers)
```

#### Thread Type Visibility Matrix

| Thread Type | Gestionnaire | Prestataire (assigned) | Locataire (tenant) |
|-------------|:------------:|:---------------------:|:-----------------:|
| group | Yes | Yes | Yes |
| tenants_group | Yes | No | Yes |
| providers_group | Yes | Yes | No |
| tenant_to_managers | Yes | No | Only if participant |
| provider_to_managers | Yes | Only if participant | No |

#### Auto-Wiring via Triggers

```
1. INSERT conversation_thread
   -> trigger: add_team_managers_to_thread()
   -> auto-inserts all team gestionnaires into conversation_participants

2. INSERT intervention_assignment
   -> trigger: add_assignment_to_conversation_participants()
   -> auto-inserts assigned user into relevant threads
   -> guard: auth_user_id IS NOT NULL (skip contacts without accounts)
```

### Notification Architecture

20 server actions handle multi-channel notifications:

```
+----------------------+     +-------------------+     +------------------+
| Server Action        |     | NotificationService|    | Channels         |
| (app/actions/)       |---->| (domain service)  |---->|                  |
+----------------------+     +-------------------+     | 1. In-app (DB)   |
                                                       | 2. Push (VAPID)  |
                                                       | 3. Email (Resend)|
                                                       +------------------+
```

#### Available Notification Actions (20)

| Category | Actions |
|----------|---------|
| Interventions | createInterventionNotification, notifyInterventionStatusChange |
| Buildings | createBuildingNotification, notifyBuildingUpdated, notifyBuildingDeleted |
| Lots | createLotNotification, notifyLotUpdated, notifyLotDeleted |
| Contacts | createContactNotification |
| Documents | notifyDocumentUploaded |
| Contracts | notifyContractExpiring, checkExpiringContracts, createContractNotification |
| Quotes | notifyQuoteRequested, notifyQuoteApproved, notifyQuoteRejected, notifyQuoteSubmittedWithPush |
| General | createCustomNotification, markNotificationAsRead, markAllNotificationsAsRead |

### Push Notifications (PWA)

```
+-------------------+     +-----------------------+     +------------------+
| push_subscriptions|     | sendRoleAwarePush()   |     | Browser Push API |
| (user endpoints)  |<--->| (role-aware URLs)     |---->| (VAPID keys)     |
+-------------------+     +-----------------------+     +------------------+
```

Push notification URLs include the role prefix: `/${role}/interventions/${id}`. The `sendRoleAwarePushNotifications()` function resolves the correct URL per recipient role.

### Realtime (Supabase Channels)

A single `RealtimeProvider` (React Context) manages all WebSocket subscriptions:

```typescript
// contexts/realtime-context.tsx
// Single channel subscription pattern (never multiple channels)
const channel = supabase.channel('team-updates')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages' }, handler)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, handler)
  .subscribe()
```

---

## 10. Performance Patterns

### Database-Level Optimizations

#### 209 Indexes

Indexes cover all hot query paths including:

```sql
-- Composite indexes for common filter combinations
CREATE INDEX idx_interventions_team_status ON interventions(team_id, status);
CREATE INDEX idx_interventions_team_status_urgency ON interventions(team_id, status, urgency, created_at DESC);

-- Partial indexes for active records
CREATE INDEX idx_buildings_active ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_active ON lots(team_id) WHERE deleted_at IS NULL;

-- Junction table indexes
CREATE INDEX idx_building_contacts_primary ON building_contacts(building_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_lot_contacts_primary ON lot_contacts(lot_id, is_primary) WHERE is_primary = true;

-- Email deduplication
CREATE UNIQUE INDEX idx_emails_message_id ON emails(message_id);
```

#### Denormalized team_id

Four tables have `team_id` auto-synchronized via triggers to avoid expensive joins in RLS:

| Table | Parent | Trigger |
|-------|--------|---------|
| conversation_messages | conversation_threads | tr_denormalize_team_id_messages |
| building_contacts | buildings | tr_denormalize_team_id_building_contacts |
| lot_contacts | lots | tr_denormalize_team_id_lot_contacts |
| intervention_time_slots | interventions | tr_denormalize_team_id_time_slots |

#### Active Record Views

Six PostgreSQL views auto-filter soft-deleted records:

```sql
-- Example: buildings_active
CREATE VIEW buildings_active AS
  SELECT * FROM buildings WHERE deleted_at IS NULL;
```

Application code should always query `*_active` views instead of base tables for business queries.

### Application-Level Optimizations

#### Server Component Default

All pages render as Server Components by default. Client Components are used only when interactivity is required (forms, real-time updates, local state). This minimizes JavaScript bundle sent to the browser.

#### Shared Card Components

15 shared card components (`components/interventions/shared/cards/`) are used across all 3 role views (gestionnaire, prestataire, locataire), preventing duplicate rendering logic:

```
shared/cards/
  intervention-details-card.tsx    (details + location)
  summary-card.tsx                 (status + priority + dates)
  documents-card.tsx               (documents + signed URLs)
  reports-card.tsx                 (closure reports)
  comments-card.tsx                (comments)
  conversation-card.tsx            (conversations)
  quotes-card.tsx                  (quotes)
  planning-card.tsx                (time slots)
  + 7 more...
```

#### Lightweight DTOs

Data fetched on the server is trimmed to lightweight DTOs before being passed as props to Client Components. Only algorithm-critical fields are preserved.

### Email-Specific Performance

- **Unique message_id index**: Prevents duplicate email imports during IMAP sync
- **Conversation grouping**: In-memory algorithm (`generateConversationId` + `groupEmailsByConversation`) avoids expensive SQL joins
- **Batch linking**: `Promise.allSettled` with 409 tolerance for entity linking

### TypeScript Validation

Full `npx tsc --noEmit` causes OOM on this project (4GB+ heap). Use these alternatives:

```bash
# Fast validation (recommended)
npm run lint                          # ESLint with type-aware rules (~30s)

# Targeted file check
npm run lint -- path/to/file.tsx

# Full tsc (only if truly needed, with memory flag)
cmd /c "set NODE_OPTIONS=--max-old-space-size=16384 & npx tsc --noEmit"
```

---

## 11. Key Architectural Decisions and Learnings

### Decision 1: Repository Pattern over Direct Supabase Calls

**Why:** Direct Supabase calls in components lead to scattered query logic, making it impossible to ensure SSR and API routes use the same queries. The repository layer centralizes all data access.

**Impact:** 21 repositories serve as the single source of truth for all database queries. No Supabase `.from()` calls exist outside repositories.

### Decision 2: Separate Queries over Nested PostgREST

**Why:** PostgREST nested selects (e.g., `select('*, assignments(*)')`) fail silently when inner relations are blocked by RLS. Data simply disappears without errors.

**Impact:** All multi-table fetches use `Promise.all` with separate repository calls, trading one round-trip for reliable data.

### Decision 3: App-Managed Trial over Stripe Trial

**Why:** Stripe trials require a payment method upfront. SEIDO needed a zero-friction signup with no card required. The app manages the 14-day trial period and 2-property limit independently.

**Impact:** Simpler onboarding (higher conversion), but more complex subscription state management in the application layer.

### Decision 4: French Status Enums

**Why:** The platform targets the Belgian/French real estate market. French status names (`demande`, `approuvee`, `planifiee`) are directly meaningful to end users and appear in the UI without translation layers.

**Impact:** Database enums, API responses, and UI labels all use the same French values. No translation mapping needed, but English-speaking developers need a reference table.

### Decision 5: XOR Constraint for Building/Lot

**Why:** An intervention can target either a building (common areas) or a specific lot, never both. The XOR constraint prevents ambiguous assignments.

**Impact:** Every query touching interventions must handle both cases. The `.or()` pattern is required when filtering by building (must include both `building_id.eq.X` and `lot_id.in.(lot_ids_of_X)`).

### Decision 6: Layered Fail Pattern (Stripe)

**Why:** Security (don't show unauthorized data) and UX (don't block users on transient errors) have conflicting requirements.

**Impact:** Service layer fails closed (blocks operations on error), while page layer fails open (shows data with a warning banner). Each layer has its own error handling strategy.

### Decision 7: Thread-Before-Assignment Creation Order

**Why:** Database triggers auto-add assigned users to conversation threads. If assignments are created before threads, the trigger finds no threads and users are silently excluded.

**Impact:** Strict ordering: create threads first, then create assignments. The trigger-based auto-wiring depends on this sequence.

### Decision 8: Multi-Profile Support

**Why:** A single person (auth.users) may have accounts in multiple teams (e.g., a provider working with several property managers). The `get_my_profile_ids()` function returns all profile IDs for the authenticated user.

**Impact:** Never use `.single()` on profile queries (will throw on multi-team users). Use `.limit(1)` + `data?.[0]` instead.

### Accumulated Learnings (Key Pitfalls)

| Pitfall | Resolution |
|---------|-----------|
| `.single()` on multi-team users | Use `.limit(1)` + `data?.[0]` |
| PostgREST nested relations + RLS | Separate queries + Promise.all |
| Push URLs without role prefix | `sendRoleAwarePushNotifications()` per role |
| Quote status `approved` in code | Correct value is `accepted` (DB enum) |
| `demande_de_devis` status in code | Removed. Use `requires_quote` flag + `intervention_quotes` table |
| `en_cours` status in code | Removed. Direct transition from `planifiee` to `cloturee_par_prestataire` |
| Time slot `confirmed` status | Correct value is `selected` |
| NULL IN (...) in SQL | Always false. Use `.or()` to cover both XOR sides |
| Assignment before threads | Threads MUST be created before assignments (trigger dependency) |
| OAuth bypasses signup trigger | Mirror subscription init in `completeOAuthProfileAction()` |
| `stripe.customers.retrieve` on deleted | Returns `{ deleted: true }`, does NOT throw |
| Billing writes with auth client | Silently blocked by RLS. Use service role client |
| Bare `npx tsc --noEmit` | OOMs on this project. Use `npm run lint` instead |
| `for ALL` RLS policies | Overlap with every action-specific policy. Use individual policies |

---

## Appendix A: Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role (bypasses RLS) |
| `RESEND_API_KEY` | Server only | Resend email API |
| `RESEND_WEBHOOK_SECRET` | Server only | Resend webhook verification |
| `EMAIL_REPLY_SIGNING_SECRET` | Server only | HMAC signing for reply-to addresses |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + Server | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Server only | Web Push VAPID private key |
| `VAPID_SUBJECT` | Server only | VAPID contact email |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Google Maps API key |
| `STRIPE_SECRET_KEY` | Server only | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_MONTHLY` | Server only | Stripe monthly price ID |
| `STRIPE_PRICE_ID_YEARLY` | Server only | Stripe yearly price ID |

## Appendix B: Testing Infrastructure

| Test Type | Tool | Config | Command |
|-----------|------|--------|---------|
| Unit | Vitest | `vitest.config.ts` | `npm test` |
| Integration | Vitest + real Supabase | `tests/integration/vitest.integration.config.ts` | `npm run test:integration` |
| E2E | Puppeteer + Vitest | `tests/e2e/vitest.e2e.config.ts` | `npm run test:e2e` |
| E2E (headed) | Puppeteer (visible) | same | `npm run test:e2e:headed` |

### Test Helpers

- **Factory pattern**: `createTestIntervention()`, `createFullTestIntervention()` for test data setup
- **Service role client**: `createTestSupabaseClient()` bypasses RLS for test setup/teardown
- **Dashboard-bounce**: Navigate to dashboard first to trigger middleware token refresh
- **DOM .click()**: `page.evaluate(() => btn.click())` bypasses position:fixed overlays

## Appendix C: CRON Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| trial-expiration | Daily | Expire overdue trials, set status to `canceled` |
| trial-notifications | Daily | Send warning emails at 3 days and 1 day before expiry |
| behavioral-triggers | Daily | Engagement-based emails (nudges, tips) |
| cleanup-webhook-events | Weekly | Purge processed webhook events older than 30 days |

---

*Document generated: 2026-02-24*
*Platform: SEIDO Real Estate Management Platform*
*Stack: Next.js 15.2.6 + React 19 + TypeScript 5 + Supabase + Stripe*
*Scale: 44 tables, 84 functions, 47 triggers, 174 migrations, 381 components, 34 services, 21 repositories*
