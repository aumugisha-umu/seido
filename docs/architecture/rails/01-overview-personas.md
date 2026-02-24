> Part of [SEIDO Rails Architecture](../seido-rails-architecture.md)

---

← Previous: [Getting Started](00-getting-started.md) | Next: [Tech Stack](02-tech-stack.md) →

---

# 1. SEIDO Overview

## 1.1 Application Presentation

### What is SEIDO?

**SEIDO** is a multi-tenant SaaS platform for real estate property management, designed to streamline the coordination of maintenance work (interventions) between property managers, service providers, and tenants.

### The Problem SEIDO Solves

Real estate property management involves complex coordination between multiple stakeholders:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     THE COORDINATION PROBLEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENANT reports          MANAGER must        PROVIDER needs                │
│  a broken pipe    →      find provider   →   schedule visit   →   WORK    │
│                          get quote           confirm time         DONE     │
│                          approve cost        complete job                  │
│                          schedule            invoice                       │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  CURRENT REALITY:                                                          │
│  • Phone calls, emails, paper quotes scattered everywhere                  │
│  • No visibility for tenants on repair status                              │
│  • Managers juggling spreadsheets and WhatsApp groups                      │
│  • Providers confused about job details and schedules                      │
│  • Lost quotes, duplicate work, billing chaos                              │
│                                                                             │
│  SEIDO SOLUTION:                                                           │
│  • Single platform for ALL stakeholders                                    │
│  • Real-time status tracking                                               │
│  • Structured workflow with clear responsibilities                         │
│  • Document management (photos, quotes, invoices)                          │
│  • Complete audit trail                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Value Proposition

| Stakeholder | Pain Point | SEIDO Solution |
|-------------|-----------|----------------|
| **Property Manager** | Coordination chaos, lost paperwork | Centralized dashboard, workflow automation |
| **Service Provider** | Unclear job scope, scheduling conflicts | Clear job details, calendar integration |
| **Tenant** | No visibility, hard to report issues | Mobile-friendly requests, real-time tracking |
| **Property Owner** | No oversight on costs and work | Reports, cost tracking, transparency |

### Key Statistics (Target Scale)

| Metric | Target |
|--------|--------|
| Teams (agencies) | 1,000+ |
| Buildings per team | 5-50 |
| Lots (units) per team | 50-500 |
| Interventions per month/team | 20-100 |
| Users per team | 10-50 |
| Concurrent users | 5,000+ |

### Current Application Metrics (2026-02-24)

> These metrics reflect the current Next.js/Supabase implementation state.

| Component | Count | Notes |
|-----------|-------|-------|
| **Database Tables** | 44 | PostgreSQL (directly reusable) |
| **PostgreSQL Functions** | 84 | RLS + utilities |
| **Triggers** | 47 | Auto-sync team_id, auto-add participants |
| **Enums** | 42 | Directly reusable in Rails |
| **Indexes** | 209 | Performance optimization |
| **API Routes** | 120 | 10+ domains |
| **Pages** | 89 | 5+ route groups by role |
| **Components** | 381 | 22+ directories |
| **Custom Hooks** | 70 | React hooks |
| **Domain Services** | 34 | Business logic |
| **Repositories** | 21 | Data access layer |
| **Server Actions** | 17 files | Server-side mutations |
| **Intervention Statuses** | 9 | Reduced from 11 (2026-01-26) |
| **Conversation Thread Types** | 6 | group, tenant_to_managers, provider_to_managers, email_internal, tenants_group, providers_group |
| **Email Templates** | 18 | React Email (Resend) |
| **Migrations** | 174 | Supabase SQL migrations |
| **Blog Articles** | 2 | Markdown-based |
| **Stripe Tables** | 4 | Billing integration |
| **CRON Jobs** | 4 | Scheduled tasks |
| **E2E Tests** | 25+ | Puppeteer + Vitest |

---

## 1.2 User Personas

SEIDO serves four distinct user personas, each with specific needs, workflows, and interface requirements.

### 1.2.1 Thomas - Property Manager (Gestionnaire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: THOMAS - PROPERTY MANAGER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Age: 42 years old                                                        │
│  • Role: Senior Property Manager at "Immobilière ABC"                       │
│  • Experience: 15 years in real estate                                      │
│  • Portfolio: 280 properties across 12 buildings                            │
│  • Team: 3 assistant managers, 10 regular service providers                 │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: iPhone 14 Pro (80% of usage)                            │
│  • Secondary: MacBook Pro (office work, 20%)                               │
│  • Comfort Level: High - uses multiple apps daily                          │
│  • Preferred Communication: WhatsApp, email                                │
│                                                                             │
│  DAILY WORKFLOW                                                             │
│  ──────────────                                                             │
│  07:30 - Check dashboard for overnight tenant requests                     │
│  08:00-12:00 - Site visits (3-4 buildings), on mobile                      │
│  12:00-14:00 - Office: approve quotes, review reports                      │
│  14:00-17:00 - More site visits, tenant meetings                           │
│  17:00-18:00 - End-of-day review, schedule tomorrow                        │
│                                                                             │
│  PAIN POINTS                                                                │
│  ───────────                                                                │
│  1. "I receive requests via email, phone, WhatsApp - impossible to track"  │
│  2. "Paper quotes get lost, I approve the same work twice sometimes"       │
│  3. "Tenants call constantly asking 'when will it be fixed?'"              │
│  4. "I can't remember which provider is best for what type of work"        │
│  5. "End-of-month reporting is a nightmare - piecing together invoices"    │
│                                                                             │
│  GOALS                                                                      │
│  ─────                                                                      │
│  • Centralize ALL intervention requests in one place                       │
│  • Reduce time spent on coordination by 50%                                │
│  • Provide tenants with self-service status tracking                       │
│  • Have clear cost history per building/lot                                │
│  • Build a reliable provider network with ratings                          │
│                                                                             │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • Time to first response: < 2 hours                                       │
│  • Intervention completion rate: > 95%                                     │
│  • Tenant satisfaction: > 4.5/5                                            │
│  • Quote approval time: < 24 hours                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Thomas's Key Screens:**
1. **Dashboard**: Overview of all interventions by status
2. **Intervention Detail**: Full history, quotes, documents
3. **Provider Assignment**: Find and assign the right provider
4. **Quote Comparison**: Side-by-side quote analysis
5. **Reporting**: Monthly costs by building/lot

---

### 1.2.2 Marc - Service Provider (Prestataire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: MARC - SERVICE PROVIDER                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Age: 38 years old                                                        │
│  • Role: Independent Plumber, "Marc Plomberie SPRL"                        │
│  • Experience: 12 years, licensed master plumber                           │
│  • Coverage: Brussels region + Brabant Wallon                              │
│  • Team: Solo with 1 apprentice                                            │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: Samsung Galaxy S23 (95% of usage)                       │
│  • Secondary: Old laptop (invoicing only)                                  │
│  • Comfort Level: Medium - prefers simple interfaces                       │
│  • Preferred Communication: Phone calls, SMS                               │
│                                                                             │
│  DAILY WORKFLOW                                                             │
│  ──────────────                                                             │
│  07:00 - Load van, check day's schedule on phone                           │
│  07:30-18:00 - On-site jobs (4-6 per day)                                  │
│  Between jobs - Answer calls, review new requests                          │
│  18:00-19:00 - Send quotes, update job status                              │
│  Weekend - Invoicing, ordering supplies                                    │
│                                                                             │
│  PAIN POINTS                                                                │
│  ───────────                                                                │
│  1. "I get jobs via WhatsApp without clear addresses or details"           │
│  2. "Managers call asking for status - I'm under a sink!"                  │
│  3. "Double-booked because different managers don't coordinate"            │
│  4. "I forget to send the quote, then lose the job"                        │
│  5. "Payment takes 60+ days, I have to chase invoices"                     │
│                                                                             │
│  GOALS                                                                      │
│  ─────                                                                      │
│  • Get clear job details with photos BEFORE arriving                       │
│  • One place to see ALL my assigned jobs                                   │
│  • Easy quote submission from phone                                        │
│  • Automatic status updates (no calls from managers)                       │
│  • Faster payment cycle                                                    │
│                                                                             │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • Jobs completed per day: 5-6                                             │
│  • Quote acceptance rate: > 70%                                            │
│  • Average payment time: < 30 days                                         │
│  • Return visits (quality): < 5%                                           │
│                                                                             │
│  MOBILE-FIRST REQUIREMENTS                                                  │
│  ─────────────────────────                                                  │
│  • Large touch targets (working with gloves)                               │
│  • Works offline (basement/parking jobs)                                   │
│  • Quick photo upload                                                      │
│  • Voice notes for job updates                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Marc's Key Screens:**
1. **My Jobs**: List of assigned interventions
2. **Job Detail**: Address, description, photos, history
3. **Time Slot Proposal**: Calendar to propose availability
4. **Quote Submission**: Simple form with line items
5. **Job Completion**: Before/after photos, notes

