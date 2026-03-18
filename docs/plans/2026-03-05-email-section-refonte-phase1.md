# Email Section Refonte — Phase 1: Critiques + Hauts

**Date**: 2026-03-05
**Scope**: Bugs 1-20 (critiques + hauts) + dead code cleanup minimal
**Files touched**: ~15 files across mail UI, API routes, services, hooks, migration

---

## Workstream A: Counts System Fix (Bugs 2, 3, 8, 9, 14, 15, 16)

### A1. Fix RPC `get_email_counts` for service role
- **File**: New migration to replace `supabase/migrations/20260302120000_create_get_email_counts_rpc.sql`
- Remove `get_my_profile_ids()` guard — RPC is SECURITY DEFINER, caller already validated
- Accept `p_team_id` parameter, filter by it directly
- Add per-source unread counts: return `(folder_counts jsonb, source_counts jsonb)`
- `folder_counts`: `{ inbox, processed, sent, archive, drafts: 0 }`
- `source_counts`: `{ [email_connection_id]: unread_count }`

### A2. Wire source counts in SSR + sidebar
- **File**: `app/gestionnaire/(with-navbar)/mail/page.tsx`
- Pass `sourceCounts` from RPC to MailClient
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Add `sourceCounts` state, pass to sidebar
- **File**: `app/gestionnaire/(with-navbar)/mail/components/mailbox-sidebar.tsx`
- Use `sourceCounts[connectionId]` for badge instead of hardcoded 0
- Show `totalUnread = Object.values(sourceCounts).reduce(sum)` for "Toutes les boîtes"

### A3. Centralize count adjustments
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Create `adjustCounts(action, currentFolder, emailDirection?)` helper:
  ```
  archive: currentFolder count -1, archive +1
  delete: currentFolder count -1
  softDelete: currentFolder count -1
  markProcessed: inbox -1, processed +1
  markUnprocessed: inbox +1, processed -1
  replySent: sent +1
  ```
- Replace all inline `setCounts` in: handleArchive, handleDelete, handleSoftDelete, handleMarkAsProcessed, handleMarkAsUnprocessed, handleBlacklist, handleReplySent

### A4. Fix realtime INSERT to always increment inbox
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` (handleRealtimeNewEmail)
- Always increment `counts.inbox` for received emails regardless of currentFolder
- Only prepend to realEmails if currentFolder matches

### A5. Prevent source-filtered total from overwriting folder count
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` (fetchEmails success path)
- Guard: only set `counts[folderKey] = data.total` when `selectedSource === 'all'`

---

## Workstream B: SSR/API Parity + Folder Logic (Bugs 1, 10, 23)

### B1. Align SSR initial fetch with API inbox query
- **File**: `app/gestionnaire/(with-navbar)/mail/page.tsx` (getInitialEmails)
- Add `.eq('status', 'unread')` to the received emails query (matching repository inbox logic)

### B2. Remove email from list on mark processed/unprocessed
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- handleMarkAsProcessed: if `currentFolder === 'inbox'`, filter email out of `realEmails` (not just status change)
- handleMarkAsUnprocessed: if `currentFolder === 'processed'`, filter email out
- Select next email after removal

### B3. Fix drafts folder returning all emails
- **File**: `lib/services/repositories/email.repository.ts` (getEmailsByFolder)
- For `drafts` folder: return empty array `{ data: [], count: 0 }` (feature not implemented)

---

## Workstream C: Conversation + Entity + Pagination (Bugs 4, 5, 12, 13)

### C1. Fix chevron toggle crash
- **File**: `app/gestionnaire/(with-navbar)/mail/components/conversation-group.tsx`
- Change button onClick to: `onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded) }}`
- Remove the `handleToggle` function entirely (inline the logic)

### C2. Fix entity email pagination
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Add `entityPaginationOffset` state (0 by default, reset on entity click)
- In handleEntityClick: use `data.pagination.total` for `totalEmails` (not `data.emails.length`)
- In handleLoadMore: if `entityFilter`, call entity API with `entityPaginationOffset` instead of folder API
- Increment `entityPaginationOffset` on success, append to realEmails

