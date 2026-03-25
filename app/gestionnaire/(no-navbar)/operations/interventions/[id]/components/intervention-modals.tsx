'use client'

import dynamic from 'next/dynamic'
import { ChooseTimeSlotModal } from '@/components/intervention/modals/choose-time-slot-modal'
import { MultiSlotResponseModal, type TimeSlot as ModalTimeSlot } from '@/components/intervention/modals/multi-slot-response-modal'
import { ProgrammingModal } from '@/components/intervention/modals/programming-modal'
import { CancelSlotModal } from '@/components/intervention/modals/cancel-slot-modal'
import { CancelQuoteRequestModal } from '@/components/intervention/modals/cancel-quote-request-modal'
import { CancelQuoteConfirmModal } from '@/components/intervention/modals/cancel-quote-confirm-modal'
import { FinalizationModalLive } from '@/components/intervention/finalization-modal-live'
import { QuoteApprovalModal } from '@/components/quotes/quote-approval-modal'
import { QuoteRejectionModal } from '@/components/quotes/quote-rejection-modal'
import { DocumentUploadDialog } from '@/components/interventions/document-upload-dialog'
import { ContactSelector, type ContactSelectorRef } from '@/components/contact-selector'
import type { Quote, Document, TimeSlot } from './intervention-detail-types'

const ApprovalModal = dynamic(
  () => import('@/components/intervention/modals/approval-modal').then(mod => ({ default: mod.ApprovalModal })),
  { ssr: false }
)
const CancelConfirmationModal = dynamic(
  () => import('@/components/intervention/modals/cancel-confirmation-modal').then(mod => ({ default: mod.CancelConfirmationModal })),
  { ssr: false }
)

interface PlanningHookState {
  programmingModal: { isOpen: boolean; intervention: unknown }
  cancelSlotModal: { isOpen: boolean; slot: unknown }
  slotResponseModal: { isOpen: boolean; slots: ModalTimeSlot[] }
  programmingOption: string
  programmingDirectSchedule: { date: string; startTime: string; endTime: string }
  programmingProposedSlots: Array<{ date: string; startTime: string; endTime: string }>
  isSubmitting: boolean
  closeProgrammingModal: () => void
  closeCancelSlotModal: () => void
  closeSlotResponseModal: () => void
  setProgrammingOption: (opt: string) => void
  setProgrammingDirectSchedule: (s: { date: string; startTime: string; endTime: string }) => void
  addProgrammingSlot: () => void
  updateProgrammingSlot: (index: number, field: string, value: string) => void
  removeProgrammingSlot: (index: number) => void
  handleProgrammingConfirm: () => void
  isProgrammingFormValid: () => boolean
  setProgrammingProposedSlots: (slots: Array<{ date: string; startTime: string; endTime: string }>) => void
}

interface ApprovalHookState {
  approvalModal: { isOpen: boolean; intervention: unknown; action: unknown }
  rejectionReason: string
  internalComment: string
  setRejectionReason: (v: string) => void
  setInternalComment: (v: string) => void
  handleActionChange: (action: unknown) => void
  handleConfirmAction: () => void
  closeApprovalModal: () => void
  isLoading: boolean
}

interface CancellationHookState {
  cancellationModal: { isOpen: boolean; intervention: unknown }
  cancellationReason: string
  setCancellationReason: (v: string) => void
  internalComment: string
  setInternalComment: (v: string) => void
  handleConfirmCancellation: () => void
  closeCancellationModal: () => void
  isLoading: boolean
  error: string | null
}

