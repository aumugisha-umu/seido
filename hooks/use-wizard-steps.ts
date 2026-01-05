"use client"

import { useState, useCallback, useMemo } from "react"

/**
 * Options pour configurer le hook useWizardSteps
 */
export interface UseWizardStepsOptions {
  /** Nombre total d'étapes dans le wizard */
  totalSteps: number
  /** Étape initiale (par défaut: 1) */
  initialStep?: number
  /** Mode édition: toutes les étapes sont cliquables (par défaut: false) */
  isEditMode?: boolean
}

/**
 * Valeurs retournées par le hook useWizardSteps
 */
export interface UseWizardStepsReturn {
  /** Étape actuelle (1-based) */
  currentStep: number
  /** Étape maximale atteinte (pour la navigation en mode création) */
  maxStepReached: number
  /** Définir l'étape actuelle directement */
  setCurrentStep: (step: number) => void
  /** Handler pour le clic sur une étape dans le header */
  handleStepClick: (step: number) => void
  /** Passer à l'étape suivante */
  handleNext: () => void
  /** Revenir à l'étape précédente */
  handleBack: () => void
  /** Peut-on avancer? */
  canGoNext: boolean
  /** Peut-on reculer? */
  canGoBack: boolean
  /** Est-ce la dernière étape? */
  isLastStep: boolean
  /** Est-ce la première étape? */
  isFirstStep: boolean
  /** Props à passer au StepProgressHeader */
  stepHeaderProps: {
    currentStep: number
    maxReachableStep: number
    onStepClick: (step: number) => void
    allowFutureSteps: boolean
  }
}

/**
 * Hook réutilisable pour la gestion des étapes dans les wizards
 *
 * @example
 * // Mode création (étapes verrouillées)
 * const wizard = useWizardSteps({ totalSteps: 4, isEditMode: false })
 *
 * @example
 * // Mode édition (toutes étapes accessibles)
 * const wizard = useWizardSteps({ totalSteps: 4, isEditMode: true })
 *
 * @example
 * // Utilisation avec StepProgressHeader
 * <StepProgressHeader
 *   title="Créer un immeuble"
 *   steps={buildingSteps}
 *   onBack={wizard.handleBack}
 *   {...wizard.stepHeaderProps}
 * />
 */
export function useWizardSteps({
  totalSteps,
  initialStep = 1,
  isEditMode = false,
}: UseWizardStepsOptions): UseWizardStepsReturn {
  const [currentStep, setCurrentStepState] = useState(initialStep)
  const [maxStepReached, setMaxStepReached] = useState(initialStep)

  // Setter qui met aussi à jour maxStepReached si nécessaire
  const setCurrentStep = useCallback((step: number) => {
    const clampedStep = Math.max(1, Math.min(step, totalSteps))
    setCurrentStepState(clampedStep)
    if (clampedStep > maxStepReached) {
      setMaxStepReached(clampedStep)
    }
  }, [totalSteps, maxStepReached])

  // Handler pour le clic sur une étape dans le header
  const handleStepClick = useCallback((step: number) => {
    setCurrentStep(step)
  }, [setCurrentStep])

  // Passer à l'étape suivante
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }, [currentStep, totalSteps, setCurrentStep])

  // Revenir à l'étape précédente
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStepState(currentStep - 1)
    }
  }, [currentStep])

  // Computed values
  const canGoNext = currentStep < totalSteps
  const canGoBack = currentStep > 1
  const isLastStep = currentStep === totalSteps
  const isFirstStep = currentStep === 1

  // Props pour StepProgressHeader (mémoïsées pour éviter re-renders)
  const stepHeaderProps = useMemo(() => ({
    currentStep,
    maxReachableStep: maxStepReached,
    onStepClick: handleStepClick,
    allowFutureSteps: isEditMode,
  }), [currentStep, maxStepReached, handleStepClick, isEditMode])

  return {
    currentStep,
    maxStepReached,
    setCurrentStep,
    handleStepClick,
    handleNext,
    handleBack,
    canGoNext,
    canGoBack,
    isLastStep,
    isFirstStep,
    stepHeaderProps,
  }
}
