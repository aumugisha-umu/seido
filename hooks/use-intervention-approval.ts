import { useState } from "react"
import { useRouter } from "next/navigation"
import { logger, logError } from '@/lib/logger'
import {
  interventionActionsService,
  type InterventionAction,
  type ApprovalData
} from "@/lib/intervention-actions-service"

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

export const useInterventionApproval = () => {
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

    const approvalData: ApprovalData = {
      action: confirmationModal.action as "approve" | "reject",
      rejectionReason: rejectionReason, // ✅ Utilise la valeur actuelle
      internalComment: internalComment, // ✅ Utilise la valeur actuelle
    }

    setIsLoading(true)
    setError(null)

    try {
      if (confirmationModal.action === "approve") {
        await interventionActionsService.approveIntervention(
          confirmationModal.intervention, 
          approvalData
        )

        setSuccessModal({
          isOpen: true,
          action: confirmationModal.action,
          interventionTitle: confirmationModal.intervention.title || "",
        })

        // Rafraîchir les données (trigger un re-fetch)
        // Note: Dans un vrai contexte, on pourrait utiliser SWR mutate ou similar
        setTimeout(() => {
          window.location.reload() // Simple refresh pour maintenant
        }, 2000)

      } else if (confirmationModal.action === "reject") {
        await interventionActionsService.rejectIntervention(
          confirmationModal.intervention, 
          approvalData
        )

        setSuccessModal({
          isOpen: true,
          action: confirmationModal.action,
          interventionTitle: confirmationModal.intervention.title || "",
        })

        // Rafraîchir les données après rejet aussi
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      logger.error("Error processing intervention:", error)
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

