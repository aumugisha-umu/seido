'use client'

/**
 * QuoteSubmissionModal
 * Modal for providers to submit quotes for interventions
 *
 * Uses the base intervention modal components for consistent UI
 */

import { useState, useRef, useCallback } from 'react'
import { Wrench, Send } from 'lucide-react'
import {
  InterventionModalBase,
  InterventionModalHeader,
  InterventionModalContent,
  InterventionModalFooter,
  type InterventionData
} from './base'
import { QuoteSubmissionForm } from '@/components/intervention/quote-submission-form'
import { useAuth } from '@/hooks/use-auth'
import type { Database } from '@/lib/database.types'

interface QuoteSubmissionModalProps {
  // Modal control
  open: boolean
  onOpenChange: (open: boolean) => void

  // Data
  intervention: InterventionData
  existingQuote?: ExistingQuote
  quoteRequest?: QuoteRequest

  // Callbacks
  onSuccess: () => void

  // Display options
  hideEstimationSection?: boolean // Hide estimation fields (for availability-only mode)
}

// Types from QuoteSubmissionForm
interface ExistingQuote {
  id?: string
  laborCost?: number
  materialsCost?: number
  workDetails?: string
  estimatedDurationHours?: number
  attachments?: File[]
  providerAvailabilities?: Array<{
    date: string
    startTime: string
    endTime?: string
    isFlexible?: boolean
  }>
}

interface QuoteRequest {
  id: string
  status: string
  individual_message?: string
  deadline?: string
  sent_at: string
}

export function QuoteSubmissionModal({
  open,
  onOpenChange,
  intervention,
  existingQuote,
  quoteRequest,
  onSuccess,
  hideEstimationSection = false
}: QuoteSubmissionModalProps) {

  // Get current user ID for time slot responses
  const { profile } = useAuth()

  // Ref for form submission handler (using ref instead of state to avoid updater function issues)
  const submitHandlerRef = useRef<(() => void) | null>(null)
  
  // State for form validation and loading
  const [isFormValid, setIsFormValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Callback to set the submit handler (avoids setState updater function issues)
  const handleSetSubmitHandler = useCallback((fn: () => void) => {
    submitHandlerRef.current = fn
  }, [])

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSuccess = () => {
    onSuccess()
    handleClose()
  }

  const handleSubmit = () => {
    if (submitHandlerRef.current) {
      submitHandlerRef.current()
    }
  }

  // Manager message card (if present)
  const managerMessageContent = quoteRequest?.individual_message ? (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">📩</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 mb-1">
            Message du gestionnaire
          </p>
          <p className="text-sm text-blue-700">
            {quoteRequest.individual_message}
          </p>
        </div>
      </div>
    </div>
  ) : undefined

  // Détecter le mode édition
  const isEditMode = !!existingQuote?.id

  // Déterminer le titre et le label du bouton selon le mode
  const getModalTitle = () => {
    if (hideEstimationSection) {
      // Distinguer les 3 cas selon le status des time slots
      const hasRequestedSlots = intervention.time_slots
        && intervention.time_slots.some(slot => slot.status === 'requested')
      const hasPendingSlots = intervention.time_slots
        && intervention.time_slots.some(slot => slot.status === 'pending')

      if (hasRequestedSlots) {
        // Slots proposés par le gestionnaire → le prestataire doit confirmer
        return "Confirmer mes disponibilités"
      } else if (hasPendingSlots) {
        // Slots créés par le prestataire → il peut les modifier
        return "Modifier la planification"
      } else {
        // Aucun slot → création
        return "Ajouter mes disponibilités"
      }
    }
    return isEditMode ? "Modifier l'estimation" : "Soumettre une estimation"
  }

  const getButtonLabel = () => {
    return isEditMode ? "Modifier l'estimation" : "Soumettre l'estimation"
  }

  const getLoadingText = () => {
    return isEditMode ? "Modification en cours..." : "Envoi en cours..."
  }

  return (
    <InterventionModalBase
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
    >
      <InterventionModalHeader
        title={getModalTitle()}
        icon={Wrench}
        intervention={intervention}
        summaryAdditionalContent={managerMessageContent}
        onClose={handleClose}
      />

      <InterventionModalContent
        backgroundColor="slate"
        padding="lg"
      >
        <QuoteSubmissionForm
          intervention={{
            id: intervention.id,
            title: intervention.title,
            description: intervention.description || '',
            urgency: intervention.urgency || intervention.priority || 'normale',
            quote_deadline: quoteRequest?.deadline,
            time_slots: intervention.time_slots || [],
            scheduling_type: intervention.scheduling_type
          }}
          currentUserId={profile?.id}
          existingQuote={existingQuote}
          quoteRequest={quoteRequest}
          onSuccess={handleSuccess}
          onSubmitReady={handleSetSubmitHandler}
          onValidationChange={setIsFormValid}
          onLoadingChange={setIsLoading}
          hideEstimationSection={hideEstimationSection}
        />
      </InterventionModalContent>

      <InterventionModalFooter
        onCancel={handleClose}
        onConfirm={handleSubmit}
        confirmLabel={getButtonLabel()}
        confirmIcon={Send}
        confirmDisabled={!isFormValid}
        isLoading={isLoading}
        loadingText={getLoadingText()}
      />
    </InterventionModalBase>
  )
}
