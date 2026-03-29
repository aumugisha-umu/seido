'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { ListTodo, MessageCircle, Phone, MessageSquare, Bot } from 'lucide-react'
import ContentNavigator from '@/components/content-navigator'
import { WhatsAppTriageCard } from './whatsapp-triage-card'
import { WhatsAppTriageListView } from './whatsapp-triage-list-view'
import { ViewModeSwitcherV1 } from '@/components/interventions/view-mode-switcher-v1'
import { useViewMode } from '@/hooks/use-view-mode'
import type { WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'

// ============================================================================
// Props
// ============================================================================

interface WhatsAppTriageNavigatorProps {
  items: WhatsAppTriageItem[]
}

// ============================================================================
// Empty State
// ============================================================================

function TriageEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Bot className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="font-medium text-muted-foreground">Aucune demande en attente</p>
      <p className="text-sm text-muted-foreground/70 mt-1">{message}</p>
    </div>
  )
}

// ============================================================================
// View Container (cards / list)
// ============================================================================

function TriageViewContainer({
  items,
  viewMode,
  onRemoved,
}: {
  items: WhatsAppTriageItem[]
  viewMode: 'cards' | 'list'
  onRemoved: (id: string) => void
}) {
  if (items.length === 0) return null

  if (viewMode === 'list') {
    return <WhatsAppTriageListView items={items} onRemoved={onRemoved} />
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 px-1 pb-4">
        {items.map(item => (
          <WhatsAppTriageCard key={item.id} item={item} onRemoved={onRemoved} />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export function WhatsAppTriageNavigator({ items: initialItems }: WhatsAppTriageNavigatorProps) {
  const [items, setItems] = useState(initialItems)
  const [searchTerm, setSearchTerm] = useState('')
  const { viewMode, setViewMode, isMobile } = useViewMode({
    defaultMode: 'cards',
    storageKey: 'triage-view-mode',
  })
  const effectiveViewMode = isMobile ? 'cards' : viewMode

  // Sync with server data when props update (e.g. router.refresh)
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleRemoved = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const term = searchTerm.toLowerCase()
    return items.filter(i =>
      i.callerName?.toLowerCase().includes(term) ||
      i.callerPhone?.toLowerCase().includes(term) ||
      i.problemSummary?.toLowerCase().includes(term) ||
      i.description?.toLowerCase().includes(term) ||
      i.title?.toLowerCase().includes(term) ||
      i.address?.toLowerCase().includes(term)
    )
  }, [items, searchTerm])

  // Group by channel in a single pass
  const { whatsapp: whatsappItems, phone: phoneItems, sms: smsItems } = useMemo(() => {
    const grouped: Record<string, WhatsAppTriageItem[]> = { whatsapp: [], phone: [], sms: [] }
    for (const i of filteredItems) (grouped[i.channel] ??= []).push(i)
    return grouped
  }, [filteredItems])

  // Render content for a filtered set
  const renderContent = (filtered: WhatsAppTriageItem[], emptyMsg: string) => {
    if (filtered.length === 0) {
      return <TriageEmptyState message={emptyMsg} />
    }
    return (
      <TriageViewContainer
        items={filtered}
        viewMode={effectiveViewMode}
        onRemoved={handleRemoved}
      />
    )
  }

  const tabs = useMemo(() => [
    {
      id: 'toutes',
      label: 'Toutes',
      icon: ListTodo,
      count: filteredItems.length,
      content: renderContent(filteredItems, 'Les demandes IA apparaitront ici.'),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      count: whatsappItems.length,
      content: renderContent(whatsappItems, 'Aucune demande WhatsApp en attente.'),
    },
    {
      id: 'phone',
      label: 'Appels',
      icon: Phone,
      count: phoneItems.length,
      content: renderContent(phoneItems, 'Aucune demande par appel en attente.'),
    },
    {
      id: 'sms',
      label: 'SMS',
      icon: MessageSquare,
      count: smsItems.length,
      content: renderContent(smsItems, 'Aucune demande SMS en attente.'),
    },
  ], [filteredItems, whatsappItems, phoneItems, smsItems, effectiveViewMode, handleRemoved])

  return (
    <ContentNavigator
      tabs={tabs}
      defaultTab="toutes"
      searchPlaceholder="Rechercher par nom, telephone, description..."
      onSearch={setSearchTerm}
      className="flex-1 min-h-0"
      rightControls={
        !isMobile ? (
          <ViewModeSwitcherV1
            value={viewMode}
            onChange={setViewMode}
            modes={['cards', 'list']}
          />
        ) : undefined
      }
    />
  )
}
