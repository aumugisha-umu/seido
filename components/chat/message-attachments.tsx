'use client'

/**
 * Message Attachments Component
 * Displays file attachments within chat messages
 */

import { FileText, Image as ImageIcon, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Attachment {
  id: string
  filename: string
  original_filename: string
  mime_type: string
  file_size: number
  signedUrl?: string
  document_type?: string
}

interface MessageAttachmentsProps {
  attachments: Attachment[]
  className?: string
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Check if file is an image
function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

// Get appropriate icon for file type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return ImageIcon
  }
  return FileText
}

// Single attachment card
function AttachmentCard({ attachment }: { attachment: Attachment }) {
  const Icon = getFileIcon(attachment.mime_type)
  const isImg = isImage(attachment.mime_type)

  const handleDownload = () => {
    if (attachment.signedUrl) {
      window.open(attachment.signedUrl, '_blank')
    }
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all hover:shadow-md",
      isImg ? "w-full" : "w-full"
    )}>
      {isImg && attachment.signedUrl ? (
        // Image preview
        <div className="relative group">
          <img
            src={attachment.signedUrl}
            alt={attachment.original_filename}
            className="w-full h-32 object-cover cursor-pointer"
            onClick={handleDownload}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Ouvrir
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <p className="text-xs text-white truncate font-medium">
              {attachment.original_filename}
            </p>
          </div>
        </div>
      ) : (
        // Document preview
        <div className="flex items-center gap-3 p-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {attachment.original_filename}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.file_size)}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!attachment.signedUrl}
            className="flex-shrink-0"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  )
}

export function MessageAttachments({ attachments, className }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Badge indicating attached files */}
      <Badge variant="secondary" className="text-xs gap-1">
        <FileText className="w-3 h-3" />
        {attachments.length} fichier{attachments.length > 1 ? 's' : ''} partagé{attachments.length > 1 ? 's' : ''}
      </Badge>

      {/* Grid of attachments */}
      <div className={cn(
        "grid gap-2",
        attachments.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
      )}>
        {attachments.map((attachment) => (
          <AttachmentCard key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  )
}
