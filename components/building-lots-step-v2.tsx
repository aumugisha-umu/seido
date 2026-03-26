"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building, TrendingUp, ChevronDown, Home, Car, Store, MoreHorizontal, type LucideIcon } from "lucide-react"
import { LotInputCardV2 } from "@/components/ui/lot-input-card-v2"
import { getLotCategoryConfig, type LotCategory } from "@/lib/lot-types"

const LOT_ICON_MAP: Record<string, LucideIcon> = {
  Building, Home, Car, Store, MoreHorizontal,
}
import { BuildingInfoCard } from "@/components/ui/building-info-card"

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
  buildingReference: string
  buildingAddress: string
  buildingPostalCode: string
  buildingCity: string
  buildingCountry: string
  existingLotsCount?: number
  existingLots?: Array<{
    id: string
    reference: string
    floor: string
    door_number: string
    category: LotCategory
    is_occupied?: boolean | null
  }>
  onAddLot: () => void
  onUpdateLot: (id: string, field: keyof Lot, value: string) => void
  onDuplicateLot: (id: string) => void
  onRemoveLot: (id: string) => void
  onToggleLotExpansion: (lotId: string) => void
  disableAddLot?: boolean
}

/**
 * 🎨 V2 VERSION - Building Lots Step with Segmented Control & Grid Layout
 *
 * Utilise LotInputCardV2 avec Segmented Control pour la sélection des catégories :
 * ✅ Chips horizontaux scrollables (style iOS)
 * ✅ Visual feedback immédiat sur sélection
 * ✅ Touch-optimized pour mobile/tablette
 * ✅ -27% espace vertical vs version originale
 * ✅ Layout en grille responsive (1-3 colonnes selon écran)
 *
 * Features:
 * - Segmented control horizontal avec scroll
 * - Snap scroll behavior sur mobile
 * - Vue compacte : Badge numéro + Nom + Catégorie en dessous
 * - Chevron haut/bas pour expand/collapse
 * - Grille responsive : 1 col (mobile), 2 cols (tablet), 3 cols (desktop)
 * - Cartes expanded prennent toute la largeur
 * - Inline editing des champs (référence, étage, porte, description)
 * - Actions : Dupliquer, Supprimer, Expand/Collapse
 *
 * Responsive Grid:
 * - Mobile (< 640px): 1 colonne
 * - Tablet (640-1024px): 2 colonnes
 * - Desktop (≥ 1024px): 3 colonnes (maximum)
 * - Expanded: Full width sur toutes tailles
 * - Gap: 16px (gap-4) entre les cartes
 *
 * Best for:
 * - Mobile users (touch-optimized)
 * - Tablettes (visual feedback immédiat)
 * - Gestionnaires créant 3-10 lots en série
 * - Vue d'ensemble rapide (plusieurs lots visibles simultanément)
 */

