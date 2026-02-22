# AGENTS.md - SEIDO Codebase Knowledge Base

> **For Agents:** Read this BEFORE implementing. Contains hard-won learnings.
> **Updated by:** sp-compound skill after each feature completion.

**Last Updated:** 2026-02-22
**Total Learnings:** 77

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

#### Learning #052: Query optimization must replace removed data, not just remove JOINs
**Problem:** `findByTeam()` was "optimized" (2026-01-30) by removing nested `address_record` JOINs, but no batch replacement was added. The column renderer in `patrimoine.config.tsx` expected `lot.address_record` and `lot.building.address_record` — both became undefined. Independent lots showed "-" for address, lot detail headers showed no address for manually-entered addresses.
**Solution:** When removing nested JOINs for performance, always add a batch post-fetch: (1) collect all foreign key IDs from the result set, (2) single `.in()` query to fetch related records, (3) map results back. Also: separate "has displayable data" (text) from "has feature data" (coordinates for maps) — don't require lat/lng just to show an address string.
**Example:** `lib/services/repositories/lot.repository.ts:228-243` — batch address fetch in findByTeam(); `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx:368` — relaxed condition accepts formatted_address without coordinates
**When to Use:** Any time you optimize a repository query by removing nested JOINs — verify the UI still has all the data it needs, and add batch fetch if needed
**Added:** 2026-02-20 | **Source:** Independent lots address display fix (3 files, 3 layers)

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

#### Learning #022: DB enum fields must propagate to ALL display components
**Problem:** `scheduling_type` (fixed/slots/flexible) existed in DB but `InterventionDetailsCard` and `PlanningCard` had zero awareness — they only reasoned about slot/date data. Flexible mode (no slots by design) showed "En attente" and "Aucun creneau propose".
**Solution:** When a DB enum affects display, audit ALL components that show related data. Thread the enum through types → config functions → UI. In SEIDO: check gestionnaire + locataire + prestataire views (3 roles x 2 components = 6 call sites).
**Example:** `components/interventions/shared/cards/intervention-details-card.tsx:getPlanningStatusConfig()` — 4th param `schedulingType`
**When to Use:** Any new DB enum or mode field that changes how related data should be displayed
**Added:** 2026-02-09 | **Source:** Planning Mode Display Fix

#### Learning #023: Avatar fallback cascade (first_name → name → email → '?')
**Problem:** `AvatarFallback` using `first_name?.[0] + last_name?.[0]` renders empty string when both are null (common: many users only have `name` filled via OAuth).
**Solution:** Use cascade: `first_name+last_name` → `name.split(' ').map(p=>p[0])` → `email.substring(0,2)` → `'?'`. The ParticipantsDisplay component already had this pattern.
**Example:** `components/chat/chat-interface.tsx:767-772` — avatar fallback in individual thread header
**When to Use:** Any component rendering user avatars/initials
**Added:** 2026-02-09 | **Source:** Chat Avatar Display Fix

#### Learning #012: Trigger Removal vs Application Code
**Problem:** SQL trigger `add_team_managers_to_thread` added ALL managers globally — too coarse-grained for role-specific logic.
**Solution:** Remove coarse triggers; implement fine-grained logic in application code where you have full context (user role, property links, etc.).
**Example:** Migration `20260206100000_remove_auto_add_all_managers_trigger.sql` + app code in route.ts
**When to Use:** When trigger behavior is too generic and needs role/context awareness
**Added:** 2026-02-06 | **Source:** Conversation participants fix

#### Learning #024: DB triggers must guard on auth_user_id
**Problem:** The `add_assignment_to_conversation_participants` trigger added ALL assigned users (including contacts without auth accounts) to conversation threads. Contacts without accounts can't log in so they pollute participant lists and end up in wrong threads.
**Solution:** Add a `SELECT EXISTS(... WHERE auth_user_id IS NOT NULL)` guard at the top of any trigger that adds conversation participants. Return early if the user has no auth account.
**Example:** `supabase/migrations/20260209100000_fix_trigger_individual_threads.sql:30-35` — `v_has_auth` guard
**When to Use:** Any DB trigger that adds users to conversations, notifications, or permission-gated features
**Added:** 2026-02-09 | **Source:** Conversation thread bugs fix

#### Learning #025: Supabase migration repair workflow
**Problem:** A migration was already applied to the remote DB but needed to be updated (bug in the SQL). Can't just re-run or edit — Supabase treats applied migrations as immutable.
**Solution:** Use `npx supabase migration repair --status reverted <timestamp> --linked` to mark as un-applied, edit the local file, then `npx supabase db push --linked` to re-apply. Include retroactive cleanup (DELETE/INSERT) in the migration for data consistency.
**Example:** Migration `20260209100000` — reverted and re-pushed with auth_user_id guard
**When to Use:** When an already-applied migration has a bug that needs fixing (not just adding new behavior)
**Added:** 2026-02-09 | **Source:** Conversation thread bugs fix

#### Learning #026: Optional boolean backwards compat (`!== false` pattern)
**Problem:** Adding `hasAccount?: boolean` to a shared `Participant` interface would break existing callers that don't pass the field — they'd be treated as `false` (no account) if using `!!participant.hasAccount`.
**Solution:** Use `participant.hasAccount !== false` instead of `!!participant.hasAccount`. This treats `undefined` as `true` (default: has account), only `false` means explicitly no account. Allows gradual adoption across callers.
**Example:** `components/interventions/shared/layout/participants-row.tsx:94` — `const hasAccount = participant.hasAccount !== false`
**When to Use:** When adding optional boolean flags to shared interfaces where existing callers shouldn't break
**Added:** 2026-02-09 | **Source:** Participant account indicator

#### Learning #030: File objects are lost when passed through JSON.stringify/fetch body
**Problem:** `SimpleWorkCompletionModal` passes `mediaFiles: File[]` to a service that serializes them via `JSON.stringify` in a `fetch` body. `File` objects become `{name, size, type}` metadata — the actual binary content is silently lost.
**Solution:** Upload `File` objects individually via `FormData` + `/api/upload-intervention-document` BEFORE calling the service action. Pass only document IDs or metadata to the JSON service call.
**Example:** `components/intervention/intervention-action-buttons.tsx:703-720` — upload loop for mediaFiles
**When to Use:** Any handler that receives `File[]` from a modal and needs to persist them server-side
**Added:** 2026-02-12 | **Source:** Prestataire closure modal — mediaFiles not saved

