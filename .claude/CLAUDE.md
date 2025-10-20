# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## 🚨 IMPORTANT: Official Documentation First

**Before making ANY modification:**
1. **Always consult official documentation first**:
   - [Supabase Official Docs](https://supabase.com/docs) - Database, auth, SSR patterns
   - [Next.js Official Docs](https://nextjs.org/docs) - App Router, Server Components
   - [React Official Docs](https://react.dev/learn) - React 19 patterns
2. **Apply official recommendations** over custom patterns found in codebase
3. **Follow latest best practices** as technologies evolve

## Project Overview

**SEIDO** - Real estate management platform built with Next.js 15. Production-ready multi-role app (Admin, Gestionnaire, Prestataire, Locataire).

**Current Status**: ✅ **Production Ready**
- **Architecture**: Repository Pattern + Service Layer
- **Infrastructure**: 8 repositories, 10 services, 70+ API routes, 30+ hooks
- **Testing**: Unit tests + E2E suite with auto-healing
- **Database**: Phase 1 & 2 applied, Phase 3 planned (interventions)
- **Current Focus**: Email integration (Resend) + performance optimization

## Development Commands

**Notes spéciales** :
- Port 3000 occupé ? Fermer processus + clean cache + relancer
- Tests : toujours référencer `tests-new/` et maintenir structure

```bash
# Development
npm run dev              # Dev server (colored logs + emojis)
npm run build            # Production build
npm run lint             # ESLint validation

# Windows UTF-8 (emojis corrompus)
npm run dev:utf8         # Force UTF-8 encoding
npm run dev:no-emoji     # Logs sans emojis

# Testing
npm test                 # All tests
npm run test:coverage    # With coverage
npx playwright test      # E2E tests
npx playwright test --grep="Phase 2"  # Specific phase

# Supabase
npm run supabase:types   # Generate TS types
npm run supabase:push    # Push schema
npm run supabase:migrate # New migration
```

## Architecture Snapshot

### Technology Stack
- **Core**: Next.js 15.2.4, React 19, TypeScript 5 (strict)
- **UI**: Tailwind v4, shadcn/ui (50+ components), Lucide React
- **Backend**: Supabase (PostgreSQL + RLS), @supabase/ssr
- **State**: React Context, 30+ custom hooks, React Hook Form + Zod
- **Caching**: Redis (ioredis), LRU cache, DataLoader
- **Testing**: Vitest, Playwright, @testing-library/react
- **Email**: Resend (planned)

### Key Directories
```
app/[role]/          # Role-based routes (admin, gestionnaire, prestataire, locataire)
components/          # 50+ shadcn/ui + dashboards + intervention workflow
hooks/               # 30+ custom hooks (auth, interventions, quotes, caching)
lib/services/        # Repository Pattern architecture
  ├── core/          # Supabase clients, base repository, error handler
  ├── repositories/  # 8 repositories (user, building, lot, contact, intervention, team, stats)
  ├── domain/        # 10 services (business logic)
  └── __tests__/     # Unit + integration tests
docs/refacto/Tests/  # E2E test infrastructure (helpers, fixtures, suites)
```

### Database Migration Status (2025-10-11)
- ✅ **Phase 1**: Users, Teams, Companies, Invitations **(Applied)**
- ✅ **Phase 2**: Buildings, Lots, Property Documents **(Applied)**
- ⏳ **Phase 3**: Interventions + Document Sharing **(Planned)**

**Key Tables** (Phase 1+2):
- `users`, `teams`, `team_members`, `companies`, `user_invitations`
- `buildings`, `lots`, `building_contacts`, `lot_contacts`, `property_documents`

**Key Enums**:
- `user_role`, `team_member_role`: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
- `lot_category`: 'appartement' | 'collocation' | 'maison' | 'garage' | 'local_commercial' | 'parking' | 'autre'
- `document_visibility_level`: 'equipe' | 'locataire' (Phase 3 ajoutera 'intervention')

**RLS Helper Functions**: `is_admin()`, `is_gestionnaire()`, `is_team_manager()`, `get_building_team_id()`, `get_lot_team_id()`, `is_tenant_of_lot()`, `can_view_building()`, `can_view_lot()`

### User Roles & Permissions
- **Admin**: System administration
- **Gestionnaire**: Property + intervention management
- **Prestataire**: Service execution + quotes
- **Locataire**: Intervention requests + tracking

**Team Membership**: All users are team members with role-based permissions.

### Intervention Status Values (French)
```typescript
type InterventionStatus =
  | 'demande'                        // Initial request
  | 'rejetee'                        // Rejected
  | 'approuvee'                      // Approved
  | 'demande_de_devis'               // Quote requested
  | 'planification'                  // Finding slot
  | 'planifiee'                      // Slot confirmed
  | 'en_cours'                       // In progress
  | 'cloturee_par_prestataire'       // Provider finished
  | 'cloturee_par_locataire'         // Tenant validated
  | 'cloturee_par_gestionnaire'      // Manager finalized
  | 'annulee'                        // Cancelled
```

## Development Guidelines

### Code Style
- kebab-case for component names (`my-component.tsx`)
- Event handlers prefixed with "handle" (`handleClick`)
- Const functions: `const functionName = () => {}`
- Early returns for readability
- Tailwind for all styling (no inline CSS)
- TypeScript types everywhere
- Proper accessibility (tabindex, aria-label)

### Component Architecture
- **Favor Server Components** (minimize 'use client')
- Always include loading + error states
- Use semantic HTML
- Implement error boundaries

### Database Integration (Official Supabase + Next.js 15 Patterns)

```typescript
// Browser Client (Client Components)
import { createBrowserSupabaseClient } from '@/lib/services'
const supabase = createBrowserSupabaseClient()

// Server Client (Server Components/Actions)
import { createServerSupabaseClient } from '@/lib/services'
const supabase = await createServerSupabaseClient()
```

**Database Operations**:
- **TypeScript Types**: `npm run supabase:types`
- **Schema Management**: `npx supabase migration new <name>`
- **Row Level Security**: RLS policies for multi-tenant isolation
- **Real-time**: Supabase subscriptions for live updates

### Services Architecture

**Infrastructure** (lib/services/core/):
- `supabase-client.ts` - SSR-optimized Browser/Server separation
- `base-repository.ts` - Generic CRUD with caching
- `error-handler.ts` - Centralized validation + exceptions
- `service-types.ts` - Strict TypeScript interfaces

**Repositories** (8 total):
- User, Building, Lot, Contact, Intervention, Team, TeamMember, Stats

**Domain Services** (10 total):
- User, Building, Lot, Tenant, Contact, ContactInvitation, Team, Intervention, Stats, Composite

**Additional Services**:
- AuthService, FileService, CacheManager, QueryOptimizer, NotificationService, InterventionActionsService

### Testing

**E2E Tests** (`docs/refacto/Tests/`):
- Use helpers (auth, navigation, isolation, debug)
- Follow Pattern 5: Test Isolation
- Auto-healing debug on failures

**Commands**:
```bash
npx playwright test                    # All E2E
npx playwright test --grep="Phase 2"   # Specific phase
npm test lib/services/__tests__/       # Unit tests
npm test -- --coverage                 # Coverage
```

**Quality Standards**:
- E2E Coverage: 100% for user-facing features
- Unit Coverage: > 80% for services/repositories
- Performance: < 100ms API, < 30s E2E tests
- Accessibility: WCAG 2.1 AA compliance

## Development Rules

### 📚 Always Follow Official Docs
1. **Supabase SSR**: Official `@supabase/ssr` patterns
2. **Next.js App Router**: Official Server/Client Component guidelines
3. **React 19**: Official hooks and patterns

### 🗄️ Database Debugging Protocol

**When debugging database-related issues, ALWAYS:**

1. **Check current schema first**:
   - Review latest migrations in `supabase/migrations/`
   - Verify table structure and column names
   - Check enum values and constraints
   - Confirm RLS helper functions exist

2. **Validate TypeScript types**:
   - Consult `lib/database.types.ts` (generated from schema)
   - Ensure field names match exactly (case-sensitive)
   - Verify nullable/required fields alignment
   - Regenerate if outdated: `npm run supabase:types`

3. **Common DB issues checklist**:
   - ❌ Wrong field name (e.g., `user_id` vs `userId`)
   - ❌ Incorrect enum value (e.g., typo in intervention status)
   - ❌ Missing required field
   - ❌ Type mismatch (e.g., string vs number vs UUID)
   - ❌ RLS policy blocking access
   - ❌ Using old column that was renamed/removed in migration

4. **Debugging workflow**:
   ```typescript
   // 1. Check the type definition
   import { Database } from '@/lib/database.types'
   type Intervention = Database['public']['Tables']['interventions']['Row']

   // 2. Verify field exists in type
   console.log('Available fields:', Object.keys({} as Intervention))

   // 3. Check migration for actual schema
   // Look in supabase/migrations/ for table definition

   // 4. Test RLS policy
   // Login as specific role and verify data access
   ```

5. **Quick reference**:
   - **Types**: `lib/database.types.ts`
   - **Schema**: `supabase/migrations/*.sql` (22 migrations currently)
   - **RLS Functions**: `is_admin()`, `is_gestionnaire()`, `is_team_manager()`, `get_building_team_id()`, `get_lot_team_id()`, `is_tenant_of_lot()`, `can_view_building()`, `can_view_lot()`
   - **Regenerate types**: `npm run supabase:types`

**Example debugging session**:
```typescript
// Error: "column 'tenant_id' does not exist"
// → Check migration 20251015193000_remove_tenant_id_from_interventions.sql
// → Verify database.types.ts doesn't have tenant_id
// → Use correct column name from latest migration
```

### 🎯 Architecture Decisions
1. **Prefer NEW architecture** (Repository Pattern + Services)
2. **Repository Pattern** for data access (not direct Supabase calls)
3. **Service Layer** for business logic
4. **Error Boundaries** at component + service levels

### 🔄 Migration Guidelines
- **Phase approach**: Complete current phase before next
- **Backward compatibility**: Maintain during transition
- **Documentation**: Update as you migrate

### 📁 File Organization
- **< 500 lines per file**: Split if larger
- **Single responsibility**: One concern per module
- **Clear naming**: Descriptive and consistent
- **Proper exports**: Use index.ts for clean imports

## Key Principles

> **Official Docs First**: Official documentation trumps existing code patterns.

> **Test Everything**: Comprehensive tests required before feature completion.

> **Isolation is Critical**: Use Pattern 5 (Test Isolation) to prevent state leakage.

> **Server-First Architecture**: Load data server-side, pass as props to Client Components.

---

## Essential References

**Official Docs**:
- [Supabase SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React 19 Features](https://react.dev/blog/2024/12/05/react-19)

**Project Docs**:
- `docs/refacto/database-refactoring-guide.md` - Migration guide
- `docs/refacto/Tests/HELPERS-GUIDE.md` - E2E testing patterns ⭐
- `lib/services/README.md` - Services architecture
- `docs/rapport-audit-complet-seido.md` - Audit reports

---

**Last Updated**: 2025-10-11
**Status**: ✅ Production Ready
**Current Focus**: Email Integration (Resend) + Performance Optimization
