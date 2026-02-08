# AGENTS.md - SEIDO Codebase Knowledge Base

> **For Agents:** Read this BEFORE implementing. Contains hard-won learnings.
> **Updated by:** sp-compound skill after each feature completion.

**Last Updated:** 2026-02-08
**Total Learnings:** 21

---

## Codebase Patterns (Read First!)

[Reusable, generally-applicable patterns discovered through development]

### Auth & Sessions

#### Learning #001: RLS Silent Blocks
**Problem:** Supabase upsert returns `{ data: [...], error: null }` even when RLS blocks the write — no error thrown.
**Solution:** Always check `!data` or `data.length === 0` after upsert operations, not just `error`.
**Example:** `lib/services/repositories/*.repository.ts` — all upsert methods
**When to Use:** Any INSERT/UPDATE/UPSERT through Supabase client
**Added:** 2026-02-04 | **Source:** Push notification subscription debugging

#### Learning #002: userProfile.id vs client userId
**Problem:** Client-side `userId` from auth can differ from `userProfile.id` in multi-team setups.
**Solution:** Always use server-side `userProfile.id` (from `getServerAuthContext`) for database operations.
**Example:** `app/api/push/subscribe/route.ts` — uses `userProfile.id` not auth userId
**When to Use:** Any operation linking data to a user identity
**Added:** 2026-02-04 | **Source:** Push subscription security fix

#### Learning #003: .single() vs .limit(1) for multi-team users
**Problem:** `.single()` throws error when user belongs to multiple teams (returns 2+ rows).
**Solution:** Use `.limit(1)` instead of `.single()` for queries that might return multiple rows per user.
**Example:** `lib/services/repositories/team-member.repository.ts`
**When to Use:** Any query where a user might have multiple team memberships
**Added:** 2026-02-04 | **Source:** Multi-team support implementation

### Database & Queries

#### Learning #004: PostgREST nested relations fail silently with RLS
**Problem:** PostgREST `select('*, table2(*)')` returns `null` for nested relations when RLS blocks access — no error.
**Solution:** Use separate queries with `Promise.all` instead of nested selects when RLS is involved.
**Example:** `lib/services/repositories/intervention.repository.ts` — separate queries pattern
**When to Use:** Any query joining tables with different RLS policies
**Added:** 2026-02-04 | **Source:** Intervention detail page debugging

### UI & Components

#### Learning #005: ContactSelector hideUI pattern
**Problem:** Need to reuse contact selection logic in custom modals without the default UI.
**Solution:** Use `hideUI` prop on ContactSelector to get behavior without rendering.
**Example:** `components/contacts/contact-selector.tsx`
**When to Use:** When embedding selection logic in custom modal layouts
**Added:** 2026-02-04 | **Source:** Provider assignment modal refactor

### Notifications

#### Learning #006: Push notification URL must be role-specific
**Problem:** Push notifications with generic URLs (e.g., `/interventions/123`) fail because each role has its own route prefix.
**Solution:** Build URLs with role prefix: `/${role}/interventions/${id}`.
**Example:** `lib/send-push-notification.ts:42`
**When to Use:** Any notification that links to an in-app page
**Added:** 2026-02-04 | **Source:** Push notification URL routing fix

### Interventions

#### Learning #007: Create conversation threads BEFORE assignments
**Problem:** Database triggers on `intervention_assignments` expect a conversation thread to already exist.
**Solution:** Create the conversation thread FIRST, then create the assignment. Trigger order is critical.
**Example:** `app/api/create-manager-intervention/route.ts`
**When to Use:** Any code that creates intervention assignments
**Added:** 2026-02-04 | **Source:** Intervention creation flow debugging

#### Learning #010: RLS Access ≠ Explicit Participation
**Problem:** Managers could view conversations via RLS (`team_id` match) but weren't in `conversation_participants`, breaking read tracking and participant lists.
**Solution:** Distinguish between RLS access (can read) and explicit participation (tracked in UI, unread counts work). Add users as participants when they interact.
**Example:** `lib/services/domain/conversation-service.ts:319-332` — auto-add on first message
**When to Use:** Any feature involving conversation visibility or participant lists
**Added:** 2026-02-06 | **Source:** Conversation participants fix

