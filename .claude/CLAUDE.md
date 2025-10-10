# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 IMPORTANT: Official Documentation First

**Before making ANY modification to the codebase:**
1. **Always consult official documentation first**:
   - [Supabase Official Docs](https://supabase.com/docs) for database, auth, and SSR patterns
   - [Next.js Official Docs](https://nextjs.org/docs) for App Router, Server Components, and best practices
   - [React Official Docs](https://react.dev/learn) for React 19 patterns and hooks
2. **Apply official recommendations** over any custom patterns found in the codebase
3. **Follow latest best practices** as technologies evolve

## Project Overview

SEIDO is a comprehensive real estate management platform built with Next.js 15. It's a production-ready multi-role application with complete interfaces for four user types: Admin, Gestionnaire (Manager), Prestataire (Service Provider), and Locataire (Tenant).

**Current Status**: ✅ **Production Ready - All Core Features Implemented**
- **Architecture**: Clean architecture with Repository Pattern + Service Layer
- **Core Features**: Multi-role dashboards, intervention workflow, quote management, document handling
- **Infrastructure**: 8 repositories, 10 services, 70+ API routes, 30+ custom hooks
- **Testing**: Unit tests + comprehensive E2E suite with auto-healing patterns
- **Current Focus**: Email integration (Resend) + performance optimization

## Common Development Commands

Quand tu lances un server pour faire des tests mais que tu te rends compte que le port 3000 est utilisé, ferme tous les processus en cours sauf claude, clean le cache, et ensuite relance le.

Et pour les tests à créer et faire, réfère toi toujours au dossier C:\Users\arthu\Desktop\Coding\Seido-app\tests-new et assure toi que ce dossier reste bien structuré

```bash
# Development
npm run dev              # Start development server with pino-pretty (colored logs with emojis)
npm run dev:pretty       # Alias of dev - colored logs with metadata visible
npm run dev:pretty:full  # Colored logs with simplified view (message only)
npm run dev:json         # Raw JSON logs (for parsing/debugging with grep, jq, etc.)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code with ESLint

# Logging Options
# - dev / dev:pretty       → Colored logs with emojis + metadata (UTF-8 required)
# - dev:pretty:full        → Colored logs, message only (simplified view)
# - dev:json               → Raw JSON logs (for grep, jq, or log parsers)

# Windows-Specific Development (Encodage UTF-8)
# ⚠️ Si les emojis apparaissent corrompus (�, Ô£à, ­ƒöì), utilisez ces commandes :
npm run dev:utf8         # Force UTF-8 encoding (chcp 65001) then start dev server
npm run dev:win          # PowerShell UTF-8 version (alternative for PowerShell users)
npm run dev:no-emoji     # Development logs without emojis (fallback to text)

# Diagnostic Encodage Terminal
npx tsx scripts/check-pino-encoding.ts  # Check terminal encoding and get recommendations

# Testing - Unit Tests (Vitest)
npm test                 # Run all tests
npm run test:unit        # Unit tests (lib/)
npm run test:components  # Component tests
npm run test:integration # Integration tests
npm run test:api         # API route tests
npm run test:security    # Security tests
npm run test:coverage    # Run with coverage report
npm run test:watch       # Watch mode
npm run test:ui          # Vitest UI

# Testing - E2E Tests (Playwright)
npm run test:e2e         # All E2E tests
npm run test:e2e:gestionnaire  # Manager role tests
npm run test:e2e:prestataire   # Provider role tests
npm run test:e2e:locataire     # Tenant role tests
npm run test:e2e:admin         # Admin role tests
npm run test:e2e:auth          # Authentication tests
npm run test:e2e:mobile        # Mobile responsiveness tests
npm run test:e2e:cross-browser # Multi-browser tests (Chrome, Firefox, Safari)
npm run test:baseline          # Baseline tests with HTML report

# Testing - Specialized
npm run test:performance       # Performance tests
npm run test:accessibility     # Accessibility tests (WCAG 2.1)
npm run test:responsive        # Responsive design tests
npm run test:e2e:intervention-flow # Intervention workflow E2E
npm run test:ci                # CI pipeline tests (unit + components + API + E2E)
npm run test:full              # Full test suite (CI + performance + a11y)

# Testing - Agent-Driven
npm run agent:tester                    # Run phase tests
npm run agent:tester:baseline           # Baseline phase tests
npm run agent:tester:phase2             # Phase 2 tests with baseline comparison
npm run agent:tester:phase3             # Phase 3 tests
npm run agent:tester:final              # Final validation tests
npm run agent:tester:workflow           # Complete intervention workflow tests
npm run test:phase3                     # Phase 3 test suite

# Performance & Analysis
npm run analyze:bundle                  # Bundle size analysis
npm run lighthouse                      # Lighthouse performance audit

# Supabase (Backend Integration)
npm run supabase:types   # Generate TypeScript types from database schema
npm run supabase:push    # Push schema changes to Supabase
npm run supabase:pull    # Pull remote schema changes
npm run supabase:migrate # Create new migration file
```

## Architecture Overview

### Technology Stack

#### Core Framework
- **Next.js 15.2.4**: App Router with Server Components + Server Actions
- **React 19**: Latest features with full TypeScript support
- **TypeScript 5**: Strict mode enabled, zero `any` policy

#### UI & Styling
- **Tailwind CSS v4**: Utility-first CSS with PostCSS
- **shadcn/ui**: 50+ accessible components (Radix UI primitives)
- **Lucide React**: Icon system (450+ icons)
- **next-themes**: Dark mode support
- **Sonner**: Toast notifications
- **Recharts**: Data visualization for dashboards

#### Backend & Database
- **Supabase**: PostgreSQL database with Row Level Security (RLS)
- **@supabase/ssr**: SSR-optimized authentication for Next.js 15
- **@supabase/supabase-js**: Database client with real-time subscriptions

#### State Management
- **React Context API**: Global state (intervention cancellation)
- **Custom Hooks**: 30+ hooks for business logic and data fetching
- **React Hook Form**: Form validation with Zod schemas

#### Caching & Performance
- **ioredis**: Redis client for distributed caching
- **lru-cache**: In-memory caching with TTL
- **DataLoader**: Batch and cache database queries
- **@next/bundle-analyzer**: Bundle size optimization

#### Email & Communication
- **Resend**: Transactional email service (planned integration)

#### Form Validation
- **Zod 3.25**: Runtime type validation
- **@hookform/resolvers**: React Hook Form + Zod integration

#### Testing
- **Vitest**: Unit testing framework with coverage
- **@testing-library/react**: Component testing utilities
- **Playwright**: E2E testing with multi-browser support
- **MSW (Mock Service Worker)**: API mocking for tests
- **JSDOM**: DOM environment for unit tests

#### Developer Tools
- **ESLint 9**: Code linting with Next.js config
- **Pino + Pino-Pretty**: Structured logging
- **Lighthouse**: Performance auditing
- **Puppeteer**: Browser automation for testing

#### Utilities
- **date-fns**: Date manipulation and formatting
- **clsx + tailwind-merge**: Conditional CSS class composition
- **class-variance-authority**: Component variant system

### Application Structure (Current Architecture)

#### 🎯 **CURRENT ARCHITECTURE** (Production Ready - Oct 2025)
```
app/
├── [role]/               # Role-based route groups
│   ├── admin/           # Admin interface
│   ├── gestionnaire/    # Manager interface (biens, contacts, interventions)
│   ├── prestataire/     # Service provider interface
│   └── locataire/       # Tenant interface
├── auth/                # Authentication pages (login, signup, callback, reset-password)
├── api/                 # 70+ API routes
│   ├── intervention/[id]/ # Intervention-specific endpoints
│   ├── quotes/[id]/     # Quote management endpoints
│   └── *.ts             # User, team, contact, notification APIs
├── dashboard/           # Central dashboard router
├── debug/               # Debug utilities & data inspection
└── actions/             # Server Actions (auth-actions.ts)

components/
├── ui/                  # 50+ shadcn/ui components (button, dialog, form, etc.)
├── dashboards/          # Role-specific dashboard components
│   ├── admin-dashboard.tsx
│   ├── gestionnaire-dashboard.tsx
│   ├── prestataire-dashboard.tsx
│   └── locataire-dashboard.tsx
├── intervention/        # Intervention workflow components
│   ├── closure/         # Finalization workflow
│   ├── modals/          # Confirmation & rejection modals
│   └── *.tsx            # Cards, actions, planning, scheduling
├── availability/        # Provider availability system
├── quotes/              # Quote management components
├── debug/               # Debug panels & navigation tools
└── *.tsx                # Shared components (auth-guard, loading-screen, etc.)

hooks/
├── use-auth.tsx         # Authentication hook (16KB)
├── use-property-creation.ts # Building/Lot creation (27KB)
├── use-intervention-*.ts # Intervention workflow hooks (7 files)
├── use-quote-*.ts       # Quote management hooks (3 files)
├── use-cache-*.ts       # Cache management (2 files)
├── use-*-data.ts        # Data fetching hooks (contacts, prestataire, tenant)
└── use-*.ts             # Utility hooks (mobile, notifications, toast, etc.)

contexts/
└── intervention-cancellation-context.tsx # Global intervention state

emails/
└── email-templates-specifications.md # Email templates design (Resend integration)

lib/
├── services/            # 🆕 NEW MODULAR ARCHITECTURE
│   ├── core/           # ✅ Infrastructure Complete
│   │   ├── supabase-client.ts    # SSR-optimized Browser/Server clients
│   │   ├── base-repository.ts    # Generic CRUD repository
│   │   ├── service-types.ts      # Strict TypeScript types
│   │   └── error-handler.ts      # Centralized error handling
│   ├── repositories/   # ✅ Production repositories
│   │   ├── user.repository.ts
│   │   ├── building.repository.ts
│   │   ├── lot.repository.ts
│   │   ├── contact.repository.ts
│   │   ├── intervention.repository.ts
│   │   ├── team.repository.ts
│   │   ├── team-member.repository.ts
│   │   └── stats.repository.ts
│   ├── domain/         # ✅ Business logic services
│   │   ├── user.service.ts
│   │   ├── building.service.ts
│   │   ├── lot.service.ts
│   │   ├── tenant.service.ts
│   │   ├── contact.service.ts
│   │   ├── contact-invitation.service.ts
│   │   ├── team.service.ts
│   │   ├── intervention.service.ts
│   │   ├── stats.service.ts
│   │   └── composite.service.ts
│   ├── utils/          # Service utilities
│   │   └── assignment-utils.ts
│   ├── __tests__/      # Comprehensive test suite
│   │   ├── phase1-infrastructure.test.ts
│   │   ├── services/   # Service unit tests (10 files)
│   │   ├── integration/ # Integration tests
│   │   └── helpers/    # Test data factories
│   └── index.ts        # Unified exports
├── agents/             # Refactoring & validation agents
│   ├── seido-refactoring-specialist.ts
│   ├── seido-refactoring-patterns.ts
│   ├── seido-refactoring-tools.ts
│   ├── seido-design-validator.ts
│   └── seido-validation-engine.ts
├── cache/              # Cache management
│   └── cache-manager.ts (with tests)
├── database/           # Database optimization
│   └── query-optimizer.ts (with tests)
├── auth*.ts            # Auth services (4 files: service, router, actions, dal)
├── dal*.ts             # Data Access Layer (3 files)
├── intervention-*.ts   # Intervention services (2 files: actions, utils)
├── notification-service.ts
├── file-service.ts
├── quote-*.ts          # Quote utilities (3 files)
├── supabase*.ts        # Supabase clients (3 files: legacy, server, logger)
└── *.ts                # Utilities (utils, logger, api-logger, id-utils, etc.)

docs/
├── refacto/
│   ├── Tests/          # E2E Testing Infrastructure
│   │   ├── helpers/    # Test helpers (auth, navigation, isolation, debug)
│   │   ├── fixtures/   # Test data fixtures (users, buildings, contacts)
│   │   ├── tests/      # Test suites (phase1-auth, phase2-*)
│   │   └── HELPERS-GUIDE.md # Complete testing documentation
│   └── database-refactoring-guide.md
└── rapport-audit-complet-seido.md # Comprehensive audit report

test/e2e/              # Playwright E2E tests (mirrors docs/refacto/Tests)
```

#### 📚 **Architecture Status & Achievements**
- ✅ **Phase 1**: Infrastructure Complete (19 passing tests)
- ✅ **Phase 2**: Core Services Complete (User, Building, Lot)
- ✅ **Phase 3**: Business Services Complete (Contact, Team, Intervention)
- ✅ **Phase 4**: Auxiliary Services Complete (Stats, Composite)
- ✅ **Production Ready**: 70+ API routes, 30+ hooks, multi-role dashboards

#### 🎯 **Architecture Benefits Achieved**
- **Repository Pattern**: Clean separation of data/business logic across 8 repositories
- **Type Safety**: Strict TypeScript with comprehensive type definitions
- **Error Handling**: Centralized error boundaries and validation
- **SSR Optimization**: Separate Browser/Server Supabase clients for Next.js 15
- **Testing**: 19 unit tests + E2E suite with 100% coverage for critical features
- **Maintainability**: Modular structure with clear responsibilities
- **Email Integration**: Resend email service with template specifications
- **Custom Hooks**: 30+ React hooks for state management and business logic
- **Refactoring Agents**: 5 specialized agents for code quality and validation

#### 🔄 **Recent Architecture Improvements** (2025-10-06)

**Intervention Workflow Refactoring**:
- ✅ **Service Initialization**: All 10 intervention API routes now use new architecture
  - `createServerUserService()` and `createServerInterventionService()` properly initialized
  - Routes: approve, reject, start, complete, finalize, schedule, cancel, quote-request, quote-validate, validate-tenant
- ✅ **Status Standardization**: Unified on French status values throughout the stack
  - `InterventionStatus` type changed from English to French (e.g., 'pending' → 'demande')
  - Database and UI now use the same French status values (single source of truth)
  - i18n support prepared for future multi-language expansion
- ✅ **Architecture Simplification**: Removed unnecessary status conversion layer
  - Deleted `status-converter.ts` and `status-labels-fr.ts` (-315 lines)
  - Removed conversion logic from `base-repository.ts` (6 occurrences)
  - Updated `intervention-display.ts` with French keys for all Record types
- ✅ **Code Quality**: -315 lines, improved maintainability, single source of truth

**Intervention Status Values** (French):
```typescript
type InterventionStatus =
  | 'demande'                        // Initial request
  | 'rejetee'                        // Rejected by manager
  | 'approuvee'                      // Approved by manager
  | 'demande_de_devis'               // Quote requested
  | 'planification'                  // Finding time slot
  | 'planifiee'                      // Slot confirmed
  | 'en_cours'                       // Work in progress
  | 'cloturee_par_prestataire'       // Provider finished
  | 'cloturee_par_locataire'         // Tenant validated
  | 'cloturee_par_gestionnaire'      // Manager finalized
  | 'annulee'                        // Cancelled
```

**Workflow Transitions Verified** (9 critical paths):
1. demande → approuvee (manager approval)
2. demande → rejetee (manager rejection)
3. approuvee → demande_de_devis (quote request)
4. planification → planifiee (scheduling confirmed)
5. planifiee → en_cours (work started)
6. en_cours → cloturee_par_prestataire (provider completed)
7. cloturee_par_prestataire → cloturee_par_locataire (tenant validation)
8. cloturee_par_locataire → cloturee_par_gestionnaire (final closure)
9. * → annulee (cancellation from eligible statuses)

### Database Schema & Migrations

#### **Migration Status** (2025-10-10)
- ✅ **Phase 1**: Users, Teams, Companies, Invitations (Applied)
- ✅ **Phase 2**: Buildings, Lots, Property Documents (Applied)
- ⏳ **Phase 3**: Interventions + Document Sharing (Planned)

#### **Key Architectural Decisions**

**1. Unified Team Membership Model** (Phase 1)
```typescript
// team_member_role ENUM (4 valeurs - mappé sur user_role)
type TeamMemberRole = 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
```

**Rationale**: Simplifie la logique RLS en unifiant les rôles utilisateur et membre d'équipe. Tous les utilisateurs (gestionnaires, locataires, prestataires) deviennent membres d'équipe avec des permissions basées sur leur rôle.

**Benefits**:
- Logique RLS simplifiée (un seul rôle à vérifier au lieu de multiples relations)
- Gestion unifiée des permissions multi-rôles
- Facilite l'ajout de nouveaux rôles à l'avenir

**2. Simplified Document Visibility** (Phase 2)
```typescript
// document_visibility_level ENUM (2 niveaux)
type DocumentVisibilityLevel = 'equipe' | 'locataire'

// Phase 3 ajoutera: 'intervention' (partage temporaire prestataires)
```

**Rationale**: Favorise la collaboration entre gestionnaires en supprimant le niveau 'privé'. Tous les documents sont visibles par l'équipe ou partagés avec le locataire.

**Benefits**:
- Collaboration renforcée (si un gestionnaire absent, collègues accèdent aux docs)
- Modèle plus simple (2 niveaux au lieu de 4)
- Partage prestataire contrôlé via `document_intervention_shares` (Phase 3)

**3. Phase-Based Migration Strategy**
- **Phase 1**: Foundation (users, teams, auth)
- **Phase 2**: Properties (buildings, lots, documents - sans interventions)
- **Phase 3**: Workflows (interventions + partage temporaire documents)

**Rationale**: Évite les dépendances circulaires et permet des déploiements incrémentaux testables.

#### **Database Tables** (After Phase 1 + Phase 2)

**Phase 1 Tables** (8 tables):
- `users` - Unified users table (auth + contacts)
- `teams` - Team management with JSONB settings
- `team_members` - Multi-team membership with role enum
- `companies` - Company regrouping (optional)
- `user_invitations` - Invitation workflow with status enum

**Phase 2 Tables** (5 tables):
- `buildings` - Property management with denormalized counters
- `lots` - Units (standalone or linked to building)
- `building_contacts` - Building-user relationships
- `lot_contacts` - Lot-user relationships
- `property_documents` - Document management with 2-level visibility

**Enums** (7 total):
```sql
-- Phase 1
user_role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
team_member_role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
provider_category: 'prestataire' | 'assurance' | 'notaire' | 'syndic' | 'proprietaire' | 'autre'
intervention_type: 'plomberie' | 'electricite' | 'chauffage' | 'serrurerie' | 'peinture' | 'menage' | 'jardinage' | 'autre'
invitation_status: 'pending' | 'accepted' | 'expired' | 'cancelled'

-- Phase 2
country: 'belgique' | 'france' | 'allemagne' | 'pays-bas' | 'suisse' | 'luxembourg' | 'autre'
lot_category: 'appartement' | 'collocation' | 'maison' | 'garage' | 'local_commercial' | 'parking' | 'autre'
property_document_type: 'bail' | 'garantie' | 'facture' | 'diagnostic' | 'photo_compteur' | 'plan' | 'reglement_copropriete' | 'etat_des_lieux' | 'certificat' | 'manuel_utilisation' | 'photo_generale' | 'autre'
document_visibility_level: 'equipe' | 'locataire' (Phase 3 ajoutera 'intervention')
```

**RLS Helper Functions** (8 total):
```sql
-- Phase 1 (implicit via Phase 2)
is_admin() - Vérifie si user est admin
is_gestionnaire() - Vérifie si user est gestionnaire
is_team_manager(team_id) - Vérifie si user est gestionnaire de l'équipe

-- Phase 2
get_building_team_id(building_id) - Récupère team_id d'un building
get_lot_team_id(lot_id) - Récupère team_id d'un lot (standalone ou non)
is_tenant_of_lot(lot_id) - Vérifie si user est locataire du lot
can_view_building(building_id) - Vérifie permissions building
can_view_lot(lot_id) - Vérifie permissions lot
```

### User Roles & Authentication
Four distinct roles with specific permissions and workflows:
- **Admin**: System administration and oversight
- **Gestionnaire**: Property and intervention management
- **Prestataire**: Service execution and quote management
- **Locataire**: Intervention requests and tracking

**Team Membership**: Tous les utilisateurs sont membres d'équipe (`team_members`) avec un rôle mappé sur `user_role`.

Demo users available in `lib/auth.ts` with predefined emails for each role.

### Intervention Workflow System
Core business logic centers around intervention lifecycle:
1. **Creation**: Tenant creates request
2. **Validation**: Manager approves/rejects
3. **Quote Process**: Provider submits quotes if required
4. **Scheduling**: Coordination between parties
5. **Execution**: Provider completes work
6. **Payment**: Final settlement and completion

Key files: `lib/intervention-actions-service.ts`, `lib/intervention-utils.ts`

## Development Guidelines

### Code Style (from Cursor rules)
- Use kebab-case for component names (e.g., `my-component.tsx`)
- Event handlers prefixed with "handle" (e.g., `handleClick`)
- Use const functions: `const functionName = () => {}`
- Early returns for readability
- Tailwind for all styling - no inline CSS
- TypeScript types for everything
- Proper accessibility (tabindex, aria-label, etc.)

### Component Architecture
- Favor React Server Components and Next.js SSR
- Minimize 'use client' usage to small, isolated components
- Always include loading and error states
- Use semantic HTML elements
- Implement proper error boundaries

### Database Integration (Following Official Supabase + Next.js 15 Patterns)

#### 🎯 **NEW APPROACH** (Based on Official Docs)
```typescript
// Browser Client (Client Components)
import { createBrowserSupabaseClient } from '@/lib/services'
const supabase = createBrowserSupabaseClient()

// Server Client (Server Components/Actions)
import { createServerSupabaseClient } from '@/lib/services'
const supabase = await createServerSupabaseClient()
```

#### 🔧 **Database Operations**
- **TypeScript Types**: Auto-generated via `npm run supabase:types`
- **Schema Management**: `npx supabase migration new <name>`
- **Row Level Security**: RLS policies for multi-tenant data isolation
- **Real-time**: Supabase subscriptions for live updates

### Key Services Architecture (New Modular Approach)

#### ✅ **Infrastructure Services** (Complete)
- **SupabaseClient**: SSR-optimized Browser/Server separation
- **BaseRepository**: Generic CRUD with caching and error handling
- **ErrorHandler**: Centralized validation and exception management
- **ServiceTypes**: Strict TypeScript interfaces

#### ✅ **Core Services** (Complete)
- **UserRepository/Service**: User management with role-based access
- **BuildingRepository/Service**: Property management with relationships
- **LotRepository/Service**: Unit management with tenant associations
- **TenantService**: Tenant-specific business logic

#### ✅ **Business Services** (Complete)
- **ContactRepository/Service**: Multi-role contact management and permissions
- **ContactInvitationService**: Contact invitation workflow
- **TeamRepository/Service**: Team formation and member management
- **TeamMemberRepository**: Team membership management
- **InterventionRepository/Service**: Complex workflow with state transitions
- **NotificationService**: Real-time notifications across roles
- **StatsRepository/Service**: Dashboard metrics with role-based filtering
- **CompositeService**: Aggregated business operations

#### ✅ **Additional Services & Infrastructure**
- **AuthService**: Multi-role authentication (auth-service.ts, auth-router.ts, auth-actions.ts, auth-dal.ts)
- **FileService**: Document upload/download for interventions
- **CacheManager**: Redis-based caching with TTL management
- **QueryOptimizer**: Database query performance optimization
- **NotificationService**: Multi-channel notifications
- **InterventionActionsService**: Intervention state machine and workflow
- **InterventionUtils**: Intervention business logic utilities
- **QuoteUtils**: Quote state management and status mapping (3 files)

### React Hooks Architecture

SEIDO utilizes 30+ custom React hooks for state management and business logic:

#### **Authentication & User Management**
- `use-auth.tsx` (16KB): Complete authentication flow with role-based access
- `use-auth-loading.ts`: Loading states during auth operations
- `use-team-status.tsx`: Team membership and status management

#### **Data Fetching & Caching**
- `use-contacts-data.ts`: Contact management with role-based filtering
- `use-prestataire-data.ts`: Service provider data management
- `use-tenant-data.ts`: Tenant information and pending actions
- `use-cached-data.ts`: Generic caching hook with TTL
- `use-cache-management.ts`: Cache invalidation and refresh strategies

#### **Intervention Workflow**
- `use-intervention-approval.ts`: Manager approval/rejection workflow
- `use-intervention-cancellation.ts`: Cancellation logic with notifications
- `use-intervention-execution.ts`: Provider work completion
- `use-intervention-finalization.ts`: Final validation and closure
- `use-intervention-planning.ts`: Scheduling and availability matching
- `use-intervention-quoting.ts`: Quote submission and validation (12KB)

#### **Property Management**
- `use-property-creation.ts` (27KB): Building and Lot creation with validation

#### **Quote Management**
- `use-quote-cancellation.ts`: Quote cancellation workflow
- `use-quote-notifications.ts`: Quote-related notifications (8KB)
- `use-quote-toast.ts`: User feedback for quote actions

#### **UI & UX**
- `use-mobile.ts`: Mobile responsiveness detection
- `use-toast.ts`: Toast notification system
- `use-notifications.ts`: Global notification management
- `use-global-notifications.ts`: Cross-role notification delivery
- `use-dashboard-session-timeout.ts`: Auto-logout on inactivity

#### **Utilities**
- `use-activity-logs.ts`: Audit trail and user activity tracking
- `use-availability-management.ts`: Provider availability system (11KB)
- `use-document-upload.ts`: File upload for interventions
- `use-navigation-refresh.ts`: Router refresh management
- `use-manager-stats.ts`: Dashboard statistics aggregation (11KB)
- `use-creation-success.ts`: Post-creation success handling
- `use-client-only.ts`: Client-side only rendering guard
- `use-supabase.ts`: Supabase client management

### Context Providers

- `intervention-cancellation-context.tsx`: Global state for intervention cancellations across components

### Email Infrastructure

**Location**: `emails/email-templates-specifications.md`

SEIDO is integrating **Resend** for transactional email delivery with comprehensive templates for:
- User invitations and onboarding
- Intervention workflow notifications (approval, assignment, completion)
- Quote requests and approvals
- Team collaboration updates
- Password reset and security alerts

### Refactoring & Validation Agents

**Location**: `lib/agents/`

5 specialized agents for maintaining code quality and consistency:

1. **seido-refactoring-specialist.ts**: Orchestrates refactoring workflows
2. **seido-refactoring-patterns.ts**: Enforces architectural patterns
3. **seido-refactoring-tools.ts**: Code transformation utilities
4. **seido-design-validator.ts**: UI/UX consistency validation
5. **seido-validation-engine.ts**: Business logic validation rules

### Performance Optimization Infrastructure

#### Cache Management
- **Location**: `lib/cache/cache-manager.ts`
- Redis-based caching with TTL
- Cache invalidation strategies
- Distributed cache for multi-instance deployments

#### Query Optimization
- **Location**: `lib/database/query-optimizer.ts`
- Analyzes and optimizes Supabase queries
- Batch operations for reduced round trips
- Connection pooling management

### Special Considerations
- Multi-role access patterns with strict data isolation
- Complex intervention status transitions between roles
- Provider availability system with conflict detection
- Quote workflow with approval chains
- Mobile-responsive design required
- Real-time updates via Supabase subscriptions
- Comprehensive audit logging for compliance
- Email notifications for all critical events
- SSR optimization for performance
- Progressive Web App (PWA) ready

## Testing & Quality Assurance

### 🧪 **Testing Architecture Overview**

**All E2E tests are centralized in**: `docs/refacto/Tests/`

```
docs/refacto/Tests/
├── helpers/                  # Modular test helpers (✅ Phase 2 Complete)
│   ├── auth-helpers.ts      # Authentication helpers (login, logout)
│   ├── navigation-helpers.ts # Navigation helpers (navigateTo, etc.)
│   ├── test-isolation.ts    # ✅ Test isolation (prevents state leakage)
│   ├── debug-helpers.ts     # ✅ Auto-healing debug system
│   └── index.ts             # Unified exports
├── fixtures/                 # Test data fixtures
│   ├── users.fixture.ts     # Test users for all roles
│   ├── buildings.fixture.ts # Test buildings data
│   └── contacts.fixture.ts  # Test contacts data
├── tests/                    # Organized test suites
│   ├── phase1-auth/         # Authentication tests
│   ├── phase2-contacts/     # Contacts CRUD (100% success)
│   ├── phase2-buildings/    # Buildings CRUD (71.4% success)
│   └── phase2-interventions/ # Interventions workflow
└── HELPERS-GUIDE.md         # 📚 Complete testing documentation

test/e2e/                     # Playwright test directory (mirrors docs/refacto/Tests)
├── helpers/                  # Copied from docs/refacto/Tests/helpers
├── fixtures/                 # Copied from docs/refacto/Tests/fixtures
└── phase2-*/                 # Test suites
```

### 🎯 **Test Quality Standards**
- ✅ **E2E Coverage**: 100% for user-facing features
- ✅ **Unit Coverage**: > 80% for services/repositories
- ✅ **TypeScript**: 0 warnings, strict mode enabled
- ✅ **Performance**: < 100ms API response, < 30s E2E tests
- ✅ **Accessibility**: WCAG 2.1 AA compliance
- ✅ **Auto-Healing**: Tests use isolation + debug helpers (Phase 2)

### 📊 **Current Test Results**
- **Phase 2 Contacts**: 100% success (7/7 tests) - Baseline
- **Phase 2 Buildings**: 71.4% success (5/7 tests) - +1040% improvement
- **Timeout Elimination**: 93.75% → 0% (isolation pattern)

### 🧪 **Testing Commands**
```bash
# E2E Tests (Playwright)
npx playwright test                          # Run all E2E tests
npx playwright test --grep="Phase 2"         # Run Phase 2 tests
npx playwright test --headed                 # Run with browser visible
npx playwright test --debug                  # Run with Playwright Inspector

# Unit Tests (Vitest)
npm test lib/services/__tests__/             # Run service unit tests
npm test -- --coverage                       # Run with coverage report

# Build & Lint
npm run build                                # TypeScript + Next.js build
npm run lint                                 # ESLint validation
```

## 🚨 Development Rules

### 📚 **Always Follow Official Docs**
1. **Supabase SSR**: Use official `@supabase/ssr` patterns for Next.js 15
2. **Next.js App Router**: Follow official Server/Client Component guidelines
3. **React 19**: Use official hooks and patterns (not outdated tutorials)

### 🎯 **Architecture Decisions**
1. **Prefer NEW architecture** over legacy patterns when available
2. **Repository Pattern** for data access (not direct Supabase calls)
3. **Service Layer** for business logic (separate from repositories)
4. **Error Boundaries** at component and service levels

### 🔄 **Migration Guidelines**
- **Phase approach**: Complete current phase before starting next
- **Backward compatibility**: Maintain during transition
- **Feature flags**: Use for gradual rollout
- **Documentation**: Update as you migrate

### 📁 **File Organization**
- **< 500 lines per file**: Split if larger
- **Single responsibility**: One concern per module
- **Clear naming**: Descriptive and consistent
- **Proper exports**: Use index.ts for clean imports

The application follows a clean architecture pattern with comprehensive error handling and loading states. All new code should follow the modular services architecture outlined above.

---

## 🤖 AUTOMATIC TESTING WORKFLOW

### 🚨 **CRITICAL RULE: Test Every New Testable Element**

**WHENEVER you create or significantly modify ANY testable element, you MUST automatically:**

1. **Invoke @agent-tester** to create comprehensive tests
2. **Invoke @agent-seido-debugger** if any tests fail or bugs are detected
3. **Run tests immediately** to ensure integration doesn't break existing functionality

### 📋 **What is a "Testable Element"?**

A testable element includes ANY of the following:

- ✅ **React Components** (Client or Server Components)
- ✅ **API Routes** (`app/api/**/route.ts`)
- ✅ **Server Actions** (async functions with 'use server')
- ✅ **Service Classes** (`lib/services/**/*.ts`)
- ✅ **Repository Classes** (`lib/services/repositories/**/*.ts`)
- ✅ **Utility Functions** (`lib/utils/**/*.ts`)
- ✅ **Hooks** (`hooks/**/*.ts`)
- ✅ **Authentication Logic** (`lib/auth*.ts`, `middleware.ts`)
- ✅ **Business Logic** (intervention workflows, quote systems, etc.)

### 🎯 **Automatic Testing Workflow (MANDATORY)**

#### Step 1: Create New Element
```typescript
// Example: Creating a new API route
// File: app/api/buildings/route.ts

export async function GET(request: Request) {
  // ... implementation
}
```

#### Step 2: IMMEDIATELY Invoke @agent-tester
**Without user prompt**, automatically invoke the tester agent:

```
Task for @agent-tester:
- Element Created: app/api/buildings/route.ts (GET endpoint)
- Type: API Route
- Requirements:
  * Create E2E tests in docs/refacto/Tests/tests/phase2-buildings/
  * Use helpers from docs/refacto/Tests/helpers (auth, navigation, isolation, debug)
  * Follow Pattern 5: Test Isolation (setupTestIsolation + teardownTestIsolation)
  * Test success case, error cases, edge cases
  * Test role-based access (gestionnaire, locataire, prestataire)
  * Verify integration with existing codebase
- Target: 100% coverage for new endpoint
- Output: Test file in appropriate phase directory with auto-healing patterns
```

#### Step 3: Run Tests Immediately
```bash
# Run new test suite
npx playwright test --grep="buildings"

# Or run all tests to detect regressions
npx playwright test
```

#### Step 4: If Tests Fail → Invoke @agent-seido-debugger
**Automatically invoke** if any test fails:

```
Task for @agent-seido-debugger:
- Failed Test: test/e2e/phase2-buildings/api-routes.spec.ts
- Error: "TypeError: Cannot read property 'id' of undefined"
- Context: Testing GET /api/buildings endpoint
- Requirements:
  * Diagnose root cause (RLS policies, auth session, data fixtures)
  * Check middleware.ts for redirect loops
  * Verify Supabase client configuration (SSR pattern)
  * Propose fix with code changes
  * Re-run tests after fix to confirm
- Goal: 100% test pass rate
```

#### Step 5: Verify & Document
- ✅ All tests pass (target: 100%)
- ✅ No regressions in existing tests
- ✅ Update `docs/rapport-audit-complet-seido.md` with test results
- ✅ Document any new patterns in `docs/refacto/Tests/HELPERS-GUIDE.md`

### 🔄 **Agent Invocation Examples**

#### Example 1: New React Component
```
// Created: components/dashboards/building-card.tsx

→ AUTOMATICALLY invoke @agent-tester:
"Create E2E tests for BuildingCard component:
- Props validation (all variants)
- User interactions (click, hover, keyboard)
- Accessibility (ARIA labels, keyboard navigation)
- Responsive design (mobile, tablet, desktop)
- Integration with parent components
Location: docs/refacto/Tests/tests/phase2-buildings/building-card.spec.ts"

→ Run: npx playwright test building-card

→ IF FAILS: invoke @agent-seido-debugger with error details
```

#### Example 2: New Server Action
```
// Created: app/actions/create-building.ts

→ AUTOMATICALLY invoke @agent-tester:
"Create comprehensive tests for createBuilding server action:
- Valid input → success case
- Invalid input → validation errors
- Missing auth → 401 Unauthorized
- Wrong role → 403 Forbidden (locataire can't create buildings)
- Database errors → proper error handling
- RLS policies → team isolation verified
Location: docs/refacto/Tests/tests/phase2-buildings/create-building.spec.ts"

→ Run: npx playwright test create-building

→ IF FAILS: invoke @agent-seido-debugger
```

#### Example 3: New Service Class
```
// Created: lib/services/domain/building.service.ts

→ AUTOMATICALLY invoke @agent-tester:
"Create unit + integration tests for BuildingService:
Unit tests (lib/services/__tests__/services/building.service.test.ts):
- Mock repository, test business logic in isolation
- All methods, all branches, edge cases

E2E tests (docs/refacto/Tests/tests/phase2-buildings/building-service-integration.spec.ts):
- Real database operations
- Multi-role access patterns
- Cascade operations (building → lots → contacts)
Coverage target: > 80%"

→ Run: npm test building.service && npx playwright test building-service

→ IF FAILS: invoke @agent-seido-debugger
```

### 📊 **Test Quality Checklist (Enforced by Agents)**

Before completing any new feature, agents MUST verify:

- [ ] **100% of new code paths are tested**
- [ ] **No regression** in existing tests (all still pass)
- [ ] **Test isolation** applied (setupTestIsolation + teardownTestIsolation)
- [ ] **Auto-healing debug** on failures (captureDebugInfo in catch blocks)
- [ ] **Multi-role testing** where applicable (gestionnaire, locataire, prestataire)
- [ ] **Error boundaries** tested (network failures, invalid data, auth issues)
- [ ] **Performance** verified (< 30s per E2E test, < 100ms API responses)
- [ ] **Accessibility** validated (keyboard navigation, screen readers)
- [ ] **Documentation** updated (HELPERS-GUIDE.md if new patterns, audit report)

### 🚨 **MANDATORY: Never Skip Testing**

**IMPORTANT**: Testing is NOT optional. Every new testable element MUST have tests before the feature is considered complete.

If you find yourself thinking "I'll add tests later", STOP and invoke @agent-tester immediately.

**Success Metric**: Codebase maintains > 80% coverage across all services and 100% coverage for critical user-facing features.

### 🎓 **Testing Resources**

- **Primary Guide**: `docs/refacto/Tests/HELPERS-GUIDE.md` (complete patterns + examples)
- **Test Templates**: Found in HELPERS-GUIDE.md sections "Template Minimal" and "Template Complet"
- **Validated Patterns**: Pattern 1-5 in HELPERS-GUIDE.md (all empirically validated)
- **Fixtures**: `docs/refacto/Tests/fixtures/` (reusable test data)
- **Auto-Healing**: `docs/refacto/Tests/helpers/debug-helpers.ts` (automatic debug capture)

---

## 📚 Essential References

### 🔗 **Official Documentation** (Always Check First)
- **Supabase**: https://supabase.com/docs
  - [SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
  - [TypeScript Types](https://supabase.com/docs/guides/api/generating-types)
  - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- **Next.js**: https://nextjs.org/docs
  - [App Router](https://nextjs.org/docs/app)
  - [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
  - [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- **React**: https://react.dev/learn
  - [React 19 Features](https://react.dev/blog/2024/12/05/react-19)

### 📋 **Project Documentation**
- **Refactoring Guide**: `docs/refacto/database-refactoring-guide.md`
- **Services README**: `lib/services/README.md`
- **Test Documentation**:
  - **E2E Testing Guide**: `docs/refacto/Tests/HELPERS-GUIDE.md` (⭐ PRIMARY RESOURCE)
  - **Unit Tests**: `lib/services/__tests__/`
  - **Test Helpers**: `docs/refacto/Tests/helpers/`
  - **Test Fixtures**: `docs/refacto/Tests/fixtures/`
- **Audit Reports**: `docs/rapport-audit-complet-seido.md`

### 🎯 **Key Principles**
> **Official Docs First**: When in doubt, official documentation trumps existing code patterns. The technology ecosystem evolves rapidly, and official docs reflect the latest best practices.

> **Test Everything**: Every new testable element MUST have comprehensive tests before the feature is complete. Use @agent-tester and @agent-seido-debugger proactively.

> **Isolation is Critical**: All E2E tests MUST use Pattern 5 (Test Isolation) to prevent state leakage and achieve 100% reliability.

---

**Last Updated**: 2025-10-02
**Status**: ✅ Production Ready - All Core Features Implemented
**Current Focus**: Email Integration (Resend) + Performance Optimization
**Codebase Stats**:
- 70+ API Routes
- 30+ Custom React Hooks
- 8 Repositories + 10 Services
- 50+ shadcn/ui Components
- 19 Unit Tests + Comprehensive E2E Suite
- Multi-role Authentication & Authorization
- Real-time Notifications
- Document Management System
- Intervention Workflow Engine
- Quote Management System