### C3. Fix load-more disabled by sent reply enrichment
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Track `receivedEmailCount` separately (count of direction='received' in realEmails)
- handleLoadMore guard: `receivedEmailCount < totalEmails` instead of `realEmails.length < totalEmails`
- Alternative simpler fix: use `offset < totalEmails` as guard (offset tracks received pages accurately)

### C4. Fix stale-while-revalidate resurrecting archived emails
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Add `optimisticRemovals` ref (Set<string>)
- On archive/delete/softDelete: add emailId to set
- On background refresh (stale path): filter out IDs in `optimisticRemovals` before setting realEmails
- On hard refresh (cache miss/sync): clear the set

---

## Workstream D: Actions & Error Handling (Bugs 6, 7, 11, 17, 18, 19, 20, 25)

### D1. Add Zod validation to PATCH /api/emails/[id]
- **File**: `app/api/emails/[id]/route.ts`
- Create schema: `z.object({ status, building_id, lot_id, deleted, restored }).partial()`
- Reject any fields not in the schema

### D2. Fix attachment route team verification
- **File**: `app/api/emails/[id]/attachments/[attachmentId]/route.ts`
- Replace `userProfile.team_id` with `team_members` lookup (same pattern as other API routes)

### D3. Add rollback to mark processed/unprocessed
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Save `previousEmails` and `previousCounts` before optimistic update
- In catch block: `setRealEmails(previousEmails)`, `setCounts(previousCounts)`

### D4. Add loading state for full email body fetch
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- Add `loadingEmailBodyId` state
- Set it before `fetchFullEmail()`, clear on completion
- Pass to EmailDetail as prop
- **File**: `app/gestionnaire/(with-navbar)/mail/components/email-detail.tsx`
- Show skeleton/spinner when `loadingEmailBodyId === email.id`

### D5. Fix mark-as-irrelevant soft delete path
- **File**: `app/gestionnaire/(with-navbar)/mail/components/mark-irrelevant-dialog.tsx`
- Remove `onArchive?.()` call from soft_delete path (soft delete is sufficient)
- Fix toast message to "Email masqué" (not "masqué et archivé")

### D6. Include body_html in sent replies query
- **File**: `lib/services/repositories/email.repository.ts` (getSentRepliesForThreads)
- Add `body_html` to the select columns (currently excluded for perf, but needed for thread view)

### D7. Translate empty state to French
- **File**: `app/gestionnaire/(with-navbar)/mail/mail-client.tsx`
- "No email selected" → "Aucun email sélectionné"
- "Select an email from the list to view it" → "Sélectionnez un email pour le consulter"

### D8. Fix forward body when only body_html exists
- **File**: `app/gestionnaire/(with-navbar)/mail/components/email-detail.tsx` (buildForwardBody)
- Fallback: `const body = em.body_text || extractTextFromHtml(em.body_html) || ''`

---

## Workstream E: Dead Code Cleanup (minimal, supporting fixes)

### E1. Remove unused `fetchCounts` callback
### E2. Activate `fetchEmailConnections` — call on mount or wire to polling
### E3. Remove unused `handleMarkAsRead`
### E4. Remove unused `handleLinkBuilding` and legacy `linkToBuilding` in client service
### E5. Fix missing deps in useCallback arrays (handleBlacklist, Effect 1)
### E6. Remove dead `setOffset(0)` calls

---

## Verification Checklist

- [ ] `npm run lint` — no new warnings on touched files
- [ ] Counts visible on initial SSR load (not 0)
- [ ] Per-source badges show real unread counts
- [ ] Archive/delete from any folder adjusts the correct count
- [ ] Mark as processed removes email from inbox list
- [ ] Entity filter: click building → shows emails, pagination works, clear → back to folder
- [ ] Conversation chevron expand/collapse works without crash
- [ ] Load-more works on inbox with 50+ emails
- [ ] Background refresh doesn't resurrect archived emails
- [ ] Reply in thread shows full HTML content (not "Aucun contenu")
- [ ] Forward includes email body even when only body_html exists
- [ ] PATCH /api/emails/[id] rejects unknown fields
- [ ] Empty state shows French text

---

## Phase 2 (future): Bugs 21-33 (search server-side, filter UX, entity polling, realtime UPDATE, lotMap, etc.)
## Phase 3 (future): Bugs 34-43 (remaining dead code, sort button, conversation parent dedup, etc.)
