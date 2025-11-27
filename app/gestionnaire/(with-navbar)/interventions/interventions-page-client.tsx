"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useNavigationPending } from "@/hooks/use-navigation-pending"

import { Button } from "@/components/ui/button"
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

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { createBrowserSupabaseClient } from "@/lib/services"
import type { Database } from '@/lib/database.types'
import { toast } from "sonner"

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

interface InterventionsPageClientProps {
  initialInterventions: any[]
  teamId: string | undefined
  userId: string | undefined
}

export function InterventionsPageClient({
  initialInterventions,
  teamId,
  userId
}: InterventionsPageClientProps) {
  const router = useRouter()
  const { isPending: isNavigating, navigate } = useNavigationPending()

  // ✅ État local initialisé avec les props (pas de hook de fetch)
  const [interventions, setInterventions] = useState(initialInterventions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  // ✅ Hooks avec Server Props Pattern - passer teamId depuis le serveur
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

  // ✅ Refetch via router.refresh() - OPTIMISÉ: suppression du délai artificiel
  const refetch = () => {
    setLoading(true)
    router.refresh()
    // Le loading sera automatiquement reset par React quand les nouvelles props arrivent
    // Note: Si nécessaire, utiliser startTransition pour un meilleur feedback
    setLoading(false)
  }

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
      refetch()
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
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <InterventionCancellationProvider>
        <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Page Header */}
          <div className="mb-4 lg:mb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                  Interventions
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex items-center space-x-2"
                  onClick={() => navigate("/gestionnaire/interventions/nouvelle-intervention")}
                  disabled={isNavigating}
                >
                  {isNavigating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Créer une intervention</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Interventions Card - Structure exacte du dashboard */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Content wrapper avec padding */}
              <div className="flex-1 flex flex-col min-h-0 p-4">
                <InterventionsNavigator
                  interventions={interventions}
                  loading={loading}
                  emptyStateConfig={{
                    title: "Aucune intervention",
                    description: "Créez votre première intervention pour commencer",
                    showCreateButton: true,
                    createButtonText: "Créer une intervention",
                    createButtonAction: () => navigate("/gestionnaire/interventions/nouvelle-intervention")
                  }}
                  showStatusActions={true}
                  searchPlaceholder="Rechercher par titre, description, ou lot..."
                  showFilters={true}
                  actionHooks={{
                    approvalHook,
                    quotingHook,
                    planningHook,
                    executionHook,
                    finalizationHook
                  }}
                  className="bg-transparent border-0 shadow-none flex-1 flex flex-col min-h-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
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
          onViewProvider={(providerId) => navigate(`/gestionnaire/contacts?highlight=${providerId}`)}
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
    </div>
  )
}
