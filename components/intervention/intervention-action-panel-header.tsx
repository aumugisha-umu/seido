"use client"

import { AlertCircle } from "lucide-react"
import { InterventionActionButtons } from "./intervention-action-buttons"
import type { Quote } from "@/lib/quote-state-utils"

interface InterventionActionPanelHeaderProps {
  intervention: {
    id: string
    title: string
    status: string
    tenant_id?: string
    scheduled_date?: string
    quotes?: Quote[]
    availabilities?: Array<{
      person: string
      role: string
      date: string
      startTime: string
      endTime: string
      userId?: string
    }>
  }
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  userId: string
  onActionComplete?: (navigateToTab?: string) => void
  onOpenQuoteModal?: () => void
  onCancelQuote?: (_quoteId: string) => void
  onCancelIntervention?: () => void
  onRejectQuoteRequest?: (_quote: Quote) => void
  onProposeSlots?: () => void
  timeSlots?: Array<{
    id: string
    slot_date: string
    start_time: string
    end_time: string
    status?: string
    proposed_by?: string
  }>
}

/**
 * Détermine si le badge "Action en attente" doit être affiché pour le gestionnaire
 */
const shouldShowActionBadge = (
  status: string,
  userRole: string,
  quotes?: Array<{ status: string }>
): boolean => {
  if (userRole !== 'gestionnaire') return false

  switch (status) {
    case 'demande':
    case 'approuvee':
    case 'cloturee_par_prestataire':
    case 'cloturee_par_locataire':
      return true

    case 'demande_de_devis':
      return quotes?.some(q => q.status === 'pending' || q.status === 'sent') ?? false

    default:
      return false
  }
}

/**
 * Header d'actions pour la page de détail d'intervention
 * Utilise le composant réutilisable InterventionActionButtons
 */
export function InterventionActionPanelHeader({
  intervention,
  userRole,
  userId,
  onActionComplete,
  onOpenQuoteModal,
  onCancelQuote,
  onCancelIntervention,
  onRejectQuoteRequest,
  onProposeSlots,
  timeSlots = []
}: InterventionActionPanelHeaderProps) {
  return (
    <>
      {/* Section d'actions avec badge optionnel */}
      <div className="flex flex-col items-end space-y-2">
        {shouldShowActionBadge(intervention.status, userRole, intervention.quotes) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span className="text-sm text-amber-900 font-semibold">
              Action en attente
            </span>
          </div>
        )}
        
        {/* Boutons d'action réutilisables */}
        <InterventionActionButtons
          intervention={intervention}
          userRole={userRole}
          userId={userId}
          compact={false}
          onActionComplete={onActionComplete}
          onOpenQuoteModal={onOpenQuoteModal}
          onCancelQuote={onCancelQuote}
          onCancelIntervention={onCancelIntervention}
          onRejectQuoteRequest={onRejectQuoteRequest}
          onProposeSlots={onProposeSlots}
          timeSlots={timeSlots}
        />
      </div>
    </>
  )
}
