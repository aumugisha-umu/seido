"use client"

/**
 * DocumentSlot - Lease-specific document slot (thin wrapper)
 *
 * Wraps DocumentSlotGeneric with ContractDocumentType typing.
 * All visual logic lives in the generic component.
 */

import { DocumentSlotGeneric } from '@/components/documents/document-slot-generic'
import type { ContractFileWithPreview } from '@/hooks/use-contract-upload'
import type { ContractDocumentType } from '@/lib/types/contract.types'

interface DocumentSlotProps {
  type: ContractDocumentType
  label: string
  hint?: string
  icon: string
  recommended: boolean
  allowMultiple: boolean
  files: ContractFileWithPreview[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (fileId: string) => void
  disabled?: boolean
  compact?: boolean
  hasExpiry?: boolean
  expiryDate?: string
  onExpiryDateChange?: (date: string | undefined) => void
  className?: string
}

export function DocumentSlot(props: DocumentSlotProps) {
  return <DocumentSlotGeneric {...props} />
}

export default DocumentSlot
