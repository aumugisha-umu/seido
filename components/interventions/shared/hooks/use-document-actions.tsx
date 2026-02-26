'use client'

/**
 * useDocumentActions — Shared hook for document preview & download
 *
 * Provides unified handleViewDocument / handleDownloadDocument via API routes,
 * plus a ready-to-render DocumentPreviewModal.
 *
 * @example
 * const { handleViewDocument, handleDownloadDocument, previewModal } = useDocumentActions({ documents })
 * // Pass handlers to DocumentsCard, render {previewModal} in JSX
 */

import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { DocumentPreviewModal } from '@/components/intervention/modals/document-preview-modal'
import type { Database } from '@/lib/database.types'

type InterventionDocumentRow = Database['public']['Tables']['intervention_documents']['Row']

interface PreviewDocument {
  id: string
  name: string
  type?: string
  size?: string
  date?: string
  url?: string
  mimeType?: string
}

interface UseDocumentActionsOptions {
  /** Raw DB rows from intervention_documents (need id, storage_path, storage_bucket, etc.) */
  documents: InterventionDocumentRow[]
}

export function useDocumentActions({ documents }: UseDocumentActionsOptions) {
  const [previewDocument, setPreviewDocument] = useState<PreviewDocument | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

  const handleViewDocument = useCallback(async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId)
    if (!doc) {
      toast.error('Document non trouvé')
      return
    }

    try {
      const response = await fetch(`/api/view-intervention-document?documentId=${documentId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération du document')
      }

      setPreviewDocument({
        id: doc.id,
        name: result.document?.filename || doc.filename || 'Document',
        type: result.document?.documentType || doc.document_type || undefined,
        size: result.document?.size ? `${Math.round(result.document.size / 1024)} KB` : undefined,
        date: result.document?.uploadedAt ? new Date(result.document.uploadedAt).toLocaleDateString('fr-FR') : undefined,
        url: result.viewUrl,
        mimeType: result.document?.type || doc.mime_type || undefined
      })
      setIsPreviewModalOpen(true)
    } catch (error) {
      console.error('Error previewing document:', error)
      const message = error instanceof Error ? error.message : "Impossible d'ouvrir le document"
      toast.error(message)
    }
  }, [documents])

  const handleDownloadDocument = useCallback(async (documentId: string) => {
    const doc = documents.find(d => d.id === documentId)
    if (!doc) {
      toast.error('Document non trouvé')
      return
    }

    try {
      const response = await fetch(`/api/download-intervention-document?documentId=${documentId}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du téléchargement')
      }

      const fileName = result.document?.filename || doc.filename || 'document'
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading document:', error)
      const message = error instanceof Error ? error.message : 'Impossible de télécharger le document'
      toast.error(message)
    }
  }, [documents])

  const handleClosePreview = useCallback(() => {
    setIsPreviewModalOpen(false)
    setPreviewDocument(null)
  }, [])

  const handleDownloadFromPreview = useCallback(() => {
    if (previewDocument) {
      handleDownloadDocument(previewDocument.id)
    }
  }, [previewDocument, handleDownloadDocument])

  const previewModal = useMemo(() => (
    <DocumentPreviewModal
      isOpen={isPreviewModalOpen}
      onClose={handleClosePreview}
      document={previewDocument}
      onDownload={handleDownloadFromPreview}
    />
  ), [isPreviewModalOpen, handleClosePreview, previewDocument, handleDownloadFromPreview])

  return {
    handleViewDocument,
    handleDownloadDocument,
    previewModal,
  }
}
