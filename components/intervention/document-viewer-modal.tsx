"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  File,
  AlertTriangle,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Unified Document interface matching InterventionDocument structure
export interface Document {
  id: string
  original_filename: string  // Changed from 'name'
  file_size: number          // Changed from 'size'
  mime_type: string          // Changed from 'type'
  uploaded_at: string        // Changed from 'uploadedAt'
  document_type?: 'photo_avant' | 'photo_apres' | 'rapport' | 'facture' | 'devis' | 'autre'
  description?: string
  uploaded_by?: string
  uploaded_by_user?: {       // Changed from 'uploadedBy'
    id: string
    name: string
    email: string
    role: string
  }
  signed_url?: string
  storage_path?: string
  intervention_id?: string
}

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document | null
  onDownload?: (document: Document) => void
}

interface DocumentInfo {
  id: string
  filename: string
  size: number
  type: string
  documentType: string
  description?: string
  uploadedAt: string
}

interface InterventionInfo {
  id: string
  title: string
  reference: string
}

export const DocumentViewerModal = ({
  isOpen,
  onClose,
  document,
  onDownload,
}: DocumentViewerModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null)
  const [interventionInfo, setInterventionInfo] = useState<InterventionInfo | null>(null)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

  // Load document view URL when modal opens
  useEffect(() => {
    if (isOpen && document) {
      loadDocumentView()
    } else {
      // Reset state when modal closes
      setViewUrl(null)
      setDocumentInfo(null)
      setInterventionInfo(null)
      setError(null)
      setZoom(100)
      setRotation(0)
    }
  }, [isOpen, document])

  const loadDocumentView = async () => {
    if (!document) return
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/view-intervention-document?documentId=${document.id}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du chargement du document')
      }
      
      setViewUrl(data.viewUrl)
      setDocumentInfo(data.document)
      setInterventionInfo(data.intervention)
      
    } catch (error) {
      console.error("❌ Error loading document view:", error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (document && onDownload) {
      onDownload(document)
    } else if (document) {
      // Default download behavior
      try {
        const response = await fetch(`/api/download-intervention-document?documentId=${document.id}`)
        const data = await response.json()
        
        if (response.ok && data.downloadUrl) {
          // Create a temporary link to trigger download
          const link = window.document.createElement('a')
          link.href = data.downloadUrl
          link.download = data.document?.filename || document?.original_filename || 'document'
          window.document.body.appendChild(link)
          link.click()
          window.document.body.removeChild(link)
        } else {
          throw new Error(data.error || 'Erreur lors du téléchargement')
        }
      } catch (error) {
        console.error("❌ Error downloading document:", error)
        setError(error instanceof Error ? error.message : 'Erreur de téléchargement')
      }
    }
  }

  const openInNewTab = () => {
    if (viewUrl) {
      window.open(viewUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const resetView = () => {
    setZoom(100)
    setRotation(0)
  }

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'rapport': return 'bg-blue-100 text-blue-800'
      case 'photo_avant': 
      case 'photo_apres': return 'bg-green-100 text-green-800'
      case 'facture': return 'bg-orange-100 text-orange-800'
      case 'devis': return 'bg-purple-100 text-purple-800'
      case 'plan': return 'bg-cyan-100 text-cyan-800'
      case 'certificat': 
      case 'garantie': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'rapport': return 'Rapport'
      case 'photo_avant': return 'Photo avant'
      case 'photo_apres': return 'Photo après'
      case 'facture': return 'Facture'
      case 'devis': return 'Devis'
      case 'plan': return 'Plan'
      case 'certificat': return 'Certificat'
      case 'garantie': return 'Garantie'
      default: return 'Autre'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const isImage = (mimeType: string) => mimeType?.startsWith('image/') || false
  const isPDF = (mimeType: string) => mimeType === 'application/pdf'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                {document?.mime_type?.startsWith('image/') ? (
                  <ImageIcon className="h-5 w-5 text-sky-600" />
                ) : document?.mime_type === 'application/pdf' ? (
                  <File className="h-5 w-5 text-sky-600" />
                ) : (
                  <FileText className="h-5 w-5 text-sky-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 truncate">
                  {document?.original_filename || 'Chargement...'}
                </h3>
                {interventionInfo && (
                  <p className="text-sm text-slate-600">
                    {interventionInfo.title} - {interventionInfo.reference}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {documentInfo && (
                <Badge className={getDocumentTypeColor(document?.document_type || documentInfo?.documentType || 'autre')}>
                  {getDocumentTypeLabel(document?.document_type || documentInfo?.documentType || 'autre')}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Document Info Bar - Support both document and documentInfo data */}
        {(document || documentInfo) && (
          <div className="flex-shrink-0 bg-slate-50 p-3 rounded-lg border">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <div className="flex items-center space-x-4 flex-wrap">
                <span>{formatFileSize(document?.file_size || documentInfo?.size || 0)}</span>
                <span>
                  Ajouté le {document?.uploaded_at ? format(new Date(document.uploaded_at), 'dd MMM yyyy à HH:mm', { locale: fr }) : documentInfo?.uploadedAt ? format(new Date(documentInfo.uploadedAt), 'dd MMM yyyy à HH:mm', { locale: fr }) : 'Date inconnue'}
                </span>
                {(document?.description || documentInfo?.description) && (
                  <span className="italic">"{document?.description || documentInfo?.description}"</span>
                )}
                {document?.uploaded_by_user && (
                  <span className="text-slate-500">
                    Par {document.uploaded_by_user.name} ({document.uploaded_by_user.role})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex-shrink-0 flex items-center justify-between p-2 bg-slate-50 rounded-lg border">
          <div className="flex items-center space-x-2">
            {(isImage(document?.mime_type || '') && viewUrl) && (
              <>
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 min-w-[4rem] text-center">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={resetView}>
                  Reset
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {viewUrl && (
              <Button variant="outline" size="sm" onClick={openInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir dans un nouvel onglet
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto mb-4" />
                <p className="text-slate-600">Chargement du document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Erreur de prévisualisation
                </h3>
                <p className="text-slate-600 mb-6">{error}</p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={loadDocumentView}
                    className="w-full"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Réessayer
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger le fichier
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Si le problème persiste, essayez de télécharger le fichier directement.
                </p>
              </div>
            </div>
          ) : viewUrl ? (
            <div className="h-full overflow-auto bg-slate-100 rounded-lg">
              {isImage(document?.mime_type || '') ? (
                <div className="h-full flex items-center justify-center p-4">
                  <img
                    src={viewUrl}
                    alt={document?.original_filename}
                    className="max-w-full max-h-full object-contain transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transformOrigin: 'center'
                    }}
                    onError={() => setError('Erreur lors du chargement de l\'image')}
                  />
                </div>
              ) : isPDF(document?.mime_type || '') ? (
                <iframe
                  src={viewUrl}
                  className="w-full h-full border-0"
                  title={document?.original_filename}
                  onError={() => setError('Erreur lors du chargement du PDF')}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">
                      Aperçu non disponible
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Ce type de fichier ({document?.mime_type || 'type inconnu'}) ne peut pas être prévisualisé directement dans le navigateur.
                    </p>
                    <div className="space-y-3">
                      <Button onClick={handleDownload} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger le fichier
                      </Button>
                      {viewUrl && (
                        <Button variant="outline" onClick={openInNewTab} className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ouvrir dans un nouvel onglet
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                      Types supportés pour la prévisualisation : Images (JPG, PNG, GIF, WebP) et PDF
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
