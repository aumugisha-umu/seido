'use client'

/**
 * Document Upload Dialog Component
 * Handles file upload for intervention documents with validation
 */

import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  File,
  X,
  AlertCircle,
  CheckCircle,
  FileImage,
  FileText,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type DocumentType = Database['public']['Enums']['intervention_document_type']

interface DocumentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  interventionId: string
  onUploadComplete?: (documentId: string) => void
}

// Document type options
const documentTypes: { value: DocumentType; label: string }[] = [
  { value: 'photo_avant', label: 'Photo avant travaux' },
  { value: 'photo_apres', label: 'Photo après travaux' },
  { value: 'devis', label: 'Devis' },
  { value: 'facture', label: 'Facture' },
  { value: 'rapport', label: 'Rapport d\'intervention' },
  { value: 'plan', label: 'Plan' },
  { value: 'certificat', label: 'Certificat' },
  { value: 'garantie', label: 'Garantie' },
  { value: 'bon_de_commande', label: 'Bon de commande' },
  { value: 'autre', label: 'Autre' }
]

// Accepted file types
const acceptedTypes = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
}

// File type icons
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return FileImage
  return FileText
}

// Format file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// Check if file type is accepted
const isFileTypeAccepted = (file: File): boolean => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  for (const [mimeType, extensions] of Object.entries(acceptedTypes)) {
    if (mimeType === 'image/*' && file.type.startsWith('image/')) {
      return extensions.includes(extension)
    }
    if (file.type === mimeType || extensions.includes(extension)) {
      return true
    }
  }
  return false
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  interventionId,
  onUploadComplete
}: DocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<DocumentType>('autre')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file selection
  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles = Array.from(selectedFiles)

    // Limit to 5 files
    if (files.length + newFiles.length > 5) {
      toast.error('Maximum 5 fichiers autorisés')
      return
    }

    // Check file types and sizes
    const validFiles: File[] = []
    for (const file of newFiles) {
      if (!isFileTypeAccepted(file)) {
        toast.error(`Type de fichier non accepté: ${file.name}`)
        continue
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Fichier trop volumineux (max 10MB): ${file.name}`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles])
      setUploadError(null)
    }
  }

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  // Remove file from list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Handle upload
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Veuillez sélectionner au moins un fichier')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadError(null)

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('interventionId', interventionId)
      formData.append('documentType', documentType)
      formData.append('description', description)

      // Add files
      files.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })

      // Upload with progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          toast.success('Documents uploadés avec succès')
          onUploadComplete?.(response.documentId)
          handleClose()
        } else {
          throw new Error('Upload failed')
        }
      })

      xhr.addEventListener('error', () => {
        throw new Error('Network error')
      })

      xhr.open('POST', `/api/interventions/${interventionId}/documents`)
      xhr.send(formData)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Une erreur est survenue lors de l\'upload')
      toast.error('Erreur lors de l\'upload des documents')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle close
  const handleClose = () => {
    if (!uploading) {
      setFiles([])
      setDocumentType('autre')
      setDescription('')
      setUploadError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter des documents</DialogTitle>
          <DialogDescription>
            Uploadez des documents liés à cette intervention (photos, devis, factures, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="document-type">Type de document</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as DocumentType)}
              disabled={uploading}
            >
              <SelectTrigger id="document-type">
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Ajoutez une description pour ces documents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>Fichiers</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors hover:border-primary/50
                ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
                accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx"
                disabled={uploading}
              />
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              {isDragging ? (
                <p className="text-sm text-muted-foreground">
                  Déposez les fichiers ici...
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez des fichiers ici, ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum 5 fichiers, 10MB par fichier
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formats: Images, PDF, Word, Excel
                  </p>
                </>
              )}
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Fichiers sélectionnés ({files.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => {
                  const FileIcon = getFileIcon(file.type)
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      {!uploading && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFile(index)
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Upload en cours...</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">
                {uploadProgress}%
              </p>
            </div>
          )}

          {/* Error Alert */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Upload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Uploader ({files.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}