"use client"

import {
  Plus,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useManagerStats } from "@/hooks/use-manager-stats"
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
import NavigationDebugPanel from "@/components/debug/navigation-debug"

import { 
  getInterventionLocationText, 
  getInterventionLocationIcon, 
  isBuildingWideIntervention,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel 
} from "@/lib/intervention-utils"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"

export default function InterventionsPage() {
  const router = useRouter()
  const { data: managerData, loading, error } = useManagerStats()

  // Hooks pour les différentes actions
  const approvalHook = useInterventionApproval()
  const quotingHook = useInterventionQuoting()
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

  // Get interventions from manager data
  const interventions = managerData?.interventions || []

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-slate-600">Chargement des interventions...</span>
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <InterventionCancellationProvider>
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header - Harmonized */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Interventions
              </h1>
              <p className="text-slate-600">
                Gérez et suivez toutes les interventions sur votre patrimoine
              </p>
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
      </main>

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

      {/* Modal de confirmation d'approbation */}
      <ApproveConfirmationModal
        isOpen={approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "approve"}
        onClose={approvalHook.closeConfirmationModal}
        onConfirm={approvalHook.handleFinalConfirmation}
        intervention={approvalHook.confirmationModal.intervention}
        internalComment={approvalHook.internalComment}
        onInternalCommentChange={approvalHook.setInternalComment}
        isLoading={approvalHook.isLoading}
      />

      {/* Modal de confirmation de rejet */}
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

      {/* Modales de demande de devis */}
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

      {/* Manager global des modales d'annulation */}
      <InterventionCancellationManager />

      {/* Debug Panel */}
      <NavigationDebugPanel />
    </div>
  </InterventionCancellationProvider>
  )
}

