"use client"

import { useState, useCallback, useRef } from "react"
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDocumentUpload } from "@/hooks/use-document-upload"
import { InterventionDocument } from "@/hooks/use-intervention-documents"
import { cn } from "@/lib/utils"

interface DocumentUploadZoneProps {
  interventionId: string
  onUploadComplete?: (documents: any[]) => void
  maxFileSize?: number // in MB
  acceptedFileTypes?: string[]
  defaultDocumentType?: InterventionDocument['document_type']
  className?: string
}

const DEFAULT_MAX_FILE_SIZE = 10 // 10 MB
const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

interface FileWithMetadata {
  file: File
  documentType: InterventionDocument['document_type']
  description: string
}

export function DocumentUploadZone({
  interventionId,
  onUploadComplete,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  defaultDocumentType = 'autre',
  className,
}: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    uploads,
    isUploading,
    overallProgress,
    completedCount,
    errorCount,
    uploadFiles,
    clearUploads,
    removeUpload,
  } = useDocumentUpload({
    interventionId,
    onUploadComplete: (documents) => {
      setSelectedFiles([])
      onUploadComplete?.(documents)
      // Clear uploads after a delay to show completion
      setTimeout(() => {
        clearUploads()
      }, 3000)
    },
    onUploadError: (error) => {
      setValidationErrors([error])
    },
  })

  // Validate files
  const validateFiles = (files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = []
    const errors: string[] = []

    files.forEach(file => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        errors.push(`${file.name} dépasse la taille maximale de ${maxFileSize} MB`)
        return
      }

      // Check file type
      if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes(file.type)) {
        errors.push(`${file.name} n'est pas un type de fichier accepté`)
        return
      }

      // Check for duplicates in current selection
      if (selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size)) {
        errors.push(`${file.name} est déjà sélectionné`)
        return
      }

      valid.push(file)
    })

    return { valid, errors }
  }

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const { valid, errors } = validateFiles(fileArray)

    if (errors.length > 0) {
      setValidationErrors(errors)
    } else {
      setValidationErrors([])
    }

    if (valid.length > 0) {
      const filesWithMetadata: FileWithMetadata[] = valid.map(file => ({
        file,
        documentType: defaultDocumentType,
        description: ''
      }))
      setSelectedFiles(prev => [...prev, ...filesWithMetadata])
    }
  }

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }, [selectedFiles])

  // Remove selected file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Update file metadata
  const updateFileMetadata = (index: number, field: 'documentType' | 'description', value: string) => {
    setSelectedFiles(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  // Start upload
  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) return

    // Extract just the File objects for upload
    const files = selectedFiles.map(item => item.file)

    await uploadFiles(files)
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Create preview URL for image files
  const createPreviewUrl = (file: File): string | null => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    return null
  }

  return (
    <div className={cn("flex flex-col h-full space-y-4", className)}>
      {/* Drag and drop zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium mb-2">
          {isDragging ? "Déposez les fichiers ici" : "Glissez-déposez vos fichiers ici"}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          ou <span className="text-primary cursor-pointer">parcourez vos fichiers</span>
        </p>
        <p className="text-xs text-gray-400">
          Formats acceptés: Images, PDF, Word, Excel • Taille max: {maxFileSize} MB
        </p>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Selected files */}
      {selectedFiles.length > 0 && !isUploading && (
        <div className="flex flex-col flex-1 space-y-4 min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Fichiers sélectionnés ({selectedFiles.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFiles([])}
            >
              Tout supprimer
            </Button>
          </div>

          {/* File list with previews and individual metadata */}
          <div className="space-y-4 flex-1 overflow-y-auto">
            {selectedFiles.map((fileItem, index) => {
              const previewUrl = createPreviewUrl(fileItem.file)
              return (
                <div
                  key={`${fileItem.file.name}-${index}`}
                  className="border border-gray-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex gap-4">
                    {/* Preview thumbnail */}
                    <div className="relative group w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={fileItem.file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                      )}

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>

                    {/* File info and metadata */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div>
                        <p className="font-medium text-sm truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(fileItem.file.size)}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Document type */}
                        <div>
                          <Label htmlFor={`type-${index}`} className="text-xs">Type de document</Label>
                          <Select
                            value={fileItem.documentType}
                            onValueChange={(value) => updateFileMetadata(index, 'documentType', value)}
                          >
                            <SelectTrigger id={`type-${index}`} className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="photo_avant">Photo avant</SelectItem>
                              <SelectItem value="photo_apres">Photo après</SelectItem>
                              <SelectItem value="rapport">Rapport</SelectItem>
                              <SelectItem value="facture">Facture</SelectItem>
                              <SelectItem value="devis">Devis</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Description */}
                        <div>
                          <Label htmlFor={`desc-${index}`} className="text-xs">Description (optionnel)</Label>
                          <Input
                            id={`desc-${index}`}
                            value={fileItem.description}
                            onChange={(e) => updateFileMetadata(index, 'description', e.target.value)}
                            placeholder="Ex: Photo de la fuite cuisine"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upload button */}
          <div className="pt-4 pb-5 md:pb-10">
            <Button
              onClick={handleStartUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Télécharger {selectedFiles.length} fichier{selectedFiles.length > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">
              Téléchargement en cours...
            </h3>
            {!isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUploads}
              >
                Effacer
              </Button>
            )}
          </div>

          {/* Overall progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={overallProgress} />
              <p className="text-sm text-gray-500 text-center">
                {completedCount} / {uploads.length} fichier{uploads.length > 1 ? 's' : ''} téléchargé{uploads.length > 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Individual file progress */}
          <div className="space-y-2">
            {uploads.map((upload, index) => (
              <div
                key={`${upload.file.name}-${index}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {upload.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  )}
                  {upload.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {upload.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {upload.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{upload.file.name}</p>
                    {upload.error && (
                      <p className="text-xs text-red-500">{upload.error}</p>
                    )}
                  </div>
                </div>

                {upload.status === 'error' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeUpload(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Success message */}
          {!isUploading && completedCount > 0 && errorCount === 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {completedCount} fichier{completedCount > 1 ? 's' : ''} téléchargé{completedCount > 1 ? 's' : ''} avec succès!
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}