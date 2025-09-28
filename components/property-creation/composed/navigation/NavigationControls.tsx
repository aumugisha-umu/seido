/**
 * NavigationControls - Composed navigation component for property creation steps
 *
 * Provides intelligent navigation with step validation, loading states,
 * and context-aware button labels. Handles both building and lot creation flows.
 */

"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Check, Loader2, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePropertyCreationContext } from "../../context"

interface NavigationControlsProps {
  className?: string
  showSaveAsDraft?: boolean
  onSaveAsDraft?: () => void
  customNextLabel?: string
  customPreviousLabel?: string
  customSubmitLabel?: string
}

export function NavigationControls({
  className,
  showSaveAsDraft = false,
  onSaveAsDraft,
  customNextLabel,
  customPreviousLabel,
  customSubmitLabel
}: NavigationControlsProps) {
  const { formData, navigation, actions } = usePropertyCreationContext()

  const isFirstStep = navigation.currentStep === 1
  const isLastStep = navigation.currentStep === navigation.totalSteps
  const canProceed = navigation.canGoNext
  const isLoading = navigation.isLoading
  const isCreating = navigation.isCreating

  // Generate smart labels based on context
  const getNextLabel = (): string => {
    if (customNextLabel) return customNextLabel

    const mode = formData.mode
    const currentStep = navigation.currentStep

    if (mode === 'building') {
      switch (currentStep) {
        case 1: return "Continuer vers les lots"
        case 2: return "Continuer vers les contacts"
        case 3: return "Créer l'immeuble"
        default: return "Suivant"
      }
    } else {
      switch (currentStep) {
        case 1: return "Configurer le lot"
        case 2: return "Assigner les contacts"
        case 3: return "Créer le lot"
        default: return "Suivant"
      }
    }
  }

  const getPreviousLabel = (): string => {
    if (customPreviousLabel) return customPreviousLabel

    const currentStep = navigation.currentStep
    const mode = formData.mode

    if (mode === 'building') {
      switch (currentStep) {
        case 2: return "Retour à l'immeuble"
        case 3: return "Retour aux lots"
        case 4: return "Retour aux contacts"
        default: return "Précédent"
      }
    } else {
      switch (currentStep) {
        case 2: return "Retour à l'immeuble"
        case 3: return "Retour au lot"
        case 4: return "Retour aux contacts"
        default: return "Précédent"
      }
    }
  }

  const getSubmitLabel = (): string => {
    if (customSubmitLabel) return customSubmitLabel

    return formData.mode === 'building'
      ? "Confirmer la création"
      : "Créer le lot"
  }

  const handleNext = () => {
    if (isLastStep) {
      actions.submit()
    } else {
      actions.goNext()
    }
  }

  return (
    <div className={cn("flex flex-col sm:flex-row justify-between gap-3 pt-6", className)}>
      {/* Left side: Previous button and save draft */}
      <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-1">
        <Button
          variant="outline"
          onClick={actions.goPrevious}
          disabled={isFirstStep || isLoading}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {getPreviousLabel()}
        </Button>

        {showSaveAsDraft && onSaveAsDraft && !isLastStep && (
          <Button
            variant="ghost"
            onClick={onSaveAsDraft}
            disabled={isLoading}
            className="w-full sm:w-auto text-gray-600 hover:text-gray-800"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder le brouillon
          </Button>
        )}
      </div>

      {/* Right side: Next/Submit button */}
      <div className="order-1 sm:order-2">
        <Button
          onClick={handleNext}
          disabled={!canProceed || isLoading}
          className={cn(
            "w-full sm:w-auto",
            isLastStep
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création en cours...
            </>
          ) : isLastStep ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              {getSubmitLabel()}
            </>
          ) : (
            <>
              <span>{getNextLabel()}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* Help text for disabled state */}
      {!canProceed && !isLoading && (
        <div className="w-full text-center sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:mt-16 order-3">
          <p className="text-sm text-gray-500">
            {(() => {
              const mode = formData.mode
              const currentStep = navigation.currentStep

              if (mode === 'building') {
                switch (currentStep) {
                  case 1: return "Veuillez renseigner l'adresse de l'immeuble pour continuer"
                  case 2: return "Ajoutez au moins un lot pour continuer"
                  case 3: return "Vérifiez les informations avant de créer l'immeuble"
                  default: return "Complétez les informations requises"
                }
              } else {
                switch (currentStep) {
                  case 1: return "Sélectionnez un immeuble ou configurez un lot indépendant"
                  case 2: return "Configurez les détails du lot"
                  case 3: return "Vérifiez les informations avant de créer le lot"
                  default: return "Complétez les informations requises"
                }
              }
            })()}
          </p>
        </div>
      )}
    </div>
  )
}

NavigationControls.displayName = "NavigationControls"