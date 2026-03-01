'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileText, ImageIcon, Sheet, Paperclip, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

const isImage = (mimeType: string) => mimeType.startsWith('image/')
const isPdf = (mimeType: string) => mimeType === 'application/pdf'

const getFileExtension = (filename: string): string =>
  filename.split('.').pop()?.toUpperCase() || ''

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

  // Safety timeout: clear contentLoading after 15s if onLoad never fires
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
  const canPreview = isImage(mimeType) || isPdf(mimeType)

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      size={canPreview ? "full" : "lg"}
    >
      <UnifiedModalHeader
        title={attachment.filename}
        subtitle={formatFileSize(attachment.file_size)}
        icon={<Icon className="h-5 w-5" />}
      />

      <UnifiedModalBody className={cn("p-0 flex-1", canPreview && "min-h-[70vh]")}>
        <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-background overflow-hidden relative">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <FileText className="h-8 w-8 text-red-500" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium">Impossible de charger le fichier</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={fetchSignedUrl}>
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Reessayer
              </Button>
            </div>
          )}

          {/* Content loading overlay */}
          {!loading && !error && signedUrl && contentLoading && canPreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-background z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement du fichier...</p>
              </div>
            </div>
          )}

          {/* Image preview */}
          {!loading && !error && signedUrl && isImage(mimeType) && (
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
          {!loading && !error && signedUrl && isPdf(mimeType) && (
            <iframe
              src={`${signedUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-0"
              title={attachment.filename}
              onLoad={() => setContentLoading(false)}
              onError={() => { setContentLoading(false); setError('Impossible de charger le PDF') }}
            />
          )}

          {/* Download-only fallback */}
          {!loading && !error && signedUrl && !canPreview && (
            <div className="flex flex-col items-center gap-6 p-12 text-center max-w-md">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-sm">
                  <Icon className="h-10 w-10 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wide">
                  {getFileExtension(attachment.filename)}
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-foreground leading-snug">{attachment.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>

              <p className="text-sm text-muted-foreground">
                L&apos;apercu n&apos;est pas disponible pour ce type de fichier.
              </p>

              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Telecharger le fichier
              </Button>
            </div>
          )}
        </div>
      </UnifiedModalBody>
    </UnifiedModal>
  )
}
