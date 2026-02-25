'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, ImageIcon, Sheet, Paperclip, RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface AttachmentForPreview {
  id: string
  filename: string
  file_size: number
  mime_type: string
}

interface AttachmentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  emailId: string
  attachment: AttachmentForPreview | null
}

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return Sheet
  return Paperclip
}

const isImage = (mimeType: string) =>
  mimeType.startsWith('image/')

const isPdf = (mimeType: string) =>
  mimeType === 'application/pdf'

/** Types that Google Docs Viewer can render */
const isGoogleViewable = (mimeType: string) => {
  const viewable = [
    // Office documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/msword', // doc
    'application/vnd.ms-excel', // xls
    'application/vnd.ms-powerpoint', // ppt
    // Text
    'text/plain',
    'text/csv',
    'text/html',
    // Other
    'application/rtf',
  ]
  if (viewable.includes(mimeType)) return true
  // Fallback: check filename-based extensions handled by Google Viewer
  return false
}

/** Check by file extension when mime_type is generic (e.g. application/octet-stream) */
const isGoogleViewableByExtension = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'rtf'].includes(ext)
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentPreviewModal({
  isOpen,
  onClose,
  emailId,
  attachment,
}: AttachmentPreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [contentLoading, setContentLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSignedUrl = useCallback(async () => {
    if (!attachment) return
    setLoading(true)
    setError(null)
    setSignedUrl(null)
    setContentLoading(true)
    try {
      const response = await fetch(`/api/emails/${emailId}/attachments/${attachment.id}`)
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const data = await response.json()
      setSignedUrl(data.signedUrl)
    } catch {
      setError('Impossible de charger le fichier')
    } finally {
      setLoading(false)
    }
  }, [emailId, attachment])

  // Fetch signed URL when modal opens
  const attachmentId = attachment?.id
  useEffect(() => {
    if (isOpen && attachmentId) {
      fetchSignedUrl()
    }
    if (!isOpen) {
      setSignedUrl(null)
      setError(null)
      setLoading(false)
      setContentLoading(true)
    }
  }, [isOpen, attachmentId, fetchSignedUrl])

  // Safety timeout: clear contentLoading after 15s even if iframe onLoad never fires
  useEffect(() => {
    if (!contentLoading || !signedUrl) return
    const timer = setTimeout(() => setContentLoading(false), 15_000)
    return () => clearTimeout(timer)
  }, [contentLoading, signedUrl])

  const handleDownload = useCallback(() => {
    if (!signedUrl || !attachment) return
    const link = document.createElement('a')
    link.href = signedUrl
    link.download = attachment.filename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Telechargement lance')
  }, [signedUrl, attachment])

  if (!attachment) return null

  const mimeType = attachment.mime_type
  const Icon = getAttachmentIcon(mimeType)
  const useImage = isImage(mimeType)
  const usePdf = isPdf(mimeType)
  const canOpenInGoogleDocs = !useImage && !usePdf && (isGoogleViewable(mimeType) || isGoogleViewableByExtension(attachment.filename))
  const canPreview = useImage || usePdf

  const googleViewerUrl = signedUrl
    ? `https://docs.google.com/gview?url=${encodeURIComponent(signedUrl)}`
    : null

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size="full"
    >
      <UnifiedModalHeader
        title={attachment.filename}
        subtitle={formatFileSize(attachment.file_size)}
        icon={<Icon className="h-5 w-5" />}
        badge={
          signedUrl ? (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Telecharger
            </Button>
          ) : undefined
        }
      />

      <UnifiedModalBody className="p-0 flex-1 min-h-[70vh]">
        <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-background overflow-hidden relative">
          {/* Loading signed URL */}
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center">
                <FileText className="h-8 w-8 text-red-500" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Impossible de charger le fichier</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchSignedUrl}>
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Reessayer
                </Button>
              </div>
            </div>
          )}

          {/* Content loading overlay (for iframe/image load) */}
          {!loading && !error && signedUrl && contentLoading && canPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement du fichier...</p>
              </div>
            </div>
          )}

          {/* Image preview */}
          {!loading && !error && signedUrl && useImage && (
            <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signedUrl}
                alt={attachment.filename}
                className="max-w-full max-h-full object-contain cursor-pointer"
                onLoad={() => setContentLoading(false)}
                onError={() => { setContentLoading(false); setError('Impossible de charger l\'image') }}
              />
            </a>
          )}

          {/* PDF preview */}
          {!loading && !error && signedUrl && usePdf && (
            <iframe
              src={`${signedUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={attachment.filename}
              onLoad={() => setContentLoading(false)}
              onError={() => { setContentLoading(false); setError('Impossible de charger le PDF') }}
            />
          )}

          {/* Non-previewable file fallback (includes Google Docs-openable files) */}
          {!loading && !error && signedUrl && !canPreview && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icon className="h-8 w-8 text-slate-500" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">{attachment.filename}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>
              <div className="flex gap-3">
                {canOpenInGoogleDocs && googleViewerUrl && (
                  <Button asChild>
                    <a href={googleViewerUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                      Ouvrir dans Google Docs
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                  Telecharger
                </Button>
              </div>
            </div>
          )}
        </div>
      </UnifiedModalBody>
    </UnifiedModal>
  )
}
