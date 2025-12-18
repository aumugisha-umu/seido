import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { ContractDocumentType, CONTRACT_DOCUMENT_TYPE_LABELS } from '@/lib/types/contract.types'

// Allowed MIME types (matching server-side validation and bucket config)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB (matching bucket config)

// Document type options with French labels - ordered by relevance for contract creation
export const CONTRACT_DOCUMENT_TYPES: { value: ContractDocumentType; label: string }[] = [
  { value: 'bail', label: CONTRACT_DOCUMENT_TYPE_LABELS.bail },
  { value: 'etat_des_lieux_entree', label: CONTRACT_DOCUMENT_TYPE_LABELS.etat_des_lieux_entree },
  { value: 'attestation_assurance', label: CONTRACT_DOCUMENT_TYPE_LABELS.attestation_assurance },
  { value: 'justificatif_identite', label: CONTRACT_DOCUMENT_TYPE_LABELS.justificatif_identite },
  { value: 'justificatif_revenus', label: CONTRACT_DOCUMENT_TYPE_LABELS.justificatif_revenus },
  { value: 'diagnostic', label: CONTRACT_DOCUMENT_TYPE_LABELS.diagnostic },
  { value: 'caution_bancaire', label: CONTRACT_DOCUMENT_TYPE_LABELS.caution_bancaire },
  { value: 'reglement_copropriete', label: CONTRACT_DOCUMENT_TYPE_LABELS.reglement_copropriete },
  { value: 'avenant', label: CONTRACT_DOCUMENT_TYPE_LABELS.avenant },
  { value: 'etat_des_lieux_sortie', label: CONTRACT_DOCUMENT_TYPE_LABELS.etat_des_lieux_sortie },
  { value: 'quittance', label: CONTRACT_DOCUMENT_TYPE_LABELS.quittance },
  { value: 'autre', label: CONTRACT_DOCUMENT_TYPE_LABELS.autre },
]

export interface ContractFileWithPreview {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  documentId?: string
  signedUrl?: string
  documentType: ContractDocumentType
}

export interface UseContractUploadOptions {
  contractId?: string // Optional because contract might not exist yet during creation
  defaultDocumentType?: ContractDocumentType
  onUploadComplete?: (documentIds: string[]) => void
  onUploadError?: (error: string) => void
}

