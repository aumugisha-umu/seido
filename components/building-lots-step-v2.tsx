"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building, TrendingUp, ChevronDown, ChevronUp } from "lucide-react"
import { LotInputCardV2 } from "@/components/ui/lot-input-card-v2"
import { LotCategory } from "@/lib/lot-types"
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
const LOT_CATEGORY_LABELS: Record<string, string> = {
  'appartement': 'Appartement',
  'maison': 'Maison',
  'garage': 'Garage',
  'local_commercial': 'Local commercial',
  'autre': 'Autre'
}

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

      {/* Existing Lots - Read-only collapsible */}
      {existingLots && existingLots.length > 0 && (
        <Card className="border-dashed border-gray-200 bg-gray-50/50">
          <CardContent className="py-3 px-4">
            <button
              onClick={() => setShowExistingLots(!showExistingLots)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-600">
                {existingLots.length} lot{existingLots.length > 1 ? "s" : ""} existant{existingLots.length > 1 ? "s" : ""} dans cet immeuble
              </span>
              {showExistingLots ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
            {showExistingLots && (
              <div className="mt-3 space-y-1.5">
                {existingLots.map((lot) => (
                  <div
                    key={lot.id}
                    className="flex items-center gap-3 rounded-md bg-white px-3 py-2 text-sm border border-gray-100"
                  >
                    <span className="font-medium text-gray-700">{lot.reference || "Sans référence"}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{LOT_CATEGORY_LABELS[lot.category] || lot.category}</span>
                    {lot.floor && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">Ét. {lot.floor}</span>
                      </>
                    )}
                    {lot.door_number && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500">Porte {lot.door_number}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
