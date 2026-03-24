# Intervention Planner Refactoring — Shared Reusable Component

## Context

The lease wizard's `LeaseInterventionsStep` (540 lines) and the supplier contract wizard's inline reminder step share the same UI pattern (checkbox + icon + content + assign + scheduling) but are completely separate implementations. The supplier step is missing key features: ContactSelector integration, multi-role assignment, custom reminders, scheduling options. Instead of duplicating the lease code, we extract a shared `InterventionPlannerStep` wrapper.

## Architecture

```
InterventionPlannerStep (shared wrapper — NEW ~250 lines)
├── Header (icon + title + subtitle)
├── ScrollArea with section rendering loop
├── ContactSelector ref + activeAssignment state
├── handleToggle, handleDateChange, handleSchedulingOptionChange
├── handleContactSelected, handleContactRemoved
└── Delegates to InterventionScheduleRow (existing, +assignableRoles prop)

LeaseInterventionsStep (thin wrapper — REFACTORED ~180 lines)
├── Builds 4 sections: custom, rent reminders, standard, documents
├── Rent reminder UI via renderCustom()
├── Custom intervention CRUD handlers
└── Tenant pre-selection logic

Supplier case 2 in contract-form-container (thin caller — SIMPLIFIED)
├── Builds 2 sections: contract reminders, custom reminders
├── Scheduling options relative to endDate / préavis
└── Converts ScheduledInterventionData[] → Record<string, ReminderConfig> on submit
```

## Files to Create/Modify

### 1. NEW: `lib/types/intervention-planner.types.ts` (~50 lines)

Shared types:

```typescript
import type { LucideIcon } from 'lucide-react'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'

export interface AssignableRole {
  type: string          // 'manager' | 'tenant' | 'provider'
  label: string         // "Gestionnaires"
  Icon: LucideIcon
  color: string         // 'text-purple-600'
  role: 'gestionnaire' | 'prestataire' | 'locataire'
}

export interface InterventionPlannerSection {
  id: string
  title: string
  icon?: LucideIcon
  iconColorClass?: string
  rows: ScheduledInterventionData[]
  allowCustomAdd?: boolean
  renderCustom?: () => React.ReactNode
}

export interface InterventionPlannerStepProps {
  title: string
  subtitle: string
  headerIcon?: LucideIcon
  sections: InterventionPlannerSection[]
  scheduledInterventions: ScheduledInterventionData[]
  onInterventionsChange: React.Dispatch<React.SetStateAction<ScheduledInterventionData[]>>
  teamId: string
  assignableRoles: AssignableRole[]
  allowedContactTypes: string[]
  allowedContactIds?: Record<string, string[]>
  preSelectContactIds?: Record<string, string[]>
  onAddCustomIntervention?: () => void
  onDeleteCustomIntervention?: (key: string) => void
  onCustomTitleChange?: (key: string, title: string) => void
  onCustomDescriptionChange?: (key: string, description: string) => void
  /** Extra assigned users outside scheduledInterventions (e.g. rent reminders) */
  externalAssignedUsers?: Record<string, import('@/components/contract/intervention-schedule-row').InterventionAssignment[]>
  onExternalContactSelected?: (key: string, contact: { id: string; name: string }, contactType: string) => void
  onExternalContactRemoved?: (key: string, contactId: string, contactType: string) => void
}
```

### 2. NEW: `lib/constants/assignable-roles.ts` (~20 lines)

```typescript
import { Users, User, Briefcase } from 'lucide-react'
import type { AssignableRole } from '@/lib/types/intervention-planner.types'

export const ALL_ASSIGNABLE_ROLES: AssignableRole[] = [
  { type: 'manager', label: 'Gestionnaires', Icon: Users, color: 'text-purple-600', role: 'gestionnaire' },
  { type: 'tenant', label: 'Locataires', Icon: User, color: 'text-blue-600', role: 'locataire' },
  { type: 'provider', label: 'Prestataires', Icon: Briefcase, color: 'text-green-600', role: 'prestataire' },
]

export const LEASE_ASSIGNABLE_ROLES = ALL_ASSIGNABLE_ROLES
export const SUPPLIER_ASSIGNABLE_ROLES = ALL_ASSIGNABLE_ROLES.filter(r => r.type !== 'tenant')

export const ROLE_TO_CONTACT_TYPE: Record<string, string> = {
  gestionnaire: 'manager', locataire: 'tenant', prestataire: 'provider'
}
export const CONTACT_TYPE_TO_ROLE: Record<string, 'gestionnaire' | 'prestataire' | 'locataire'> = {
  manager: 'gestionnaire', tenant: 'locataire', provider: 'prestataire'
}
```

