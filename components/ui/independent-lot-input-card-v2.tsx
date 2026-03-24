"use client"

import React, { useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Building,
  Users,
  Home,
  Car,
  Store,
  MoreHorizontal,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  Hash,
  MapPin
} from "lucide-react"
import { LotCategory, getAllLotCategories, getLotCategoryConfig, LOT_CATEGORY_SELECTED_STYLES } from "@/lib/lot-types"
import { AddressFieldsWithMap, type GeocodeResult, type AddressFields } from "@/components/google-maps"

/**
 * Component Icon Map
 */
const iconComponents = {
  Building,
  Users,
  Home,
  Car,
  Store,
  MoreHorizontal
}

export interface IndependentLot {
  id: string
  reference: string
  category: LotCategory
  // Address fields (required for independent lots)
  street: string
  postalCode: string
  city: string
  country: string
  // Geocode data (from Google Maps)
  latitude?: number
  longitude?: number
  placeId?: string
  formattedAddress?: string
  // Lot details
  floor: string
  doorNumber: string
  description: string
}

export interface GeocodeResultData {
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
  fields?: { street: string; postalCode: string; city: string; country: string }
}

interface IndependentLotInputCardV2Props {
  lot: IndependentLot
  lotNumber: number
  isExpanded: boolean
  onUpdate: (field: keyof IndependentLot, value: string) => void
  onGeocodeResult?: (result: GeocodeResultData | null) => void
  onDuplicate: () => void
  onRemove: () => void
  onToggleExpand: () => void
  // Optional: hide action buttons (for edit mode where only one lot is edited)
  hideActions?: boolean
  // Optional: show Google Maps integration (default: true)
  showGoogleMaps?: boolean
}

/**
 * Independent Lot Input Card V2 - Version with Address Fields
 *
 * Based on LotInputCardV2 but adapted for independent lots that need their own address.
 *
 * Key Additions:
 * ✅ Address section with MapPin icon and blue background
 * ✅ Street, Postal Code, City, Country fields
 * ✅ Clear visual distinction for address section
 * ✅ All existing lot features preserved (category, floor, door, description)
 *
 * Design Principles:
 * - Address section: bg-blue-50/30 to distinguish from lot details
 * - Grid responsive layout: 3 cols (postal/city/country) → 1 col mobile
 * - Same segmented control for category selection
 * - Maintains 44x44px touch targets for mobile
 */
