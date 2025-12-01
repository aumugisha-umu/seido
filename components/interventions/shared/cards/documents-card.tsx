'use client'

/**
 * DocumentsCard - Card des documents et rapports attachés
 *
 * @example
 * <DocumentsCard
 *   documents={documents}
 *   userRole="manager"
 *   onUpload={handleUpload}
 *   onView={handleView}
 * />
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Upload, FolderOpen } from 'lucide-react'
import { DocumentsCardProps } from '../types'
import { DocumentItem } from '../atoms'
import { permissions } from '../utils'

/**
 * Card des documents
 */
export const DocumentsCard = ({
  documents = [],
  userRole,
  onUpload,
  onView,
  onDownload,
  onDelete,
  isLoading = false,
  className
}: DocumentsCardProps) => {
  const canUpload = permissions.canAddDocuments(userRole)
  const canDelete = permissions.canDeleteDocuments(userRole)

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Rapports & Documents
          </CardTitle>

          {canUpload && onUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUpload}
              disabled={isLoading}
              aria-label="Ajouter un document"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {/* Liste des documents avec scroll */}
        {documents.length > 0 ? (
          <div className="space-y-2 max-h-full overflow-y-auto pr-1">
            {documents.map((doc) => (
              <DocumentItem
                key={doc.id}
                document={doc}
                userRole={userRole}
                onView={onView ? () => onView(doc.id) : undefined}
                onDownload={onDownload ? () => onDownload(doc.id) : undefined}
                onDelete={canDelete && onDelete ? () => onDelete(doc.id) : undefined}
                variant="default"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mb-2 text-slate-300" aria-hidden="true" />
            <p className="text-sm">Aucun document</p>
            {canUpload && onUpload && (
              <Button
                variant="link"
                size="sm"
                onClick={onUpload}
                className="mt-2"
                aria-label="Ajouter un document"
              >
                Ajouter un document
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Grille de documents (variante pour affichage en grille)
 */
export interface DocumentsGridProps {
  documents: DocumentsCardProps['documents']
  userRole: DocumentsCardProps['userRole']
  onView?: (documentId: string) => void
  onDownload?: (documentId: string) => void
  onDelete?: (documentId: string) => void
  className?: string
}

export const DocumentsGrid = ({
  documents = [],
  userRole,
  onView,
  onDownload,
  onDelete,
  className
}: DocumentsGridProps) => {
  const canDelete = permissions.canDeleteDocuments(userRole)

  if (documents.length === 0) {
    return null
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3', className)}>
      {documents.map((doc) => (
        <DocumentItem
          key={doc.id}
          document={doc}
          userRole={userRole}
          onView={onView ? () => onView(doc.id) : undefined}
          onDownload={onDownload ? () => onDownload(doc.id) : undefined}
          onDelete={canDelete && onDelete ? () => onDelete(doc.id) : undefined}
          variant="grid"
        />
      ))}
    </div>
  )
}
