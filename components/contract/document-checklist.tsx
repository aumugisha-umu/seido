"use client"

/**
 * DocumentChecklist - Checklist de documents pour la création de bail
 *
 * Affiche une liste de slots de documents organisés par catégorie avec :
 * - Indicateurs de progression
 * - Support multi-fichiers par slot
 * - Badges "Recommandé" pour les documents importants
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Paperclip, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentSlot } from './document-slot'
import type { DocumentSlotState } from '@/hooks/use-contract-upload-by-category'
import type { ContractDocumentType } from '@/lib/types/contract.types'

interface DocumentChecklistProps {
  /** État des slots de documents */
  slots: DocumentSlotState[]
  /** Callback pour ajouter des fichiers à un slot */
  onAddFilesToSlot: (slotType: ContractDocumentType, files: File[]) => void
  /** Callback pour supprimer un fichier d'un slot */
  onRemoveFileFromSlot: (slotType: ContractDocumentType, fileId: string) => void
  /** Progression (slots uploadés / total) */
  progress: {
    uploaded: number
    total: number
    percentage: number
  }
  /** Documents recommandés manquants */
  missingRecommendedDocuments: ContractDocumentType[]
  /** Upload en cours */
  isUploading?: boolean
  /** Classe CSS additionnelle */
  className?: string
}

export function DocumentChecklist({
  slots,
  onAddFilesToSlot,
  onRemoveFileFromSlot,
  progress,
  missingRecommendedDocuments,
  isUploading = false,
  className
}: DocumentChecklistProps) {
  // Séparer les slots recommandés et optionnels pour l'affichage
  const { recommendedSlots, optionalSlots } = useMemo(() => {
    const recommended = slots.filter(slot => slot.recommended)
    const optional = slots.filter(slot => !slot.recommended)
    return { recommendedSlots: recommended, optionalSlots: optional }
  }, [slots])

  const hasAllRecommended = missingRecommendedDocuments.length === 0
  const totalFilesCount = slots.reduce((acc, slot) => acc + slot.fileCount, 0)

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Documents du bail</CardTitle>
          </div>

          {/* Badge de progression */}
          <Badge
            variant="secondary"
            className={cn(
              "text-xs",
              totalFilesCount > 0
                ? "bg-green-100 text-green-700 border-green-200"
                : "bg-muted text-muted-foreground"
            )}
          >
            {totalFilesCount} document{totalFilesCount !== 1 ? 's' : ''} ajouté{totalFilesCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Barre de progression */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.uploaded} / {progress.total} catégories complétées
            </span>
            <span>{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {/* Alerte pour documents recommandés manquants */}
        {!hasAllRecommended && totalFilesCount > 0 && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-700">
              <p className="font-medium">Documents recommandés manquants :</p>
              <p className="mt-0.5">
                {missingRecommendedDocuments.length} document{missingRecommendedDocuments.length > 1 ? 's' : ''} recommandé{missingRecommendedDocuments.length > 1 ? 's' : ''} non uploadé{missingRecommendedDocuments.length > 1 ? 's' : ''}.
                Vous pourrez les ajouter plus tard.
              </p>
            </div>
          </div>
        )}

        {/* Message de succès si tous les recommandés sont là */}
        {hasAllRecommended && totalFilesCount > 0 && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-green-700 font-medium">
              Tous les documents recommandés ont été ajoutés
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-6">
        {/* Section documents recommandés */}
        {recommendedSlots.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Documents recommandés
              <span className="text-xs font-normal">
                ({recommendedSlots.filter(s => s.hasFiles).length}/{recommendedSlots.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {recommendedSlots.map(slot => (
                <DocumentSlot
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Section documents optionnels */}
        {optionalSlots.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Documents optionnels
              <span className="text-xs font-normal">
                ({optionalSlots.filter(s => s.hasFiles).length}/{optionalSlots.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {optionalSlots.map(slot => (
                <DocumentSlot
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Note d'information */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Les documents seront uploadés lors de la création du bail.
          Vous pourrez ajouter d'autres documents par la suite.
        </p>
      </CardContent>
    </Card>
  )
}

export default DocumentChecklist
