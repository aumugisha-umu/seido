# Intervention Status Migration: French → English

## 📋 Overview

This migration converts all intervention status values from French to English in the Supabase database while preserving data integrity and workflow logic.

## 🎯 Migration Mapping

| French Status | English Status | Workflow Stage |
|--------------|----------------|----------------|
| `demande` | `pending` | Initial tenant request |
| `rejetee` | `rejected` | Manager rejection |
| `approuvee` | `approved` | Manager approval |
| `demande_de_devis` | `quote_requested` | Waiting for provider quote |
| `planification` | `scheduling` | Finding available time slot |
| `planifiee` | `scheduled` | Time slot confirmed |
| `en_cours` | `in_progress` | Work in progress |
| `cloturee_par_prestataire` | `provider_completed` | Provider finished work |
| `cloturee_par_locataire` | `tenant_validated` | Tenant approved work |
| `cloturee_par_gestionnaire` | `completed` | Manager finalized intervention |
| `annulee` | `cancelled` | Intervention cancelled |

## 🚀 How to Run Migration

### Option 1: Using Supabase CLI (Recommended)

```bash
# Push migration to Supabase
npm run supabase:push

# Or manually apply the migration file
supabase db push
```

### Option 2: Using Migration Script

```bash
# Run the automated migration script with validation
npm run migrate:intervention-status
```

The script will:
1. ✅ Analyze current status distribution
2. ✅ Validate all statuses are mappable
3. ✅ Execute migration SQL
4. ✅ Verify results match expected counts
5. ✅ Report final status distribution

### Option 3: Manual Execution

```bash
# Connect to Supabase and run the SQL directly
psql $DATABASE_URL -f supabase/migrations/20251003000000_migrate_intervention_status_to_english.sql
```

## 📊 Pre-Migration Checklist

- [ ] Backup database (Supabase auto-backup recommended)
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set (for script)
- [ ] Review current status distribution in production
- [ ] Notify team of maintenance window (if applicable)

## 🔄 Rollback Instructions

If you need to revert the migration:

```sql
UPDATE interventions
SET status = CASE status
  WHEN 'pending' THEN 'demande'
  WHEN 'rejected' THEN 'rejetee'
  WHEN 'approved' THEN 'approuvee'
  WHEN 'quote_requested' THEN 'demande_de_devis'
  WHEN 'scheduling' THEN 'planification'
  WHEN 'scheduled' THEN 'planifiee'
  WHEN 'in_progress' THEN 'en_cours'
  WHEN 'provider_completed' THEN 'cloturee_par_prestataire'
  WHEN 'tenant_validated' THEN 'cloturee_par_locataire'
  WHEN 'completed' THEN 'cloturee_par_gestionnaire'
  WHEN 'cancelled' THEN 'annulee'
  ELSE status
END
WHERE status IN (
  'pending', 'rejected', 'approved', 'quote_requested',
  'scheduling', 'scheduled', 'in_progress', 'provider_completed',
  'tenant_validated', 'completed', 'cancelled'
);
```

## ⚙️ Post-Migration Tasks

After successful migration:

1. **Update Frontend Display Logic**:
   - Use `getStatusLabel()` from `lib/services/utils/intervention-display.ts`
   - Display French labels: `getStatusLabel(status, 'fr')`
   - Display English labels: `getStatusLabel(status, 'en')`

2. **Update API Routes**:
   - Migrate to use new `InterventionService` methods
   - Remove references to old French statuses in API logic

3. **Update UI Components**:
   - Replace hardcoded French status checks
   - Use new English status constants
   - Apply i18n utilities for display

4. **Regenerate TypeScript Types**:
   ```bash
   npm run supabase:types
   ```

5. **Test Critical Workflows**:
   - [ ] Tenant creates intervention → `pending`
   - [ ] Manager approves → `approved`
   - [ ] Provider completes → `provider_completed`
   - [ ] Tenant validates → `tenant_validated`
   - [ ] Manager finalizes → `completed`

## 🔍 Verification Queries

```sql
-- Check status distribution after migration
SELECT status, COUNT(*) as count
FROM interventions
GROUP BY status
ORDER BY count DESC;

-- Verify no French statuses remain
SELECT status, COUNT(*) as count
FROM interventions
WHERE status IN (
  'demande', 'rejetee', 'approuvee', 'demande_de_devis',
  'planification', 'planifiee', 'en_cours',
  'cloturee_par_prestataire', 'cloturee_par_locataire',
  'cloturee_par_gestionnaire', 'annulee'
)
GROUP BY status;
-- (Should return 0 rows)

-- Check for any unexpected statuses
SELECT DISTINCT status
FROM interventions
WHERE status NOT IN (
  'pending', 'rejected', 'approved', 'quote_requested',
  'scheduling', 'scheduled', 'in_progress', 'provider_completed',
  'tenant_validated', 'completed', 'cancelled'
);
-- (Should return 0 rows)
```

## 📝 Notes

- **Data Integrity**: Migration preserves all intervention data, only status values change
- **Performance**: Indexes created on new status values for optimal query performance
- **RLS Policies**: Review and update if policies reference specific status values
- **Backward Compatibility**: Frontend uses i18n utilities to display French labels

## 🆘 Troubleshooting

### Issue: Script fails with "Missing Supabase credentials"
**Solution**: Ensure `.env.local` contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Issue: Count mismatch after migration
**Solution**: Check for interventions created during migration window. Re-run migration or manually update new records.

### Issue: RLS policies blocking updates
**Solution**: Use service role key (bypasses RLS) or temporarily disable RLS during migration.

## 📚 Related Documentation

- [InterventionService API](../../lib/services/domain/intervention.service.ts)
- [Status Display Utilities](../../lib/services/utils/intervention-display.ts)
- [Database Refactoring Guide](../../docs/refacto/database-refactoring-guide.md)

---

**Migration Date**: 2025-10-03
**Author**: Claude AI (Seido Refactoring Agent)
**Status**: ✅ Ready for execution
