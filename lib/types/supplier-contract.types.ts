/**
 * Supplier Contract Types - SEIDO
 *
 * Types for supplier/vendor contracts linked to buildings or lots.
 * Used for copropriety/syndic contracts (elevator, cleaning, insurance, etc.)
 */

import type { Database } from '@/lib/database.types'

// ============================================================================
// DATABASE ROW TYPES (from generated types)
// ============================================================================

export type SupplierContract = Database['public']['Tables']['supplier_contracts']['Row']
export type SupplierContractInsert = Database['public']['Tables']['supplier_contracts']['Insert']
export type SupplierContractUpdate = Database['public']['Tables']['supplier_contracts']['Update']

export type SupplierContractDocument = Database['public']['Tables']['supplier_contract_documents']['Row']
export type SupplierContractDocumentInsert = Database['public']['Tables']['supplier_contract_documents']['Insert']

// ============================================================================
// STATUS
// ============================================================================

export type SupplierContractStatus = 'actif' | 'expire' | 'resilie'

export const SUPPLIER_CONTRACT_STATUS_LABELS: Record<SupplierContractStatus, string> = {
  actif: 'Actif',
  expire: 'Expiré',
  resilie: 'Résilié',
}

// ============================================================================
// COST FREQUENCY & NOTICE PERIOD OPTIONS
// ============================================================================

export const COST_FREQUENCY_OPTIONS = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
  { value: 'unique', label: 'Unique' },
] as const

export type CostFrequency = typeof COST_FREQUENCY_OPTIONS[number]['value']

export const NOTICE_PERIOD_UNIT_OPTIONS = [
  { value: 'jours', label: 'Jours' },
  { value: 'semaines', label: 'Semaines' },
  { value: 'mois', label: 'Mois' },
] as const

export type NoticePeriodUnit = typeof NOTICE_PERIOD_UNIT_OPTIONS[number]['value']

// ============================================================================
// FORM DATA (used by the wizard)
// ============================================================================

export interface SupplierContractFormItem {
  /** Client-side temporary ID for the repeatable form */
  tempId: string
  reference: string
  supplierId: string | null
  supplierName?: string
  cost: number | null
  costFrequency: CostFrequency | ''
  endDate: string
  noticePeriodValue: number | null
  noticePeriodUnit: NoticePeriodUnit
  description: string
  /** Staged files not yet uploaded */
  files: File[]
}

export interface SupplierContractFormData {
  /** Building ID (XOR with lotId) */
  buildingId: string | null
  /** Lot ID (XOR with buildingId) */
  lotId: string | null
  /** Property reference for auto-generating contract references */
  propertyReference: string
  /** Array of supplier contracts to create */
  contracts: SupplierContractFormItem[]
  /** Reminder intervention config per contract (by tempId) */
  reminders: Record<string, SupplierContractReminderConfig>
}

export interface SupplierContractReminderConfig {
  enabled: boolean
  assignedUsers: { userId: string; role: string; name?: string }[]
  rrule?: string
}

// ============================================================================
// WITH RELATIONS (for display)
// ============================================================================

export interface SupplierContractWithRelations extends SupplierContract {
  supplier?: {
    id: string
    name: string
    first_name: string | null
    last_name: string | null
    company: string | null
    email: string | null
    phone: string | null
    company_record?: {
      id: string
      name: string
    } | null
  } | null
  building?: {
    id: string
    name: string
  } | null
  lot?: {
    id: string
    reference: string
  } | null
  documents?: SupplierContractDocument[]
}

// ============================================================================
// HELPERS
// ============================================================================

export const createEmptySupplierContractItem = (
  propertyReference: string,
  index: number
): SupplierContractFormItem => ({
  tempId: crypto.randomUUID(),
  reference: `CF-${propertyReference}-${String(index).padStart(3, '0')}`,
  supplierId: null,
  cost: null,
  costFrequency: '',
  endDate: '',
  noticePeriodValue: null,
  noticePeriodUnit: 'mois',
  description: '',
  files: [],
})
