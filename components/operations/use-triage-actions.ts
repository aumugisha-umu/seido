'use client'

import { useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { markWhatsAppAsHandled, rejectWhatsAppDemande, type WhatsAppTriageItem } from '@/app/actions/whatsapp-triage-actions'
import { CHANNEL_CONFIG } from './triage-shared'

/**
 * Shared triage action handlers for card and list views.
 * Encapsulates mark-handled, reject, convert-to-intervention, and convert-to-reminder.
 */
export function useTriageActions(item: WhatsAppTriageItem, onRemoved: (id: string) => void) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleMarkHandled = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    startTransition(async () => {
      const result = await markWhatsAppAsHandled(item.id)
      if (result.success) {
        onRemoved(item.id)
        toast.success('Demande traitee')
      } else {
        toast.error(result.error || 'Erreur')
      }
    })
  }, [item.id, onRemoved])

  const handleReject = useCallback((reason?: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    startTransition(async () => {
      const result = await rejectWhatsAppDemande(item.id, reason || undefined)
      if (result.success) {
        onRemoved(item.id)
        toast.success('Demande rejetee')
      } else {
        toast.error(result.error || 'Erreur')
      }
    })
  }, [item.id, onRemoved])

  const handleConvertIntervention = useCallback(() => {
    router.push(`/gestionnaire/operations/interventions/modifier/${item.id}?focus=type`)
  }, [item.id, router])

  const handleConvertReminder = useCallback(() => {
    const params = new URLSearchParams()
    if (item.problemSummary) params.set('title', item.problemSummary.slice(0, 80))
    if (item.building_id) params.set('building_id', item.building_id)
    if (item.lot_id) params.set('lot_id', item.lot_id)
    const displayName = item.callerName || item.callerPhone || 'Contact inconnu'
    const source = CHANNEL_CONFIG[item.channel].label
    const notes = `Source ${source} — ${displayName}${item.callerPhone ? ` (${item.callerPhone})` : ''}`
    params.set('notes', notes)
    router.push(`/gestionnaire/operations/nouveau-rappel?${params.toString()}`)
  }, [item, router])

  const handleViewDetails = useCallback(() => {
    router.push(`/gestionnaire/operations/triage/${item.id}`)
  }, [item.id, router])

  return {
    isPending,
    handleMarkHandled,
    handleReject,
    handleConvertIntervention,
    handleConvertReminder,
    handleViewDetails,
  }
}
