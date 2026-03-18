# Creation Wizards Audit — Consolidated Fix Plan

**Date:** 2026-03-16
**Scope:** Lot, Building, Contract, Contact creation wizards
**Source:** Brainstorming audit + Deep simplify review (4 agents)

---

## Priority 1: CRITICAL — Confirmation Data Bugs

### 1.1 Lot — Interventions missing in "Existing Building" confirmation

**Bug:** `BuildingConfirmationStep` accepts `buildingInterventions` and `lotInterventions` props but `lot-creation-form.tsx` never passes them (~line 2407-2421).

**Fix:** Pass `buildingInterventions={scheduledInterventions}` to the `<BuildingConfirmationStep>` call.

**Files:** `lot-creation-form.tsx`

---

### 1.2 Lot — Existing building docs missing in confirmation

**Bug:** `existingBuildingDocs` is fetched and shown in Step 3 but never passed to confirmation.

**Fix:** Map `existingBuildingDocs` into the `buildingDocSlots` data or add separate display.

**Files:** `lot-creation-form.tsx`

---

### 1.3 Lot — `successfulCreations[0]` crash when all lots fail

**Bug:** Lines ~1370 and ~1552: `router.push()` accesses `successfulCreations[0]` without bounds check. If ALL lot creations fail, this causes a TypeError crash.

**Fix:** Guard with `if (successfulCreations.length === 0)` → show error toast and return.

**Files:** `lot-creation-form.tsx`

---

### 1.4 Contract (Supplier) — Interventions missing from confirmation

**Bug:** `supplierScheduledInterventions` configured in Step 2 but never passed to `SupplierConfirmationStep`. Component doesn't even accept the prop.

**Fix:**
1. Add `scheduledInterventions?: ScheduledInterventionData[]` prop to `SupplierConfirmationStep`
2. Pass `scheduledInterventions={supplierScheduledInterventions}` from container
3. Render interventions section (reuse lease confirmation pattern)

**Files:** `contract-form-container.tsx`, `supplier-confirmation-step.tsx`

---

### 1.5 Contact — `customRoleDescription` shows literal "autre"

**Bug:** Step4Confirmation line ~274 displays `contactType` ("autre") instead of actual description. Prop not even passed from parent.

**Fix:**
1. Pass `customRoleDescription={formData.customRoleDescription}` to Step4Confirmation
2. Fix value from `contactType` to `customRoleDescription`

**Files:** `contact-creation-client.tsx`, `step-4-confirmation.tsx`

---

## Priority 2: HIGH — Runtime Safety & Data Integrity

### 2.1 Building — Array index mismatch in post-creation (docs + interventions)

**Bug:** Lines ~907-916 and ~944-968: `result.data.lots[i]?.id` assumes server returns lots in same order as client `lots[]`. If server reorders or returns fewer lots, documents/interventions silently go to wrong lots or get lost.

**Fix:** Match by lot reference or temp ID instead of array index. Add error logging when `realLotId` is undefined.

**Files:** `building-creation-form.tsx`

---

### 2.2 Contact — Step 2 validation bypass on back navigation

**Bug:** User goes step1 (company) → step2 (no company selected) → back → forward → jumps to step3 without step2 validation because `personOrCompany === 'company'` is still true.

**Fix:** Ensure forward navigation from step 1 always routes to step 2 when `personOrCompany === 'company'`, regardless of previous navigation.

**Files:** `contact-creation-client.tsx`

---

### 2.3 Contact — providerCategory/specialty not reset on type change

**Bug:** Changing from prestataire → locataire → prestataire preserves stale `providerCategory` and `specialty`. User sees old values without realizing.

**Fix:** Clear `providerCategory`, `specialty`, `customRoleDescription` when `contactType` changes away from their respective types.

**Files:** `contact-creation-client.tsx`

---

### 2.4 Contact — Email whitespace causes duplicate detection miss

**Bug:** Email not trimmed on input. Frontend check may pass with spaces, but API trims → duplicate created.

**Fix:** Add `.trim()` on email field change in step-3-contact.tsx.

**Files:** `step-3-contact.tsx`

---

### 2.5 Contract — contactType auto-selection defaults to locataire

**Bug:** Line ~699: When returning from contact creation without URL `?contactType=` param, any contact type defaults to `'locataire'`. A provider contact gets added as locataire.

**Fix:** Don't auto-assign role if `contactTypeParam` is undefined — let user choose.

**Files:** `contract-form-container.tsx`

---

## Priority 3: MEDIUM — Missing Confirmation Fields

### 3.1 Contract (Lease) — Comments not shown in confirmation

**Bug:** `formData.comments` collected in Step 1 but not displayed in confirmation recap.

**Fix:** Add `{ label: 'Commentaires', value: formData.comments, muted: true }` to details grid.

**Files:** `contract-form-container.tsx`

---

### 3.2 Contact — providerCategory not shown for non-artisan prestataires

**Bug:** Confirmation only shows specialty for artisans. Services/energie providers show nothing.

**Fix:** Add `providerCategory` prop and display in confirmation.

**Files:** `contact-creation-client.tsx`, `step-4-confirmation.tsx`

---

### 3.3 Building — Unused `owner` contact type key

**Bug:** `buildingContacts` initializes with `owner: []` key but it's never used in UI or submission. Owner contacts silently disappear.

**Fix:** Remove `owner` key from initialization, or add to confirmation if owners are a valid contact type.

**Files:** `building-creation-form.tsx`

---

## Priority 4: Cleanup — Dead Code

### 4.1 Dead state `contacts` in building-creation-form

**Line 176:** `useState<Contact[]>([])` — never used. Building contacts use `buildingContacts`. Remove.

---

### 4.2 Dead state `contacts` in lot-creation-form

**Line 176:** Same pattern — declared but never referenced. Remove.

---

## Implementation Groups (Parallelizable)

| Group | Tasks | Files | Estimated |
|-------|-------|-------|-----------|
| A | 1.1, 1.2, 1.3, 4.2 | lot-creation-form.tsx | Small-Medium |
| B | 2.1, 3.3, 4.1 | building-creation-form.tsx | Small |
| C | 1.4, 2.5, 3.1 | contract-form-container.tsx, supplier-confirmation-step.tsx | Medium |
| D | 1.5, 2.2, 2.3, 2.4, 3.2 | contact-creation-client.tsx, step-3-contact.tsx, step-4-confirmation.tsx | Medium |

**Total: 16 fixes across 4 groups, all parallelizable.**
