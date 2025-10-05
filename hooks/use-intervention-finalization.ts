import { useState } from "react"
import { logger, logError } from '@/lib/logger'
import {
  interventionActionsService,
  type InterventionAction,
  type FinalizationData
} from "@/lib/intervention-actions-service"

interface FinalizeModal {
  isOpen: boolean
  intervention: InterventionAction | null
}

interface QuotesModal {
  isOpen: boolean
  intervention: InterventionAction | null
}

export const useInterventionFinalization = () => {
  // État des modals
  const [finalizeModal, setFinalizeModal] = useState<FinalizeModal>({
    isOpen: false,
    intervention: null,
  })

  const [quotesModal, setQuotesModal] = useState<QuotesModal>({
    isOpen: false,
    intervention: null,
  })

  const [finalizeConfirmModal, setFinalizeConfirmModal] = useState(false)
  const [finalizeSuccessModal, setFinalizeSuccessModal] = useState(false)

  // État des formulaires
  const [finalAmount, setFinalAmount] = useState("")
  const [paymentComment, setPaymentComment] = useState("")

  // Actions de finalisation
  const handleFinalizeModal = (intervention: InterventionAction) => {
    setFinalizeModal({ isOpen: true, intervention })
  }

  const handleFinalizePayment = () => {
    setFinalizeModal({ isOpen: false, intervention: null })
    setFinalizeConfirmModal(true)
  }

  const handleFinalizeConfirmation = async () => {
    if (!finalizeModal.intervention) return

    const finalizationData: FinalizationData = {
      finalAmount: finalAmount || undefined,
      paymentComment: paymentComment || undefined,
    }

    try {
      await interventionActionsService.finalizeIntervention(
        finalizeModal.intervention,
        finalizationData
      )

      setFinalizeConfirmModal(false)
      setFinalizeSuccessModal(true)

      // Auto-close success modal after 3 seconds
      setTimeout(() => {
        setFinalizeSuccessModal(false)
        resetFinalizationForm()
      }, 3000)
    } catch (error) {
      logger.error("Error finalizing intervention:", error)
      // TODO: Handle error state
    }
  }

  // Actions sur les devis
  const handleQuotesModal = (intervention: InterventionAction) => {
    setQuotesModal({ isOpen: true, intervention })
  }

  const handleQuoteAction = async (quoteId: string, action: "accept" | "reject") => {
    if (!quotesModal.intervention) return

    try {
      if (action === "accept") {
        await interventionActionsService.acceptQuote(quoteId, quotesModal.intervention.id)
        // TODO: Trigger planning modal after acceptance
      } else {
        await interventionActionsService.rejectQuote(quoteId, quotesModal.intervention.id)
      }

      setQuotesModal({ isOpen: false, intervention: null })
    } catch (error) {
      logger.error("Error processing quote:", error)
      // TODO: Handle error state
    }
  }

  // Reset et fermeture
  const resetFinalizationForm = () => {
    setFinalAmount("")
    setPaymentComment("")
  }

  const closeFinalizeModal = () => {
    setFinalizeModal({ isOpen: false, intervention: null })
    resetFinalizationForm()
  }

  const closeQuotesModal = () => {
    setQuotesModal({ isOpen: false, intervention: null })
  }

  const closeFinalizeConfirmModal = () => {
    setFinalizeConfirmModal(false)
  }

  const closeFinalizeSuccessModal = () => {
    setFinalizeSuccessModal(false)
    resetFinalizationForm()
  }

  return {
    // États des modals
    finalizeModal,
    quotesModal,
    finalizeConfirmModal,
    finalizeSuccessModal,

    // États des formulaires
    finalAmount,
    paymentComment,

    // Setters
    setFinalAmount,
    setPaymentComment,

    // Actions de finalisation
    handleFinalizeModal,
    handleFinalizePayment,
    handleFinalizeConfirmation,

    // Actions sur les devis
    handleQuotesModal,
    handleQuoteAction,

    // Fermeture des modals
    closeFinalizeModal,
    closeQuotesModal,
    closeFinalizeConfirmModal,
    closeFinalizeSuccessModal,
  }
}
