# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SEIDO is a real estate management platform prototype built with Next.js 15. It's a multi-role application demonstrating complete interfaces for four user types: Admin, Gestionnaire (Manager), Prestataire (Service Provider), and Locataire (Tenant). Currently operates as a demo/prototype with mock data - no production backend.

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

### Application Structure
```
app/
├── dashboard/[role]/     # Role-based dashboards (admin, gestionnaire, prestataire, locataire)
├── auth/                 # Authentication pages
├── api/                  # API routes (future)
└── debug/                # Debug utilities

components/
├── ui/                   # shadcn/ui components
├── dashboards/           # Role-specific dashboard components
├── intervention/         # Intervention workflow components
├── availability/         # Provider availability components
└── quotes/               # Quote management components

lib/
├── auth-service.ts       # Authentication & role management
├── database-service.ts   # Database operations (currently mock)
├── intervention-*.ts     # Intervention workflow logic
├── notification-service.ts # Notification system
└── supabase.ts          # Supabase client setup
```

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

### Database Integration (Future)
- Supabase PostgreSQL with Row Level Security (RLS)
- TypeScript types auto-generated: `npm run supabase:types`
- Schema managed through migrations: `npx supabase migration new`
- Database service abstraction in `lib/database-service.ts`

### Key Services Architecture
- **AuthService**: Role-based authentication and permissions
- **DatabaseService**: Data operations with mock/real backend switching
- **NotificationService**: Real-time notifications system
- **InterventionActionsService**: Complex intervention workflow management

### Special Considerations
- Multi-role access patterns with strict data isolation
- Complex intervention status transitions between roles
- Provider availability system with conflict detection
- Quote workflow with approval chains
- Mobile-responsive design required

## Testing & Quality Assurance

Run linting before committing: `npm run lint`
Ensure TypeScript compilation: `npm run build`

The application has comprehensive error handling and loading states throughout. All components should maintain consistency with established patterns in the codebase.