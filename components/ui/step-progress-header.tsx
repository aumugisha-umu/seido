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

export const StepProgressHeader = ({
  title,
  backButtonText = "Retour",
  onBack,
  steps,
  currentStep,
}: StepProgressHeaderProps) => {
  const currentStepData = steps[currentStep - 1]
  
  return (
    <div className="mb-6 sm:mb-8">
      {/* Header with Title (left) and Back Button (right) on same line */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex-1 pr-4">
          {title}
        </h1>
        <Button variant="ghost" onClick={onBack} className="px-3 py-2 sm:px-4 sm:py-2 flex-shrink-0">
          <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{backButtonText}</span>
        </Button>
      </div>

      {/* Step Progress - Mobile: Vertical compact, Desktop: Horizontal */}
      <div className="w-full">
        {/* Mobile Steps (< sm) */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {currentStepData && (
                <>
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                    <currentStepData.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {currentStepData.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      Étape {currentStep} sur {steps.length}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    currentStep > index + 1 ? "bg-blue-500" : 
                    currentStep === index + 1 ? "bg-blue-300" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Steps (sm+) */}
        <div className="hidden sm:flex items-center justify-center">
          <div className="flex items-center space-x-3 lg:space-x-6">
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isActive = currentStep >= stepNumber
              const isCurrent = currentStep === stepNumber
              const isLast = index === steps.length - 1
              
              return (
                <div key={index} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-colors ${
                        isActive 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-200 text-gray-500"
                      } ${isCurrent ? "ring-2 ring-blue-200" : ""}`}
                    >
                      <step.icon className="h-4 w-4 lg:h-5 lg:w-5" />
                    </div>
                    <div className="mt-2 text-center max-w-[80px] lg:max-w-none">
                      <p className="text-xs lg:text-sm font-medium text-gray-900 truncate">
                        {step.label}
                      </p>
                    </div>
                  </div>
                  
                  {!isLast && (
                    <div className={`h-1 w-8 lg:w-12 mx-2 lg:mx-6 rounded-full transition-colors ${
                      currentStep > stepNumber ? "bg-blue-500" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
