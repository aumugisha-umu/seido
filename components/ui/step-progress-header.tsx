"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check } from "lucide-react"
import { LucideIcon } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  hasGlobalNav?: boolean // true = top-16 (with DashboardHeader), false = top-0 (no navbar)
  /** Callback when a step is clicked - enables step navigation */
  onStepClick?: (stepNumber: number) => void
  /** If true, all steps are clickable. If false, only completed steps are clickable. Default: false */
  allowFutureSteps?: boolean
  /** Maximum step the user can navigate to (for create wizard "memory" of reached steps) */
  maxReachableStep?: number
}

/**
 * 🎯 StepProgressHeader - Material Design 3 Compliant
 *
 * UX Concept:
 * - Navigation style onglets (Material Design 3 Tab principles)
 * - Bouton retour en position "leading" (gauche) conforme MD3
 * - Focus sur l'étape active avec indicateur bottom-border
 * - Étapes complétées condensées, étapes futures en gris
 * - Affichage contextuel: seul l'actif est visuellement dominant
 *
 * Bonnes pratiques appliquées:
 * - Leading navigation (back button à gauche) - Material Design 3
 * - Progressive disclosure: Étapes futures minimisées
 * - Active state prominence: Bottom border + couleur
 * - F-pattern reading: Navigation à gauche, contenu au centre
 * - Density: Information maximale dans hauteur minimale
 */
export const StepProgressHeader = ({
  title,
  subtitle,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
  hasGlobalNav = false,
  onStepClick,
  allowFutureSteps = false,
  maxReachableStep,
}: StepProgressHeaderProps) => {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100
  const pathname = usePathname()

  // Extract role from pathname (e.g., /gestionnaire/... → gestionnaire)
  const role = pathname?.split('/')[1] || 'gestionnaire'

  // Adjust top position based on global nav presence
  const topClass = hasGlobalNav ? 'top-16' : 'top-0'

  return (
    <div className={`sticky ${topClass} z-50 bg-white border-b border-gray-200 shadow-sm`}>
      <div className="content-max-width px-4 sm:px-6 h-16 grid grid-cols-3 items-center gap-4 relative overflow-hidden">

          {/* Left Column: Picto + Back Button */}
          <div className="flex items-center gap-3 sm:gap-4 justify-start">
            {/* SEIDO Picto (clickable to dashboard) */}
            <Link
              href={`/${role}/dashboard`}
              className="flex-shrink-0 hover:opacity-80 transition-opacity p-1.5 -m-1.5 rounded-lg hover:bg-gray-100"
              aria-label="Retour au dashboard"
              title="Retour au dashboard"
            >
              <Image
                src="/images/Logo/Picto_Seido_Color.png"
                alt="SEIDO"
                width={32}
                height={32}
                className="h-8 w-8"
                priority
              />
            </Link>

            {/* Back Button - Material Design 3 Leading Navigation */}
            <Button
              variant="ghost"
              size="default"
              onClick={onBack}
              className="flex-shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/80 transition-colors duration-200 h-10 px-3 -ml-1"
              aria-label={backButtonText}
            >
              <ArrowLeft className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline text-sm font-medium">{backButtonText}</span>
            </Button>
          </div>

          {/* Center Column: Title + Badge (centered in its grid cell) */}
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
              {title}
            </h1>
            <Badge variant="secondary" className="flex lg:hidden flex-shrink-0 text-xs">
              {currentStep}/{steps.length}
            </Badge>
          </div>

          {/* Right Column: Tab Navigation (Steps aligned right) */}
          <div className="hidden lg:flex items-center gap-1 justify-end min-w-0">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isCurrent = currentStep === stepNumber
              const StepIcon = step.icon

              // Visual state: use maxReachableStep if provided, otherwise fall back to currentStep
              // This ensures steps remain "completed" visually even when navigating back
              const effectiveMaxStep = maxReachableStep ?? currentStep
              const isComplete = !isCurrent && stepNumber < effectiveMaxStep
              const isPending = stepNumber > effectiveMaxStep

              // Step is clickable if onStepClick is provided AND:
              // - allowFutureSteps (edit mode: all clickable)
              // - OR stepNumber <= maxReachableStep (create mode: up to max reached)
              // - OR step is before current (always allow going back)
              const isClickable = !!onStepClick && (
                allowFutureSteps ||
                stepNumber <= effectiveMaxStep
              )

              return (
                <div
                  key={index}
                  onClick={isClickable ? () => onStepClick(stepNumber) : undefined}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  onKeyDown={isClickable ? (e) => e.key === 'Enter' && onStepClick(stepNumber) : undefined}
                  className={`
                    relative flex items-center gap-1.5 sm:gap-2
                    ${index === 0 ? "pl-0 pr-2 sm:pr-3" : "px-2 sm:px-3"}
                    transition-all duration-300 flex-shrink-0
                    ${isPending && "opacity-50"}
                    ${isClickable
                      ? "cursor-pointer hover:bg-gray-100 rounded-lg py-1 -my-1"
                      : "cursor-default"
                    }
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
                      hidden xl:inline text-sm font-medium whitespace-nowrap
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