### 3. NEW: `lib/constants/supplier-interventions.ts` (~80 lines)

Supplier-specific scheduling options relative to end date:

```typescript
import { addMonths } from 'date-fns'
import type { SchedulingOption } from '@/lib/constants/lease-interventions'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'

export function getSupplierSchedulingOptions(
  endDate: Date,
  noticePeriodValue?: number | null,
  noticePeriodUnit?: string
): { options: SchedulingOption[]; defaultOption: string } {
  // Note: SchedulingOption.calculateDate takes (startDate, endDate) but for supplier
  // we only use endDate, so startDate param is ignored
  const options: SchedulingOption[] = [
    { value: 'end_date', label: 'Le jour de fin', calculateDate: () => endDate },
    { value: 'end_minus_1m', label: '1 mois avant la fin', calculateDate: () => addMonths(endDate, -1) },
    { value: 'end_minus_2m', label: '2 mois avant la fin', calculateDate: () => addMonths(endDate, -2) },
    { value: 'end_minus_3m', label: '3 mois avant la fin', calculateDate: () => addMonths(endDate, -3) },
  ]

  if (noticePeriodValue && noticePeriodValue > 0) {
    const noticeDate = calculateNoticeDate(endDate, noticePeriodValue, noticePeriodUnit || 'mois')
    options.push({
      value: 'notice_date',
      label: 'À la date de préavis',
      calculateDate: () => noticeDate,
    })
  }

  return {
    options,
    defaultOption: noticePeriodValue && noticePeriodValue > 0 ? 'notice_date' : 'end_date'
  }
}

function calculateNoticeDate(endDate: Date, value: number, unit: string): Date {
  switch (unit) {
    case 'jours': return addDays(endDate, -value)
    case 'semaines': return addDays(endDate, -value * 7)
    case 'mois': return addMonths(endDate, -value)
    default: return addMonths(endDate, -value)
  }
}

export function createSupplierReminderIntervention(
  contract: { tempId: string; reference: string; endDate: string; noticePeriodValue: number | null; noticePeriodUnit: string },
  currentUser?: { id: string; name: string }
): ScheduledInterventionData {
  const endDateObj = new Date(contract.endDate)
  const { options, defaultOption } = getSupplierSchedulingOptions(
    endDateObj, contract.noticePeriodValue, contract.noticePeriodUnit
  )
  const defaultOptionObj = options.find(o => o.value === defaultOption)

  return {
    key: contract.tempId,
    title: `Rappel échéance — ${contract.reference}`,
    description: contract.noticePeriodValue
      ? `Préavis: ${contract.noticePeriodValue} ${contract.noticePeriodUnit}`
      : 'Rappel à la date de fin du contrat',
    interventionTypeCode: 'autre_technique',
    icon: 'Calendar',  // Bell not in ICON_MAP, use Calendar
    colorClass: 'text-amber-500',
    enabled: false,
    scheduledDate: defaultOptionObj?.calculateDate(endDateObj, endDateObj) ?? endDateObj,
    isAutoCalculated: true,
    availableOptions: options,
    selectedSchedulingOption: defaultOption,
    assignedUsers: currentUser
      ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
      : []
  }
}
```

### 4. MODIFY: `components/contract/intervention-schedule-row.tsx` (~15 lines changed)

Add `assignableRoles` prop. Replace hardcoded `ASSIGN_TYPE_OPTIONS` with `props.assignableRoles ?? ASSIGN_TYPE_OPTIONS` in the Popover rendering.

