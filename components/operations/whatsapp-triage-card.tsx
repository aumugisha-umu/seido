'use client'

import { useState } from 'react'
import {
  CheckCircle, XCircle,
  ChevronDown, ChevronUp, MapPin, MoreVertical, Flame, Wrench,
  Bell, Loader2, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getPriorityColor, getPriorityLabel, getTypeLabel, getTypeBadgeColor } from '@/lib/intervention-utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'
import Link from 'next/link'
import { CHANNEL_CONFIG } from './triage-shared'
import { useTriageActions } from './use-triage-actions'

// ============================================================================
// Props
// ============================================================================

interface WhatsAppTriageCardProps {
  item: WhatsAppTriageItem
  onRemoved: (id: string) => void
}

// ============================================================================
// Component
// ============================================================================

export function WhatsAppTriageCard({ item, onRemoved }: WhatsAppTriageCardProps) {
  const [showConversation, setShowConversation] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const {
    isPending,
    handleMarkHandled,
    handleReject,
    handleConvertIntervention,
    handleConvertReminder,
    handleViewDetails,
  } = useTriageActions(item, onRemoved)

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })
  const displayName = item.callerName || item.callerPhone || 'Contact inconnu'
  const summary = item.problemSummary || item.description || item.title
  const channelConfig = CHANNEL_CONFIG[item.channel]
  const ChannelIcon = channelConfig.icon
  const interventionType = item.type && item.type !== 'demande_whatsapp' ? item.type : null

  // Conversation content (messages for WhatsApp/SMS, transcript for phone)
  const hasConversation = item.messages.length > 0 || !!item.transcript
  const conversationLabel = item.channel === 'phone'
    ? 'Voir transcription'
    : `Voir conversation (${item.messages.length} messages)`

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        'group relative bg-card dark:bg-white/5 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none',
        'transition-all duration-300 border border-border dark:border-white/10',
        'hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md flex flex-col h-full dark:backdrop-blur-sm cursor-pointer',
      )}
      data-testid={`triage-card-${item.id}`}
      onClick={handleViewDetails}
    >
      {/* Header: Channel icon + Name/Phone + Time + Dot menu */}
      <div className="flex items-start gap-3 mb-3">
        {/* Channel icon */}
        <div className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
          channelConfig.bgColor,
        )}>
          <ChannelIcon className={cn('h-5 w-5', channelConfig.color)} />
        </div>

        {/* Name + Badges inline + Phone + Timestamp */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {displayName}
            </h3>
            {item.urgency && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={cn(getPriorityColor(item.urgency), 'text-xs border flex items-center gap-1 cursor-default')}>
                    <Flame className="h-3 w-3" aria-hidden="true" />
                    <span className="hidden sm:inline">{getPriorityLabel(item.urgency)}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  {getPriorityLabel(item.urgency)}
                </TooltipContent>
              </Tooltip>
            )}
            {interventionType && (
              <Badge className={cn(getTypeBadgeColor(interventionType), 'text-xs border flex items-center gap-1 cursor-default')}>
                {getTypeLabel(interventionType)}
              </Badge>
            )}
          </div>
          {item.callerPhone && item.callerName && (
            <p className="text-xs text-muted-foreground font-mono">{item.callerPhone}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
        </div>

        {/* Eye + Dot menu */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="flex-shrink-0 h-9 w-9 border-border/60 bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent"
            title="Voir les details"
          >
            <Link href={`/gestionnaire/operations/triage/${item.id}`} onClick={(e) => e.stopPropagation()}>
              <Eye className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Voir les details</span>
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Plus d'actions"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Plus d&apos;actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvertIntervention() }}>
                <Wrench className="h-4 w-4 mr-2" aria-hidden="true" />
                Convertir en intervention
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvertReminder() }}>
                <Bell className="h-4 w-4 mr-2" aria-hidden="true" />
                Convertir en rappel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{summary}</p>

      {/* Location */}
      {item.address && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{item.address}</span>
        </div>
      )}

      {/* Expandable conversation / transcript */}
      {hasConversation && !showConversation && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground mb-3 justify-start"
          onClick={(e) => { e.stopPropagation(); setShowConversation(true) }}
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          {conversationLabel}
        </Button>
      )}

      {showConversation && (
        <div className="bg-muted/50 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-muted-foreground">
              {item.channel === 'phone' ? 'Transcription' : `Conversation ${channelConfig.label}`}
            </span>
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={(e) => { e.stopPropagation(); setShowConversation(false) }}>
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
          {item.channel === 'phone' && item.transcript ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.transcript}</p>
          ) : (
            item.messages.map((msg, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium">{msg.role === 'user' ? 'Locataire' : 'IA'}: </span>
                <span className="text-muted-foreground">{msg.content}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reject inline form */}
      {showRejectForm && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2 mb-3">
          <Textarea
            placeholder="Motif (optionnel)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowRejectForm(false) }}>
              Annuler
            </Button>
            <Button variant="destructive" size="sm" disabled={isPending} onClick={(e) => { e.stopPropagation(); handleReject(rejectReason) }}>
              Confirmer rejet
            </Button>
          </div>
        </div>
      )}

      {/* Action buttons: Traite + Rejeter */}
      {!showRejectForm && (
        <div className="flex gap-2 mt-auto pt-4 border-t border-border">
          <Button
            variant="default"
            size="default"
            className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending}
            onClick={(e) => { e.stopPropagation(); handleMarkHandled() }}
            data-testid="triage-mark-handled"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Traite
          </Button>
          <Button
            variant="outline"
            size="default"
            className="flex-1 min-h-[44px] text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            disabled={isPending}
            onClick={(e) => { e.stopPropagation(); setShowRejectForm(true) }}
            data-testid="triage-reject"
          >
            <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
            Rejeter
          </Button>
        </div>
      )}
    </div>
  )
}
