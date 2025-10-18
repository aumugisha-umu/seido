"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { LucideIcon } from "lucide-react"

export interface StepConfig {
  icon: LucideIcon
  label: string
}

interface StepProgressHeaderProps {
  title: string
  backButtonText?: string
  onBack: () => void
  steps: StepConfig[]
  currentStep: number
}

/**
 * 🎨 V3 - Minimal Progress Header
 *
 * Design Philosophy: Focus sur l'étape actuelle + grande barre stylisée
 * - Grande icône + titre pour l'étape actuelle
 * - Pourcentage géant bien visible
 * - Animation shimmer sur la barre
 * - Marqueurs sur la barre de progression
 * - Design épuré et moderne
 */
export const StepProgressHeader = ({
  title,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
}: StepProgressHeaderProps) => {
  const currentStepData = steps[currentStep - 1]
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-sm shadow-md border border-gray-200 rounded-lg px-6 py-3 mb-2 max-w-7xl mx-4 sm:mx-6 xl:mx-auto space-y-2">
        {/* Single Line Header: Title (left) + Step Info (center) + Back Button (right) */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Page Title */}
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex-shrink-0">
            {title}
          </h1>

          {/* Center: Current Step Info with Icon */}
          <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0">
              <currentStepData.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                Étape {currentStep} sur {steps.length}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {currentStepData.label}
              </h2>
            </div>
          </div>

          {/* Right: Back Button */}
          <Button
            variant="ghost"
            onClick={onBack}
            className="px-3 py-1.5 hover:bg-gray-100 flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{backButtonText}</span>
          </Button>
        </div>

        {/* Main Progress Section */}
        <div className="space-y-2 mt-5">

        {/* Progress Bar - Compact */}
        <div className="px-12">
          <div className="relative">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full transition-all duration-700 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>

            {/* Step Markers on Progress Bar */}
            <div className="absolute top-0 left-0 right-0 flex justify-between" style={{ transform: 'translateY(-50%)' }}>
            {steps.map((_, index) => {
              const stepNumber = index + 1
              const stepPosition = (index / (steps.length - 1)) * 100
              const isComplete = currentStep > stepNumber
              const isCurrent = currentStep === stepNumber

              return (
                <div
                  key={index}
                  className="absolute"
                  style={{ left: `${stepPosition}%`, transform: 'translateX(-50%)' }}
                >
                  <div className={`w-5 h-5 rounded-full border-3 transition-all duration-300 ${
                    isCurrent
                      ? "bg-blue-600 border-white shadow-lg scale-110"
                      : isComplete
                        ? "bg-blue-600 border-white"
                        : "bg-white border-gray-300"
                  }`} />
                </div>
              )
            })}
            </div>
          </div>
        </div>

        {/* All Steps - Minimal List - Aligned with markers */}
        <div className="px-12">
          <div className="relative pt-1.5">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const stepPosition = (index / (steps.length - 1)) * 100
            const isComplete = currentStep > stepNumber
            const isCurrent = currentStep === stepNumber

            return (
              <div
                key={index}
                className="absolute"
                style={{ left: `${stepPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div
                  className={`flex flex-col items-center transition-all duration-300 ${
                    isCurrent ? "scale-105" : isComplete ? "scale-100" : "scale-95 opacity-60"
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center mb-1 transition-colors ${
                    isCurrent
                      ? "bg-blue-100 text-blue-600"
                      : isComplete
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400"
                  }`}>
                    <step.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <p className={`text-[10px] sm:text-xs font-medium text-center max-w-[70px] truncate ${
                    isCurrent ? "text-gray-900" : isComplete ? "text-gray-700" : "text-gray-400"
                  }`}>
                    {step.label}
                  </p>
                </div>
              </div>
            )
          })}
          {/* Spacer to maintain height */}
          <div style={{ height: '65px' }} />
          </div>
        </div>
        </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}
