# AGENTS.md - SEIDO Codebase Knowledge Base

> **For Agents:** Read this BEFORE implementing. Contains hard-won learnings.
> **Updated by:** sp-compound skill after each feature completion.

**Last Updated:** 2026-03-17
**Total Learnings:** 158

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

#### Learning #084: users.team_id is stale — use team_members for RLS
**Problem:** `get_accessible_intervention_ids()`, `get_accessible_lot_ids()`, and `get_accessible_building_ids()` used `users.team_id` in the gestionnaire branch. But `users.team_id` is set ONCE at signup/invitation and NEVER updated when a user joins another team or when `team_members` changes. INSERT policies use `is_team_manager()` which checks `team_members` → INSERT succeeds. SELECT policies check stale `users.team_id` → returns 0 rows. Result: interventions are created but invisible for that team.
**Solution:** In all `get_accessible_*` SECURITY DEFINER functions, the gestionnaire branch MUST use `team_members` table (joining on `tm.user_id = user_record.id AND tm.left_at IS NULL`) instead of `users.team_id`. For interventions, use the denormalized `interventions.team_id` column directly: `INNER JOIN team_members tm ON tm.team_id = i.team_id WHERE tm.user_id = user_record.id`.
**Example:** `supabase/migrations/20260225120000_fix_rls_gestionnaire_team_id_mismatch.sql` — all 3 functions fixed
**When to Use:** ANY new `get_accessible_*` function or RLS policy for gestionnaire role. NEVER trust `users.team_id` for access control — always use `team_members`.
**Added:** 2026-02-25 | **Source:** Team 320d8c6d interventions invisible, RLS blocks reads after INSERT

#### Learning #085: INSERT and SELECT RLS policies must use the same source of truth
**Problem:** INSERT policy for `interventions` used `is_team_manager(team_id)` (checks `team_members`), while SELECT policy used `get_accessible_intervention_ids()` (checked `users.team_id`). Different source of truth = INSERT succeeds but SELECT fails. The user sees "creation successful" but the record is invisible. The base-repository `create()` method catches this as PGRST116 and logs a warning but returns partial data, masking the root cause.
**Solution:** When writing any new RLS policy pair (INSERT WITH CHECK + SELECT USING), verify both check membership through the SAME table/function. Canonical source of truth for team membership in SEIDO is `team_members` (not `users.team_id`). Audit all 3 functions: `get_accessible_intervention_ids`, `get_accessible_lot_ids`, `get_accessible_building_ids`.
**Example:** The INSERT check `is_team_manager()` → `team_members`. The SELECT check must also use `team_members`.
**When to Use:** Writing or auditing any RLS INSERT + SELECT policy pair
**Added:** 2026-02-25 | **Source:** RLS mismatch debugging: INSERT succeeds, SELECT returns 0 rows

#### Learning #086: users.role vs team_members.role are different
**Problem:** `users.role` is the global user type (gestionnaire, prestataire, locataire, admin). `team_members.role` is the team-specific role (gestionnaire, admin). A user can be team_members.role='admin' for a team while users.role='gestionnaire'. The RLS function `get_accessible_intervention_ids()` branches on `users.role` — a team admin with `users.role='gestionnaire'` goes through the gestionnaire branch (not the admin ALL-access branch).
**Solution:** This is BY DESIGN — the admin branch in RLS is for system admins only (users.role='admin'). Team-level admins (team_members.role='admin') go through the gestionnaire branch and get team-scoped access. Do not confuse the two role systems. When debugging "admin can't see data", check WHICH admin role is meant.
**Example:** `get_accessible_intervention_ids()` — `user_record.role` comes from `users.role`, not `team_members.role`
**When to Use:** Debugging access issues where a "team admin" can't see data they should
**Added:** 2026-02-25 | **Source:** RLS debugging for team 320d8c6d

#### Learning #087: Server Components use getServerAuthContext, Server Actions use getServerActionAuthContextOrNull
**Problem:** Legacy `requireRole(['role'])` pattern duplicates auth + client creation sequentially, is not `cache()`-wrapped, and doesn't provide team context. In Server Actions, it throws a redirect on auth failure instead of returning an error to the client — breaking the `{ success: false, error }` contract.
**Solution:** Server Components/layouts: use `getServerAuthContext('role')` — it's `cache()`-wrapped (React 19), parallelizes client+auth via `Promise.all`, and provides `team`, `activeTeamIds`, `sameRoleTeams`. Server Actions: use `getServerActionAuthContextOrNull('role')` + null-check that returns `{ success: false, error: 'Authentication required' }`. Note: the new API takes a **string** role, not an array — `'admin'` not `['admin']`.
**Example:** `app/admin/(with-navbar)/layout.tsx`, `app/gestionnaire/(with-navbar)/dashboard/actions.ts`
**When to Use:** ANY new page, layout, or server action that needs authentication. The ONLY file still using raw `requireRole` should be `lib/auth-dal.ts` (the library), `lib/server-context.ts` (which wraps it), and `app/actions/auth-actions.ts` (uses `requireGuest`).
**Added:** 2026-02-26 | **Source:** Complete requireRole → getServerAuthContext migration across admin + proprietaire + gestionnaire actions

#### Learning #088: Radix ScrollArea injects display:table — breaks text truncation
**Problem:** Radix `<ScrollArea>` injects an inner `<div style="display: table; minWidth: 100%">` between the Viewport and content. `display: table` makes children expand to intrinsic width instead of being constrained by the parent — so `truncate` / `text-overflow: ellipsis` never triggers. Text renders at full width and gets hard-clipped by `overflow: hidden`.
**Solution:** Replace `<ScrollArea>` with `<div className="overflow-y-auto">` when you only need vertical scrolling and text truncation must work. The custom Radix scrollbar thumb is cosmetic — native scrollbar is fine for lists.
**Example:** `app/gestionnaire/(with-navbar)/mail/components/email-list.tsx:131`
**When to Use:** Any scrollable list where child elements need `truncate` / ellipsis behavior
**Added:** 2026-02-26 | **Source:** Email list text clipping bug in mail module

#### Learning #089: Dead feature detection — when webhooks supersede UI
**Problem:** After adding `syncEmailReplyToConversation()` to the inbound webhook, the "Réponses notifs" mail sidebar became a redundant duplicate view — same data already appeared in intervention conversation threads. ~260 lines of dead code (UI, state, props, API endpoint, SSR fetch, repository filter) persisted unnoticed.
**Solution:** When adding a new automated pipeline (webhook → conversation sync → notifications), audit existing manual views that showed the same data. The checklist: (1) Does the new pipeline cover all the same data? (2) Are notifications already sent? (3) Is the old UI still the only way to access the data? If all "yes, yes, no" → the old UI is dead code.
**Example:** Removed: `mailbox-sidebar.tsx` (NotificationReplyGroup section), `mail-client.tsx` (handleInterventionClick), `/api/emails/notification-replies/route.ts` (entire file), `page.tsx` (getNotificationReplyGroups)
**When to Use:** After adding any automated data sync pipeline that duplicates an existing manual view
**Added:** 2026-02-26 | **Source:** Remove notification replies sidebar cleanup

#### Learning #090: Client/server operator divergence in quota checks — always align boundary operators
**Problem:** Client-side `isAtLotLimit()` used `>=` (blocks AT the limit), while server-side `canAddProperty()` used `<=` (allows AT the limit). A user with exactly `subscribed_lots` lots was blocked by the client but allowed by the server. The forms also duplicated the server's limit logic instead of using the pre-computed `can_add_property` boolean from the subscription hook.
**Solution:** Ensure boundary operators are semantically consistent. Server says `(actual + count) <= limit → allowed`, so client must say `(actual + batch) > limit → blocked`. When business logic exists on the server, the client should mirror the SAME operator direction. Better yet: use the server's `checkCanAddProperty()` action for definitive decisions.
**Example:** `lot-creation-form.tsx:749`, `building-creation-form.tsx:507`, `edit-building-client.tsx:195` — all changed `>=` to `>`
**When to Use:** Any client-side pre-check that mirrors a server-side quota/limit validation
**Added:** 2026-02-26 | **Source:** Subscription limit false positive — modal showing at lot 134/155

#### Learning #091: Trigger-maintained cached counters drift — prefer live counts for billing-critical logic
**Problem:** `getLotCount()` read `billable_properties` from the `subscriptions` table (maintained by a trigger on `lots` INSERT/UPDATE OF deleted_at/DELETE). This counter drifted from reality (21-lot gap) because: (a) the trigger doesn't fire on `team_id` column changes, (b) bulk operations can bypass row-level triggers, (c) historical initialization during migration may have been incorrect.
**Solution:** For billing-critical decisions (subscription limits, quota checks), use a live `COUNT(*)` query instead of a cached counter. Pattern: `supabase.from('lots').select('*', { count: 'exact', head: true }).eq('team_id', X).is('deleted_at', null)` — this returns only the count (no data transfer), is indexed, and is always accurate.
**Example:** `lib/services/repositories/subscription.repository.ts:75` — changed from reading `billable_properties` to live count
**When to Use:** Any cached counter used for access/billing decisions. Keep triggers for non-critical uses (dashboard stats, analytics) but never trust them for gate-keeping.
**Added:** 2026-02-26 | **Source:** Subscription limit false positive — 21-lot gap between cached and real count

#### Learning #092: Clone/duplicate functions bypass validations added to "add" functions
**Problem:** `addLot()` in lot-creation-form had `isAtLotLimit()` check, but `duplicateLot()` and `addIndependentLot()` had NO limit check. Users could bypass the subscription limit by duplicating existing lots. Also, `isAtLotLimit()` only counted `lots.length` but ignored `independentLots.length` — independent lots mode had zero subscription enforcement.
**Solution:** Whenever adding validation to a "create/add" function, audit ALL other functions that produce the same entity. Checklist: (1) duplicate/clone, (2) import/bulk-add, (3) alternative creation modes (independent lots vs building lots). All must share the same guard.
**Example:** `lot-creation-form.tsx:799` (duplicateLot), `lot-creation-form.tsx:898` (addIndependentLot) — added `isAtLotLimit()` checks; `isAtLotLimit()` now counts `lots.length + independentLots.length`
**When to Use:** Any time you add a validation gate (quota, permission, format) to a create function — search for duplicate/clone/import functions on the same entity
**Added:** 2026-02-26 | **Source:** Subscription limit bypass via duplicate/independent lot creation

#### Learning #093: Client-side storage.createSignedUrl() is unreliable — use server-side API routes
**Problem:** `createBrowserSupabaseClient().storage.createSignedUrl()` uses the browser's JWT which can be stale (expired, not yet refreshed). The signed URL is generated locally but the actual RLS check happens at Supabase's CDN when the URL is accessed. Result: `fetch()` returns ok but the signed URL silently 403s, or the browser JWT is too old and the signing fails entirely — no error thrown, just a blank URL.
**Solution:** Use server-side API routes (e.g., `/api/view-intervention-document`, `/api/download-intervention-document`) that call `getApiAuthContext()` with fresh cookies from the request. The server generates the signed URL with a valid service-side token. Client code just does `fetch('/api/...')` and gets a reliable signed URL back.
**Example:** `components/interventions/shared/hooks/use-document-actions.tsx:48` — fetch API route instead of client-side storage call
**When to Use:** Any document preview/download from client components. Never use `createBrowserSupabaseClient().storage` for signed URLs in onClick handlers.
**Added:** 2026-02-26 | **Source:** Document preview/download buttons "nothing happens" across all roles

