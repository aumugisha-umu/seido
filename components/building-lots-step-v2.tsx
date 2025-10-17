"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Building, Hash, Copy, X, ChevronRight } from "lucide-react"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import { LotCategory, getLotCategoryConfig } from "@/lib/lot-types"

interface Lot {
  id: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
}

interface BuildingLotsStepV2Props {
  lots: Lot[]
  expandedLots: { [key: string]: boolean }
  onAddLot: () => void
  onUpdateLot: (id: string, field: keyof Lot, value: string) => void
  onDuplicateLot: (id: string) => void
  onRemoveLot: (id: string) => void
  onToggleLotExpansion: (lotId: string) => void
  onPrevious: () => void
  onNext: () => void
  canProceed: boolean
}

/**
 * 🎨 V2 VERSION - Building Lots Step with Grid Layout
 *
 * Alternative UX approach:
 * ✅ Ultra-compact cards with inline editing
 * ✅ Grid layout for better space utilization (3 cards per row on desktop)
 * ✅ Quick actions visible without expanding
 * ✅ Category badges instead of full selector when collapsed
 * ✅ Better for desktop users with larger screens
 *
 * Responsive Grid (using Container Queries):
 * - Mobile (< 640px): 1 column
 * - Tablet (640-1023px): 2 columns
 * - Desktop (≥ 1024px): 3 columns
 * - Expanded cards: Full width on all breakpoints
 *
 * ⚠️ Important: Uses @container queries (@sm:, @md:, @lg:) instead of media queries
 * to respond to the container width, not the viewport width. This makes it work
 * correctly in viewport simulators and nested layouts.
 *
 * Differences from Enhanced:
 * - Enhanced: Accordion-style, one lot at a time focus
 * - V2: Grid-style, multiple lots visible, inline editing
 */
export function BuildingLotsStepV2({
  lots,
  expandedLots,
  onAddLot,
  onUpdateLot,
  onDuplicateLot,
  onRemoveLot,
  onToggleLotExpansion,
  onPrevious,
  onNext,
  canProceed
}: BuildingLotsStepV2Props) {
  return (
    <div className="space-y-3 @container">
      {/* Sticky Actions Bar */}
      <Card className="bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200">
        <CardContent className="p-3 flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900">Configuration des lots</p>
              <p className="text-xs text-gray-600">
                {lots.length} lot{lots.length !== 1 ? "s" : ""} configuré{lots.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            onClick={onAddLot}
            size="sm"
            className="bg-green-600 hover:bg-green-700 w-full @sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden @sm:inline">Ajouter un lot</span>
            <span className="@sm:hidden">Ajouter</span>
          </Button>
        </CardContent>
      </Card>

      {/* Lots Grid - Ultra Compact */}
      {lots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              Aucun lot configuré
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Ajoutez votre premier lot pour commencer.
            </p>
            <Button onClick={onAddLot} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter mon premier lot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 gap-3">
          {lots.map((lot, index) => {
            const isExpanded = expandedLots[lot.id] || false
            const categoryConfig = getLotCategoryConfig(lot.category)

            return (
              <Card
                key={lot.id}
                className={`transition-all ${
                  isExpanded ? "@md:col-span-2 @lg:col-span-3 border-blue-300" : "border-gray-200"
                }`}
              >
                {/* Compact Header - Always Visible */}
                <CardHeader className="p-2 @sm:p-3 pb-2">
                  <div className="flex items-start @sm:items-center justify-between gap-2">
                    <div className="flex items-start @sm:items-center gap-2 flex-1 min-w-0">
                      {/* Lot Number Badge */}
                      <div className="px-2 @sm:px-2.5 py-0.5 @sm:py-1 bg-blue-600 text-white rounded-full text-xs font-medium flex-shrink-0">
                        {lots.length - index}
                      </div>

                      {/* Quick Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col @sm:flex-row @sm:items-center gap-1 @sm:gap-2">
                          <p className="font-medium text-sm truncate">{lot.reference}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs self-start @sm:self-auto ${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color}`}
                          >
                            {categoryConfig.label}
                          </Badge>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Étage {lot.floor}
                            {lot.doorNumber && ` • Porte ${lot.doorNumber}`}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 @sm:gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDuplicateLot(lot.id)}
                        className="h-6 w-6 @sm:h-7 @sm:w-7 p-0 text-gray-500 hover:text-gray-700"
                        title="Dupliquer"
                      >
                        <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveLot(lot.id)}
                        className="h-6 w-6 @sm:h-7 @sm:w-7 p-0 text-red-500 hover:text-red-700"
                        title="Supprimer"
                      >
                        <X className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleLotExpansion(lot.id)}
                        className="h-6 w-6 @sm:h-7 @sm:w-7 p-0 text-blue-600 hover:text-blue-700"
                        title={isExpanded ? "Réduire" : "Développer"}
                      >
                        <ChevronRight
                          className={`w-3.5 h-3.5 @sm:w-4 @sm:h-4 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {isExpanded && (
                  <CardContent className="p-2 @sm:p-3 pt-0 space-y-2 @sm:space-y-3">
                    {/* Category Selector */}
                    <div>
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">
                        Catégorie *
                      </Label>
                      <LotCategorySelector
                        value={lot.category}
                        onChange={(category) => onUpdateLot(lot.id, "category", category)}
                        displayMode="grid"
                        required
                      />
                    </div>

                    {/* Form Fields - Compact Grid */}
                    <div className="grid grid-cols-1 @sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs font-medium text-gray-700">
                          <Hash className="w-3 h-3 inline mr-1" />
                          Référence *
                        </Label>
                        <Input
                          value={lot.reference}
                          onChange={(e) => onUpdateLot(lot.id, "reference", e.target.value)}
                          className="mt-1 h-9 @sm:h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700">
                          <Building className="w-3 h-3 inline mr-1" />
                          Étage
                        </Label>
                        <Input
                          value={lot.floor}
                          onChange={(e) => onUpdateLot(lot.id, "floor", e.target.value)}
                          className="mt-1 h-9 @sm:h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-gray-700">
                          <Hash className="w-3 h-3 inline mr-1" />
                          Numéro de porte
                        </Label>
                        <Input
                          placeholder="A, 12, A-bis..."
                          value={lot.doorNumber}
                          onChange={(e) => onUpdateLot(lot.id, "doorNumber", e.target.value)}
                          className="mt-1 h-9 @sm:h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-xs font-medium text-gray-700">Description</Label>
                      <Textarea
                        placeholder="Informations supplémentaires..."
                        value={lot.description}
                        onChange={(e) => onUpdateLot(lot.id, "description", e.target.value)}
                        className="mt-1 text-sm min-h-[60px] @sm:min-h-[48px]"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Navigation - Sticky at bottom */}
      <Card className="border-gray-300 bg-white sticky bottom-0 z-10 shadow-lg">
        <CardContent className="p-3 flex flex-col @sm:flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={onPrevious}
            size="sm"
            className="w-full @sm:w-auto"
          >
            Retour à l'immeuble
          </Button>
          <Button
            onClick={onNext}
            disabled={!canProceed}
            size="sm"
            className="bg-sky-600 hover:bg-sky-700 w-full @sm:w-auto"
          >
            Continuer vers les contacts
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
