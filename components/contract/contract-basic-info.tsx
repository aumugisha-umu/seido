'use client'

import type { RefObject } from 'react'
import LeaseFormDetailsMerged from '@/components/contract/lease-form-details-merged-v1'
import type { ContactSelectorRef } from '@/components/contact-selector'
import type {
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
} from '@/lib/types/contract.types'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
}

interface ContractBasicInfoProps {
  lotReference: string | undefined
  formData: Partial<ContractFormData>
  selectedTenants: Contact[]
  selectedGuarantors: Contact[]
  onFieldChange: (field: string, value: unknown) => void
  onAddContact: (contactType: string) => void
  onRemoveContact: (contactId: string, role: ContractContactRole) => void
  contactSelectorRef: RefObject<ContactSelectorRef | null>
  teamId: string
  mode: 'create' | 'edit'
  addContact: (contactId: string, role: ContractContactRole) => void
  saveAndRedirect: (path: string, params: Record<string, string>) => void
  lotId: string | undefined
  existingContractId: string | undefined
  onOverlapCheckChange: (result: { hasOverlap: boolean; hasDuplicateTenant: boolean } | null) => void
}

export function ContractBasicInfo({
  lotReference,
  formData,
  selectedTenants,
  selectedGuarantors,
  onFieldChange,
  onAddContact,
  onRemoveContact,
  contactSelectorRef,
  teamId,
  mode,
  addContact,
  saveAndRedirect,
  lotId,
  existingContractId,
  onOverlapCheckChange,
}: ContractBasicInfoProps) {
  return (
    <LeaseFormDetailsMerged
      lotReference={lotReference}
      title={formData.title || ''}
      startDate={formData.startDate || ''}
      durationMonths={formData.durationMonths || 12}
      signedDate={formData.signedDate || ''}
      comments={formData.comments || ''}
      paymentFrequency={formData.paymentFrequency as PaymentFrequency || 'mensuel'}
      rentAmount={formData.rentAmount || 0}
      chargesAmount={formData.chargesAmount || 0}
      chargesType={(formData as Record<string, unknown>).chargesType as string || 'forfaitaire'}
      selectedTenants={selectedTenants}
      selectedGuarantors={selectedGuarantors}
      guaranteeType={formData.guaranteeType as GuaranteeType || 'pas_de_garantie'}
      guaranteeAmount={formData.guaranteeAmount}
      guaranteeNotes={formData.guaranteeNotes || ''}
      onFieldChange={(field, value) => onFieldChange(field as string, value)}
      onAddContact={onAddContact}
      onRemoveContact={onRemoveContact}
      contactSelectorRef={contactSelectorRef}
      teamId={teamId}
      mode={mode}
      addContact={addContact}
      saveAndRedirect={saveAndRedirect}
      lotId={lotId}
      existingContractId={existingContractId}
      onOverlapCheckChange={onOverlapCheckChange}
    />
  )
}
