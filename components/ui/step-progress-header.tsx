"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { LucideIcon } from "lucide-react"

export interface StepConfig {
  icon: LucideIcon
  label: string
  description: string
}

interface StepProgressHeaderProps {
  title: string
  backButtonText: string
  onBack: () => void
  steps: StepConfig[]
  currentStep: number
}

export const StepProgressHeader = ({
  title,
  backButtonText,
  onBack,
  steps,
  currentStep,
}: StepProgressHeaderProps) => {
  return (
    <div className="mb-8">
      {/* Back Button */}
      <div className="flex items-center space-x-4 mb-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {backButtonText}
        </Button>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>

      {/* Step Progress */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-6">
          {steps.map((step, index) => {
            const stepNumber = index + 1
            const isActive = currentStep >= stepNumber
            const isLast = index === steps.length - 1
            
            return (
              <div key={index} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium">{step.label}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>
                
                {!isLast && (
                  <div className={`h-1 w-12 mx-6 ${currentStep >= stepNumber + 1 ? "bg-blue-500" : "bg-gray-200"}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
