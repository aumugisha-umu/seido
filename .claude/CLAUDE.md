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

SEIDO is a real estate management platform built with Next.js 15. It's a multi-role application with complete interfaces for four user types: Admin, Gestionnaire (Manager), Prestataire (Service Provider), and Locataire (Tenant).

**Current Status**: 🔄 **Undergoing Major Refactoring**
- **Phase 1**: ✅ Infrastructure Complete (Database Services)
- **Phase 2**: 🔄 Services Core (User, Building, Lot)
- **Legacy**: `lib/database-service.ts` (4647 lines) being replaced

## Common Development Commands

Quand tu lances un server pour faire des tests mais que tu te rends compte que le port 3000 est utilisé, ferme le, clean le cache, et ensuite relance le

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code with ESLint


# Supabase (for future backend integration)
npm run supabase:types   # Generate TypeScript types
npm run supabase:push    # Push schema changes
npm run supabase:pull    # Pull remote changes
npm run supabase:migrate # Create new migration
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.2.4 with App Router
- **UI**: React 19, TypeScript, Tailwind CSS v4, shadcn/ui components
- **Current State**: Demo with localStorage auth and mock data
- **Future**: Supabase PostgreSQL backend planned

### Application Structure (Target Architecture)

#### 🎯 **NEW ARCHITECTURE** (Phase 1 Complete, Phase 2+ In Progress)
```
app/
├── dashboard/[role]/     # Role-based dashboards
├── auth/                 # Authentication pages
├── api/                  # API routes
└── debug/                # Debug utilities

components/
├── ui/                   # shadcn/ui components
├── dashboards/           # Role-specific dashboard components
├── intervention/         # Intervention workflow components
├── availability/         # Provider availability components
└── quotes/               # Quote management components

lib/
├── services/             # 🆕 NEW MODULAR ARCHITECTURE
│   ├── core/            # ✅ Phase 1 Complete
│   │   ├── supabase-client.ts    # SSR-optimized clients
│   │   ├── base-repository.ts    # Generic repository pattern
│   │   ├── service-types.ts      # Shared TypeScript types
│   │   └── error-handler.ts      # Centralized error handling
│   ├── repositories/    # 🔄 Phase 2+ (User, Building, Lot...)
│   ├── domain/          # 🔄 Phase 2+ (Business logic services)
│   ├── __tests__/       # ✅ Complete test infrastructure
│   └── index.ts         # ✅ Unified exports
├── auth-service.ts      # 📋 To migrate to new architecture
├── database-service.ts  # 🗑️ LEGACY (4647 lines) - Being replaced
├── intervention-*.ts    # 📋 To integrate with new services
├── notification-service.ts # 📋 To migrate
└── supabase.ts         # 📋 Legacy client (backup compatibility)
```

#### 📚 **Migration Progress**
- ✅ **Infrastructure**: Complete with 19 passing tests
- 🔄 **Phase 2**: Services Core (User → Building → Lot)
- ⏳ **Phase 3**: Business Services (Contact, Team, Intervention)
- ⏳ **Phase 4**: Auxiliary Services (Stats, Composite)
- ⏳ **Phase 5**: Full migration and legacy cleanup

#### 🎯 **Target Benefits**
- **Repository Pattern**: Clean separation of data/business logic
- **Type Safety**: 0 `any` policy with strict TypeScript
- **Error Handling**: Consistent error boundaries and validation
- **SSR Optimization**: Separate Browser/Server Supabase clients
- **Testing**: Comprehensive unit, integration, and E2E coverage
- **Maintainability**: < 500 lines per file, clear responsibilities

### User Roles & Authentication
Four distinct roles with specific permissions and workflows:
- **Admin**: System administration and oversight
- **Gestionnaire**: Property and intervention management
- **Prestataire**: Service execution and quote management
- **Locataire**: Intervention requests and tracking

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

#### ✅ **Infrastructure Services** (Phase 1 Complete)
- **SupabaseClient**: SSR-optimized Browser/Server separation
- **BaseRepository**: Generic CRUD with caching and error handling
- **ErrorHandler**: Centralized validation and exception management
- **ServiceTypes**: Strict TypeScript interfaces

#### 🔄 **Core Services** (Phase 2 In Progress)
- **UserRepository/Service**: User management with role-based access
- **BuildingRepository/Service**: Property management with relationships
- **LotRepository/Service**: Unit management with tenant associations

#### ⏳ **Business Services** (Phase 3+ Planned)
- **ContactService**: Multi-role contact management and permissions
- **TeamService**: Team formation and member management
- **InterventionService**: Complex workflow with state transitions
- **NotificationService**: Real-time notifications across roles
- **StatsService**: Dashboard metrics with role-based filtering

### Special Considerations
- Multi-role access patterns with strict data isolation
- Complex intervention status transitions between roles
- Provider availability system with conflict detection
- Quote workflow with approval chains
- Mobile-responsive design required

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

**Last Updated**: 2025-10-01
**Status**: ✅ Phase 2 Complete (Test Isolation & Auto-Healing)
**Next Phase**: Phase 3 - Complete E2E coverage for all features