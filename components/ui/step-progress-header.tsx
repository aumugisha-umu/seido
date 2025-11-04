"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
 * 🎯 Version 2: "Tab-Style" (~50-70px hauteur)
 *
 * UX Concept:
 * - Navigation style onglets (Material Design / Ant Design)
 * - Focus sur l'étape active avec indicateur bottom-border
 * - Étapes complétées condensées, étapes futures en gris
 * - Affichage contextuel: seul l'actif est visuellement dominant
 *
 * Bonnes pratiques appliquées:
 * - Progressive disclosure: Étapes futures minimisées
 * - Active state prominence: Bottom border + couleur
 * - Scan pattern: F-pattern horizontal pour lecture rapide
 * - Density: Information maximale dans hauteur minimale
 * - Material Design Tab principles
 */
export const StepProgressHeader = ({
  title,
  subtitle,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
}: StepProgressHeaderProps) => {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6 relative">

          {/* Left: Title + Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
              {title}
            </h1>
            <Badge variant="secondary" className="hidden lg:flex flex-shrink-0 text-xs">
              {currentStep}/{steps.length}
            </Badge>
          </div>

          {/* Center: Tab Navigation */}
          <div className="relative flex-1 min-w-0 flex justify-center">
            <div className="flex items-stretch overflow-x-auto scrollbar-hide gap-1">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isComplete = currentStep > stepNumber
              const isCurrent = currentStep === stepNumber
              const isPending = currentStep < stepNumber
              const StepIcon = step.icon

              return (
                <div
                  key={index}
                  className={`
                    relative flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3
                    transition-all duration-300 cursor-default flex-shrink-0
                    ${isPending && "opacity-50"}
                  `}
                >
                  {/* Icon/Check */}
                  <div
                    className={`
                      flex items-center justify-center rounded-lg transition-all flex-shrink-0
                      ${isCurrent
                        ? "w-6 h-6 sm:w-7 sm:h-7 bg-blue-600 text-white shadow-md"
                        : isComplete
                          ? "w-5 h-5 sm:w-6 sm:h-6 bg-green-100 text-green-700"
                          : "w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 text-gray-400"
                      }
                    `}
                  >
                    {isComplete ? (
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
                    ) : (
                      <StepIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                  </div>

                  {/* Label - Desktop only, single line */}
                  <span
                    className={`
                      hidden md:inline text-xs font-medium whitespace-nowrap
                      ${isCurrent
                        ? "text-blue-600"
                        : isComplete
                          ? "text-gray-700"
                          : "text-gray-500"
                      }
                    `}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
          </div>

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

        {/* Progress Bar - at bottom border level */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-500 ease-out z-10"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
