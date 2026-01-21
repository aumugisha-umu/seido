'use client'

import { MailboxEmail } from './types'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import DOMPurify from 'isomorphic-dompurify'
import { useMemo, useState } from 'react'
import { Paperclip, ChevronDown, ChevronRight } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { stripEmailQuotes, stripTextEmailQuotes } from '@/lib/utils/email-quote-stripper'

interface ConversationThreadProps {
  emails: MailboxEmail[]
}

function EmailThreadItem({ email }: { email: MailboxEmail }) {
  const [showQuotedContent, setShowQuotedContent] = useState(false)

  // Fallback chain: body_html → body_text → snippet → empty
  // This handles cases where HTML is empty (plain-text email replies)
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
    // Fallback: strip from plain text
    const textContent = email.body_text || email.snippet || ''
    if (textContent) {
      return stripTextEmailQuotes(textContent)
    }
    return { cleanHtml: '', hasQuotedContent: false }
  }, [sanitizedBody, email.body_text, email.snippet])

  // Determine if we have displayable content
  const hasHtmlContent = sanitizedBody && sanitizedBody.trim() !== ''
  const textFallback = email.body_text || email.snippet || ''

  return (
    <Card className="border">
      <CardContent className="p-6">
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
                {showQuotedContent ? 'Masquer le message cité' : 'Afficher le message cité'}
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
            <div className="text-sm font-medium mb-2">Attachments:</div>
            <div className="space-y-2">
              {email.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-muted cursor-pointer"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{attachment.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {(attachment.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ConversationThread({ emails }: ConversationThreadProps) {
  // Emails are already sorted in reverse order (latest first)
  return (
    <div className="space-y-6">
      {emails.map((email, index) => (
        <div key={email.id}>
          <EmailThreadItem email={email} />
          {index < emails.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  )
}

