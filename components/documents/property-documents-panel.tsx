"use client"

/**
 * PropertyDocumentsPanel — Self-contained panel for lot/building detail pages
 *
 * Fetches existing property documents, organizes them by slot type,
 * supports uploading new documents and deleting existing ones.
 * Uses DocumentSlotGeneric for each slot with expiry date support.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Paperclip,
  CheckCircle2,
  Loader2,
  FileText,
  Trash2,
  Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentSlotGeneric } from './document-slot-generic'
import { toast } from 'sonner'
import type { GenericDocumentSlotConfig, GenericFileWithPreview } from './types'

interface ExistingDocument {
  id: string
  document_type: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  storage_bucket: string
  expiry_date: string | null
  uploaded_at: string
  title: string | null
  description: string | null
}

interface PropertyDocumentsPanelProps {
  /** 'lot' or 'building' */
  entityType: 'lot' | 'building'
  /** The lot or building ID */
  entityId: string
  /** Team ID for uploads */
  teamId: string
  /** Slot configurations (LOT_DOCUMENT_SLOTS or BUILDING_DOCUMENT_SLOTS) */
  slotConfigs: GenericDocumentSlotConfig[]
  /** Card title */
  title?: string
  /** Additional CSS class */
  className?: string
}

/** Compute expiry status from ISO date string */
function getExpiryStatus(expiryDate?: string | null): {
  status: 'valid' | 'expiring_soon' | 'expired' | 'none'
  label: string
} {
  if (!expiryDate) return { status: 'none', label: '' }

  const now = new Date()
  const expiry = new Date(expiryDate)
  const diffMs = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { status: 'expired', label: 'Expiré' }
  }
  if (diffDays <= 90) {
    const months = Math.ceil(diffDays / 30)
    return {
      status: 'expiring_soon',
      label: months <= 1 ? `Expire dans ${diffDays}j` : `Expire dans ${months} mois`
    }
  }
  return {
    status: 'valid',
    label: `Valide jusqu'au ${expiry.toLocaleDateString('fr-BE')}`
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PropertyDocumentsPanel({
  entityType,
  entityId,
  teamId,
  slotConfigs,
  title,
  className
}: PropertyDocumentsPanelProps) {
  const [existingDocs, setExistingDocs] = useState<ExistingDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Staged files for new uploads (per slot type)
  const [stagedFiles, setStagedFiles] = useState<Record<string, GenericFileWithPreview[]>>({})
  const [isUploading, setIsUploading] = useState(false)

  const panelTitle = title || (entityType === 'lot' ? 'Documents du lot' : "Documents de l'immeuble")

  // Fetch existing documents
  const fetchDocuments = useCallback(async () => {
    try {
      const param = entityType === 'lot' ? `lotId=${entityId}` : `buildingId=${entityId}`
      const response = await fetch(`/api/property-documents?${param}`)
      if (!response.ok) throw new Error('Failed to fetch documents')
      const data = await response.json()
      if (data.success) {
        setExistingDocs(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching property documents:', error)
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Group existing docs by document_type
  const docsByType = useMemo(() => {
    const map: Record<string, ExistingDocument[]> = {}
    for (const doc of existingDocs) {
      if (!map[doc.document_type]) map[doc.document_type] = []
      map[doc.document_type].push(doc)
    }
    return map
  }, [existingDocs])

  // Progress: count recommended slots that have at least one existing document
  const progress = useMemo(() => {
    const recommendedSlots = slotConfigs.filter(s => s.recommended)
    const uploaded = recommendedSlots.filter(s => (docsByType[s.type]?.length || 0) > 0).length
    const total = recommendedSlots.length
    return {
      uploaded,
      total,
      percentage: total > 0 ? Math.round((uploaded / total) * 100) : 0
    }
  }, [slotConfigs, docsByType])

  // Separate slots into recommended, optional, and autre
  const { recommendedSlots, optionalSlots, autreSlot } = useMemo(() => {
    return {
      recommendedSlots: slotConfigs.filter(s => s.recommended),
      optionalSlots: slotConfigs.filter(s => !s.recommended && s.type !== 'autre'),
      autreSlot: slotConfigs.find(s => s.type === 'autre') ?? null
    }
  }, [slotConfigs])

  // Handle staging files for a slot
  const addFilesToSlot = useCallback((slotType: string, files: File[]) => {
    setStagedFiles(prev => {
      const existing = prev[slotType] || []
      const newFiles: GenericFileWithPreview[] = files.map(file => ({
        id: `staged-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'pending' as const
      }))
      return { ...prev, [slotType]: [...existing, ...newFiles] }
    })
  }, [])

  const removeFileFromSlot = useCallback((slotType: string, fileId: string) => {
    setStagedFiles(prev => {
      const filtered = (prev[slotType] || []).filter(f => f.id !== fileId)
      return { ...prev, [slotType]: filtered }
    })
  }, [])

  // Upload staged files for a specific slot
  const uploadStagedFiles = useCallback(async (slotType: string) => {
    const files = stagedFiles[slotType]
    if (!files || files.length === 0) return

    setIsUploading(true)
    let successCount = 0

    for (const fileEntry of files) {
      try {
        // Mark as uploading
        setStagedFiles(prev => ({
          ...prev,
          [slotType]: (prev[slotType] || []).map(f =>
            f.id === fileEntry.id ? { ...f, status: 'uploading' as const } : f
          )
        }))

        const formData = new FormData()
        formData.append('file', fileEntry.file)
        formData.append('document_type', slotType)
        formData.append('team_id', teamId)
        if (entityType === 'lot') {
          formData.append('lot_id', entityId)
        } else {
          formData.append('building_id', entityId)
        }

        const response = await fetch('/api/property-documents/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Upload failed')
        }

        // Mark as completed
        setStagedFiles(prev => ({
          ...prev,
          [slotType]: (prev[slotType] || []).map(f =>
            f.id === fileEntry.id ? { ...f, status: 'completed' as const } : f
          )
        }))
        successCount++
      } catch (error) {
        setStagedFiles(prev => ({
          ...prev,
          [slotType]: (prev[slotType] || []).map(f =>
            f.id === fileEntry.id ? { ...f, status: 'error' as const, error: (error as Error).message } : f
          )
        }))
      }
    }

    setIsUploading(false)

    if (successCount > 0) {
      toast.success(`${successCount} document${successCount > 1 ? 's' : ''} uploadé${successCount > 1 ? 's' : ''}`)
      // Clear completed staged files and refresh
      setStagedFiles(prev => ({
        ...prev,
        [slotType]: (prev[slotType] || []).filter(f => f.status !== 'completed')
      }))
      await fetchDocuments()
    }
  }, [stagedFiles, teamId, entityType, entityId, fetchDocuments])

  // Delete an existing document
  const handleDelete = useCallback(async (docId: string) => {
    setDeletingId(docId)
    try {
      const response = await fetch(`/api/property-documents/${docId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Delete failed')
      toast.success('Document supprimé')
      await fetchDocuments()
    } catch (error) {
      toast.error('Erreur lors de la suppression')
      console.error('Delete error:', error)
    } finally {
      setDeletingId(null)
    }
  }, [fetchDocuments])

  // Render existing documents for a slot
  const renderExistingDocs = (slotType: string) => {
    const docs = docsByType[slotType]
    if (!docs || docs.length === 0) return null

    return (
      <div className="space-y-1.5 mt-2">
        {docs.map(doc => {
          const expiry = getExpiryStatus(doc.expiry_date)
          return (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-md border bg-background p-2"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.original_filename}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>•</span>
                  <span>{new Date(doc.uploaded_at).toLocaleDateString('fr-BE')}</span>
                  {expiry.status !== 'none' && (
                    <>
                      <span>•</span>
                      <span className={cn(
                        expiry.status === 'expired' && 'text-red-600 font-medium',
                        expiry.status === 'expiring_soon' && 'text-orange-600 font-medium',
                        expiry.status === 'valid' && 'text-green-600'
                      )}>
                        {expiry.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  asChild
                >
                  <a
                    href={`/api/property-documents/${doc.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Render a slot section (existing docs + upload area)
  const renderSlot = (config: GenericDocumentSlotConfig, compact = true) => {
    const existingCount = docsByType[config.type]?.length || 0
    const staged = stagedFiles[config.type] || []
    const hasStagedFiles = staged.length > 0

    return (
      <div key={config.type} className="rounded-lg border bg-card flex flex-col">
        {/* Slot header + upload for new files */}
        <DocumentSlotGeneric
          type={config.type}
          label={config.label}
          hint={config.hint}
          icon={config.icon}
          recommended={config.recommended}
          allowMultiple={config.allowMultiple}
          files={staged}
          onAddFiles={(files) => addFilesToSlot(config.type, files)}
          onRemoveFile={(fileId) => removeFileFromSlot(config.type, fileId)}
          disabled={isUploading}
          compact={compact}
          hasExpiry={config.hasExpiry}
          className="border-0"
        />

        {/* Upload button for staged files */}
        {hasStagedFiles && (
          <div className="px-3 pb-2">
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => uploadStagedFiles(config.type)}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              Uploader {staged.length} fichier{staged.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Existing documents list */}
        {existingCount > 0 && (
          <div className="px-3 pb-3">
            <div className="text-xs text-muted-foreground mb-1">
              {existingCount} document{existingCount > 1 ? 's' : ''} existant{existingCount > 1 ? 's' : ''}
            </div>
            {renderExistingDocs(config.type)}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={cn("shadow-sm", className)}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const hasAllRecommended = progress.uploaded === progress.total && progress.total > 0

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Paperclip className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{panelTitle}</CardTitle>
          </div>

          {/* Inline progress bar */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {progress.uploaded} / {progress.total} recommandés complétés
              </span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        </div>

        {/* Status alerts */}
        {hasAllRecommended && existingDocs.length > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-green-700 font-medium">
              Tous les documents recommandés sont présents
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-6">
        {/* Recommended documents grid */}
        {recommendedSlots.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Documents recommandés
              <span className="text-xs font-normal">
                ({progress.uploaded}/{progress.total})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendedSlots.map(config => renderSlot(config, true))}
            </div>
          </div>
        )}

        {/* Optional documents grid */}
        {optionalSlots.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Documents optionnels
              <span className="text-xs font-normal">
                ({optionalSlots.filter(s => (docsByType[s.type]?.length || 0) > 0).length}/{optionalSlots.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {optionalSlots.map(config => renderSlot(config, true))}
            </div>
          </div>
        )}

        {/* Standalone "Autres" section */}
        {autreSlot && (
          <div className="border-t pt-4 mt-2 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Autre document
            </h3>
            <div className="max-w-md">
              {renderSlot(autreSlot, false)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PropertyDocumentsPanel
