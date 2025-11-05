"use client"

/**
 * PropertyNameInput - Atomic component for property name input with smart suggestions
 *
 * Provides intelligent name suggestions based on entity type and existing count.
 * Includes validation and automatic placeholder generation.
 */


import React, { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Building, Home, AlertTriangle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PropertyNameInputProps } from "../../types"

export function PropertyNameInput({
  value,
  onChange,
  placeholder,
  validation,
  disabled = false,
  required = false,
  buildingsCount = 0,
  entityType = 'building',
  className
}: PropertyNameInputProps & { className?: string }) {
  const hasErrors = validation && Object.keys(validation.errors).length > 0
  const hasWarnings = validation && Object.keys(validation.warnings).length > 0

  const Icon = entityType === 'building' ? Building : Home
  const entityLabel = entityType === 'building' ? 'immeuble' : 'lot'

  // Generate smart suggestions based on context
  const suggestions = useMemo(() => {
    const baseSuggestions = []

    if (entityType === 'building') {
      const nextNumber = buildingsCount + 1
      baseSuggestions.push(
        `Immeuble ${nextNumber}`,
        `Résidence ${nextNumber}`,
        `Bâtiment ${String.fromCharCode(64 + nextNumber)}` // A, B, C, etc.
      )
    } else {
      baseSuggestions.push(
        `Lot individuel`,
        `Propriété indépendante`,
        `Bien ${Date.now().toString().slice(-3)}` // Last 3 digits of timestamp
      )
    }

    // Remove the current value from suggestions to avoid duplication
    return baseSuggestions.filter(suggestion => suggestion !== value)
  }, [entityType, buildingsCount, value])

  // Generate smart placeholder
  const smartPlaceholder = useMemo(() => {
    if (placeholder) return placeholder

    if (entityType === 'building') {
      return `Immeuble ${buildingsCount + 1}`
    } else {
      return "Nom du lot"
    }
  }, [placeholder, entityType, buildingsCount])

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <Label htmlFor="propertyName" className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Icon className="w-4 h-4" />
          Nom {entityType === 'building' ? "de l'immeuble" : "du lot"}
          {required ? (
            <span className="text-red-500">*</span>
          ) : (
            <span className="text-sm text-gray-500 ml-1">(optionnel)</span>
          )}
        </Label>
        <Input
          id="propertyName"
          placeholder={smartPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "transition-colors",
            hasErrors && "border-red-500 focus:border-red-500 focus:ring-red-500",
            hasWarnings && !hasErrors && "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500"
          )}
        />

        {/* Error display */}
        {validation?.errors.name && (
          <div className="flex items-center gap-1 text-red-600 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {validation.errors.name}
          </div>
        )}

        {/* Warning display */}
        {validation?.warnings.name && (
          <div className="flex items-center gap-1 text-yellow-600 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {validation.warnings.name}
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-gray-500">
          {entityType === 'building'
            ? "Ce nom sera utilisé pour identifier l'immeuble dans vos biens"
            : "Ce nom sera utilisé pour identifier le lot"
          }
        </p>
      </div>

      {/* Smart suggestions */}
      {suggestions.length > 0 && !disabled && !value && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Lightbulb className="w-3 h-3" />
            Suggestions :
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="h-7 text-xs px-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Context-based hints */}
      {entityType === 'building' && buildingsCount === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Building className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-700 text-xs">
            <p className="font-medium mb-1">Premier immeuble</p>
            <p>Ce sera votre premier immeuble. Choisissez un nom qui vous permettra de l'identifier facilement parmi vos futurs biens.</p>
          </div>
        </div>
      )}

      {entityType === 'lot' && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Home className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-green-700 text-xs">
            <p className="font-medium mb-1">Lot indépendant</p>
            <p>Ce lot ne sera pas associé à un immeuble. Utilisez un nom descriptif pour le retrouver facilement.</p>
          </div>
        </div>
      )}
    </div>
  )
}

PropertyNameInput.displayName = "PropertyNameInput"