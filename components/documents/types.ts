/**
 * Generic types for document upload components
 * Used across lease, lot, and building document flows
 */

/** A file staged for upload or already uploaded */
export interface GenericFileWithPreview {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  documentId?: string
  signedUrl?: string
  documentType: string
  /** Optional expiry date for property documents */
  expiryDate?: string
}

/** Configuration for a single document slot */
export interface GenericDocumentSlotConfig {
  type: string
  label: string
  recommended: boolean
  allowMultiple: boolean
  hint?: string
  icon: string
  /** Whether this document type has an expiry date */
  hasExpiry?: boolean
  /** Default validity period in years (used to auto-calculate expiry) */
  defaultValidityYears?: number
}

/** Runtime state of a document slot (config + current files) */
export interface GenericDocumentSlotState extends GenericDocumentSlotConfig {
  files: GenericFileWithPreview[]
  hasFiles: boolean
  fileCount: number
}

/** Props for progress display */
export interface DocumentProgress {
  uploaded: number
  total: number
  percentage: number
}
