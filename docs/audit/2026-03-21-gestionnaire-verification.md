# Verification Complete — Gestionnaire Code Review
# Date: 2026-03-21
# Scope: 93 files (38 pages, 23 API routes, 32 server actions)
# Agents: 8 parallel verification agents

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITIQUE | 3 | Hard DELETE (2) + null team_id post-delete |
| MOYEN | 3 | Type mismatch + missing role + `as any` cast |
| BAS | 1 | Overly permissive file accept |
| WARNINGS | 29 | console.error → logger, minor improvements |

**Total: 7 bugs, 29 warnings across 93 files**

---

## CRITIQUE Bugs

### BUG-001: Hard DELETE on buildings (should be soft delete)
- **File:** `app/gestionnaire/(no-navbar)/immeubles/[id]/actions.ts`
- **Issue:** `.delete().eq('id', id)` physically removes building row
- **Impact:** Data loss, breaks referential integrity, no audit trail
- **Fix:** Replace with `.update({ deleted_at: new Date().toISOString() }).eq('id', id)`

### BUG-002: Hard DELETE on lots (should be soft delete)
- **File:** `app/gestionnaire/(no-navbar)/lots/[id]/actions.ts`
- **Issue:** `.delete().eq('id', id)` physically removes lot row
- **Impact:** Same as BUG-001
- **Fix:** Replace with soft delete pattern

### BUG-003: Query post-delete reads null team_id
- **File:** `app/gestionnaire/(no-navbar)/immeubles/[id]/actions.ts:~92`
- **Issue:** After deleting building, code queries `team_id` from the deleted row (returns null)
- **Impact:** Redirect/revalidation may fail silently
- **Fix:** Capture `team_id` BEFORE the delete/soft-delete operation

---

## MOYEN Bugs

### BUG-004: Type mismatch InterventionWithRelations vs DbIntervention
- **File:** Dashboard intervention stats components
- **Issue:** Component expects `InterventionWithRelations` but receives raw DB type
- **Impact:** Runtime property access on undefined nested relations
- **Fix:** Align types or add null-safe access

### BUG-005: Role `proprietaire` not handled in contact detail filtering
- **File:** Contact detail page filtering logic
- **Issue:** Switch/if chain doesn't handle `proprietaire` role
- **Impact:** Proprietaire contacts show unfiltered or empty data
- **Fix:** Add `proprietaire` case to filtering logic

### BUG-006: `(profile as any).team_id` in profile page
- **File:** Profile page component
- **Issue:** Unsafe `as any` cast to access `team_id`
- **Impact:** Type safety bypassed, could mask breaking changes
- **Fix:** Properly type the profile object or use typed accessor

---

## BAS Bugs

### BUG-007: `accept="image/*"` too permissive in avatar upload
- **File:** Profile avatar upload component
- **Issue:** Accepts any image type including SVG (XSS vector)
- **Impact:** Low — backend may validate, but defense-in-depth missing
- **Fix:** Restrict to `accept="image/jpeg,image/png,image/webp"`

---

## Warnings (29 total — not blocking)

### console.error → logger (12 occurrences)
Files using `console.error` instead of `logger`:
- `app/actions/notification-actions.ts`
- `app/actions/lot-actions.ts`
- `app/actions/building-actions.ts`
- `app/actions/contact-actions.ts`
- `app/actions/intervention-actions.ts`
- `app/gestionnaire/(no-navbar)/immeubles/[id]/actions.ts`
- `app/gestionnaire/(no-navbar)/lots/[id]/actions.ts`
- Various other server action files

### Minor improvements (17 occurrences)
- Missing error boundaries on some pages
- Inconsistent loading state patterns
- Some pages missing `getServerAuthContext` guard (using raw auth instead)
- Minor accessibility improvements possible

---

## Remediation Priority

1. **Sprint 2A (CRITIQUE):** BUG-001, BUG-002, BUG-003 — soft delete + pre-capture team_id
2. **Sprint 2B (MOYEN):** BUG-004, BUG-005, BUG-006 — type fixes
3. **Sprint 2C (BAS):** BUG-007 — avatar accept restriction
4. **Backlog:** 29 warnings (console.error → logger, etc.)
