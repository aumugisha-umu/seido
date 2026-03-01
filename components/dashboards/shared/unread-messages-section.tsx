'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { MessageSquare, Check, ExternalLink, CheckCheck, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { markThreadAsReadAction, markAllThreadsAsReadAction } from '@/app/actions/conversation-actions'
import type { UnreadThread } from '@/lib/services/repositories/conversation-repository'

// Thread type display config (matching ConversationSelector colors)
const THREAD_TYPE_CONFIG: Record<string, { label: string; shortLabel: string; bgClass: string }> = {
  group: { label: 'Général', shortLabel: 'Gén.', bgClass: 'bg-blue-100 text-blue-700' },
  tenants_group: { label: 'Locataires', shortLabel: 'Loc.', bgClass: 'bg-emerald-100 text-emerald-700' },
  providers_group: { label: 'Prestataires', shortLabel: 'Prest.', bgClass: 'bg-violet-100 text-violet-700' },
  tenant_to_managers: { label: 'Locataire', shortLabel: 'Loc.', bgClass: 'bg-green-100 text-green-700' },
  provider_to_managers: { label: 'Prestataire', shortLabel: 'Prest.', bgClass: 'bg-purple-100 text-purple-700' },
}

const MAX_VISIBLE = 5

interface UnreadMessagesSectionProps {
  threads: UnreadThread[]
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  totalCount: number
}

const formatTimeAgo = (dateStr: string): string => {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin}min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'hier'
  if (diffD < 7) return `il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function UnreadMessagesSection({ threads, role, totalCount }: UnreadMessagesSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set())
  const [allFading, setAllFading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const visibleThreads = threads
    .filter(t => !dismissedIds.has(t.threadId))
    .slice(0, MAX_VISIBLE)

  const remainingCount = totalCount - dismissedIds.size
  const hasMore = remainingCount > MAX_VISIBLE

  // Mark single thread as read with fade animation
  const handleMarkAsRead = useCallback((threadId: string) => {
    // Start fade animation
    setFadingIds(prev => new Set(prev).add(threadId))

    // After animation, dismiss and call server
    setTimeout(() => {
      setDismissedIds(prev => new Set(prev).add(threadId))
      setFadingIds(prev => {
        const next = new Set(prev)
        next.delete(threadId)
        return next
      })

      startTransition(async () => {
        await markThreadAsReadAction(threadId)
      })
    }, 300)
  }, [])

  // Mark all threads as read
  const handleMarkAllAsRead = useCallback(() => {
    setAllFading(true)

    setTimeout(() => {
      const allIds = new Set(threads.map(t => t.threadId))
      setDismissedIds(allIds)
      setAllFading(false)

      startTransition(async () => {
        await markAllThreadsAsReadAction()
      })
    }, 300)
  }, [threads])

  // Don't render if no visible threads
  if (visibleThreads.length === 0 && !allFading) return null

  return (
    <div className={cn(
      'transition-all duration-300',
      allFading && 'opacity-0 max-h-0 overflow-hidden'
    )}>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-3 sm:px-5 bg-muted/30",
          !isCollapsed && "border-b border-border/50"
        )}>
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 text-blue-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Messages non lus
            </h3>
            <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-600">
              {remainingCount}
            </Badge>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isCollapsed && "-rotate-90"
            )} />
          </button>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lu</span>
            </Button>
          )}
        </div>

        {/* Thread list — collapsible */}
        <div className={cn(
          "transition-all duration-200 overflow-hidden",
          isCollapsed ? "max-h-0" : "max-h-[2000px]"
        )}>
        <div className="divide-y divide-border/50">
          {visibleThreads.map(thread => {
            const config = THREAD_TYPE_CONFIG[thread.threadType] || THREAD_TYPE_CONFIG.group
            const isFading = fadingIds.has(thread.threadId)
            const interventionUrl = `/${role}/interventions/${thread.interventionId}?tab=conversations&thread=${thread.threadType}`

            return (
              <div
                key={thread.threadId}
                className={cn(
                  'px-4 py-3 sm:px-5 transition-all duration-300',
                  'hover:bg-muted/40',
                  isFading && 'opacity-0 max-h-0 py-0 overflow-hidden'
                )}
              >
                {/* Desktop layout */}
                <div className="hidden sm:flex items-center gap-3">
                  {/* Blue dot */}
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />

                  {/* Intervention info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground truncate">
                        {thread.interventionTitle}
                      </span>
                      {thread.interventionReference && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {thread.interventionReference}
                        </span>
                      )}
                      <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-4 font-medium shrink-0', config.bgClass)}>
                        {config.label}
                      </Badge>
                      {thread.unreadCount > 1 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium bg-red-100 text-red-700 shrink-0">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium text-foreground/70">{thread.lastMessage.senderName}:</span>{' '}
                      {thread.lastMessage.content}
                    </p>
                  </div>

                  {/* Time */}
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatTimeAgo(thread.lastMessage.createdAt)}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMarkAsRead(thread.threadId)}
                      className="h-8 w-8 text-muted-foreground hover:text-green-600 hover:bg-green-50"
                      title="Marquer comme lu"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                      title="Voir l'intervention"
                    >
                      <Link href={interventionUrl}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Mobile layout */}
                <div className="sm:hidden">
                  <div className="flex items-start gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-sm font-medium text-foreground truncate">
                          {thread.interventionTitle}
                        </span>
                        <Badge variant="secondary" className={cn('text-[10px] px-1 py-0 h-4 font-medium', config.bgClass)}>
                          {config.shortLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        <span className="font-medium text-foreground/70">{thread.lastMessage.senderName}:</span>{' '}
                        {thread.lastMessage.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {formatTimeAgo(thread.lastMessage.createdAt)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkAsRead(thread.threadId)}
                            className="h-7 w-7 text-muted-foreground hover:text-green-600"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                          >
                            <Link href={interventionUrl}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer — "Voir tous" link */}
        {hasMore && (
          <div className="px-4 py-2.5 sm:px-5 border-t border-border/50 bg-muted/20">
            <Link
              href={`/${role}/interventions`}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
            >
              Voir toutes les conversations non lues ({remainingCount})
            </Link>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
