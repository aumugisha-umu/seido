"use client"

import { Fragment } from "react"
import { useInterventionCancellationContext } from "@/contexts/intervention-cancellation-context"
import { CancelConfirmationModal } from "./modals/cancel-confirmation-modal"

interface InterventionCancellationManagerProps {
  // Ce composant gère toutes les modales d'annulation de la page
  // Il est placé au niveau de la page pour éviter les conflits avec les dropdown menus
}

/**
 * Composant global pour gérer les modales d'annulation d'intervention
 * 
 * Ce composant doit être placé au niveau de la page pour éviter les conflits
 * entre les dropdown menus et les modales. Il utilise le contexte React
 * pour gérer l'état global des modales d'annulation.
 */
export const InterventionCancellationManager = ({}: InterventionCancellationManagerProps) => {
  
  const cancellationHook = useInterventionCancellationContext()

  return (
    <Fragment>
      {/* Modale de confirmation d'annulation */}
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
    </Fragment>
  )
}
