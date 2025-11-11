"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useInterventionApproval } from "@/hooks/use-intervention-approval"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useInterventionPlanning } from "@/hooks/use-intervention-planning"
import { useInterventionExecution } from "@/hooks/use-intervention-execution"
import { useInterventionFinalization } from "@/hooks/use-intervention-finalization"

import { ApprovalModal } from "@/components/intervention/modals/approval-modal"
import { ApproveConfirmationModal } from "@/components/intervention/modals/approve-confirmation-modal"
import { RejectConfirmationModal } from "@/components/intervention/modals/reject-confirmation-modal"
import { SuccessModal } from "@/components/intervention/modals/success-modal"
import { QuoteRequestModal } from "@/components/intervention/modals/quote-request-modal"
import { QuoteRequestSuccessModal } from "@/components/intervention/modals/quote-request-success-modal"
import { ProgrammingModal } from "@/components/intervention/modals/programming-modal"
import { CancelQuoteRequestModal } from "@/components/intervention/modals/cancel-quote-request-modal"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"

import { InterventionsSectionClient } from "./interventions-section-client"
import { createBrowserSupabaseClient } from "@/lib/services"
import type { Database } from '@/lib/database.types'
import { toast } from 'sonner'

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

interface InterventionsSectionWithModalsProps {
  interventions: any[]
  totalCount: number
  teamId: string
}