#### Learning #011: Property-linked vs Team-linked Managers
**Problem:** Adding ALL team managers to conversations was wrong — only managers responsible for the specific property should be participants.
**Solution:** Query `lot_contacts` + `building_contacts` (union) to find property-specific managers, not team membership.
**Example:** `app/api/create-intervention/route.ts:281-343`
**When to Use:** Any feature assigning managers to property-related entities (interventions, contracts, etc.)
**Added:** 2026-02-06 | **Source:** Conversation participants fix

#### Learning #012: Trigger Removal vs Application Code
**Problem:** SQL trigger `add_team_managers_to_thread` added ALL managers globally — too coarse-grained for role-specific logic.
**Solution:** Remove coarse triggers; implement fine-grained logic in application code where you have full context (user role, property links, etc.).
**Example:** Migration `20260206100000_remove_auto_add_all_managers_trigger.sql` + app code in route.ts
**When to Use:** When trigger behavior is too generic and needs role/context awareness
**Added:** 2026-02-06 | **Source:** Conversation participants fix

### Performance

#### Learning #008: Batch queries for lists (N+1 prevention)
**Problem:** Listing N interventions with N separate queries for related data causes N+1 performance issues.
**Solution:** Use `Promise.all` to batch all related queries, or fetch all related data in a single query with `in()`.
**Example:** `lib/services/domain/intervention.service.ts` — list methods
**When to Use:** Any list/table view fetching related data per row
**Added:** 2026-02-04 | **Source:** Dashboard performance optimization

#### Learning #013: N+1 batch with Map for O(1) lookup
**Problem:** Even with `.in('id', ids)` batch query, looping through results to match is O(n²).
**Solution:** Build a `Map<string, T[]>` from batch results, then use `.get(id)` for O(1) lookup when enriching.
**Example:** `hooks/use-tenant-data.ts:220-270` — `quotesMap`, `timeSlotsMap`, `assignmentsMap`
**When to Use:** When enriching a list of items with related data from batch queries
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization

#### Learning #014: unstable_cache with revalidation tags
**Problem:** Static data (intervention types) fetched on every request wastes DB calls.
**Solution:** Use `unstable_cache(fn, [key], { revalidate: 300, tags: ['tag'] })` for server-side caching with manual invalidation via `revalidateTag()`.
**Example:** `lib/cache/cached-queries.ts` — `getCachedInterventionTypes`
**When to Use:** Reference data that rarely changes (types, categories, settings)
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization

#### Learning #015: Lazy load heavy libraries with dynamic import
**Problem:** Libraries like XLSX (~500KB) and BigCalendar (~100KB) are bundled even when not used on the page.
**Solution:** Use `next/dynamic` with `ssr: false` for components, or `await import('lib')` for utilities.
**Example:** `lib/import/template-generator.ts` — `getXLSX()` lazy loader
**When to Use:** Any library > 50KB that's not needed on every page
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization

#### Learning #016: SSR/Client hybrid with initialData prop
**Problem:** Client hooks fetch data on mount, causing loading states and waterfalls even when server could pre-fetch.
**Solution:** Add `initialData` prop to hooks; Server Component fetches, passes to Client Component; hook skips fetch if initialData provided.
**Example:** `hooks/use-notifications.ts` + `app/gestionnaire/(with-navbar)/notifications/page.tsx`
**When to Use:** Any page with client data fetching that could be pre-rendered server-side
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization

#### Learning #017: React.memo + useCallback for list performance
**Problem:** List items re-render on every parent update even when their props haven't changed.
**Solution:** Wrap list item components with `React.memo()`, memoize parent callbacks with `useCallback` for stable references.
**Example:** `components/dashboards/shared/intervention-card.tsx` + `manager-dashboard-v2.tsx`
**When to Use:** Any list rendering 10+ items with onClick handlers or frequently updating parent
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization

