import { useState, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'

// Allowed MIME types (matching server-side validation)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export interface FileWithPreview {
  id: string
  file: File
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  documentId?: string
  signedUrl?: string
}

export interface UseChatUploadOptions {
  threadId: string
  onUploadComplete?: (documentIds: string[]) => void
  onUploadError?: (error: string) => void
}

export const useChatUpload = ({
  threadId,
  onUploadComplete,
  onUploadError
}: UseChatUploadOptions) => {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview)
        }
      })
    }
  }, [files])

  // Validate a single file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `Le fichier "${file.name}" dépasse la taille maximale de 10 MB`
    }

    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Le type de fichier "${file.name}" n'est pas autorisé`
    }

    return null
  }, [])

  // Add files with validation and preview generation
  const addFiles = useCallback((newFiles: File[]) => {
    const validatedFiles: FileWithPreview[] = []
    const errors: string[] = []

    newFiles.forEach(file => {
      // Check for duplicates
      const isDuplicate = files.some(f =>
        f.file.name === file.name &&
        f.file.size === file.size &&
        f.file.lastModified === file.lastModified
      )

      if (isDuplicate) {
        errors.push(`Le fichier "${file.name}" est déjà dans la liste`)
        return
      }

      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(validationError)
        return
      }

      // Generate preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      validatedFiles.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview,
        progress: 0,
        status: 'pending'
      })
    })

    if (validatedFiles.length > 0) {
      setFiles(prev => [...prev, ...validatedFiles])
    }

    if (errors.length > 0 && onUploadError) {
      onUploadError(errors.join('\n'))
    }
  }, [files, validateFile, onUploadError])

  // Remove a file from the list
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }, [])

  // Upload all pending files
  const uploadFiles = useCallback(async (): Promise<string[]> => {
    if (!threadId || files.length === 0) {
      return []
    }

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error')
    if (pendingFiles.length === 0) {
      // All files already uploaded, return their IDs
      return files.filter(f => f.documentId).map(f => f.documentId!)
    }

    setIsUploading(true)

    try {
      const uploadPromises = pendingFiles.map(async (fileWithPreview) => {
        // Update status to uploading
        setFiles(prev => prev.map(f =>
          f.id === fileWithPreview.id ? { ...f, status: 'uploading' as const } : f
        ))

        try {
          const formData = new FormData()
          formData.append('file', fileWithPreview.file)
          formData.append('threadId', threadId)
          formData.append('description', `Fichier partagé via chat`)

          const response = await fetch('/api/conversations/upload', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de l\'upload')
          }

          // Update status to completed
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id ? {
              ...f,
              status: 'completed' as const,
              progress: 100,
              documentId: result.document.id,
              signedUrl: result.document.signedUrl
            } : f
          ))

          return result.document.id

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

          logger.error('❌ File upload error:', { error, file: fileWithPreview.file.name })

          // Update status to error
          setFiles(prev => prev.map(f =>
            f.id === fileWithPreview.id ? {
              ...f,
              status: 'error' as const,
              error: errorMessage
            } : f
          ))

          throw error
        }
      })

      const results = await Promise.allSettled(uploadPromises)

      const successfulIds = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value)

      const failed = results.filter(result => result.status === 'rejected')

      if (successfulIds.length > 0 && onUploadComplete) {
        onUploadComplete(successfulIds)
      }

      if (failed.length > 0 && onUploadError) {
        onUploadError(`${failed.length} fichier(s) n'ont pas pu être uploadés`)
      }

      logger.info(`✅ Chat upload completed: ${successfulIds.length} successful, ${failed.length} failed`)

      return successfulIds

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'upload des fichiers'
      logger.error('❌ Chat upload error:', error)

      if (onUploadError) {
        onUploadError(errorMessage)
      }

      return []
    } finally {
      setIsUploading(false)
    }
  }, [threadId, files, onUploadComplete, onUploadError])

  // Clear all files
  const clearFiles = useCallback(() => {
    // Cleanup previews
    files.forEach(f => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview)
      }
    })
    setFiles([])
  }, [files])

  // Calculate stats
  const completedFiles = files.filter(f => f.status === 'completed')
  const errorFiles = files.filter(f => f.status === 'error')
  const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'uploading')

  const uploadProgress: Record<string, number> = {}
  files.forEach(f => {
    uploadProgress[f.id] = f.progress
  })

  return {
    files,
    isUploading,
    uploadProgress,
    completedCount: completedFiles.length,
    errorCount: errorFiles.length,
    pendingCount: pendingFiles.length,
    addFiles,
    removeFile,
    uploadFiles,
    clearFiles,
    hasFiles: files.length > 0,
    hasPendingUploads: pendingFiles.length > 0
  }
}
