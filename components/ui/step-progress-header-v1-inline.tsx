"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ArrowLeft, Check } from "lucide-react"
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
 * 🎯 Version 1: "Inline Compact" (~60-80px hauteur)
 *
 * UX Concept:
 * - Tout sur une seule ligne pour maximiser l'espace vertical
 * - Stepper horizontal minimal avec points connectés
 * - Labels cachés par défaut, révélés au hover (tooltip)
 * - Progression visuelle claire: complété ✓ | actif ● | à venir ○
 *
 * Bonnes pratiques appliquées:
 * - Progressive disclosure: Labels en tooltip (Hick's Law)
 * - Visual hierarchy: Couleur + taille pour état actif
 * - Affordance: Hover states indiquent l'interactivité
 * - Mobile-first: Labels masqués, icônes seulement
 */
export const StepProgressHeaderV1 = ({
  title,
  subtitle,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
}: StepProgressHeaderProps) => {
  return (
    <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-3 sm:gap-6">

          {/* Left: Title + Subtitle */}
          <div className="flex-shrink-0 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-600 truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>

          {/* Center: Inline Stepper */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {steps.map((step, index) => {
                const stepNumber = index + 1
                const isComplete = currentStep > stepNumber
                const isCurrent = currentStep === stepNumber
                const isPending = currentStep < stepNumber
                const StepIcon = step.icon

                return (
                  <div key={index} className="flex items-center">
                    {/* Step Dot/Icon */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`
                            relative flex items-center justify-center rounded-full transition-all duration-300
                            ${isCurrent
                              ? "w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 text-white shadow-lg scale-110"
                              : isComplete
                                ? "w-6 h-6 sm:w-7 sm:h-7 bg-green-600 text-white"
                                : "w-6 h-6 sm:w-7 sm:h-7 bg-gray-200 text-gray-400"
                            }
                            ${!isCurrent && "hover:scale-105"}
                          `}
                        >
                          {isComplete ? (
                            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={3} />
                          ) : (
                            <StepIcon className={`${isCurrent ? "w-4 h-4 sm:w-4.5 sm:h-4.5" : "w-3 h-3 sm:w-3.5 sm:h-3.5"}`} />
                          )}

                          {/* Active indicator ring */}
                          {isCurrent && (
                            <span className="absolute -inset-1 rounded-full border-2 border-blue-300 animate-pulse" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-medium">{step.label}</p>
                        <p className="text-gray-500">
                          Étape {stepNumber}/{steps.length}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div className="relative w-6 sm:w-8 h-0.5 mx-0.5 sm:mx-1">
                        <div className="absolute inset-0 bg-gray-200 rounded-full" />
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-full transition-all duration-500 ${
                            currentStep > stepNumber ? "w-full" : "w-0"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </TooltipProvider>

          {/* Right: Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex-shrink-0 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{backButtonText}</span>
          </Button>
        </div>

        {/* Optional: Compact progress indicator (mobile only) */}
        <div className="mt-2 sm:hidden">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span className="font-medium">{steps[currentStep - 1].label}</span>
            <span className="text-blue-600 font-semibold">
              {currentStep}/{steps.length}
            </span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
