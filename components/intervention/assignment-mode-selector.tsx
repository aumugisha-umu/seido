"use client"

import { Users, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"

export type AssignmentMode = 'single' | 'group' | 'separate'

interface AssignmentModeSelectorProps {
  mode: AssignmentMode
  onModeChange: (mode: AssignmentMode) => void
  providerCount: number
  disabled?: boolean
  className?: string
}

// Only multi-provider modes - "single" is handled implicitly when 1 provider
const modeOptions: {
  value: AssignmentMode
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    value: 'group',
    label: 'Groupe',
    description: 'Tous voient les mêmes infos',
    icon: Users
  },
  {
    value: 'separate',
    label: 'Séparé',
    description: 'Chacun voit ses propres infos',
    icon: UserMinus
  }
]

/**
 * AssignmentModeSelector - Select assignment mode for multi-provider interventions
 *
 * Modes:
 * - group: N providers, shared info (default for multi-provider)
 * - separate: N providers, isolated info (time slots, instructions, quotes)
 *
 * Note: "single" mode is not shown here - it's used automatically when only 1 provider
 */
export function AssignmentModeSelector({
  mode,
  onModeChange,
  providerCount,
  disabled = false,
  className
}: AssignmentModeSelectorProps) {
  // Determine effective mode for display (single maps to group visually)
  const effectiveMode = mode === 'single' ? 'group' : mode

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h3 className="text-sm font-medium text-slate-900">
          Mode d'assignation
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Définissez comment les {providerCount} prestataires verront les informations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {modeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = effectiveMode === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onModeChange(option.value)}
              disabled={disabled}
              className={cn(
                "relative flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                isSelected
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300",
                disabled && "opacity-50 cursor-not-allowed bg-slate-50"
              )}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
              )}

              <Icon className={cn(
                "h-6 w-6 mb-2",
                isSelected ? "text-blue-600" : "text-slate-400"
              )} />

              <span className={cn(
                "text-sm font-medium",
                isSelected ? "text-blue-900" : "text-slate-700"
              )}>
                {option.label}
              </span>

              <span className={cn(
                "text-xs mt-0.5 text-center",
                isSelected ? "text-blue-600" : "text-slate-500"
              )}>
                {option.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Info message for separate mode */}
      {mode === 'separate' && providerCount > 1 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <UserMinus className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-amber-800">
            <p className="font-medium">Mode Séparé actif</p>
            <p className="text-xs mt-0.5">
              Chaque prestataire aura ses propres créneaux et instructions.
              À la clôture, des interventions individuelles seront créées.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
