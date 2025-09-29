import { useState, useEffect, useCallback } from 'react'

export interface InterventionDocument {
  id: string
  intervention_id: string
  document_type: 'photo_avant' | 'photo_apres' | 'rapport' | 'facture' | 'devis' | 'autre'
  original_filename: string
  storage_path: string
  file_size: number
  mime_type: string
  description?: string
  uploaded_by: string
  uploaded_at: string
  updated_at: string
  signed_url?: string
  uploaded_by_user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface UseInterventionDocumentsOptions {
  interventionId: string
  autoFetch?: boolean
  documentType?: InterventionDocument['document_type']
  page?: number
  limit?: number
}

interface UseInterventionDocumentsReturn {
  documents: InterventionDocument[]
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  fetchDocuments: () => Promise<void>
  deleteDocument: (documentId: string) => Promise<boolean>
  updateDocumentType: (documentId: string, type: InterventionDocument['document_type']) => Promise<boolean>
  refreshDocument: (documentId: string) => Promise<void>
}

export const useInterventionDocuments = ({
  interventionId,
  autoFetch = true,
  documentType,
  page = 1,
  limit = 20
}: UseInterventionDocumentsOptions): UseInterventionDocumentsReturn => {
  const [documents, setDocuments] = useState<InterventionDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(page)
  const [totalPages, setTotalPages] = useState(0)

  const fetchDocuments = useCallback(async () => {
    if (!interventionId) {
      console.warn('No intervention ID provided')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      })

      if (documentType) {
        params.append('type', documentType)
      }

      const response = await fetch(`/api/intervention/${interventionId}/documents?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération des documents')
      }

      setDocuments(data.documents || [])
      setTotalCount(data.totalCount || 0)
      setTotalPages(data.totalPages || 0)

      console.log(`✅ Fetched ${data.documents?.length || 0} documents for intervention ${interventionId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      console.error('❌ Error fetching documents:', err)
      setError(errorMessage)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [interventionId, documentType, currentPage, limit])

  const deleteDocument = useCallback(async (documentId: string): Promise<boolean> => {
    if (!documentId) return false

    try {
      const response = await fetch(`/api/intervention-document/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la suppression du document')
      }

      // Remove document from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
      setTotalCount(prev => Math.max(0, prev - 1))

      console.log(`✅ Document ${documentId} deleted successfully`)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      console.error('❌ Error deleting document:', err)
      setError(errorMessage)
      return false
    }
  }, [])

  const updateDocumentType = useCallback(async (
    documentId: string,
    type: InterventionDocument['document_type']
  ): Promise<boolean> => {
    if (!documentId || !type) return false

    try {
      const response = await fetch(`/api/intervention-document/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document_type: type }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour du document')
      }

      // Update document in local state
      setDocuments(prev => prev.map(doc =>
        doc.id === documentId
          ? { ...doc, document_type: type, updated_at: data.document.updated_at }
          : doc
      ))

      console.log(`✅ Document ${documentId} type updated to ${type}`)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      console.error('❌ Error updating document:', err)
      setError(errorMessage)
      return false
    }
  }, [])

  const refreshDocument = useCallback(async (documentId: string) => {
    if (!documentId) return

    try {
      const response = await fetch(`/api/intervention-document/${documentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la récupération du document')
      }

      // Update document in local state with fresh data including new signed URL
      setDocuments(prev => prev.map(doc =>
        doc.id === documentId ? data.document : doc
      ))

      console.log(`✅ Document ${documentId} refreshed with new signed URL`)
    } catch (err) {
      console.error('❌ Error refreshing document:', err)
      // Don't set error for single document refresh failure
    }
  }, [])

  // Auto-fetch on mount or when parameters change
  useEffect(() => {
    if (autoFetch) {
      fetchDocuments()
    }
  }, [interventionId, documentType, currentPage, limit, autoFetch])

  // Refresh signed URLs periodically (every 45 minutes for 1-hour expiry)
  useEffect(() => {
    if (documents.length === 0) return

    const refreshInterval = setInterval(() => {
      console.log('🔄 Refreshing signed URLs for all documents...')
      documents.forEach(doc => refreshDocument(doc.id))
    }, 45 * 60 * 1000) // 45 minutes

    return () => clearInterval(refreshInterval)
  }, [documents.length > 0])

  return {
    documents,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    fetchDocuments,
    deleteDocument,
    updateDocumentType,
    refreshDocument,
  }
}

// Helper function to get document type label
export const getDocumentTypeLabel = (type: InterventionDocument['document_type']): string => {
  const labels: Record<InterventionDocument['document_type'], string> = {
    photo_avant: 'Photo avant',
    photo_apres: 'Photo après',
    rapport: 'Rapport',
    facture: 'Facture',
    devis: 'Devis',
    autre: 'Autre',
  }
  return labels[type] || 'Document'
}

// Helper function to get document type color
export const getDocumentTypeColor = (type: InterventionDocument['document_type']): string => {
  const colors: Record<InterventionDocument['document_type'], string> = {
    photo_avant: 'blue',
    photo_apres: 'green',
    rapport: 'purple',
    facture: 'orange',
    devis: 'indigo',
    autre: 'gray',
  }
  return colors[type] || 'gray'
}

// Helper function to check if document is an image
export const isImageDocument = (mimeType: string): boolean => {
  return mimeType?.startsWith('image/') || false
}

// Helper function to check if document is a PDF
export const isPdfDocument = (mimeType: string): boolean => {
  return mimeType === 'application/pdf'
}

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}