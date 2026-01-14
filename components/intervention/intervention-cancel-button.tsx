"use client"

import { Fragment } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { type InterventionAction } from "@/lib/intervention-actions-service"
import { useInterventionCancellationContext } from "@/contexts/intervention-cancellation-context"
import { logger, logError } from '@/lib/logger'
interface InterventionCancelButtonProps {
  intervention: InterventionAction
  variant?: "button" | "dropdown-item"
  size?: "sm" | "md" | "lg"
  className?: string
}

/**
 * Composant bouton d'annulation d'intervention
 *
 * Compatible avec les statuts : approuvee, demande_de_devis, planification, planifiee
 *
 * @param intervention - L'intervention à annuler
 * @param variant - "button" pour un bouton autonome, "dropdown-item" pour menu contextuel
 * @param size - Taille du bouton (si variant="button")
 * @param className - Classes CSS supplémentaires
 */
export const InterventionCancelButton = ({
  intervention,
  variant = "button",
  size = "sm",
  className = "",
}: InterventionCancelButtonProps) => {

  const cancellationHook = useInterventionCancellationContext()

  // Vérifier si l'intervention peut être annulée
  const canBeCancelled = [
    "approuvee",
    "demande_de_devis",
    "planification",
    "planifiee"
  ].includes(intervention.status)

  if (!canBeCancelled) {
    return null
  }

  const handleClick = (event: React.MouseEvent) => {
    // Empêcher la propagation pour éviter la fermeture intempestive du dropdown
    event.preventDefault()
    event.stopPropagation()
    
    // Vérifier que le hook est bien connecté
    if (!cancellationHook) {
      logger.error("❌ cancellationHook is not available")
      return
    }
    
    // Petit délai pour permettre au dropdown de se fermer proprement
    // avant d'ouvrir la modale
    setTimeout(() => {
      cancellationHook.handleCancellationAction(intervention)
    }, 50)
  }

  // Rendu en tant qu'item de dropdown menu
  if (variant === "dropdown-item") {
    return (
      <DropdownMenuItem
        onClick={handleClick}
        className={`text-red-600 hover:text-red-800 hover:bg-red-50 focus:bg-red-50 focus:text-red-800 ${className}`}
      >
        <X className="h-4 w-4 mr-2" />
        Annuler
      </DropdownMenuItem>
    )
  }

  // Rendu en tant que bouton autonome
  const buttonSizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm", 
    lg: "h-10 px-5 text-base"
  }

  return (
    <Fragment>
      <Button
        variant="destructive"
        size={size}
        onClick={handleClick}
        className={`${buttonSizes[size]} bg-red-600 hover:bg-red-700 focus:ring-red-500 ${className}`}
        aria-label={`Annuler l'intervention ${intervention.title}`}
      >
        <X className="h-4 w-4 mr-1.5" />
        Annuler
      </Button>
    </Fragment>
  )
}
