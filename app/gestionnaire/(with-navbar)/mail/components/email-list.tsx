'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, SortDesc } from 'lucide-react'
import { EmailListItem } from './email-list-item'
import { DummyEmail, groupEmailsByConversation, ConversationGroup } from './dummy-data'
import { ConversationGroupComponent } from './conversation-group'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EmailListProps {
  emails: DummyEmail[]
  selectedEmailId?: string
  onEmailSelect: (emailId: string) => void
  onConversationSelect?: (conversationId: string) => void
  totalEmails?: number
  onLoadMore?: () => void
}

export function EmailList({
  emails,
  selectedEmailId,
  onEmailSelect,
  onConversationSelect,
  totalEmails = 0,
  onLoadMore
}: EmailListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [hasAttachments, setHasAttachments] = useState(false)

  // Sentinel ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && onLoadMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [onLoadMore, emails.length]) // Re-observe when list changes

  const filteredEmails = emails.filter((email) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      email.sender_name.toLowerCase().includes(query) ||
      email.subject.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)

    const matchesAttachments = !hasAttachments || email.has_attachments

    // Date filter (simplified for dummy data)
    const matchesDate = dateFilter === 'all' || true

    return matchesSearch && matchesAttachments && matchesDate
  })

  // Group emails by conversation
  const groupedItems = groupEmailsByConversation(filteredEmails)

  return (
    <div className="w-[400px] border-r flex flex-col h-full" role="region" aria-label="Email list">
      {/* Search Bar (Balanced variant) */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            aria-label="Search emails by sender, subject, or content"
            suppressHydrationWarning
          />
        </div>

        {/* Filters Toolbar (Balanced variant) */}
        <div className="flex gap-2 flex-wrap" role="toolbar" aria-label="Email filters">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px]" aria-label="Filter by date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This week</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={hasAttachments ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setHasAttachments(!hasAttachments)}
            aria-label={hasAttachments ? "Remove attachments filter" : "Filter emails with attachments"}
            aria-pressed={hasAttachments}
          >
            📎 Has attachments
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            aria-label="Sort emails"
          >
            <SortDesc className="mr-1 h-3 w-3" aria-hidden="true" />
            Sort
          </Button>
        </div>
      </div>

      {/* Email List with ScrollArea */}
      <ScrollArea className="flex-1 min-h-0">
        {groupedItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" role="status">
            <p>No emails found</p>
            {searchQuery && (
              <p className="text-sm mt-2">
                Try adjusting your search or filters
              </p>
            )}
          </div>
        ) : (
          <div role="list" aria-label={`${groupedItems.length} items`}>
            {groupedItems.map((item) => {
              // Check if it's a conversation group or standalone email
              if ('parent' in item && 'children' in item) {
                // It's a ConversationGroup
                return (
                  <ConversationGroupComponent
                    key={item.conversationId}
                    group={item}
                    selectedEmailId={selectedEmailId}
                    onEmailSelect={onEmailSelect}
                    onConversationSelect={onConversationSelect || ((id) => {
                      // Default: select parent email
                      const parent = item.parent
                      onEmailSelect(parent.id)
                    })}
                  />
                )
              } else {
                // It's a standalone email
                return (
                  <EmailListItem
                    key={item.id}
                    email={item}
                    isSelected={item.id === selectedEmailId}
                    onClick={() => onEmailSelect(item.id)}
                  />
                )
              }
            })}

            {/* Sentinel for infinite scroll */}
            <div ref={loadMoreRef} className="h-4 w-full" />
          </div>
        )}
      </ScrollArea>

      {/* Pagination / Count Display */}
      <div className="p-3 border-t text-xs text-muted-foreground text-center">
        Showing {filteredEmails.length} of {totalEmails || filteredEmails.length} items
      </div>
    </div>
  )
}