```typescript
interface InterventionScheduleRowProps {
  // ... existing props ...
  assignableRoles?: AssignableRole[]
}

// In render, replace:
//   {ASSIGN_TYPE_OPTIONS.map(({ type, label, Icon, color }) => (
// With:
//   {(assignableRoles ?? ASSIGN_TYPE_OPTIONS).map(({ type, label, Icon, color }) => (
```

### 5. NEW: `components/contract/intervention-planner-step.tsx` (~250 lines)

Shared wrapper. Moves FROM `lease-interventions-step.tsx`:
- `contactSelectorRef` + `activeAssignment` state
- `selectedContactsForSelector` memo (generalized with externalAssignedUsers support)
- `handleContactSelected` / `handleContactRemoved` (generalized: delegates to `onExternalContactSelected/Removed` for non-intervention keys like RENT_REMINDER_KEY)
- `handleToggle`, `handleDateChange`, `handleSchedulingOptionChange`
- `handleAssignType` (with pre-selection support via `preSelectContactIds`)
- `getInitials` utility
- Section rendering loop with Separators
- Header rendering
- ContactSelector at bottom

The `handleAssignType` uses `preSelectContactIds` for tenant auto-select:
```typescript
const handleAssignType = useCallback((interventionKey: string, contactType: string) => {
  setActiveAssignment({ interventionKey, contactType })
  let preSelected: string[] | undefined
  if (preSelectContactIds?.[contactType]) {
    const intervention = scheduledInterventions.find(i => i.key === interventionKey)
    const role = CONTACT_TYPE_TO_ROLE[contactType]
    const hasRole = intervention?.assignedUsers.some(u => u.role === role)
    if (!hasRole) preSelected = preSelectContactIds[contactType]
  }
  requestAnimationFrame(() => {
    contactSelectorRef.current?.openContactModal(contactType, undefined, preSelected)
  })
}, [scheduledInterventions, preSelectContactIds])
```

### 6. MODIFY: `components/contract/lease-interventions-step.tsx` (540 → ~180 lines)

Becomes thin wrapper:
- Keeps: `rentReminderConfig` state handling, `rentPopoverOpen`, `reminderCount` memo
- Keeps: custom intervention handlers (add/delete/title/desc)
- Keeps: rent reminder `renderCustom` JSX block
- Builds sections array from `scheduledInterventions` by key prefix
- Passes `externalAssignedUsers={{ rent_reminders: rentReminderConfig.assignedUsers }}` for ContactSelector coordination
- Passes `onExternalContactSelected/Removed` callbacks for rent reminder

### 7. MODIFY: `components/contract/contract-form-container.tsx`

**State change**: Replace `supplierReminders: Record<string, SupplierContractReminderConfig>` with `supplierScheduledInterventions: ScheduledInterventionData[]`.

**useEffect**: When `supplierContracts` change, regenerate interventions from contracts with endDate using `createSupplierReminderIntervention()`, preserving user edits.

**Case 2 render**: Call `InterventionPlannerStep` with supplier sections.

**Submission**: Convert `supplierScheduledInterventions` back to `Record<string, SupplierContractReminderConfig>` using a utility function (keeps server action untouched).

### 8. NO CHANGE: `app/actions/supplier-contract-actions.ts`

Server action stays untouched. The conversion from `ScheduledInterventionData[]` to the expected `reminders` format happens client-side.

### 9. NO CHANGE: `lib/types/supplier-contract.types.ts`

`SupplierContractReminderConfig` stays as-is (it's the server API contract).

## Verification

1. **Lease wizard**: Create a new bail → step "Interventions" should look and behave exactly as before (custom, rent, standard, documents sections, assign, scheduling)
2. **Supplier wizard**: Create supplier contracts with end dates → step "Interventions" should now show:
   - Custom reminders section with "+ Ajouter" button
   - Contract reminders section with checkbox + icon + content + assign button + scheduling dropdown
   - Scheduling dropdown with "Le jour de fin", "1-3 mois avant", "À la date de préavis"
   - Assign button opening ContactSelector with only Gestionnaires + Prestataires
3. **`npm run lint`** passes with no new errors
