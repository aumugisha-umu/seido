'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { QuoteSubmissionModal } from '@/components/intervention/modals/quote-submission-modal'
import { ModifyChoiceModal } from '@/components/intervention/modals/modify-choice-modal'
import { MultiSlotResponseModal, type TimeSlot as ModalTimeSlot } from '@/components/intervention/modals/multi-slot-response-modal'
import type { Database } from '@/lib/database.types'

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
}

interface ProviderModalsProps {
  intervention: Database['public']['Tables']['interventions']['Row']
  // Quote submission
  quoteModalOpen: boolean
  onQuoteModalOpenChange: (open: boolean) => void
  selectedQuote: Quote | null
  onQuoteSuccess: () => void
  // Reject quote
  rejectQuoteModalOpen: boolean
  onRejectQuoteModalOpenChange: (open: boolean) => void
  onConfirmRejectQuote: () => void
  rejectionReason: string
  onRejectionReasonChange: (v: string) => void
  isRejecting: boolean
  // Slot response
  responseModalSlots: ModalTimeSlot[]
  isResponseModalOpen: boolean
  responseModalExisting: Record<string, { response: 'accept' | 'reject' | 'pending'; reason?: string }>
  userProposedSlotIds: string[]
  onCloseResponseModal: () => void
  onRefresh: () => void
  // Modify choice
  modifyChoiceModalOpen: boolean
  onCloseModifyChoiceModal: () => void
  slotToModify: TimeSlot | null
  currentChoice: 'accepted' | 'rejected'
  onModifyChoiceSuccess: () => void
  // Document preview
  previewModal: React.ReactNode
}

export function ProviderModals({
  intervention,
  quoteModalOpen,
  onQuoteModalOpenChange,
  selectedQuote,
  onQuoteSuccess,
  rejectQuoteModalOpen,
  onRejectQuoteModalOpenChange,
  onConfirmRejectQuote,
  rejectionReason,
  onRejectionReasonChange,
  isRejecting,
  responseModalSlots,
  isResponseModalOpen,
  responseModalExisting,
  userProposedSlotIds,
  onCloseResponseModal,
  onRefresh,
  modifyChoiceModalOpen,
  onCloseModifyChoiceModal,
  slotToModify,
  currentChoice,
  onModifyChoiceSuccess,
  previewModal,
}: ProviderModalsProps) {
  // Transform database quote to ExistingQuote format for QuoteSubmissionForm
  const transformQuoteToExistingQuote = (quote: Quote) => {
    const lineItems = quote.line_items as Array<{ description?: string; total?: number }> || []
    const laborItem = lineItems.find(item => item.description?.includes("Main d'oeuvre"))
    const materialsItem = lineItems.find(item => item.description?.includes('Materiaux'))

    return {
      id: quote.id,
      laborCost: laborItem?.total || quote.amount || 0,
      materialsCost: materialsItem?.total || 0,
      workDetails: quote.description || '',
      attachments: [],
    }
  }

  return (
    <>
      {/* Quote Submission Modal */}
      <QuoteSubmissionModal
        open={quoteModalOpen}
        onOpenChange={onQuoteModalOpenChange}
        intervention={{
          ...intervention,
          urgency: intervention.urgency || 'normale',
          priority: intervention.urgency || 'normale',
        }}
        existingQuote={selectedQuote ? transformQuoteToExistingQuote(selectedQuote) : undefined}
        quoteRequest={selectedQuote ? {
          id: selectedQuote.id,
          status: selectedQuote.status,
          individual_message: selectedQuote.internal_notes || undefined,
          deadline: intervention.quote_deadline,
          sent_at: selectedQuote.created_at
        } : undefined}
        onSuccess={onQuoteSuccess}
      />

      {/* Reject Quote Request Modal */}
      <Dialog open={rejectQuoteModalOpen} onOpenChange={onRejectQuoteModalOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la demande de devis</DialogTitle>
            <DialogDescription>
              Veuillez indiquer pourquoi vous ne pouvez pas repondre a cette demande de devis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">
                Raison du rejet *
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                placeholder="Ex: Intervention hors de ma zone geographique, competences specialisees requises, indisponible sur la periode..."
                className="min-h-[120px] mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Cette raison sera visible par le gestionnaire.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-900">
                <strong>Attention:</strong> Une fois rejetee, vous ne pourrez plus soumettre de devis pour cette demande.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onRejectQuoteModalOpenChange(false)}
              disabled={isRejecting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmRejectQuote}
              disabled={!rejectionReason.trim() || isRejecting}
            >
              {isRejecting ? 'Rejet en cours...' : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi Slot Response Modal */}
      {responseModalSlots.length > 0 && (
        <MultiSlotResponseModal
          isOpen={isResponseModalOpen}
          onClose={onCloseResponseModal}
          slots={responseModalSlots}
          interventionId={intervention.id}
          existingResponses={Object.keys(responseModalExisting).length > 0 ? responseModalExisting : undefined}
          userProposedSlotIds={userProposedSlotIds}
          onSuccess={onRefresh}
        />
      )}

      {/* Modify Choice Modal */}
      <ModifyChoiceModal
        isOpen={modifyChoiceModalOpen}
        onClose={onCloseModifyChoiceModal}
        slot={slotToModify}
        currentResponse={currentChoice}
        interventionId={intervention.id}
        onSuccess={onModifyChoiceSuccess}
      />

      {/* Document Preview Modal */}
      {previewModal}
    </>
  )
}
