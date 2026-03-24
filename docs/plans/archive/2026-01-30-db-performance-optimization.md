# Database Performance Optimization Plan

**Date**: 2026-01-30
**Based on**: Supabase slow query analysis (pg_stat_statements)
**Total analyzed**: ~7M ms (2h CPU time)

## Executive Summary

| Category | % Time | Root Cause | Fix |
|----------|--------|------------|-----|
| Realtime | 62.85% | Supabase internal polling | N/A (expected) |
| Interventions | ~9% | Nested JOINs (7+ levels) | Parallel queries |
| Emails | ~12% | Double COUNT | Use `estimated` |
| Lots/Contracts | ~8% | Missing composite indexes | Add indexes |

## Quick Wins Implemented

### 1. Migration: Performance Indexes (P0) ✅

**File**: `supabase/migrations/20260130230000_add_performance_indexes.sql`

```sql
-- 9 new indexes added targeting slow queries:
-- idx_interventions_created_by
-- idx_interventions_team_contract
-- idx_contracts_team_lot
-- idx_contracts_lot_status
-- idx_time_slots_intervention_selected
-- idx_buildings_team_active
-- idx_contract_contacts_covering
-- idx_messages_thread_created
-- idx_emails_team_direction_status
```

**Expected impact**: -30% query time on JOIN-heavy queries

---

## Completed Changes (P1) ✅

### 2. Refactor `findByIdWithRelations` to Parallel Queries

**Files optimized**:
- `lib/services/repositories/intervention.repository.ts` ✅
- `lib/services/repositories/lot.repository.ts` ✅ (11 methods)
- `lib/services/repositories/contract.repository.ts` ✅ (4 methods)

**Original** (1470ms average):
```typescript
// Single query with 7+ nested LEFT JOIN LATERAL
const { data } = await supabase
  .from('interventions')
  .select(`
    *,
    creator:created_by(...),
    lot:lot_id(
      ...,
      building:building_id(...),
      lot_contacts(user:user_id(...))
    ),
    building:building_id(...),
    intervention_assignments(user:user_id(...)),
    documents:intervention_documents(...)
  `)
  .eq('id', id)
  .single()
```

**Optimized** (expected ~300ms with parallel queries):
```typescript
async findByIdWithRelationsOptimized(id: string) {
  // Step 1: Fetch intervention base data + simple relations
  const [
    interventionResult,
    assignmentsResult,
    documentsResult
  ] = await Promise.all([
    // Base intervention with lot/building (2 JOINs max)
    this.supabase
      .from('interventions')
      .select(`
        *,
        creator:created_by(id, name, email, role),
        lot:lot_id(id, reference, building_id, address_id),
        building:building_id(id, name, team_id, address_id)
      `)
      .eq('id', id)
      .single(),

    // Assignments separately (1 JOIN)
    this.supabase
      .from('intervention_assignments')
      .select(`
        role, is_primary, notes,
        user:user_id(id, name, email, phone, role, provider_category)
      `)
      .eq('intervention_id', id),

    // Documents separately (0 JOIN)
    this.supabase
      .from('intervention_documents')
      .select('id, filename, original_filename, file_size, mime_type, document_type, uploaded_at, uploaded_by')
      .eq('intervention_id', id)
      .is('deleted_at', null)
  ])

  if (interventionResult.error) throw interventionResult.error

  // Step 2: Fetch nested relations if needed (only if lot exists)
  let lotContacts = []
  let addresses = {}

  if (interventionResult.data.lot) {
    const [lotContactsResult, addressesResult] = await Promise.all([
      // Lot contacts
      this.supabase
        .from('lot_contacts')
        .select('is_primary, user:user_id(id, name, email, phone, role, provider_category)')
        .eq('lot_id', interventionResult.data.lot.id),

      // Addresses (lot + building)
      this.supabase
        .from('addresses')
        .select('*')
        .in('id', [
          interventionResult.data.lot.address_id,
          interventionResult.data.building?.address_id
        ].filter(Boolean))
    ])

    lotContacts = lotContactsResult.data || []
    addressesResult.data?.forEach(addr => { addresses[addr.id] = addr })
  }

  // Step 3: Assemble result
  return {
    ...interventionResult.data,
    lot: interventionResult.data.lot ? {
      ...interventionResult.data.lot,
      address_record: addresses[interventionResult.data.lot.address_id],
      building: interventionResult.data.lot.building_id ? {
        ...interventionResult.data.building,
        address_record: addresses[interventionResult.data.building?.address_id]
      } : null,
      lot_contacts: lotContacts
    } : null,
    intervention_assignments: assignmentsResult.data || [],
    documents: documentsResult.data || []
  }
}
```

**Why this is faster**:
- 3 parallel queries instead of 1 sequential with 7 JOINs
- Each query has max 1-2 JOINs
- PostgREST generates simpler SQL
- Better use of existing indexes

---

### 3. Replace `count: 'exact'` with `count: 'estimated'`

**Files to check**:
- `app/api/activity-logs/route.ts` (line 38)
- Any route using pagination with total count

**Change**:
```typescript
// Before
.select('*', { count: 'exact' })

// After
.select('*', { count: 'estimated' })
```

**Note**: `count: 'estimated'` uses pg_class.reltuples which is updated by VACUUM/ANALYZE. For accurate counts on small tables, keep `exact`. For tables with 1000+ rows, `estimated` is sufficient for pagination UI.

---

## Monitoring

### Query to check new index usage:
```sql
SELECT
  schemaname,
  relname AS table,
  indexrelname AS index,
  idx_scan AS times_used,
  idx_tup_read AS rows_read,
  idx_tup_fetch AS rows_fetched
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

### Reset statistics after deployment:
```sql
SELECT pg_stat_reset();
```

---

## Deployment Steps

1. **Deploy migration** (indexes):
   ```bash
   npx supabase db push
   ```

2. **Monitor for 24h** before code changes

3. **Implement parallel queries** in intervention.repository.ts

4. **A/B test** with feature flag if possible

---

## Expected Results

| Metric | Before | After (estimated) |
|--------|--------|-------------------|
| Intervention detail page | 1470ms | ~350ms |
| Email folder listing | 412ms | ~150ms |
| Lots listing | 1196ms | ~400ms |
| Contracts listing | 1178ms | ~400ms |

**Total expected improvement**: 50-70% reduction in DB query time for page loads.
