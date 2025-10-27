"use client"

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

import { InterventionsSectionClient } from "./interventions-section-client"

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
  // ✅ Action hooks
  const approvalHook = useInterventionApproval()
  const quotingHook = useInterventionQuoting(teamId)
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

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
      />

      <InterventionCancellationManager />
    </InterventionCancellationProvider>
  )
}
