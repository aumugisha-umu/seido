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
  Hash
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

interface Lot {
  id: string
  reference: string
  category: LotCategory
  floor: string
  doorNumber: string
  description: string
}

interface LotInputCardV2Props {
  lot: Lot
  lotNumber: number
  isExpanded: boolean
  onUpdate: (field: keyof Lot, value: string) => void
  onDuplicate: () => void
  onRemove: () => void
  onToggleExpand: () => void
}

/**
 * Version 2: Segmented Control (Style iOS/Moderne)
 *
 * Design Principles:
 * - iOS-inspired segmented control pattern (familiar to mobile users)
 * - Horizontal scrollable chips with snap behavior (mobile-friendly)
 * - Material Design elevation: dp2 (base), dp4 (selected), dp8 (hover)
 * - Visual feedback: Instant category selection with chip highlighting
 * - Space efficiency: Single horizontal row for all 7 categories
 *
 * Key Features:
 * ✅ Segmented control with icon chips (horizontal scroll on mobile)
 * ✅ Inline header: Badge + Reference + Actions in one row
 * ✅ Grid 3-column layout for floor/door/surface (compact)
 * ✅ Snap scroll for better mobile UX
 * ✅ Height: ~170px (compact but visual)
 * ✅ Accessible: RadioGroup semantics + keyboard navigation
 *
 * UX Advantages:
 * - Immediate visual feedback (chip selection)
 * - Natural horizontal scan pattern
 * - Familiar mobile interface (iOS segmented control)
 * - No dropdown clicks required (faster selection)
 *
 * Best For:
 * - Mobile users (touch-optimized)
 * - Users switching categories frequently
 * - Visual learners (icon + label together)
 *
 * Material Design References:
 * - Chips: https://m3.material.io/components/chips
 * - Segmented buttons: https://m3.material.io/components/segmented-buttons
 * - Motion: 200ms ease-in-out for smooth transitions
 */
export function LotInputCardV2({
  lot,
  lotNumber,
  isExpanded,
  onUpdate,
  onDuplicate,
  onRemove,
  onToggleExpand
}: LotInputCardV2Props) {
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
            {/* Badge Number */}
            <Badge
              variant="default"
              className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium flex-shrink-0"
            >
              #{lotNumber}
            </Badge>

            {/* Reference + Category stacked */}
            <div className="flex flex-col gap-1 flex-1 min-w-0 overflow-hidden">
              <span
                className="font-medium text-sm truncate text-slate-900 cursor-default block"
                title={lot.reference}
              >
                {lot.reference}
              </span>
              {!isExpanded && (
                <Badge
                  variant="outline"
                  className={`text-xs self-start flex-shrink-0 ${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color}`}
                >
                  {categoryConfig.label}
                </Badge>
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
          {/* Segmented Control - Horizontal Scrollable Chips */}
          {/* Material Design: Chips with snap scroll for mobile UX */}
          <div>
            <Label className="text-xs font-medium text-slate-700 mb-2 block">
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

          {/* Grid 3-Column: Reference + Floor + Door */}
          {/* Material Design: 8dp grid with responsive collapse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Reference */}
            <div>
              <Label
                htmlFor={`reference-${lot.id}`}
                className="text-xs font-medium text-slate-700 flex items-center gap-1 mb-1"
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

            {/* Floor */}
            <div>
              <Label
                htmlFor={`floor-${lot.id}`}
                className="text-xs font-medium text-slate-700 flex items-center gap-1 mb-1"
              >
                <Building className="w-3 h-3" />
                Étage <span className="text-xs text-gray-500">(optionnel)</span>
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
                Porte <span className="text-xs text-gray-500">(optionnel)</span>
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
              Description <span className="text-xs text-gray-500">(optionnel)</span>
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

export default LotInputCardV2
