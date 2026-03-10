/**
 * Hook for property document uploads (lots and buildings)
 *
 * Manages file staging, slot organization, progress tracking,
 * and upload to /api/property-documents/upload.
 * Mirrors useContractUploadByCategory but for property_documents table.
 */

import { useState, useMemo, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { GenericFileWithPreview, GenericDocumentSlotConfig, GenericDocumentSlotState, DocumentProgress } from '@/components/documents/types'
import { computeExpiryDate } from '@/lib/constants/property-document-slots'

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
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export interface UsePropertyDocumentUploadOptions {
  /** Entity type: lot or building */
  entityType: 'lot' | 'building'
  /** Entity ID (lot_id or building_id) — optional during creation */
  entityId?: string
  /** Team ID for the upload */
  teamId?: string
  /** Slot configurations for the entity type */
  slotConfigs: GenericDocumentSlotConfig[]
  /** Callback after successful uploads */
  onUploadComplete?: (documentIds: string[]) => void
  /** Callback on upload error */
  onUploadError?: (error: string) => void
}

export const usePropertyDocumentUpload = ({
  entityType,
  entityId,
  teamId,
  slotConfigs,
  onUploadComplete,
  onUploadError
}: UsePropertyDocumentUploadOptions) => {
  const [files, setFiles] = useState<GenericFileWithPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Validate a single file
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `Le fichier "${file.name}" dépasse la taille maximale de 50 MB`
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Le type de fichier "${file.name}" n'est pas autorisé`
    }
    return null
  }, [])

  // Add files to a specific slot
  const addFilesToSlot = useCallback((slotType: string, newFiles: File[]) => {
    const validatedFiles: GenericFileWithPreview[] = []
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

      const validationError = validateFile(file)
      if (validationError) {
        errors.push(validationError)
        return
      }

      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      // Auto-fill documentDate + validityDuration for slots with expiry
      const slotConfig = slotConfigs.find(s => s.type === slotType)
      const hasSlotExpiry = slotConfig?.hasExpiry
      const defaultDuration = slotConfig?.defaultValidityYears ? slotConfig.defaultValidityYears * 12 : undefined

      validatedFiles.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview,
        progress: 0,
        status: 'pending',
        documentType: slotType,
        ...(hasSlotExpiry && {
          documentDate: new Date().toISOString().split('T')[0],
          validityDuration: defaultDuration
        })
      })
    })

    if (validatedFiles.length > 0) {
      setFiles(prev => [...prev, ...validatedFiles])
    }

    if (errors.length > 0 && onUploadError) {
      onUploadError(errors.join('\n'))
    }
  }, [files, validateFile, onUploadError, slotConfigs])

  // Remove a file
  const removeFileFromSlot = useCallback((_slotType: string, fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  // Set document date for all files in a slot
  const setSlotDocumentDate = useCallback((slotType: string, date: string | undefined) => {
    setFiles(prev => prev.map(f =>
      f.documentType === slotType ? { ...f, documentDate: date } : f
    ))
  }, [])

  // Set validity duration for all files in a slot
  const setSlotValidityDuration = useCallback((slotType: string, duration: number | undefined) => {
    setFiles(prev => prev.map(f =>
      f.documentType === slotType ? { ...f, validityDuration: duration } : f
    ))
  }, [])

  // Set custom expiry date for all files in a slot (when "Personnalisé" is selected)
  const setSlotCustomExpiry = useCallback((slotType: string, date: string | undefined) => {
    setFiles(prev => prev.map(f =>
      f.documentType === slotType ? { ...f, validityCustomExpiry: date } : f
    ))
  }, [])

  // Organize files by slot type
  const filesByType = useMemo(() => {
    const map = new Map<string, GenericFileWithPreview[]>()
    slotConfigs.forEach(slot => map.set(slot.type, []))
    files.forEach(file => {
      const existing = map.get(file.documentType) || []
      map.set(file.documentType, [...existing, file])
    })
    return map
  }, [files, slotConfigs])

  // Slot states
  const slots = useMemo((): GenericDocumentSlotState[] => {
    return slotConfigs.map(config => {
      const slotFiles = filesByType.get(config.type) || []
      return {
        ...config,
        files: slotFiles,
        hasFiles: slotFiles.length > 0,
        fileCount: slotFiles.length
      }
    })
  }, [slotConfigs, filesByType])

  // Progress (recommended documents only)
  const progress = useMemo((): DocumentProgress => {
    const recommendedSlots = slots.filter(s => s.recommended)
    const uploadedRecommended = recommendedSlots.filter(s => s.hasFiles).length
    const total = recommendedSlots.length
    return {
      uploaded: uploadedRecommended,
      total,
      percentage: total > 0 ? Math.round((uploadedRecommended / total) * 100) : 0
    }
  }, [slots])

  // Missing recommended types
  const missingRecommendedTypes = useMemo((): string[] => {
    return slotConfigs
      .filter(s => s.recommended)
      .filter(s => {
        const slotFiles = filesByType.get(s.type) || []
        return slotFiles.length === 0
      })
      .map(s => s.type)
  }, [slotConfigs, filesByType])

  // Upload all pending files
  const uploadFiles = useCallback(async (
    overrideEntityId?: string,
    overrideTeamId?: string
  ): Promise<string[]> => {
    const targetEntityId = overrideEntityId || entityId
    const targetTeamId = overrideTeamId || teamId

    if (!targetEntityId || !targetTeamId) {
      logger.warn('Missing entityId or teamId for property document upload')
      onUploadError?.('ID de l\'entité et de l\'équipe requis pour l\'upload')
      return []
    }

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error')
    if (pendingFiles.length === 0) {
      return files.filter(f => f.documentId).map(f => f.documentId!)
    }

    setIsUploading(true)

    try {
      const uploadPromises = pendingFiles.map(async (fileWithPreview) => {
        setFiles(prev => prev.map(f =>
          f.id === fileWithPreview.id ? { ...f, status: 'uploading' as const } : f
        ))

        try {
          const formData = new FormData()
          formData.append('file', fileWithPreview.file)
          formData.append('document_type', fileWithPreview.documentType)
          formData.append('team_id', targetTeamId)

          if (entityType === 'building') {
            formData.append('building_id', targetEntityId)
          } else {
            formData.append('lot_id', targetEntityId)
          }

          const computedExpiry = computeExpiryDate(
            fileWithPreview.documentDate,
            fileWithPreview.validityDuration,
            fileWithPreview.validityCustomExpiry
          )
          if (computedExpiry) {
            formData.append('expiry_date', computedExpiry)
          }
          if (fileWithPreview.documentDate) {
            formData.append('document_date', fileWithPreview.documentDate)
          }

          formData.append('title', `${fileWithPreview.documentType} - ${fileWithPreview.file.name}`)

          const response = await fetch('/api/property-documents/upload', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de l\'upload')
          }

          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id ? {
              ...f,
              status: 'completed' as const,
              progress: 100,
              documentId: result.document.id
            } : f
          ))

          return result.document.id
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
          logger.error({ error, file: fileWithPreview.file.name }, 'Property document upload error')

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
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value)

      const failed = results.filter(r => r.status === 'rejected')

      if (successfulIds.length > 0) onUploadComplete?.(successfulIds)
      if (failed.length > 0) onUploadError?.(`${failed.length} fichier(s) non uploadé(s)`)

      return successfulIds
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de l\'upload'
      logger.error({ error }, 'Property document upload error')
      onUploadError?.(msg)
      return []
    } finally {
      setIsUploading(false)
    }
  }, [entityType, entityId, teamId, files, onUploadComplete, onUploadError])

  // Clear all files
  const clearFiles = useCallback(() => {
    files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
    setFiles([])
  }, [files])

  return {
    slots,
    files,
    filesByType,
    addFilesToSlot,
    removeFileFromSlot,
    setSlotDocumentDate,
    setSlotValidityDuration,
    setSlotCustomExpiry,
    uploadFiles,
    clearFiles,
    progress,
    missingRecommendedTypes,
    isUploading,
    hasFiles: files.length > 0,
    hasPendingUploads: files.some(f => f.status === 'pending' || f.status === 'uploading')
  }
}

export type UsePropertyDocumentUploadReturn = ReturnType<typeof usePropertyDocumentUpload>
