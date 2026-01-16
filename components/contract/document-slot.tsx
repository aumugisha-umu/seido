"use client"

/**
 * DocumentSlot - Composant de slot individuel pour la checklist de documents
 *
 * Affiche un slot de document avec :
 * - Icône et label du type de document
 * - Badge "Recommandé" si applicable
 * - Zone d'upload drag & drop
 * - Liste des fichiers uploadés avec possibilité de suppression
 */

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Check,
  Loader2,
  AlertCircle,
  FileSignature,
  Shield,
  IdCard,
  ClipboardCheck,
  FileBarChart,
  Receipt,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContractFileWithPreview } from '@/hooks/use-contract-upload'
import type { ContractDocumentType } from '@/lib/types/contract.types'

// Map des icônes par nom
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileSignature,
  Shield,
  IdCard,
  ClipboardCheck,
  FileBarChart,
  Receipt,
  File,
  FileText
}

interface DocumentSlotProps {
  /** Type de document pour ce slot */
  type: ContractDocumentType
  /** Label affiché */
  label: string
  /** Texte d'aide sous le label */
  hint?: string
  /** Nom de l'icône Lucide */
  icon: string
  /** Indique si le document est recommandé */
  recommended: boolean
  /** Autorise plusieurs fichiers */
  allowMultiple: boolean
  /** Fichiers actuellement dans ce slot */
  files: ContractFileWithPreview[]
  /** Callback pour ajouter des fichiers */
  onAddFiles: (files: File[]) => void
  /** Callback pour supprimer un fichier */
  onRemoveFile: (fileId: string) => void
  /** Désactive les interactions */
  disabled?: boolean
  /** Mode compact pour affichage en grille */
  compact?: boolean
  /** Classe CSS additionnelle */
  className?: string
}

