'use client'

import { MailboxEmail } from './types'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import DOMPurify from 'isomorphic-dompurify'
import { useMemo, useState, useCallback } from 'react'
import { Paperclip, ChevronDown, ChevronRight, ArrowUpRight, ArrowDownLeft, Download, Loader2, FileText, ImageIcon, Sheet, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { stripEmailQuotes, stripTextEmailQuotes } from '@/lib/utils/email-quote-stripper'
import { AttachmentPreviewModal } from './attachment-preview-modal'

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') return FileText
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return Sheet
  return Paperclip
}

interface ConversationThreadProps {
  emails: MailboxEmail[]
}

function EmailThreadItem({ email }: { email: MailboxEmail }) {
  const [showQuotedContent, setShowQuotedContent] = useState(false)
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<{ id: string; filename: string; file_size: number; mime_type: string } | null>(null)

  const handleDownloadAttachment = useCallback(async (attachmentId: string, filename: string) => {
    setDownloadingAttachmentId(attachmentId)
    try {
      const response = await fetch(`/api/emails/${email.id}/attachments/${attachmentId}`)
      if (!response.ok) throw new Error('Erreur lors du telechargement')
      const data = await response.json()
      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = filename
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      toast.error('Impossible de telecharger la piece jointe')
    } finally {
      setDownloadingAttachmentId(null)
    }
  }, [email.id])

  const isSent = email.direction === 'sent'

  // Fallback chain: body_html -> body_text -> snippet -> empty
  const sanitizedBody = useMemo(() => {
    const content = email.body_html || email.body_text || email.snippet || ''
    if (!content.trim()) return ''

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'src', 'alt', 'loading', 'decoding'],
      ALLOW_DATA_ATTR: false
    })
  }, [email.body_html, email.body_text, email.snippet])

  // Apply quote stripping to clean up email replies
  const strippedContent = useMemo(() => {
    if (sanitizedBody && sanitizedBody.trim() !== '') {
      return stripEmailQuotes(sanitizedBody)
    }
    const textContent = email.body_text || email.snippet || ''
    if (textContent) {
      return stripTextEmailQuotes(textContent)
    }
    return { cleanHtml: '', hasQuotedContent: false }
  }, [sanitizedBody, email.body_text, email.snippet])

  const hasHtmlContent = sanitizedBody && sanitizedBody.trim() !== ''
  const textFallback = email.body_text || email.snippet || ''

  const dateStr = email.received_at
    ? format(new Date(email.received_at), 'PPp', { locale: fr })
    : ''

  return (
    <Card className={`border ${isSent ? 'border-l-4 border-l-primary/60 bg-primary/[0.02]' : ''}`}>
      <CardContent className="p-6">
        {/* Sender header with direction indicator */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
          {isSent ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-primary shrink-0" aria-label="Envoy&#233;" />
          ) : (
            <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="Re&#231;u" />
          )}
          <span className={`text-sm font-medium truncate ${isSent ? 'text-primary' : 'text-foreground'}`}>
            {isSent ? 'Vous' : email.sender_name}
          </span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {dateStr}
          </span>
        </div>

        {/* Email body - Cleaned (quotes stripped) */}
        {hasHtmlContent ? (
          <div
            className="w-full break-words [&_*]:max-w-full [&_*]:box-border [&_div]:block [&_div]:w-full [&_table]:w-full prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: strippedContent.cleanHtml || sanitizedBody }}
          />
        ) : textFallback ? (
          <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
            {strippedContent.cleanHtml || textFallback}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucun contenu</p>
        )}

        {/* Quoted Content Toggle */}
        {strippedContent.hasQuotedContent && strippedContent.quotedHtml && (
          <div className="mt-3">
            <button
              onClick={() => setShowQuotedContent(!showQuotedContent)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1.5 rounded hover:bg-muted/50"
              aria-expanded={showQuotedContent}
            >
              {showQuotedContent ? (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              )}
              <span>
                {showQuotedContent ? 'Masquer le message cit\u00e9' : 'Afficher le message cit\u00e9'}
              </span>
            </button>

            {showQuotedContent && (
              <div className="mt-2 pl-3 border-l-2 border-muted opacity-70">
                <div className="prose prose-sm max-w-none overflow-hidden">
                  {hasHtmlContent ? (
                    <div
                      className="break-words text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: strippedContent.quotedHtml }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground leading-relaxed">
                      {strippedContent.quotedHtml}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {email.has_attachments && email.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium mb-2">
              Pi&#232;ces jointes ({email.attachments.length})
            </div>
            <div className="space-y-2">
              {email.attachments.map((attachment) => {
                const AttachmentIcon = getAttachmentIcon(attachment.mime_type)
                return (
                  <div key={attachment.id}>
                    <div className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <AttachmentIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{attachment.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {(attachment.file_size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Pr\u00e9visualiser ${attachment.filename}`}
                          onClick={() => setPreviewAttachment(attachment)}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`T\u00e9l\u00e9charger ${attachment.filename}`}
                          disabled={downloadingAttachmentId === attachment.id}
                          onClick={() => handleDownloadAttachment(attachment.id, attachment.filename)}
                        >
                          {downloadingAttachmentId === attachment.id
                            ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            : <Download className="h-4 w-4" aria-hidden="true" />
                          }
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Attachment Preview Modal — rendered per thread item for independent state */}
      <AttachmentPreviewModal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        emailId={email.id}
        attachment={previewAttachment}
      />
    </Card>
  )
}

export function ConversationThread({ emails }: ConversationThreadProps) {
  // Emails sorted chronologically (oldest first) — matches Gmail thread view
  return (
    <div className="space-y-4">
      {emails.map((email) => (
        <EmailThreadItem key={email.id} email={email} />
      ))}
    </div>
  )
}
