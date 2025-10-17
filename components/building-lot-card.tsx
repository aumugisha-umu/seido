"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building, Hash, Copy, X, ChevronDown, ChevronUp } from "lucide-react"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import { LotCategory } from "@/lib/lot-types"

interface Lot {
  id: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
}

interface BuildingLotCardProps {
  lot: Lot
  lotNumber: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (field: keyof Lot, value: string) => void
  onDuplicate: () => void
  onRemove: () => void
  compact?: boolean
}

export function BuildingLotCard({
  lot,
  lotNumber,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDuplicate,
  onRemove,
  compact = false
}: BuildingLotCardProps) {
  return (
    <Card className="border-blue-200">
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={onToggleExpand}
          >
            <div className="px-3 py-1 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              Lot {lotNumber}
            </div>
            <div className="ml-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className={`space-y-4 ${compact ? 'p-4' : 'p-4 sm:p-6'}`}>
          {/* Selection de categorie */}
          <LotCategorySelector
            value={lot.category}
            onChange={(category) => onUpdate("category", category)}
            displayMode="grid"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                <Hash className="w-4 h-4 inline mr-1" />
                Référence *
              </Label>
              <Input
                value={lot.reference}
                onChange={(e) => onUpdate("reference", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                <Building className="w-4 h-4 inline mr-1" />
                Étage
              </Label>
              <Input
                value={lot.floor}
                onChange={(e) => onUpdate("floor", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                <Hash className="w-4 h-4 inline mr-1" />
                Numéro de porte
              </Label>
              <Input
                placeholder="A, 12, A-bis..."
                value={lot.doorNumber}
                onChange={(e) => onUpdate("doorNumber", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">Description</Label>
            <Textarea
              placeholder="Informations supplémentaires sur ce lot..."
              value={lot.description}
              onChange={(e) => onUpdate("description", e.target.value)}
              className="mt-1"
              rows={compact ? 2 : 3}
            />
            <p className="text-xs text-gray-500 mt-1">Particularités, état, équipements...</p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