/**
 * Obtient l'icône appropriée pour un type de fichier
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType === 'application/pdf') return FileText
  return File
}

/**
 * Formate la taille d'un fichier
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentSlot({
  type,
  label,
  hint,
  icon,
  recommended,
  allowMultiple,
  files,
  onAddFiles,
  onRemoveFile,
  disabled = false,
  compact = false,
  className
}: DocumentSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const IconComponent = ICON_MAP[icon] || File
  const hasFiles = files.length > 0
  const canAddMore = allowMultiple || !hasFiles

  // Gestion du drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && canAddMore) {
      setIsDragOver(true)
    }
  }, [disabled, canAddMore])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled || !canAddMore) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      // Si pas multi, prendre seulement le premier fichier
      onAddFiles(allowMultiple ? droppedFiles : [droppedFiles[0]])
    }
  }, [disabled, canAddMore, allowMultiple, onAddFiles])

  // Gestion du clic sur l'input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      onAddFiles(allowMultiple ? selectedFiles : [selectedFiles[0]])
    }
    // Reset input pour permettre de sélectionner le même fichier à nouveau
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [allowMultiple, onAddFiles])

  const handleClick = useCallback(() => {
    if (!disabled && canAddMore) {
      fileInputRef.current?.click()
    }
  }, [disabled, canAddMore])

  return (
    <div className={cn("rounded-lg border bg-card flex flex-col", className)}>
      {/* En-tête du slot */}
      <div className={cn(
        "flex items-start",
        compact ? "gap-2 p-3" : "gap-3 p-4"
      )}>
        {/* Icône avec indicateur de statut */}
        <div className={cn(
          "shrink-0 items-center justify-center rounded-lg flex",
          compact ? "h-8 w-8" : "h-10 w-10",
          hasFiles
            ? "bg-green-100 text-green-600"
            : recommended
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
        )}>
          {hasFiles ? (
            <Check className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
          ) : (
            <IconComponent className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
          )}
        </div>

        {/* Label et hint */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "flex items-center flex-wrap",
            compact ? "gap-1" : "gap-2"
          )}>
            <h4 className={cn(
              "font-medium",
              compact ? "text-xs leading-tight" : "text-sm"
            )}>{label}</h4>
            {recommended && !hasFiles && (
              <Badge variant="secondary" className={cn(
                "bg-amber-100 text-amber-700 border-amber-200",
                compact ? "text-[10px] px-1 py-0 gap-0.5" : "text-xs gap-1"
              )}>
                <Star className={cn(compact ? "h-2 w-2" : "h-3 w-3")} />
                {compact ? "Rec." : "Recommandé"}
              </Badge>
            )}
            {hasFiles && (
              <Badge variant="secondary" className={cn(
                "bg-green-100 text-green-700 border-green-200",
                compact ? "text-[10px] px-1 py-0" : "text-xs"
              )}>
                {files.length} {compact ? "" : `fichier${files.length > 1 ? 's' : ''}`}
              </Badge>
            )}
          </div>
          {hint && !compact && (
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          )}
        </div>
      </div>

      {/* Zone d'upload / Liste des fichiers */}
      <div className={cn("flex-1 flex flex-col", compact ? "px-3 pb-3" : "px-4 pb-4")}>
        {/* Liste des fichiers uploadés */}
        {hasFiles && (
          <div className={cn(compact ? "space-y-1" : "space-y-2")}>
            {files.map(file => {
              const FileIcon = getFileIcon(file.file.type)
              const isUploading = file.status === 'uploading'
              const hasError = file.status === 'error'
              const isCompleted = file.status === 'completed'

              return (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-background",
                    compact ? "p-1.5" : "p-2",
                    hasError && "border-destructive bg-destructive/5",
                    isCompleted && "border-green-200 bg-green-50"
                  )}
                >
                  {/* Preview ou icône */}
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className={cn(
                        "rounded object-cover",
                        compact ? "h-6 w-6" : "h-8 w-8"
                      )}
                    />
                  ) : (
                    <FileIcon className={cn(
                      "text-muted-foreground",
                      compact ? "h-6 w-6 p-1" : "h-8 w-8 p-1.5"
                    )} />
                  )}

                  {/* Nom et taille */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium truncate",
                      compact ? "text-xs" : "text-sm"
                    )}>{file.file.name}</p>
                    {!compact && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file.size)}
                        {hasError && file.error && (
                          <span className="text-destructive ml-2">{file.error}</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Statut / Actions */}
                  <div className="flex items-center gap-1">
                    {isUploading && (
                      <Loader2 className={cn(
                        "animate-spin text-primary",
                        compact ? "h-3 w-3" : "h-4 w-4"
                      )} />
                    )}
                    {hasError && (
                      <AlertCircle className={cn(
                        "text-destructive",
                        compact ? "h-3 w-3" : "h-4 w-4"
                      )} />
                    )}
                    {isCompleted && (
                      <Check className={cn(
                        "text-green-600",
                        compact ? "h-3 w-3" : "h-4 w-4"
                      )} />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(compact ? "h-5 w-5" : "h-7 w-7")}
                      onClick={() => onRemoveFile(file.id)}
                      disabled={disabled || isUploading}
                    >
                      <X className={cn(compact ? "h-3 w-3" : "h-4 w-4")} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Zone d'upload (si on peut encore ajouter) - sticky en bas */}
        {canAddMore && (
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-md border-2 border-dashed cursor-pointer transition-colors mt-auto",
              compact ? "gap-1 p-2" : "gap-2 p-4",
              hasFiles && (compact ? "mt-2" : "mt-3"),
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Upload className={cn(
              compact ? "h-4 w-4" : "h-5 w-5",
              isDragOver ? "text-primary" : "text-muted-foreground"
            )} />
            <p className={cn(
              "text-center text-muted-foreground",
              compact ? "text-[10px] leading-tight" : "text-xs"
            )}>
              {compact
                ? (hasFiles ? "+ fichier" : "Glisser ou cliquer")
                : (hasFiles
                    ? "Ajouter un autre fichier"
                    : "Glissez un fichier ici ou cliquez pour parcourir"
                  )
              }
            </p>

            {/* Input caché */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
              multiple={allowMultiple}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentSlot
