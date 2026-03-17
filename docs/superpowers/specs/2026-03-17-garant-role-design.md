# Design: Add `garant` as a first-class DB role

**Date**: 2026-03-17
**Status**: Approved
**Approach**: Add `garant` to `user_role` and `team_member_role` enums (Approach A)

## Problem

The `garant` role does not exist in the DB enum `user_role`. When a user creates a garant contact, the API maps it to `role: 'prestataire'` + `provider_category: 'autre'`. This causes:

1. Garant contacts display as "Prestataire" in the UI
2. The guarantor selector in `contact-selector.tsx` finds no contacts (filters by assignment type `guarantor`, but all garants are classified as `provider`)
3. Semantic confusion — garants are not service providers

## Solution

Add `garant` to both `user_role` and `team_member_role` DB enums, then fix the mapping layer.

## Changes

### 1. Database Migration

```sql
ALTER TYPE user_role ADD VALUE 'garant';
ALTER TYPE team_member_role ADD VALUE 'garant';
```

No data migration for existing contacts — any previously-created garants stored as prestataire+autre can be manually corrected if needed.

### 2. API Route — `app/api/invite-user/route.ts`

Legacy mapping (line 118):
```diff
- 'garant': { role: 'prestataire', provider_category: 'autre' },
+ 'garant': { role: 'garant', provider_category: null },
```

### 3. Assignment Utils — `lib/services/utils/assignment-utils.ts`

- `determineAssignmentType()`: Add `garant` → `'guarantor'`
- `getAssignmentTypeDisplayName()`: Add `'guarantor': 'Garant'`
- `mapFrontendToDbRole()`: Add `'guarantor'` and `'garant'` mappings
- `getAvailableAssignmentTypes()`: Add `'guarantor'` to lot context

### 4. Contact Selector — `components/contact-selector.tsx`

Add `case 'garant': return 'guarantor'` in the role mapping switch (line 391-398).

### 5. Type Regeneration

Run `npm run supabase:types` to update `lib/database.types.ts`.

## Files Touched

| File | Change |
|------|--------|
| `supabase/migrations/XXXXXX_add_garant_role.sql` | New migration |
| `app/api/invite-user/route.ts` | Fix legacy mapping |
| `lib/services/utils/assignment-utils.ts` | Add garant to all util functions |
| `components/contact-selector.tsx` | Add garant to role mapping |
| `lib/database.types.ts` | Regenerated |

## Non-Goals

- No app login for garants (same as proprietaire)
- No RLS changes (garant follows same team-based access as other roles)
- No data migration for existing contacts
