# Building Creation RLS Fix - Summary

## Problem

Building creation was failing with the error: `new row violates row-level security policy for table "buildings"`

## Root Cause

The issue was caused by two factors:

### 1. Implicit SELECT after INSERT (PostgREST behavior)
When using `.insert().select()` in Supabase, PostgREST performs an implicit SELECT immediately after the INSERT to return the newly created row. This SELECT is subject to the `buildings_select` RLS policy, which was blocking access because the auth context (`auth.uid()`) wasn't properly established for SECURITY DEFINER functions during this immediate operation.

### 2. Restrictive RLS Policies
The original RLS policies only allowed `admin` or `team_manager` to INSERT buildings, but we needed to allow any `gestionnaire` who is a member of the target team.

## Solution

### Part 1: BaseRepository Pattern Fix

**File**: `lib/services/core/base-repository.ts`

Modified the `create()` method to:
1. Generate a UUID upfront using `crypto.randomUUID()`
2. Perform a pure INSERT without any `.select()` (avoids implicit SELECT RLS check)
3. Perform a separate SELECT query to fetch the complete row (with proper auth context)

```typescript
async create(data: TInsert): Promise<RepositoryResponse<TRow>> {
  // Generate ID upfront
  const newId = crypto.randomUUID()
  const dataWithId = { ...data, id: newId } as any

  // Step 1: Pure INSERT (no SELECT)
  const { error: insertError } = await this.supabase
    .from(this.tableName as any)
    .insert(dataWithId)

  if (insertError) {
    return createErrorResponse(handleError(insertError, `${this.tableName}:create:insert`))
  }

  // Step 2: Separate SELECT with proper auth context
  const { data: result, error: selectError } = await this.supabase
    .from(this.tableName as any)
    .select('*')
    .eq('id', newId)
    .single()

  // ...
}
```

### Part 2: RLS Policy Updates

**File**: `supabase/migrations/20251010000002_phase2_buildings_lots_documents.sql`

#### A. Updated `buildings_insert` Policy
```sql
CREATE POLICY buildings_insert ON buildings FOR INSERT
TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      is_gestionnaire()
      AND user_belongs_to_team_v2(team_id)
    )
  );
```

**Change**: Allows any gestionnaire who belongs to the team (via `user_belongs_to_team_v2`) to create buildings, not just team managers.

#### B. Updated `lots_insert` Policy
```sql
CREATE POLICY lots_insert ON lots FOR INSERT
TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      is_gestionnaire()
      AND (
        (building_id IS NOT NULL AND user_belongs_to_team_v2(get_building_team_id(building_id)))
        OR (building_id IS NULL AND user_belongs_to_team_v2(team_id))
      )
    )
  );
```

**Change**: Same relaxation for lots creation.

#### C. Updated `can_view_building()` Function
```sql
CREATE OR REPLACE FUNCTION can_view_building(building_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM buildings b
    WHERE b.id = building_uuid
      AND b.deleted_at IS NULL
      AND (
        is_admin()
        OR is_team_manager(b.team_id)
        OR (is_gestionnaire() AND user_belongs_to_team_v2(b.team_id))  -- ✅ NEW
        OR EXISTS (
          -- Tenant checks...
        )
      )
  );
$$;
```

**Change**: Added condition to allow any gestionnaire member of the team to view buildings (not just team managers).

#### D. Updated `can_view_lot()` Function
Similar update to allow gestionnaire team members to view lots.

#### E. Updated `is_team_manager()` Function
```sql
CREATE OR REPLACE FUNCTION is_team_manager(check_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND tm.team_id = check_team_id
      AND tm.role IN ('gestionnaire', 'admin')  -- ✅ Fixed: check role in team_members
      AND tm.left_at IS NULL
  );
$$;
```

**Change**: Now checks `team_members.role` instead of `users.role` for more accurate team-specific permissions.

## Benefits

1. **More Flexible Permissions**: Any gestionnaire in a team can now create and view buildings/lots, not just team managers
2. **Reliable INSERT Operations**: The separated INSERT/SELECT pattern ensures auth context is properly established
3. **Better Error Handling**: Split operations allow us to identify whether INSERT or SELECT failed
4. **Maintains Security**: Still enforces team membership and role checks via RLS

## Testing

After implementing these changes:
1. Reset the database: `npx supabase db reset`
2. Create a building via UI as a gestionnaire (non-admin) team member
3. Verify successful creation without RLS errors
4. Verify proper visibility of created buildings

## Files Modified

1. `lib/services/core/base-repository.ts` - BaseRepository.create() method
2. `supabase/migrations/20251010000002_phase2_buildings_lots_documents.sql` - RLS policies and helper functions

## Files Removed (Consolidated)

The following temporary migration files were consolidated into the main migration:
- `supabase/migrations/20251012080000_fix_is_team_manager.sql`
- `supabase/migrations/20251012081000_buildings_insert_policy_fix.sql`
- `supabase/migrations/20251012082000_relax_insert_policies_buildings_lots.sql`
- `supabase/migrations/20251012083000_relax_select_visibility_buildings_lots.sql`

## Related Issues

- RLS policy violations during building creation
- Auth context not established for SECURITY DEFINER functions
- PostgREST `return=representation` behavior with `.select()` after `.insert()`

## Date

October 12, 2025

