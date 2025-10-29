"use client"

/**
 * BuildingCreationWizard - Main wizard component for building creation
 *
 * Orchestrates the complete building creation flow using modular components.
 * Handles step progression, state management, and component composition.
 */


import React, { Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building, MapPin, Users, Plus, X, Copy, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePropertyCreationContext } from "../context"
import { PropertyStepWrapper } from "../composed/steps/PropertyStepWrapper"
import { PropertyInfoForm } from "../composed/forms/PropertyInfoForm"
import { NavigationControls } from "../composed/navigation/NavigationControls"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getLotCategoryConfig } from "@/lib/lot-types"
import type { BuildingFormData, LotInfo } from "../types"

export function BuildingCreationWizard() {
  const { formData, navigation, actions, teamData } = usePropertyCreationContext()

  if (formData.mode !== 'building') {
    throw new Error('BuildingCreationWizard can only be used with building mode')
  }

  const buildingData = formData as BuildingFormData

  const renderStep1 = () => (
    <PropertyStepWrapper
      title="Informations générales"
      description="Configurez les informations de base de votre immeuble"
    >
      <PropertyInfoForm
        mode="building"
        showManagerSection={true}
        showAddressSection={true}
      />
    </PropertyStepWrapper>
  )

  const renderStep2 = () => (
    <PropertyStepWrapper
      title="Configuration des lots"
      description="Ajoutez et configurez les lots de votre immeuble"
    >
      <LotsConfiguration />
    </PropertyStepWrapper>
  )

  const renderStep3 = () => (
    <PropertyStepWrapper
      title="Assignation des contacts"
      description="Assignez des contacts à votre immeuble et aux lots (optionnel)"
    >
      <ContactsAssignment />
    </PropertyStepWrapper>
  )

  const renderStep4 = () => (
    <PropertyStepWrapper
      title="Confirmation"
      description="Vérifiez les informations avant de créer votre immeuble"
      showCard={false}
    >
      <BuildingConfirmation />
    </PropertyStepWrapper>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div>Chargement...</div>}>
          {navigation.currentStep === 1 && renderStep1()}
          {navigation.currentStep === 2 && renderStep2()}
          {navigation.currentStep === 3 && renderStep3()}
          {navigation.currentStep === 4 && renderStep4()}

          <NavigationControls />
        </Suspense>
      </div>
    </div>
  )
}

// Lots Configuration Component
function LotsConfiguration() {
  const { formData, actions, teamData } = usePropertyCreationContext()
  const buildingData = formData as BuildingFormData
  const [expandedLots, setExpandedLots] = React.useState<{[key: string]: boolean}>({})

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }))
  }

  React.useEffect(() => {
    if (buildingData.lots.length > 0) {
      const allExpanded: {[key: string]: boolean} = {}
      buildingData.lots.forEach(lot => {
        if (lot.id) allExpanded[lot.id] = true
      })
      setExpandedLots(allExpanded)
    }
  }, [buildingData.lots.length])

  if (buildingData.lots.length === 0) {
    return (
      <div className="text-center py-12">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun lot configuré</h3>
        <p className="text-base text-gray-600 mb-6">
          Commencez par ajouter votre premier lot. Vous pourrez ensuite le dupliquer pour gagner du temps.
        </p>
        <Button onClick={actions.addLot} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter mon premier lot
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Button
          onClick={actions.addLot}
          variant="outline"
          className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un lot
        </Button>
      </div>

      <div className="space-y-4">
        {buildingData.lots.map((lot, index) => (
          <LotCard
            key={lot.id}
            lot={lot}
            index={index}
            totalLots={buildingData.lots.length}
            isExpanded={expandedLots[lot.id!] || false}
            onToggleExpansion={() => lot.id && toggleLotExpansion(lot.id)}
            onUpdate={(updates) => lot.id && actions.updateLot(lot.id, updates)}
            onDuplicate={() => lot.id && actions.duplicateLot(lot.id)}
            onRemove={() => lot.id && actions.removeLot(lot.id)}
            categoryCountsByTeam={teamData.categoryCountsByTeam}
          />
        ))}
      </div>
    </div>
  )
}

// Lot Card Component
interface LotCardProps {
  lot: LotInfo
  index: number
  totalLots: number
  isExpanded: boolean
  onToggleExpansion: () => void
  onUpdate: (updates: Partial<LotInfo>) => void
  onDuplicate: () => void
  onRemove: () => void
  categoryCountsByTeam: Record<string, number>
}

