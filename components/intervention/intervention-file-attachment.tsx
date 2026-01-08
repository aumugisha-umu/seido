'use client'

import { useRef, useState, useEffect } from 'react'
import { Paperclip, X, FileText, AlertCircle, Loader2, Eye, ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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

/**
 * Interface pour les documents existants (déjà uploadés en DB)
 */
export interface ExistingDocument {
  id: string
  original_filename: string
  file_size: number
  mime_type: string
  document_type: string
  storage_path: string
  uploaded_at: string
  /** URL signée pour la preview/téléchargement */
  signedUrl?: string
}

interface InterventionFileAttachmentProps {
  files: FileWithPreview[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (fileId: string) => void
  onUpdateFileType: (fileId: string, documentType: InterventionDocumentType) => void
  isUploading?: boolean
  className?: string
  maxFiles?: number
  /** Documents existants (mode édition) */
  existingDocuments?: ExistingDocument[]
  /** Callback pour supprimer un document existant */
  onRemoveExistingDocument?: (documentId: string) => void
  /** IDs des documents marqués pour suppression */
  documentsToDelete?: string[]
}

export function InterventionFileAttachment({
  files,
  onAddFiles,
  onRemoveFile,
  onUpdateFileType,
  isUploading = false,
  className = '',
  maxFiles = 10,
  existingDocuments = [],
  onRemoveExistingDocument,
  documentsToDelete = []
}: InterventionFileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)

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

  // Navigation functions for preview modal
  const handlePrevious = () => {
    setCurrentFileIndex(prev => Math.max(0, prev - 1))
  }

  const handleNext = () => {
    setCurrentFileIndex(prev => Math.min(files.length - 1, prev + 1))
  }

  const handleOpenPreview = (index: number) => {
    setCurrentFileIndex(index)
    setPreviewModalOpen(true)
  }

  // Get file URL for preview
  const getFileUrl = (file: FileWithPreview) => {
    if (file.preview) return file.preview
    return URL.createObjectURL(file.file)
  }

  // Keyboard navigation
  useEffect(() => {
    if (!previewModalOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious()
      if (e.key === 'ArrowRight') handleNext()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewModalOpen, currentFileIndex, files.length])

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (!file.preview && file.file) {
          const url = URL.createObjectURL(file.file)
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [files])

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Documents existants actifs (non marqués pour suppression) */}
      {(() => {
        const activeExistingDocs = existingDocuments.filter(doc => !documentsToDelete.includes(doc.id))
        const totalFiles = activeExistingDocs.length + files.length
        const hasAnyFiles = totalFiles > 0

        return (
          <>
            {/* Add files button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || totalFiles >= maxFiles}
              className={`w-full shrink-0 ${!hasAnyFiles ? 'flex-1 min-h-0' : ''}`}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Ajouter des fichiers {hasAnyFiles && `(${totalFiles}/${maxFiles})`}
            </Button>

            {/* Existing documents section */}
            {activeExistingDocs.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-slate-600">
                  Documents existants ({activeExistingDocs.length})
                </p>
                <div className="flex gap-3 overflow-x-auto max-w-[300px]">
                  {activeExistingDocs.map((doc) => {
                    const isImage = doc.mime_type?.startsWith('image/')
                    const isPdf = doc.mime_type === 'application/pdf'
                    const docTypeLabel = DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type

                    return (
                      <div
                        key={doc.id}
                        className="relative group border rounded-lg p-3 hover:border-blue-500 transition-colors w-[280px] flex-shrink-0 bg-white"
                      >
                        {/* Remove button */}
                        {onRemoveExistingDocument && (
                          <button
                            type="button"
                            onClick={() => onRemoveExistingDocument(doc.id)}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors z-10"
                            aria-label={`Supprimer ${doc.original_filename}`}
                          >
                            <Trash2 className="h-3 w-3 text-gray-600 hover:text-red-600" />
                          </button>
                        )}

                        {/* File preview/icon */}
                        <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-100 mb-2">
                          {isImage && doc.signedUrl ? (
                            <img
                              src={doc.signedUrl}
                              alt={doc.original_filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                              <FileText className={`h-12 w-12 ${isPdf ? 'text-red-500' : 'text-gray-500'}`} />
                            </div>
                          )}

                          {/* Overlay with file info */}
                          <div className="absolute inset-0 bg-black/70 flex flex-col justify-between p-3">
                            {/* Top section - Download button */}
                            <div className="flex justify-end gap-2">
                              {doc.signedUrl && (
                                <a
                                  href={doc.signedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-white/90 hover:bg-white rounded-md transition-colors"
                                  aria-label="Télécharger le fichier"
                                >
                                  <Download className="h-4 w-4 text-gray-900" />
                                </a>
                              )}
                            </div>

                            {/* Bottom section - File info */}
                            <div className="space-y-2">
                              <p className="text-xs text-white font-medium truncate drop-shadow-md" title={doc.original_filename}>
                                {doc.original_filename}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-xs bg-white/90 text-gray-900">
                                  {docTypeLabel}
                                </Badge>
                                <span className="text-xs text-white/80">
                                  {formatFileSize(doc.file_size)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Uploaded badge */}
                        <Badge variant="default" className="text-xs bg-green-600">
                          Uploadé
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* New files list */}
      {files.length > 0 && (
        <div className="mt-4 flex-1 min-h-0 flex flex-col max-w-full">
          {existingDocuments.length > 0 && (
            <p className="text-xs font-medium text-slate-600 mb-2">
              Nouveaux fichiers ({files.length})
            </p>
          )}
          <div
            className={`flex gap-3 max-w-[300px] ${files.length > 1 ? 'overflow-x-auto' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {files.map((file, index) => (
              <div
                key={file.id}
                className="relative group border rounded-lg p-3 hover:border-blue-500 transition-colors w-[280px] flex-shrink-0 bg-white"
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

                {/* File preview/icon with Material Design overlay */}
                <div className="relative w-full aspect-video rounded overflow-hidden bg-gray-100 mb-2 group">
                  {file.preview ? (
                    // Image preview
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    // File icon for non-images
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
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

                  {/* Full height overlay with preview button */}
                  <div className="absolute inset-0 bg-black/70 flex flex-col justify-between p-3">
                    {/* Top section - Preview button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(index)}
                        className="p-2 bg-white/90 hover:bg-white rounded-md transition-colors"
                        aria-label="Aperçu du fichier"
                      >
                        <Eye className="h-4 w-4 text-gray-900" />
                      </button>
                    </div>

                    {/* Bottom section - File info */}
                    <div className="space-y-2">
                      {/* File name */}
                      <p className="text-xs text-white font-medium truncate drop-shadow-md" title={file.file.name}>
                        {file.file.name}
                      </p>

                      {/* Document type selector */}
                      <div className="w-full">
                        <Select
                          value={file.documentType}
                          onValueChange={(value) => onUpdateFileType(file.id, value as InterventionDocumentType)}
                          disabled={isUploading}
                        >
                          <SelectTrigger className="h-7 text-xs w-full bg-white/95 hover:bg-white text-gray-900 border-gray-200">
                            <SelectValue className="truncate" />
                          </SelectTrigger>
                          <SelectContent sideOffset={4} align="start" collisionPadding={8}>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="text-xs">
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status badge and error message (outside overlay) */}
                <div className="space-y-1.5">
                  {getStatusBadge(file)}
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">{file.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Drag & drop hint */}
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Déposez des fichiers ici ou cliquez sur le bouton ci-dessus
          </div>
        </div>
      )}

      {/* File limit info */}
      {files.length >= maxFiles && (
        <p className="text-xs text-amber-600 mt-2">
          Limite de {maxFiles} fichiers atteinte
        </p>
      )}

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">Aperçu du fichier</DialogTitle>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <span className="text-sm text-muted-foreground font-medium">
              {currentFileIndex + 1} / {files.length}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 relative flex items-center justify-center bg-gray-50 min-h-0">
            {/* Previous button */}
            {currentFileIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="absolute left-4 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors z-10"
                aria-label="Fichier précédent"
              >
                <ChevronLeft className="h-6 w-6 text-gray-900" />
              </button>
            )}

            {/* File preview */}
            <div className="h-full w-full flex items-center justify-center p-4">
              {files[currentFileIndex]?.file.type.startsWith('image/') ? (
                <img
                  src={getFileUrl(files[currentFileIndex])}
                  alt={files[currentFileIndex].file.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : files[currentFileIndex]?.file.type === 'application/pdf' ? (
                <iframe
                  src={getFileUrl(files[currentFileIndex])}
                  className="w-full h-full border-0"
                  title="PDF preview"
                />
              ) : (
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">
                    Aperçu non disponible pour ce type de fichier
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {files[currentFileIndex]?.file.type}
                  </p>
                </div>
              )}
            </div>

            {/* Next button */}
            {currentFileIndex < files.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors z-10"
                aria-label="Fichier suivant"
              >
                <ChevronRight className="h-6 w-6 text-gray-900" />
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white shrink-0">
            <p className="text-sm font-medium text-center text-gray-900">
              {files[currentFileIndex]?.file.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