#### Learning #018: react-window v2 API migration
**Problem:** Upgrading react-window from v1 to v2 causes build failures — `FixedSizeList` no longer exported.
**Solution:** Import `List` instead. Rename props: `itemCount` → `rowCount`, `itemSize` → `rowHeight`, `itemData` → `rowProps`, `height` → `defaultHeight`. Use `rowComponent` prop instead of children function.
**Example:** `components/interventions/interventions-list-view-v1.tsx`
**When to Use:** Any file using react-window FixedSizeList or VariableSizeList
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization V2

#### Learning #019: Virtualization threshold (50+ items)
**Problem:** Virtual scrolling has overhead (measuring, callbacks) that slows down small lists.
**Solution:** Only virtualize lists with 50+ items. Below threshold, use standard map rendering.
**Example:** `components/interventions/interventions-list-view-v1.tsx:VIRTUALIZATION_THRESHOLD`
**When to Use:** When implementing virtual scrolling — always add a threshold check
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization V2

#### Learning #020: Suspense streaming with async Server Components
**Problem:** Pages wait for all data before rendering anything — slow perceived performance.
**Solution:** Create async Server Component for data-heavy content, wrap in `<Suspense fallback={<Skeleton/>}>`. Shell renders instantly, content streams when ready.
**Example:** `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx`
**When to Use:** Any page with slow data fetching (>200ms) that has a meaningful shell to show
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization V2

#### Learning #021: Supabase relation alias syntax for joins
**Problem:** Need to join related tables with custom property names (e.g., `address_record` instead of `address`).
**Solution:** Use alias syntax: `address_record:address_id(formatted_address)` — format is `alias:foreign_key(columns)`.
**Example:** `app/gestionnaire/(with-navbar)/mail/page.tsx:67`
**When to Use:** When joining tables and needing a custom property name or selecting specific columns
**Added:** 2026-02-08 | **Source:** Performance Navigation Optimization V2 (mail page fix)

### Testing

#### Learning #009: Test with 3 user archetypes
**Problem:** Testing with only one user type misses role-specific and permission edge cases.
**Solution:** Always test with 3 types: (1) user with account, (2) contact without account, (3) multi-team user.
**Example:** `tests/e2e/` — test fixtures
**When to Use:** Any feature touching auth, permissions, or user-specific data
**Added:** 2026-02-04 | **Source:** Multi-team support QA

---

## Common Pitfalls (Avoid These!)

### Infinite Refresh Loop
**Symptom:** Page keeps re-rendering, network tab shows repeated requests.
**Cause:** Effect dependency triggers itself (e.g., setting state that's also a dependency).
**Fix:** Use `useRef<Set<string>>` for `executedRef` pattern — track what's already been executed.

### Client Hook Race Condition
**Symptom:** Data appears undefined on first render, works on refresh.
**Cause:** `authLoading` not included in `useEffect` dependencies.
**Fix:** Always include `authLoading` in effect dependencies and guard with `if (authLoading) return`.

### PostgREST Nested Relations
**Symptom:** Related data is `null` even though it exists in the database.
**Cause:** RLS policy on the nested table blocks access (silent failure).
**Fix:** Use separate queries with `Promise.all` instead of nested `select()`.

### Email Template Rendering
**Symptom:** Email looks correct in preview but broken in actual email clients.
**Cause:** React Email components have different rendering in preview vs production.
**Fix:** Always test with `npx react-email dev` AND send a real test email.

---

## How to Add a Learning

When adding a new learning via `sp-compound`, use this format:

```markdown
#### Learning #XXX: [Short Title]
**Problem:** [What went wrong — be specific]
**Solution:** [How to fix it correctly — actionable]
**Example:** [file:line where implemented]
**When to Use:** [Context that triggers this knowledge]
**Added:** YYYY-MM-DD | **Source:** [Feature/bug that revealed this]
```

**Rules:**
- Increment the learning number from the last one in the relevant section
- Update "Total Learnings" count in the header
- If the learning is a new category, create a new `###` section
- Keep descriptions concise but actionable — write for the next agent, not yourself
