# Block 2 Evaluation -- Biens: Immeubles (CRUD)

```
━━━ Feature Evaluation ━━━━━━━━━━━━━━━━━━━━━━━
Feature: Biens: Immeubles (CRUD)
Files reviewed: 8

Security:       7/10  ███████░░░
Patterns:       6/10  ██████░░░░
Design Quality: 8/10  ████████░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 7.0/10
Result: PASS (marginal)

Blockers: None (but close)
Suggestions: See below
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Files Reviewed

1. `app/gestionnaire/(with-navbar)/biens/page.tsx` (215 lines)
2. `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/page.tsx` (425 lines)
3. `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx` (680 lines)
4. `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/page.tsx` (65 lines)
5. `app/gestionnaire/(no-navbar)/biens/immeubles/modifier/[id]/page.tsx` (106 lines)
6. `app/actions/building-actions.ts` (303 lines)
7. `lib/services/repositories/building.repository.ts` (761 lines)

## Security: 7/10

**Positives:**
- `getServerAuthContext('gestionnaire')` used in all page.tsx files: biens/page.tsx (line 16), immeubles/[id]/page.tsx (line 109), nouveau/page.tsx (line 17), modifier/[id]/page.tsx (line 14)
- Subscription read-only check in detail page (line 112-122) -- redirects blocked users
- Team mismatch check in edit page (line 59-65)
- `updateCompleteProperty` action uses `getServerActionAuthContextOrNull()` (line 131)
- Building existence verification before update with RLS comment (line 194)
- Subscription limit check on both create and edit (defense-in-depth)

**Issues:**
- (-3) **CRITICAL**: `createCompleteProperty` action (building-actions.ts line 26-89) does NOT call any auth context function. It relies solely on the composite service's internal auth, but the server action itself has no explicit auth gate. If the composite service creates the Supabase client with `createServerActionSupabaseClient`, auth is implicit via cookies, but the action does not validate the caller. This is inconsistent with `updateCompleteProperty` which explicitly checks auth
- (-0) The direct Supabase queries in immeubles/[id]/page.tsx (building_contacts, addresses) are acceptable since this is a Server Component with authenticated context

## Patterns: 6/10

**Positives:**
- Service layer used for primary operations
- Parallel data fetching with `Promise.all` in all server pages
- `notFound()` used for missing buildings
- XOR handling for building_id XOR lot_id correctly captured in `getByBuildingWithLots` call (line 198)
- Repository pattern with BaseRepository inheritance
- Validation hooks in repository
- Multi-team consolidated view support

**Issues:**
- (-2) `building-details-client.tsx` is **680 lines** -- exceeds 500-line limit. Should be split (tabs into separate components)
- (-1) `building.repository.ts` is **761 lines** -- exceeds 500-line limit
- (-1) Heavy use of `any` types: biens/page.tsx has **14 occurrences** (`any[]` for buildings, lots, etc.)
- (-1) building-details-client.tsx has **5 `as any` casts** (lines 498, 524, 525, 580, 804)
- (-0) building.repository.ts line 287-288: `findByIdWithRelations` uses `.single()` -- acceptable here since it's fetching by primary key ID, not a multi-team query

## Design Quality: 8/10

**Positives:**
- (+1) Skeleton loading component (`BuildingDetailsLoading`) matching 3-column layout shape
- (+1) Dynamic metadata (SEO) with building name and address in title
- (+1) Rich tab system: General, Contacts, Contracts, Interventions, Reminders, Documents, Emails, Activity
- (+1) Google Maps integration for building location
- (+1) Subscription gate on "Ajouter lot" action (line 212-216, 538-543) with upgrade modal
- (+1) Breadcrumb/back navigation pattern ("Retour" to biens list)
- Occupancy badge with color coding (green/yellow/red)
- Role-aware empty states in interventions tab
- Error state display with inline alert

**Issues:**
- (-1) `building-details-client.tsx` line 267: `logger.info('Downloading document:', document)` -- placeholder action handlers that just log
- (-1) `building-details-client.tsx` line 417: Archive action just logs `logger.info("Archive building:", building.id)` -- not implemented

## Improvements

1. **Add explicit auth check to `createCompleteProperty`** -- call `getServerActionAuthContextOrNull()` like `updateCompleteProperty` does
2. **Split `building-details-client.tsx`** into per-tab components (GeneralTab, ContactsTab, etc.) to stay under 500 lines
3. **Split `building.repository.ts`** -- extract search/city/nearby methods to a separate file or use composition
4. **Replace `any` types** in biens/page.tsx and building-details-client.tsx with proper typed interfaces
5. **Implement archive action** or remove the button (line 417)
6. **Implement document view/download handlers** (lines 266-271) or connect to existing document service
