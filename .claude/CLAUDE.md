# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

Never do any build after small changes if the user didn't ask you to. The only situations you are allowed to run build command without asking is after if you've avec made mode than 100 lines of code change and you wand to make sure you didn't break anything, or after a long series of edits without testing

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
- **⚠️ IMPORTANT après un build** : S'assurer que tous les processus Node sont terminés avant de relancer le serveur de développement

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

### ⚙️ Workflow après Build

**Après avoir exécuté `npm run build`, TOUJOURS :**

1. **Vérifier si des processus Node.js sont actifs** :
   ```bash
   # Windows
   tasklist | findstr node.exe

   # Linux/Mac
   ps aux | grep node
   ```

2. **Si des processus Node.js tournent, les fermer EXPLICITEMENT** :
   ```bash
   # Windows
   taskkill /F /IM node.exe

   # Linux/Mac
   pkill -9 node
   ```

3. **Vérifier qu'aucun processus n'occupe le port 3000** :
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # Linux/Mac
   lsof -i :3000
   ```

4. **Nettoyer le cache Next.js (optionnel mais recommandé)** :
   ```bash
   rm -rf .next
   ```

5. **Relancer le serveur de développement** :
   ```bash
   npm run dev
   ```

**Pourquoi c'est important ?**
- Les processus Node.js peuvent rester actifs en arrière-plan après un build
- Cela peut causer des conflits de port (EADDRINUSE)
- Des fichiers .next corrompus peuvent persister et causer des erreurs d'hydratation
- Un nouveau serveur propre garantit que les changements sont bien appliqués
- ⚠️ **NE JAMAIS lancer npm run dev si des processus Node tournent déjà**

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

### Server Component Authentication Pattern

**🔐 Centralized Auth Context** (`lib/server-context.ts`)

All gestionnaire Server Components **MUST** use `getServerAuthContext()` for authentication:

```typescript
import { getServerAuthContext } from '@/lib/server-context'

export default async function MyPage() {
  // ✅ CORRECT: Centralized auth + team fetching (1 line)
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // Now use team.id, profile.id, etc.
  const data = await someService.getData(team.id)

  return <MyPageClient data={data} />
}
```

**❌ ANTI-PATTERNS (DO NOT USE):**

```typescript
// ❌ WRONG 1: Manual auth (10+ lines, no caching)
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
const { data: profile } = await supabase.from('users').select('*').eq('auth_user_id', user.id).single()
const teamService = await createServerTeamService()
const teams = await teamService.getUserTeams(profile.id)
const team = teams[0]

// ❌ WRONG 2: Using getServerSession directly
const session = await getServerSession()
// ... manual profile fetch

// ❌ WRONG 3: No authentication at all (SECURITY ISSUE!)
export default async function MyPage() {
  const data = await loadData() // Anyone can access!
  return <MyPageClient data={data} />
}
```

**✅ Benefits:**
- **Deduplication**: React.cache() ensures layout + page share auth (1 DB query instead of 2)
- **Type Safety**: Enforced ServerAuthContext interface
- **Security**: Guaranteed auth check on all pages
- **Simplicity**: ~150 lines eliminated across 13 pages

**📊 Migration Status (2025-10-22):**
- ✅ **21 Server Component pages** migrated across **ALL roles**:
  - **Gestionnaire**: 13 pages (dashboard, biens, contacts, interventions, mail, profile, details pages)
  - **Prestataire**: 1 page (interventions/[id])
  - **Locataire**: 4 pages (dashboard, interventions list/detail/new)
  - **Admin**: 3 pages (dashboard, notifications, profile)
- ⏭️ Client Components use `useAuth()` + `useTeamStatus()` (separate pattern)
- 🔥 **~250 lines of duplicated auth code eliminated**

**🔍 Security Fixes Applied:**
- **3 pages had NO AUTH** before migration → **Critical fixes applied**:
  - `gestionnaire/biens/immeubles/[id]/page.tsx` - Public building details ⚠️
  - `gestionnaire/biens/lots/[id]/page.tsx` - Public lot details ⚠️
  - `admin/notifications/page.tsx` - Public admin notifications ⚠️

**🔒 RLS Policies Verified (2025-10-22):**
- ✅ Multi-tenant isolation via `is_team_manager(team_id)`
- ✅ Helper functions: `get_building_team_id()`, `get_lot_team_id()`
- ✅ Team membership validation via `team_members` table
- ✅ Admin bypass with `is_admin()` check
- 📋 All queries properly scoped to user's team(s)

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


### ðŸ”§ Troubleshooting Protocol

**When you encounter a non-trivial error that you can't resolve after 2-3 attempts, ALWAYS:**

1. **Consult the Troubleshooting Checklist**:
   - ðŸ“– **Read** [docs/troubleshooting-checklist.md](../docs/troubleshooting-checklist.md)
   - ðŸ” **Find** the relevant section (DB, Auth, RLS, Build, etc.)
   - âœ… **Follow** the diagnostic checklist step by step
   - ðŸ“ **Apply** the documented solution

2. **Non-trivial errors include**:
   - âœ… File editing failures (VSCode auto-save conflicts)
   - âœ… Database schema mismatches (column not found, enum invalid)
   - âœ… Authentication loops or missing permissions
   - âœ… RLS policies blocking legitimate access
   - âœ… Build errors with TypeScript types
   - âœ… Hydration mismatches in React
   - âœ… Performance issues (>3s load time)
   - âœ… Flaky E2E tests
   - âŒ NOT for: Basic typos, syntax errors, missing imports

3. **When to UPDATE the checklist**:
   - âœ… You discover a NEW bug pattern (not already documented)
   - âœ… Same bug occurred 2+ times in different contexts
   - âœ… Solution required >10 minutes to find
   - âœ… Root cause was non-obvious (architectural, config, etc.)
   - âŒ NOT for: One-off bugs, user-specific issues

4. **How to UPDATE the checklist**:
   ```markdown
   ## [Next Number]ï¸âƒ£ [Category Name]

   ### SymptÃ´me
   [Exact error message or behavior]

   ### Checklist de Diagnostic
   - [ ] **[Diagnostic question]** ?
     â†’ [Action to take]

   ### Solutions par Cas
   #### Cas 1: [Specific case]
   **Cause**: [Root cause]
   **Solution**: [Code or steps]
   ```

5. **Quick Reference - Common Issues**:
   - **File editing fails** â†’ Section 1 (PowerShell workaround)
   - **Column not found** â†’ Section 2 (DB schema)
   - **User not authenticated** â†’ Section 3 (Server auth)
   - **Permission denied** â†’ Section 4 (RLS policies)
   - **Build errors** â†’ Section 5 (TypeScript/cache)
   - **Route 404** â†’ Section 6 (Routing)
   - **Page slow** â†’ Section 7 (Performance)
   - **Test timeout** â†’ Section 8 (E2E tests)

**Workflow Example**:
```
1. Error: "File has been unexpectedly modified"
2. Consult checklist Section 1 (File Editing)
3. Follow diagnostic: File >700 lines? âœ…
4. Apply solution: PowerShell by line numbers
5. Success â†’ Continue work
6. If NEW pattern â†’ Update checklist Section 1
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
