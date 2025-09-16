"use client"

import React, { createContext, useContext, ReactNode } from "react"
import { type InterventionAction } from "@/lib/intervention-actions-service"
import { useInterventionCancellation } from "@/hooks/use-intervention-cancellation"

interface InterventionCancellationContextType {
  // État des modales
  cancellationModal: {
    isOpen: boolean
    intervention: InterventionAction | null
  }
  
  // État des formulaires
  cancellationReason: string
  internalComment: string
  isLoading: boolean
  error: string | null
  isFormValid: boolean

  // Setters
  setCancellationReason: (reason: string) => void
  setInternalComment: (comment: string) => void
  setError: (error: string | null) => void

  // Actions
  handleCancellationAction: (intervention: InterventionAction) => void
  handleConfirmCancellation: () => Promise<void>
  closeCancellationModal: () => void
}

const InterventionCancellationContext = createContext<InterventionCancellationContextType | undefined>(undefined)

interface InterventionCancellationProviderProps {
  children: ReactNode
}

export const InterventionCancellationProvider = ({ children }: InterventionCancellationProviderProps) => {
  const cancellationHook = useInterventionCancellation()

  return (
    <InterventionCancellationContext.Provider value={cancellationHook}>
      {children}
    </InterventionCancellationContext.Provider>
  )
}

export const useInterventionCancellationContext = (): InterventionCancellationContextType => {
  const context = useContext(InterventionCancellationContext)
  if (context === undefined) {
    throw new Error('useInterventionCancellationContext must be used within an InterventionCancellationProvider')
  }
  return context
}
