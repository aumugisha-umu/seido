"use client"

/**
 * DocumentChecklist - Lease-specific document checklist (thin wrapper)
 *
 * Wraps DocumentChecklistGeneric with lease-specific title and types.
 * All visual logic lives in the generic component.
 */

import { DocumentChecklistGeneric } from '@/components/documents/document-checklist-generic'
import type { DocumentSlotState } from '@/hooks/use-contract-upload-by-category'
import type { ContractDocumentType } from '@/lib/types/contract.types'

interface DocumentChecklistProps {
  slots: DocumentSlotState[]
  onAddFilesToSlot: (slotType: ContractDocumentType, files: File[]) => void
  onRemoveFileFromSlot: (slotType: ContractDocumentType, fileId: string) => void
  progress: {
    uploaded: number
    total: number
    percentage: number
  }
  missingRecommendedDocuments: ContractDocumentType[]
  isUploading?: boolean
  /** Callback to set expiry date for all files in a slot */
  onSetSlotExpiryDate?: (slotType: string, date: string | undefined) => void
  className?: string
}

export function DocumentChecklist({
  slots,
  onAddFilesToSlot,
  onRemoveFileFromSlot,
  progress,
  missingRecommendedDocuments,
  isUploading = false,
  onSetSlotExpiryDate,
  className
}: DocumentChecklistProps) {
  return (
    <DocumentChecklistGeneric
      title="Documents du bail"
      slots={slots}
      onAddFilesToSlot={onAddFilesToSlot}
      onRemoveFileFromSlot={onRemoveFileFromSlot}
      progress={progress}
      missingRecommendedTypes={missingRecommendedDocuments}
      isUploading={isUploading}
      onSetSlotExpiryDate={onSetSlotExpiryDate}
      className={className}
    />
  )
}

export default DocumentChecklist
