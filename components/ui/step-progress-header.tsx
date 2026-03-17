"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check } from "lucide-react"
import { LucideIcon } from "lucide-react"
import { HeaderPortal } from "@/components/header-portal"

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
  onStepClick?: (stepNumber: number) => void
  allowFutureSteps?: boolean
  maxReachableStep?: number
}

/**
 * StepProgressHeader — renders into the full-width header via portal.
 * Shows back button, title, step navigation, and progress bar.
 */
export const StepProgressHeader = ({
  title,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
  onStepClick,
  allowFutureSteps = false,
  maxReachableStep,
}: StepProgressHeaderProps) => {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <HeaderPortal>
      <div className="flex items-center gap-3 sm:gap-4 w-full h-full relative">
        {/* Left: Back Button */}
        <Button
          variant="ghost"
          size="default"
          onClick={onBack}
          className="flex-shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/80 transition-colors duration-200 h-9 px-2.5"
          aria-label={backButtonText}
        >
          <ArrowLeft className="h-4.5 w-4.5 sm:mr-1.5" />
          <span className="hidden sm:inline text-sm font-medium">{backButtonText}</span>
        </Button>

        {/* Center: Title + Badge */}
        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-gray-900 truncate">
            {title}
          </h1>
          <Badge variant="secondary" className="flex lg:hidden flex-shrink-0 text-xs">
            {currentStep}/{steps.length}
          </Badge>
        </div>

        {/* Right: Tab Navigation (Steps) */}
        <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isCurrent = currentStep === stepNumber
            const StepIcon = step.icon
            const effectiveMaxStep = maxReachableStep ?? currentStep
            const isComplete = !isCurrent && stepNumber < effectiveMaxStep
            const isPending = stepNumber > effectiveMaxStep
            const isClickable = !!onStepClick && (
              allowFutureSteps ||
              stepNumber <= effectiveMaxStep
            )

            return (
              <div
                key={index}
                data-testid={`step-item-${stepNumber}`}
                onClick={isClickable ? () => onStepClick(stepNumber) : undefined}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={isClickable ? (e) => e.key === 'Enter' && onStepClick(stepNumber) : undefined}
                className={`
                  relative flex items-center gap-1.5
                  ${index === 0 ? "pl-0 pr-2" : "px-2"}
                  transition-all duration-300 flex-shrink-0
                  ${isPending && "opacity-50"}
                  ${isClickable
                    ? "cursor-pointer hover:bg-gray-100 rounded-lg py-1 -my-1"
                    : "cursor-default"
                  }
                `}
              >
                <div
                  className={`
                    flex items-center justify-center rounded-lg transition-all flex-shrink-0
                    ${isCurrent
                      ? "w-6 h-6 bg-blue-600 text-white shadow-md"
                      : isComplete
                        ? "w-5 h-5 bg-green-100 text-green-700"
                        : "w-5 h-5 bg-gray-100 text-gray-400"
                    }
                  `}
                >
                  {isComplete ? (
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  ) : (
                    <StepIcon className="w-3 h-3" />
                  )}
                </div>

                <span
                  className={`
                    hidden xl:inline text-xs font-medium whitespace-nowrap
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

        {/* Progress Bar — at bottom of header */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </HeaderPortal>
  )
}
