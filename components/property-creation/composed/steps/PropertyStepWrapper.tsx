"use client"

/**
 * PropertyStepWrapper - Generic step wrapper component
 *
 * Provides consistent layout and behavior for all property creation steps.
 * Handles step transitions, validation display, and loading states.
 */


import React, { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePropertyCreationContext } from "../../context"
import { buildingSteps, lotSteps } from "@/lib/step-configurations"

interface PropertyStepWrapperProps {
  children: ReactNode
  title?: string
  description?: string
  className?: string
  showCard?: boolean
  showProgress?: boolean
  stepTitle?: string
  stepDescription?: string
}

export function PropertyStepWrapper({
  children,
  title,
  description,
  className,
  showCard = true,
  showProgress = true,
  stepTitle,
  stepDescription
}: PropertyStepWrapperProps) {
  const { formData, navigation, getStepValidation } = usePropertyCreationContext()

  const currentStepValidation = getStepValidation(navigation.currentStep)
  const hasErrors = !currentStepValidation.isValid
  const hasWarnings = Object.keys(currentStepValidation.warnings).length > 0

  // Get appropriate step configuration
  const steps = formData.mode === 'building' ? buildingSteps : lotSteps
  const currentStepConfig = steps[navigation.currentStep - 1]

  // Generate titles if not provided
  const finalTitle = title || stepTitle || currentStepConfig?.label || `Étape ${navigation.currentStep}`
  const finalDescription = description || stepDescription

  const content = showCard ? (
    <Card className={cn(hasErrors && "border-red-200")}>
      {(finalTitle || finalDescription) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {currentStepConfig?.icon && (
                  <currentStepConfig.icon className="w-5 h-5" />
                )}
                {finalTitle}
                <Badge variant="outline" className="ml-2 text-xs">
                  {navigation.currentStep}/{navigation.totalSteps}
                </Badge>
              </CardTitle>
              {finalDescription && (
                <p className="text-gray-600 mt-1">{finalDescription}</p>
              )}
            </div>
            {navigation.isLoading && (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-6", !finalTitle && !finalDescription && "pt-6")}>
        {children}
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-6">
      {(finalTitle || finalDescription) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              {currentStepConfig?.icon && (
                <currentStepConfig.icon className="w-5 h-5" />
              )}
              {finalTitle}
              <Badge variant="outline" className="ml-2">
                {navigation.currentStep}/{navigation.totalSteps}
              </Badge>
            </h2>
            {navigation.isLoading && (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            )}
          </div>
          {finalDescription && (
            <p className="text-gray-600">{finalDescription}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Header */}
      {showProgress && (
        <StepProgressHeader
          title={formData.mode === 'building' ? "Ajouter un immeuble" : "Ajouter un lot"}
          backButtonText="Retour aux biens"
          onBack={() => window.history.back()} // This would be replaced with proper navigation
          steps={steps}
          currentStep={navigation.currentStep}
        />
      )}

      {/* Error Alert */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Veuillez corriger les erreurs avant de continuer.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Alert */}
      {hasWarnings && !hasErrors && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {Object.values(currentStepValidation.warnings)[0]}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading Alert */}
      {navigation.isLoading && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Chargement en cours...
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {content}
    </div>
  )
}

PropertyStepWrapper.displayName = "PropertyStepWrapper"