---

### 1.2.3 Emma - Tenant (Locataire)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: EMMA - TENANT                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Age: 29 years old                                                        │
│  • Role: Marketing Manager at a startup                                    │
│  • Living Situation: Renting 2BR apartment in Brussels                     │
│  • Lease Duration: 2 years (1 year remaining)                              │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: iPhone 15 (100% mobile for personal)                    │
│  • Comfort Level: Very high - digital native                               │
│  • Expectations: Instant feedback, app-like experience                     │
│  • Preferred Communication: In-app notifications, email                    │
│                                                                             │
│  INTERACTION PATTERN                                                        │
│  ───────────────────                                                        │
│  • Frequency: 2-3 intervention requests per year                           │
│  • Urgency: Usually non-urgent (except emergencies)                        │
│  • Expectation: Report problem → Get ETA → Done                            │
│  • Follow-up: Checks status daily when waiting                             │
│                                                                             │
│  PAIN POINTS                                                                │
│  ───────────                                                                │
│  1. "I emailed the agency 3 times, no response"                            │
│  2. "The plumber came when I wasn't home, no coordination"                 │
│  3. "I have no idea if my request was even received"                       │
│  4. "Had to take a day off work waiting for repair"                        │
│  5. "Different people ask me the same questions about the problem"         │
│                                                                             │
│  GOALS                                                                      │
│  ─────                                                                      │
│  • Report problems in 2 minutes from phone                                 │
│  • See clear status updates without calling                                │
│  • Choose convenient time slots for visits                                 │
│  • Communicate with everyone in one place                                  │
│  • Confirm work is done properly                                           │
│                                                                             │
│  SUCCESS METRICS                                                            │
│  ───────────────                                                            │
│  • Request submission time: < 3 minutes                                    │
│  • Time to acknowledgment: < 4 hours                                       │
│  • Scheduling convenience: Can choose from 3+ options                      │
│  • Overall satisfaction: > 4/5                                             │
│                                                                             │
│  SIMPLIFIED INTERFACE REQUIREMENTS                                          │
│  ────────────────────────────────                                           │
│  • Wizard-style request flow (step by step)                                │
│  • Photo upload with annotation                                            │
│  • Clear status badges (Pending, In Progress, Done)                        │
│  • Push notifications for updates                                          │
│  • Minimal required fields                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Emma's Key Screens:**
1. **My Unit**: Overview of her apartment
2. **Report Issue**: Wizard to submit intervention request
3. **My Requests**: List of all her interventions
4. **Request Detail**: Status, timeline, communication
5. **Time Slot Selection**: Choose preferred visit times

---

### 1.2.4 System Administrator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PERSONA: ADMIN - SYSTEM ADMINISTRATOR                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DEMOGRAPHICS                                                               │
│  ─────────────                                                              │
│  • Role: SEIDO Platform Support Engineer                                   │
│  • Responsibility: Multi-tenant system administration                      │
│  • Access: All teams, all data (with audit logging)                        │
│                                                                             │
│  TECHNOLOGY PROFILE                                                         │
│  ──────────────────                                                         │
│  • Primary Device: Desktop workstation                                     │
│  • Tools: Admin dashboard, database access, logs                           │
│  • Comfort Level: Expert - technical background                            │
│                                                                             │
│  KEY RESPONSIBILITIES                                                       │
│  ────────────────────                                                       │
│  • User management (activation, deactivation, password resets)             │
│  • Team onboarding and subscription management                             │
│  • Bug investigation and data fixes                                        │
│  • Performance monitoring                                                  │
│  • Security incident response                                              │
│                                                                             │
│  REQUIRED FEATURES                                                          │
│  ─────────────────                                                          │
│  • User impersonation (support debugging)                                  │
│  • Cross-team search                                                       │
│  • Subscription management                                                 │
│  • Activity logs viewer                                                    │
│  • System health dashboard                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.3 The Intervention Workflow

The **Intervention** is the central entity in SEIDO. It represents a maintenance request that moves through a defined lifecycle from initial request to final closure.

### 1.3.1 Status Overview

> ⚠️ **UPDATED 2026-01-26**: The intervention status enum was simplified from 11 to **9 statuses**.
> The statuses `demande_de_devis` and `en_cours` have been **REMOVED**.
> Quotes are now managed independently via the `requires_quote` flag and `intervention_quotes` table.

SEIDO uses **9 intervention statuses** in French (matching the existing database):

| Status | English Translation | Stage |
|--------|-------------------|-------|
| `demande` | Request | Initial |
| `rejetee` | Rejected | Terminal |
| `approuvee` | Approved | Processing |
| `planification` | Scheduling | Processing |
| `planifiee` | Scheduled | Processing |
| `cloturee_par_prestataire` | Closed by Provider | Closing |
| `cloturee_par_locataire` | Closed by Tenant | Closing |
| `cloturee_par_gestionnaire` | Closed by Manager | Terminal |
| `annulee` | Cancelled | Terminal |

**Quote Management (Separate from Status):**

Instead of a `demande_de_devis` status, quotes are now tracked separately:

| Field/Table | Purpose |
|-------------|---------|
| `interventions.requires_quote` | Boolean flag indicating if quote is needed |
| `intervention_quotes` | Dedicated table with its own lifecycle |
| Quote statuses | `pending`, `sent`, `accepted`, `rejected` |

This separation allows the intervention workflow to continue while quotes are being processed.

### 1.3.2 Visual State Machine

> ⚠️ **UPDATED 2026-01-26**: `demande_de_devis` removed. Quotes managed via `intervention_quotes` table.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      INTERVENTION LIFECYCLE (9 STATUSES)                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌──────────────┐                               │
│                              │              │                               │
│                              │   demande    │  ← TENANT/MANAGER CREATES     │
│                              │   (request)  │                               │
│                              │              │                               │
│                              └──────┬───────┘                               │
│                                     │                                       │
│                        ┌────────────┴────────────┐                          │
│                        │                         │                          │
│                        ▼                         ▼                          │
│               ┌──────────────┐          ┌──────────────┐                    │
│               │              │          │              │                    │
│               │   rejetee    │          │  approuvee   │                    │
│               │  (rejected)  │          │  (approved)  │                    │
│               │              │          │              │                    │
│               │    [END]     │          └──────┬───────┘                    │
│               └──────────────┘                 │                            │
│                                                │                            │
│                                                ▼                            │
│                                   ┌──────────────────┐                      │
│                                   │                  │                      │
│                                   │  planification   │                      │
│                                   │   (scheduling)   │ ← QUOTE PROCESS HERE │
│                                   │                  │   (via requires_quote │
│                                   │                  │    + intervention_    │
│                                   │                  │    quotes table)      │
│                                   └────────┬─────────┘                      │
│                                            │                                │
│                                            ▼                                │
│                               ┌──────────────────┐                          │
│                               │                  │                          │
│                               │    planifiee     │                          │
│                               │   (scheduled)    │                          │
│                               │                  │                          │
│                               └────────┬─────────┘                          │
│                                        │                                    │
│                                        ▼                                    │
│                          ┌──────────────────────────┐                       │
│                          │                          │                       │
│                          │ cloturee_par_prestataire │ ← PROVIDER COMPLETES  │
│                          │   (closed by provider)   │                       │
│                          │                          │                       │
│                          └────────────┬─────────────┘                       │
│                                       │                                     │
│                                       ▼                                     │
│                          ┌──────────────────────────┐                       │
│                          │                          │                       │
│                          │  cloturee_par_locataire  │ ← TENANT VALIDATES    │
│                          │   (closed by tenant)     │                       │
│                          │                          │                       │
│                          └────────────┬─────────────┘                       │
│                                       │                                     │
│                                       ▼                                     │
│                        ┌────────────────────────────┐                       │
│                        │                            │                       │
│                        │ cloturee_par_gestionnaire  │ ← MANAGER FINALIZES   │
│                        │   (closed by manager)      │                       │
│                        │                            │                       │
│                        │           [END]            │                       │
│                        └────────────────────────────┘                       │
│                                                                             │
│  ┌──────────────┐                                                           │
│  │              │                                                           │
│  │   annulee    │  ◀─────── Can be reached from ANY non-terminal state     │
│  │ (cancelled)  │                                                           │
│  │              │                                                           │
│  │    [END]     │                                                           │
│  └──────────────┘                                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3.2b Quote Management (Parallel Process)

