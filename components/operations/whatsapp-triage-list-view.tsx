'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle, XCircle,
  ChevronUp, ChevronDown, MoreVertical, Wrench, Bell, Eye, Flame, MapPin,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getPriorityColor, getPriorityLabel, getTypeLabel, getTypeBadgeColor } from '@/lib/intervention-utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'
import { CHANNEL_CONFIG } from './triage-shared'
import { useTriageActions } from './use-triage-actions'

// ============================================================================
// Sort
// ============================================================================

type SortColumn = 'contact' | 'channel' | 'urgency' | 'description' | 'address' | 'date'
type SortDirection = 'asc' | 'desc'

const URGENCY_ORDER: Record<string, number> = { urgente: 3, haute: 2, normale: 1, basse: 0 }

// ============================================================================
// Row component
// ============================================================================

function TriageListRow({ item, onRemoved }: { item: WhatsAppTriageItem; onRemoved: (id: string) => void }) {
  const {
    isPending,
    handleMarkHandled,
    handleReject,
    handleConvertIntervention,
    handleConvertReminder,
    handleViewDetails,
  } = useTriageActions(item, onRemoved)

  const channelConfig = CHANNEL_CONFIG[item.channel]
  const ChannelIcon = channelConfig.icon
  const displayName = item.callerName || item.callerPhone || 'Contact inconnu'
  const summary = item.problemSummary || item.description || item.title
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })

  return (
    <div
      className="flex items-center cursor-pointer transition-colors hover:bg-accent/50"
      role="row"
      onClick={handleViewDetails}
    >
      {/* Channel */}
      <div className="w-[60px] px-3 py-2.5 flex-shrink-0 flex justify-center" role="cell">
        <ChannelIcon className={cn('h-4 w-4', channelConfig.color)} />
      </div>

      {/* Contact */}
      <div className="flex-1 min-w-0 px-3 py-2.5" role="cell">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {item.urgency && item.urgency !== 'normale' && (
            <Badge className={cn(getPriorityColor(item.urgency), 'text-xs border flex items-center gap-0.5')}>
              <Flame className="h-3 w-3" />
              {getPriorityLabel(item.urgency)}
            </Badge>
          )}
          {item.type && item.type !== 'demande_whatsapp' && (
            <Badge className={cn(getTypeBadgeColor(item.type), 'text-xs border')}>
              {getTypeLabel(item.type)}
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="w-[280px] px-3 py-2.5 flex-shrink-0 hidden lg:block" role="cell">
        <span className="text-sm text-muted-foreground truncate block">{summary}</span>
      </div>

      {/* Address */}
      <div className="w-[180px] px-3 py-2.5 flex-shrink-0 hidden xl:block" role="cell">
        {item.address ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{item.address}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </div>

      {/* Date */}
      <div className="w-[120px] px-3 py-2.5 flex-shrink-0 hidden md:block" role="cell">
        <span className="text-sm text-muted-foreground">{timeAgo}</span>
      </div>

      {/* Actions */}
      <div className="w-[120px] px-2 py-2.5 flex-shrink-0" role="cell" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            disabled={isPending}
            onClick={(e) => handleMarkHandled(e)}
            title="Traite"
          >
            <CheckCircle className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            disabled={isPending}
            onClick={(e) => { e.stopPropagation(); handleReject() }}
            title="Rejeter"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={isPending}>
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleConvertIntervention}>
                <Wrench className="h-4 w-4 mr-2" />
                Convertir en intervention
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleConvertReminder}>
                <Bell className="h-4 w-4 mr-2" />
                Convertir en rappel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Voir details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

interface WhatsAppTriageListViewProps {
  items: WhatsAppTriageItem[]
  onRemoved: (id: string) => void
}

export function WhatsAppTriageListView({ items, onRemoved }: WhatsAppTriageListViewProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = useCallback((column: SortColumn) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDirection(column === 'date' ? 'desc' : 'asc')
      return column
    })
  }, [])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'contact':
          comparison = (a.callerName || a.callerPhone || '').localeCompare(b.callerName || b.callerPhone || '')
          break
        case 'channel':
          comparison = a.channel.localeCompare(b.channel)
          break
        case 'urgency':
          comparison = (URGENCY_ORDER[a.urgency] ?? 1) - (URGENCY_ORDER[b.urgency] ?? 1)
          break
        case 'description':
          comparison = (a.problemSummary || a.title || '').localeCompare(b.problemSummary || b.title || '')
          break
        case 'address':
          comparison = (a.address || '').localeCompare(b.address || '')
          break
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }
      return sortDirection === 'desc' ? -comparison : comparison
    })
  }, [items, sortColumn, sortDirection])

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 ml-0.5 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 ml-0.5 text-primary" />
  }

  const renderHeader = (column: SortColumn, label: string, width: string, hideClass = '') => (
    <div className={cn('px-3 py-2 flex-shrink-0', width, hideClass)} role="columnheader">
      <button
        type="button"
        className="flex items-center text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        onClick={() => handleSort(column)}
      >
        {label}
        {renderSortIcon(column)}
      </button>
    </div>
  )

  return (
    <div className="rounded-md border" role="table">
      {/* Header */}
      <div className="flex bg-muted/50 border-b sticky top-0 z-10" role="row">
        {renderHeader('channel', 'Canal', 'w-[60px]')}
        {renderHeader('contact', 'Contact', 'flex-1 min-w-0')}
        {renderHeader('description', 'Description', 'w-[280px]', 'hidden lg:block')}
        {renderHeader('address', 'Adresse', 'w-[180px]', 'hidden xl:block')}
        {renderHeader('date', 'Date', 'w-[120px]', 'hidden md:block')}
        <div className="w-[120px] px-3 py-2 flex-shrink-0" role="columnheader" />
      </div>

      {/* Body */}
      <div className="divide-y" role="rowgroup">
        {sortedItems.map(item => (
          <TriageListRow key={item.id} item={item} onRemoved={onRemoved} />
        ))}
      </div>
    </div>
  )
}