function LotCard({
  lot,
  index,
  totalLots,
  isExpanded,
  onToggleExpansion,
  onUpdate,
  onDuplicate,
  onRemove,
  categoryCountsByTeam
}: LotCardProps) {
  const categoryConfig = getLotCategoryConfig(lot.category)

  return (
    <Card className="border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={onToggleExpansion}>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {totalLots - index}
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-medium text-gray-900">{lot.reference}</h3>
              <Badge className={cn(categoryConfig.bgColor, categoryConfig.color)} variant="outline">
                {categoryConfig.label}
              </Badge>
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
              onClick={onDuplicate}
              className="text-gray-500 hover:text-gray-700"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Référence *
                </Label>
                <Input
                  value={lot.reference}
                  onChange={(e) => onUpdate({ reference: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Étage
                </Label>
                <Input
                  value={lot.floor}
                  onChange={(e) => onUpdate({ floor: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Numéro de porte
                </Label>
                <Input
                  placeholder="A, 12, A-bis..."
                  value={lot.doorNumber}
                  onChange={(e) => onUpdate({ doorNumber: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <LotCategorySelector
              value={lot.category}
              onChange={(category) => onUpdate({ category })}
              displayMode="grid"
              required
            />

            <div>
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                placeholder="Informations supplémentaires sur ce lot..."
                value={lot.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Particularités, état, équipements...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Contacts Assignment Component
function ContactsAssignment() {
  const { formData, teamData } = usePropertyCreationContext()
  const buildingData = formData as BuildingFormData

  return (
    <div className="space-y-6">
      {/* Building-level contacts */}
      <Card className="border-orange-200 bg-orange-50/30">
        <CardContent className="p-4">
          <ContactSelector
            teamId={teamData.userTeam?.id}
            displayMode="compact"
            title="Contacts de l'immeuble"
            description="Disponibles pour tous les lots"
            selectedContacts={buildingData.buildingContacts}
            onContactSelected={(contact, type) => {
              actions.addContact(contact, type)
            }}
            onContactRemoved={(contactId, type) => {
              actions.removeContact(contactId, type)
            }}
            allowedContactTypes={["provider", "owner", "other"]}
            hideTitle={false}
          />
        </CardContent>
      </Card>

      {/* Lot-specific contacts */}
      <div className="space-y-4">
        {buildingData.lots.map((lot) => (
          <Card key={lot.id} className="border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Contacts pour {lot.reference}</h3>
              <ContactSelector
                teamId={teamData.userTeam?.id}
                displayMode="compact"
                selectedContacts={buildingData.lotContactAssignments[lot.id!] || {}}
                onContactSelected={(contact, type) => {
                  actions.addContact(contact, type, { lotId: lot.id })
                }}
                onContactRemoved={(contactId, type) => {
                  actions.removeContact(contactId, type, { lotId: lot.id })
                }}
                allowedContactTypes={["tenant", "provider", "owner", "other"]}
                hideTitle={true}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Building Confirmation Component
function BuildingConfirmation() {
  const { formData, teamData } = usePropertyCreationContext()
  const buildingData = formData as BuildingFormData

  const selectedManager = teamData.teamManagers.find(m => m.user.id === buildingData.selectedManagerId)

  return (
    <div className="space-y-4">
      {/* Building Information */}
      <Card className="border-l-4 border-l-sky-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <Building className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Informations de l'immeuble</h3>
                <p className="text-xs text-slate-600">Détails généraux de l'immeuble</p>
              </div>
            </div>

            {selectedManager && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-xs text-blue-900">{selectedManager.user.name}</span>
                <span className="text-xs text-blue-600">• Responsable</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-slate-700">Nom :</span>
                <p className="text-sm font-medium text-slate-900">{buildingData.buildingInfo.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-700">Année de construction :</span>
                <p className="text-sm font-medium text-slate-900">
                  {buildingData.buildingInfo.constructionYear || "Non spécifiée"}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-700">Adresse complète :</span>
              <div className="bg-white rounded-md border border-slate-200 p-3 mt-1">
                <p className="text-sm font-medium text-slate-900">
                  {[
                    buildingData.buildingInfo.address,
                    [buildingData.buildingInfo.postalCode, buildingData.buildingInfo.city].filter(Boolean).join(' '),
                    buildingData.buildingInfo.country
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {buildingData.buildingInfo.description && (
              <div>
                <span className="text-xs font-medium text-slate-700">Description :</span>
                <div className="bg-white rounded-md border border-slate-200 p-3 mt-1">
                  <p className="text-sm text-slate-700">{buildingData.buildingInfo.description}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lots Summary */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Lots configurés ({buildingData.lots.length})</h3>
              <p className="text-xs text-slate-600">Configuration des lots de l'immeuble</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {buildingData.lots.map((lot, index) => {
                const categoryConfig = getLotCategoryConfig(lot.category)
                return (
                  <div key={lot.id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-600">
                        {index + 1}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900">{lot.reference}</span>
                          {lot.doorNumber && <span className="text-slate-500 text-xs">({lot.doorNumber})</span>}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(categoryConfig.bgColor, categoryConfig.borderColor, categoryConfig.color, "text-xs h-4 px-1.5 mt-1")}
                        >
                          {categoryConfig.label}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-slate-600">Étage {lot.floor}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

BuildingCreationWizard.displayName = "BuildingCreationWizard"