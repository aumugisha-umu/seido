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

### 🧪 **New Testing Strategy** (Following Official Best Practices)
```bash
# Infrastructure Tests (Phase 1 Complete)
npm test lib/services/__tests__/phase1-infrastructure.test.ts

# Service Tests (Phase 2+)
npm test lib/services/__tests__/services/user.service.test.ts

# Build & Lint
npm run build            # TypeScript compilation + Next.js build
npm run lint             # ESLint validation
```

### 📊 **Quality Standards**
- ✅ **Test Coverage**: > 80% for all new services
- ✅ **TypeScript**: 0 warnings for new architecture
- ✅ **Performance**: < 100ms API response times
- ✅ **Accessibility**: WCAG 2.1 AA compliance

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
- **Test Documentation**: `lib/services/__tests__/`

### 🎯 **Key Principle**
> When in doubt, official documentation trumps existing code patterns. The technology ecosystem evolves rapidly, and official docs reflect the latest best practices.