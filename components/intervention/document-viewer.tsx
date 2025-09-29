"use client"

import { useState, useEffect } from "react"
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  InterventionDocument,
  getDocumentTypeLabel,
  getDocumentTypeColor,
  isImageDocument,
  isPdfDocument,
  formatFileSize,
} from "@/hooks/use-intervention-documents"
import { cn } from "@/lib/utils"

interface DocumentViewerProps {
  document: InterventionDocument | null
  documents?: InterventionDocument[]
  isOpen: boolean
  onClose: () => void
  onDownload?: (document: InterventionDocument) => void
  onNavigate?: (direction: 'prev' | 'next') => void
}

export function DocumentViewer({
  document,
  documents = [],
  isOpen,
  onClose,
  onDownload,
  onNavigate,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState(1)
  const [currentPdfPage, setCurrentPdfPage] = useState(1)

  // Reset state when document changes
  useEffect(() => {
    if (document) {
      setZoom(100)
      setRotation(0)
      setLoading(true)
      setError(null)
      setCurrentPdfPage(1)
    }
  }, [document?.id])

  // Find current document index for navigation
  const currentIndex = documents.findIndex(d => d.id === document?.id)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < documents.length - 1

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrevious && onNavigate) {
            onNavigate('prev')
          }
          break
        case 'ArrowRight':
          if (hasNext && onNavigate) {
            onNavigate('next')
          }
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, hasPrevious, hasNext, onNavigate, onClose])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handleDownload = () => {
    if (document) {
      if (onDownload) {
        onDownload(document)
      } else if (document.signed_url) {
        const link = window.document.createElement('a')
        link.href = document.signed_url
        link.download = document.original_filename
        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
      }
    }
  }

  const handleImageLoad = () => {
    setLoading(false)
    setError(null)
  }

  const handleImageError = () => {
    setLoading(false)
    setError("Impossible de charger l'image")
  }

  if (!document) return null

  const isImage = isImageDocument(document.mime_type)
  const isPdf = isPdfDocument(document.mime_type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <DialogTitle className="truncate">{document.original_filename}</DialogTitle>
              <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
                <Badge
                  variant="secondary"
                  className={cn(
                    `text-${getDocumentTypeColor(document.document_type)}-600`,
                    `bg-${getDocumentTypeColor(document.document_type)}-50`
                  )}
                >
                  {getDocumentTypeLabel(document.document_type)}
                </Badge>
                <span>{formatFileSize(document.file_size)}</span>
                <span>•</span>
                <span>{new Date(document.uploaded_at).toLocaleDateString('fr-FR')}</span>
                {document.uploaded_by_user && (
                  <>
                    <span>•</span>
                    <span>Par {document.uploaded_by_user.name}</span>
                  </>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Viewer content */}
        <div className="relative flex-1 bg-gray-100 overflow-hidden" style={{ height: 'calc(90vh - 140px)' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Image viewer */}
          {isImage && document.signed_url && (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={document.signed_url}
                alt={document.original_filename}
                className="max-w-full max-h-full object-contain transition-transform"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          )}

          {/* PDF viewer */}
          {isPdf && document.signed_url && (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`${document.signed_url}#toolbar=0`}
                className="flex-1 w-full h-full border-0"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false)
                  setError("Impossible de charger le PDF")
                }}
              />
            </div>
          )}

          {/* Unsupported file type */}
          {!isImage && !isPdf && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <FileText className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Aperçu non disponible
              </p>
              <p className="text-sm text-gray-500 text-center mb-4">
                Ce type de fichier ne peut pas être prévisualisé directement
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger le fichier
              </Button>
            </div>
          )}

          {/* Navigation arrows */}
          {documents.length > 1 && (
            <>
              {hasPrevious && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  onClick={() => onNavigate?.('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {hasNext && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={() => onNavigate?.('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Controls toolbar */}
        <div className="flex items-center justify-between p-4 border-t bg-white">
          <div className="flex items-center space-x-2">
            {/* Navigation info */}
            {documents.length > 1 && (
              <span className="text-sm text-gray-500 mr-4">
                {currentIndex + 1} / {documents.length}
              </span>
            )}

            {/* Image controls */}
            {isImage && !loading && !error && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  title="Zoom arrière"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500 min-w-[50px] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  title="Zoom avant"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRotate}
                  title="Rotation"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}