interface InterventionModalsProps {
  interventionId: string
  teamId: string
  serverUserId: string
  // Planning
  planning: PlanningHookState
  // Approval
  approvalHook: ApprovalHookState
  documents: Document[]
  // Cancellation
  cancellationHook: CancellationHookState
  // Programming modal participants
  requireQuote: boolean
  onRequireQuoteChange: (v: boolean) => void
  selectedProviderIds: string[]
  onProviderToggle: (id: string) => void
  providers: Array<{ id: string; name: string; email: string; role?: string; has_account: boolean }>
  selectedManagerIds: string[]
  onManagerToggle: (id: string) => void
  managers: Array<{ id: string; name: string; email: string; phone?: string; role?: string; type: string; has_account: boolean }>
  selectedTenantIds: string[]
  onTenantToggle: (id: string) => void
  tenants: Array<{ id: string; name: string; email: string; phone?: string; type: string; has_account: boolean }>
  modalInstructions: string
  onInstructionsChange: (v: string) => void
  modalAssignmentMode: string
  onAssignmentModeChange: (v: unknown) => void
  modalProviderInstructions: Record<string, string>
  onProviderInstructionsChange: (providerId: string, instructions: string) => void
  quotes: Quote[]
  requiresConfirmation: boolean
  onRequiresConfirmationChange: (v: boolean) => void
  confirmationRequired: string[]
  onConfirmationRequiredChange: (userId: string, required: boolean) => void
  // Cancel quote modal
  cancelQuoteModal: { isOpen: boolean; quoteId: string | null; providerName: string }
  onCloseCancelQuoteModal: () => void
  onConfirmCancelQuote: () => void
  isCancellingQuote: boolean
  // Cancel quote confirm modal (bulk)
  cancelQuoteConfirmModal: { isOpen: boolean; quoteCount: number; providerNames: string[] }
  onCloseCancelQuoteConfirmModal: () => void
  onConfirmCancelQuoteFromToggle: () => void
  isCancellingQuoteFromToggle: boolean
  // Finalization
  showFinalizationModal: boolean
  onCloseFinalizationModal: () => void
  onFinalizationComplete: () => void
  // Choose slot
  selectedFullSlotForChoice: TimeSlot | null
  isChooseModalOpen: boolean
  onChooseModalOpenChange: (open: boolean) => void
  onChooseModalSuccess: () => void
  transformedQuotes: Array<{ id: string; status: string }>
  // Response modal
  responseModalSlots: ModalTimeSlot[]
  isResponseModalOpen: boolean
  responseModalExisting: Record<string, { response: 'accept' | 'reject' | 'pending'; reason?: string }>
  userProposedSlotIds: string[]
  onCloseResponseModal: () => void
  onRefresh: () => void
  // Quote approval/rejection modals
  quoteApprovalModal: { isOpen: boolean; quoteId: string; providerName: string; totalAmount: number } | null
  onCloseQuoteApprovalModal: () => void
  onQuoteApprovalSuccess: () => void
  quoteRejectionModal: { isOpen: boolean; quoteId: string; providerName: string; totalAmount: number } | null
  onCloseQuoteRejectionModal: () => void
  onQuoteRejectionSuccess: () => void
  // Document upload
  isDocumentUploadOpen: boolean
  onDocumentUploadOpenChange: (open: boolean) => void
  onUploadComplete: () => void
  // Document preview
  previewModal: React.ReactNode
  // Contact selector
  contactSelectorRef: React.RefObject<ContactSelectorRef | null>
  selectedContacts: { manager: unknown[]; provider: unknown[] }
  onContactSelected: (contact: unknown, contactType: string) => void
  onContactCreated: (contact: unknown, contactType: string) => void
  onContactRemoved: (contactId: string, contactType: string) => void
  onRequestContactCreation: (contactType: string) => void
}

