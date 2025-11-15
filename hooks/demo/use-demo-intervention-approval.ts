/**
 * Hook démo pour gérer l'approbation/rejet d'interventions
 * Simule les appels API en mode démo
 */

'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'

interface InterventionAction {
  id: string
  title?: string
  [key: string]: any
}

interface ApprovalModal {
  isOpen: boolean
  intervention: InterventionAction | null
  action: "approve" | "reject" | null
}

interface ConfirmationModal {
  isOpen: boolean
  intervention: InterventionAction | null
  action: "approve" | "reject" | null
  rejectionReason: string
  internalComment: string
}

interface SuccessModal {
  isOpen: boolean
  action: "approve" | "reject" | null
  interventionTitle: string
}

export const useDemoInterventionApproval = () => {
  const router = useRouter()

  // État des modals
  const [approvalModal, setApprovalModal] = useState<ApprovalModal>({
    isOpen: false,
    intervention: null,
    action: null,
  })

  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    intervention: null,
    action: null,
    rejectionReason: "",
    internalComment: "",
  })

  const [successModal, setSuccessModal] = useState<SuccessModal>({
    isOpen: false,
    action: null,
    interventionTitle: "",
  })

  // État des formulaires
  const [rejectionReason, setRejectionReason] = useState("")
  const [internalComment, setInternalComment] = useState("")

  // États de chargement et d'erreurs
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Actions
  const handleApprovalAction = (intervention: InterventionAction, action: "approve" | "reject") => {
    setApprovalModal({
      isOpen: true,
      intervention,
      action,
    })
    setRejectionReason("")
    setInternalComment("")
  }

  const handleActionChange = (action: "approve" | "reject") => {
    setApprovalModal(prev => ({
      ...prev,
      action: action
    }))

    // Reset rejection reason when switching to approve
    if (action === "approve") {
      setRejectionReason("")
    }
  }

  const handleConfirmAction = (actionOverride?: "approve" | "reject") => {
    const action = actionOverride || approvalModal.action

    if (action === "approve") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "approve",
        rejectionReason: "",
        internalComment: internalComment,
      })
    } else if (action === "reject") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "reject",
        rejectionReason: rejectionReason,
        internalComment: internalComment,
      })
    }

    setApprovalModal({ isOpen: false, intervention: null, action: null })
  }

  const handleFinalConfirmation = async () => {
    if (!confirmationModal.intervention) return

    setIsLoading(true)
    setError(null)

    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 800))

      logger.info('📤 [DEMO-APPROVAL] Simulating intervention action:', {
        interventionId: confirmationModal.intervention.id,
        action: confirmationModal.action,
        rejectionReason,
        internalComment
      })

      // TODO: En mode démo, on pourrait mettre à jour le statut dans le store
      // store.update('interventions', confirmationModal.intervention.id, {
      //   status: confirmationModal.action === 'approve' ? 'approuvee' : 'rejetee'
      // })

      setSuccessModal({
        isOpen: true,
        action: confirmationModal.action,
        interventionTitle: confirmationModal.intervention.title || "",
      })

      // Rafraîchir les données (trigger un re-fetch)
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      logger.error("❌ [DEMO-APPROVAL] Error processing intervention:", error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }

    // Reset états
    setConfirmationModal({
      isOpen: false,
      intervention: null,
      action: null,
      rejectionReason: "",
      internalComment: "",
    })
    setRejectionReason("")
    setInternalComment("")
  }

  const closeApprovalModal = () => {
    setApprovalModal({ isOpen: false, intervention: null, action: null })
    setRejectionReason("")
    setInternalComment("")
  }

  const closeConfirmationModal = () => {
    setConfirmationModal({
      isOpen: false,
      intervention: null,
      action: null,
      rejectionReason: "",
      internalComment: "",
    })
  }

  const closeSuccessModal = () => {
    setSuccessModal({
      isOpen: false,
      action: null,
      interventionTitle: "",
    })
  }

  return {
    // États
    approvalModal,
    confirmationModal,
    successModal,
    rejectionReason,
    internalComment,
    isLoading,
    error,

    // Setters
    setRejectionReason,
    setInternalComment,
    setError,

    // Actions
    handleApprovalAction,
    handleActionChange,
    handleConfirmAction,
    handleFinalConfirmation,
    closeApprovalModal,
    closeConfirmationModal,
    closeSuccessModal,
  }
}
