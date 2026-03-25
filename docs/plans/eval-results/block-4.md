# Block 4 Evaluation -- Contacts (CRUD + Societes)

```
━━━ Feature Evaluation ━━━━━━━━━━━━━━━━━━━━━━━
Feature: Contacts (CRUD + Societes)
Files reviewed: 7

Security:       6/10  ██████░░░░
Patterns:       6/10  ██████░░░░
Design Quality: 7/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 6.3/10
Result: FAIL (weighted < 7.0)

Blockers:
- B4-SEC-1: console.error in production code (contacts detail page)
- B4-SEC-2: Contact detail page fetches ALL interventions/buildings/lots without team scoping in initial queries
- B4-PAT-1: contacts.ts server actions lack explicit auth context check
Suggestions: See below
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Files Reviewed

1. `app/gestionnaire/(with-navbar)/contacts/page.tsx` (205 lines)
2. `app/gestionnaire/(no-navbar)/contacts/details/[id]/page.tsx` (320 lines)
3. `app/gestionnaire/(no-navbar)/contacts/nouveau/page.tsx` (125 lines)
4. `app/gestionnaire/(no-navbar)/contacts/modifier/[id]/page.tsx` (85 lines)
5. `app/gestionnaire/(no-navbar)/contacts/societes/[id]/page.tsx` (55 lines)
6. `app/actions/contacts.ts` (176 lines)
7. `lib/services/repositories/contact.repository.ts` (513 lines)

## Security: 6/10

**Positives:**
- `getServerAuthContext('gestionnaire')` used in ALL page.tsx files: contacts/page.tsx (line 18), nouveau/page.tsx (line 24), details/[id]/page.tsx (line 49), modifier/[id]/page.tsx (line 20), societes/[id]/page.tsx (line 27)
- Subscription read-only check in detail page (lines 52-62)
- Team mismatch check in edit page (line 53-54)
- Multi-team consolidated view support in contacts list
- `findContactInTeam` in edit page scopes to team (line 40)
- Company detail page scopes query to team_id (line 33)
- `Promise.allSettled` for graceful degradation on contact list

**Issues:**
- (-2) **B4-SEC-2**: Contact detail page (details/[id]/page.tsx lines 115-117) fetches ALL interventions (`supabase.from('interventions').select('*, lot(*, building(*))')`) and ALL buildings and ALL lots without any team_id filter. RLS provides some protection, but this is an unbounded query that returns ALL data visible to the auth user -- wasteful and could leak data if RLS is misconfigured. Should scope with `.eq('team_id', team.id)` or at minimum filter by team in the query
- (-1) **B4-SEC-1**: `console.error` in production code at details/[id]/page.tsx line 85 -- should use `logger.error`
- (-1) **B4-PAT-1**: `contacts.ts` server actions (`getTeamContactsAction`, `getTeamContactsByRoleAction`) use `createServerActionSupabaseClient()` directly without explicit auth context check via `getServerActionAuthContextOrNull()`. The client is authenticated via cookies, but there is no explicit validation of the caller -- the teamId parameter is trusted from the client

## Patterns: 6/10

**Positives:**
- Repository pattern for contact operations with `ContactRepository`
- Separate queries to avoid RLS issues with PostgREST relations (documented decision in repository)
- Batch company + address fetching in `findByTeam` (avoids N+1)
- Parallel data fetching in all server pages
- `buildInvitationStatusMap` utility for invitation status normalization
- Contact type prefill via `?type=` parameter (nouveau/page.tsx line 28)
- `.maybeSingle()` instead of `.single()` used in repository (line 104, 343, 474)
- `.limit(1).maybeSingle()` for invitation lookup (details/[id]/page.tsx line 102-103)

**Issues:**
- (-1) `console.error` at details/[id]/page.tsx line 85 -- violates no `console.log` rule
- (-1) `console.error` at societes/[id]/page.tsx line 39 -- same violation
- (-1) Contact detail page (details/[id]/page.tsx) has N+1-like pattern: after fetching all data, it does separate filtering per role (lines 220-299) and then conditionally fetches MORE contracts for owned lots (lines 176-208). The initial queries are too broad
- (-1) contacts.ts server actions trust the teamId parameter from client without server-side validation that the user belongs to that team. RLS provides implicit protection, but explicit check is the pattern

## Design Quality: 7/10

**Positives:**
- (+1) Contact list has invitation status tracking with effective status (pending/expired logic)
- (+1) Company details page with associated contacts grid
- (+1) Contact creation with type prefill and sessionKey/returnUrl redirect support
- (+1) Role-based data filtering in contact detail (prestataire, locataire, gestionnaire, proprietaire)
- Empty state rendering on error (contacts/page.tsx lines 195-204)
- Parallel service initialization

**Issues:**
- (-1) Contact detail page attempts to display ALL properties and interventions for the contact but no tab system or progressive disclosure is visible in the server component -- the client component receives all data upfront
- (-1) No loading skeleton visible in contact detail page (server component renders all at once, no Suspense)
- (-1) Company detail page is minimal (55 lines server component) with direct Supabase queries in page.tsx rather than through service layer

## Improvements

1. **BLOCKER: Replace `console.error` with `logger.error`** at details/[id]/page.tsx:85 and societes/[id]/page.tsx:39
2. **BLOCKER: Scope contact detail queries to team** -- add `.eq('team_id', team.id)` or use team-scoped service methods for interventions/buildings/lots queries (lines 115-117)
3. **BLOCKER: Add auth context to contacts.ts server actions** -- call `getServerActionAuthContextOrNull()` and validate teamId against the user's actual team
4. **Add loading skeleton** for contact detail page (Suspense boundary)
5. **Use service layer** for company detail page instead of direct Supabase queries
6. **Optimize contact detail data loading** -- fetch only role-relevant data instead of all interventions + all buildings + all lots and then filtering
7. **Add `?type=` handling documentation** -- ensure `mapContactType()` handles both EN and FR values (referenced in plan but not visible in server page)
