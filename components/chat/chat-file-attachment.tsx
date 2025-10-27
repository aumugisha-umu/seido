'use client'

/**
 * Chat File Attachment Component
 * Handles file selection, preview, and upload for chat messages
 */

import { useRef } from 'react'
import { X, FileText, Image as ImageIcon, Paperclip, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { FileWithPreview } from '@/hooks/use-chat-upload'

interface ChatFileAttachmentProps {
  files: FileWithPreview[]
  isUploading: boolean
  onAddFiles: (files: File[]) => void
  onRemoveFile: (fileId: string) => void
  className?: string
}

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// File preview component
function FilePreview({ file, onRemove }: { file: FileWithPreview; onRemove: () => void }) {
  const isImage = file.file.type.startsWith('image/')

  return (
    <Card className={cn(
      "relative group overflow-hidden",
      file.status === 'error' && "border-destructive",
      file.status === 'completed' && "border-green-500"
    )}>
      {/* Remove button */}
      {file.status !== 'uploading' && (
        <Button
          onClick={onRemove}
          size="icon"
          variant="destructive"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Image preview */}
      {isImage && file.preview ? (
        <div className="relative w-full h-20">
          <img
            src={file.preview}
            alt={file.file.name}
            className="w-full h-full object-cover"
          />
          {file.status === 'uploading' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        /* Document preview */
        <div className="flex items-center gap-2 p-2">
          <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{file.file.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatFileSize(file.file.size)}
            </p>
          </div>
          {file.status === 'uploading' && (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin flex-shrink-0" />
          )}
        </div>
      )}

      {/* Status badges */}
      {file.status === 'error' && file.error && (
        <div className="absolute bottom-0 left-0 right-0 bg-destructive text-destructive-foreground text-[10px] px-1 py-0.5 truncate">
          {file.error}
        </div>
      )}
      {file.status === 'completed' && (
        <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-[10px] px-1 py-0.5 text-center">
          Uploadé
        </div>
      )}
    </Card>
  )
}

export function ChatFileAttachment({
  files,
  isUploading,
  onAddFiles,
  onRemoveFile,
  className
}: ChatFileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 0) {
      onAddFiles(selectedFiles)
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      onAddFiles(droppedFiles)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
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

      {/* File picker button (rendered externally) */}
      <Button
        onClick={openFilePicker}
        variant="ghost"
        size="icon"
        disabled={isUploading}
        type="button"
        aria-label="Joindre un fichier"
      >
        <Paperclip className="w-4 h-4" />
      </Button>

      {/* File previews */}
      {files.length > 0 && (
        <Card
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="mb-2 p-3 border-dashed"
        >
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
            </span>
            {isUploading && (
              <Badge variant="secondary" className="ml-auto">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Upload en cours...
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {files.map((file) => (
              <FilePreview
                key={file.id}
                file={file}
                onRemove={() => onRemoveFile(file.id)}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Glissez-déposez des fichiers ici ou cliquez sur le bouton trombone pour en ajouter
          </p>
        </Card>
      )}
    </div>
  )
}