#### Learning #031: console.log stubs in production handlers — always search & replace
**Problem:** `onView` and `onDownload` handlers for `DocumentsCard` were `console.log` stubs in prestataire and locataire views. Buttons appeared to work (no error) but did nothing. No linter or test catches this.
**Solution:** After implementing a handler for one role (e.g., gestionnaire), grep the codebase for `console.log` stubs on the same prop across all role views. Pattern: `grep -r "console.log.*View document\|console.log.*Download document"`.
**Example:** `app/prestataire/.../intervention-detail-client.tsx:990-991` — replaced stubs with `createSignedUrl` handlers
**When to Use:** Any time you implement document/file handlers for one role view — check all 3 role views
**Added:** 2026-02-12 | **Source:** Document preview/download fix for prestataire & locataire

#### Learning #032: intervention_reports content not shown in detail pages
**Problem:** `intervention_reports` table stores closure reports (provider_report, tenant_report, manager_report) but no detail page component displayed them — only the gestionnaire finalization modal queried them. Reports were invisible after submission.
**Solution:** Created shared `ReportsCard` component, fetch `intervention_reports` server-side in all 3 page.tsx files, pass as `reports` prop to detail clients. Display above DocumentsCard.
**Example:** `components/interventions/shared/cards/reports-card.tsx` — shared component with report_type-based styling
**When to Use:** When adding a new data table — always verify it has a display component in ALL relevant role views
**Added:** 2026-02-12 | **Source:** Closure reports visibility fix

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

#### Learning #027: ISO date string timezone trap — use parseLocalDate
**Problem:** `new Date("2026-01-01")` interprets the string as UTC midnight. In France (UTC+1), this becomes Dec 31 at 23:00 — off by one day. Affects DatePicker, Calendar, and any ISO↔Date conversions.
**Solution:** Never use `new Date(isoString)` for display dates. Use `parseLocalDate(str)` which splits the string and constructs `new Date(year, month-1, day)` in local time. Use `formatLocalDate(date)` for the reverse.
**Example:** `components/ui/date-picker.tsx:33-46` — exported `parseLocalDate` + `formatLocalDate`
**When to Use:** Any component converting between ISO date strings (YYYY-MM-DD) and `Date` objects for display or form input
**Added:** 2026-02-11 | **Source:** DatePicker enhancement (month/year dropdowns + manual input)

#### Learning #028: react-day-picker v9 captionLayout="dropdown" for month/year selection
**Problem:** Default Calendar only shows month-by-month arrows — selecting dates far in the past/future (e.g., birth date, lease start) requires clicking dozens of times.
**Solution:** Set `captionLayout="dropdown"` on the Calendar component (react-day-picker v9 native support). Add `startMonth`/`endMonth` props for the dropdown range. Requires `fr` locale from date-fns for French month names.
**Example:** `components/ui/calendar.tsx` — default captionLayout changed to `"dropdown"`, ±10 year range
**When to Use:** Any Calendar/DatePicker where users might need to select dates more than 2 months away
**Added:** 2026-02-11 | **Source:** DatePicker enhancement (month/year dropdowns)

### Security

#### Learning #033: SECURITY DEFINER function rewrite regression — diff all role branches
**Problem:** `get_accessible_intervention_ids()` was rewritten in migration `20260211170000` (multi-profile + contract support) but silently lost the `intervention_assignments` branch for locataire (originally added in `20260106160000`). Building-level interventions (`lot_id IS NULL`) became invisible to assigned locataires. The gestionnaire branch also regressed (fixed separately in `20260213120000`).
**Solution:** Before rewriting any multi-role SECURITY DEFINER function, diff the current DB version branch-by-branch against the new version. Check each role's IF block independently. Use a checklist: admin, gestionnaire, prestataire, locataire — verify all access paths survive.
**Example:** `supabase/migrations/20260213120000_fix_rls_gestionnaire_intervention_access.sql:72-78` — restored locataire `intervention_assignments` branch
**When to Use:** Any time you rewrite `get_accessible_intervention_ids()` or similar multi-role SECURITY DEFINER helpers
**Added:** 2026-02-13 | **Source:** Locataire building-level intervention visibility fix

#### Learning #034: Action buttons — apiRoute vs href determines modal presence
**Problem:** `intervention-action-utils.ts` used `apiRoute`/`apiMethod` for the `cloturee_par_locataire` finalize action, which executes a direct API call from intervention cards — bypassing the `FinalizationModalLive` modal entirely. The gestionnaire couldn't review reports or add notes.
**Solution:** For any action requiring user input or review (finalization, approval), always use `href: ${baseUrl}?action=xxx` to navigate to the detail page where modals live. Reserve `apiRoute` for simple one-click actions that need no additional UI (e.g., "remind tenant").
**Example:** `lib/intervention-action-utils.ts:169-179` — changed from `apiRoute` to `href` with `?action=finalize`
**When to Use:** When adding or modifying action buttons in `intervention-action-utils.ts` — verify whether the action needs a modal
**Added:** 2026-02-13 | **Source:** Closure button bypassing finalization modal

#### Learning #029: SECURITY DEFINER views — use ALTER VIEW SET (security_invoker = on)
**Problem:** Supabase linter flags views as SECURITY DEFINER even when migrations don't explicitly set it. Views created by the migration runner (superuser) can silently default to DEFINER, bypassing RLS for all querying users.
**Solution:** Explicitly set `ALTER VIEW public.view_name SET (security_invoker = on)` in a migration. This is non-destructive — no DROP/RECREATE needed, no GRANT re-application, no view definition changes. PostgreSQL 15+ feature.
**Example:** `supabase/migrations/20260211100000_fix_security_definer_views.sql` — 5 views fixed
**When to Use:** When Supabase linter reports `security_definer_view` errors, or when creating any new view that queries RLS-protected tables
**Added:** 2026-02-11 | **Source:** Supabase security linter fix (5 views)

#### Learning #036: Quote actions must be flag-based, not status-based
**Problem:** Quote-related actions for prestataire were inside `case 'demande_de_devis':` — a status that was removed. This meant providers couldn't see quote actions when `requires_quote=true` on other statuses like `planification`.
**Solution:** Decouple quote actions from intervention status. Move them to a post-switch block that checks `intervention.requires_quote` flag. Pass `{ requiresQuote, hasPendingQuote }` options through `getRoleBasedActions()`.
**Example:** `components/intervention/intervention-action-buttons.tsx:382` — post-switch block, `lib/intervention-action-utils.ts:258` — options param
**When to Use:** Any logic that checks "should this provider see quote actions?" — use `requires_quote` flag, not intervention status
**Added:** 2026-02-16 | **Source:** Intervention workflow polish — demande_de_devis removal

#### Learning #037: DB quote status is 'accepted' not 'approved'
**Problem:** UI code used `status === 'approved'` to find accepted quotes, but the DB enum is `('draft', 'pending', 'sent', 'accepted', 'rejected', 'expired', 'cancelled')`. This caused quote approval badges and amounts to not display correctly.
**Solution:** Use `'accepted'` everywhere. Update `quote-status-mapper.ts` with the full 7-value enum. Keep `'approved' → 'accepted'` as a legacy backward-compat mapping in the mapper only.
**Example:** `lib/quote-status-mapper.ts:4` — full DbQuoteStatus type, `components/quotes/quote-card.tsx:65` — removed `case 'approved'` duplicates
**When to Use:** Any code that reads or writes quote status — always check the actual DB enum values
**Added:** 2026-02-16 | **Source:** Quote status alignment across 8 files

