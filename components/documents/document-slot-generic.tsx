"use client"

/**
 * DocumentSlotGeneric - Generic document upload slot
 *
 * Renders a single document category with:
 * - Icon and label
 * - "Recommended" badge if applicable
 * - Drag & drop upload zone
 * - File list with status indicators
 *
 * Used by lease, lot, and building document flows.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
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
  Star,
  Zap,
  Plug,
  Flame,
  Bell,
  Thermometer,
  ArrowUpDown,
  Droplets,
  BookOpen,
  AlertTriangle,
  BarChart3,
  ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { VALIDITY_DURATION_OPTIONS, computeExpiryDate } from '@/lib/constants/property-document-slots'
import type { GenericFileWithPreview } from './types'

// Map of icon names to components (extensible for all entity types)
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileSignature,
  Shield,
  IdCard,
  ClipboardCheck,
  FileBarChart,
  Receipt,
  File,
  FileText,
  Zap,
  Plug,
  Flame,
  Bell,
  Thermometer,
  ArrowUpDown,
  Droplets,
  BookOpen,
  AlertTriangle,
  BarChart3,
  ClipboardList
}

interface DocumentSlotGenericProps {
  /** Document type identifier */
  type: string
  /** Display label */
  label: string
  /** Help text below label */
  hint?: string
  /** Lucide icon name */
  icon: string
  /** Whether this document is recommended */
  recommended: boolean
  /** Allow multiple file uploads */
  allowMultiple: boolean
  /** Currently staged files */
  files: GenericFileWithPreview[]
  /** Callback when files are added */
  onAddFiles: (files: File[]) => void
  /** Callback when a file is removed */
  onRemoveFile: (fileId: string) => void
  /** Disable interactions */
  disabled?: boolean
  /** Compact mode for grid display */
  compact?: boolean
  /** Whether this slot has an expiry date */
  hasExpiry?: boolean
  /** Default validity in years from slot config */
  defaultValidityYears?: number
  /** Current document date (ISO string) */
  documentDate?: string
  /** Current validity duration in months */
  validityDuration?: number
  /** Custom expiry date (ISO string) — only when validityDuration === -1 */
  validityCustomExpiry?: string
  /** Callback when document date changes */
  onDocumentDateChange?: (date: string | undefined) => void
  /** Callback when validity duration changes */
  onValidityDurationChange?: (duration: number | undefined) => void
  /** Callback when custom expiry changes */
  onCustomExpiryChange?: (date: string | undefined) => void
  /** Additional CSS class */
  className?: string
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType === 'application/pdf') return FileText
  return File
}