#### Learning #094: HTML download attribute is ignored for cross-origin URLs
**Problem:** Setting `<a href="https://supabase-storage.../file" download="filename.pdf">` does NOT trigger a download — the browser opens the file instead. The HTML `download` attribute is ignored when the URL is cross-origin (different domain than the page), which is always the case for Supabase storage URLs.
**Solution:** Use the `download` option in Supabase's `createSignedUrl()`: `createSignedUrl(path, 3600, { download: fileName })`. This sets the `Content-Disposition: attachment; filename="..."` header SERVER-SIDE on the storage CDN response, which browsers always respect regardless of origin.
**Example:** `app/api/download-intervention-document/route.ts:52` — `{ download: document.original_filename || true }`
**When to Use:** Any file download from Supabase storage (or any cross-origin CDN). The `download` attribute on `<a>` tags only works for same-origin URLs.
**Added:** 2026-02-26 | **Source:** Download buttons opening documents instead of downloading them

### Database & Queries

#### Learning #004: PostgREST nested relations fail silently with RLS
**Problem:** PostgREST `select('*, table2(*)')` returns `null` for nested relations when RLS blocks access — no error.
**Solution:** Use separate queries with `Promise.all` instead of nested selects when RLS is involved.
**Example:** `lib/services/repositories/intervention.repository.ts` — separate queries pattern
**When to Use:** Any query joining tables with different RLS policies
**Added:** 2026-02-04 | **Source:** Intervention detail page debugging

#### Learning #082: Lightweight DTOs that strip algorithm-critical fields cause silent degradation
**Problem:** `LinkedEmail` type (used by entity-filtered email view) omitted `message_id`, `in_reply_to_header`, `references`, and `to_addresses`. The `adaptLinkedEmailToEmail()` mapped them to `null`. Downstream, `generateConversationId()` received all nulls and fell back to unique IDs per email — destroying conversation grouping. No errors thrown, just every email rendered as standalone instead of threaded.
**Solution:** When creating a lightweight DTO for a different query path (e.g., entity-linked emails vs inbox emails), audit ALL downstream consumers. If an algorithm depends on specific fields (threading headers for `generateConversationId()`), include them in the DTO. Pattern: trace the DTO through `adaptLinkedEmailToEmail()` → `adaptEmail()` → `generateConversationId()` → `groupEmailsByConversation()` to verify no field gaps.
**Example:** `lib/types/email-links.ts:LinkedEmail` — added `message_id`, `in_reply_to_header`, `references`, `to_addresses`; `lib/services/repositories/email-link.repository.ts:getEmailsByEntity()` — added to SELECT
**When to Use:** Any time you create a lightweight/partial type for a new API path that feeds into shared algorithms (grouping, sorting, filtering, display logic)
**Added:** 2026-02-24 | **Source:** Entity-filtered email view missing conversation grouping

#### Learning #052: Query optimization must replace removed data, not just remove JOINs
**Problem:** `findByTeam()` was "optimized" (2026-01-30) by removing nested `address_record` JOINs, but no batch replacement was added. The column renderer in `patrimoine.config.tsx` expected `lot.address_record` and `lot.building.address_record` — both became undefined. Independent lots showed "-" for address, lot detail headers showed no address for manually-entered addresses.
**Solution:** When removing nested JOINs for performance, always add a batch post-fetch: (1) collect all foreign key IDs from the result set, (2) single `.in()` query to fetch related records, (3) map results back. Also: separate "has displayable data" (text) from "has feature data" (coordinates for maps) — don't require lat/lng just to show an address string.
**Example:** `lib/services/repositories/lot.repository.ts:228-243` — batch address fetch in findByTeam(); `app/gestionnaire/(no-navbar)/biens/lots/[id]/page.tsx:368` — relaxed condition accepts formatted_address without coordinates
**When to Use:** Any time you optimize a repository query by removing nested JOINs — verify the UI still has all the data it needs, and add batch fetch if needed
**Added:** 2026-02-20 | **Source:** Independent lots address display fix (3 files, 3 layers)

### UI & Components

#### Learning #083: Batch entity-linking with Promise.allSettled + 409 tolerance
**Problem:** Linking an email to an entity only linked that single email. Other emails in the same conversation thread were not linked, so the entity view showed 1 email instead of the full thread.
**Solution:** When linking, iterate over ALL email IDs in the conversation thread (passed via `conversationEmailIds` prop). Use `Promise.allSettled` for parallel execution and filter out 409 (duplicate) responses — the API already returns 409 for existing links. Unlink remains granular (current email only).
**Example:** `app/gestionnaire/(with-navbar)/mail/components/link-to-entity-dialog.tsx:handleSave()` — batch link loop with 409 filtering
**When to Use:** Any "link to entity" action on an email that belongs to a conversation thread
**Added:** 2026-02-24 | **Source:** Email thread entity-linking — link all thread emails at once

#### Learning #095: Hook-as-ReactNode pattern for cross-role modal deduplication
**Problem:** 3 role views (gestionnaire, locataire, prestataire) had ~50 lines each of identical document preview/download handlers + modal state management. Locataire/prestataire used `window.open()` while gestionnaire used `DocumentPreviewModal` — inconsistent UX. Extracting a "shared handler" still requires each consumer to wire modal state, `isOpen`, `onClose`, `document` props.
**Solution:** Return a pre-wired ReactNode from a custom hook via `useMemo`. The hook manages ALL internal state (previewDocument, isPreviewModalOpen) and returns `{ handleViewDocument, handleDownloadDocument, previewModal }`. Consumers just destructure and render `{previewModal}` in their JSX — zero prop threading, zero state management. Trade-off: less per-role customization, but for unification that's the goal.
**Example:** `components/interventions/shared/hooks/use-document-actions.tsx:113-120` — `previewModal = useMemo(() => <DocumentPreviewModal ... />)`
**When to Use:** When 2+ role views need identical modal behavior with no per-role customization. Not suitable when each consumer needs different modal props or behavior.
**Added:** 2026-02-26 | **Source:** Unify Document Preview & Download across all roles

#### Learning #078: sessionStorage for "dismiss until next session" patterns
**Problem:** Onboarding checklist dismiss stored in `localStorage` was permanent — users never saw it again even if steps were incomplete.
**Solution:** Use `sessionStorage` instead of `localStorage` for dismiss flags that should reset on next login/new tab. `sessionStorage` survives page refresh but clears on tab close.
**Example:** `components/billing/onboarding-checklist.tsx:114,142` — DISMISS_KEY stored in sessionStorage
**When to Use:** Any "hide for now" / "remind me later" UI that should reappear on next session
**Added:** 2026-02-22 | **Source:** Onboarding checklist UX polish

#### Learning #079: Contact creation prefill via ?type= query param
**Problem:** Onboarding step "Ajouter un prestataire" linked to `/contacts/nouveau` without specifying the role — user had to manually select "Prestataire" in the dropdown.
**Solution:** Always pass `?type=prestataire` (or `locataire`, `proprietaire`, etc.) when linking to contact creation. The page already reads `searchParams.type` and `mapContactType()` handles both English and French values.
**Example:** `components/billing/onboarding-checklist.tsx:74` — `href: '/gestionnaire/contacts/nouveau?type=prestataire'`
**When to Use:** ANY link/redirect to `/gestionnaire/contacts/nouveau` — always include `?type=` to pre-select the role
**Added:** 2026-02-22 | **Source:** Onboarding checklist UX — prestataire step

#### Learning #080: Sidebar footer — direct actions over nested dropdowns
**Problem:** Logout button was hidden inside a `DropdownMenu` attached to the profile — users had to click profile to reveal it, adding friction for a critical action.
**Solution:** Replace `DropdownMenu` with a direct layout: `<Link>` for profile (avatar+name) + visible `<button>` for logout icon. Collapsed sidebar uses `flex-col` stacking.
**Example:** `components/gestionnaire-sidebar.tsx:260-305` — direct Link + LogOut button in SidebarFooter
**When to Use:** When a sidebar footer has 2 distinct actions (profile + logout) — don't hide the secondary action in a dropdown
**Added:** 2026-02-22 | **Source:** Sidebar UX polish — direct logout button

#### Learning #005: ContactSelector hideUI pattern
**Problem:** Need to reuse contact selection logic in custom modals without the default UI.
**Solution:** Use `hideUI` prop on ContactSelector to get behavior without rendering.
**Example:** `components/contacts/contact-selector.tsx`
**When to Use:** When embedding selection logic in custom modal layouts
**Added:** 2026-02-04 | **Source:** Provider assignment modal refactor

#### Learning #104: router.push() makes router.refresh() redundant — and post-creation should redirect to detail
**Problem:** After entity creation, `router.push('/list')` followed by `router.refresh()` is unnecessary. Also, redirecting to the list page forces the user to hunt for the entity they just created.
**Solution:** (1) `router.push()` to a new route already fetches fresh Server Component data — `refresh()` is only needed when re-fetching the *current* route after a mutation. (2) Always redirect to the detail page after creation: `router.push(\`/entity/${id}\`)`. The entity ID is always available in scope from the creation response.
**Example:** `building-creation-form.tsx:978`, `lot-creation-form.tsx:1502+1639`, `contact-creation-client.tsx:432`
**When to Use:** Any form that creates an entity and needs to redirect after success
**Added:** 2026-03-02 | **Source:** Post-creation redirect UX improvement

#### Learning #157: Context/Provider for global modals accessible from any page
**Problem:** Compose email modal was local to the mail page — couldn't be triggered from the sidebar on other pages without a redirect.
**Solution:** Create a `Provider` at the layout level that holds modal state + renders a single modal instance. Expose `openCompose()` via hook. Sidebar and page buttons both call the same hook. The provider receives SSR data (email connections) as props from the Server Component layout.
**Example:** `contexts/compose-email-context.tsx` — `ComposeEmailProvider` wrapping `app/gestionnaire/(with-navbar)/layout.tsx`
**When to Use:** Any modal that needs to be triggered from multiple pages (sidebar, topbar, different routes) without navigation
**Added:** 2026-03-17 | **Source:** Email UX improvements — global compose modal

#### Learning #158: Early return for state-dependent page takeover eliminates dead code
**Problem:** When a page has two completely different views based on a condition (e.g., "no connections" vs "full mail client"), wrapping in a ternary creates a massive block. Worse, props like `disabled={!hasConnections}` become dead code — if the main view only renders when connections exist, the disabled state is unreachable.
**Solution:** Use early return: `if (!condition) return <AlternateView />`. The main render only executes when the condition is met. Audit downstream props/attributes for dead logic after adding early returns.
**Example:** `mail-client.tsx:871-886` — early return for no-connection state, removed dead `disabled` prop from Rédiger button
**When to Use:** When a component has two mutually exclusive render paths based on a boolean condition
**Added:** 2026-03-17 | **Source:** Email UX improvements — mail page full takeover

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

