"use client"

import React from "react"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { buildingSteps } from "@/lib/step-configurations"

interface StickyFormLayoutProps {
  currentStep: number
  title: string
  backButtonText: string
  onBack: () => void
  children: React.ReactNode
  error?: string
}

/**
 * 🎨 ENHANCED VERSION - Sticky Form Layout
 *
 * Ensures stepper stays at top and content scrolls independently.
 * Perfect for multi-step forms where navigation should always be visible.
 *
 * Layout structure:
 * ┌─────────────────────────────┐
 * │  Stepper (sticky top)       │ ← Always visible
 * ├─────────────────────────────┤
 * │                             │
 * │  Scrollable Content         │ ← Scrolls independently
 * │                             │
 * └─────────────────────────────┘
 *
 * Usage in building-creation-form.tsx:
 * ```tsx
 * return (
 *   <StickyFormLayout
 *     currentStep={currentStep}
 *     title="Ajouter un immeuble"
 *     backButtonText="Retour aux biens"
 *     onBack={() => router.push("/gestionnaire/biens")}
 *     error={error}
 *   >
 *     {currentStep === 1 && <Step1Content />}
 *     {currentStep === 2 && (
 *       <BuildingLotsStepEnhanced
 *         lots={lots}
 *         expandedLots={expandedLots}
 *         onAddLot={addLot}
 *         onUpdateLot={updateLot}
 *         onDuplicateLot={duplicateLot}
 *         onRemoveLot={removeLot}
 *         onToggleLotExpansion={toggleLotExpansion}
 *         onPrevious={() => setCurrentStep(1)}
 *         onNext={() => setCurrentStep(3)}
 *         canProceed={canProceedToNextStep()}
 *       />
 *     )}
 *     {currentStep === 3 && <Step3Content />}
 *     {currentStep === 4 && <Step4Content />}
 *   </StickyFormLayout>
 * )
 * ```
 */
export function StickyFormLayout({
  currentStep,
  title,
  backButtonText,
  onBack,
  children,
  error
}: StickyFormLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Sticky Header - Always visible at top */}
      <div className="sticky top-0 z-50 bg-gray-50 border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <StepProgressHeader
            title={title}
            backButtonText={backButtonText}
            onBack={onBack}
            steps={buildingSteps}
            currentStep={currentStep}
          />
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <svg
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-red-800 font-medium">Erreur</p>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {children}
        </div>
      </div>
    </div>
  )
}
