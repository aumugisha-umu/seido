'use client'

/**
 * QuoteSubmissionModal
 * Modal for providers to submit quotes for interventions
 *
 * Uses the base intervention modal components for consistent UI
 */

import { useState } from 'react'
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

  // State for form submission control
  const [submitHandler, setSubmitHandler] = useState<(() => void) | null>(null)
  const [isFormValid, setIsFormValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = () => {
    onOpenChange(false)
  }

  const handleSuccess = () => {
    onSuccess()
    handleClose()
  }

  const handleSubmit = () => {
    if (submitHandler) {
      submitHandler()
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

  return (
    <InterventionModalBase
      open={open}
      onOpenChange={onOpenChange}
      customWidth="900px"
      customHeight="90vh"
    >
      <InterventionModalHeader
        title={hideEstimationSection ? "Ajouter mes disponibilités" : "Soumettre une estimation"}
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
          onSubmitReady={setSubmitHandler}
          onValidationChange={setIsFormValid}
          onLoadingChange={setIsLoading}
          hideEstimationSection={hideEstimationSection}
        />
      </InterventionModalContent>

      <InterventionModalFooter
        onCancel={handleClose}
        onConfirm={handleSubmit}
        confirmLabel="Soumettre le devis"
        confirmIcon={Send}
        confirmDisabled={!isFormValid}
        isLoading={isLoading}
        loadingText="Envoi en cours..."
      />
    </InterventionModalBase>
  )
}