export function BuildingLotsStepV2({
  lots,
  expandedLots,
  buildingReference,
  buildingAddress,
  buildingPostalCode,
  buildingCity,
  buildingCountry,
  existingLotsCount,
  existingLots,
  onAddLot,
  onUpdateLot,
  onDuplicateLot,
  onRemoveLot,
  onToggleLotExpansion,
  disableAddLot,
}: BuildingLotsStepV2Props) {
  const [showExistingLots, setShowExistingLots] = React.useState(false)

  return (
    <div className="space-y-3 @container">
      {/* Building Info Card - Inline Compact */}
      <BuildingInfoCard
        name={buildingReference}
        address={buildingAddress}
        postalCode={buildingPostalCode}
        city={buildingCity}
        country={buildingCountry}
        existingLotsCount={existingLotsCount}
        onAddLot={onAddLot}
        disableAddLot={disableAddLot}
      />

      {/* Existing Lots - Collapsible with category preview */}
      {existingLots && existingLots.length > 0 && (() => {
        const categoryCounts = existingLots.reduce<Record<string, number>>((acc, lot) => {
          acc[lot.category] = (acc[lot.category] || 0) + 1
          return acc
        }, {})
        const occupiedCount = existingLots.filter(l => l.is_occupied === true).length

        return (
          <div className="rounded-xl border border-gray-200/80 bg-gradient-to-b from-gray-50/80 to-white overflow-hidden">
            <button
              onClick={() => setShowExistingLots(!showExistingLots)}
              className="flex items-center w-full text-left px-4 py-3 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">
                    {existingLots.length} lot{existingLots.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Category summary chips — collapsed preview */}
                {!showExistingLots && (
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-gray-300">|</span>
                    {Object.entries(categoryCounts).map(([cat, count]) => {
                      const config = getLotCategoryConfig(cat as LotCategory)
                      const IconComponent = LOT_ICON_MAP[config.icon] || Building
                      return (
                        <span
                          key={cat}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.bgColor} ${config.color}`}
                        >
                          <IconComponent className="h-3 w-3" />
                          {count > 1 && <span>×{count}</span>}
                        </span>
                      )
                    })}
                    {occupiedCount > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          {occupiedCount}/{existingLots.length}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${showExistingLots ? "rotate-180" : ""}`} />
            </button>

            {showExistingLots && (
              <div className="px-4 pb-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {existingLots.map((lot) => {
                    const config = getLotCategoryConfig(lot.category)
                    const IconComponent = LOT_ICON_MAP[config.icon] || Building
                    const isOccupied = lot.is_occupied === true
                    const subtitle = [
                      lot.floor ? `Ét. ${lot.floor}` : null,
                      lot.door_number ? `P. ${lot.door_number}` : null,
                    ].filter(Boolean).join(" · ")

                    return (
                      <div
                        key={lot.id}
                        title={[lot.reference || "Sans référence", config.label, subtitle, isOccupied ? "Occupé" : "Vacant"].filter(Boolean).join(" · ")}
                        className="group relative flex items-start gap-2 rounded-lg border border-gray-100 bg-white pl-4 pr-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)] transition-shadow overflow-hidden"
                      >
                        {/* Left accent bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
                          style={{
                            backgroundColor: lot.category === 'appartement' ? '#3b82f6'
                              : lot.category === 'maison' ? '#16a34a'
                              : lot.category === 'garage' ? '#6b7280'
                              : lot.category === 'local_commercial' ? '#ea580c'
                              : '#d97706'
                          }}
                        />

                        {/* Icon */}
                        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.bgColor}`}>
                          <IconComponent className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13px] font-semibold text-gray-800 leading-snug">
                              {lot.reference || "Sans réf."}
                            </span>
                            {isOccupied && (
                              <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-green-500" aria-label="Occupé" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[11px] font-medium text-gray-400 leading-tight">
                              {config.label}
                            </span>
                            {subtitle && (
                              <>
                                <span className="text-[11px] text-gray-300">·</span>
                                <span className="truncate text-[11px] text-gray-400 leading-none">
                                  {subtitle}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* New Lots Grid - Ultra Compact */}
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
            <Button
              onClick={onAddLot}
              className={disableAddLot ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-blue-600 hover:bg-blue-700"}
            >
              {disableAddLot ? (
                <TrendingUp className="w-4 h-4 mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {disableAddLot ? "Ajouter un lot (upgrade)" : "Ajouter mon premier lot"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lots.map((lot, index) => {
            const isExpanded = expandedLots[lot.id] || false
            const lotNumber = lots.length - index

            return (
              <div
                key={lot.id}
                className={isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}
              >
                <LotInputCardV2
                  lot={lot}
                  lotNumber={lotNumber}
                  isExpanded={isExpanded}
                  onUpdate={(field, value) => onUpdateLot(lot.id, field, value)}
                  onDuplicate={() => onDuplicateLot(lot.id)}
                  onRemove={() => onRemoveLot(lot.id)}
                  onToggleExpand={() => onToggleLotExpansion(lot.id)}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
