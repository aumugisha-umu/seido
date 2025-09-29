"use client"

import { useState } from "react"
import {
  FileText,
  Image,
  Download,
  Eye,
  Trash2,
  MoreVertical,
  FileImage,
  FileSpreadsheet,
  File,
  Clock,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  InterventionDocument,
  getDocumentTypeLabel,
  getDocumentTypeColor,
  isImageDocument,
  isPdfDocument,
  formatFileSize,
} from "@/hooks/use-intervention-documents"
import type { Document } from "@/components/intervention/document-viewer-modal"

// Helper function to map InterventionDocument to Document interface
const mapToDocument = (doc: InterventionDocument): Document => ({
  id: doc.id,
  original_filename: doc.original_filename,
  file_size: doc.file_size,
  mime_type: doc.mime_type,
  uploaded_at: doc.uploaded_at,
  document_type: doc.document_type,
  description: doc.description,
  uploaded_by: doc.uploaded_by,
  uploaded_by_user: doc.uploaded_by_user,
  signed_url: doc.signed_url,
  storage_path: doc.storage_path,
  intervention_id: doc.intervention_id,
})

interface DocumentListProps {
  documents: InterventionDocument[]
  loading?: boolean
  error?: string | null
  userRole: 'gestionnaire' | 'prestataire' | 'locataire'
  onView?: (document: Document | InterventionDocument) => void
  onDownload?: (document: Document | InterventionDocument) => void
  onDelete?: (documentId: string) => void
  onTypeChange?: (documentId: string, type: InterventionDocument['document_type']) => void
  viewMode?: 'grid' | 'list'
  showTypeFilter?: boolean
}

export function DocumentList({
  documents,
  loading = false,
  error,
  userRole,
  onView,
  onDownload,
  onDelete,
  onTypeChange,
  viewMode = 'grid',
  showTypeFilter = true,
}: DocumentListProps) {
  const [selectedType, setSelectedType] = useState<string>('all')
  const [hoveredDoc, setHoveredDoc] = useState<string | null>(null)

  // Filter documents by type
  const filteredDocuments = selectedType === 'all'
    ? documents
    : documents.filter(doc => doc.document_type === selectedType)

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (!mimeType) {
      return <File className="h-5 w-5" />
    }
    if (isImageDocument(mimeType)) {
      return <FileImage className="h-5 w-5" />
    }
    if (isPdfDocument(mimeType)) {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    }
    return <File className="h-5 w-5" />
  }

  // Generate thumbnail URL for images
  const getThumbnailUrl = (doc: InterventionDocument): string | null => {
    if (isImageDocument(doc.mime_type)) {
      // Priorité: thumbnail_url puis signed_url
      return (doc as any).thumbnail_url || doc.signed_url || null
    }
    return null
  }

  // Handle document download
  const handleDownload = async (doc: InterventionDocument) => {
    if (onDownload) {
      onDownload(mapToDocument(doc) as any)
    } else if (doc.signed_url) {
      // Default download behavior
      try {
        const link = document.createElement('a')
        link.href = doc.signed_url
        link.download = doc.original_filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log("✅ Document download initiated:", doc.original_filename)
      } catch (error) {
        console.error("❌ Error initiating download:", error)
        // You could add a toast notification here
      }
    } else {
      console.warn("⚠️ No signed URL available for document:", doc.id)
      // You could add a toast notification here
    }
  }

  if (loading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className={viewMode === 'grid' ? 'h-48' : 'h-20'} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <FileText className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Erreur de chargement</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <p className="text-sm text-red-600">
            Veuillez rafraîchir la page ou contactez le support si le problème persiste.
          </p>
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium text-gray-900 mb-2">Aucun document</p>
        <p className="text-sm text-gray-500">
          Les documents ajoutés pendant l'exécution apparaîtront ici
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {showTypeFilter && (
        <div className="flex items-center justify-between">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="photo_avant">Photos avant</SelectItem>
              <SelectItem value="photo_apres">Photos après</SelectItem>
              <SelectItem value="rapport">Rapports</SelectItem>
              <SelectItem value="facture">Factures</SelectItem>
              <SelectItem value="devis">Devis</SelectItem>
              <SelectItem value="autre">Autres</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Document grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map((doc) => {
            const thumbnailUrl = getThumbnailUrl(doc)
            return (
              <div
                key={doc.id}
                className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                onMouseEnter={() => setHoveredDoc(doc.id)}
                onMouseLeave={() => setHoveredDoc(null)}
              >
                {/* Thumbnail or icon */}
                <div className="aspect-square relative bg-gray-50">
                  {thumbnailUrl ? (
                    <img
                      src={thumbnailUrl}
                      alt={doc.original_filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {isPdfDocument(doc.mime_type) ? (
                        <FileText className="h-16 w-16 text-red-500" />
                      ) : (
                        getFileIcon(doc.mime_type)
                      )}
                    </div>
                  )}

                  {/* Overlay actions on hover */}
                  {hoveredDoc === doc.id && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center space-x-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => onView?.(mapToDocument(doc) as any)}
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {(userRole === 'gestionnaire' || userRole === 'prestataire') && onDelete && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => onDelete(doc.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Document info */}
                <div className="p-3">
                  <Badge
                    variant="secondary"
                    className={`mb-2 text-${getDocumentTypeColor(doc.document_type)}-600 bg-${getDocumentTypeColor(doc.document_type)}-50`}
                  >
                    {getDocumentTypeLabel(doc.document_type)}
                  </Badge>
                  <p className="font-medium text-sm truncate" title={doc.original_filename || 'Document sans nom'}>
                    {doc.original_filename || 'Document sans nom'}
                  </p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{doc.file_size ? formatFileSize(doc.file_size) : 'Taille inconnue'}</span>
                    <span>{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('fr-FR') : 'Date inconnue'}</span>
                  </div>
                  {doc.uploaded_by_user && (
                    <p className="text-xs text-gray-500 mt-1 truncate" title={doc.uploaded_by_user.name}>
                      Par {doc.uploaded_by_user.name}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center space-x-4">
                {/* File icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(doc.mime_type)}
                </div>

                {/* Document info */}
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium">{doc.original_filename || 'Document sans nom'}</p>
                    <Badge
                      variant="secondary"
                      className={`text-${getDocumentTypeColor(doc.document_type)}-600 bg-${getDocumentTypeColor(doc.document_type)}-50`}
                    >
                      {getDocumentTypeLabel(doc.document_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{doc.file_size ? formatFileSize(doc.file_size) : 'Taille inconnue'}</span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </span>
                    {doc.uploaded_by_user && (
                      <span className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {doc.uploaded_by_user.name}
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onView?.(mapToDocument(doc) as any)}
                  title="Voir"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(doc)}
                  title="Télécharger"
                >
                  <Download className="h-4 w-4" />
                </Button>

                {/* More actions menu */}
                {(userRole === 'gestionnaire' || userRole === 'prestataire') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onTypeChange && (
                        <>
                          <DropdownMenuItem onClick={() => onTypeChange(doc.id, 'photo_avant')}>
                            Marquer comme Photo avant
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTypeChange(doc.id, 'photo_apres')}>
                            Marquer comme Photo après
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTypeChange(doc.id, 'rapport')}>
                            Marquer comme Rapport
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onTypeChange(doc.id, 'facture')}>
                            Marquer comme Facture
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => onDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}