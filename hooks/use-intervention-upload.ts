import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

// Allowed MIME types (matching server-side validation)
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
  'text/plain',
  'application/zip'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// Use actual SQL enum type from database
export type InterventionDocumentType = Database['public']['Enums']['intervention_document_type']

// Document type options with French labels
export const DOCUMENT_TYPES: { value: InterventionDocumentType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'photo_avant', label: 'Photo avant travaux' },
  { value: 'photo_apres', label: 'Photo après travaux' },
  { value: 'devis', label: 'Devis' },
  { value: 'facture', label: 'Facture' },
  { value: 'rapport', label: 'Rapport d\'intervention' },
  { value: 'plan', label: 'Plan' },
  { value: 'certificat', label: 'Certificat' },
  { value: 'garantie', label: 'Garantie' },
  { value: 'bon_de_commande', label: 'Bon de commande' },
  { value: 'autre', label: 'Autre' }
]

export interface FileWithPreview {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  documentId?: string
  signedUrl?: string
  documentType: InterventionDocumentType // Type per file
}

export interface UseInterventionUploadOptions {
  interventionId?: string // Optional because intervention might not exist yet
  documentType?: InterventionDocumentType
  onUploadComplete?: (documentIds: string[]) => void
  onUploadError?: (error: string) => void
}

export const useInterventionUpload = ({
  interventionId,
  documentType = 'autre',
  onUploadComplete,
  onUploadError
}: UseInterventionUploadOptions) => {
  const [files, setFiles] = useState<FileWithPreview[]>([])
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
      return `Le fichier "${file.name}" dépasse la taille maximale de 10 MB`
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Le type de fichier "${file.name}" n'est pas autorisé`
    }

    return null
  }, [])

  // Add files with validation and preview generation
  // Optional defaultDocumentType allows setting type for specific file sources (e.g., 'email' for email PDFs)
  const addFiles = useCallback((newFiles: File[], defaultDocumentType: InterventionDocumentType = 'photo_avant') => {
    const validatedFiles: FileWithPreview[] = []
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
        documentType: defaultDocumentType
      })
    })

    if (validatedFiles.length > 0) {
      setFiles(prev => [...prev, ...validatedFiles])
    }

    if (errors.length > 0 && onUploadError) {
      onUploadError(errors.join('\n'))
    }
  }, [files, validateFile, onUploadError])

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
  const updateFileDocumentType = useCallback((fileId: string, documentType: InterventionDocumentType) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, documentType } : f
    ))
  }, [])

  // Upload all pending files
  const uploadFiles = useCallback(async (): Promise<string[]> => {
    // Allow upload without interventionId for pre-upload scenario
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

          // InterventionId is optional - can be linked later
          if (interventionId) {
            formData.append('interventionId', interventionId)
          }

          formData.append('documentType', fileWithPreview.documentType)
          formData.append('description', `Document ${fileWithPreview.documentType} - ${fileWithPreview.file.name}`)

          const response = await fetch('/api/upload-intervention-document', {
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

          logger.error('❌ Intervention file upload error:', { error, file: fileWithPreview.file.name })

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

      logger.info(`✅ Intervention upload completed: ${successfulIds.length} successful, ${failed.length} failed`)

      return successfulIds

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload des fichiers'
      logger.error('❌ Intervention upload error:', error)

      if (onUploadError) {
        onUploadError(errorMessage)
      }

      return []
    } finally {
      setIsUploading(false)
    }
  }, [interventionId, documentType, files, onUploadComplete, onUploadError])

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

  const uploadProgress: Record<string, number> = {}
  files.forEach(f => {
    uploadProgress[f.id] = f.progress
  })

  return {
    files,
    isUploading,
    uploadProgress,
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
