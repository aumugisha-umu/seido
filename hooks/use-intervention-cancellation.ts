"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { type InterventionAction, InterventionActionsService, type CancellationData } from "@/lib/intervention-actions-service"
import { logger, logError } from '@/lib/logger'
interface CancellationModal {
  isOpen: boolean
  intervention: InterventionAction | null
}

export const useInterventionCancellation = () => {
  const router = useRouter()
  const { toast } = useToast()
  
  // État des modales
  const [cancellationModal, setCancellationModal] = useState<CancellationModal>({
    isOpen: false,
    intervention: null,
  })

  // État des formulaires
  const [cancellationReason, setCancellationReason] = useState("")
  const [internalComment, setInternalComment] = useState("")

  // États de chargement et d'erreurs
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Actions
  const handleCancellationAction = (intervention: InterventionAction) => {
    // Force l'état de fermeture d'abord pour éviter des conflits
    setCancellationModal({ isOpen: false, intervention: null })
    
    // Puis ouvre avec les nouvelles données après un micro-délai
    setTimeout(() => {
      setCancellationModal({
        isOpen: true,
        intervention,
      })
      setCancellationReason("")
      setInternalComment("")
      setError(null)
    }, 10)
  }

  const handleConfirmCancellation = async () => {
    if (!cancellationModal.intervention) {
      return
    }
    
    // Validation renforcée avec logs de debug
    const trimmedReason = cancellationReason.trim()
    logger.info('🔍 [CANCELLATION] Validation check:', {
      original: cancellationReason,
      trimmed: trimmedReason,
      length: trimmedReason.length,
      isEmpty: !trimmedReason
    })
    
    if (!trimmedReason) {
      setError("Le motif d'annulation est requis")
      return
    }

    if (!cancellationModal.intervention.id) {
      setError("ID d'intervention manquant")
      setIsLoading(false)
      return
    }

    const cancellationData: CancellationData = {
      cancellationReason: trimmedReason,
      ...(internalComment.trim() && { internalComment: internalComment.trim() })
    }

    setIsLoading(true)
    setError(null)

    try {
      const interventionActionsService = new InterventionActionsService()
      
      await interventionActionsService.cancelIntervention(
        cancellationModal.intervention, 
        cancellationData
      )

      // Toast de succès
      toast({
        title: "Intervention annulée",
        description: `L'intervention "${cancellationModal.intervention.title}" a été annulée avec succès.`,
        variant: "success",
      })

      // Fermer la modale de confirmation
      setCancellationModal({ isOpen: false, intervention: null })
      
      // Reset des formulaires
      setCancellationReason("")
      setInternalComment("")
      
      // Rafraîchir les données après succès
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (error) {
      logger.error("Error cancelling intervention:", error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue lors de l\'annulation')
    } finally {
      setIsLoading(false)
    }
  }

  const closeCancellationModal = () => {
    if (isLoading) return // Empêcher la fermeture pendant le chargement
    setCancellationModal({ isOpen: false, intervention: null })
    setCancellationReason("")
    setInternalComment("")
    setError(null)
  }


  // Validation du formulaire
  const isFormValid = cancellationReason.trim().length > 0

  return {
    // États
    cancellationModal,
    cancellationReason,
    internalComment,
    isLoading,
    error,
    isFormValid,

    // Setters
    setCancellationReason,
    setInternalComment,
    setError,

    // Actions
    handleCancellationAction,
    handleConfirmCancellation,
    closeCancellationModal,
  }
}

