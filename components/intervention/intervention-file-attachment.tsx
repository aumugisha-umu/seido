'use client'

import { useRef } from 'react'
import { Paperclip, X, FileText, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  FileWithPreview,
  InterventionDocumentType,
  DOCUMENT_TYPES
} from '@/hooks/use-intervention-upload'

interface InterventionFileAttachmentProps {
  files: FileWithPreview[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (fileId: string) => void
  onUpdateFileType: (fileId: string, documentType: InterventionDocumentType) => void
  isUploading?: boolean
  className?: string
  maxFiles?: number
}

export function InterventionFileAttachment({
  files,
  onAddFiles,
  onRemoveFile,
  onUpdateFileType,
  isUploading = false,
  className = '',
  maxFiles = 10
}: InterventionFileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      onAddFiles(selectedFiles)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onAddFiles(droppedFiles)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getStatusBadge = (file: FileWithPreview) => {
    switch (file.status) {
      case 'uploading':
        return (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Upload...
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="text-xs bg-green-600">
            Uploadé
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erreur
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Add files button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || files.length >= maxFiles}
        className="w-full"
      >
        <Paperclip className="h-4 w-4 mr-2" />
        Ajouter des fichiers {files.length > 0 && `(${files.length}/${maxFiles})`}
      </Button>

      {/* Files list */}
      {files.length > 0 && (
        <Card
          className="mt-4 p-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="text-sm text-muted-foreground mb-3">
            {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {files.map(file => (
              <div
                key={file.id}
                className="relative group border rounded-lg p-3 hover:border-blue-500 transition-colors"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors z-10"
                  aria-label={`Retirer ${file.file.name}`}
                >
                  <X className="h-3 w-3 text-gray-600 hover:text-red-600" />
                </button>

                {/* File preview/icon */}
                <div className="flex flex-col items-center mb-2">
                  {file.preview ? (
                    // Image preview
                    <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-100">
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    // File icon for non-images
                    <div className="w-full aspect-video rounded bg-gray-50 flex items-center justify-center">
                      {file.file.type === 'application/pdf' ? (
                        <FileText className="h-12 w-12 text-red-500" />
                      ) : file.file.type.includes('word') ? (
                        <FileText className="h-12 w-12 text-blue-500" />
                      ) : file.file.type.includes('excel') || file.file.type.includes('spreadsheet') ? (
                        <FileText className="h-12 w-12 text-green-500" />
                      ) : (
                        <FileText className="h-12 w-12 text-gray-500" />
                      )}
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium truncate" title={file.file.name}>
                    {file.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                  </p>

                  {/* Document type selector */}
                  <div className="w-full">
                    <Select
                      value={file.documentType}
                      onValueChange={(value) => onUpdateFileType(file.id, value as InterventionDocumentType)}
                      disabled={isUploading}
                    >
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue className="truncate" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-xs">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status badge */}
                  {getStatusBadge(file)}

                  {/* Error message */}
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Drag & drop hint */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Glissez-déposez des fichiers ici ou cliquez sur le bouton ci-dessus
          </div>
        </Card>
      )}

      {/* File limit info */}
      {files.length >= maxFiles && (
        <p className="text-xs text-amber-600 mt-2">
          Limite de {maxFiles} fichiers atteinte
        </p>
      )}
    </div>
  )
}