export const useContractUpload = ({
  contractId,
  defaultDocumentType = 'autre',
  onUploadComplete,
  onUploadError
}: UseContractUploadOptions = {}) => {
  const [files, setFiles] = useState<ContractFileWithPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
    }
  }, [files])

  // Validate a single file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `Le fichier "${file.name}" dépasse la taille maximale de 50 MB`
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Le type de fichier "${file.name}" n'est pas autorisé`
    }

    return null
  }, [])

  // Smart default document type based on filename
  const getSmartDefaultType = useCallback((filename: string): ContractDocumentType => {
    const lowerFilename = filename.toLowerCase()

    if (lowerFilename.includes('bail') || lowerFilename.includes('contrat')) return 'bail'
    if (lowerFilename.includes('etat') && lowerFilename.includes('lieux')) {
      if (lowerFilename.includes('sortie')) return 'etat_des_lieux_sortie'
      return 'etat_des_lieux_entree'
    }
    if (lowerFilename.includes('assurance')) return 'attestation_assurance'
    if (lowerFilename.includes('identite') || lowerFilename.includes('cni') || lowerFilename.includes('passeport')) return 'justificatif_identite'
    if (lowerFilename.includes('salaire') || lowerFilename.includes('revenus') || lowerFilename.includes('impot')) return 'justificatif_revenus'
    if (lowerFilename.includes('dpe') || lowerFilename.includes('diagnostic') || lowerFilename.includes('plomb') || lowerFilename.includes('amiante')) return 'diagnostic'
    if (lowerFilename.includes('caution') || lowerFilename.includes('garantie')) return 'caution_bancaire'
    if (lowerFilename.includes('reglement') || lowerFilename.includes('copropriete')) return 'reglement_copropriete'
    if (lowerFilename.includes('avenant')) return 'avenant'
    if (lowerFilename.includes('quittance')) return 'quittance'

    return defaultDocumentType
  }, [defaultDocumentType])

  // Add files with validation and preview generation
  const addFiles = useCallback((newFiles: File[]) => {
    const validatedFiles: ContractFileWithPreview[] = []
    const errors: string[] = []

    newFiles.forEach(file => {
      // Check for duplicates
      const isDuplicate = files.some(f =>
        f.file.name === file.name &&
        f.file.size === file.size &&
        f.file.lastModified === file.lastModified
      )

      if (isDuplicate) {
        errors.push(`Le fichier "${file.name}" est déjà dans la liste`)
        return
      }

      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(validationError)
        return
      }

      // Generate preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      validatedFiles.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview,
        progress: 0,
        status: 'pending',
        documentType: getSmartDefaultType(file.name)
      })
    })

    if (validatedFiles.length > 0) {
      setFiles(prev => [...prev, ...validatedFiles])
    }

    if (errors.length > 0 && onUploadError) {
      onUploadError(errors.join('\n'))
    }
  }, [files, validateFile, getSmartDefaultType, onUploadError])

  // Remove a file from the list
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  // Update document type for a specific file
  const updateFileDocumentType = useCallback((fileId: string, documentType: ContractDocumentType) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, documentType } : f
    ))
  }, [])

  // Upload all pending files
  const uploadFiles = useCallback(async (overrideContractId?: string): Promise<string[]> => {
    const targetContractId = overrideContractId || contractId

    if (!targetContractId) {
      logger.warn('No contractId provided for upload')
      if (onUploadError) {
        onUploadError('ID du contrat requis pour l\'upload')
      }
      return []
    }

    if (files.length === 0) {
      return []
    }

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error')
    if (pendingFiles.length === 0) {
      // All files already uploaded, return their IDs
      return files.filter(f => f.documentId).map(f => f.documentId!)
    }

    setIsUploading(true)

    try {
      const uploadPromises = pendingFiles.map(async (fileWithPreview) => {
        // Update status to uploading
        setFiles(prev => prev.map(f =>
          f.id === fileWithPreview.id ? { ...f, status: 'uploading' as const } : f
        ))

        try {
          const formData = new FormData()
          formData.append('file', fileWithPreview.file)
          formData.append('contractId', targetContractId)
          formData.append('documentType', fileWithPreview.documentType)
          formData.append('description', `Document ${fileWithPreview.documentType} - ${fileWithPreview.file.name}`)

          const response = await fetch('/api/upload-contract-document', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de l\'upload')
          }

          // Update status to completed
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id ? {
              ...f,
              status: 'completed' as const,
              progress: 100,
              documentId: result.document.id,
              signedUrl: result.document.signedUrl
            } : f
          ))

          return result.document.id

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

          logger.error({ error, file: fileWithPreview.file.name }, 'Contract file upload error')

          // Update status to error
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id ? {
              ...f,
              status: 'error' as const,
              error: errorMessage
            } : f
          ))

          throw error
        }
      })

      const results = await Promise.allSettled(uploadPromises)

      const successfulIds = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)

      const failed = results.filter(result => result.status === 'rejected')

      if (successfulIds.length > 0 && onUploadComplete) {
        onUploadComplete(successfulIds)
      }

      if (failed.length > 0 && onUploadError) {
        onUploadError(`${failed.length} fichier(s) n'ont pas pu être uploadés`)
      }

      logger.info({ successful: successfulIds.length, failed: failed.length }, 'Contract upload completed')

      return successfulIds

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload des fichiers'
      logger.error({ error }, 'Contract upload error')

      if (onUploadError) {
        onUploadError(errorMessage)
      }

      return []
    } finally {
      setIsUploading(false)
    }
  }, [contractId, files, onUploadComplete, onUploadError])

  // Clear all files
  const clearFiles = useCallback(() => {
    // Cleanup previews
    files.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview)
      }
    })
    setFiles([])
  }, [files])

  // Calculate stats
  const completedFiles = files.filter(f => f.status === 'completed')
  const errorFiles = files.filter(f => f.status === 'error')
  const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'uploading')

  return {
    files,
    isUploading,
    completedCount: completedFiles.length,
    errorCount: errorFiles.length,
    pendingCount: pendingFiles.length,
    addFiles,
    removeFile,
    updateFileDocumentType,
    uploadFiles,
    clearFiles,
    hasFiles: files.length > 0,
    hasPendingUploads: pendingFiles.length > 0
  }
}
