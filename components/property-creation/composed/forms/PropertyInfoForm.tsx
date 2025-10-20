"use client"

/**
 * PropertyInfoForm - Composed form component for property information
 *
 * Combines atomic components to create a comprehensive property information form.
 * Handles both building and independent lot scenarios with context-aware validation.
 */


import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Building, Calendar, Hash, FileText, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AddressInput,
  PropertyNameInput,
  ManagerSelector
} from "../../atoms"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import { usePropertyCreationContext } from "../../context"
import type { BuildingInfo, LotInfo, AddressInfo } from "../../types"
import { logger, logError } from '@/lib/logger'
interface PropertyInfoFormProps {
  mode: 'building' | 'independent-lot'
  className?: string
  showManagerSection?: boolean
  showAddressSection?: boolean
  showLotFields?: boolean
  title?: string
  description?: string
}

export function PropertyInfoForm({
  mode,
  className,
  showManagerSection = true,
  showAddressSection = true,
  showLotFields = false,
  title,
  description
}: PropertyInfoFormProps) {
  const { formData, actions, teamData, getStepValidation } = usePropertyCreationContext()

  const validation = getStepValidation(formData.currentStep)
  const isBuilding = mode === 'building'

  // Get the appropriate data based on mode
  const propertyInfo = isBuilding
    ? (formData as any).buildingInfo as BuildingInfo
    : (formData as any).independentProperty as BuildingInfo

  const lotInfo = showLotFields ? (formData as any).lotInfo as LotInfo : null

  // Handle form updates
  const handlePropertyInfoChange = (updates: Partial<BuildingInfo>) => {
    actions.updateBuildingInfo(updates)
  }

  const handleAddressChange = (address: AddressInfo) => {
    handlePropertyInfoChange(address)
  }

  const handleLotInfoChange = (field: keyof LotInfo, value: string) => {
    if (showLotFields && actions.updateLot && lotInfo?.id) {
      actions.updateLot(lotInfo.id, { [field]: value })
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5" />
              {title}
            </h2>
          )}
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="w-5 h-5" />
            {isBuilding ? "Informations de l'immeuble" : "Informations de la propriété"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Name */}
          <PropertyNameInput
            value={propertyInfo?.name || ""}
            onChange={(name) => handlePropertyInfoChange({ name })}
            validation={{
              isValid: !validation.errors.name,
              errors: validation.errors.name ? { name: validation.errors.name } : {},
              warnings: {}
            }}
            required
            buildingsCount={teamData.teamManagers.length}
            entityType={isBuilding ? 'building' : 'lot'}
          />

          {/* Address Section */}
          {showAddressSection && (
            <>
              <Separator />
              <AddressInput
                value={{
                  address: propertyInfo?.address || "",
                  postalCode: propertyInfo?.postalCode || "",
                  city: propertyInfo?.city || "",
                  country: propertyInfo?.country || "Belgique"
                }}
                onChange={handleAddressChange}
                validation={{
                  isValid: !validation.errors.address,
                  errors: validation.errors.address ? { address: validation.errors.address } : {},
                  warnings: {}
                }}
                required
              />
            </>
          )}

          {/* Building-specific fields */}
          {isBuilding && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="constructionYear" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Année de construction
                  </Label>
                  <Input
                    id="constructionYear"
                    type="number"
                    placeholder="1990"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={propertyInfo?.constructionYear || ""}
                    onChange={(e) => handlePropertyInfoChange({ constructionYear: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Optionnel - utilisé pour les statistiques</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="floors" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    Nombre d'étages
                  </Label>
                  <Input
                    id="floors"
                    type="number"
                    placeholder="5"
                    min="0"
                    max="100"
                    value={propertyInfo?.floors || ""}
                    onChange={(e) => handlePropertyInfoChange({ floors: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Optionnel - aide à organiser les lots</p>
                </div>
              </div>
            </>
          )}

          {/* Lot-specific fields */}
          {showLotFields && lotInfo && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Détails du lot
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lotFloor" className="text-sm font-medium text-gray-700">
                      Étage
                    </Label>
                    <Input
                      id="lotFloor"
                      type="number"
                      placeholder="0"
                      min="-5"
                      max="100"
                      value={lotInfo.floor}
                      onChange={(e) => handleLotInfoChange('floor', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doorNumber" className="text-sm font-medium text-gray-700">
                      Numéro de porte
                    </Label>
                    <Input
                      id="doorNumber"
                      placeholder="A, 12, A-bis..."
                      value={lotInfo.doorNumber}
                      onChange={(e) => handleLotInfoChange('doorNumber', e.target.value)}
                    />
                  </div>
                </div>

                {/* Lot Category */}
                <LotCategorySelector
                  value={lotInfo.category}
                  onChange={(category) => handleLotInfoChange('category', category)}
                  displayMode="grid"
                  required
                />
              </div>
            </>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <FileText className="w-4 h-4" />
              Description
            </Label>
            <Textarea
              id="description"
              placeholder={isBuilding
                ? "Informations supplémentaires sur l'immeuble..."
                : "Informations supplémentaires sur la propriété..."
              }
              value={propertyInfo?.description || ""}
              onChange={(e) => handlePropertyInfoChange({ description: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Particularités, état, équipements, historique...
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manager Section */}
      {showManagerSection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="w-5 h-5" />
              Responsable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ManagerSelector
              selectedManagerId={formData.selectedManagerId}
              teamManagers={teamData.teamManagers}
              onManagerSelect={actions.selectManager}
              onCreateManager={() => {
                // This would trigger a modal or navigation to create manager
                logger.info("Create manager action triggered")
              }}
              userTeam={teamData.userTeam}
              isLoading={teamData.isLoading}
              required
            />
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      {!validation.isValid && Object.keys(validation.errors).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 mb-2">
                  Erreurs à corriger
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.entries(validation.errors).map(([field, error]) => (
                    <li key={field}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

PropertyInfoForm.displayName = "PropertyInfoForm"