"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { LucideIcon } from "lucide-react"

export interface StepConfig {
  icon: LucideIcon
  label: string
}

interface StepProgressHeaderProps {
  title: string
  subtitle?: string
  backButtonText?: string
  onBack: () => void
  steps: StepConfig[]
  currentStep: number
}

/**
 * 🎯 Version 3: "Breadcrumb Minimal" (~40-60px hauteur)
 *
 * UX Concept:
 * - Style fil d'Ariane (breadcrumb) ultra-compact
 * - "Context over chrome": Prioriser le contenu du formulaire
 * - Indicateur de progression inline (2/4)
 * - Un seul niveau de texte, pas de layout empilé
 *
 * Bonnes pratiques appliquées:
 * - Minimal UI: Information essentielle seulement
 * - Breadcrumb navigation pattern (Jakob Nielsen)
 * - Inline progress indicator (pas de barre séparée)
 * - Mobile-optimized: Labels ultra-courts
 * - Gestalt: Proximity + similarity pour grouper info
 */
export const StepProgressHeaderV3 = ({
  title,
  subtitle,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
}: StepProgressHeaderProps) => {
  const currentStepData = steps[currentStep - 1]
  const CurrentIcon = currentStepData.icon
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-3">

          {/* Left: Back Button + Breadcrumb */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">

            {/* Back Button - Icon only on mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0 hover:bg-gray-100 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">{backButtonText}</span>
            </Button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-sm">
              {/* Title */}
              <span className="font-semibold text-gray-900 truncate hidden sm:inline">
                {title}
              </span>
              <span className="font-semibold text-gray-900 truncate sm:hidden">
                {title.split(' ')[0]}
              </span>

              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />

              {/* Current Step with Icon */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100">
                  <CurrentIcon className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="font-medium text-gray-700 truncate hidden sm:inline">
                  {currentStepData.label}
                </span>
              </div>

              {/* Progress Counter */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-gray-400 hidden sm:inline">·</span>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {currentStep}/{steps.length}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Mini Step Indicators (Desktop only) */}
          <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isComplete = currentStep > stepNumber
              const isCurrent = currentStep === stepNumber
              const StepIcon = step.icon

              return (
                <div
                  key={index}
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200
                    ${isCurrent
                      ? "bg-blue-600 text-white shadow-md scale-110"
                      : isComplete
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }
                  `}
                  title={step.label}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Ultra-thin Progress Bar */}
        <div className="mt-2 -mx-4 sm:-mx-6">
          <div className="h-0.5 bg-gray-200 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>

        {/* Mobile: Step name below (optional) */}
        {subtitle && (
          <p className="mt-1.5 text-xs text-gray-600 truncate sm:hidden">
            {subtitle}
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  )
}
