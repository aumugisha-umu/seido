"use client"

/**
 * AddressInput - Atomic component for address input with validation
 *
 * Provides a comprehensive address input with postal code, city, and country
 * selection. Includes built-in validation and error states.
 */


import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AddressInputProps } from "../../types"

const COUNTRIES = [
  "Belgique",
  "France",
  "Luxembourg",
  "Pays-Bas",
  "Allemagne",
  "Espagne",
  "Italie",
  "Portugal",
  "Royaume-Uni",
  "Suisse",
  "Autriche",
  "République tchèque",
  "Pologne",
  "Danemark",
  "Suède",
  "Norvège",
  "Finlande",
  "Autre"
]

export function AddressInput({
  value,
  onChange,
  validation,
  disabled = false,
  required = false,
  showCountrySelector = true,
  className
}: AddressInputProps & { className?: string }) {
  const hasErrors = validation && Object.keys(validation.errors).length > 0
  const hasWarnings = validation && Object.keys(validation.warnings).length > 0

  const handleAddressChange = (field: keyof typeof value, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <Label htmlFor="address" className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          Adresse complète
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="address"
          placeholder="Rue, numéro, etc."
          value={value.address}
          onChange={(e) => handleAddressChange('address', e.target.value)}
          disabled={disabled}
          className={cn(
            "transition-colors",
            hasErrors && "border-red-500 focus:border-red-500 focus:ring-red-500",
            hasWarnings && !hasErrors && "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500"
          )}
        />
        {validation?.errors.address && (
          <div className="flex items-center gap-1 text-red-600 text-xs">
            <AlertTriangle className="w-3 h-3" />
            {validation.errors.address}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
            Code postal
          </Label>
          <Input
            id="postalCode"
            placeholder="1000"
            value={value.postalCode}
            onChange={(e) => handleAddressChange('postalCode', e.target.value)}
            disabled={disabled}
            className={cn(
              "transition-colors",
              hasErrors && "border-red-500 focus:border-red-500 focus:ring-red-500",
              hasWarnings && !hasErrors && "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500"
            )}
          />
          {validation?.errors.postalCode && (
            <div className="flex items-center gap-1 text-red-600 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {validation.errors.postalCode}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
            Ville
          </Label>
          <Input
            id="city"
            placeholder="Bruxelles"
            value={value.city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            disabled={disabled}
            className={cn(
              "transition-colors",
              hasErrors && "border-red-500 focus:border-red-500 focus:ring-red-500",
              hasWarnings && !hasErrors && "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500"
            )}
          />
          {validation?.errors.city && (
            <div className="flex items-center gap-1 text-red-600 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {validation.errors.city}
            </div>
          )}
        </div>

        {showCountrySelector && (
          <div className="space-y-1">
            <Label htmlFor="country" className="text-sm font-medium text-gray-700">
              Pays
            </Label>
            <Select
              value={value.country}
              onValueChange={(selectedCountry) => handleAddressChange('country', selectedCountry)}
              disabled={disabled}
            >
              <SelectTrigger
                id="country"
                className={cn(
                  "transition-colors",
                  hasErrors && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  hasWarnings && !hasErrors && "border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500"
                )}
              >
                <SelectValue placeholder="Sélectionner un pays" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation?.errors.country && (
              <div className="flex items-center gap-1 text-red-600 text-xs">
                <AlertTriangle className="w-3 h-3" />
                {validation.errors.country}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Display general validation messages */}
      {validation?.warnings.general && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <span className="text-yellow-700 text-sm">{validation.warnings.general}</span>
        </div>
      )}

      {validation?.errors.general && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-red-700 text-sm">{validation.errors.general}</span>
        </div>
      )}
    </div>
  )
}

AddressInput.displayName = "AddressInput"