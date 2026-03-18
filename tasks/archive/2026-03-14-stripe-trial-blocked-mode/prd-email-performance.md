# PRD: Email Module Performance Optimization

## Context

The email module (`/gestionnaire/mail`) loads slowly when navigating between sections (inbox, sent, processed, archive, entity filters). Root cause analysis identified **8 bottlenecks** across 3 layers: client state management, API endpoints, and database queries.

**User pain**: Every folder switch triggers a full API round-trip (500-800ms) with zero client-side caching. Switching Inbox → Sent → Inbox fetches the entire inbox twice.

## Scope

**In scope**: Client-side folder caching, redundant API call elimination, query optimizations, request lifecycle management.

**Out of scope**: Supabase Realtime architecture changes, email sync (IMAP) performance, UI component rendering optimizations.

## Architecture Overview

```
mail-client.tsx (state) → EmailClientService (fetch) → API routes → EmailRepository → Supabase
                  ↑                                         ↑
        [B1: No folder cache]              [B5: select('*') counts]
        [B2: Redundant fetchCounts]        [B7: connections count fetches ALL rows]
        [B4: O(n×m) adaptEmail]            [B8: notifReplyGroups fetches ALL rows]
        [B6: No request cancellation]      [B3: Sent replies unbounded]
```

## User Stories

### US-001: Client-Side Folder Cache (B1) — Priority 1, Size M
**As a** gestionnaire navigating between email folders,
**I want** previously loaded folders to display instantly,
**So that** I don't wait for a full re-fetch every time I switch back.

**Implementation**:
- Add a `useRef<Map<string, { emails: Email[], total: number, timestamp: number }>>` folder cache in `mail-client.tsx`
- On folder switch: if cache entry exists AND is < 60s old, use cached data instantly
- Background refresh: after displaying cached data, fetch fresh data and update silently (stale-while-revalidate pattern)
- Cache invalidation: clear cache entry on email actions (archive, delete, mark read/processed) that affect folder counts
- Cache key: `${folder}:${selectedSource}` to cache per folder+source combo

**Files**:
- `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` — add cache logic to `fetchEmails` + `handleFolderChange`

**Acceptance Criteria**:
- [ ] Switching to a previously-visited folder shows data in < 50ms (from cache)
- [ ] Fresh data loads silently in background within 1s
- [ ] Cache invalidates correctly when user archives/deletes/marks an email
- [ ] Cache expires after 60 seconds (stale data protection)
- [ ] Lint passes (`npm run lint`)

---

### US-002: Eliminate Redundant fetchCounts (B2) — Priority 1, Size XS
**As a** developer optimizing API calls,
**I want** to remove the redundant `fetchCounts()` call on every folder switch,
**So that** we save 4 unnecessary count queries per navigation.

**Current flow**: `fetchEmails()` already returns `total` for the current folder, then calls `fetchCounts()` which runs 4 separate count queries for ALL folders.

**Implementation**:
- Remove the `fetchCounts()` call inside `fetchEmails()` (line ~310 of mail-client.tsx)
- Instead, update only the current folder's count from the `total` returned by `getEmails()`
- Rely on the 60s polling (`useEmailPolling`) to keep all folder counts in sync
- Keep `fetchCounts()` available for manual sync and post-action updates

**Files**:
- `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` — modify `fetchEmails` callback

**Acceptance Criteria**:
- [ ] Folder switch triggers exactly 1 API call (GET /api/emails), not 2
- [ ] Current folder count updates correctly from the response total
- [ ] Other folder counts still update via 60s polling
- [ ] Lint passes

---

### US-003: AbortController for Request Cancellation (B6) — Priority 2, Size S
**As a** user rapidly clicking between folders,
**I want** previous in-flight requests to be cancelled,
**So that** stale responses don't overwrite fresh data.

**Implementation**:
- Add an `abortControllerRef = useRef<AbortController | null>(null)` in mail-client.tsx
- Before each `fetchEmails()`, abort previous controller and create new one
- Pass `signal` to `EmailClientService.getEmails()` and the underlying `fetch()` call
- Ignore `AbortError` in catch block (expected behavior)

**Files**:
- `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` — abort logic in `fetchEmails`
- `lib/services/client/email-client.service.ts` — add `signal?: AbortSignal` parameter to `getEmails()`

**Acceptance Criteria**:
- [ ] Rapid folder switching only renders the last-clicked folder's data
- [ ] No console errors from aborted requests
- [ ] AbortError is silently caught (not shown as toast error)
- [ ] Lint passes

---

### US-004: Building Map for O(1) Lookup in adaptEmail (B4) — Priority 2, Size XS
**As a** developer optimizing rendering,
**I want** `adaptEmail()` to use a pre-built Map instead of `Array.find()`,
**So that** email adaptation is O(n) instead of O(n×m).

**Current**: `adaptEmail()` calls `buildings.find(b => b.id === email.building_id)` for every email — O(m) per email.

**Implementation**:
- Create `buildingMap` and `lotMap` via `useMemo` from `buildings` array
- Pass maps to `adaptEmail()` instead of the full buildings array
- Change `adaptEmail` to use `buildingMap.get(email.building_id)` — O(1)

**Files**:
- `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` — buildingMap memo + adaptEmail refactor

**Acceptance Criteria**:
- [ ] `adaptEmail` uses Map.get() instead of Array.find()
- [ ] Building/lot display still works correctly
- [ ] Lint passes

---

### US-005: Optimize Counts Endpoint — select('id') (B5) — Priority 3, Size XS
**As a** developer optimizing DB queries,
**I want** count queries to use `select('id')` instead of `select('*')`,
**So that** PostgreSQL query planner can use covering indexes.

