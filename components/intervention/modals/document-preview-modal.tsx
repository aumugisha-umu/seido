'use client'

/**
 * Document Preview Modal
 * Displays a preview of documents (images, PDFs) in a modal
 * Falls back to download option for unsupported file types
 */

import { useState, useEffect } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2 } from 'lucide-react'

interface PreviewDocument {
  id: string
  name: string
  type?: string
  size?: string
  date?: string
  url?: string
  mimeType?: string
}

interface DocumentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  document: PreviewDocument | null
  onDownload?: () => void
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  document,
  onDownload
}: DocumentPreviewModalProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Déterminer le type de preview basé sur le mimeType ou l'extension du fichier
  const isImage = document?.mimeType?.startsWith('image/') ||
    /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(document?.name || '')
  const isPdf = document?.mimeType === 'application/pdf' ||
    /\.pdf$/i.test(document?.name || '')
  const canPreview = isImage || isPdf

  // Reset state when document changes or modal opens
  useEffect(() => {
    if (isOpen && document) {
      setLoading(canPreview) // Only show loading for previewable content
      setError(false)
    }
  }, [isOpen, document?.id, canPreview])

  // Handle close with cleanup
  const handleClose = () => {
    setLoading(true)
    setError(false)
    onClose()
  }

  if (!document) return null

  // Format document type for display
  const formatDocumentType = (type?: string) => {
    if (!type) return null
    return type.replace(/_/g, ' ')
  }

  // Build subtitle from document metadata
  const buildSubtitle = () => {
    const parts: string[] = []
    const formattedType = formatDocumentType(document.type)
    if (formattedType) parts.push(formattedType)
    if (document.size) parts.push(document.size)
    if (document.date) parts.push(document.date)
    return parts.join(' • ')
  }

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="xl"
    >
      <UnifiedModalHeader
        title={document.name}
        subtitle={buildSubtitle()}
        icon={<FileText className="h-5 w-5" />}
      >
        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload} className="flex-shrink-0">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Télécharger
          </Button>
        )}
      </UnifiedModalHeader>

      <UnifiedModalBody className="p-0 min-h-[400px] max-h-[70vh]">
        <div className="h-full flex items-center justify-center bg-slate-50 overflow-hidden relative">
          {/* Loading state */}
          {loading && canPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                <FileText className="h-8 w-8 text-red-500" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Impossible de charger l&apos;aperçu</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Le fichier n&apos;a pas pu être chargé
                </p>
              </div>
              {onDownload && (
                <Button variant="outline" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Télécharger le fichier
                </Button>
              )}
            </div>
          )}

          {/* Image preview */}
          {!error && isImage && document.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={document.url}
              alt={document.name}
              className="max-w-full max-h-[70vh] object-contain"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true) }}
            />
          )}

          {/* PDF preview */}
          {!error && isPdf && document.url && (
            <iframe
              src={`${document.url}#toolbar=1&navpanes=0`}
              className="w-full h-[70vh] border-0"
              title={document.name}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true) }}
            />
          )}

          {/* Non-previewable file */}
          {!canPreview && !error && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                <FileText className="h-8 w-8 text-slate-500" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Aperçu non disponible</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ce type de fichier ne peut pas être prévisualisé
                </p>
              </div>
              {onDownload && (
                <Button variant="outline" onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Télécharger le fichier
                </Button>
              )}
            </div>
          )}
        </div>
      </UnifiedModalBody>
    </UnifiedModal>
  )
}
