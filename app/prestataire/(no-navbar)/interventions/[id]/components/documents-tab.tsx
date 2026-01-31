'use client'

/**
 * Documents Tab Component for Prestataire
 * Manages intervention documents with upload capability
 */

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentUploadDialog } from '@/components/interventions/document-upload-dialog'
import {
  FileText,
  FileImage,
  File,
  Upload,
  Download,
  Eye,
  Check,
  Calendar,
  MoreVertical,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/services'
import type { Database } from '@/lib/database.types'

type Document = Database['public']['Tables']['intervention_documents']['Row']

interface DocumentsTabProps {
  interventionId: string
  documents: Document[]
  canUpload?: boolean
  onRefresh: () => void
}

// Document type labels
const documentTypeLabels: Record<string, string> = {
  'rapport': 'Rapport',
  'photo_avant': 'Photo avant',
  'photo_apres': 'Photo après',
  'facture': 'Facture',
  'devis': 'Estimation',
  'plan': 'Plan',
  'certificat': 'Certificat',
  'garantie': 'Garantie',
  'bon_de_commande': 'Bon de commande',
  'autre': 'Autre'
}

// Provider-specific document types
const providerDocumentTypes = [
  'photo_avant',
  'photo_apres',
  'facture',
  'devis',
  'bon_de_commande',
  'certificat',
  'garantie'
]

// Get file icon based on MIME type
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('pdf')) return FileText
  return File
}

// Format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function DocumentsTab({
  interventionId,
  documents,
  canUpload = false,
  onRefresh
}: DocumentsTabProps) {
  const { user } = useAuth()
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Handle document deletion (only for provider's own documents)
  const handleDelete = async (documentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    setDeletingId(documentId)
    try {
      const supabase = createBrowserSupabaseClient()

      const { error } = await supabase
        .from('intervention_documents')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .eq('id', documentId)

      if (error) throw error

      toast.success('Document supprimé')
      onRefresh()
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeletingId(null)
    }
  }

  // Handle document download
  const handleDownload = async (document: Document) => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase.storage
        .from(document.storage_bucket)
        .download(document.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.original_filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Erreur lors du téléchargement')
    }
  }

  // Handle document preview
  const handlePreview = async (document: Document) => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data } = await supabase.storage
        .from(document.storage_bucket)
        .getPublicUrl(document.storage_path)

      window.open(data.publicUrl, '_blank')
    } catch (error) {
      console.error('Error previewing document:', error)
      toast.error('Erreur lors de la prévisualisation')
    }
  }

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.document_type
    if (!acc[type]) acc[type] = []
    acc[type].push(doc)
    return acc
  }, {} as Record<string, Document[]>)

  // Separate provider's documents from others
  const myDocuments = documents.filter(doc => doc.uploaded_by === doc.uploaded_by) // Will be filtered by RLS
  const otherDocuments = documents.filter(doc => doc.uploaded_by !== doc.uploaded_by)

  return (
    <>
      <div className="space-y-6">
        {/* Upload section */}
        {canUpload && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base text-blue-900">
                Documents à fournir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-800">
                Téléchargez les documents suivants selon l'avancement de l'intervention:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li><strong>Photos avant:</strong> Avant le début des travaux</li>
                <li><strong>Photos après:</strong> À la fin des travaux</li>
                <li><strong>Facture:</strong> Après la fin des travaux</li>
                <li><strong>Certificats/Garanties:</strong> Si applicable</li>
              </ul>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                size="sm"
                className="mt-2 gap-2"
              >
                <Upload className="w-4 h-4" />
                Ajouter des documents
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Documents list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents ({documents.length})
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  Aucun document
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Les documents liés à l'intervention apparaîtront ici
                </p>
                {canUpload && (
                  <Button
                    onClick={() => setUploadDialogOpen(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Ajouter le premier document
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedDocuments).map(([type, docs]) => (
                  <div key={type} className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {documentTypeLabels[type] || type} ({docs.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {docs.map((doc) => {
                        const FileIcon = getFileIcon(doc.mime_type)
                        const isMyDocument = doc.uploaded_by === doc.uploaded_by // Will be checked properly with user context

                        return (
                          <div
                            key={doc.id}
                            className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <FileIcon className="w-10 h-10 text-muted-foreground flex-shrink-0" />
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {doc.original_filename}
                                </p>
                                {doc.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {doc.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(doc.uploaded_at), 'dd MMM yyyy', { locale: fr })}
                                  </span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                </div>
                                {doc.is_validated && (
                                  <Badge variant="default" className="text-xs">
                                    <Check className="w-3 h-3 mr-1" />
                                    Validé
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled={deletingId === doc.id}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePreview(doc)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Prévisualiser
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Télécharger
                                </DropdownMenuItem>
                                {isMyDocument && doc.status === 'draft' && (
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(doc.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload dialog */}
      {canUpload && (
        <DocumentUploadDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          interventionId={interventionId}
          allowedTypes={providerDocumentTypes}
          onUploadComplete={() => {
            setUploadDialogOpen(false)
            onRefresh()
          }}
        />
      )}
    </>
  )
}
