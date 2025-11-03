"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { LotCategory, getAllLotCategories, getLotCategoryConfig } from "@/lib/lot-types"

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
  // Lot details
  floor: string
  doorNumber: string
  description: string
}

interface IndependentLotInputCardV2Props {
  lot: IndependentLot
  lotNumber: number
  isExpanded: boolean
  onUpdate: (field: keyof IndependentLot, value: string) => void
  onDuplicate: () => void
  onRemove: () => void
  onToggleExpand: () => void
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
  onDuplicate,
  onRemove,
  onToggleExpand
}: IndependentLotInputCardV2Props) {
  const categories = getAllLotCategories()
  const categoryConfig = getLotCategoryConfig(lot.category)

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
                className="text-xs font-medium text-slate-700 flex items-center gap-1 mb-2"
              >
                <Hash className="w-3 h-3" />
                Référence
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id={`reference-${lot.id}`}
                value={lot.reference || ""}
                onChange={(e) => onUpdate("reference", e.target.value)}
                placeholder="Ex: Appartement 3"
                className="h-9 text-sm"
                required
                aria-required="true"
              />
            </div>

            {/* Category - Right Column */}
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-2 block">
                Catégorie
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <RadioGroup
                value={lot.category}
                onValueChange={(value) => onUpdate("category", value)}
                className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
                aria-label="Sélectionner une catégorie de lot"
              >
                {categories.map((category) => {
                  const Icon = iconComponents[category.icon as keyof typeof iconComponents]
                  const isSelected = lot.category === category.key

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
                              ? `${category.bgColor} ${category.borderColor} ${category.color} shadow-sm font-medium`
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

          {/* ADDRESS SECTION - New for Independent Lots */}
          <div className="space-y-2">
            {/* Street - Full Width */}
            <div>
              <Label
                htmlFor={`street-${lot.id}`}
                className="text-xs font-medium text-slate-700 mb-1 block"
              >
                Rue et numéro
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id={`street-${lot.id}`}
                value={lot.street || ""}
                onChange={(e) => onUpdate("street", e.target.value)}
                placeholder="Ex: 123 Rue de la Paix"
                className="h-9 text-sm"
                required
                aria-required="true"
              />
            </div>

            {/* Grid 3-Column: Postal Code + City + Country */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Postal Code */}
              <div>
                <Label
                  htmlFor={`postalCode-${lot.id}`}
                  className="text-xs font-medium text-slate-700 mb-1 block"
                >
                  Code postal
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id={`postalCode-${lot.id}`}
                  value={lot.postalCode || ""}
                  onChange={(e) => onUpdate("postalCode", e.target.value)}
                  placeholder="Ex: 1000"
                  className="h-9 text-sm"
                  required
                  aria-required="true"
                />
              </div>

              {/* City */}
              <div>
                <Label
                  htmlFor={`city-${lot.id}`}
                  className="text-xs font-medium text-slate-700 mb-1 block"
                >
                  Ville
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id={`city-${lot.id}`}
                  value={lot.city || ""}
                  onChange={(e) => onUpdate("city", e.target.value)}
                  placeholder="Ex: Bruxelles"
                  className="h-9 text-sm"
                  required
                  aria-required="true"
                />
              </div>

              {/* Country */}
              <div>
                <Label
                  htmlFor={`country-${lot.id}`}
                  className="text-xs font-medium text-slate-700 mb-1 block"
                >
                  Pays
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select
                  value={lot.country || "Belgique"}
                  onValueChange={(value) => onUpdate("country", value)}
                >
                  <SelectTrigger id={`country-${lot.id}`} className="h-9 text-sm">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Belgique">Belgique</SelectItem>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="Luxembourg">Luxembourg</SelectItem>
                    <SelectItem value="Pays-Bas">Pays-Bas</SelectItem>
                    <SelectItem value="Allemagne">Allemagne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* LOT DETAILS SECTION */}
          {/* Grid 2-Column: Floor + Door */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Floor */}
            <div>
              <Label
                htmlFor={`floor-${lot.id}`}
                className="text-xs font-medium text-slate-700 flex items-center gap-1 mb-1"
              >
                <Building className="w-3 h-3" />
                Étage
              </Label>
              <Input
                id={`floor-${lot.id}`}
                value={lot.floor || ""}
                onChange={(e) => onUpdate("floor", e.target.value)}
                placeholder="Ex: 2"
                className="h-9 text-sm"
                aria-label="Numéro d'étage"
              />
            </div>

            {/* Door */}
            <div>
              <Label
                htmlFor={`door-${lot.id}`}
                className="text-xs font-medium text-slate-700 flex items-center gap-1 mb-1"
              >
                <Hash className="w-3 h-3" />
                Porte
              </Label>
              <Input
                id={`door-${lot.id}`}
                value={lot.doorNumber || ""}
                onChange={(e) => onUpdate("doorNumber", e.target.value)}
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
              className="text-xs font-medium text-slate-700 mb-1 block"
            >
              Description
            </Label>
            <Textarea
              id={`description-${lot.id}`}
              value={lot.description || ""}
              onChange={(e) => onUpdate("description", e.target.value)}
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
