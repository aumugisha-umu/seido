'use client'

import { Badge } from '@/components/ui/badge'
import { Paperclip, Building } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DummyEmail } from './dummy-data'

interface EmailListItemProps {
  email: DummyEmail
  isSelected: boolean
  onClick: () => void
}

export function EmailListItem({
  email,
  isSelected,
  onClick
}: EmailListItemProps) {
  const timeAgo = formatDistanceToNow(new Date(email.received_at), {
    addSuffix: true,
    locale: fr
  })

  return (
    <div
      className={`
        p-3 px-4 cursor-pointer transition-colors border-b
        hover:bg-muted/50
        ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}
        ${!email.is_read ? 'bg-blue-50/30' : ''}
      `}
      onClick={onClick}
      role="listitem"
      aria-label={`Email from ${email.sender_name}: ${email.subject}. ${email.is_read ? 'Read' : 'Unread'}`}
      aria-current={isSelected ? 'true' : 'false'}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Line 1: Sender + Timestamp */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={`text-sm truncate ${!email.is_read ? 'font-semibold' : ''}`}>
          {email.sender_name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">
          {timeAgo}
        </span>
      </div>

      {/* Line 2: Subject */}
      <div className={`text-sm ${email.is_read ? 'text-muted-foreground' : 'font-medium'} truncate mb-1`}>
        {email.subject}
      </div>

      {/* Line 3: Snippet (Balanced variant) */}
      <div className="text-xs text-muted-foreground line-clamp-1 mb-2">
        {email.snippet}
      </div>

      {/* Line 4: Metadata Badges (Balanced variant) */}
      <div className="flex items-center gap-1 flex-wrap" aria-label="Email metadata">
        {email.has_attachments && (
          <Paperclip className="w-3 h-3 text-muted-foreground" aria-label="Has attachments" />
        )}
        {email.building_name && (
          <Badge variant="secondary" className="text-xs h-5">
            <Building className="w-2.5 h-2.5 mr-1" aria-hidden="true" />
            {email.building_name}
          </Badge>
        )}
        {email.labels.map((label) => (
          <Badge
            key={label}
            variant={label === 'Urgent' ? 'destructive' : 'outline'}
            className="text-xs h-5"
            aria-label={`Label: ${label}`}
          >
            {label}
          </Badge>
        ))}
      </div>
    </div>
  )
}
