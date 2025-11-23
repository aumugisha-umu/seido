'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, SortDesc } from 'lucide-react'
import { EmailListItem } from './email-list-item'
import { MailboxEmail, groupEmailsByConversation, ConversationGroup } from './types'
import { ConversationGroupComponent } from './conversation-group'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EmailListProps {
  emails: MailboxEmail[]
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
    <div className="w-[400px] border-r flex flex-col h-full" role="region" aria-label="Liste d'emails">
      {/* Search Bar (Balanced variant) */}
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Rechercher des emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            aria-label="Rechercher des emails par expéditeur, sujet ou contenu"
            suppressHydrationWarning
          />
        </div>

        {/* Filters Toolbar (Balanced variant) */}
        <div className="flex gap-2 flex-wrap" role="toolbar" aria-label="Filtres d'emails">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px]" aria-label="Filtrer par date">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toute période</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois-ci</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={hasAttachments ? 'default' : 'outline'}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setHasAttachments(!hasAttachments)}
            aria-label={hasAttachments ? "Retirer le filtre pièces jointes" : "Filtrer les emails avec pièces jointes"}
            aria-pressed={hasAttachments}
          >
            📎 Avec pièces jointes
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            aria-label="Trier les emails"
          >
            <SortDesc className="mr-1 h-3 w-3" aria-hidden="true" />
            Trier
          </Button>
        </div>
      </div>

      {/* Email List with ScrollArea */}
      <ScrollArea className="flex-1 min-h-0">
        {groupedItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground" role="status">
            <p>Aucun email trouvé</p>
            {searchQuery && (
              <p className="text-sm mt-2">
                Essayez d'ajuster votre recherche ou vos filtres
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
        Affichage de {filteredEmails.length} sur {totalEmails || filteredEmails.length} éléments
      </div>
    </div>
  )
}
