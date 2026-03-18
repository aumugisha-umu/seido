/**
 * Hook for managing document uploads across multiple lots simultaneously.
 *
 * Since React hooks can't be called in loops (variable lot count),
 * this hook manages all lot document states in a single Map-based state.
 * Each lot gets its own virtual "slot state" that mirrors UsePropertyDocumentUploadReturn.
 */

import { useState, useMemo, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { GenericFileWithPreview, GenericDocumentSlotConfig, GenericDocumentSlotState, DocumentProgress } from '@/components/documents/types'
import type { UsePropertyDocumentUploadReturn } from '@/hooks/use-property-document-upload'
import { computeExpiryDate } from '@/lib/constants/property-document-slots'

import { ALLOWED_DOCUMENT_MIME_TYPES } from '@/lib/constants/mime-types'

const ALLOWED_MIME_TYPES = ALLOWED_DOCUMENT_MIME_TYPES
const MAX_FILE_SIZE = 50 * 1024 * 1024

interface UseMultiLotDocumentUploadOptions {
  /** Lot IDs to track */
  lotIds: string[]
  /** Team ID */
  teamId?: string
  /** Slot configs for lots */
  slotConfigs: GenericDocumentSlotConfig[]
  /** Error callback */
  onUploadError?: (err: string) => void
}

export const useMultiLotDocumentUpload = ({
  lotIds,
  teamId,
  slotConfigs,
  onUploadError
}: UseMultiLotDocumentUploadOptions) => {
  // All files across all lots: Map<lotId, files[]>
  const [filesByLot, setFilesByLot] = useState<Map<string, GenericFileWithPreview[]>>(new Map())
  const [isUploading, setIsUploading] = useState(false)

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `"${file.name}" dépasse 50 MB`
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return `Type "${file.name}" non autorisé`
    return null
  }, [])

  // Build per-lot upload interface that matches UsePropertyDocumentUploadReturn
  const getLotUpload = useCallback((lotId: string): UsePropertyDocumentUploadReturn => {
    const lotFiles = filesByLot.get(lotId) || []

    // Group files by slot type
    const filesByType = new Map<string, GenericFileWithPreview[]>()
    lotFiles.forEach(f => {
      const existing = filesByType.get(f.documentType) || []
      existing.push(f)
      filesByType.set(f.documentType, existing)
    })

    // Build slot states
    const slots: GenericDocumentSlotState[] = slotConfigs.map(config => {
      const slotFiles = filesByType.get(config.type) || []
      return {
        ...config,
        files: slotFiles,
        hasFiles: slotFiles.length > 0,
        fileCount: slotFiles.length
      }
    })

    // Progress
    const recommendedSlots = slots.filter(s => s.recommended)
    const uploadedRecommended = recommendedSlots.filter(s => s.hasFiles).length
    const totalRecommended = recommendedSlots.length
    const progress: DocumentProgress = {
      uploaded: uploadedRecommended,
      total: totalRecommended,
      percentage: totalRecommended > 0 ? Math.round((uploadedRecommended / totalRecommended) * 100) : 0
    }

    const missingRecommendedTypes = slotConfigs
      .filter(s => s.recommended)
      .filter(s => !(filesByType.get(s.type) || []).length)
      .map(s => s.type)

    const addFilesToSlot = (slotType: string, newFiles: File[]) => {
      const validated: GenericFileWithPreview[] = []
      newFiles.forEach(file => {
        const error = validateFile(file)
        if (error) {
          onUploadError?.(error)
          return
        }
        const isDuplicate = lotFiles.some(f =>
          f.file.name === file.name && f.file.size === file.size && f.file.lastModified === file.lastModified
        )
        if (isDuplicate) {
          onUploadError?.(`"${file.name}" déjà ajouté`)
          return
        }
        // Auto-fill documentDate + validityDuration for slots with expiry
        const slotConfig = slotConfigs.find(s => s.type === slotType)
        const hasSlotExpiry = slotConfig?.hasExpiry
        const defaultDuration = slotConfig?.defaultValidityYears ? slotConfig.defaultValidityYears * 12 : undefined

        validated.push({
          id: `${lotId}-${slotType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          documentType: slotType,
          progress: 0,
          status: 'pending',
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          ...(hasSlotExpiry && {
            documentDate: new Date().toISOString().split('T')[0],
            validityDuration: defaultDuration
          })
        })
      })
      if (validated.length > 0) {
        setFilesByLot(prev => {
          const next = new Map(prev)
          next.set(lotId, [...(next.get(lotId) || []), ...validated])
          return next
        })
      }
    }

    const removeFileFromSlot = (_slotType: string, fileId: string) => {
      setFilesByLot(prev => {
        const next = new Map(prev)
        const current = next.get(lotId) || []
        const file = current.find(f => f.id === fileId)
        if (file?.preview) URL.revokeObjectURL(file.preview)
        next.set(lotId, current.filter(f => f.id !== fileId))
        return next
      })
    }

    const setSlotDocumentDate = (slotType: string, date: string | undefined) => {
      setFilesByLot(prev => {
        const next = new Map(prev)
        const current = next.get(lotId) || []
        next.set(lotId, current.map(f => f.documentType === slotType ? { ...f, documentDate: date } : f))
        return next
      })
    }

    const setSlotValidityDuration = (slotType: string, duration: number | undefined) => {
      setFilesByLot(prev => {
        const next = new Map(prev)
        const current = next.get(lotId) || []
        next.set(lotId, current.map(f => f.documentType === slotType ? { ...f, validityDuration: duration } : f))
        return next
      })
    }

    const setSlotCustomExpiry = (slotType: string, date: string | undefined) => {
      setFilesByLot(prev => {
        const next = new Map(prev)
        const current = next.get(lotId) || []
        next.set(lotId, current.map(f => f.documentType === slotType ? { ...f, validityCustomExpiry: date } : f))
        return next
      })
    }

    // Upload all pending files for this lot
    const uploadFiles = async (overrideEntityId?: string, overrideTeamId?: string) => {
      const pending = lotFiles.filter(f => f.status === 'pending')
      if (pending.length === 0) return

      const effectiveTeamId = overrideTeamId || teamId
      const entityId = overrideEntityId
      if (!entityId || !effectiveTeamId) {
        onUploadError?.('Missing entity ID or team ID')
        throw new Error('Missing entity ID or team ID for document upload')
      }

      setIsUploading(true)
      try {
        for (const fileState of pending) {
          const formData = new FormData()
          formData.append('file', fileState.file)
          // BUG FIX: API expects snake_case field names (lot_id, team_id, etc.)
          formData.append('lot_id', entityId)
          formData.append('team_id', effectiveTeamId)
          formData.append('document_type', fileState.documentType)
          formData.append('title', `${fileState.documentType} - ${fileState.file.name}`)
          const computedExpiry = computeExpiryDate(fileState.documentDate, fileState.validityDuration, fileState.validityCustomExpiry)
          if (computedExpiry) formData.append('expiry_date', computedExpiry)
          if (fileState.documentDate) formData.append('document_date', fileState.documentDate)

          const res = await fetch('/api/property-documents/upload', { method: 'POST', body: formData })
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Upload failed' }))
            throw new Error(err.error || 'Upload failed')
          }

          // Extract document ID from API response
          const result = await res.json()

          // Mark as completed with document ID
          setFilesByLot(prev => {
            const next = new Map(prev)
            const current = next.get(lotId) || []
            next.set(lotId, current.map(f => f.id === fileState.id ? {
              ...f,
              status: 'completed' as const,
              progress: 100,
              documentId: result.document?.id
            } : f))
            return next
          })
        }
        logger.info(`Uploaded ${pending.length} files for lot ${lotId}`)
      } catch (err) {
        onUploadError?.(err instanceof Error ? err.message : 'Upload error')
        throw err
      } finally {
        setIsUploading(false)
      }
    }

    const clearFiles = () => {
      setFilesByLot(prev => {
        const next = new Map(prev)
        const current = next.get(lotId) || []
        current.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
        next.set(lotId, [])
        return next
      })
    }

    return {
      slots,
      files: lotFiles,
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
      hasFiles: lotFiles.length > 0,
      hasPendingUploads: lotFiles.some(f => f.status === 'pending' || f.status === 'uploading')
    }
  }, [filesByLot, slotConfigs, teamId, validateFile, onUploadError])

  // Build the map of lotId → upload interface
  const lotDocUploads = useMemo(() => {
    const result: { [lotId: string]: UsePropertyDocumentUploadReturn } = {}
    lotIds.forEach(lotId => {
      result[lotId] = getLotUpload(lotId)
    })
    return result
  }, [lotIds, getLotUpload])

  // Aggregate: any lot has files?
  const hasAnyFiles = useMemo(() => {
    return Array.from(filesByLot.values()).some(files => files.length > 0)
  }, [filesByLot])

  return {
    lotDocUploads,
    hasAnyFiles,
    isUploading,
    /** Upload files for a specific lot (call after lot creation with real ID) */
    uploadForLot: async (tempLotId: string, realLotId: string, lotTeamId?: string) => {
      const upload = getLotUpload(tempLotId)
      await upload.uploadFiles(realLotId, lotTeamId)
    }
  }
}