/** Compute expiry status from ISO date string */
function getExpiryStatus(expiryDate?: string): {
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

export function DocumentSlotGeneric({
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
  hasExpiry = false,
  defaultValidityYears,
  documentDate,
  validityDuration,
  validityCustomExpiry,
  onDocumentDateChange,
  onValidityDurationChange,
  onCustomExpiryChange,
  className
}: DocumentSlotGenericProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const IconComponent = ICON_MAP[icon] || File
  const hasFiles = files.length > 0
  const canAddMore = allowMultiple || !hasFiles

  const computedExpiry = useMemo(
    () => computeExpiryDate(documentDate, validityDuration, validityCustomExpiry),
    [documentDate, validityDuration, validityCustomExpiry]
  )
  const expiryStatus = useMemo(() => getExpiryStatus(computedExpiry), [computedExpiry])

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
      onAddFiles(allowMultiple ? droppedFiles : [droppedFiles[0]])
    }
  }, [disabled, canAddMore, allowMultiple, onAddFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      onAddFiles(allowMultiple ? selectedFiles : [selectedFiles[0]])
    }
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
      {/* Header */}
      <div className={cn(
        "flex items-start",
        compact ? "gap-2 p-2.5" : "gap-3 p-4"
      )}>
        <div className={cn(
          "shrink-0 items-center justify-center rounded-lg flex",
          compact ? "h-7 w-7" : "h-10 w-10",
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
                compact ? "text-[11px] px-1 py-0 gap-0.5" : "text-xs gap-1"
              )}>
                <Star className={cn(compact ? "h-2 w-2" : "h-3 w-3")} />
                {compact ? "Rec." : "Recommand\u00e9"}
              </Badge>
            )}
            {hasFiles && (
              <Badge variant="secondary" className={cn(
                "bg-green-100 text-green-700 border-green-200",
                compact ? "text-[11px] px-1 py-0" : "text-xs"
              )}>
                {files.length} {compact ? "" : `fichier${files.length > 1 ? 's' : ''}`}
              </Badge>
            )}
            {hasExpiry && expiryStatus.status !== 'none' && (
              <Badge variant="secondary" className={cn(
                compact ? "text-[11px] px-1 py-0" : "text-xs",
                expiryStatus.status === 'expired' && "bg-red-100 text-red-700 border-red-200",
                expiryStatus.status === 'expiring_soon' && "bg-orange-100 text-orange-700 border-orange-200",
                expiryStatus.status === 'valid' && "bg-green-100 text-green-700 border-green-200"
              )}>
                {compact ? (expiryStatus.status === 'expired' ? 'Exp.' : expiryStatus.status === 'expiring_soon' ? 'Bientôt' : '') : expiryStatus.label}
              </Badge>
            )}
          </div>
          {hint && !compact && (
            <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
          )}
          {hasExpiry && hasFiles && (
            <div className={cn("w-full", compact ? "mt-1 space-y-1" : "mt-2 space-y-2")}>
              {/* Document date + Validity duration */}
              <div className="flex gap-2 flex-row">
                <div className="flex-1 min-w-0">
                  <label className={cn(
                    "font-medium text-muted-foreground mb-1 block",
                    compact ? "text-[11px]" : "text-[13px]"
                  )}>Date document</label>
                  <DatePicker
                    value={documentDate || ''}
                    onChange={(val) => onDocumentDateChange?.(val || undefined)}
                    placeholder="jj/mm/aaaa"
                    className={cn(compact ? "w-full h-7 [&_input]:h-7 [&_input]:py-0 [&_input]:text-xs [&_input]:px-1.5 [&_input]:pr-7 [&_button]:h-7 [&_button]:px-1.5 [&_.h-4.w-4]:h-3 [&_.h-4.w-4]:w-3" : "w-full [&_input]:h-9 [&_input]:text-sm")}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className={cn(
                    "font-medium text-muted-foreground mb-1 block",
                    compact ? "text-[11px]" : "text-[13px]"
                  )}>Validit&eacute;</label>
                  <Select
                    value={validityDuration !== undefined ? String(validityDuration) : (defaultValidityYears ? String(defaultValidityYears * 12) : undefined)}
                    onValueChange={(val) => onValidityDurationChange?.(Number(val))}
                  >
                    <SelectTrigger className={cn(compact ? "w-full h-7 text-xs px-1.5" : "h-9 text-sm")}>
                      <SelectValue placeholder={compact ? "Validit\u00e9" : "Dur\u00e9e de validit\u00e9"} />
                    </SelectTrigger>
                    <SelectContent>
                      {VALIDITY_DURATION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={String(opt.value)} className={compact ? "text-xs" : ""}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom expiry date picker — only when "Personnalisé" selected */}
              {validityDuration === -1 && (
                <div>
                  <label className={cn(
                    "font-medium text-muted-foreground mb-1 block",
                    compact ? "text-[11px]" : "text-[13px]"
                  )}>Date d&apos;&eacute;ch&eacute;ance</label>
                  <DatePicker
                    value={validityCustomExpiry || ''}
                    onChange={(val) => onCustomExpiryChange?.(val || undefined)}
                    placeholder="jj/mm/aaaa"
                    className={cn(compact ? "w-full [&_input]:h-7 [&_input]:text-xs [&_input]:px-1.5 [&_input]:pr-7 [&_button]:h-7 [&_button]:px-1.5 [&_.h-4.w-4]:h-3 [&_.h-4.w-4]:w-3" : "w-full [&_input]:h-9 [&_input]:text-sm")}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload zone / File list */}
      <div className={cn("flex-1 flex flex-col", compact ? "px-2.5 pb-2.5" : "px-4 pb-4")}>
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

        {canAddMore && (
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors mt-auto flex-1",
              compact ? "gap-1 py-1.5 px-2" : "gap-2 p-4",
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
              compact ? "text-[11px] leading-tight" : "text-xs"
            )}>
              {compact
                ? (hasFiles ? "+ fichier" : "Glisser ou cliquer")
                : (hasFiles
                    ? "Ajouter un autre fichier"
                    : "Glissez un fichier ici ou cliquez pour parcourir"
                  )
              }
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
              multiple={allowMultiple}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
              data-testid={`doc-upload-${type}`}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentSlotGeneric
