'use client'

import { useState, useCallback, useEffect } from 'react'
import { Bot } from 'lucide-react'
import { WhatsAppTriageCard } from './whatsapp-triage-card'
import type { WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'

// ============================================================================
// Props
// ============================================================================

interface WhatsAppTriageNavigatorProps {
  items: WhatsAppTriageItem[]
}

// ============================================================================
// Component
// ============================================================================

export function WhatsAppTriageNavigator({ items: initialItems }: WhatsAppTriageNavigatorProps) {
  const [items, setItems] = useState(initialItems)

  // Sync with server data when props update (e.g. router.refresh)
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const handleRemoved = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Bot className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium text-muted-foreground">Aucune demande en attente</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Les messages WhatsApp de vos locataires apparaitront ici.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <WhatsAppTriageCard key={item.id} item={item} onRemoved={handleRemoved} />
      ))}
    </div>
  )
}