export function IndependentLotInputCardV2({
  lot,
  lotNumber,
  isExpanded,
  onUpdate,
  onGeocodeResult,
  onDuplicate,
  onRemove,
  onToggleExpand,
  hideActions = false,
  showGoogleMaps = true
}: IndependentLotInputCardV2Props) {
  // Inline blur validation state
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  const isRequiredField = (name: string): boolean => {
    return name === 'reference'
  }

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const fieldName = e.currentTarget.name || e.currentTarget.id
    const value = e.currentTarget.value
    setFieldErrors(prev => {
      const next = { ...prev }
      if (!value?.trim() && isRequiredField(fieldName)) {
        next[fieldName] = 'Ce champ est obligatoire'
      } else {
        delete next[fieldName]
      }
      return next
    })
  }

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const categories = getAllLotCategories()
  const categoryConfig = getLotCategoryConfig(lot.category)

  // Handle address field changes from AddressFieldsWithMap (manual field edits)
  const handleAddressFieldsChange = useCallback((fields: AddressFields) => {
    // STALE CLOSURE FIX: Always update all fields without comparison
    // Comparisons against captured lot.* values can fail due to stale closures
    onUpdate('street', fields.street)
    onUpdate('postalCode', fields.postalCode)
    onUpdate('city', fields.city)
    onUpdate('country', fields.country)
  }, [lot.id, onUpdate])

  // Handle geocode result from AddressFieldsWithMap (autocomplete selection)
  // FIX: Pass address fields UP to parent via onGeocodeResult for atomic state update
  // Previously, calling onUpdate 4 times + onGeocodeResult separately caused a race condition
  // where the geocode callback's setIndependentLots spread a stale lot without address fields
  const handleGeocodeResult = useCallback((result: GeocodeResult | null) => {
    if (result) {
      if (!result.fields) {
        console.warn('⚠️ [LOT-CARD] result.fields is missing!', { result })
      }
      if (onGeocodeResult) {
        // Pass EVERYTHING to parent: geocode data + address fields in ONE call
        onGeocodeResult({
          latitude: result.latitude,
          longitude: result.longitude,
          placeId: result.placeId,
          formattedAddress: result.formattedAddress,
          fields: result.fields
        })
      } else if (result.fields) {
        // Fallback for edit mode (no onGeocodeResult): update fields individually
        onUpdate('street', result.fields.street)
        onUpdate('postalCode', result.fields.postalCode)
        onUpdate('city', result.fields.city)
        onUpdate('country', result.fields.country)
      }
    } else {
      console.warn('⚠️ [LOT-CARD] result is null')
    }
  }, [lot.id, onUpdate, onGeocodeResult])

  return (
    <Card
      className={`transition-all duration-200 ${
        isExpanded
          ? "border-blue-300 shadow-md"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Header - Compact or Expanded */}
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-3 overflow-hidden min-w-0">
          {/* Left: Badge Number + Reference + Category */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Badge Number with "Lot indépendant" indicator */}
            <Badge
              variant="default"
              className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium flex-shrink-0"
            >
              #{lotNumber}
            </Badge>

            {/* Reference + Category + Address Preview stacked */}
            <div className="flex flex-col gap-1 flex-1 min-w-0 overflow-hidden">
              <span
                className="font-medium text-sm truncate text-slate-900 cursor-default block"
                title={lot.reference}
              >
                {lot.reference}
              </span>
              {!isExpanded && (
                <>
                  <Badge
                    variant="outline"
                    className={`text-xs self-start flex-shrink-0 ${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color}`}
                  >
                    {categoryConfig.label}
                  </Badge>
                  {/* Address preview when collapsed */}
                  {lot.street && (
                    <span className="text-xs text-gray-600 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {lot.street}, {lot.postalCode} {lot.city}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: Actions - 44x44px touch targets */}
          {!hideActions && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDuplicate}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                title="Dupliquer ce lot"
                aria-label="Dupliquer ce lot"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Supprimer ce lot"
                aria-label="Supprimer ce lot"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title={isExpanded ? "Réduire" : "Développer"}
                aria-label={isExpanded ? "Réduire les détails" : "Développer les détails"}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && (
        <CardContent className="p-3 pt-0 space-y-3">
          {/* Grid 2-Column: Reference (left) + Category (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3">
            {/* Reference - Left Column */}
            <div>
              <Label
                htmlFor={`reference-${lot.id}`}
                className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-2"
              >
                <Hash className="w-3 h-3" />
                Référence
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`reference-${lot.id}`}
                name="reference"
                value={lot.reference || ""}
                onChange={(e) => {
                  clearFieldError('reference')
                  onUpdate("reference", e.target.value)
                }}
                onBlur={handleFieldBlur}
                placeholder="Ex: Appartement 3"
                className={`h-9 text-sm ${fieldErrors.reference ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.reference}
                aria-describedby={fieldErrors.reference ? `reference-${lot.id}-error` : undefined}
              />
              {fieldErrors.reference && (
                <p id={`reference-${lot.id}-error`} className="text-sm text-destructive mt-1">{fieldErrors.reference}</p>
              )}
            </div>

            {/* Category - Right Column */}
            <div>
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                Catégorie
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <RadioGroup
                value={lot.category}
                onValueChange={(value) => onUpdate("category", value)}
                className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
                aria-label="Sélectionner une catégorie de lot"
              >
                {categories.map((category) => {
                  const Icon = iconComponents[category.icon as keyof typeof iconComponents]
                  const isSelected = lot.category === category.key
                  const selectedStyles = LOT_CATEGORY_SELECTED_STYLES[category.key as LotCategory]

                  return (
                    <label
                      key={category.key}
                      className="flex-shrink-0 snap-start cursor-pointer"
                    >
                      <RadioGroupItem
                        value={category.key}
                        className="sr-only"
                        id={`category-${category.key}-${lot.id}`}
                      />
                      <div
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-full border-2 transition-all duration-200
                          ${
                            isSelected
                              ? `${selectedStyles.bg} ${selectedStyles.border} ${selectedStyles.text} shadow-sm font-medium`
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }
                        `}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={category.label}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onUpdate("category", category.key)
                          }
                        }}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs whitespace-nowrap">
                          {category.label}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </RadioGroup>
            </div>
          </div>

          {/* ADDRESS SECTION - With Google Maps Integration */}
          <div className="space-y-2">
            <AddressFieldsWithMap
              street={lot.street || ""}
              postalCode={lot.postalCode || ""}
              city={lot.city || ""}
              country={lot.country || "Belgique"}
              latitude={lot.latitude}
              longitude={lot.longitude}
              onFieldsChange={handleAddressFieldsChange}
              onGeocodeResult={handleGeocodeResult}
              showAutocomplete={showGoogleMaps}
              showMap={showGoogleMaps}
              required={true}
            />
          </div>

          {/* LOT DETAILS SECTION */}
          {/* Grid 2-Column: Floor + Door */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Floor */}
            <div>
              <Label
                htmlFor={`floor-${lot.id}`}
                className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1"
              >
                <Building className="w-3 h-3" />
                Étage
              </Label>
              <Input
                id={`floor-${lot.id}`}
                name="floor"
                value={lot.floor || ""}
                onChange={(e) => onUpdate("floor", e.target.value)}
                onBlur={handleFieldBlur}
                placeholder="Ex: 2"
                className="h-9 text-sm"
                aria-label="Numéro d'étage"
              />
            </div>

            {/* Door */}
            <div>
              <Label
                htmlFor={`door-${lot.id}`}
                className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1"
              >
                <Hash className="w-3 h-3" />
                Porte/Boîte
              </Label>
              <Input
                id={`door-${lot.id}`}
                name="doorNumber"
                value={lot.doorNumber || ""}
                onChange={(e) => onUpdate("doorNumber", e.target.value)}
                onBlur={handleFieldBlur}
                placeholder="Ex: A, 12, A-bis"
                className="h-9 text-sm"
                aria-label="Numéro de porte"
              />
            </div>
          </div>

          {/* Description - Full Width */}
          <div>
            <Label
              htmlFor={`description-${lot.id}`}
              className="text-sm font-medium text-slate-700 mb-1 block"
            >
              Description
            </Label>
            <Textarea
              id={`description-${lot.id}`}
              name="description"
              value={lot.description || ""}
              onChange={(e) => onUpdate("description", e.target.value)}
              onBlur={handleFieldBlur}
              placeholder="Informations supplémentaires sur le lot..."
              className="text-sm min-h-[72px] resize-none"
              rows={3}
              aria-label="Description du lot"
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default IndependentLotInputCardV2
