/**
 * Supplier contract intervention scheduling options
 *
 * Defines scheduling options relative to contract end date / notice period
 * and factory functions to create ScheduledInterventionData from supplier contracts.
 */

import { addMonths, addDays } from 'date-fns'
import type { SchedulingOption } from '@/lib/constants/lease-interventions'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'

/**
 * Calculate the notice date by subtracting the notice period from the end date
 */
const calculateNoticeDate = (endDate: Date, value: number, unit: string): Date => {
  switch (unit) {
    case 'jours': return addDays(endDate, -value)
    case 'semaines': return addDays(endDate, -value * 7)
    case 'mois': return addMonths(endDate, -value)
    default: return addMonths(endDate, -value)
  }
}

/**
 * Get scheduling options for a supplier contract reminder.
 * Options are relative to the contract end date.
 * If a notice period is set, adds a "À la date de préavis" option as default.
 */
export const getSupplierSchedulingOptions = (
  endDate: Date,
  noticePeriodValue?: number | null,
  noticePeriodUnit?: string
): { options: SchedulingOption[]; defaultOption: string } => {
  const hasNotice = noticePeriodValue && noticePeriodValue > 0
  const noticeDate = hasNotice
    ? calculateNoticeDate(endDate, noticePeriodValue, noticePeriodUnit || 'mois')
    : null

  // Reference point: notice date if préavis exists, otherwise end date
  const refDate = noticeDate ?? endDate
  const refLabel = hasNotice ? 'le préavis' : 'la fin'

  const options: SchedulingOption[] = [
    { value: 'end_date', label: 'Le jour de fin', calculateDate: () => endDate },
    { value: 'ref_minus_1m', label: `1 mois avant ${refLabel}`, calculateDate: () => addMonths(refDate, -1) },
    { value: 'ref_minus_2m', label: `2 mois avant ${refLabel}`, calculateDate: () => addMonths(refDate, -2) },
    { value: 'ref_minus_3m', label: `3 mois avant ${refLabel}`, calculateDate: () => addMonths(refDate, -3) },
  ]

  if (hasNotice) {
    options.push({
      value: 'notice_date',
      label: 'À la date de préavis',
      calculateDate: () => noticeDate!,
    })
  }

  return {
    options,
    defaultOption: hasNotice ? 'notice_date' : 'end_date',
  }
}

/**
 * Create a ScheduledInterventionData from a supplier contract form item.
 * Used to populate the InterventionPlannerStep with one row per contract.
 */
export const createSupplierReminderIntervention = (
  contract: {
    tempId: string
    reference: string
    endDate: string
    noticePeriodValue: number | null
    noticePeriodUnit: string
  },
  currentUser?: { id: string; name: string }
): ScheduledInterventionData => {
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
    interventionTypeCode: 'rappel_preavis_fournisseur',
    icon: 'Calendar',
    colorClass: 'text-amber-500',
    enabled: true,
    scheduledDate: defaultOptionObj?.calculateDate(endDateObj, endDateObj) ?? endDateObj,
    isAutoCalculated: true,
    availableOptions: options,
    selectedSchedulingOption: defaultOption,
    assignedUsers: currentUser
      ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
      : [],
    itemType: 'reminder' as const,
  }
}

/** Custom intervention scheduling options for supplier context */
const SUPPLIER_CUSTOM_SCHEDULING_OPTIONS: SchedulingOption[] = [
  { value: 'now_plus_7d', label: 'Dans 7 jours', calculateDate: () => addDays(new Date(), 7) },
  { value: 'now_plus_14d', label: 'Dans 14 jours', calculateDate: () => addDays(new Date(), 14) },
  { value: 'now_plus_1m', label: 'Dans 1 mois', calculateDate: () => addMonths(new Date(), 1) },
  { value: 'now_plus_3m', label: 'Dans 3 mois', calculateDate: () => addMonths(new Date(), 3) },
]

/**
 * Create an empty custom intervention for supplier contracts.
 * Reuses the same key pattern as lease custom interventions.
 */
export const createEmptySupplierCustomIntervention = (
  currentUser?: { id: string; name: string }
): ScheduledInterventionData => ({
  key: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  description: '',
  interventionTypeCode: 'autre_technique',
  icon: 'PenLine',
  colorClass: 'text-indigo-500',
  enabled: false,
  scheduledDate: addDays(new Date(), 7),
  isAutoCalculated: true,
  availableOptions: SUPPLIER_CUSTOM_SCHEDULING_OPTIONS,
  selectedSchedulingOption: 'now_plus_7d',
  assignedUsers: currentUser
    ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
    : [],
  itemType: 'intervention' as const,
})

/**
 * Create an empty custom reminder for supplier contracts.
 */
export const createEmptySupplierCustomReminder = (
  currentUser?: { id: string; name: string }
): ScheduledInterventionData => ({
  key: `custom_reminder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  description: '',
  interventionTypeCode: 'autre_administratif',
  icon: 'PenLine',
  colorClass: 'text-amber-500',
  enabled: false,
  scheduledDate: addDays(new Date(), 7),
  isAutoCalculated: true,
  availableOptions: SUPPLIER_CUSTOM_SCHEDULING_OPTIONS,
  selectedSchedulingOption: 'now_plus_7d',
  assignedUsers: currentUser
    ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
    : [],
  itemType: 'reminder' as const,
})
