"use client"

/**
 * DocumentChecklistGeneric - Generic document checklist with progress
 *
 * Renders a categorized document upload card with:
 * - Inline progress bar (recommended documents only)
 * - Recommended documents grid
 * - Standalone "Autres" section
 * - Missing document alerts
 *
 * Used by lease, lot, and building document flows.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Paperclip, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentSlotGeneric } from './document-slot-generic'
import type { GenericDocumentSlotState, DocumentProgress } from './types'

interface DocumentChecklistGenericProps {
  /** Card title (e.g. "Documents du bail", "Documents du lot") */
  title: string
  /** Slot states with files */
  slots: GenericDocumentSlotState[]
  /** Add files to a slot */
  onAddFilesToSlot: (slotType: string, files: File[]) => void
  /** Remove a file from a slot */
  onRemoveFileFromSlot: (slotType: string, fileId: string) => void
  /** Progress (recommended docs only) */
  progress: DocumentProgress
  /** Missing recommended document types */
  missingRecommendedTypes: string[]
  /** Upload in progress */
  isUploading?: boolean
  /** Callback to set expiry date for all files in a slot */
  onSetSlotExpiryDate?: (slotType: string, date: string | undefined) => void
  /** Additional CSS class */
  className?: string
}

export function DocumentChecklistGeneric({
  title,
  slots,
  onAddFilesToSlot,
  onRemoveFileFromSlot,
  progress,
  missingRecommendedTypes,
  isUploading = false,
  onSetSlotExpiryDate,
  className
}: DocumentChecklistGenericProps) {
  const { recommendedSlots, autreSlot } = useMemo(() => {
    const recommended = slots.filter(slot => slot.recommended)
    const autre = slots.find(slot => slot.type === 'autre') ?? null
    return { recommendedSlots: recommended, autreSlot: autre }
  }, [slots])

  const hasAllRecommended = missingRecommendedTypes.length === 0
  const totalFilesCount = slots.reduce((acc, slot) => acc + slot.fileCount, 0)

  return (
    <Card className={cn("shadow-sm p-0", className)}>
      <CardHeader className="pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Paperclip className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
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

        {/* Missing recommended alert */}
        {!hasAllRecommended && totalFilesCount > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700">
              <p className="font-medium">Documents recommandés manquants :</p>
              <p className="mt-0.5">
                {missingRecommendedTypes.length} document{missingRecommendedTypes.length > 1 ? 's' : ''} recommandé{missingRecommendedTypes.length > 1 ? 's' : ''} non uploadé{missingRecommendedTypes.length > 1 ? 's' : ''}.
                Vous pourrez les ajouter plus tard.
              </p>
            </div>
          </div>
        )}

        {/* All recommended present */}
        {hasAllRecommended && totalFilesCount > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-green-700 font-medium">
              Tous les documents recommandés ont été ajoutés
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 space-y-4">
        {/* Recommended + Autre: side by side on desktop, stacked on mobile */}
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Recommended documents grid */}
          {recommendedSlots.length > 0 && (
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                Documents recommandés
                <span className="text-xs font-normal">
                  ({recommendedSlots.filter(s => s.hasFiles).length}/{recommendedSlots.length})
                </span>
              </h3>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {recommendedSlots.map(slot => (
                  <DocumentSlotGeneric
                    key={slot.type}
                    type={slot.type}
                    label={slot.label}
                    hint={slot.hint}
                    icon={slot.icon}
                    recommended={slot.recommended}
                    allowMultiple={slot.allowMultiple}
                    files={slot.files}
                    onAddFiles={(files) => onAddFilesToSlot(slot.type, files)}
                    onRemoveFile={(fileId) => onRemoveFileFromSlot(slot.type, fileId)}
                    disabled={isUploading}
                    compact
                    hasExpiry={slot.hasExpiry}
                    expiryDate={slot.files[0]?.expiryDate}
                    onExpiryDateChange={onSetSlotExpiryDate ? (date) => onSetSlotExpiryDate(slot.type, date) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Standalone "Autres" section — right column on desktop */}
          {autreSlot && (
            <div className="border-t pt-4 mt-2 lg:border-t-0 lg:pt-0 lg:mt-0 lg:border-l lg:pl-6 lg:w-80 lg:shrink-0 flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Autre document
              </h3>
              <DocumentSlotGeneric
                className="flex-1"
                type={autreSlot.type}
                label={autreSlot.label}
                hint={autreSlot.hint}
                icon={autreSlot.icon}
                recommended={false}
                allowMultiple={autreSlot.allowMultiple}
                files={autreSlot.files}
                onAddFiles={(files) => onAddFilesToSlot(autreSlot.type, files)}
                onRemoveFile={(fileId) => onRemoveFileFromSlot(autreSlot.type, fileId)}
                disabled={isUploading}
                hasExpiry={autreSlot.hasExpiry}
                expiryDate={autreSlot.files[0]?.expiryDate}
                onExpiryDateChange={onSetSlotExpiryDate ? (date) => onSetSlotExpiryDate(autreSlot.type, date) : undefined}
              />
            </div>
          )}
        </div>

        {/* Non-recommended, non-"autre" documents (conditional documents) */}
        {slots.filter(s => !s.recommended && s.type !== 'autre').length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              Documents optionnels
              <span className="text-xs font-normal">
                ({slots.filter(s => !s.recommended && s.type !== 'autre' && s.hasFiles).length}/{slots.filter(s => !s.recommended && s.type !== 'autre').length})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {slots.filter(s => !s.recommended && s.type !== 'autre').map(slot => (
                <DocumentSlotGeneric
                  key={slot.type}
                  type={slot.type}
                  label={slot.label}
                  hint={slot.hint}
                  icon={slot.icon}
                  recommended={slot.recommended}
                  allowMultiple={slot.allowMultiple}
                  files={slot.files}
                  onAddFiles={(files) => onAddFilesToSlot(slot.type, files)}
                  onRemoveFile={(fileId) => onRemoveFileFromSlot(slot.type, fileId)}
                  disabled={isUploading}
                  compact
                  hasExpiry={slot.hasExpiry}
                  expiryDate={slot.files[0]?.expiryDate}
                  onExpiryDateChange={onSetSlotExpiryDate ? (date) => onSetSlotExpiryDate(slot.type, date) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Info note */}
        <p className="text-xs text-muted-foreground">
          Vous pourrez ajouter d&apos;autres documents par la suite.
        </p>
      </CardContent>
    </Card>
  )
}

export default DocumentChecklistGeneric