#### Learning #096: Building-level tenant data must be resolved BEFORE thread creation — client only sends lot-level IDs
**Problem:** The intervention creation form sends `selectedTenantIds` only for lot-level interventions (explicit contract selection). For building-level, `selectedTenantIds=[]` because tenants are resolved server-side via `contractService.getActiveTenantsByBuilding()`. But the thread creation code ran BEFORE the building tenant resolution, using `selectedTenantIds` — so building interventions never got tenant conversation threads (`tenant_to_managers`, `tenants_group`). Assignments were created correctly (later in the flow), but threads were already created with an empty tenant list.
**Solution:** Pre-resolve building tenants BEFORE thread creation. Add an early resolution step: if `buildingId && !lotId && includeTenants !== false && resolvedTenantIds.length === 0`, fetch via `contractService.getActiveTenantsByBuilding()` with `excludedLotIds` filtering. Store in `resolvedTenantIds` and reuse for both thread creation AND assignment (eliminates duplicate DB query). Pattern: when a dependent step assumes client-sent IDs, verify that ALL code paths populate those IDs — server-resolved data may need to be injected earlier.
**Example:** `app/api/create-manager-intervention/route.ts:408-437` — early building tenant resolution
**When to Use:** Any API route where thread/notification creation depends on participant IDs that may come from the client (lot) OR be resolved server-side (building). Always check both housing types.
**Added:** 2026-03-01 | **Source:** Building-level intervention missing tenant conversations

#### Learning #097: Multi-contract tenants cause duplicate lot IDs — always deduplicate "get unique entities" methods built on junction tables
**Problem:** `getSimpleTenantLots()` mapped `contract_contacts` → `contracts` → `lots` and returned the raw lot array. A tenant with 2 active contracts for the same lot (renewal, colocataire role) produced the same `lot.id` twice. React threw `Encountered two children with the same key` when rendering the lot selection cards.
**Solution:** Deduplicate at the data service layer using `Set<string>` + `.filter()` on the entity ID. Don't fix at the UI layer (index-based keys mask the real problem: showing the same logement twice). The private `getTenantLots()` (per-contract data) stays un-deduped; only the public `getSimpleTenantLots()` (unique lots) deduplicates.
**Example:** `lib/services/domain/tenant.service.ts:156-166` — Set-based dedup in getSimpleTenantLots
**When to Use:** Any "get unique X" method that traverses junction tables (contract_contacts, lot_contacts, building_contacts). If entity A links to B through C, multiple C rows can point to the same B.
**Added:** 2026-03-01 | **Source:** Locataire nouvelle-demande duplicate key error

#### Learning #098: 1-to-N meta-card pattern — single UI card expanding to N database entities at submit
**Problem:** Rent reminders need to create one intervention per month of the lease (could be 12-60 rows). Encoding all N as editable `scheduledInterventions[]` items would be UX chaos — too many cards, each needing day/month editing.
**Solution:** Use a separate config state (`RentReminderConfig: { enabled, dayOfMonth, assignedUsers }`) for the single meta-card. At submit time, generate N `Date` objects from lease start to end (skip past dates), and call `createInterventionAction()` in a `Promise.allSettled` loop. The UI shows 1 card with a summary ("12 rappels seront créés"), the DB gets N interventions.
**Example:** `components/contract/contract-form-container.tsx` — rent reminder submit block; `components/contract/lease-interventions-step.tsx` — RentReminderConfig UI
**When to Use:** Any feature where a single user choice should produce multiple database entities (recurring events, batch creation, template expansion).
**Added:** 2026-03-01 | **Source:** Lease rent reminder feature (Ralph US-002/US-003)

#### Learning #099: Key prefix convention for preserving dynamic entries during useEffect template regeneration
**Problem:** Property/lease intervention steps use a `useEffect` to regenerate template-based interventions when the selected type/building changes. This wiped user-created custom interventions on every re-render because the effect replaced the entire `scheduledInterventions` array.
**Solution:** Prefix dynamic entries with `custom_` (or any stable prefix). In the `useEffect`, filter previous state to preserve custom entries: `prev.filter(i => i.key.startsWith('custom_'))`, then prepend to the new template array. The prefix acts as a lightweight type discriminator without needing a separate state or array.
**Example:** `components/property-interventions-step.tsx` — useEffect preserves `custom_*` keys; `lib/constants/property-interventions.ts:createEmptyCustomIntervention()` — factory with `custom_` prefix
**When to Use:** Any list managed by both template-generation (useEffect) and user input, where user entries must survive template refreshes.
**Added:** 2026-03-01 | **Source:** Custom interventions in creation wizards

#### Learning #100: Sentinel key routing for shared component instances serving multiple assignment targets
**Problem:** The `ContactSelector` component (with its popover, search, role filtering) existed as a single ref instance on the page. Rent reminders needed their own contact assignment, but duplicating the entire ContactSelector was wasteful. The existing `activeAssignment.interventionKey` routing assumed all assignments mapped to `scheduledInterventions[]` entries.
**Solution:** Use a sentinel key (`RENT_REMINDER_KEY = 'rent_reminders'`) that doesn't match any real intervention key. In `handleContactSelected`/`handleContactRemoved`, branch on `activeAssignment.interventionKey === RENT_REMINDER_KEY` to read/write from `rentReminderConfig.assignedUsers` instead of `scheduledInterventions`. Same pattern works for any "extra assignment target" added to a page with an existing shared selector.
**Example:** `components/contract/lease-interventions-step.tsx` — RENT_REMINDER_KEY sentinel, branched handlers
**When to Use:** When a shared component (selector, modal, popover) needs to serve N different data targets on the same page. Route via sentinel keys rather than duplicating the component.
**Added:** 2026-03-01 | **Source:** Contact assignment on rent reminders

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

#### Learning #078: SSR/API data-fetch divergence — always mirror junction-table logic in SSR
**Problem:** Mail sidebar's `getLinkedEntities()` in `page.tsx` (SSR) queried ALL buildings, lots, contacts, etc. from entity tables with `limit(50)` and hardcoded `emailCount: 0`. The correct logic (filtering via `email_links` junction table + real counts) already existed in `/api/email-linked-entities/route.ts` but was never backported to SSR. Result: sidebar showed up to 300 unrelated entities.
**Solution:** When an API endpoint uses a junction/link table for filtering, the SSR initial-load function MUST use the same query strategy. Pattern: (1) call RPC `get_distinct_linked_entities` for IDs + counts, (2) group by entity_type, (3) fetch only linked entity details in parallel. Keep a JS fallback for when RPC isn't deployed yet.
**Example:** `app/gestionnaire/(with-navbar)/mail/page.tsx:124-290` — mirrors `app/api/email-linked-entities/route.ts`
**When to Use:** Any SSR page that has a corresponding API endpoint — verify both paths use the same filtering logic
**Added:** 2026-02-23 | **Source:** Mail sidebar showing all DB entities instead of only email-linked ones

#### Learning #105: Server Component page parallelization — Phase 0 → Wave 1 → Wave 2
**Problem:** Server Component pages with 8-12 sequential `await` calls (service inits + queries) add up to 500ms+ total wait time. Each `await` blocks the next, even when queries are independent.
**Solution:** Structure every Server Component page in 3 phases: **Phase 0** — `Promise.all` for service instantiations (5-10ms each but sequential = 50ms). **Wave 1** — `Promise.all` for all independent queries (buildings, lots, teamMembers, etc.). **Wave 2** — sequential queries that depend on Wave 1 results (e.g., signedUrls need documents). For async IIFE inside Promise.all when a query needs intermediate transforms: `(async () => { const raw = await fetch(); return transform(raw); })()`.
**Example:** `interventions/modifier/[id]/page.tsx` (12→3 sequential phases), `nouvelle-intervention/page.tsx`, `contrats/nouveau/page.tsx`
**When to Use:** Any Server Component page.tsx with 3+ sequential `await` calls — audit and parallelize
**Added:** 2026-03-02 | **Source:** Performance optimization US-003/004/006 — 11 pages parallelized

#### Learning #106: RLS makes manual team_members auth checks redundant in server actions
**Problem:** Server actions had manual `team_members` queries (e.g., `verifyTeamAccess()`, `supabase.from('team_members').select().eq('user_id', user.id)`) BEFORE the actual data operation. With an authenticated Supabase client (session cookie), RLS policies like `is_team_manager(team_id)` and `user_belongs_to_team_v2()` already enforce the exact same access control. Result: ~16 redundant DB queries per action flow, ~50ms each.
**Solution:** Delete manual team_members auth checks in server actions. The authenticated client's RLS is the real access control. If the action uses `getServerActionAuthContextOrNull()`, the user is authenticated — RLS handles authorization. Exception: when you need the team_members data for business logic (not just access control).
**Example:** `contract-actions.ts` (deleted `verifyTeamAccess()` + 16 callsites), `building-actions.ts`, `lot-actions.ts`, `intervention-actions.ts`
**When to Use:** Any server action that queries `team_members` purely for access control before a Supabase data operation
**Added:** 2026-03-02 | **Source:** Performance optimization US-002 — ~80 lines removed, ~16 DB queries eliminated

#### Learning #107: next/server after() for deferred non-critical work
**Problem:** Server actions and API routes waited for emails, notifications, and activity_logs INSERTs before returning a response. The user sees a spinner until ALL side effects complete — even though emails take 200-500ms and don't affect the response payload.
**Solution:** Use `after()` from `next/server` to defer non-critical work to post-response execution. The response returns immediately after DB mutations, and side effects run afterward. Pattern: capture all needed variables as `const` BEFORE the `after()` closure (closure captures references). Keep synchronous work that affects the response (e.g., `generateLink()` for hashed tokens) OUTSIDE `after()`.
**Example:** `app/api/invite-user/route.ts` — emails + activity_logs deferred. `contract-form-container.tsx` — notifications fire-and-forget with `.catch(() => {})`.
**When to Use:** Any API route or server action where emails, push notifications, activity logs, or analytics can run after the response
**Added:** 2026-03-02 | **Source:** Performance optimization US-009 — invitation email response time