export function InterventionsSectionWithModals({
  interventions,
  totalCount,
  teamId
}: InterventionsSectionWithModalsProps) {
  const router = useRouter()
  const [quoteRequests, setQuoteRequests] = useState<Quote[]>([])
  const [cancelQuoteModal, setCancelQuoteModal] = useState<{
    isOpen: boolean
    quoteId: string | null
    providerName: string
  }>({
    isOpen: false,
    quoteId: null,
    providerName: ''
  })
  const [isCancellingQuote, setIsCancellingQuote] = useState(false)

  // ✅ Action hooks
  const approvalHook = useInterventionApproval()
  const quotingHook = useInterventionQuoting(teamId)
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

  // Fetch quote requests when programming modal opens
  useEffect(() => {
    const fetchQuoteRequests = async () => {
      if (planningHook.programmingModal.isOpen && planningHook.programmingModal.intervention?.id) {
        const supabase = createBrowserSupabaseClient()
        const { data } = await supabase
          .from('intervention_quotes')
          .select('*, provider:users!provider_id(*)')
          .eq('intervention_id', planningHook.programmingModal.intervention.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (data) {
          setQuoteRequests(data as Quote[])
        }
      } else {
        setQuoteRequests([])
      }
    }

    fetchQuoteRequests()
  }, [planningHook.programmingModal.isOpen, planningHook.programmingModal.intervention?.id])

  // Handle cancel quote request - open confirmation modal
  const handleCancelQuoteRequest = (requestId: string) => {
    const quote = quoteRequests.find(q => q.id === requestId)
    const providerName = quote?.provider?.name || 'ce prestataire'

    setCancelQuoteModal({
      isOpen: true,
      quoteId: requestId,
      providerName
    })
  }

  // Confirm cancel quote request
  const handleConfirmCancelQuote = async () => {
    if (!cancelQuoteModal.quoteId || !planningHook.programmingModal.intervention?.id) return

    setIsCancellingQuote(true)

    try {
      const response = await fetch(`/api/intervention/${planningHook.programmingModal.intervention.id}/quotes/${cancelQuoteModal.quoteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel quote request')
      }

      toast.success('Demande annulée', {
        description: 'La demande de devis a été annulée avec succès'
      })

      setCancelQuoteModal({ isOpen: false, quoteId: null, providerName: '' })
      router.refresh()
    } catch (error) {
      console.error('Error canceling quote request:', error)
      toast.error('Erreur', {
        description: 'Une erreur est survenue lors de l\'annulation de la demande'
      })
    } finally {
      setIsCancellingQuote(false)
    }
  }

  return (
    <InterventionCancellationProvider>
      <InterventionsSectionClient
        interventions={interventions}
        totalCount={totalCount}
        actionHooks={{
          approvalHook,
          quotingHook,
          planningHook,
          executionHook,
          finalizationHook
        }}
      />

      {/* Modals pour les actions sur les interventions */}
      <ApprovalModal
        isOpen={approvalHook.approvalModal.isOpen}
        onClose={approvalHook.closeApprovalModal}
        intervention={approvalHook.approvalModal.intervention}
        action={approvalHook.approvalModal.action}
        rejectionReason={approvalHook.rejectionReason}
        internalComment={approvalHook.internalComment}
        onRejectionReasonChange={approvalHook.setRejectionReason}
        onInternalCommentChange={approvalHook.setInternalComment}
        onActionChange={approvalHook.handleActionChange}
        onConfirm={approvalHook.handleConfirmAction}
      />

      <ApproveConfirmationModal
        isOpen={approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "approve"}
        onClose={approvalHook.closeConfirmationModal}
        onConfirm={approvalHook.handleFinalConfirmation}
        intervention={approvalHook.confirmationModal.intervention}
        internalComment={approvalHook.internalComment}
        onInternalCommentChange={approvalHook.setInternalComment}
        isLoading={approvalHook.isLoading}
      />

      <RejectConfirmationModal
        isOpen={approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "reject"}
        onClose={approvalHook.closeConfirmationModal}
        onConfirm={approvalHook.handleFinalConfirmation}
        intervention={approvalHook.confirmationModal.intervention}
        rejectionReason={approvalHook.rejectionReason}
        onRejectionReasonChange={approvalHook.setRejectionReason}
        internalComment={approvalHook.internalComment}
        onInternalCommentChange={approvalHook.setInternalComment}
        isLoading={approvalHook.isLoading}
      />

      <SuccessModal
        isOpen={approvalHook.successModal.isOpen}
        onClose={approvalHook.closeSuccessModal}
        action={approvalHook.successModal.action}
        interventionTitle={approvalHook.successModal.interventionTitle}
      />

      <QuoteRequestModal
        isOpen={quotingHook.quoteRequestModal.isOpen}
        onClose={quotingHook.closeQuoteRequestModal}
        intervention={quotingHook.quoteRequestModal.intervention}
        deadline={quotingHook.formData.deadline}
        additionalNotes={quotingHook.formData.additionalNotes}
        selectedProviderId={quotingHook.formData.providerId}
        providers={quotingHook.providers}
        onDeadlineChange={(deadline) => quotingHook.updateFormData('deadline', deadline)}
        onNotesChange={(notes) => quotingHook.updateFormData('additionalNotes', notes)}
        onProviderSelect={quotingHook.selectProvider}
        onSubmit={quotingHook.submitQuoteRequest}
        isLoading={quotingHook.isLoading}
        error={quotingHook.error}
      />

      <QuoteRequestSuccessModal
        isOpen={quotingHook.successModal.isOpen}
        onClose={quotingHook.closeSuccessModal}
        providerName={quotingHook.successModal.providerName}
        interventionTitle={quotingHook.successModal.interventionTitle}
      />

      <ProgrammingModal
        isOpen={planningHook.programmingModal.isOpen}
        onClose={planningHook.closeProgrammingModal}
        intervention={planningHook.programmingModal.intervention}
        programmingOption={planningHook.planningOption}
        onProgrammingOptionChange={planningHook.setPlanningOption}
        directSchedule={planningHook.directSchedule}
        onDirectScheduleChange={planningHook.setDirectSchedule}
        proposedSlots={planningHook.proposedSlots}
        onAddProposedSlot={planningHook.addProposedSlot}
        onUpdateProposedSlot={planningHook.updateProposedSlot}
        onRemoveProposedSlot={planningHook.removeProposedSlot}
        onSubmit={planningHook.handleSubmit}
        isLoading={planningHook.isSubmitting}
        quoteRequests={quoteRequests}
        onViewProvider={(providerId) => router.push(`/gestionnaire/contacts?highlight=${providerId}`)}
        onCancelQuoteRequest={handleCancelQuoteRequest}
      />

      <CancelQuoteRequestModal
        isOpen={cancelQuoteModal.isOpen}
        onClose={() => setCancelQuoteModal({ isOpen: false, quoteId: null, providerName: '' })}
        onConfirm={handleConfirmCancelQuote}
        providerName={cancelQuoteModal.providerName}
        isLoading={isCancellingQuote}
      />

      <InterventionCancellationManager />
    </InterventionCancellationProvider>
  )
}
