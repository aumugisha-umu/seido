'use client'

import { DummyEmail } from './dummy-data'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import DOMPurify from 'isomorphic-dompurify'
import { useMemo } from 'react'
import { Paperclip } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface ConversationThreadProps {
  emails: DummyEmail[]
}

function EmailThreadItem({ email }: { email: DummyEmail }) {
  const sanitizedBody = useMemo(() => {
    return DOMPurify.sanitize(email.body_html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'],
      ALLOWED_ATTR: ['href', 'target', 'style', 'src', 'alt', 'loading', 'decoding'],
      ALLOW_DATA_ATTR: false
    })
  }, [email.body_html])

  return (
    <Card className="border">
      <CardContent className="p-6">
        {/* Header compact - sans sujet ni badges */}
        <div className="mb-4 pb-4 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-nowrap min-w-0">
            <span className="font-medium text-foreground shrink-0 hidden sm:inline">From:</span>
            <span className="min-w-0 truncate">{email.sender_name} ({email.sender_email})</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0 whitespace-nowrap">
              <span className="sm:hidden">
                {format(new Date(email.received_at), 'dd/MM/yy', { locale: fr })}
              </span>
              <span className="hidden sm:inline">
                {format(new Date(email.received_at), 'PPp', { locale: fr })}
              </span>
            </span>
          </div>
        </div>

        {/* Email body */}
        <div
          className="w-full break-words [&_*]:max-w-full [&_*]:box-border [&_div]:block [&_div]:w-full [&_table]:w-full prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedBody }}
        />

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