Quotes are managed **independently** from the intervention status workflow:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     QUOTE LIFECYCLE (SEPARATE FROM STATUS)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INTERVENTION                              QUOTE (intervention_quotes)      │
│  ────────────                              ────────────────────────         │
│                                                                             │
│  ┌─────────────────┐                       ┌─────────────────┐              │
│  │ planification   │───requires_quote───▶  │    pending      │              │
│  │                 │      = true           │ (awaiting quote)│              │
│  └─────────────────┘                       └────────┬────────┘              │
│         │                                           │                       │
│         │                                           ▼                       │
│         │                                  ┌─────────────────┐              │
│         │                                  │      sent       │              │
│         │                                  │ (quote submitted│              │
│         │                                  │  by provider)   │              │
│         │                                  └────────┬────────┘              │
│         │                                           │                       │
│         │                           ┌───────────────┴───────────────┐       │
│         │                           │                               │       │
│         │                           ▼                               ▼       │
│         │                  ┌─────────────────┐             ┌──────────────┐ │
│         │                  │    accepted     │             │   rejected   │ │
│         │                  │ (quote approved │             │ (quote       │ │
│         │                  │  by manager)    │             │  declined)   │ │
│         │                  └────────┬────────┘             └──────────────┘ │
│         │                           │                                       │
│         ▼                           │ (triggers transition                  │
│  ┌─────────────────┐                │  when all participants                │
│  │   planifiee     │◀───────────────┘  confirmed + quote accepted)         │
│  │                 │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  KEY: The intervention can stay in 'planification' while quotes are         │
│       being processed. Status advances to 'planifiee' when scheduling       │
│       is complete (time slot confirmed + all confirmations received).       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3.3 Status Transitions Table

> ⚠️ **UPDATED 2026-01-26**: `demande_de_devis` transition removed. Quotes handled via separate table.

| Current Status | Next Status | Who Can Trigger | Conditions | Actions |
|----------------|-------------|-----------------|------------|---------|
| `demande` | `approuvee` | Gestionnaire | Valid request | Notify tenant, log activity |
| `demande` | `rejetee` | Gestionnaire | Invalid/duplicate | Notify tenant with reason |
| `approuvee` | `planification` | Gestionnaire | Request approved | Create threads, notify providers |
| `planification` | `planifiee` | System | Time slot confirmed + all participants confirmed | Notify all parties |
| `planifiee` | `cloturee_par_prestataire` | Prestataire | Work completed | Request photos, notify tenant |
| `planifiee` | `cloturee_par_gestionnaire` | Gestionnaire | Direct closure (skip tenant) | Archive, update costs |
| `cloturee_par_prestataire` | `cloturee_par_locataire` | Locataire | Validates quality | Notify manager |
| `cloturee_par_prestataire` | `cloturee_par_gestionnaire` | Gestionnaire | Skip tenant validation | Archive, update costs |
| `cloturee_par_locataire` | `cloturee_par_gestionnaire` | Gestionnaire | Final review | Archive, update costs |
| ANY (non-terminal) | `annulee` | Gestionnaire | Cancel decision | Notify all, log reason |

**Allowed Transitions (TypeScript reference):**

```typescript
const ALLOWED_TRANSITIONS = {
  'demande': ['approuvee', 'rejetee'],
  'rejetee': [],
  'approuvee': ['planification', 'annulee'],
  'planification': ['planifiee', 'annulee'],
  'planifiee': ['cloturee_par_prestataire', 'cloturee_par_gestionnaire', 'annulee'],
  'cloturee_par_prestataire': ['cloturee_par_locataire', 'cloturee_par_gestionnaire'],
  'cloturee_par_locataire': ['cloturee_par_gestionnaire'],
  'cloturee_par_gestionnaire': [],
  'annulee': []
}
```

### 1.3.3b Participant Confirmation Flow

> **NEW 2026-01-25**: Interventions can require participant confirmation before reaching `planifiee` status.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PARTICIPANT CONFIRMATION FLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CREATION (with confirmation required):                                     │
│  ─────────────────────────────────────                                      │
│  • intervention.status = 'planification' (NOT 'planifiee')                  │
│  • intervention.requires_participant_confirmation = true                    │
│  • time_slot.status = 'pending' (NOT 'selected')                           │
│  • For each participant assignment:                                         │
│    - assignment.requires_confirmation = true                               │
│    - assignment.confirmation_status = 'pending'                            │
│                                                                             │
│  CONFIRMATION PROCESS:                                                      │
│  ────────────────────                                                       │
│  API: POST /api/intervention-confirm-participation                          │
│  When participant confirms:                                                 │
│    1. assignment.confirmation_status = 'confirmed'                         │
│    2. Check: Are ALL required participants confirmed?                       │
│       - If YES:                                                            │
│         • intervention.status → 'planifiee'                                │
│         • time_slot.status → 'selected'                                    │
│         • time_slot.selected_by_manager = true                             │
│       - If NO:                                                             │
│         • Stay in 'planification', wait for others                         │
│                                                                             │
│  KEY FIELDS:                                                                │
│  ──────────                                                                 │
│  • interventions.requires_participant_confirmation: boolean                 │
│  • intervention_assignments.requires_confirmation: boolean                  │
│  • intervention_assignments.confirmation_status: 'pending' | 'confirmed'   │
│                                                                             │
│  RULE: Status 'planifiee' is reached ONLY when ALL required participants   │
│        have confirmed. This prevents premature scheduling.                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3.4 Detailed Workflow by Phase

