import { useState, useCallback } from 'react'

interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  documentId?: string
}

interface UseDocumentUploadOptions {
  interventionId: string
  onUploadComplete?: (documents: unknown[]) => void
  onUploadError?: (_error: string) => void
}

export const useDocumentUpload = ({
  interventionId,
  onUploadComplete,
  onUploadError
}: UseDocumentUploadOptions) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!interventionId || files.length === 0) return

    setIsUploading(true)
    
    // Initialize upload progress for all files
    const initialUploads: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }))
    
    setUploads(initialUploads)

    try {
      const uploadPromises = files.map(async (file, index) => {
        // Update status to uploading
        setUploads(prev => prev.map((upload, i) => 
          i === index ? { ...upload, status: 'uploading' as const } : upload
        ))

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('interventionId', interventionId)
          formData.append('description', `Document ajouté pour l'intervention`)

          const response = await fetch('/api/upload-intervention-document', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de l\'upload')
          }

          // Update progress to completed
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { 
              ...upload, 
              status: 'completed' as const, 
              progress: 100,
              documentId: result.document.id
            } : upload
          ))

          return result.document

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
          
          // Update progress to error
          setUploads(prev => prev.map((upload, i) => 
            i === index ? { 
              ...upload, 
              status: 'error' as const, 
              error: errorMessage
            } : upload
          ))

          throw error
        }
      })

      const results = await Promise.allSettled(uploadPromises)
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => result.reason)

      if (successful.length > 0 && onUploadComplete) {
        onUploadComplete(successful)
      }

      if (failed.length > 0 && onUploadError) {
        onUploadError(`${failed.length} fichier(s) n'ont pas pu être uploadés`)
      }

      console.log(`✅ Upload completed: ${successful.length} successful, ${failed.length} failed`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload des fichiers'
      console.error('❌ Upload error:', error)
      
      if (onUploadError) {
        onUploadError(errorMessage)
      }
    } finally {
      setIsUploading(false)
    }
  }, [interventionId, onUploadComplete, onUploadError])

  const clearUploads = useCallback(() => {
    setUploads([])
  }, [])

  const removeUpload = useCallback((index: number) => {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Calculate overall progress
  const overallProgress = uploads.length > 0 
    ? uploads.reduce((sum, upload) => sum + upload.progress, 0) / uploads.length 
    : 0

  const completedUploads = uploads.filter(upload => upload.status === 'completed')
  const errorUploads = uploads.filter(upload => upload.status === 'error')

  return {
    uploads,
    isUploading,
    overallProgress,
    completedCount: completedUploads.length,
    errorCount: errorUploads.length,
    uploadFiles,
    clearUploads,
    removeUpload
  }
}
