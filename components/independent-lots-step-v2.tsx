"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MapPin } from "lucide-react"
import { IndependentLotInputCardV2, type IndependentLot } from "@/components/ui/independent-lot-input-card-v2"

interface IndependentLotsStepV2Props {
  lots: IndependentLot[]
  expandedLots: { [key: string]: boolean }
  onAddLot: () => void
  onUpdateLot: (id: string, field: keyof IndependentLot, value: string) => void
  onDuplicateLot: (id: string) => void
  onRemoveLot: (id: string) => void
  onToggleLotExpansion: (lotId: string) => void
}

/**
 * 🎨 Independent Lots Step V2 - Multi-lot Creation for Independent Lots
 *
 * Adapted from BuildingLotsStepV2 but designed for independent lots with addresses.
 *
 * Key Differences:
 * ❌ No BuildingInfoCard (no parent building)
 * ✅ Each lot has its own complete address
 * ✅ Uses IndependentLotInputCardV2 with address fields
 * ✅ Same responsive grid layout (1-3 columns)
 *
 * Features:
 * - Responsive grid: 1 col (mobile), 2 cols (tablet), 3 cols (desktop)
 * - Expanded cards take full width
 * - Add/duplicate/remove lots
 * - Address section highlighted in blue for each lot
 * - Touch-optimized for mobile
 *
 * Use Case:
 * Creating multiple independent lots (parking spaces, storage units, etc.)
 * where each lot needs its own address and can't be grouped under a building.
 */
export function IndependentLotsStepV2({
  lots,
  expandedLots,
  onAddLot,
  onUpdateLot,
  onDuplicateLot,
  onRemoveLot,
  onToggleLotExpansion
}: IndependentLotsStepV2Props) {
  return (
    <div className="space-y-3 @container">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">
            Lots indépendants
          </h3>
          <span className="text-sm text-gray-600">
            ({lots.length} {lots.length === 1 ? "lot" : "lots"})
          </span>
        </div>
        <Button
          onClick={onAddLot}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Ajouter un lot
        </Button>
      </div>

      {/* Lots Grid - Ultra Compact */}
      {lots.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              Aucun lot configuré
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Ajoutez votre premier lot indépendant pour commencer.
              Chaque lot aura sa propre adresse.
            </p>
            <Button onClick={onAddLot} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter mon premier lot
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
                <IndependentLotInputCardV2
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

export default IndependentLotsStepV2