#### Phase 1: Request Submission (Tenant)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 1: REQUEST SUBMISSION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TENANT ACTIONS:                                                            │
│  ───────────────                                                            │
│  1. Select property type (common areas / private unit)                      │
│  2. Choose intervention category:                                           │
│     • plomberie (plumbing)                                                 │
│     • electricite (electrical)                                             │
│     • chauffage (heating)                                                  │
│     • serrurerie (locksmith)                                               │
│     • peinture (painting)                                                  │
│     • menage (cleaning)                                                    │
│     • jardinage (gardening)                                                │
│     • climatisation (air conditioning)                                     │
│     • vitrerie (glazing)                                                   │
│     • toiture (roofing)                                                    │
│     • autre (other)                                                        │
│                                                                             │
│  3. Set urgency level:                                                      │
│     • basse (low) - Can wait 2+ weeks                                      │
│     • normale (normal) - Within 1 week                                     │
│     • haute (high) - Within 48 hours                                       │
│     • urgente (urgent) - Same day (emergency)                              │
│                                                                             │
│  4. Describe the problem (free text)                                        │
│  5. Upload photos (optional but encouraged)                                 │
│  6. Confirm availability for visits                                         │
│                                                                             │
│  SYSTEM ACTIONS:                                                            │
│  ───────────────                                                            │
│  • Create intervention with status = 'demande'                             │
│  • Create conversation thread linked to intervention                        │
│  • Notify gestionnaire(s) of new request                                   │
│  • Log activity                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 2: Triage & Assignment (Manager)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 2: TRIAGE & ASSIGNMENT                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GESTIONNAIRE REVIEWS:                                                      │
│  ─────────────────────                                                      │
│  • Is this a valid request?                                                │
│  • Is it a duplicate of existing intervention?                             │
│  • Does it fall under building maintenance or tenant responsibility?       │
│                                                                             │
│  DECISION TREE:                                                             │
│                                                                             │
│                    ┌─────────────────┐                                      │
│                    │ Valid Request?  │                                      │
│                    └────────┬────────┘                                      │
│                             │                                               │
│              ┌──────────────┴──────────────┐                                │
│              │                             │                                │
│              ▼                             ▼                                │
│         ┌────────┐                   ┌──────────┐                           │
│         │   NO   │                   │   YES    │                           │
│         └────┬───┘                   └─────┬────┘                           │
│              │                             │                                │
│              ▼                             ▼                                │
│    ┌─────────────────┐          ┌─────────────────┐                         │
│    │ Reject with     │          │ Needs external  │                         │
│    │ reason          │          │ quote?          │                         │
│    │ → 'rejetee'     │          └────────┬────────┘                         │
│    └─────────────────┘                   │                                  │
│                                ┌─────────┴─────────┐                        │
│                                │                   │                        │
│                                ▼                   ▼                        │
│                           ┌────────┐          ┌────────┐                    │
│                           │  YES   │          │   NO   │                    │
│                           └────┬───┘          └────┬───┘                    │
│                                │                   │                        │
│                                ▼                   ▼                        │
│                    ┌─────────────────┐   ┌─────────────────┐                │
│                    │ Assign provider │   │ Assign provider │                │
│                    │ Request quote   │   │ Skip to         │                │
│                    │ →'demande_devis'│   │ scheduling      │                │
│                    └─────────────────┘   │ →'planification'│                │
│                                          └─────────────────┘                │
│                                                                             │
│  ASSIGNMENT CREATES:                                                        │
│  ───────────────────                                                        │
│  • intervention_assignments record with role = 'prestataire'               │
│  • Notification to provider                                                │
│  • Activity log entry                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 3: Quote Process (Provider)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 3: QUOTE PROCESS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRESTATAIRE RECEIVES ASSIGNMENT:                                           │
│  ─────────────────────────────────                                          │
│  • Push notification + email                                               │
│  • Job appears in "My Jobs" list                                           │
│                                                                             │
│  PRESTATAIRE ACTIONS:                                                       │
│  ────────────────────                                                       │
│  1. Review job details (description, photos, location)                      │
│  2. Option A: Submit quote directly                                         │
│     • Amount (€)                                                           │
│     • Description of work                                                  │
│     • Validity period (default: 30 days)                                   │
│     • Optional: Line items breakdown                                        │
│                                                                             │
│  3. Option B: Request site visit first                                      │
│     • Propose time slots for assessment visit                              │
│     • Submit quote after visit                                              │
│                                                                             │
│  QUOTE WORKFLOW:                                                            │
│                                                                             │
│         Provider               Manager                  System              │
│            │                      │                        │                │
│            │ Submit quote         │                        │                │
│            │─────────────────────▶│                        │                │
│            │                      │                        │                │
│            │                      │ Review quote           │                │
│            │                      │────────┐               │                │
│            │                      │        │               │                │
│            │                      │◀───────┘               │                │
│            │                      │                        │                │
│            │                      │ Approve/Reject         │                │
│            │                      │───────────────────────▶│                │
│            │                      │                        │                │
│            │                      │                        │ Update status  │
│            │◀─────────────────────│◀───────────────────────│                │
│            │   Notification       │                        │                │
│                                                                             │
│  QUOTE STATUSES:                                                            │
│  ───────────────                                                            │
│  • draft - Being prepared                                                  │
│  • sent - Submitted to manager                                             │
│  • accepted - Approved, work can proceed                                   │
│  • rejected - Declined with reason                                         │
│  • expired - Validity period passed                                        │
│  • cancelled - Withdrawn by provider                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 4: Scheduling (All Parties)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 4: SCHEDULING                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIME SLOT PROPOSAL FLOW:                                                   │
│  ────────────────────────                                                   │
│                                                                             │
│  1. PROVIDER PROPOSES SLOTS                                                 │
│     ┌─────────────────────────────────────────┐                             │
│     │ Provider proposes 3 time slots:         │                             │
│     │                                         │                             │
│     │ □ Mon 15/01 - 09:00-12:00              │                             │
│     │ □ Tue 16/01 - 14:00-17:00              │                             │
│     │ □ Thu 18/01 - 09:00-12:00              │                             │
│     └─────────────────────────────────────────┘                             │
│                     │                                                       │
│                     ▼                                                       │
│  2. TENANT RESPONDS                                                         │
│     ┌─────────────────────────────────────────┐                             │
│     │ Tenant marks availability:              │                             │
│     │                                         │                             │
│     │ ✓ Mon 15/01 - 09:00-12:00 (available)  │                             │
│     │ ✗ Tue 16/01 - 14:00-17:00 (unavailable)│                             │
│     │ ✓ Thu 18/01 - 09:00-12:00 (available)  │                             │
│     └─────────────────────────────────────────┘                             │
│                     │                                                       │
│                     ▼                                                       │
│  3. MANAGER CONFIRMS                                                        │
│     ┌─────────────────────────────────────────┐                             │
│     │ Manager selects final slot:             │                             │
│     │                                         │                             │
│     │ ✓ Mon 15/01 - 09:00-12:00 [SELECTED]   │                             │
│     │                                         │                             │
│     │ Status → 'planifiee'                    │                             │
│     └─────────────────────────────────────────┘                             │
│                                                                             │
│  TIME SLOT STATUSES:                                                        │
│  ───────────────────                                                        │
│  • pending - Proposed, awaiting responses                                  │
│  • selected - Confirmed as final schedule                                  │
│  • rejected - Not suitable for one party                                   │
│  • cancelled - Withdrawn                                                   │
│                                                                             │
│  RESPONSE TRACKING:                                                         │
│  ──────────────────                                                         │
│  time_slot_responses table tracks each user's response to each slot        │
│  • user_id, time_slot_id, response ('accepted'/'rejected'), timestamp      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Phase 5: Work Execution & Closure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 5: EXECUTION & CLOSURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROVIDER COMPLETES WORK:                                                   │
│  ────────────────────────                                                   │
│  1. Mark status as 'cloturee_par_prestataire'                              │
│  2. Upload completion photos                                                │
│  3. Add work notes/report                                                  │
│  4. Optionally: Request signature from tenant                              │
│                                                                             │
│  TENANT VALIDATES:                                                          │
│  ─────────────────                                                          │
│  1. Review work quality                                                    │
│  2. Options:                                                               │
│     • Approve → Status becomes 'cloturee_par_locataire'                    │
│     • Report issue → Stays in current status, comment added                │
│  3. Optional: Rate provider (1-5 stars)                                    │
│                                                                             │
│  MANAGER FINALIZES:                                                         │
│  ─────────────────                                                          │
│  1. Review all documentation                                               │
│  2. Enter final cost (may differ from quote)                               │
│  3. Mark as 'cloturee_par_gestionnaire'                                    │
│  4. Intervention archived but accessible                                   │
│                                                                             │
│  CLOSURE TIMELINE:                                                          │
│                                                                             │
│  Provider       Tenant        Manager        System                         │
│     │              │              │              │                          │
│     │ Complete     │              │              │                          │
│     │─────────────▶│              │              │                          │
│     │              │              │              │ Notify tenant            │
│     │              │◀─────────────│──────────────│                          │
│     │              │              │              │                          │
│     │              │ Validate     │              │                          │
│     │              │─────────────▶│              │                          │
│     │              │              │              │ Notify manager           │
│     │              │              │◀─────────────│                          │
│     │              │              │              │                          │
│     │              │              │ Finalize     │                          │
│     │              │              │─────────────▶│                          │
│     │              │              │              │                          │
│     │              │              │              │ Archive                  │
│     │◀─────────────│◀─────────────│◀─────────────│                          │
│     │   Done       │   Done       │   Done       │                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.4 Multi-Tenant Architecture

SEIDO is built as a **multi-tenant SaaS platform** where each tenant (called a "Team") has completely isolated data.

### 1.4.1 Tenant Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MULTI-TENANT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         ┌──────────────────────┐                            │
│                         │   SEIDO PLATFORM     │                            │
│                         │   (Single Database)  │                            │
│                         └──────────┬───────────┘                            │
│                                    │                                        │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          │                         │                         │              │
│          ▼                         ▼                         ▼              │
│  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐        │
│  │    TEAM A     │        │    TEAM B     │        │    TEAM C     │        │
│  │ (Agency ABC)  │        │ (Property Co) │        │ (Syndic XYZ)  │        │
│  ├───────────────┤        ├───────────────┤        ├───────────────┤        │
│  │               │        │               │        │               │        │
│  │ • 5 Buildings │        │ • 12 Buildings│        │ • 3 Buildings │        │
│  │ • 45 Lots     │        │ • 180 Lots    │        │ • 28 Lots     │        │
│  │ • 58 Users    │        │ • 213 Users   │        │ • 35 Users    │        │
│  │               │        │               │        │               │        │
│  │ team_id: A123 │        │ team_id: B456 │        │ team_id: C789 │        │
│  │               │        │               │        │               │        │
│  └───────────────┘        └───────────────┘        └───────────────┘        │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                           DATA ISOLATION                                    │
│                                                                             │
│  • Team A CANNOT see Team B's buildings, lots, interventions               │
│  • Team A CANNOT see Team C's users (except shared providers)              │
│  • All queries automatically scoped by team_id                             │
│  • Admin users can access all teams (for support)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4.2 Team Membership Model

> ⚠️ **UPDATED 2026-01-28**: The current Next.js/Supabase application uses a **multi-profile model**
> instead of a `team_members` junction table. This is a critical architectural difference for Rails migration.

**Current Model (Next.js/Supabase):**
- Users have **multiple profiles** in the `users` table
- Each profile is linked to ONE team via `team_id`
- All profiles for the same person share the same `auth_user_id` (Supabase Auth UID)
- RLS uses `get_my_profile_ids()` function to query across all profiles

**Rails Migration Options:**
1. **Option A (Recommended)**: Convert to `team_members` junction table (cleaner Rails pattern)
2. **Option B**: Keep multi-profile model with custom scopes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  CURRENT MODEL (Next.js/Supabase) - MULTI-PROFILE           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌─────────────────┐                                  │
│                        │  Supabase Auth  │                                  │
│                        │  (auth.users)   │                                  │
│                        │  auth_user_id   │                                  │
│                        └────────┬────────┘                                  │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                        │
│              │                  │                  │                        │
│              ▼                  ▼                  ▼                        │
│       ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                │
│       │   Profile   │    │   Profile   │    │   Profile   │                │
│       │ (users row) │    │ (users row) │    │ (users row) │                │
│       ├─────────────┤    ├─────────────┤    ├─────────────┤                │
│       │ id: uuid-1  │    │ id: uuid-2  │    │ id: uuid-3  │                │
│       │ team_id: A  │    │ team_id: B  │    │ team_id: C  │                │
│       │ role: gesti │    │ role: presta│    │ role: presta│                │
│       │ auth_user_id│    │ auth_user_id│    │ auth_user_id│                │
│       │   = abc123  │    │   = abc123  │    │   = abc123  │                │
│       └─────────────┘    └─────────────┘    └─────────────┘                │
│                                                                             │
│  SAME auth_user_id = SAME PERSON, different profiles per team              │
│                                                                             │
│  PostgreSQL RLS Function:                                                   │
│  ────────────────────────                                                   │
│  get_my_profile_ids() → Returns array of ALL profile IDs for current user  │
│                                                                             │
│  Example usage in RLS policy:                                               │
│  WHERE user_id = ANY(get_my_profile_ids())                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                  TARGET MODEL (Rails) - TEAM_MEMBERS JUNCTION               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────┐                                    │
│                              │  User   │                                    │
│                              │ (Marc)  │                                    │
│                              └────┬────┘                                    │
│                                   │                                         │
│              ┌────────────────────┼────────────────────┐                    │
│              │                    │                    │                    │
│              ▼                    ▼                    ▼                    │
│       ┌─────────────┐      ┌─────────────┐      ┌─────────────┐            │
│       │ TeamMember  │      │ TeamMember  │      │ TeamMember  │            │
│       ├─────────────┤      ├─────────────┤      ├─────────────┤            │
│       │ team: A     │      │ team: B     │      │ team: C     │            │
│       │ role: gesti │      │ role: presta│      │ role: presta│            │
│       │ joined: 2023│      │ joined: 2024│      │ left: 2024  │            │
│       └─────────────┘      └─────────────┘      └─────────────┘            │
│                                                  (soft deleted)             │
│                                                                             │
│  Marc can:                                                                  │
│  • See interventions assigned to him in Team A and Team B                  │
│  • NOT see anything in Team C (membership ended)                           │
│  • Have different notification preferences per team                        │
│                                                                             │
│  Pundit Policy:                                                             │
│  ──────────────                                                             │
│  current_user.team_ids.include?(record.team_id)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Critical Pattern: Team Selection**

The current application uses a **cookie-based team selection** mechanism:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TEAM SELECTION PATTERN                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Cookie: seido_current_team = team_uuid                                  │
│  2. On each request:                                                        │
│     - Read cookie value                                                     │
│     - Verify user has access to that team                                   │
│     - Set as current_team for session                                       │
│                                                                             │
│  3. Team switcher UI:                                                       │
│     - Dropdown showing all user's teams                                     │
│     - Selection updates cookie                                              │
│     - Page refresh with new team context                                    │
│                                                                             │
│  Rails equivalent (session-based):                                          │
│  ──────────────────────────────────                                         │
│  session[:current_team_id] = params[:team_id]                              │
│  ActsAsTenant.current_tenant = current_user.teams.find(session[:current_team_id])│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**CRITICAL: Avoid `.single()` Pattern**

In the current Supabase implementation, **NEVER** use `.single()` when querying users/profiles:

```typescript
// ❌ WRONG - Fails for multi-team users (PGRST116 error)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', authUserId)
  .single()  // FAILS if user has multiple profiles!

// ✅ CORRECT - Use .limit(1) and array access
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', authUserId)
  .limit(1)

const profile = data?.[0]  // Safe access
```

### 1.4.3 Data Scoping Pattern

In Ruby on Rails, we use the `acts_as_tenant` gem to automatically scope all queries:

```ruby
# Every model that belongs to a team
class Building < ApplicationRecord
  acts_as_tenant(:team)
  # All queries automatically add: WHERE team_id = current_team.id
end

# In controllers
class BuildingsController < ApplicationController
  before_action :set_current_tenant  # Sets ActsAsTenant.current_tenant

  def index
    @buildings = Building.all  # Automatically scoped to current team
  end
end

# The resulting SQL:
# SELECT * FROM buildings WHERE team_id = '...' AND discarded_at IS NULL
```

---

## 1.5 Core Features

### 1.5.1 Properties Module

Manages the real estate portfolio: buildings and individual lots (units).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROPERTIES MODULE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              ┌─────────────┐                                │
│                              │    Team     │                                │
│                              └──────┬──────┘                                │
│                                     │ has_many                              │
│                                     ▼                                       │
│                              ┌─────────────┐                                │
│                              │  Building   │                                │
│                              │ (Immeuble)  │                                │
│                              ├─────────────┤                                │
│                              │ • name      │                                │
│                              │ • address   │──────────▶ Address             │
│                              │ • contacts  │──────────▶ BuildingContacts    │
│                              │ • documents │──────────▶ Documents           │
│                              └──────┬──────┘                                │
│                                     │ has_many                              │
│                                     ▼                                       │
│                              ┌─────────────┐                                │
│                              │    Lot      │                                │
│                              │ (Unit)      │                                │
│                              ├─────────────┤                                │
│                              │ • reference │                                │
│                              │ • category  │ appartement, maison, garage... │
│                              │ • floor     │                                │
│                              │ • contacts  │──────────▶ LotContacts         │
│                              │ • contracts │──────────▶ Contracts           │
│                              └─────────────┘                                │
│                                                                             │
│  LOT CATEGORIES:                                                            │
│  ───────────────                                                            │
│  • appartement (apartment)                                                 │
│  • collocation (shared housing)                                            │
│  • maison (house)                                                          │
│  • garage (garage)                                                         │
│  • local_commercial (commercial space)                                     │
│  • parking (parking spot)                                                  │
│  • autre (other)                                                           │
│                                                                             │
│  KEY FEATURES:                                                              │
│  ─────────────                                                              │
│  • Hierarchical: Building → Lots                                           │
│  • Standalone lots supported (no building parent)                          │
│  • Multiple contacts per building/lot (owner, guardian, etc.)              │
│  • Document storage with versioning                                        │
│  • Soft delete for audit trail                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5.2 Contracts Module

Manages lease agreements with automatic status calculation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONTRACTS MODULE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONTRACT LIFECYCLE:                                                        │
│  ───────────────────                                                        │
│                                                                             │
│     ┌─────────────┐                                                         │
│     │  brouillon  │  Draft - being prepared                                │
│     │   (draft)   │                                                         │
│     └──────┬──────┘                                                         │
│            │ sign                                                           │
│            ▼                                                                │
│     ┌─────────────┐     ┌─────────────┐                                    │
│     │   a_venir   │────▶│    actif    │  Active lease                      │
│     │  (upcoming) │     │   (active)  │                                    │
│     └─────────────┘     └──────┬──────┘                                    │
│                                │                                            │
│               ┌────────────────┼────────────────┐                          │
│               │                │                │                          │
│               ▼                ▼                ▼                          │
│        ┌───────────┐    ┌───────────┐    ┌───────────┐                     │
│        │  expire   │    │  resilie  │    │ renouvele │                     │
│        │ (expired) │    │(terminated│    │ (renewed) │                     │
│        │           │    │           │    │           │                     │
│        └───────────┘    └───────────┘    └───────────┘                     │
│                                                                             │
│  STATUS CALCULATION (automatic based on dates):                             │
│  ───────────────────────────────────────────────                            │
│  • a_venir: start_date > today                                             │
│  • actif: start_date <= today <= end_date                                  │
│  • expire: end_date < today                                                │
│  • resilie: terminated_at IS NOT NULL                                      │
│  • renouvele: renewed_to_contract_id IS NOT NULL                           │
│                                                                             │
│  CONTRACT TYPES:                                                            │
│  ───────────────                                                            │
│  • bail_habitation - Residential lease                                     │
│  • bail_meuble - Furnished lease                                           │
│                                                                             │
│  KEY FIELDS:                                                                │
│  ───────────                                                                │
│  • title, contract_type                                                    │
│  • start_date, duration_months, end_date                                   │
│  • rent_amount, charges_amount                                             │
│  • payment_frequency (mensuel, trimestriel, semestriel, annuel)           │
│  • guarantee_type, guarantee_amount                                        │
│  • signed_date                                                             │
│                                                                             │
│  CONTRACT CONTACTS (junction table):                                        │
│  ───────────────────────────────────                                        │
│  Roles: locataire, colocataire, garant, representant_legal, autre          │
│                                                                             │
│  FEATURES:                                                                  │
│  ─────────                                                                  │
│  • 5-step creation wizard                                                  │
│  • Automatic expiration alerts (30 days, 7 days before)                    │
│  • Contract renewal linking                                                │
│  • Document attachments (lease PDF, amendments, etc.)                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5.3 Communication Module

> ⚠️ **UPDATED 2026-01-29**: Each intervention now has **3 conversation threads** (not 1).
> This enables private channels between different stakeholder groups.

Real-time chat and notifications.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMMUNICATION MODULE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONVERSATION THREAD TYPES (6 total, 3 primary per intervention):           │
│  ──────────────────────────────────────────────                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  1. GROUP THREAD (thread_type = 'group')                             │   │
│  │  ─────────────────────────────────────────                           │   │
│  │  Visible to: ALL participants (managers, providers, tenants)         │   │
│  │  Use case: General updates, coordination messages                    │   │
│  │                                                                       │   │
│  │  [Emma - Tenant]          [Thomas - Manager]          [Marc - Presta] │   │
│  │       ↓                         ↓                          ↓          │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                    GROUP CONVERSATION                            │ │   │
│  │  │  "La fuite continue" → "Marc passe demain" → "OK je confirme"   │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  2. TENANT ↔ MANAGERS (thread_type = 'tenant_to_managers')           │   │
│  │  ─────────────────────────────────────────────────────────           │   │
│  │  Visible to: Tenant + Managers ONLY (providers excluded)             │   │
│  │  Use case: Private tenant concerns, billing questions                │   │
│  │                                                                       │   │
│  │  [Emma - Tenant]          [Thomas - Manager]                          │   │
│  │       ↓                         ↓                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │              PRIVATE: TENANT ↔ MANAGERS                          │ │   │
│  │  │  "Je suis inquiète du coût" → "Ne vous en faites pas, c'est     │ │   │
│  │  │                                couvert par la copropriété"       │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  3. PROVIDER ↔ MANAGERS (thread_type = 'provider_to_managers')       │   │
│  │  ─────────────────────────────────────────────────────────           │   │
│  │  Visible to: Provider + Managers ONLY (tenant excluded)              │   │
│  │  Use case: Technical details, pricing discussions                    │   │
│  │                                                                       │   │
│  │  [Thomas - Manager]          [Marc - Provider]                        │   │
│  │       ↓                            ↓                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │              PRIVATE: PROVIDER ↔ MANAGERS                        │ │   │
│  │  │  "Le problème est plus grave" → "On va devoir changer tout le   │ │   │
│  │  │                                   tuyau, voici le devis"         │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  THREAD CREATION ORDER (CRITICAL):                                          │
│  ─────────────────────────────────                                          │
│  The order of database operations is critical due to triggers:              │
│                                                                             │
│  1. INSERT intervention                                                     │
│  2. INSERT conversation_threads (3 threads)                                 │
│     → Trigger 'thread_add_managers' auto-adds all team managers            │
│  3. INSERT intervention_assignments                                         │
│     → Trigger 'add_assignment_to_conversation_participants'                │
│       auto-adds tenant to 'group' + 'tenant_to_managers'                   │
│       auto-adds provider to 'group' + 'provider_to_managers'               │
│  4. INSERT intervention_time_slots                                          │
│                                                                             │
│  ⚠️ THREADS MUST BE CREATED BEFORE ASSIGNMENTS or triggers won't work!    │
│                                                                             │
│  LAZY THREAD CREATION:                                                      │
│  ─────────────────────                                                      │
│  Individual threads (tenant_to_managers, provider_to_managers) can be      │
│  created lazily on first message if not pre-created.                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          NOTIFICATIONS (20+ Server Actions)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SERVER ACTIONS (app/actions/notification-actions.ts):                      │
│  ─────────────────────────────────────────────────────                      │
│                                                                             │
│  Intervention Notifications:                                                │
│  • createInterventionNotification(interventionId)                          │
│  • notifyInterventionStatusChange(interventionId, newStatus)               │
│                                                                             │
│  Property Notifications:                                                    │
│  • createBuildingNotification, notifyBuildingUpdated, notifyBuildingDeleted│
│  • createLotNotification, notifyLotUpdated, notifyLotDeleted               │
│                                                                             │
│  Contact & Contract Notifications:                                          │
│  • createContactNotification                                               │
│  • notifyContractExpiring, checkExpiringContracts, createContractNotification│
│                                                                             │
│  Quote Notifications (NEW 2026-02-02):                                      │
│  • notifyQuoteRequested                                                    │
│  • notifyQuoteApproved                                                     │
│  • notifyQuoteRejected                                                     │
│  • notifyQuoteSubmittedWithPush                                            │
│                                                                             │
│  General:                                                                   │
│  • markNotificationAsRead, markAllNotificationsAsRead                      │
│  • createCustomNotification, notifyDocumentUploaded                        │
│                                                                             │
│  DELIVERY CHANNELS:                                                         │
│  ─────────────────                                                          │
│  1. In-app (real-time via RealtimeProvider - single WebSocket channel)     │
│  2. Push notifications (WebPush via service worker)                        │
│     • Role-aware URLs (sendRoleAwarePushNotifications)                     │
│     • Only sent to is_personal: true recipients                            │
│  3. Email (Resend with React Email templates - 18 templates)               │
│     • Batch sending with retry logic                                       │
│     • Magic links for auto-login                                           │
│                                                                             │
│  NOTIFICATION TYPES:                                                        │
│  ───────────────────                                                        │
│  • intervention - New request, status change                               │
│  • chat - New message in conversation                                      │
│  • document - New document uploaded                                        │
│  • system - Platform announcements                                         │
│  • team_invite - Invitation to join team                                   │
│  • assignment - Assigned to intervention                                   │
│  • status_change - Intervention status updated                             │
│  • reminder - Upcoming deadlines                                           │
│  • deadline - Contract expiration, etc.                                    │
│  • quote_requested, quote_submitted, quote_accepted, quote_rejected        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          EMAIL SYSTEM (Resend Integration)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  EMAIL MODULE ARCHITECTURE (lib/services/domain/email-notification/):       │
│  ─────────────────────────────────────────────────────────────────────      │
│  16 files, ~2,616 lines - modular architecture:                            │
│                                                                             │
│  email-notification.service.ts  ← Facade (re-export) 32 lines              │
│  email-notification.factory.ts  ← Factory webpack-safe 54 lines            │
│  └── email-notification/                                                    │
│      ├── index.ts               ← Re-exports 41 lines                      │
│      ├── types.ts               ← Interfaces 242 lines                     │
│      ├── constants.ts           ← Config 41 lines                          │
│      ├── helpers.ts             ← Utilities 157 lines                      │
│      ├── action-link-generators.ts ← Magic links 148 lines                 │
│      ├── data-enricher.ts       ← Data fetching 356 lines                  │
│      ├── email-sender.ts        ← Batch sending 278 lines                  │
│      ├── email-notification.service.ts ← Orchestrator 547 lines            │
│      └── builders/              ← 7 builders (~774 lines)                  │
│          ├── intervention-created.builder.ts                               │
│          ├── intervention-scheduled.builder.ts                             │
│          ├── time-slots-proposed.builder.ts                                │
│          ├── intervention-completed.builder.ts                             │
│          ├── intervention-status-changed.builder.ts                        │
│          └── quote-emails.builder.ts (4 quote builders)                    │
│                                                                             │
│  MAGIC LINKS:                                                               │
│  ────────────                                                               │
│  • generateMagicLinkWithAction() - Create auto-login links in emails       │
│  • Token: Supabase Auth OTP (cryptographically secure)                     │
│  • Route: /auth/email-callback?token_hash=xxx&next=/path                   │
│  • Security: validateNextParameter() prevents open redirect                │
│                                                                             │
│  EMAIL REPLY SYNC:                                                          │
│  ─────────────────                                                          │
│  Flow: Resend Webhook → /api/webhooks/resend-inbound →                     │
│        email-reply.service.ts → email-to-conversation.service.ts →         │
│        conversation_messages (source: 'email')                             │
│                                                                             │
│  Reply-To format: reply+int_{intervention_id}_{hmac_hash}@reply.seido-app.com│
│  Security: HMAC validation (EMAIL_REPLY_SIGNING_SECRET)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          ACTIVITY LOGS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Immutable audit trail of ALL significant actions:                         │
│  • Who did what, when, on which entity                                     │
│  • IP address and user agent                                               │
│  • Before/after values for updates                                         │
│  • Cannot be modified or deleted                                           │
│                                                                             │
│  Hierarchical Activity Logs (RPC function):                                │
│  • Building: logs building + lots + contracts + interventions              │
│  • Lot: logs lot + contracts + interventions                               │
│  • Contract: logs contract only                                            │
│  • Contact: logs contact + interventions assigned                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.5.4 Billing Module (Stripe)

Subscription management for teams.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BILLING MODULE (STRIPE)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SUBSCRIPTION MODEL:                                                        │
│  ───────────────────                                                        │
│                                                                             │
│                    ┌────────────────┐                                       │
│                    │     Team       │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │StripeCustomer  │                                       │
│                    │ stripe_id: xxx │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │  Subscription  │                                       │
│                    ├────────────────┤                                       │
│                    │ status: active │                                       │
│                    │ plan: pro      │                                       │
│                    │ seats: 10      │                                       │
│                    └───────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                    ┌────────────────┐                                       │
│                    │ StripeInvoice  │                                       │
│                    │ (history)      │                                       │
│                    └────────────────┘                                       │
│                                                                             │
│  SUBSCRIPTION STATUSES:                                                     │
│  ──────────────────────                                                     │
│  • trialing - Free trial period                                            │
│  • active - Paid and current                                               │
│  • incomplete - Payment pending                                            │
│  • incomplete_expired - Payment failed                                     │
│  • past_due - Payment overdue                                              │
│  • unpaid - Multiple failed payments                                       │
│  • canceled - Subscription ended                                           │
│  • paused - Temporarily suspended                                          │
│                                                                             │
│  PRICING MODEL (suggested):                                                 │
│  ──────────────────────────                                                 │
│  • Free: 1 building, 10 lots, 1 user                                       │
│  • Pro: Unlimited buildings/lots, 10 users, €49/month                      │
│  • Enterprise: Unlimited everything, custom pricing                        │
│                                                                             │
│  STRIPE WEBHOOKS:                                                           │
│  ────────────────                                                           │
│  • customer.subscription.created                                           │
│  • customer.subscription.updated                                           │
│  • customer.subscription.deleted                                           │
│  • invoice.paid                                                            │
│  • invoice.payment_failed                                                  │
│  • checkout.session.completed                                              │
│                                                                             │
│  WEBHOOK SECURITY:                                                          │
│  ─────────────────                                                          │
│  • Verify Stripe signature (STRIPE_WEBHOOK_SECRET)                         │
│  • Idempotency handling (store event IDs)                                  │
│  • Retry logic for failed processing                                       │
│  • Async processing via Sidekiq                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.6 Entity Relationship Diagram

### 1.6.1 High-Level Domain Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SEIDO ENTITY RELATIONSHIP DIAGRAM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│                              ┌─────────────┐                                │
│                              │    Team     │                                │
│                              │ (tenant)    │                                │
│                              └──────┬──────┘                                │
│                                     │                                       │
│        ┌────────────────────────────┼────────────────────────────┐          │
│        │                            │                            │          │
│        ▼                            ▼                            ▼          │
│  ┌───────────┐              ┌───────────────┐             ┌───────────┐     │
│  │   User    │◀────────────▶│ TeamMember    │             │ Building  │     │
│  │           │              │               │             │           │     │
│  └─────┬─────┘              └───────────────┘             └─────┬─────┘     │
│        │                                                        │           │
│        │ creates                                                │ has_many  │
│        ▼                                                        ▼           │
│  ┌───────────────┐                                        ┌───────────┐     │
│  │ Intervention  │◀───────────────────────────────────────│    Lot    │     │
│  │               │                belongs_to              │           │     │
│  └───────┬───────┘                                        └─────┬─────┘     │
│          │                                                      │           │
│          │                                                      │           │
│   ┌──────┼──────┬──────────────┬──────────────┐                │           │
│   │      │      │              │              │                │           │
│   ▼      ▼      ▼              ▼              ▼                ▼           │
│ ┌────┐┌─────┐┌──────┐    ┌──────────┐   ┌─────────┐     ┌───────────┐      │
│ │Assi││Quote││Time  │    │Conversa- │   │Document │     │ Contract  │      │
│ │gnmt││     ││Slot  │    │tion      │   │(poly)   │     │           │      │
│ └────┘└─────┘└──────┘    │Thread    │   └─────────┘     └───────────┘      │
│                          └────┬─────┘                                       │
│                               │                                             │
│                               ▼                                             │
│                          ┌──────────┐                                       │
│                          │ Message  │                                       │
│                          └──────────┘                                       │
│                                                                             │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                               LEGEND                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ───────▶  has_many / has_one                                              │
│  ◀──────▶  many_to_many (through junction table)                           │
│  - - - -▶  polymorphic association                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.6.2 Complete Table Relationships

> ⚠️ **UPDATED 2026-02-02**: The database now includes **44 tables** (up from 33+).
> All tables share the same PostgreSQL database - schema can be directly migrated to Rails.

The complete database schema includes **44 tables** organized in phases:

| Phase | Tables | Description |
|-------|--------|-------------|
| **Phase 1** | users, teams, team_members, companies, company_members, user_invitations | Authentication & multi-tenancy |
| **Phase 2** | buildings, lots, building_contacts, lot_contacts, property_documents, **addresses** | Properties + centralized addresses |
| **Phase 3a** | interventions, intervention_assignments, intervention_time_slots, time_slot_responses, intervention_comments, intervention_reports, intervention_links | Interventions |
| **Phase 3b** | conversation_threads, conversation_messages, conversation_participants | Chat (3 thread types) |
| **Phase 3c** | notifications, activity_logs, push_subscriptions, **email_links** | Notifications & Audit |
| **Phase 4** | contracts, contract_contacts, contract_documents | Contracts |
| **Phase 5** | **intervention_types**, **intervention_type_categories** | Intervention categorization |
| **Phase 6** | **intervention_quotes**, **quote_attachments**, **quote_documents** | Quotes (separate workflow) |
| **Billing** | stripe_customers, subscriptions, stripe_invoices, stripe_prices | Stripe integration |
| **Import** | **import_jobs** | Data import tracking |

### 1.6.3 PostgreSQL Schema for Rails Migration

> **IMPORTANT**: Both applications use PostgreSQL. The schema can be directly migrated.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL SCHEMA - MIGRATION STRATEGY                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DIRECTLY REUSABLE (copy structure to Rails migrations):                    │
│  ─────────────────────────────────────────────────────                      │
│  • Tables (44)           → db/migrate/xxx_create_tables.rb                  │
│  • Enums (39)            → PostgreSQL ENUM (keep as-is)                     │
│  • Indexes (209)         → add_index in migrations                          │
│  • Foreign Keys          → belongs_to/has_many with references              │
│                                                                             │
│  CONVERT TO RAILS PATTERNS:                                                 │
│  ──────────────────────────                                                 │
│  • RLS Policies (50+)    → Pundit policies                                  │
│  • Triggers (47)         → ActiveRecord callbacks (before_save, after_create)│
│  • Views (6)             → default_scope or .kept (discard gem)             │
│                                                                             │
│  KEEP AS POSTGRESQL FUNCTIONS (performance-critical):                       │
│  ─────────────────────────────────────────────────────                      │
│  • get_building_team_id(building_id) → Used in many queries                │
│  • get_lot_team_id(lot_id)           → Used in many queries                │
│  • sync_team_id_* triggers           → Denormalization (keep in DB)        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Table: addresses (NEW - centralized with Google Maps support)**

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Address fields (normalized)
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country country NOT NULL DEFAULT 'belgique',

  -- Google Maps geocoding data
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,              -- Google Places API ID
  formatted_address TEXT,      -- Google-formatted address

  -- Multi-tenant isolation
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- FK relationships:
-- buildings.address_id → addresses.id
-- lots.address_id → addresses.id
-- companies.address_id → addresses.id
```

**PostgreSQL Functions (79 total - 32 RLS + 47 utilities)**

| Category | Count | Examples | Rails Migration |
|----------|-------|----------|-----------------|
| **RLS Verification** | 32 | `is_admin()`, `is_team_manager(team_id)`, `can_view_conversation()` | → Pundit policies |
| **Multi-profile** | 1 | `get_my_profile_ids()` | → `current_user.profiles.pluck(:id)` |
| **Team Resolution** | 4 | `get_building_team_id()`, `get_lot_team_id()` | → Keep as stored function |
| **Tenant Verification** | 2 | `is_tenant_of_lot()`, `is_assigned_to_intervention()` | → Pundit policies |
| **Triggers** | 47 | `tr_sync_team_id_*`, `update_*_at`, `add_team_managers_to_thread()` | → Mix: keep critical, convert others |

**Critical Triggers for Conversations (keep in PostgreSQL)**

| Trigger | Table | Event | Purpose |
|---------|-------|-------|---------|
| `thread_add_managers` | conversation_threads | AFTER INSERT | Auto-add all team managers to thread |
| `add_assignment_participants` | intervention_assignments | AFTER INSERT | Auto-add tenant/provider to threads |

**Enums (39 total - directly reusable)**

```ruby
# Rails enum declaration (maps to PostgreSQL enum)
class Intervention < ApplicationRecord
  # intervention_status enum (9 values - updated 2026-01-26)
  enum :status, {
    demande: 'demande',
    rejetee: 'rejetee',
    approuvee: 'approuvee',
    planification: 'planification',
    planifiee: 'planifiee',
    cloturee_par_prestataire: 'cloturee_par_prestataire',
    cloturee_par_locataire: 'cloturee_par_locataire',
    cloturee_par_gestionnaire: 'cloturee_par_gestionnaire',
    annulee: 'annulee'
  }
end

# quote_status enum (4 values)
class InterventionQuote < ApplicationRecord
  enum :status, {
    pending: 'pending',
    sent: 'sent',
    accepted: 'accepted',
    rejected: 'rejected'
  }
end

# conversation_thread_type enum (6 values)
class ConversationThread < ApplicationRecord
  enum :thread_type, {
    group: 'group',                           # All participants
    tenant_to_managers: 'tenant_to_managers', # Private: tenant ↔ managers
    provider_to_managers: 'provider_to_managers', # Private: provider ↔ managers
    email_internal: 'email_internal',         # Email thread sync
    tenants_group: 'tenants_group',           # Multiple tenants group
    providers_group: 'providers_group'        # Multiple providers group
  }
end
```

### 1.6.4 RLS to Pundit Migration Table

| RLS Policy | Tables Affected | Pundit Policy Equivalent |
|------------|-----------------|-------------------------|
| `is_admin()` | All tables | `AdminPolicy` base class |
| `is_team_manager(team_id)` | interventions, buildings, lots | `record.team_id.in?(current_user.managed_team_ids)` |
| `get_my_profile_ids()` | users, interventions | `current_user.profile_ids.include?(record.user_id)` |
| `can_view_conversation(thread_id)` | conversation_* | `ConversationPolicy#show?` |
| `is_tenant_of_lot(lot_id)` | lots, interventions | `record.lot.tenants.include?(current_user)` |
| `is_assigned_to_intervention(intervention_id)` | intervention_* | `record.intervention.assigned_users.include?(current_user)` |

### 1.6.5 Views to ActiveRecord Scopes

| PostgreSQL View | Purpose | Rails Equivalent |
|-----------------|---------|------------------|
| `interventions_active` | Filter `deleted_at IS NULL` | `default_scope { kept }` (discard gem) |
| `buildings_active` | Filter `deleted_at IS NULL` | `default_scope { kept }` |
| `lots_active` | Filter `deleted_at IS NULL` | `default_scope { kept }` |
| `contracts_active` | Filter `deleted_at IS NULL` | `default_scope { kept }` |
| `activity_logs_with_user` | JOIN with users | `scope :with_user, -> { includes(:user) }` |

---

## 1.7 Authentication Architecture (Reference)

> ⚠️ **NEW SECTION 2026-01-31**: Documents the centralized authentication patterns used in the
> current Next.js/Supabase application. Essential reference for Rails migration.

### 1.7.1 Centralized Auth Helpers

The current application uses **4 specialized auth helpers** depending on context:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MIDDLEWARE (1x per request)    PAGES/LAYOUTS (cached)    CLIENT (1x)      │
│  ┌─────────────────────────┐    ┌────────────────────┐    ┌─────────────┐  │
│  │ Token Refresh           │    │ getServerAuth      │    │ AuthProvider│  │
│  │ (getUser - network)     │    │ Context()          │    │ (useAuth)   │  │
│  └──────────┬──────────────┘    │ (getSession-local) │    └──────┬──────┘  │
│             │                   └─────────┬──────────┘           │         │
│             │                             │                      │         │
│             ▼                             ▼                      ▼         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │         AUTH DATA PASSED AS PARAMETERS (not re-fetched)             │   │
│  │  • Services receive userId/teamId in parameters                     │   │
│  │  • Server Actions use getServerActionAuthContextOrNull()            │   │
│  │  • Hooks client use useAuth() from AuthProvider                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Context | Helper | Behavior | Rails Equivalent |
|---------|--------|----------|------------------|
| **Server Components** | `getServerAuthContext(role)` | Redirect if not authenticated | `before_action :authenticate_user!` |
| **Server Actions** | `getServerActionAuthContextOrNull()` | Return null if not authenticated | `current_user` (no redirect) |
| **API Routes** | `getApiAuthContext()` | Return 401 if not authenticated | `authenticate_or_request_with_http_token` |
| **Client Components** | `useAuth()` hook | State from AuthProvider | `current_user` via Devise helper |

### 1.7.2 API Call Optimization

> **CRITICAL OPTIMIZATION**: Reduced auth API calls from **250+** to **1** per navigation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AUTH API OPTIMIZATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BEFORE (250+ calls per 10 minutes):                                        │
│  ─────────────────────────────────                                          │
│  • Every page called supabase.auth.getUser() (network call)                │
│  • Every Server Action called getUser() independently                      │
│  • Every API route validated token separately                              │
│                                                                             │
│  AFTER (1 call per navigation):                                             │
│  ──────────────────────────────                                             │
│  • Middleware: supabase.auth.getUser() - validates token (1 network call)  │
│  • Pages: supabase.auth.getSession() - reads JWT from cookie (0 calls)     │
│  • cache() function ensures single Supabase client per request             │
│                                                                             │
│  KEY RULES:                                                                 │
│  ──────────                                                                 │
│  • getUser() = network call to Supabase Auth API (use only in middleware)  │
│  • getSession() = local JWT read from cookies (use in pages/layouts)       │
│  • cache() on createServerSupabaseClient() = single client per request     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.7.3 Rails Migration: Devise Patterns

For Rails, use Devise with the following patterns:

```ruby
# config/routes.rb
devise_for :users, controllers: {
  sessions: 'users/sessions',
  registrations: 'users/registrations'
}

# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :authenticate_user!  # Like getServerAuthContext()
  before_action :set_current_team

  private

  def set_current_team
    return unless user_signed_in?

    team_id = session[:current_team_id] || current_user.teams.first&.id
    @current_team = current_user.teams.find_by(id: team_id)

    # Redirect if no valid team (like getServerAuthContext behavior)
    redirect_to root_path, alert: 'No team access' unless @current_team
  end
end

# API controllers (like getServerActionAuthContextOrNull - no redirect)
class Api::V1::BaseController < ApplicationController
  skip_before_action :verify_authenticity_token
  before_action :authenticate_api_user!

  private

  def authenticate_api_user!
    @current_user = authenticate_with_http_token do |token, options|
      User.find_by_jwt(token)  # devise-jwt integration
    end

    render json: { error: 'Unauthorized' }, status: :unauthorized unless @current_user
  end
end
```

### 1.7.4 Invited Users vs Informational Contacts

> **NEW PATTERN 2026-02-01**: Distinguish between users with accounts and informational contacts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INVITED USERS ONLY PATTERN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROBLEM:                                                                   │
│  ─────────                                                                  │
│  A contact can be added to an intervention WITHOUT an account               │
│  (auth_user_id = null). These contacts are "informational".                │
│                                                                             │
│  They should NOT:                                                           │
│  • Have conversation threads created for them                              │
│  • Be added to conversation participants                                   │
│  • Receive notifications (in-app, push, email)                             │
│                                                                             │
│  SOLUTION:                                                                  │
│  ─────────                                                                  │
│  Filter by auth_user_id at EVERY entry point (Defense in Depth):           │
│                                                                             │
│  PostgreSQL:  .not('auth_user_id', 'is', null)                             │
│  Service:     hasAuthAccount = !!userData?.auth_user_id                    │
│  UI:          {!has_account && <Badge>Non invité</Badge>}                  │
│                                                                             │
│  DATA FLOW:                                                                 │
│  ──────────                                                                 │
│  DB (auth_user_id) → Repository → Service (has_account) → UI (badge)       │
│                                                                             │
│  RAILS EQUIVALENT:                                                          │
│  ─────────────────                                                          │
│  scope :with_account, -> { where.not(user_id: nil) }                       │
│  scope :informational, -> { where(user_id: nil) }                          │
│                                                                             │
│  Policy check:                                                              │
│  def can_receive_notifications?                                            │
│    user.present? && user.confirmed?                                        │
│  end                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.7.5 PWA Notification Prompt Pattern

> **NEW PATTERN 2026-02-02**: Maximize PWA notification opt-in rate.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PWA NOTIFICATION PROMPT PATTERN                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BEHAVIOR:                                                                  │
│  ─────────                                                                  │
│  1. PWA Installation → Auto-prompt for notification permission              │
│  2. If declined/closed → Reminder modal at EVERY app open                  │
│  3. If permission='denied' → Guide to system settings                      │
│  4. Auto-detect permission change on window focus                          │
│                                                                             │
│  DETECTION:                                                                 │
│  ──────────                                                                 │
│  const isPWAMode = window.matchMedia('(display-mode: standalone)').matches │
│    || (window.navigator as any).standalone === true  // iOS                │
│                                                                             │
│  SHOW MODAL CONDITIONS:                                                     │
│  ──────────────────────                                                     │
│  isPWAMode &&                // Standalone mode                             │
│  isSupported &&              // Browser supports push                       │
│  !authLoading && !!user &&   // User authenticated                         │
│  permission !== 'granted' && // Not already granted                        │
│  !isSubscribed               // No active subscription                     │
│                                                                             │
│  AUTO-SUBSCRIBE ON FOCUS:                                                   │
│  ────────────────────────                                                   │
│  When user returns from system settings and permission is now 'granted',   │
│  automatically subscribe them (no extra action needed).                    │
│                                                                             │
│  RAILS/HOTWIRE EQUIVALENT:                                                  │
│  ─────────────────────────                                                  │
│  • Stimulus controller for notification prompt                             │
│  • Turbo Stream for real-time subscription status                          │
│  • Service worker managed via importmap or webpack                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*End of Section 1 - SEIDO Overview*

---

← Previous: [Getting Started](00-getting-started.md) | Next: [Tech Stack](02-tech-stack.md) →
