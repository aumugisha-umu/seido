"use client"

import { useState } from "react"
import {
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { useRouter } from "next/navigation"

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
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"

import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"

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

  // ✅ État local initialisé avec les props (pas de hook de fetch)
  const [interventions, setInterventions] = useState(initialInterventions)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ Hooks avec Server Props Pattern - passer teamId depuis le serveur
  const approvalHook = useInterventionApproval()
  const quotingHook = useInterventionQuoting(teamId)
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

  // ✅ Refetch via router.refresh()
  const refetch = () => {
    setLoading(true)
    router.refresh()
    // Reset loading after a short delay (Next.js will re-render with new data)
    setTimeout(() => setLoading(false), 500)
  }

  return (
    <div className="layout-container flex flex-col flex-1 min-h-0">
      <InterventionCancellationProvider>
        <div className="content-max-width flex flex-col h-full min-h-0">
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
                onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une intervention</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Interventions Navigator */}
        <InterventionsNavigator
          interventions={interventions}
          loading={loading}
          emptyStateConfig={{
            title: "Aucune intervention",
            description: "Créez votre première intervention pour commencer",
            showCreateButton: true,
            createButtonText: "Créer une intervention",
            createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
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
        />
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
      />

      <InterventionCancellationManager />
      </InterventionCancellationProvider>
    </div>
  )
}
