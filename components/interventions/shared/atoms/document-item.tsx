'use client'

/**
 * DocumentItem - Élément de document dans une liste
 *
 * @example
 * <DocumentItem
 *   document={{ id: '1', name: 'rapport.pdf', type: 'pdf' }}
 *   onView={() => handleView(doc.id)}
 * />
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Eye,
  Download,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { InterventionDocument, UserRole } from '../types'
import { getFileExtension, formatDateShort } from '../utils/helpers'
import { permissions } from '../utils/permissions'

export interface DocumentItemProps {
  /** Document à afficher */
  document: InterventionDocument
  /** Rôle de l'utilisateur courant */
  userRole?: UserRole
  /** Callback pour visualiser */
  onView?: (documentId: string) => void
  /** Callback pour télécharger */
  onDownload?: (documentId: string) => void
  /** Callback pour supprimer */
  onDelete?: (documentId: string) => void
  /** Variante d'affichage */
  variant?: 'default' | 'compact' | 'grid'
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Labels français pour les types de documents
 */
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'photo_avant': 'Photo avant',
  'photo_apres': 'Photo après',
  'devis': 'Devis',
  'facture': 'Facture',
  'rapport': 'Rapport',
  'plan': 'Plan',
  'certificat': 'Certificat',
  'garantie': 'Garantie',
  'bon_de_commande': 'Bon de commande',
  'autre': 'Autre'
}

/**
 * Retourne le label français du type de document
 */
const getDocumentTypeLabel = (type: string): string | null => {
  return DOCUMENT_TYPE_LABELS[type] || null
}

/**
 * Retourne l'icône appropriée selon le type de fichier
 */
const getFileIcon = (filename: string) => {
  const ext = getFileExtension(filename)

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods']

  if (imageExts.includes(ext)) return Image
  if (ext === 'pdf') return FileText
  if (spreadsheetExts.includes(ext)) return FileSpreadsheet

  return File
}

/**
 * Élément de document avec actions
 */
export const DocumentItem = ({
  document,
  userRole = 'tenant',
  onView,
  onDownload,
  onDelete,
  variant = 'default',
  className
}: DocumentItemProps) => {
  const FileIcon = getFileIcon(document.name)
  const canDelete = permissions.canDeleteDocuments(userRole)

  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'group relative p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors cursor-pointer',
          className
        )}
        onClick={() => onView?.(document.id)}
      >
        {/* Icône */}
        <div className="flex items-center justify-center h-12 mb-2">
          <FileIcon className="h-10 w-10 text-slate-400" aria-hidden="true" />
        </div>

        {/* Nom du fichier */}
        <p className="text-sm font-medium truncate text-center">
          {document.name}
        </p>

        {/* Métadonnées */}
        {(document.size || document.date) && (
          <p className="text-xs text-muted-foreground text-center mt-1">
            {document.size && <span>{document.size}</span>}
            {document.size && document.date && <span> • </span>}
            {document.date && <span>{formatDateShort(document.date)}</span>}
          </p>
        )}

        {/* Menu d'actions (sur hover) */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Plus d'actions pour le document">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(document.id)}>
                  <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                  Voir
                </DropdownMenuItem>
              )}
              {onDownload && (
                <DropdownMenuItem onClick={() => onDownload(document.id)}>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Télécharger
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(document.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer',
          className
        )}
        onClick={() => onView?.(document.id)}
      >
        <FileIcon className="h-4 w-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm truncate flex-1">{document.name}</span>
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(document.id)
            }}
            aria-label={`Télécharger ${document.name}`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    )
  }

  // Variant default
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors',
        className
      )}
    >
      {/* Icône */}
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100">
        <FileIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
      </div>

      {/* Informations */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{document.name}</p>
          {/* Badge de catégorie */}
          {document.type && getDocumentTypeLabel(document.type) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
              {getDocumentTypeLabel(document.type)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {document.date && <span>{formatDateShort(document.date)}</span>}
          {document.date && document.size && <span>•</span>}
          {document.size && <span>{document.size}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onView && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onView(document.id)}
            aria-label={`Voir ${document.name}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onDownload(document.id)}
            aria-label={`Télécharger ${document.name}`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(document.id)}
            aria-label={`Supprimer ${document.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
}