#### Learning #038: Separate queries for finalization-context API (RLS safety)
**Problem:** The finalization-context API used nested PostgREST selects (`interventions + lot + building + address`). With RLS, nested relations can silently return `null` (AGENTS.md #004). The API was returning partial data.
**Solution:** Refactored to 6 parallel separate queries (building, lot, assignments, reports, timeSlots, quotes) matching the gestionnaire page.tsx pattern. This ensures each query respects its own RLS policy.
**Example:** `app/api/intervention/[id]/finalization-context/route.ts:57-108` — Promise.all with 6 queries
**When to Use:** Any API route that fetches related data across tables with different RLS policies
**Added:** 2026-02-16 | **Source:** Finalization modal data completeness fix

#### Learning #035: Time slot status is 'selected' not 'confirmed'
**Problem:** Finalization modal searched for `timeSlots.find(s => s.status === 'confirmed')` — never matched. The DB stores confirmed time slots as `status = 'selected'` (set when gestionnaire picks a slot). This caused the modal to show "2 créneaux proposés" instead of the confirmed date/time.
**Solution:** Use `s.status === 'selected'` for confirmed slots. Filter `pending`/`requested` for proposed count (not `timeSlots.length` which includes selected). Also fetch `selected_by_manager` to detect fixed scheduling.
**Example:** `components/intervention/finalization-modal-live.tsx:362` — useMemo `planning`
**When to Use:** Any component displaying time slot confirmation status or counting proposed slots
**Added:** 2026-02-16 | **Source:** Finalization modal Planning & Estimation fix

### Planning & Documentation

#### Learning #039: Verify codebase state BEFORE writing implementation plans
**Problem:** The Stripe implementation plan referenced `ALTER TABLE subscriptions` and `createAdminSupabaseClient()` — but the `subscriptions` table doesn't exist yet (needs CREATE TABLE), and the admin client is actually `getSupabaseAdmin()` in `lib/services/core/supabase-admin.ts`. Email templates are in `emails/templates/` not `lib/email/templates/`. These mismatches would cause implementation failures.
**Solution:** Before writing any implementation plan, run an Explore agent to verify: (1) actual table existence in DB/migrations, (2) actual function/export names in the codebase, (3) actual file paths for existing patterns (emails, services, etc.). Cross-reference `lib/database.types.ts`, `lib/services/index.ts`, and migration files.
**Example:** `docs/stripe/2026-02-17-stripe-user-stories.md` — 11 corrections (C1-C11) identified during Ralph review
**When to Use:** Any time you write an implementation plan that references existing codebase structures
**Added:** 2026-02-17 | **Source:** Stripe subscription plan review (Ralph session)

#### Learning #040: App-managed trial vs Stripe-managed trial — choose based on card requirement
**Problem:** Stripe trials require a Subscription object, which requires either a payment method or `payment_method_collection=if_required`. If your product offers a trial with NO credit card at all, there's no Stripe Subscription to create during the trial period.
**Solution:** Use app-managed trial: store `trial_end` timestamp in your own DB, use CRON jobs for notifications (J-7, J-3, J-1) and expiration. Create only a Stripe Customer at signup (no subscription). When user subscribes, create a fresh Stripe Subscription via Checkout. This is simpler and avoids Stripe's `trial_will_end` webhook (which never fires without a subscription).
**Example:** `docs/stripe/2026-01-30-stripe-subscription-design.md` section 2.3 + 3.2
**When to Use:** Any SaaS product offering a free trial without requiring a credit card at signup
**Added:** 2026-02-17 | **Source:** Stripe subscription design — app-managed trial architecture decision

#### Learning #041: Bulk INSERT bypasses business logic — use centralized service actions
**Problem:** Lease-created interventions used a raw `supabase.from('intervention_assignments').insert(rows)` to create assignments. This only created DB rows — no conversation threads, no welcome messages, no group thread system messages, no participants added. The gestionnaire UI flow worked correctly because it called `assignUserAction()` which triggers the full `interventionService.assignUser()` pipeline.
**Solution:** Never use raw INSERT for operations that have centralized business logic (service layer). Replace with the same action/service call used by the UI. Use `Promise.allSettled` (not `Promise.all`) so one failure doesn't block others.
**Example:** `app/actions/intervention-actions.ts:335` — `assignUserAction()` replaces raw insert; `lib/services/domain/intervention-service.ts:611` — `assignUser()` now accepts `'locataire'` role
**When to Use:** Any time a background/automated process creates data that the UI creates via a service — check if the service has side effects (threads, notifications, activity logs) that the raw INSERT would skip
**Added:** 2026-02-17 | **Source:** Lease intervention assignments missing conversation threads

#### Learning #042: XOR constraints make single-column queries miss half the data
**Problem:** The `interventions` table has a XOR constraint (`building_id XOR lot_id`). Building-level interventions have `lot_id = NULL`. Querying `.in('lot_id', lotIds)` can never match NULL (SQL three-valued logic), so building-level interventions were invisible on the building detail page's "Interventions" tab.
**Solution:** Use Supabase `.or()` to combine both sides of the XOR: `.or('building_id.eq.X,lot_id.in.(Y)')`. This captures building-level (lot_id IS NULL, building_id matches) AND lot-level (lot_id matches) interventions in a single query.
**Example:** `lib/services/domain/intervention-service.ts` — `getByBuildingWithLots()` method
**When to Use:** Any query on a table with XOR/mutually-exclusive foreign keys — always query BOTH sides of the constraint, not just one.
**Added:** 2026-02-18 | **Source:** Building interventions tab showing 0 interventions

#### Learning #043: Temporal dead zone — useState order matters with dependent hooks
**Problem:** In the lot creation page, `useMultiLotDocumentUpload` used `lotData`, `lots`, and `independentLots` BEFORE their `useState` declarations. JavaScript's TDZ for `const`/`let` throws `ReferenceError` on access before declaration, causing the component to crash on mount.
**Solution:** Any hook that depends on state values must be declared AFTER the `useState` hooks it reads. Unlike `var` (which hoists as `undefined`), `const`/`let` are uninitialized until execution reaches their declaration.
**Example:** `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` — `useMultiLotDocumentUpload` moved after all 3 `useState` declarations
**When to Use:** When adding hooks that reference component state — always verify declaration order
**Added:** 2026-02-18 | **Source:** Code review fix — C1 critical build blocker

#### Learning #044: Multi-lot creation — loop all successes, not just [0]
**Problem:** In multi-lot creation, interventions and document uploads were only executed for `successfulCreations[0]` — the first created lot. All other lots silently missed interventions and had staged documents discarded.
**Solution:** Always loop `for (const { lot, createdLot } of successfulCreations)` for post-creation side effects (interventions, document uploads, assignments).
**Example:** `app/gestionnaire/(no-navbar)/biens/lots/nouveau/page.tsx` — both existing-building and independent branches
**When to Use:** Any bulk creation flow where post-creation actions must apply to ALL created entities
**Added:** 2026-02-18 | **Source:** Code review fix — H1+H2 multi-lot bugs

#### Learning #045: Zod schema drift — always route raw input through validated data
**Problem:** `expiryDate` was extracted from FormData and used directly in the DB insert, bypassing the Zod schema entirely. Any malformed date string would be written to the database.
**Solution:** Add ALL user-provided fields to the Zod schema object. Use `validatedData.fieldName` in the DB insert, never the raw extracted value.
**Example:** `app/api/upload-contract-document/route.ts` + `lib/validation/schemas.ts` — `expiryDate` now validated with regex pattern
**When to Use:** When adding new fields to API routes — always extend the Zod schema AND use validated output
**Added:** 2026-02-18 | **Source:** Code review fix — H4 validation bypass

#### Learning #046: Verify DB constraints before "fixing" query patterns
**Problem:** Code review identified per-lot interventions as missing `building_id`, suggesting a fix to add it. But the interventions table has a strict XOR constraint: `(building_id IS NOT NULL AND lot_id IS NULL) OR (building_id IS NULL AND lot_id IS NOT NULL)`. Adding both would violate the constraint and break inserts.
**Solution:** Before changing any query or insert pattern on tables with CHECK constraints, read the migration SQL to verify the constraint definition. XOR constraints require querying BOTH sides with `.or()`, not storing both values.
**Example:** `supabase/migrations/20251014134531_phase3_interventions_chat_system.sql` — `valid_intervention_location` CHECK
**When to Use:** Whenever a code review suggests changing entity reference patterns — always verify the DB constraint first
**Added:** 2026-02-18 | **Source:** Code review fix — C3 false positive dismissed

### Testing

#### Learning #009: Test with 3 user archetypes
**Problem:** Testing with only one user type misses role-specific and permission edge cases.
**Solution:** Always test with 3 types: (1) user with account, (2) contact without account, (3) multi-team user.
**Example:** `tests/e2e/` — test fixtures
**When to Use:** Any feature touching auth, permissions, or user-specific data
**Added:** 2026-02-04 | **Source:** Multi-team support QA

#### Learning #047: Auto-init useEffects cause E2E race conditions
**Problem:** Wizard step 2 has a `useEffect` that auto-creates the first lot when `lots.length === 0`. If the E2E test clicks "Next" before this effect runs, the button is disabled and `waitForStep()` times out — but only intermittently.
**Solution:** Always call `waitForNextEnabled(15_000)` before every `clickNext()` in wizard E2E tests. This ensures async initialization (auto-created entities, API validations) has settled.
**Example:** `tests/e2e/lot-creation.e2e.ts:233-243` — submission test with guards on every step transition
**When to Use:** Any E2E test navigating multi-step wizards with auto-init effects
**Added:** 2026-02-20 | **Source:** Lot wizard submission test flakiness

#### Learning #048: Next.js client-side navigation bypasses Puppeteer waitForNavigation
**Problem:** `router.push()` does client-side routing — Puppeteer's `waitForNavigation` never fires. Tests hang at redirect verification.
**Solution:** Poll the URL with `page.waitForFunction((part) => window.location.href.includes(part), { timeout, polling: 500 }, urlPart)`.
**Example:** `tests/e2e/pages/lot-wizard.page.ts:290-297` — `waitForRedirect()` method
**When to Use:** Any E2E test that verifies redirect after form submission in Next.js App Router
**Added:** 2026-02-20 | **Source:** Lot wizard E2E submission tests

#### Learning #049: Dashboard-bounce clears Next.js client cache between E2E runs
**Problem:** Navigating directly to the wizard a second time reuses Next.js client-side cached page state, causing stale form data and test failures.
**Solution:** Navigate to `/gestionnaire/dashboard` first (with 1s delay), THEN navigate to the wizard. This forces a fresh Server Component render.
**Example:** `tests/e2e/lot-creation.e2e.ts:173-179` — dashboard bounce before submission test
**When to Use:** Any E2E test that re-visits a wizard/form page within the same browser session
**Added:** 2026-02-20 | **Source:** Lot wizard independent mode E2E

#### Learning #050: Radix toast detection — poll DOM text, not specific selectors
**Problem:** Radix UI toasts render dynamically in the body with `data-state="open"`. CSS selectors targeting toast elements are fragile and break across Radix versions.
**Solution:** Poll `document.body.innerText.includes('expected text')` via `page.waitForFunction()`. The text is stable across rendering changes.
**Example:** `tests/e2e/pages/lot-wizard.page.ts:277-283` — `waitForSuccessToast()` polls for "créé avec succès"
**When to Use:** Any E2E test verifying toast/notification messages with Radix UI
**Added:** 2026-02-20 | **Source:** Lot wizard submission verification

#### Learning #051: Radix RadioGroupItem — click label, verify via data-state
**Problem:** Clicking the Radix `RadioGroupItem` directly via Puppeteer's `.click()` is unreliable during React hydration — the element may detach and reattach.
**Solution:** Click `label[for="radioId"]` via `page.evaluate(() => el.click())`, then verify state with `radio.getAttribute('data-state') === 'checked'`. If first click fails (hydration race), retry once.
**Example:** `tests/e2e/pages/lot-wizard.page.ts:103-136` — `selectIndependentMode()`
**When to Use:** Any E2E test interacting with Radix RadioGroup, CheckboxGroup, or Switch components
**Added:** 2026-02-20 | **Source:** Lot wizard independent mode selection

#### Learning #053: Storage uploads need service role client when RLS blocks user client
**Problem:** The contract document upload route used the user's Supabase client for `storage.from('documents').upload()`. Supabase storage has its own RLS on `storage.objects`. When the storage bucket RLS policy doesn't match the user's context (e.g., new bucket, restrictive policies), uploads silently fail or return "Bucket not found".
**Solution:** Use `createServiceRoleSupabaseClient()` for storage upload operations. The service role bypasses storage RLS. Keep the user client for auth validation and team membership checks. Pattern: user client validates → service client uploads → service client inserts DB row.
**Example:** `app/api/upload-contract-document/route.ts:83-96` — `serviceClient` for storage + DB, `supabase` for auth
**When to Use:** Any API route uploading files to Supabase Storage — especially when consolidating buckets or changing RLS policies
**Added:** 2026-02-21 | **Source:** Contract document upload "Bucket not found" fix

#### Learning #054: useImperativeHandle ref timing — retry loop in E2E tests
**Problem:** `ContactSelector` uses `useImperativeHandle` to expose an `openDialog()` method via ref. The ref is `null` until React runs the effect after mount + hydration. Clicking the "Add tenant" button before the ref is wired does nothing — no error, no dialog.
**Solution:** Implement a 3-attempt retry loop: click button → wait 3s for dialog → if not open, wait 2s and retry. Also add a 2s initial delay after the button appears for hydration. The ref wiring takes 1-2 render cycles.
**Example:** `tests/e2e/pages/contract-wizard.page.ts:164-237` — `addFirstTenant()` with retry loop
**When to Use:** Any E2E test clicking buttons that trigger `useImperativeHandle`-exposed methods (contact modals, custom dialogs)
**Added:** 2026-02-21 | **Source:** Contract wizard tenant selection E2E

#### Learning #055: E2E toast verification — check success OR error to avoid blind timeouts
**Problem:** `waitForSuccessToast()` only polled for the success message. When submission failed (e.g., RLS error), the test timed out after 30s without indicating WHY — the error toast was already on screen but the wait didn't look for it.
**Solution:** Poll for both success AND error conditions: `text.includes('success') || text.includes('Erreur')`. Return the full page text so the assertion can report the actual error message. This cuts debugging time from "30s timeout + screenshot analysis" to "instant failure with error text".
**Example:** `tests/e2e/pages/contract-wizard.page.ts:348-357` — dual-condition `waitForSuccessToast()`
**When to Use:** Any E2E wait that polls for a success indicator after form submission
**Added:** 2026-02-21 | **Source:** Contract wizard submission test debugging

#### Learning #056: E2E network noise — filter analytics, HMR, and ERR_ABORTED in requestfailed handler
**Problem:** Puppeteer's `requestfailed` event fires for every failed request, including: Contentsquare analytics (`contentsquare.net`), HMR WebSocket (`127.0.0.1:7242`), Google avatar images (`googleusercontent.com`), and RSC prefetch aborts (`ERR_ABORTED`). This floods test output with ~20+ irrelevant lines per test.
**Solution:** Filter known noisy URLs and error types at the top of the handler: `if (url.includes('contentsquare.net') || ... || request.failure()?.errorText === 'net::ERR_ABORTED') return`. Only log genuine network failures.
**Example:** `tests/e2e/contract-creation.e2e.ts:58-66` — filtered `requestfailed` handler
**When to Use:** Any E2E test with `page.on('requestfailed')` debugging — always add noise filters
**Added:** 2026-02-21 | **Source:** Contract wizard E2E test cleanup

#### Learning #057: Cookie/PWA banners reappear on each page navigation — dismiss after EVERY goto
**Problem:** Cookie consent and PWA install banners are rendered per-page in Next.js. After navigating from dashboard to wizard, both banners reappear, covering clickable elements. `position:fixed` overlays block Puppeteer's CDP coordinate-based clicks.
**Solution:** Call `dismissAllBanners(page)` after EVERY `page.goto()` call. Use DOM-level `.click()` via `page.evaluate()` for all interactions to bypass overlays entirely. Pattern: navigate → wait for content → dismiss banners → interact.
**Example:** `tests/e2e/contract-creation.e2e.ts:99-100,115-116` — dismiss after dashboard + after wizard navigation
**When to Use:** Any E2E test that navigates to multiple pages — banners reappear each time
**Added:** 2026-02-21 | **Source:** Contract wizard E2E overlay debugging

#### Learning #058: Vitest fileParallelism — singleFork + concurrent:false is NOT enough for E2E
**Problem:** E2E tests sharing a Puppeteer browser singleton ran concurrently across files despite `pool: 'forks'`, `singleFork: true`, and `sequence: { concurrent: false }`. Tests from two files interleaved, causing navigation interference (one test's goto interrupted another's page state).
**Solution:** Add `fileParallelism: false` at the `test` level in vitest config. `singleFork` controls worker processes, `concurrent` controls within-file ordering, but `fileParallelism` (default `true`) controls whether multiple test files are dispatched concurrently to the same worker.
**Example:** `tests/e2e/vitest.e2e.config.ts:29` — `fileParallelism: false`
**When to Use:** Any vitest E2E config where test files share state (browser, DB connection, server)
**Added:** 2026-02-21 | **Source:** Intervention workflow E2E debugging — cross-file interference

#### Learning #059: SSR hydration gap — waitForContent passes on shell, then React replaces with skeleton
**Problem:** `waitForContent(['général', 'participants'])` found tab labels in the SSR-rendered shell HTML, but React hydration then replaced the content with loading skeletons (grey placeholder bars). By the time the assertion ran, the page showed no readable text.
**Solution:** Never use instant `hasContent()` snapshots for assertions. Always poll for the SPECIFIC text you're asserting with `page.waitForFunction(() => document.body.innerText.includes('target'))`. This survives the SSR→hydration→data-fetch lifecycle.
**Example:** `tests/e2e/intervention-lifecycle.e2e.ts:124` — `waitForFunction` polling for 'planifier' instead of `hasContent`
**When to Use:** Any E2E assertion on Server Component pages with client-side data fetching
**Added:** 2026-02-21 | **Source:** Intervention lifecycle E2E — blank page after navigateTo

#### Learning #060: Late-appearing system modals intercept button clicks — dismiss inside every action
**Problem:** Notification permission modals ("Activez les notifications") appear on a TIMER (not on page load). `dismissAllBanners` in `navigateTo` runs too early. When `clickActionButton` fires 3+ seconds later, the modal has appeared and intercepts the click.
**Solution:** Call `dismissAllBanners(page)` inside `clickActionButton` (and any other action method) BEFORE finding/clicking the target button. Defense in depth: dismiss at navigation AND at interaction time.
**Example:** `tests/e2e/pages/intervention-detail.page.ts:130` — `dismissAllBanners` before `findButtonByText`
**When to Use:** Any E2E POM method that clicks buttons on pages with timed system modals
**Added:** 2026-02-21 | **Source:** Intervention workflow E2E — notification modal blocking approval flow

#### Learning #061: Ghost dialog shells from dismissed Radix modals trap find()
**Problem:** Dismissed Radix Dialog modals leave empty `[role="dialog"]` DOM elements (ghost shells). `Array.from(dialogs).find(d => !isSystem(d))` picks the FIRST non-system dialog — which may be an empty ghost shell with no buttons. The actual confirmation dialog is later in the array.
**Solution:** Iterate ALL dialogs with `for...of`, skip entries with `textContent.trim().length < 5` (ghost shells), and return the first button match found in a non-ghost, non-system dialog. Never use `find()` for dialog selection.
**Example:** `tests/e2e/pages/intervention-detail.page.ts:244-261` — `findDialogButton` iterates all dialogs
**When to Use:** Any E2E interaction with Radix Dialog/AlertDialog modals (approval, cancel, confirm flows)
**Added:** 2026-02-21 | **Source:** Intervention workflow E2E — approval "Confirmer" button never found

#### Learning #062: Radix Dialog Portal elements need robustClick (CDP + coordinate fallback)
**Problem:** Radix Dialog Portal renders modal content outside React's root `#__next` container. Standard `ElementHandle.click()` sometimes fails silently for portal-rendered buttons because the click event doesn't propagate through React's event delegation tree.
**Solution:** Use a `robustClick` pattern: (1) CDP click via `element.click()`, (2) wait 200ms, (3) coordinate-based `page.mouse.click(centerX, centerY)` as fallback. The mouse click goes through the browser's full hit-testing, catching cases where CDP events don't reach React handlers.
**Example:** `tests/e2e/pages/intervention-detail.page.ts:345-358` — `robustClick` method
**When to Use:** Any E2E click on Radix Portal elements (Dialog, AlertDialog, Popover, DropdownMenu)
**Added:** 2026-02-21 | **Source:** Intervention workflow E2E — dialog confirm button click failures

### Stripe Integration

#### Learning #063: Stripe checkout.session.metadata vs subscription_data.metadata are SEPARATE
**Problem:** `team_id` was only set on `subscription_data.metadata` (intended for webhooks) but NOT on the checkout session's own `metadata`. When `verifyCheckoutSession` retrieved the session, `session.metadata.team_id` was empty, causing verification to always return `verified: false`. The subscription worked (webhook got the team_id) but the UI never showed the success state.
**Solution:** Always set `metadata: { team_id }` at BOTH levels: (1) `subscription_data.metadata` for webhook handlers, and (2) the session-level `metadata` for checkout verification. They are independent objects in Stripe's API.
**Example:** `lib/services/domain/subscription.service.ts:createCheckoutSession()` -- metadata at session level + subscription_data.metadata
**When to Use:** Any Stripe Checkout Session creation where you need to read metadata back in `verifyCheckoutSession` AND in webhook handlers
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- checkout verification always failing

#### Learning #064: stripe.customers.retrieve() returns { deleted: true } instead of throwing
**Problem:** `getOrCreateStripeCustomer` assumed that `stripe.customers.retrieve(id)` would throw if the customer was deleted. Instead, Stripe returns a `Stripe.DeletedCustomer` object with `{ id, object: 'customer', deleted: true }`. Code continued using the deleted customer ID, causing all subsequent API calls to fail.
**Solution:** After `stripe.customers.retrieve()`, always check `if ('deleted' in customer && customer.deleted)`. If true, treat it the same as a not-found error: create a new customer and update the DB record.
**Example:** `lib/services/domain/subscription.service.ts:getOrCreateStripeCustomer()` -- deleted check + recreate
**When to Use:** Any code that retrieves a Stripe customer from a stored ID -- the customer may have been deleted in the Stripe Dashboard
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- stale customer ID after dashboard deletion

#### Learning #065: RLS on billing/admin tables -- ALL writes must use service_role client
**Problem:** Server actions for Stripe billing used the authenticated Supabase client (`createServerSupabaseClient()`). The `stripe_customers` and `subscriptions` tables have RLS policies allowing SELECT for team members but NO INSERT/UPDATE policies for authenticated users. Writes returned `{ data: null, error: null }` (silent RLS block, see Learning #001).
**Solution:** Use `createServiceRoleSupabaseClient()` for ALL write operations on billing tables. Keep the authenticated client for auth validation and team membership checks. Pattern: auth client validates user identity -> service role client performs DB writes.
**Example:** `app/actions/subscription-actions.ts` -- service role client for subscription writes, auth client for `getServerActionAuthContextOrNull()`
**When to Use:** Any server action or service that writes to tables with admin-only or restrictive RLS (billing, system config, audit logs)
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- silent RLS violation on stripe_customers insert

#### Learning #066: Pino logger truncates complex Stripe error objects -- use console.error for debugging
**Problem:** Pino logger's default serialization only captures standard properties of Error objects (`message`, `stack`). Stripe errors have additional properties (`type`, `code`, `decline_code`, `param`, `raw`) that are non-enumerable and get silently dropped. Debug logs showed `"error": {}` for meaningful Stripe errors.
**Solution:** For Stripe error debugging, add `console.error('Stripe error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))`. `Object.getOwnPropertyNames()` captures non-enumerable properties that `JSON.stringify()` alone would miss. Remove these console.error calls before production.
**Example:** `app/actions/subscription-actions.ts` -- added console.error alongside pino logger calls
**When to Use:** Any debugging session involving Stripe or other APIs with custom error objects that extend Error
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- invisible error details in pino logs

#### Learning #067: OAuth signup bypasses DB triggers -- mirror trigger logic in OAuth action
**Problem:** Email signup fires the `handle_new_user_confirmed()` DB trigger which initializes a trial subscription. OAuth signup uses `completeOAuthProfileAction()` which creates the team but never fires the trigger's subscription step. OAuth users got teams but no subscription record, causing `useSubscription` hook to show undefined/error state.
**Solution:** Any business logic added to the signup trigger MUST also be added to `completeOAuthProfileAction()`. Use the service layer (e.g., `subscriptionService.initializeTrialSubscription()`) to keep the logic DRY -- call it from both paths.
**Example:** `app/auth/complete-profile/actions.ts:completeOAuthProfileAction()` -- added `initializeTrialSubscription()` call after team creation
**When to Use:** Any time you add logic to `handle_new_user_confirmed()` trigger or any signup-related DB trigger
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- OAuth users missing subscription records

#### Learning #068: Stripe webhook fallback for local development
**Problem:** Stripe webhooks require a publicly accessible URL. During local development without Stripe CLI running (`stripe listen --forward-to`), webhooks never reach localhost. Checkout sessions complete in Stripe but the local DB never updates -- subscription remains in `trialing` state.
**Solution:** Add a fallback in `verifyCheckoutSession`: when the session's `payment_status === 'paid'`, expand the subscription from the session object and sync it directly to the DB. This makes the checkout flow work without webhooks. The webhook handler remains the primary mechanism for production.
**Example:** `app/actions/subscription-actions.ts:verifyCheckoutSession()` -- expands `line_items` and syncs subscription when webhook hasn't processed yet
**When to Use:** Any Stripe integration that depends on webhooks for DB state changes -- always provide a verification fallback for the checkout redirect
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- checkout success but DB not updated

#### Learning #069: Stripe metered vs standard pricing -- quantity parameter rejected for metered
**Problem:** Stripe prices created with `usage_type: metered` (pay-per-use) reject the `quantity` parameter in Checkout Sessions and Subscriptions. The error is `"You cannot pass quantity for metered usage prices"`. For per-unit SaaS billing (X lots at Y EUR/lot), you need `usage_type: licensed` (standard) prices.
**Solution:** When creating Stripe products/prices for per-unit billing (fixed quantity billed per cycle), use the "Standard pricing" model (usage_type: licensed). Metered pricing is for usage-based billing where you report usage via the Meter API. Verify price configuration in Stripe Dashboard under Products > Pricing.
**Example:** Stripe Dashboard -- Seido subscription prices created as "Standard pricing" with recurring/unit
**When to Use:** Any Stripe product setup where you charge per-unit (per lot, per seat, per user) -- never use metered for fixed-quantity billing
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- metered pricing error on checkout

#### Learning #070: Stale Stripe customer IDs -- verify before use, recreate if invalid
**Problem:** A Stripe customer ID stored in `stripe_customers` table may become invalid if the customer was deleted in Stripe Dashboard, or if the env was switched between test/live mode. Using a stale ID causes `stripe.checkout.sessions.create()` to fail with "No such customer: cus_xxx".
**Solution:** In `getOrCreateStripeCustomer()`, always verify the stored customer ID: (1) call `stripe.customers.retrieve(storedId)`, (2) check for thrown errors (not found) AND `deleted: true` response, (3) if invalid, create a new customer and update the DB record via `stripeCustomerRepo.updateStripeCustomerId()`.
**Example:** `lib/services/domain/subscription.service.ts:getOrCreateStripeCustomer()` -- retrieve + deleted check + fallback create
**When to Use:** Any function that reads a stored Stripe customer/subscription/price ID from the DB before using it in Stripe API calls
**Added:** 2026-02-22 | **Source:** Stripe billing debugging -- customer deleted in Dashboard but ID still in DB

#### Learning #071: Stripe subscription period dates are on the subscription item, not the subscription root
**Problem:** Reading `subscription.current_period_start` and `subscription.current_period_end` from a Stripe Subscription object (e.g. after `stripe.subscriptions.retrieve()` or from an expanded checkout session) returns `undefined`. The renewal date never persists and the UI shows "---".
**Solution:** In the Stripe API, these timestamps live on the first subscription item: `subscription.items?.data?.[0]?.current_period_start` and `subscription.items?.data?.[0]?.current_period_end`. Read from the item first, with fallback to the root for older API shapes.
**Example:** `lib/services/domain/subscription.service.ts:syncPeriodDatesFromStripe()` -- rawPeriodStart/End from firstItem; `app/actions/subscription-actions.ts:verifyCheckoutSession()` -- item then fullSub.items.data[0]
**When to Use:** Any code that needs current billing period dates from a Stripe Subscription (verify checkout, lazy sync, webhooks)
**Added:** 2026-02-22 | **Source:** Billing page renewal date always "---" (current_period_end null in DB)

#### Learning #072: CRUD completeness — gate ALL routes when restricting access
**Problem:** Lot detail page (`lots/[id]`) and creation page (`lots/nouveau`) had subscription gates, but lot edit page (`lots/modifier/[id]`) had NONE. Users could edit locked lots by typing the URL directly.
**Solution:** When implementing access restrictions on any entity, audit ALL CRUD routes: view, create, edit, delete. Use a checklist: `[id]/page.tsx`, `nouveau/page.tsx`, `modifier/[id]/page.tsx`, and all related server actions.
**Example:** `app/gestionnaire/(no-navbar)/biens/lots/modifier/[id]/page.tsx` — added subscription gate matching lots/[id]/page.tsx pattern
**When to Use:** Any time you add access control to an entity (lots, interventions, buildings, etc.)
**Added:** 2026-02-22 | **Source:** Billing audit — lot edit page bypass vulnerability

#### Learning #073: Boolean canAdd() is insufficient for batch operations — use canAdd(count)
**Problem:** `canAddProperty(teamId)` returned a boolean "can you add at least 1 lot?". Building creation with 5 lots would pass the check even with only 1 slot remaining.
**Solution:** Add optional `count` parameter: `canAddProperty(teamId, count = 1)`. All limit comparisons use `actualLots + count <= limit` instead of `actualLots < limit`.
**Example:** `lib/services/domain/subscription.service.ts:canAddProperty()` — count parameter with descriptive error message
**When to Use:** Any quota/limit check where the operation can affect multiple items at once (batch creation, imports, duplications)
**Added:** 2026-02-22 | **Source:** Billing audit — building creation batch bypass

#### Learning #074: Layered fail behavior — fail-closed at service, fail-open at page
**Problem:** `getAccessibleLotIds()` DB query failure returned `null` (all accessible) — a DB error granted full access. But fail-closed everywhere would brick the app on transient errors.
**Solution:** Two-layer approach: (1) Service-level DB query error → fail-closed (return `[]`, no access), (2) Page-level subscription check error → fail-open (from outer try/catch). This gives security without bricking on transient failures.
**Example:** `subscription.service.ts:getAccessibleLotIds()` returns `[]` on DB error; `lots/[id]/page.tsx` outer catch allows access on complete check failure
**When to Use:** Any access restriction system with multiple failure modes (DB error, service error, network error)
**Added:** 2026-02-22 | **Source:** Billing audit — fail-open security vulnerability

#### Learning #075: Consolidate status mapping to avoid 3-file drift
**Problem:** `mapStripeStatus()` was duplicated in 3 files (subscription.service.ts, stripe-webhook.handler.ts, subscription-actions.ts). Adding a new Stripe status required updating all 3 — guaranteed to be forgotten.
**Solution:** Keep one `static mapStripeStatus()` on `SubscriptionService` (already public). Import and use everywhere else. Delete private copies.
**Example:** `stripe-webhook.handler.ts` — `SubscriptionService.mapStripeStatus(subscription.status)` instead of private method
**When to Use:** Any mapping function (status, enum, role) used in 2+ files — consolidate immediately
**Added:** 2026-02-22 | **Source:** Billing audit — status mapping drift risk

#### Learning #076: Always verify audit findings against actual code before implementing fixes
**Problem:** Parallel audit agents flagged UpgradeModal's `upgradeSubscription(additionalLots)` as a revenue-loss bug, claiming it should pass the total. But the service method `upgradeSubscriptionDirect()` was designed to add delta to current Stripe quantity — the code was correct.
**Solution:** Before implementing any audit fix, read the FULL call chain (caller → action → service → API). 2/10 "CRITICAL" findings were false positives eliminated by reading 2 additional files.
**Example:** `upgrade-modal.tsx:125` → `subscription-actions.ts:215` → `subscription.service.ts:311` — additionalLots correctly used as delta
**When to Use:** After any automated audit or code review that flags issues without full context
**Added:** 2026-02-22 | **Source:** Billing audit — 2 false positives in UI audit report

#### Learning #077: CSS opacity inheritance — use overlay, not parent opacity, for dimming
**Problem:** Setting `opacity-60 grayscale` on a card parent also affects child elements (like "Unlock" button). CSS opacity is inherited and children CANNOT override it.
**Solution:** Use a semi-transparent overlay (`bg-white/60 backdrop-blur-[1px]`) positioned absolutely over the card content. Child buttons rendered inside the overlay are at full opacity.
**Example:** `components/patrimoine/lot-card-unified/lot-card-unified.tsx` — locked lot overlay with "Deverrouiller" button
**When to Use:** Any time you need to dim/grey-out a container while keeping interactive elements inside at full opacity
**Added:** 2026-02-22 | **Source:** Trial overage lot restriction — locked card rendering

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
