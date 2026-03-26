# B8 -- Contrats Fournisseurs (CRUD)

## Files reviewed (8)
- `app/gestionnaire/(with-navbar)/contrats/page.tsx`
- `app/gestionnaire/(no-navbar)/contrats/nouveau/page.tsx`
- `app/gestionnaire/(no-navbar)/contrats/modifier/[id]/page.tsx`
- `app/actions/contract-actions.ts` (1506 lines)
- `lib/services/repositories/supplier-contract.repository.ts`
- `components/contract/contract-form-container.tsx` (1728 lines)
- `components/contract/supplier-confirmation-step.tsx`
- `components/building-confirmation-step.tsx`

---

## Security: 8/10

**Positives:**
- `getServerAuthContext('gestionnaire')` used in all 3 Server Component pages (list:L20, create:L33, edit:L27)
- Edit page verifies `contract.team_id !== team.id` before rendering (modifier/[id]/page.tsx:L48-55) -- defense-in-depth beyond RLS
- `getServerActionAuthContextOrNull('gestionnaire')` used consistently in contract-actions.ts
- All queries filter by `team_id` and `is('deleted_at', null)` in repository
- Soft delete pattern (not hard delete)

**Issues:**
- (-1) `contract-actions.ts` at 1506 lines -- while not a direct security issue, large files increase review risk for security-critical code
- (-1) No explicit Zod schema validation visible in the contract server actions for supplier contracts. The `createSupplierContractsAction` is imported from a separate `supplier-contract-actions.ts` file (not listed in plan but referenced in contract-form-container.tsx:L63)

**No blockers.**

---

## Patterns: 6/10

**Positives:**
- Repository pattern followed: `SupplierContractRepository` extends `BaseRepository`, proper factory functions for browser/server/server-action contexts
- Service layer used: `createServerContractService()`, `createServerSupplierContractService()`
- Phase 0 + Wave 1 parallelization pattern in all pages (Promise.all for service init and queries)
- `after()` for deferred work (status transitions, expiring contracts check) -- doesn't block page render
- `.limit(1)` used correctly in reminder repo; no `.single()` in supplier-contract repo
- No `console.log` in contract-actions.ts or supplier-contract.repository.ts

**Issues:**
- (-2) **`any` types proliferate in nouveau/page.tsx and modifier/[id]/page.tsx**: Lines 72-74, 83, 87-89, 102, 106 all use `(building: any)`, `(lot: any)`, `(contact: any)`. This transform logic is duplicated between create and edit pages -- should be extracted to a shared utility
- (-1) **DRY violation**: nouveau/page.tsx and modifier/[id]/page.tsx contain nearly identical transform logic for buildings, lots, and contacts (lines 62-113 in both files). Should be a shared `transformBuildingsData()` utility
- (-1) **contract-form-container.tsx at 1728 lines** -- exceeds 500-line limit by 3.5x. This is a massive monolithic client component handling both bail and fournisseur flows, both create and edit modes

---

## Design Quality: 7/10

**Positives:**
- Multi-step wizard with `StepProgressHeader` for creation flow
- Confirmation step with structured layout (`ConfirmationPageShell`, `ConfirmationEntityHeader`, etc.)
- Both lease and supplier contract views in a unified page with tab navigation
- `after()` deferred work means pages load fast (no waiting for status transitions)
- Proper error handling with fallback empty state on server error (contrats/page.tsx:L120-128)
- Parallel data fetching for fast initial load
- Multi-team consolidated view support

**Issues:**
- (-1) No skeleton loading state visible for the contracts list page (no Suspense boundary in contrats/page.tsx -- entire page waits for data)
- (-1) **Hardcoded support email in billing-page-client.tsx** (`support@seido.be` on L335 and L413) -- not EMAIL_CONFIG centralized. While this is in B11, it shows a pattern issue
- (-1) `contract-form-container.tsx` handles both bail and fournisseur in one giant component -- cognitive load for users switching between modes could be improved with clearer visual differentiation

---

## Summary

```
Security:       8/10  ████████░░
Patterns:       6/10  ██████░░░░
Design Quality: 7/10  ███████░░░
━━━━━━━━━━━━━━━━━━━━━━━━━━
Weighted Score: 7.1/10
Result: PASS (borderline)
```

**Blockers:** None

**Improvements:**
1. **HIGH**: Extract shared transform logic from nouveau/page.tsx and modifier/[id]/page.tsx into a utility (eliminates `any` casts and DRY violation)
2. **HIGH**: Split contract-form-container.tsx (1728 lines) into separate bail and fournisseur form components
3. **MEDIUM**: Add proper TypeScript types for building/lot/contact transforms instead of `any`
4. **LOW**: Add Suspense boundary to contrats list page for streaming