export function InterventionModals({
  interventionId,
  teamId,
  serverUserId,
  planning,
  approvalHook,
  documents,
  cancellationHook,
  requireQuote,
  onRequireQuoteChange,
  selectedProviderIds,
  onProviderToggle,
  providers,
  selectedManagerIds,
  onManagerToggle,
  managers,
  selectedTenantIds,
  onTenantToggle,
  tenants,
  modalInstructions,
  onInstructionsChange,
  modalAssignmentMode,
  onAssignmentModeChange,
  modalProviderInstructions,
  onProviderInstructionsChange,
  quotes,
  requiresConfirmation,
  onRequiresConfirmationChange,
  confirmationRequired,
  onConfirmationRequiredChange,
  cancelQuoteModal,
  onCloseCancelQuoteModal,
  onConfirmCancelQuote,
  isCancellingQuote,
  cancelQuoteConfirmModal,
  onCloseCancelQuoteConfirmModal,
  onConfirmCancelQuoteFromToggle,
  isCancellingQuoteFromToggle,
  showFinalizationModal,
  onCloseFinalizationModal,
  onFinalizationComplete,
  selectedFullSlotForChoice,
  isChooseModalOpen,
  onChooseModalOpenChange,
  onChooseModalSuccess,
  transformedQuotes,
  responseModalSlots,
  isResponseModalOpen,
  responseModalExisting,
  userProposedSlotIds,
  onCloseResponseModal,
  onRefresh,
  quoteApprovalModal,
  onCloseQuoteApprovalModal,
  onQuoteApprovalSuccess,
  quoteRejectionModal,
  onCloseQuoteRejectionModal,
  onQuoteRejectionSuccess,
  isDocumentUploadOpen,
  onDocumentUploadOpenChange,
  onUploadComplete,
  previewModal,
  contactSelectorRef,
  selectedContacts,
  onContactSelected,
  onContactCreated,
  onContactRemoved,
  onRequestContactCreation,
}: InterventionModalsProps) {
  return (
    <>
      {/* Programming Modal */}
      <ProgrammingModal
        isOpen={planning.programmingModal.isOpen}
        onClose={planning.closeProgrammingModal}
        intervention={planning.programmingModal.intervention}
        programmingOption={planning.programmingOption}
        onProgrammingOptionChange={planning.setProgrammingOption}
        directSchedule={planning.programmingDirectSchedule}
        onDirectScheduleChange={planning.setProgrammingDirectSchedule}
        proposedSlots={planning.programmingProposedSlots}
        onAddProposedSlot={planning.addProgrammingSlot}
        onUpdateProposedSlot={planning.updateProgrammingSlot}
        onRemoveProposedSlot={planning.removeProgrammingSlot}
        selectedProviders={selectedProviderIds}
        onProviderToggle={onProviderToggle}
        providers={providers.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email || '',
          role: p.role,
          has_account: !!p.has_account
        }))}
        onConfirm={planning.handleProgrammingConfirm}
        isFormValid={planning.isProgrammingFormValid()}
        isSubmitting={planning.isSubmitting}
        teamId={teamId}
        requireQuote={requireQuote}
        onRequireQuoteChange={onRequireQuoteChange}
        managers={managers.map(m => ({
          id: m.id,
          name: m.name,
          email: m.email || '',
          phone: m.phone || undefined,
          role: m.role,
          type: 'gestionnaire' as const,
          has_account: !!m.has_account
        }))}
        selectedManagers={selectedManagerIds}
        onManagerToggle={onManagerToggle}
        tenants={tenants.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email || '',
          phone: t.phone || undefined,
          type: 'locataire' as const,
          has_account: !!t.has_account
        }))}
        selectedTenants={selectedTenantIds}
        onTenantToggle={onTenantToggle}
        showTenantsSection={tenants.length > 0}
        includeTenants={tenants.length > 0}
        onIncludeTenantsChange={() => {}}
        instructions={modalInstructions}
        onInstructionsChange={onInstructionsChange}
        assignmentMode={modalAssignmentMode}
        onAssignmentModeChange={onAssignmentModeChange}
        providerInstructions={modalProviderInstructions}
        onProviderInstructionsChange={onProviderInstructionsChange}
        quoteRequests={quotes}
        requiresConfirmation={requiresConfirmation}
        onRequiresConfirmationChange={onRequiresConfirmationChange}
        confirmationRequired={confirmationRequired}
        onConfirmationRequiredChange={onConfirmationRequiredChange}
        currentUserId={serverUserId}
      />

      {/* Cancel Slot Modal */}
      <CancelSlotModal
        isOpen={planning.cancelSlotModal.isOpen}
        onClose={planning.closeCancelSlotModal}
        slot={planning.cancelSlotModal.slot}
        interventionId={interventionId}
        onSuccess={onRefresh}
      />

      {/* Multi Slot Response Modal (via planning hook) */}
      <MultiSlotResponseModal
        isOpen={planning.slotResponseModal.isOpen}
        onClose={planning.closeSlotResponseModal}
        slots={planning.slotResponseModal.slots}
        interventionId={interventionId}
        onSuccess={onRefresh}
      />

      {/* Cancel Quote Request Modal */}
      <CancelQuoteRequestModal
        isOpen={cancelQuoteModal.isOpen}
        onClose={onCloseCancelQuoteModal}
        onConfirm={onConfirmCancelQuote}
        providerName={cancelQuoteModal.providerName}
        isLoading={isCancellingQuote}
      />

      {/* Cancel Quote Confirm Modal (bulk) */}
      <CancelQuoteConfirmModal
        isOpen={cancelQuoteConfirmModal.isOpen}
        onClose={onCloseCancelQuoteConfirmModal}
        onConfirm={onConfirmCancelQuoteFromToggle}
        quoteCount={cancelQuoteConfirmModal.quoteCount}
        providerNames={cancelQuoteConfirmModal.providerNames}
        isLoading={isCancellingQuoteFromToggle}
      />

      {/* Finalization Modal */}
      <FinalizationModalLive
        interventionId={interventionId}
        isOpen={showFinalizationModal}
        onClose={onCloseFinalizationModal}
        onComplete={onFinalizationComplete}
      />

      {/* Choose Time Slot Modal */}
      {selectedFullSlotForChoice && (
        <ChooseTimeSlotModal
          slot={selectedFullSlotForChoice}
          interventionId={selectedFullSlotForChoice.intervention_id}
          hasActiveQuotes={transformedQuotes.some(q => q.status === 'pending' || q.status === 'sent')}
          open={isChooseModalOpen}
          onOpenChange={onChooseModalOpenChange}
          onSuccess={onChooseModalSuccess}
        />
      )}

      {/* Response Modal (all active slots) */}
      {responseModalSlots.length > 0 && (
        <MultiSlotResponseModal
          isOpen={isResponseModalOpen}
          onClose={onCloseResponseModal}
          slots={responseModalSlots}
          interventionId={interventionId}
          existingResponses={Object.keys(responseModalExisting).length > 0 ? responseModalExisting : undefined}
          userProposedSlotIds={userProposedSlotIds}
          onSuccess={onRefresh}
        />
      )}

      {/* Contact Selector */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={teamId}
        displayMode="compact"
        hideUI={true}
        selectedContacts={selectedContacts}
        onContactSelected={onContactSelected}
        onContactCreated={onContactCreated}
        onContactRemoved={onContactRemoved}
        onRequestContactCreation={onRequestContactCreation}
      />

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        interventionId={interventionId}
        open={isDocumentUploadOpen}
        onOpenChange={onDocumentUploadOpenChange}
        onUploadComplete={onUploadComplete}
      />

      {/* Document Preview Modal */}
      {previewModal}

      {/* Approval Modal */}
      {approvalHook.approvalModal.isOpen && (
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
          isLoading={approvalHook.isLoading}
          documents={documents}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancellationHook.cancellationModal.isOpen && (
        <CancelConfirmationModal
          isOpen={cancellationHook.cancellationModal.isOpen}
          onClose={cancellationHook.closeCancellationModal}
          onConfirm={cancellationHook.handleConfirmCancellation}
          intervention={cancellationHook.cancellationModal.intervention}
          cancellationReason={cancellationHook.cancellationReason}
          onCancellationReasonChange={cancellationHook.setCancellationReason}
          internalComment={cancellationHook.internalComment}
          onInternalCommentChange={cancellationHook.setInternalComment}
          isLoading={cancellationHook.isLoading}
          error={cancellationHook.error}
        />
      )}

      {/* Quote Approval Modal */}
      {quoteApprovalModal && (
        <QuoteApprovalModal
          isOpen={quoteApprovalModal.isOpen}
          onClose={onCloseQuoteApprovalModal}
          onSuccess={onQuoteApprovalSuccess}
          quote={{
            id: quoteApprovalModal.quoteId,
            providerName: quoteApprovalModal.providerName,
            totalAmount: quoteApprovalModal.totalAmount
          }}
        />
      )}

      {/* Quote Rejection Modal */}
      {quoteRejectionModal && (
        <QuoteRejectionModal
          isOpen={quoteRejectionModal.isOpen}
          onClose={onCloseQuoteRejectionModal}
          onSuccess={onQuoteRejectionSuccess}
          quote={{
            id: quoteRejectionModal.quoteId,
            providerName: quoteRejectionModal.providerName,
            totalAmount: quoteRejectionModal.totalAmount
          }}
        />
      )}
    </>
  )
}
