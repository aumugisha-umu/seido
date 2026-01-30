import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { logger } from '@/lib/logger'
import {
  interventionActionsService,
  type InterventionAction,
} from "@/lib/intervention-actions-service"
import { useToast } from "@/hooks/use-toast"

interface ApprovalModal {
  isOpen: boolean
  intervention: InterventionAction | null
  action: "approve" | "reject" | null
}

export const useInterventionApproval = () => {
  const router = useRouter()
  const { toast } = useToast()

  // État de la modale unique
  const [approvalModal, setApprovalModal] = useState<ApprovalModal>({
    isOpen: false,
    intervention: null,
    action: null,
  })

  // État des formulaires
  const [rejectionReason, setRejectionReason] = useState("")
  const [internalComment, setInternalComment] = useState("")

  // États de chargement et d'erreurs
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ouvrir la modale avec une action pré-sélectionnée
  const handleApprovalAction = useCallback((intervention: InterventionAction, action: "approve" | "reject") => {
    setApprovalModal({
      isOpen: true,
      intervention,
      action,
    })
    setRejectionReason("")
    setInternalComment("")
  }, [])

  // Ouvrir la modale sans pré-sélection (pour "Traiter la demande")
  const openApprovalModal = useCallback((intervention: InterventionAction) => {
    setApprovalModal({
      isOpen: true,
      intervention,
      action: null,
    })
    setRejectionReason("")
    setInternalComment("")
  }, [])

  // Changer l'action sélectionnée
  const handleActionChange = useCallback((action: "approve" | "reject") => {
    setApprovalModal(prev => ({
      ...prev,
      action: action
    }))

    if (action === "approve") {
      setRejectionReason("")
    }
  }, [])

  // Confirmer l'action (appel API direct)
  const handleConfirmAction = useCallback(async (actionOverride?: "approve" | "reject") => {
    const action = actionOverride || approvalModal.action
    const intervention = approvalModal.intervention

    if (!intervention || !action) return

    setIsLoading(true)
    setError(null)

    try {
      if (action === "approve") {
        await interventionActionsService.approveIntervention(
          intervention,
          internalComment?.trim() || undefined
        )

        toast({
          title: "Intervention approuvée",
          description: "L'intervention passe en phase de planification.",
        })

      } else if (action === "reject") {
        if (!rejectionReason.trim()) {
          throw new Error('Le motif de rejet est requis')
        }

        logger.info(`📝 [HOOK] Rejecting with internalComment: "${internalComment || '(empty)'}"`)

        await interventionActionsService.rejectIntervention(
          intervention,
          rejectionReason.trim(),
          internalComment?.trim() || undefined
        )

        toast({
          title: "Intervention rejetée",
          description: "Le locataire sera notifié du rejet.",
        })
      }

      // Fermer la modale
      setApprovalModal({ isOpen: false, intervention: null, action: null })
      setRejectionReason("")
      setInternalComment("")

      // Rafraîchir la page après un court délai
      setTimeout(() => {
        router.refresh()
      }, 500)

    } catch (err) {
      logger.error("Error processing intervention:", err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(errorMessage)

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [approvalModal.action, approvalModal.intervention, rejectionReason, router, toast])

  // Fermer la modale
  const closeApprovalModal = useCallback(() => {
    setApprovalModal({ isOpen: false, intervention: null, action: null })
    setRejectionReason("")
    setInternalComment("")
    setError(null)
  }, [])

  return {
    // États
    approvalModal,
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
    openApprovalModal,
    handleActionChange,
    handleConfirmAction,
    closeApprovalModal,
  }
}