**Implementation**:
- In `/api/emails/counts/route.ts`: change `select('*', { count: 'exact', head: true })` to `select('id', { count: 'exact', head: true })`
- In `/api/emails/refresh/route.ts`: same change for the 4 count queries

**Files**:
- `app/api/emails/counts/route.ts` — 4 select changes
- `app/api/emails/refresh/route.ts` — 4 select changes

**Acceptance Criteria**:
- [ ] All count queries use `select('id')` not `select('*')`
- [ ] Counts still return correct values
- [ ] Lint passes

---

### US-006: Optimize Connections Email Count (B7) — Priority 2, Size S
**As a** developer eliminating N-row transfers,
**I want** per-connection email counts to use head-only count queries,
**So that** we don't transfer thousands of rows just to count them.

**Current**: `/api/emails/connections/route.ts` fetches ALL email rows (`select('email_connection_id')`) then counts via `.reduce()` in JavaScript. For a team with 5000 emails, this transfers 5000 rows twice (total + unread).

**Implementation**:
- Replace the bulk fetch + reduce pattern with individual `count: 'exact', head: true` queries per connection
- Use `Promise.all` to run all count queries in parallel
- Alternatively, create an RPC function `get_email_counts_by_connection(team_id)` using GROUP BY

**Files**:
- `app/api/emails/connections/route.ts` — replace lines 52-92 with count queries

**Acceptance Criteria**:
- [ ] No full row fetches for counting — only head:true or RPC
- [ ] Connection list still shows correct total and unread counts
- [ ] Lint passes

---

### US-007: Optimize Notification Reply Groups (B8) — Priority 2, Size S
**As a** developer optimizing SSR queries,
**I want** notification reply groups to use SQL GROUP BY,
**So that** we don't fetch all intervention-linked emails just to count them.

**Current**: `getNotificationReplyGroups()` in `page.tsx` fetches ALL emails with `intervention_id IS NOT NULL`, groups them in JavaScript via Map, then slices top 20.

**Implementation**:
- Create an RPC function `get_notification_reply_groups(p_team_id UUID)` that does:
  ```sql
  SELECT intervention_id, i.title, COUNT(*) as count
  FROM emails e
  JOIN interventions i ON i.id = e.intervention_id
  WHERE e.team_id = p_team_id AND e.direction = 'received'
    AND e.intervention_id IS NOT NULL AND e.deleted_at IS NULL
  GROUP BY e.intervention_id, i.title
  ORDER BY count DESC
  LIMIT 20
  ```
- Replace the JavaScript implementation with a single RPC call
- Add a JS fallback for when the RPC isn't deployed yet

**Files**:
- `supabase/migrations/YYYYMMDD_optimize_notification_reply_groups.sql` — new RPC
- `app/gestionnaire/(with-navbar)/mail/page.tsx` — replace `getNotificationReplyGroups()`

**Acceptance Criteria**:
- [ ] RPC returns top 20 intervention groups with counts
- [ ] JavaScript fallback still works if RPC fails
- [ ] SSR sidebar shows correct notification reply groups
- [ ] `npm run supabase:types` regenerates types
- [ ] Lint passes

---

### US-008: Scope Sent Replies Fetch (B3) — Priority 3, Size S
**As a** developer reducing payload size,
**I want** sent replies to be fetched with limited columns and scoped to relevant threads,
**So that** we don't transfer 200 full email bodies on every inbox load.

**Current**: `getSentRepliesForThreads()` fetches `select('*')` with `limit(200)` — including full `body_text` and `body_html` for 200 emails. These are only needed for conversation threading (matching by message_id/references), not for display.

**Implementation**:
- Change `select('*')` to `select('id, team_id, email_connection_id, direction, status, message_id, in_reply_to, in_reply_to_header, references, from_address, to_addresses, cc_addresses, subject, received_at, sent_at, created_at, body_text')` — exclude `body_html` (the heaviest field)
- Alternatively, add a `threadOnly` mode that selects only threading headers + minimal display fields
- Keep `body_text` for snippet generation but truncate to 200 chars in the query via `.limit()` on the text

**Files**:
- `lib/services/repositories/email.repository.ts` — modify `getSentRepliesForThreads()` select clause

**Acceptance Criteria**:
- [ ] Sent replies don't include `body_html`
- [ ] Conversation threading still works correctly (grouping by references/in_reply_to)
- [ ] Email snippets still display for sent replies in conversation view
- [ ] Lint passes

## Priority Order

| Priority | Stories | Rationale |
|----------|---------|-----------|
| 1 | US-001, US-002 | Highest user impact — eliminates the perceived slowness |
| 2 | US-003, US-004, US-006, US-007 | Correctness + server-side query efficiency |
| 3 | US-005, US-008 | Minor optimizations, lower urgency |

## Dependencies

```
US-001 (folder cache) — standalone
US-002 (remove fetchCounts) — standalone, can pair with US-001
US-003 (abort controller) — depends on US-001 (cache check must happen before abort)
US-004 (building map) — standalone
US-005 (count select) — standalone
US-006 (connections count) — standalone
US-007 (notif groups RPC) — requires migration before code change
US-008 (sent replies scope) — standalone
```

## Success Metrics

- Folder switch perceived latency: **< 100ms** (from cache) vs current **500-800ms**
- API calls per folder switch: **1** (from 2)
- Connections endpoint payload: **~200 bytes** (counts) vs current **~50KB+** (all rows)
- Notification groups SSR: **1 RPC call** vs current **unbounded scan + JS grouping**