#### Learning #108: force-dynamic pages — revalidation is dead code, but unstable_cache still works
**Problem:** Two distinct misunderstandings: (1) `revalidatePath`/`revalidateTag` calls in server actions that only affect force-dynamic pages — these are dead code because there's no route cache to invalidate. Each call costs ~1-2ms of synchronous no-op. (2) Thinking `unstable_cache` won't work on force-dynamic pages — it DOES because `unstable_cache` is a DATA cache (stored in the data cache store), separate from the route cache (full-page cache). Tags on `unstable_cache` entries can be invalidated with `revalidateTag()`.
**Solution:** (1) Audit and remove all `revalidatePath`/`revalidateTag` calls in server actions when pages are force-dynamic and no `unstable_cache` entries use those tags. Keep only `revalidatePath('/', 'layout')` for full auth state changes (login/signup). (2) USE `unstable_cache` for expensive, rarely-changing queries (e.g., Stripe subscription info, reference data) even on force-dynamic pages — it saves DB round-trips between `revalidate` intervals.
**Example:** `app/gestionnaire/layout.tsx` — `getCachedSubscriptionInfo` with `revalidate: 900` + webhook invalidation. 7 action files cleaned of ~85 dead revalidation calls.
**When to Use:** Before adding `revalidatePath` — check if target page is force-dynamic (if so, it's a no-op). Before dismissing `unstable_cache` — it works regardless of route caching strategy.
**Added:** 2026-03-02 | **Source:** Performance optimization US-010+011 — dead code removal + subscription caching

#### Learning #109: SECURITY DEFINER RPC for batch operations crossing multiple RLS-protected tables
**Problem:** Computing unread counts per conversation thread required 3 queries per thread: (1) get participant row, (2) get last_read timestamp, (3) count messages after last_read. With 5 threads, that's 15 sequential queries, each going through RLS evaluation. N×M query pattern that scales terribly.
**Solution:** Create a SQL RPC function with `SECURITY DEFINER` that accepts an array of thread IDs and a user ID. Uses `unnest()` + `LEFT JOIN` for batch processing across `conversation_participants` and `conversation_messages`. Returns `(thread_id, unread_count)` rows. `GRANT EXECUTE ON FUNCTION ... TO authenticated` ensures only logged-in users can call it. Call with `supabase.rpc('get_thread_unread_counts', { p_thread_ids: ids, p_user_id: userId })`.
**Example:** `supabase/migrations/20260302110000_create_get_thread_unread_counts_rpc.sql`, all 3 role intervention detail pages
**When to Use:** Any N×M query pattern where N entities need M lookups across RLS-protected tables — batch into a single RPC
**Added:** 2026-03-02 | **Source:** Performance optimization US-012 — 15 queries → 1 RPC call

#### Learning #110: Supabase bulk patterns — array .insert() + { head: true } for counts
**Problem:** Two common sub-optimal patterns: (1) Looping N individual server action calls (each with auth + service init + insert) instead of batching. E.g., 12 rent reminder interventions = 72+ queries. (2) Fetching full rows just to count them — `select('*')` then `.length` transfers all row data over the wire.
**Solution:** (1) **Bulk insert**: `supabase.from('table').insert([row1, row2, ...])` accepts arrays. Create a batch server action that does 1 auth check + 1 bulk insert instead of N × (auth + insert). For updates with different values per row, `Promise.all` individual updates (no bulk update API). (2) **Count-only queries**: `supabase.from('table').select('*', { count: 'exact', head: true }).eq(...)` returns only the count in HTTP headers — zero row data transferred. Use for dashboards, stats, quota checks.
**Example:** `intervention-actions.ts:createBatchRentRemindersAction` (72→18 queries), `stats.repository.ts` (7 count queries with head:true)
**When to Use:** Any loop of individual insert actions (batch them) or any query where you only need the count (use head:true)
**Added:** 2026-03-02 | **Source:** Performance optimization US-007/008/013 — batch operations + stats optimization

#### Learning #111: useRef for stable callback deps — prevent useEffect re-registration and channel thrashing
**Problem:** Two common React hook anti-patterns: (1) `useEffect` deps include a function/value that changes every render, causing listener re-registration (e.g., `fetchUnreadCount` in event listener deps → un/resubscribe every render). (2) Realtime channel subscription `useEffect` includes `optimisticMessages` in deps → every new optimistic message causes channel unsubscribe/resubscribe (channel thrashing). Both waste resources and cause flicker.
**Solution:** Store the volatile value in a `useRef` and update `.current` on every render. In the effect callback, read from `ref.current`. Then use `[]` or minimal stable deps for the effect. Pattern: `const fnRef = useRef(fn); fnRef.current = fn;` then `useEffect(() => { fnRef.current() }, [])`. CRITICAL: declare `useRef(value)` AFTER the hook that produces `value` to avoid TDZ (Temporal Dead Zone) crash.
**Example:** `hooks/use-global-notifications.ts` (fetchUnreadCountRef), `hooks/use-realtime-chat-v2.ts` (optimisticMessagesRef declared AFTER useOptimistic)
**When to Use:** Any useEffect that registers listeners/subscriptions and has volatile deps that change frequently
**Added:** 2026-03-02 | **Source:** Performance optimization US-020/021 — event listener + Realtime channel stability

#### Learning #112: SSR pre-fetch hybrid — Server Component fetches, Client Component renders with initial data
**Problem:** Fully `'use client'` pages show loading spinners on first paint because data is fetched in `useEffect` after mount. Users see blank/skeleton UI for 200-500ms while client-side fetch happens.
**Solution:** Split into: (1) Server Component `page.tsx` that fetches initial data using `getServerAuthContext` + direct Supabase queries, (2) Client Component receives `initialConnections`/`initialBlacklist` as props, initializes `useState(initialData)` with SSR data. Client still has `fetchX()` for mutations. Remove `isLoading` states for initial render (data already present). For tables requiring service_role (e.g., JOINs blocked by RLS), use `createServiceRoleSupabaseClient()` in the Server Component — security is already validated by `getServerAuthContext`.
**Example:** `app/gestionnaire/(with-navbar)/parametres/emails/page.tsx` (Server) + `email-settings-client.tsx` (Client)
**When to Use:** Any fully client-side page that loads data in useEffect — especially settings pages, config pages, or any page where first-paint speed matters
**Added:** 2026-03-02 | **Source:** Performance optimization US-028 — email settings SSR pre-fetch

#### Learning #113: SQL COUNT FILTER for multi-category aggregation — single scan replaces N queries
**Problem:** Counting emails by category (inbox, processed, sent, archive) required 4 separate `head:true` count queries — already parallelized via `Promise.all` but still 4 DB round trips. Each query scans the same `emails` table with overlapping `WHERE team_id = X` conditions.
**Solution:** Create a SQL RPC function using PostgreSQL `COUNT(*) FILTER (WHERE ...)` syntax. Returns all counts as columns from a single table scan: `COUNT(*) FILTER (WHERE direction = 'received' AND status = 'unread') AS inbox, ...`. Mark as `STABLE` (pure read), `SECURITY DEFINER` (bypass RLS since auth is validated at the page level). Call with `.rpc('get_email_counts', { p_team_id: teamId }).single()`. Note: `COUNT(*)` returns `bigint` — cast with `Number()` on the client.
**Example:** `supabase/migrations/20260302120000_create_get_email_counts_rpc.sql`, `app/gestionnaire/(with-navbar)/mail/page.tsx`
**When to Use:** Any scenario with multiple count queries on the same table with different filter conditions — especially dashboards and sidebar count badges
**Added:** 2026-03-02 | **Source:** Performance optimization US-029 — 4 count queries → 1 RPC

#### Learning #114: React cache() for Server Component service deduplication
**Problem:** Server Components that create service instances (e.g., `await createServerActionBuildingService()`) do so independently. If the same factory is called in both the layout and a child component within the same request, two separate Supabase clients and service instances are created — doubling cookie reads and auth validation.
**Solution:** Wrap service factory calls with React's `cache()` at module level: `const getCachedService = cache(() => createServerActionService())`. React `cache()` memoizes by arguments within a single React render request — zero-arg functions are memoized once per request. Unlike `unstable_cache` (which persists across requests with TTL), `cache()` is request-scoped only and needs no invalidation.
**Example:** `app/gestionnaire/(with-navbar)/dashboard/components/async-dashboard-content.tsx` — 6 cached service factories
**When to Use:** Any Server Component that creates services also created by its parent layout or sibling components in the same render tree
**Added:** 2026-03-02 | **Source:** Performance optimization US-026 — dashboard service deduplication

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

#### Learning #149: Hook `?? false` defaults create loading race conditions on UI gates
**Problem:** `useSubscription()` returns `canAddProperty: status?.can_add_property ?? false`. While the hook loads (~200-500ms), `canAddProperty` is `false`, so `if (!canAddProperty) { openUpgradeModal() }` blocks valid users who click before loading finishes. Same applies to `isReadOnly ?? false` — read-only users get a brief window where buttons are enabled.
**Solution:** Always check `loading` state before acting on derived booleans from hooks. Pattern: `if (subscriptionLoading) { navigateDirectly(); return }` for fail-open gates, `if (!subscriptionLoading && isReadOnly)` for fail-closed gates. Server actions provide defense-in-depth regardless.
**Example:** `biens-page-client.tsx:163` — checks `subscriptionLoading` before `canAddProperty`; `interventions-page-client.tsx:210` — `disabled={!subscriptionLoading && isReadOnly}`
**When to Use:** ANY component using `useSubscription()` derived booleans to gate navigation or disable buttons
**Added:** 2026-03-16 | **Source:** Subscription modal false-positive — user with 14/50 lots blocked on "Nouvel immeuble"

#### Learning #150: `previewUpgrade().current_lots` was Stripe quantity, not actual DB count
**Problem:** `subscription.service.ts:previewUpgrade()` returned `current_lots: item?.quantity` (Stripe subscription quantity = subscribed lot limit, e.g., 50) instead of the actual lot count in DB (e.g., 14). The UpgradeModal displayed "Lots actuels: 50" which confused users into thinking they had 50 lots.
**Solution:** Fetch `actualLots` via `getLotCount()` and return it as `current_lots`. Add separate `subscribed_lots` field to `UpgradePreview` interface for the Stripe quantity. Display both in modal: "Lots utilises / inclus: 14 / 50".
**Example:** `subscription.service.ts:previewUpgrade()` — `current_lots: actualLots, subscribed_lots: currentQuantity`
**When to Use:** Any preview/summary UI showing subscription data — always distinguish actual usage from subscription capacity
**Added:** 2026-03-16 | **Source:** UpgradeModal showing misleading "Lots actuels: 50" for user with 14 lots

#### Learning #151: Server-side subscription gates should be fail-open with try-catch
**Problem:** `lots/nouveau/page.tsx` called `canAddProperty()` without try-catch. If Stripe API is slow/down, the entire page returns 500 — user can't create lots even though the server action `createLotAction` has its own defense-in-depth check.
**Solution:** Wrap server-side page subscription checks in try-catch with fail-open: `catch { /* let user proceed — server action has its own check */ }`. The server action's `canAddProperty()` call is the real gate — the page-level check is UX optimization only.
**Example:** `lots/nouveau/page.tsx:28-40` — try-catch around subscription gate with fail-open comment
**When to Use:** Any Server Component page with subscription gates that duplicate server action checks
**Added:** 2026-03-16 | **Source:** Audit of server-side race conditions — Stripe timeout risk

#### Learning #152: Zod schema as API contract layer, independent of DB enums
**Problem:** Adding `'garant'` as a UI contact type required the API to accept it, but `garant` doesn't exist in the DB `user_role` enum. Initial plan was to hack `customRoleDescription` as a signal field — unnecessary complexity.
**Solution:** Add `'garant'` to the Zod `role` enum (API contract) and map it to real DB values (`prestataire` + `provider_category: 'autre'`) in `mapContactTypeToRoleAndCategory`. The Zod schema defines what the API ACCEPTS, not what the DB STORES. The mapping function bridges the two.
**Example:** `lib/validation/schemas.ts:164` — Zod enum has 6 values, DB `user_role` has 5. `invite-user/route.ts:118` maps garant→prestataire.
**When to Use:** When adding a UI-level concept that doesn't need its own DB role/enum but needs API acceptance
**Added:** 2026-03-17 | **Source:** Rename autre→garant — Zod schema would have rejected 'garant' causing 400 errors

#### Learning #153: Contact type "autre" was never a real DB role — mapped to prestataire
**Problem:** The `'autre'` contact type appeared to be a standalone role but was actually mapped to `role: 'prestataire', provider_category: 'autre'` in the API. Misunderstanding this could lead to creating unnecessary DB migrations or enum changes.
**Solution:** Before adding/renaming contact types, trace the full data flow: form → Zod schema → `mapContactTypeToRoleAndCategory` → DB columns. The mapping function is the key transformation point. Check: (1) what Zod accepts, (2) what the mapper produces, (3) what the DB stores, (4) what contract_contacts.role uses.
**Example:** `invite-user/route.ts:109-122` — mapContactTypeToRoleAndCategory function. `contract_contacts.role` uses a SEPARATE enum (`contract_contact_role`) that already had `'garant'`.
**When to Use:** Any work involving contact roles, user types, or the invite-user API
**Added:** 2026-03-17 | **Source:** Rename autre→garant — 0 migrations needed because of mapping layer

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

#### Learning #101: INSERT ordering in multi-phase assignment creation — UPDATE must follow ALL INSERTs
**Problem:** In `create-manager-intervention/route.ts`, the confirmation flag UPDATE (`requires_confirmation = true`) ran AFTER manager/provider assignment INSERT but BEFORE tenant assignment INSERT. Tenants never got `requires_confirmation = true` (column default = false). The DB trigger `create_responses_for_new_timeslot` only creates responses for `requires_confirmation = TRUE` — so tenants were silently excluded from time slot responses. The edit flow didn't have this bug because all assignments already existed when the UPDATE ran.
**Solution:** Move cross-cutting UPDATEs to AFTER all entity INSERTs complete. In SEIDO: confirmation flag setting block must come after both manager/provider AND tenant assignment insertions. Order: INSERT managers → INSERT tenants → UPDATE confirmation → INSERT time slots.
**Example:** `app/api/create-manager-intervention/route.ts:812-869` — confirmation block moved after tenant assignments
**When to Use:** Any API route that INSERTs entities in multiple phases then does a bulk UPDATE across all of them. Always audit the order: UPDATE must come AFTER the last INSERT it targets.
**Added:** 2026-03-01 | **Source:** Tenant missing from time slot responses after creation

#### Learning #102: has_account !== false pattern for filtering non-invited contacts
**Problem:** `buildAllParticipantIds()` included ALL contacts (providers, tenants) in the confirmation list, even those without Seido accounts (`has_account === false`). These contacts can never respond to confirmations since they have no login. This created ghost "En attente" entries in the planning tab.
**Solution:** Filter with `has_account !== false` (not `=== true`) because the field is optional — `undefined`/`null` means "has account" (backwards compat). Apply client-side in `buildAllParticipantIds()` + server-side defense-in-depth checking `auth_user_id IS NOT NULL` in the users table.
**Example:** `nouvelle-intervention-client.tsx:269-310` (client filter), `route.ts:834-841` (server filter)
**When to Use:** Any feature that builds participant lists for confirmation, notifications, or time slot responses. Always check `has_account !== false` for contacts that need login access.
**Added:** 2026-03-01 | **Source:** Non-invited contacts appearing in confirmation & time slots

#### Learning #103: Slot-count-dependent business logic — derive isMultiSlot and share across files
**Problem:** "Créneaux" mode treated all slot counts the same (always mandatory confirmation). But with 1 slot there's nothing to vote on — it's effectively a fixed date. Business logic needed: 1 slot = optional confirmation (like Date fixe), 2+ slots = mandatory.
**Solution:** Compute `isMultiSlot = schedulingType === 'slots' && timeSlots.length >= 2` once, then use it in: (a) useEffect for auto-populating confirmation, (b) submission payload, (c) confirmation summary, (d) UI components. The UI dynamically switches between mandatory/optional as slots are added/removed. API route independently checks `timeSlots.length` for status determination (defense-in-depth).
**Example:** `nouvelle-intervention-client.tsx:921` (isMultiSlot), `route.ts:350-358` (server-side), `assignment-section-v2.tsx:1124+1151` (UI)
**When to Use:** Any feature where behavior depends on a count threshold. Derive the boolean once, share it, and make the UI reactive to changes.
**Added:** 2026-03-01 | **Source:** Single-slot créneaux should behave like Date fixe

#### Learning #077: CSS opacity inheritance — use overlay, not parent opacity, for dimming
**Problem:** Setting `opacity-60 grayscale` on a card parent also affects child elements (like "Unlock" button). CSS opacity is inherited and children CANNOT override it.
**Solution:** Use a semi-transparent overlay (`bg-white/60 backdrop-blur-[1px]`) positioned absolutely over the card content. Child buttons rendered inside the overlay are at full opacity.
**Example:** `components/patrimoine/lot-card-unified/lot-card-unified.tsx` — locked lot overlay with "Deverrouiller" button
**When to Use:** Any time you need to dim/grey-out a container while keeping interactive elements inside at full opacity
**Added:** 2026-02-22 | **Source:** Trial overage lot restriction — locked card rendering

#### Learning #115: InterventionDetailsCard `sections` prop vs sub-section visibility — use `hideEstimation` for granular control
**Problem:** The `sections` prop on `InterventionDetailsCard` controls top-level sections (participants, description, location, instructions, planning, creator). Excluding `'planning'` removes the ENTIRE "Planning et Estimations" block — both the planning status card AND the estimation card. But the locataire should see planning info without estimation.
**Solution:** Added `hideEstimation?: boolean` prop that propagates to `PlanningStatusSection`. When true: (a) title changes to "Planning" (not "Planning et Estimations"), (b) grid switches from `sm:grid-cols-2` to single column, (c) estimation column is conditionally rendered with `{!hideEstimation && ...}`. This preserves the planning status while hiding estimation details.
**Example:** `intervention-detail-client.tsx:780` (locataire view passes `hideEstimation`), `intervention-details-card.tsx:254` (grid adapts), `intervention-details-card.tsx:393` (estimation conditionally hidden)
**When to Use:** When a shared component has composite sections and you need role-based visibility of sub-sections, not just top-level sections. The `sections` array is too coarse; add targeted boolean props for finer control.
**Added:** 2026-03-03 | **Source:** Locataire intervention detail — hide estimation card

#### Learning #116: StatusTimeline horizontal variant — early return pattern for divergent render paths
**Problem:** Needed a compact horizontal stepper for locataire intervention detail (bottom of page) while keeping the existing detailed vertical timeline for other views.
**Solution:** Added `variant?: 'vertical' | 'horizontal'` prop with early return: `if (variant === 'horizontal') return (...)` before the vertical JSX. Horizontal uses `overflow-x-auto` + `min-w-max` for mobile scroll, `w-16 sm:w-20` columns, `mt-[18px]` connector (half of 36px circle height). Short labels map (`shortLabels`) provides compact names. No descriptions/dates/actors in horizontal — too compact.
**Example:** `status-timeline.tsx:251-313` (horizontal branch), `intervention-progress-card.tsx:20` (variant prop passthrough)
**When to Use:** When a component needs two structurally different layouts (not just styling differences). Early return keeps both paths clean vs tangled conditional JSX. The `mt-[18px]` = h/2 trick centers horizontal connectors with circles.
**Added:** 2026-03-03 | **Source:** Locataire intervention detail — horizontal progression stepper

#### Learning #117: Cards vs Tables — B2B SaaS navigators must use tables, cards reserved for selection UIs
**Problem:** All 4 gestionnaire list pages (interventions, biens, contacts, contrats) offered a cards/list toggle. B2B users scanning 50-300+ items need tables — cards waste vertical space and prevent comparison. But removing `'cards'` from ViewMode type broke `property-selector.tsx` and `intervention-contacts-navigator.tsx` which legitimately use cards.
**Solution:** (1) Remove card toggle from ALL data navigator list pages — always DataTable/ListView. (2) Keep `'cards'` in ViewMode type for selection/detail UIs. (3) Change all `defaultView`/`defaultMode` to `'list'` in hooks AND table config objects. (4) Navigator cleanup checklist: imports → hook state → render branches → toggle UI → BEM classes → config defaults → type definitions.
**Example:** `patrimoine-navigator.tsx` (removed BuildingCardExpandable + LotCardUnified), `contracts-navigator.tsx` (removed ContractCard + useViewMode entirely), `contacts-navigator.tsx` (removed DataCards), `use-view-mode.ts` (default changed to 'list')
**When to Use:** Any time a gestionnaire list page is created — default to DataTable, never add card toggle. Cards are valid ONLY for: property selection modals, inline contact displays, kanban boards.
**Added:** 2026-03-04 | **Source:** Remove Card Views from Gestionnaire feature (5 stories)

#### Learning #118: CSS @layer cascade in Tailwind v4 — unlayered styles beat @layer components
**Problem:** Dashboard mobile stats toggle used Tailwind responsive classes (`hidden lg:block`), then BEM classes inside `@layer components`. Both failed: during Next.js hydration, `@layer utilities` (Tailwind) and unlayered styles override `@layer components` rules. The correct mobile layout appeared during SSR then vanished on hydrate.
**Solution:** Place responsive visibility rules OUTSIDE any `@layer` block (unlayered = highest cascade priority) with `!important`. CSS layer priority: unlayered > `@layer utilities` > `@layer components` > `@layer base`.
**Example:** `app/globals.css:48-68` — `.dashboard__stats--mobile` / `.dashboard__stats--desktop` with `@media (min-width: 1024px)`
**When to Use:** Any time you need deterministic show/hide between mobile/desktop in a Tailwind v4 + Next.js project. NEVER use Tailwind responsive classes (`hidden lg:block`) for critical layout toggles.
**Added:** 2026-03-05 | **Source:** Dashboard mobile stat cards hydration bug

#### Learning #119: PostgreSQL NULLS NOT DISTINCT — partial unique index for nullable columns
**Problem:** `UNIQUE NULLS NOT DISTINCT (email, team_id)` treats NULL as equal to NULL, meaning only ONE row with `email = NULL` allowed per team. Creating a second contact without email fails with duplicate key violation.
**Solution:** Replace with a partial unique index: `CREATE UNIQUE INDEX ON users (email, team_id) WHERE email IS NOT NULL AND email != ''`. Combine with Zod preprocess (`z.preprocess(val => val?.trim() === '' ? null : val, schema)`) and API-layer normalization (`email?.trim() || null`) for defense-in-depth.
**Example:** `supabase/migrations/20260304100000_fix_users_email_team_unique_allow_null.sql`, `lib/validation/schemas.ts` (createContactSchema.email), `app/api/create-contact/route.ts:57`
**When to Use:** Any unique constraint on a nullable column where multiple NULL rows must be allowed. Also applies to `phone`, `company`, etc.
**Added:** 2026-03-05 | **Source:** Contact creation empty email duplicate key bug

#### Learning #120: Virtual DB concepts vs actual enum values in RPC functions
**Problem:** Migration `20260302120000` (get_email_counts RPC) used `status = 'processed'` in SQL. But `'processed'` is a virtual folder concept in the app layer (`email.repository.ts`), not a valid `email_status` enum value. The actual enum has: `unread`, `read`, `archived`, `deleted`. Migration failed on push with `invalid input value for enum email_status`.
**Solution:** Always verify DB enum values before using them in SQL functions. Use `\dT+ enum_name` or check migration that created the enum. Map virtual concepts to actual column filters: `processed → direction = 'received' AND status = 'read'`.
**Example:** `supabase/migrations/20260302120000_create_get_email_counts_rpc.sql:25`
**When to Use:** When writing RPC functions that use enum columns. Always cross-reference the enum definition, never trust app-layer naming.
**Added:** 2026-03-05 | **Source:** Migration sync — staging/production push failure

#### Learning #121: Expandable table rows — reuse card view expand state + stopPropagation on action column
**Problem:** Building list view needed collapsible rows showing lot sub-rows, but the expand/collapse state already existed (`expandedBuildings` + `toggleBuildingExpansion`) for the card view. Creating separate state would mean switching view modes resets expand state.
**Solution:** Reuse the same `expandedBuildings` state across both card and list views. Make the entire building row clickable (`onClick` on row div) but add `e.stopPropagation()` on the action column div to prevent button clicks from toggling expand. Use a vertical bar (`w-1 bg-slate-300`) + `pl-5` indent for visual hierarchy on sub-rows.
**Example:** `components/property-selector.tsx:769-942` — list view with expandable lot sub-rows
**When to Use:** Any table with a card/list toggle where both views have expand/collapse — share the state. Always stopPropagation on interactive cells in clickable rows.
**Added:** 2026-03-05 | **Source:** Contract creation wizard — expandable building list view

#### Learning #122: auth.uid() is NULL for service_role — don't guard SECURITY DEFINER RPCs with auth-dependent helpers
**Problem:** `get_email_counts` RPC had `EXISTS (SELECT 1 FROM team_members WHERE user_id IN (SELECT get_my_profile_ids()))` guard. When called via `createServiceRoleSupabaseClient()` in SSR, `auth.uid()` returns NULL → `get_my_profile_ids()` returns empty → EXISTS always false → COUNT(*) FILTER returns all zeros. No error thrown — silent data loss.
**Solution:** SECURITY DEFINER RPCs called via service_role don't need auth guards — the caller (page.tsx) validates auth upstream via `getServerAuthContext()`. Remove `get_my_profile_ids()` / `auth.uid()` guards from RPCs used in SSR. The `p_team_id` parameter + SECURITY DEFINER is sufficient authorization.
**Example:** `supabase/migrations/20260305100000_fix_get_email_counts_v2.sql` — removed EXISTS guard
**When to Use:** Any time you create a SECURITY DEFINER RPC that will be called from Server Components with service_role client
**Added:** 2026-03-06 | **Source:** Email Section Refonte Phase 1 — US-001

#### Learning #123: Handler-driven fetches over useEffect for user navigation
**Problem:** `useEffect([currentFolder])` triggers fetch on folder change — but fails when returning from an entity filter to the same folder (currentFolder didn't change → effect doesn't fire → old data remains). Skip conditions (`offset === 50`) also match on subsequent navigations, not just initial render.
**Solution:** Remove the folder-change useEffect. Make every navigation handler call `fetchEmails()` explicitly. Add `folderOverride` parameter to bypass stale closures from batched `setCurrentFolder()`. Pattern: `fetchEmails(false, 'all', folder)` where `folder` is the handler's argument, not the stale state.
**Example:** `mail-client.tsx:handleFolderChange` — calls `fetchEmails(false, 'all', folder)` directly
**When to Use:** Any "fetch on state change" pattern where every state change has a corresponding user action handler. Prefer imperative over reactive when closures carry stale values.
**Added:** 2026-03-06 | **Source:** Email Section Refonte Phase 1 — sidebar navigation bug

#### Learning #124: optimisticRemovals Set — prevent stale-while-revalidate from resurrecting deleted items
**Problem:** Stale-while-revalidate cache pattern shows cached data instantly, then background-refreshes. But if user archived/deleted an email between cache write and refresh, the removed email reappears in the refreshed list for a split second.
**Solution:** Track optimistically removed IDs in a `useRef<Set<string>>`. On archive/delete/softDelete: add ID to set. On background refresh: filter `data.emails.filter(e => !optimisticRemovals.current.has(e.id))`. On rollback: remove from set. On hard sync: clear set.
**Example:** `mail-client.tsx:optimisticRemovals` ref — used in handleArchive, handleDelete, handleSoftDelete, fetchEmails
**When to Use:** Any list with optimistic removal + background refresh. Prevents the "zombie item" flash.
**Added:** 2026-03-06 | **Source:** Email Section Refonte Phase 1 — US-008

#### Learning #125: SSR/API query parity — initial load must match client refresh exactly
**Problem:** SSR fetched ALL received emails for inbox, but the API endpoint filtered `status='unread'`. On first client-side refresh, 471 emails became a different set → emails "disappeared" and reappeared as the list replaced.
**Solution:** SSR initial data query MUST use identical filters as the API endpoint for the same view. For inbox: both must use `.eq('direction', 'received').eq('status', 'unread').is('deleted_at', null)`. Test by comparing SSR count vs API count on page load.
**Example:** `mail/page.tsx:getInitialEmails` — added `.eq('status', 'unread')` to match API
**When to Use:** Any page with SSR initial data + client-side refresh/polling. Mismatched queries cause "flash of different content" on first revalidation.
**Added:** 2026-03-06 | **Source:** Email Section Refonte Phase 1 — US-002

#### Learning #126: Dead code chain tracing — callback → prop → child handler → UI invocation
**Problem:** `handleLinkBuilding` in mail-client.tsx was passed as `onLinkBuilding` prop to EmailDetail. EmailDetail defined a local `handleLinkBuilding` wrapper. But no UI element in EmailDetail ever called the wrapper — the entire prop→handler→UI chain was dead. Simple grep for the function name misses this because the function IS referenced (as prop), just never invoked.
**Solution:** When removing "dead" handlers, trace the full chain: (1) callback defined, (2) passed as prop, (3) destructured in child, (4) wrapper defined, (5) wrapper called from UI element. If step 5 is missing, the entire chain is dead. Search for the child's wrapper function name in onClick/onChange/etc handlers, not just the prop name.
**Example:** `mail-client.tsx:handleLinkBuilding` → `email-detail.tsx:onLinkBuilding` → `handleLinkBuilding` wrapper → never called
**When to Use:** Any dead code cleanup involving parent→child prop chains
**Added:** 2026-03-06 | **Source:** Email Section Refonte Phase 1 — US-012

#### Learning #127: Webhook AI extraction must have fallback — never let enrichment abort the pipeline
**Problem:** ElevenLabs webhook called `extractInterventionSummary()` (Anthropic API) without try/catch. When API credits ran out (HTTP 400, not 402), the entire pipeline aborted — no intervention created, no call log, no notifications. ElevenLabs has ZERO retry, so the call data was lost forever.
**Solution:** Wrap AI extraction in try/catch with a fallback summary built from raw transcript data. The fallback provides: raw transcript as `problem_description`, caller name from phone lookup (or "Appelant inconnu"), urgency "normale", category "autre". The rest of the pipeline (intervention creation, assignments, threads, PDF, notifications, emails) proceeds normally.
**Example:** `app/api/webhooks/elevenlabs/route.ts:318-335` — try/catch with fallback InterventionSummary
**When to Use:** Any webhook or background job that uses external AI APIs for data enrichment. Always design enrichment as optional — the core operation must succeed without it.
**Added:** 2026-03-09 | **Source:** AI Phone Assistant — Anthropic credit balance error in production

#### Learning #128: CHECK constraints designed for web flows break webhook/AI flows — audit XOR constraints
**Problem:** `valid_intervention_location CHECK (building_id XOR lot_id)` required exactly one location. Web intervention creation always has property context. AI phone calls may not — caller gives unrecognizable address, or AI extraction fails → both `building_id` and `lot_id` are NULL → INSERT fails with "Value does not meet constraints" (PostgREST doesn't name the constraint in the error).
**Solution:** Relax XOR to "at most one": `CHECK (NOT (building_id IS NOT NULL AND lot_id IS NOT NULL))`. Both NULL = unassigned location (gestionnaire assigns later). When adding a new creation channel (API, webhook, import, AI), audit ALL CHECK constraints on the target table — they were written for the original channel's assumptions.
**Example:** `supabase/migrations/20260309120000_relax_intervention_location_constraint.sql`
**When to Use:** Adding any new entity creation pathway (webhook, import, AI, API) to a table that was originally web-only
**Added:** 2026-03-09 | **Source:** AI Phone Assistant — intervention INSERT failure after fallback

#### Learning #129: PostgREST constraint errors don't name the constraint — parse "Failing row contains"
**Problem:** When a CHECK constraint fails, PostgREST returns `"message": "Value does not meet constraints"` with no constraint name. The only clue is `"details": "Failing row contains (...)"` with all column values. You must mentally match the failing values against known CHECK constraints to identify which one failed.
**Solution:** When debugging "Value does not meet constraints", (1) read the "Failing row contains" details to identify which columns have unexpected values, (2) search migrations for `CHECK` constraints on that table, (3) match NULL/value patterns against each constraint's condition. For SEIDO: `valid_intervention_location` (building_id XOR lot_id), `valid_assignment_role` (role enum), `valid_quote_type`, `valid_time_range`.
**Example:** Failing row had `building_id=null, lot_id=null` → violated `valid_intervention_location` XOR constraint
**When to Use:** Any "Value does not meet constraints" error from Supabase/PostgREST
**Added:** 2026-03-09 | **Source:** AI Phone Assistant — debugging constraint violation after fallback

#### Learning #130: Agent-delegated content — verify cross-reference slugs match canonical frontmatter
**Problem:** When 3 SEO copywriter agents created 20 blog articles in parallel, all 14 Mars/Fevrier articles linked to the hub using the OLD omnibus slug (`/blog/immobilier-belgique-mars-2026`) instead of the new hub slug (`/blog/essentiel-immo-mars-2026`). Agents inferred slugs from the source filename pattern, not from the hub's actual frontmatter.
**Solution:** After agent-delegated content creation, always grep for cross-reference links and verify they match the canonical slugs in the target files' frontmatter. For batch fixes: `sed -i 's|old-slug|new-slug|g' blog/articles/2026-03-0*.md`. Better yet: include exact slugs in agent prompts AND run a post-creation validation step.
**Example:** `blog/articles/2026-03-01-*.md` through `2026-03-06-*.md` — 14 files fixed with sed
**When to Use:** Any time you delegate content creation to agents that must cross-link to other content. Verify slugs post-creation.
**Added:** 2026-03-11 | **Source:** Blog Hub/Cluster Redesign — US-009

#### Learning #131: Additive schema changes with defaults — zero migration for existing content
**Problem:** Adding `type` and `hub` fields to `ArticleMeta` could break all existing articles that don't have these frontmatter fields.
**Solution:** Use defaults in the parser: `type: data.type || 'article'` and `hub: data.hub || ''`. Existing articles automatically get `type: 'article'` (correct) and `hub: ''` (no parent). No frontmatter migration needed for existing content. Filter functions use positive checks (`type !== 'hub'`, `hub === hubSlug`) so empty defaults are naturally excluded.
**Example:** `lib/blog.ts:42-43` — default values in parseArticleFile
**When to Use:** Adding new metadata fields to a content system with existing files. Always default to the "normal" case.
**Added:** 2026-03-11 | **Source:** Blog Hub/Cluster Redesign — US-001

#### Learning #132: Async Server Component for data-dependent UI — no useEffect needed
**Problem:** The hub-article relationship banner needs to fetch sibling articles from the same hub. In a Client Component, this would require useEffect + useState + loading state.
**Solution:** Make it an async Server Component function in the same file. `async function HubBanner({ hubSlug, currentSlug })` directly calls `getArticlesByHub(hubSlug)` and `getArticleBySlug(hubSlug)` with `Promise.all`. No client-side state, no loading spinners, no hydration issues. The parent conditionally renders it with `{article.hub && article.type !== 'hub' && <HubBanner ... />}`.
**Example:** `app/blog/[slug]/page.tsx:188-225` — HubBanner async component
**When to Use:** Any UI that depends on fetched data but doesn't need interactivity. Async Server Components are simpler than Client Components with useEffect.
**Added:** 2026-03-11 | **Source:** Blog Hub/Cluster Redesign — US-002

#### Learning #133: PostgREST PGRST201 — disambiguate multiple FK paths with `!fk_name`
**Problem:** Adding `company_record:companies(id, name)` as a nested select inside a `users` relation fails with PGRST201 ("Could not embed because more than one relationship was found") when two FK paths exist between the same table pair (e.g., `users.company_id → companies.id` AND `companies.deleted_by → users.id`). PostgREST can't guess which FK to follow.
**Solution:** Use the FK constraint name as a hint: `company_record:companies!fk_users_company(id, name)`. Find the constraint name in migration SQL or via `\d+ tablename` in psql. This explicitly tells PostgREST which path to traverse.
**Example:** `lib/services/repositories/supplier-contract.repository.ts` — all 4 query methods
**When to Use:** Any nested PostgREST select between tables that have 2+ FK relationships (forward + reverse, or multiple forward FKs). Common with audit columns (`created_by`, `deleted_by`) pointing back to `users`.
**Added:** 2026-03-11 | **Source:** Supplier contracts — company nested relation fix

#### Learning #134: Card display — show person name + company badge, not company-as-name
**Problem:** Supplier contract cards showed `company_record.name` as the supplier name, losing the individual contact's identity. This was inconsistent with contact cards which show the person's name prominently with a company badge alongside.
**Solution:** Split the display function into two: `getSupplierDisplayName()` (always returns person's first_name + last_name) and `getSupplierCompanyName()` (returns company_record.name or legacy company field). Render person name as primary text, company as a purple `Badge` with `Building2` icon — matching the pattern in `contact-card-compact.tsx:153-161`.
**Example:** `components/contracts/supplier-contract-card.tsx` — `getSupplierDisplayName` + `getSupplierCompanyName`
**When to Use:** Any new entity card that displays a contact/supplier — always show person name as primary, company as badge.
**Added:** 2026-03-11 | **Source:** Supplier contract cards UI consistency fix

#### Learning #135: Deprecated enum cleanup — grep entire codebase, not just typed references
**Problem:** After removing `demande_de_devis` from the DB enum and TypeScript type, 30+ files still had executable references. TypeScript couldn't catch them because status values are often stored in `Record<string, ...>` configs, `string[]` filter arrays, and template literal comparisons — all typed as `string`, not the union type. A targeted review (3 parallel agents) found only 16 bugs; a full-codebase `grep 'demande_de_devis'` revealed 14 more, including a CRITICAL API route (`generate-intervention-magic-links`) that was **writing** the deprecated status to the database.
**Solution:** When deprecating any enum value: (1) `grep -r 'value_name' --include='*.ts' --include='*.tsx'` the ENTIRE codebase, (2) classify each hit as comment vs executable code, (3) fix ALL executable references in one batch, (4) verify with build. Never trust a scoped/targeted review alone.
**Example:** `app/api/generate-intervention-magic-links/route.ts` — was setting `status: 'demande_de_devis'` in DB write, fixed to `requires_quote: true`
**When to Use:** Any time a DB enum value, status, or role is deprecated/renamed
**Added:** 2026-03-13 | **Source:** Post-audit production bug fixes — 30 bugs across 45 files

#### Learning #136: sanitizeSearch() needed on ALL .ilike() with user input, not just search bars
**Problem:** `sanitizeSearch()` was only applied to explicit search bar queries (lot.repository, building.repository primary path) but missed `.ilike()` calls in filter params: `company.repository.findByName()`, `address.repository.findByTeam(city)`, `building.repository.findByCity()`. These accept user-controlled strings that could inject PostgREST filter syntax (`%`, `_`, `\`).
**Solution:** Audit EVERY `.ilike()` and `.or()` call in ALL repositories. If the argument comes from outside the repository (function parameter, not hardcoded), wrap it in `sanitizeSearch()`. Import from `@/lib/utils/sanitize-search`.
**Example:** `lib/services/repositories/company.repository.ts` — `.ilike('name', sanitizeSearch(name))`, `lib/services/repositories/address.repository.ts` — city filter
**When to Use:** Writing or reviewing any repository method that accepts a string parameter for filtering
**Added:** 2026-03-13 | **Source:** Post-audit security review — 5 repositories fixed

#### Learning #137: .single() on composite UNIQUE — must filter ALL constraint columns
**Problem:** `intervention_assignments` has UNIQUE on `(intervention_id, user_id, role)`. Using `.single()` with only `.eq('intervention_id', id).eq('user_id', userId)` fails if the same user is assigned with multiple roles. The prestataire detail page queried without `.eq('role')` and the `intervention-confirm-participation` endpoint didn't know the role at all.
**Solution:** When using `.single()`, verify ALL columns of the UNIQUE constraint are in the WHERE clause. If you can't filter all columns (e.g., role unknown at that endpoint), use `.limit(1).maybeSingle()` instead. If the role IS known (e.g., prestataire page), add `.eq('role', 'prestataire')` to make the query match the constraint.
**Example:** `app/prestataire/(no-navbar)/interventions/[id]/page.tsx` — added `.eq('role', 'prestataire')`, `app/api/intervention-confirm-participation/route.ts` — changed to `.limit(1).maybeSingle()`
**When to Use:** Any `.single()` call on a table with composite UNIQUE constraints
**Added:** 2026-03-13 | **Source:** Post-audit .single() safety review

#### Learning #138: Stripe trial checkout returns `no_payment_required` not `paid`
**Problem:** `verifyCheckoutSession` checked `payment_status === 'paid'` to confirm a successful checkout. Trial checkouts with `subscription_data.trial_end` return `payment_status: 'no_payment_required'` because no charge occurs. Checkout appeared to fail even though the subscription was created correctly.
**Solution:** Accept both `'paid'` and `'no_payment_required'` as valid payment statuses in `verifyCheckoutSession` and webhook `checkout.session.completed` handler. Trial = no payment = `no_payment_required`.
**Example:** `app/actions/subscription-actions.ts:verifyCheckoutSession()` — `['paid', 'no_payment_required'].includes(paymentStatus)`
**When to Use:** Any Stripe Checkout integration that supports trial periods via `subscription_data.trial_end`
**Added:** 2026-03-14 | **Source:** Stripe trial payment collection feature

#### Learning #139: Status constant sets must match canonical service — audit cross-file consistency
**Problem:** `BLOCKED_STATUSES` was defined in 3 files (`subscription-guard.ts`, `notification-actions.ts`, `conversation-notification-actions.ts`) with `['read_only', 'unpaid', 'incomplete_expired']`. But `subscription.service.ts` also treats `paused` as blocked (is_read_only=true). Paused teams' locataires/prestataires were not blocked, and notifications still fired.
**Solution:** (1) Define status constants in ONE shared file and import everywhere. (2) When creating a status set, always cross-reference the canonical service that defines the business rule (e.g., `subscription.service.ts:getSubscriptionInfo`). (3) Include ALL statuses the service treats as equivalent.
**Example:** `lib/subscription-guard.ts` — single source of truth for `BLOCKED_STATUSES`, imported by both notification action files
**When to Use:** Any time you create a Set/array of statuses that mirrors business logic from a service class
**Added:** 2026-03-14 | **Source:** Simplify review — semantic bug found by cross-referencing subscription.service.ts

#### Learning #140: `unstable_cache` wrappers should be shared utilities, not duplicated in layouts
**Problem:** `getCachedSubscriptionInfo` was copy-pasted identically in gestionnaire, locataire, and prestataire layouts (3 copies). Any change to cache key, TTL, or query logic required updating 3 files. The locataire/prestataire copies also dragged in 5 unnecessary imports each.
**Solution:** Extract `unstable_cache`-wrapped functions to shared utility files (e.g., `lib/subscription-cache.ts`). Import from layouts. This reduces each layout from ~15 import lines to 1.
**Example:** `lib/subscription-cache.ts` — shared `getCachedSubscriptionInfo`, imported by all 3 role layouts
**When to Use:** Any `unstable_cache` wrapper used by 2+ Server Components — extract to `lib/` immediately
**Added:** 2026-03-14 | **Source:** Simplify review — triple duplication across role layouts

#### Learning #141: `'use server'` file helpers can't be imported cross-file — extract to `lib/`
**Problem:** `isTeamNotificationsBlocked` was needed in both `notification-actions.ts` and `conversation-notification-actions.ts`. Since both are `'use server'` files, the helper was duplicated (copy-pasted) rather than shared. This led to 3 copies of the same function with identical logic.
**Solution:** Extract shared server-side helpers to `lib/` files (not `'use server'` action files). `lib/subscription-guard.ts` is importable by any file — server actions, Server Components, API routes. Reserve `'use server'` files for exported server actions only.
**Example:** `lib/subscription-guard.ts:isTeamSubscriptionBlocked()` — imported by `notification-actions.ts`, `conversation-notification-actions.ts`, and page Server Components
**When to Use:** Whenever you need a helper function in 2+ server action files — move it to `lib/` immediately
**Added:** 2026-03-14 | **Source:** Simplify review — triple duplication of subscription blocking helper

#### Learning #142: Debounce event dispatch per-batch, not per-entity — avoids N+1 callback storms
**Problem:** Data invalidation broadcast sends entity arrays like `['buildings', 'lots', 'stats']`. Initial implementation debounced per entity type (one timer per entity), meaning a handler subscribed to `['buildings', 'lots', 'contacts', 'interventions', 'stats']` would fire 3 separate refetches from a single broadcast — once per matched entity after its 500ms timer.
**Solution:** Collect all pending entities in a `Set` during the debounce window (single 500ms timer). When the timer fires, iterate handlers once and call each handler at most once if ANY of its entities are in the pending set.
**Example:** `contexts/realtime-context.tsx` — `pendingEntitiesRef` + single `debounceTimerRef` instead of `Map<DataEntity, Timeout>`
**When to Use:** Any pub/sub system with multi-topic subscriptions and debouncing — always debounce the dispatch batch, not individual topics
**Added:** 2026-03-15 | **Source:** Simplify /efficiency review — N+1 callback bug in data invalidation

#### Learning #143: Supabase Broadcast for cache invalidation — zero DB overhead alternative to postgres_changes
**Problem:** SEIDO uses `force-dynamic` on all list pages, making `revalidatePath`/`revalidateTag` no-ops (68 dead calls identified). Client hooks fetch once on mount and never refresh after mutations by other team members. `postgres_changes` would require DB triggers + RLS config for each table.
**Solution:** Use Supabase Broadcast (lightweight pub/sub over existing WebSocket) on a team-scoped channel (`seido-team:{teamId}`). Mutations broadcast entity type arrays, hooks subscribe and auto-refetch. Zero DB impact — messages flow through Supabase Realtime infrastructure only.
**Example:** `lib/data-invalidation.ts` (types) + `contexts/realtime-context.tsx` (channel + API) + `hooks/use-buildings.ts` (subscriber)
**When to Use:** When you need cross-client cache invalidation but your pages are force-dynamic (making Next.js cache primitives useless) and you want to avoid DB-level triggers
**Added:** 2026-03-15 | **Source:** Data invalidation broadcast feature

#### Learning #144: Separate Supabase channels for different scopes — per-user vs per-team
**Problem:** Existing `seido:{userId}:{teamId}` channel uses `postgres_changes` for user-specific notifications. Broadcasting invalidation events on this channel would only reach the current user, not other team members.
**Solution:** Create a SECOND channel `seido-team:{teamId}` scoped to the team (no userId). All team members subscribe to the same channel. Keep the per-user channel for user-specific postgres_changes (notifications, messages). Different concerns = different channels.
**Example:** `contexts/realtime-context.tsx` — `teamChannelRef` (broadcast) alongside existing per-user `channelRef` (postgres_changes)
**When to Use:** When you have both user-specific realtime events AND team-wide broadcast events — never mix them on a single channel
**Added:** 2026-03-15 | **Source:** Data invalidation broadcast architecture decision

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

### Admin / Platform Notifications

#### Learning #145: Fire-and-forget in Vercel serverless requires `.catch()` — not just "no await"
**Problem:** Calling `this.asyncMethod(...)` without `await` in a webhook handler creates a floating Promise. In Vercel serverless, the runtime can freeze/kill the process after the response is sent, silently dropping the Promise. Additionally, if the async function throws before entering its own try/catch (e.g., dynamic `import()` fails), it becomes an unhandled rejection.
**Solution:** Use `void this.asyncMethod(...).catch(() => {})`. The `void` tells the ESLint linter it's intentional. The `.catch(() => {})` prevents unhandled rejections. For critical notifications, use `await` instead (acceptable latency in webhooks).
**Example:** `lib/services/domain/stripe-webhook.handler.ts:216` — subscription admin notifications
**When to Use:** Any fire-and-forget async call in API routes, webhooks, or CRON handlers running on serverless
**Added:** 2026-03-16 | **Source:** Admin notification emails — simplify review caught floating promises

#### Learning #146: Use the Resend singleton from `lib/email/resend-client.ts` — don't create new instances
**Problem:** Three separate `new Resend(process.env.RESEND_API_KEY)` instances existed: `lib/email/resend-client.ts` (singleton), `lib/services/domain/email.service.ts` (class), and a new admin notification service. Multiple instances waste resources and bypass any centralized config (rate limiting, logging, from address).
**Solution:** Import `{ resend, EMAIL_CONFIG, isResendConfigured }` from `@/lib/email/resend-client`. Use `resend.emails.send()` directly for raw HTML emails. Use `EMAIL_CONFIG.from` for the sender address. Use `isResendConfigured()` for the guard check.
**Example:** `lib/services/domain/admin-notification/admin-notification.service.ts:14` — imports singleton
**When to Use:** Any new service that needs to send emails (whether React Email templates or raw HTML)
**Added:** 2026-03-16 | **Source:** Admin notification emails — simplify review found 3 Resend instances

#### Learning #147: Client Components can't send server-side emails — use API route bridge
**Problem:** `auth/callback/page.tsx` and `auth/set-password/page.tsx` are Client Components (`'use client'`). Admin notifications require server-side Supabase service-role client + Resend. Can't import server-only modules in client code.
**Solution:** Create a lightweight API route (`/api/internal/admin-signup-notification`) that handles the server-side work. Client calls it fire-and-forget: `fetch('/api/...', { method: 'POST' }).catch(() => {})`. Add a time guard (< 1 hour since `created_at`) to prevent duplicate notifications on page reload.
**Example:** `app/api/internal/admin-signup-notification/route.ts` + `app/auth/set-password/page.tsx:277`
**When to Use:** When a Client Component needs to trigger server-only side effects (emails, DB writes with service role, external API calls)
**Added:** 2026-03-16 | **Source:** Admin notification emails — email signup flow integration

#### Learning #148: OAuth `completeOAuthProfileAction` must set `first_name` AND `last_name` — not just `name`
**Problem:** The OAuth profile insert only set `name: "Jean Dupont"` but not `first_name`/`last_name`. Downstream code querying `users.first_name` got `null` for all OAuth users and fell back to `name.split(' ')[0]`. This works but is fragile (single-name users, multi-word last names).
**Solution:** Always set all three: `name`, `first_name`, `last_name` in the insert. The `validatedData` from the form already has separate `firstName` and `lastName` fields — they just weren't being used.
**Example:** `app/auth/complete-profile/actions.ts:127-128`
**When to Use:** Any user creation flow (signup, invitation, import) — always populate all name fields
**Added:** 2026-03-16 | **Source:** Admin notification emails — simplify review found OAuth users missing first_name/last_name

#### Learning #154: Lightweight signup — DB trigger must handle partial profiles (no name)
**Problem:** Original `handle_new_user_confirmed()` trigger raised EXCEPTION when `first_name` or `last_name` was empty. Lightweight signup sends only `role` + `password_set` in metadata (no name fields), so trigger crashed and user creation failed silently.
**Solution:** Add a 3-branch IF in the trigger: (1) invitation flow (has `team_id` metadata), (2) lightweight signup (empty name → create partial profile with `name=email_prefix`, `team_id=NULL`), (3) full signup (has name → create complete profile + team + subscription). Partial profiles complete later on `/auth/complete-profile`.
**Example:** `supabase/migrations/20260317100000_team_name_from_organization.sql` — 3-branch trigger
**When to Use:** Any change to signup metadata or the `handle_new_user_confirmed()` trigger
**Added:** 2026-03-17 | **Source:** Lightweight Signup feature

#### Learning #155: Three-layer incomplete profile guard — login + layout + server action
**Problem:** Users who sign up but don't complete their profile (no team) could bypass the completion page by navigating directly to dashboard URLs or calling server actions.
**Solution:** Enforce profile completion at 3 layers: (1) `loginAction` checks `team_id` and redirects to `/auth/complete-profile`, (2) `getServerAuthContext()` in layouts redirects when `teams.length === 0`, (3) `getServerActionAuthContext()` redirects in server actions. All 3 check the same condition: user exists but has no team.
**Example:** `app/actions/auth-actions.ts` (login), `lib/server-context.ts` (layout + action guards)
**When to Use:** Any new auth guard, login flow change, or new role-gated page/action
**Added:** 2026-03-17 | **Source:** Lightweight Signup — profile guard story

#### Learning #156: `URL.createObjectURL()` leaks on re-upload — revoke before creating new
**Problem:** Avatar preview used `URL.createObjectURL(file)` on each file selection. Re-selecting a file created a new blob URL without revoking the old one. The cleanup effect only ran on unmount, so intermediate URLs leaked memory.
**Solution:** Before creating a new blob URL, check if the current `avatarPreview` starts with `'blob:'` and call `URL.revokeObjectURL(avatarPreview)`. Keep the unmount cleanup as well for the final URL.
**Example:** `app/auth/complete-profile/complete-profile-form.tsx` — `handleAvatarChange`
**When to Use:** Any component with file preview that allows re-selection (avatar, document upload, image picker)
**Added:** 2026-03-17 | **Source:** Lightweight Signup — simplify review

#### Learning #157: Contact type key mismatch — `determineAssignmentType` vs ContactSelector tab keys
**Problem:** ContactSelector used `key: "other"` for the propriétaire tab, but `determineAssignmentType()` returns `"owner"` for `role='proprietaire'`. The filtering comparison `assignmentType === selectedContactType` silently returned zero results — propriétaire contacts were invisible in the selector modal.
**Solution:** Align all external-facing contact type keys with `determineAssignmentType()` output: `owner` for propriétaire, `guarantor` for garant. Keep internal state bucket keys (e.g. `buildingContacts.other`) as-is and map at the boundary (`const bucketKey = contactType === 'owner' ? 'other' : contactType`).
**Example:** `components/contact-selector.tsx` contactTypes[].key, `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx` handleContactAdd
**When to Use:** Any time you rename or remap contact roles/types — always verify the full chain: DB role → role switch → determineAssignmentType → tab key → selectedContacts keys → callback contactType → state bucket key
**Added:** 2026-03-18 | **Source:** Propriétaire role rename — "Autre" → "Propriétaire"

#### Learning #158: Missing role entries in label/badge lookup tables cause silent "Non défini" display
**Problem:** `getContactTypeLabel()` and `getContactTypeBadgeStyle()` in `contacts.config.tsx` only had entries for locataire/prestataire/gestionnaire. When DB stores `role='proprietaire'`, the lookup falls through to `'Non défini'` — no error, just wrong display.
**Solution:** Always add BOTH the French DB value (`proprietaire`, `garant`) AND the English interface value (`owner`, `guarantor`) to ALL role lookup tables. Grep for `getContactTypeLabel` and `getContactTypeBadgeStyle` after adding new roles.
**Example:** `config/table-configs/contacts.config.tsx` lines 72-110
**When to Use:** When adding or renaming any contact role — check ALL lookup maps across the codebase
**Added:** 2026-03-18 | **Source:** Propriétaire role rename — contacts list showing "Non défini"

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
