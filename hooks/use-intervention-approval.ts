import { useState } from "react"
import { useRouter } from "next/navigation"
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

  const handleConfirmAction = () => {
    if (approvalModal.action === "approve") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "approve",
        rejectionReason: "",
        internalComment: internalComment,
      })
    } else if (approvalModal.action === "reject") {
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
      rejectionReason: confirmationModal.rejectionReason,
      internalComment: confirmationModal.internalComment,
    }

    try {
      if (confirmationModal.action === "approve") {
        await interventionActionsService.approveIntervention(
          confirmationModal.intervention, 
          approvalData
        )

        // Rediriger vers la création d'intervention pour traitement
        const redirectUrl = interventionActionsService.generateApprovalRedirectUrl(
          confirmationModal.intervention
        )
        
        setSuccessModal({
          isOpen: true,
          action: confirmationModal.action,
          interventionTitle: confirmationModal.intervention.title || "",
        })

        // Rediriger après un délai
        setTimeout(() => {
          router.push(redirectUrl)
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
      }
    } catch (error) {
      console.error("Error processing intervention:", error)
      // TODO: Handle error state
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

    // Setters
    setRejectionReason,
    setInternalComment,

    // Actions
    handleApprovalAction,
    handleConfirmAction,
    handleFinalConfirmation,
    closeApprovalModal,
    closeConfirmationModal,
    closeSuccessModal,
  }
}
