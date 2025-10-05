"use client"

/**
 * LotCreationWizard - Wizard component for lot creation
 *
 * Demonstrates the reusability of our modular architecture by implementing
 * the lot creation flow using the same atomic and composed components.
 */


import React, { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Building2, Home, Search, Users, MapPin, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { usePropertyCreationContext } from "../context"
import { PropertyStepWrapper } from "../composed/steps/PropertyStepWrapper"
import { PropertyInfoForm } from "../composed/forms/PropertyInfoForm"
import { NavigationControls } from "../composed/navigation/NavigationControls"
import { BuildingSelector } from "../atoms"
import ContactSelector from "@/components/contact-selector"
import type { LotFormData } from "../types"
import { logger, logError } from '@/lib/logger'
export function LotCreationWizard() {
  const _router = useRouter()
  const { formData, navigation, actions, teamData } = usePropertyCreationContext()

  if (formData.mode !== 'lot' && formData.mode !== 'independent') {
    throw new Error('LotCreationWizard can only be used with lot or independent mode')
  }

  const lotData = formData as LotFormData

  const renderStep1 = () => (
    <PropertyStepWrapper
      title="Association immeuble"
      description="Comment souhaitez-vous gérer ce lot ?"
    >
      <BuildingAssociationStep />
    </PropertyStepWrapper>
  )

  const renderStep2 = () => (
    <PropertyStepWrapper
      title={lotData.buildingAssociation === "independent" ? "Configuration du lot" : "Détails du lot"}
      description={
        lotData.buildingAssociation === "independent"
          ? "Configurez les informations de votre lot indépendant"
          : "Définissez les caractéristiques de votre lot"
      }
    >
      <LotDetailsStep />
    </PropertyStepWrapper>
  )

  const renderStep3 = () => (
    <PropertyStepWrapper
      title="Assignation des contacts"
      description="Assignez des contacts à votre lot (optionnel)"
    >
      <LotContactsStep />
    </PropertyStepWrapper>
  )

  const renderStep4 = () => (
    <PropertyStepWrapper
      title="Confirmation"
      description="Vérifiez les informations avant de créer votre lot"
      showCard={false}
    >
      <LotConfirmationStep />
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

// Building Association Step Component
function BuildingAssociationStep() {
  const { formData, actions } = usePropertyCreationContext()
  const { data: managerData, loading: buildingsLoading } = useManagerStats()
  const [buildingSearchQuery, setBuildingSearchQuery] = React.useState("")

  const lotData = formData as LotFormData
  const buildings = managerData?.buildings || []

  const handleAssociationChange = (value: "existing" | "new" | "independent") => {
    // Update the building association in form data
    // This would need to be implemented in the hook
    logger.info("Building association changed to:", value)
  }

  return (
    <div className="space-y-6">
      <RadioGroup
        value={lotData.buildingAssociation}
        onValueChange={handleAssociationChange}
        className="space-y-4"
      >
        {/* Existing building option */}
        <div
          className={cn(
            "flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm",
            lotData.buildingAssociation === "existing"
              ? "border-blue-500 bg-blue-50 shadow-sm"
              : "border-gray-200 bg-white"
          )}
          onClick={() => handleAssociationChange("existing")}
        >
          <RadioGroupItem value="existing" id="existing" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="existing" className="font-medium text-gray-900 cursor-pointer">
              Lier à un immeuble existant
            </Label>
            <p className="text-sm text-gray-600 mt-1">Associez ce lot à un immeuble que vous avez déjà créé</p>
          </div>
        </div>

        {/* New building option */}
        <div
          className={cn(
            "flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm",
            lotData.buildingAssociation === "new"
              ? "border-blue-500 bg-blue-50 shadow-sm"
              : "border-gray-200 bg-white"
          )}
          onClick={() => handleAssociationChange("new")}
        >
          <RadioGroupItem value="new" id="new" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="new" className="font-medium text-gray-900 cursor-pointer">
              Ajouter un immeuble
            </Label>
            <p className="text-sm text-gray-600 mt-1">Créez un nouvel immeuble et associez-y ce lot</p>
          </div>
        </div>

        {/* Independent lot option */}
        <div
          className={cn(
            "flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm",
            lotData.buildingAssociation === "independent"
              ? "border-blue-500 bg-blue-50 shadow-sm"
              : "border-gray-200 bg-white"
          )}
          onClick={() => handleAssociationChange("independent")}
        >
          <RadioGroupItem value="independent" id="independent" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="independent" className="font-medium text-gray-900 cursor-pointer">
              Laisser le lot indépendant
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Ce lot ne sera pas associé à un immeuble (maison individuelle, etc.)
            </p>
          </div>
        </div>
      </RadioGroup>

      {/* Building selection for existing option */}
      {lotData.buildingAssociation === "existing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Sélectionner un immeuble</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BuildingSelector
              buildings={buildings}
              selectedBuildingId={lotData.selectedBuilding}
              onBuildingSelect={(_buildingId) => {
                // Update selected building in form data
                logger.info("Building selected:", _buildingId)
              }}
              searchQuery={buildingSearchQuery}
              onSearchChange={setBuildingSearchQuery}
              isLoading={buildingsLoading}
              emptyStateAction={() => {
                // Navigate to building creation
                window.location.href = '/gestionnaire/biens/immeubles/nouveau'
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* New building information */}
      {lotData.buildingAssociation === "new" && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span>Création d'un nouvel immeuble</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-100/50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Vous allez d'abord créer l'immeuble
                  </h4>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    En cliquant sur "Suivant", vous serez redirigé vers la page de création d'immeuble.
                    Une fois l'immeuble créé, vous pourrez revenir ici pour créer votre lot.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Independent lot information */}
      {lotData.buildingAssociation === "independent" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>Lot indépendant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Ce lot ne sera pas associé à un immeuble. Vous pourrez définir ses informations générales à l'étape suivante.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Lot Details Step Component
function LotDetailsStep() {
  const { formData } = usePropertyCreationContext()
  const lotData = formData as LotFormData

  if (lotData.buildingAssociation === "independent") {
    return (
      <PropertyInfoForm
        mode="independent-lot"
        showManagerSection={true}
        showAddressSection={true}
        showLotFields={true}
      />
    )
  }

  // For lots associated with existing buildings, show simpler form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Home className="h-5 w-5" />
          <span>Détails du lot</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lot details form would go here */}
        <p className="text-gray-600">Configuration des détails du lot...</p>
      </CardContent>
    </Card>
  )
}

// Lot Contacts Step Component
function LotContactsStep() {
  const { formData, teamData, actions } = usePropertyCreationContext()
  const lotData = formData as LotFormData

  return (
    <ContactSelector
      teamId={teamData.userTeam?.id}
      displayMode="full"
      title="Assignation des contacts"
      description="Assignez des contacts à votre lot (optionnel)"
      selectedContacts={lotData.contactAssignments}
      onContactSelected={(contact, type) => {
        actions.addContact(contact, type)
      }}
      onContactRemoved={(contactId, type) => {
        actions.removeContact(contactId, type)
      }}
      allowedContactTypes={["tenant", "provider", "syndic", "insurance", "other"]}
    />
  )
}

// Lot Confirmation Step Component
function LotConfirmationStep() {
  const { formData, teamData } = usePropertyCreationContext()
  const lotData = formData as LotFormData
  const selectedManager = teamData.teamManagers.find(m => m.user.id === lotData.selectedManagerId)

  const getAssociationType = () => {
    switch (lotData.buildingAssociation) {
      case "existing": return "Lié à un immeuble existant"
      case "new": return "Nouvel immeuble créé"
      case "independent": return "Lot indépendant"
      default: return "Non défini"
    }
  }

  return (
    <div className="space-y-4">
      {/* Association type */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Association immeuble</h3>
                <p className="text-xs text-slate-600">{getAssociationType()}</p>
              </div>
            </div>

            {selectedManager && (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-medium text-xs text-blue-900">{selectedManager.user.name}</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            {lotData.buildingAssociation === "independent" && lotData.independentProperty && (
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-slate-700">Nom du lot :</span>
                  <p className="text-sm font-medium text-slate-900">
                    {lotData.independentProperty.name || "Non spécifié"}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-700">Adresse :</span>
                  <p className="text-sm text-slate-700">
                    {[
                      lotData.independentProperty.address,
                      [lotData.independentProperty.postalCode, lotData.independentProperty.city].filter(Boolean).join(' '),
                      lotData.independentProperty.country
                    ].filter(Boolean).join(', ') || "Non spécifiée"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lot details */}
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Home className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900">Détails du lot</h3>
              <p className="text-xs text-slate-600">Configuration et caractéristiques</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-slate-700">Référence :</span>
                <p className="text-sm text-slate-900">{lotData.lotInfo.reference}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-700">Catégorie :</span>
                <p className="text-sm text-slate-900 capitalize">{lotData.lotInfo.category}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

LotCreationWizard.displayName = "LotCreationWizard"