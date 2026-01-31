"use client"

/**
 * Lot Edit Client Component
 * 4-step wizard for editing a lot with contacts and managers
 * Reuses creation wizard components following the building edit pattern
 */

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { BuildingInfoForm } from "@/components/building-info-form"
import { BuildingContactsStepV3 } from "@/components/building-contacts-step-v3"
import { BuildingConfirmationStep } from "@/components/building-confirmation-step"
import { IndependentLotInputCardV2, type IndependentLot } from "@/components/ui/independent-lot-input-card-v2"
import type { LotInfo, ContactsByType, BuildingInfo } from "@/lib/utils/lot-transform"
import type { User } from "@/lib/services/core/service-types"
import { updateCompleteLot } from "@/app/actions/lot-actions"
import { logger } from "@/lib/logger"
import { lotSteps } from "@/lib/step-configurations"

// Types
interface TeamMember {
  user: User
}

interface LotEditClientProps {
  lotId: string
  userProfile: User
  userTeam: any
  initialLot: {
    lotInfo: LotInfo
    contacts: ContactsByType
    managers: TeamMember[]
    building: BuildingInfo | null
  }
  initialTeamManagers: TeamMember[]
}

export default function LotEditClient({
  lotId,
  userProfile,
  userTeam,
  initialLot,
  initialTeamManagers
}: LotEditClientProps) {
  const router = useRouter()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1)

  // Handler pour le clic sur une étape dans le header (mode edit = toutes étapes cliquables)
  const handleStepClick = (step: number) => {
    setCurrentStep(step)
  }

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)

  // Lot data state
  const [lotInfo, setLotInfo] = useState<LotInfo>(initialLot.lotInfo)
  const [building, setBuilding] = useState<BuildingInfo | null>(initialLot.building)

  // Contact and manager state (for single lot)
  const [lotContacts, setLotContacts] = useState<ContactsByType>(initialLot.contacts)
  const [lotManagers, setLotManagers] = useState<TeamMember[]>(initialLot.managers)

  // Team managers for selection
  const [teamManagers] = useState<TeamMember[]>(initialTeamManagers)

  // Expansion state for lots (needed by BuildingContactsStepV2)
  const [expandedLots, setExpandedLots] = useState<{ [key: string]: boolean }>({
    [lotId]: true  // Start expanded
  })

  // ContactSelector ref
  const contactSelectorRef = React.useRef<any>(null)

  // Reset form when lotId changes (navigation to different lot)
  useEffect(() => {
    setLotInfo(initialLot.lotInfo)
    setBuilding(initialLot.building)
    setLotContacts(initialLot.contacts)
    setLotManagers(initialLot.managers)
    setCurrentStep(1)
    setError("")
    setSuccess("")
  }, [lotId, initialLot])


  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Step 1 is read-only (building association), always valid
        return true

      case 2:
        // Validate lot details
        if (!lotInfo.reference.trim()) {
          setError("La référence du lot est requise")
          return false
        }
        if (!lotInfo.category) {
          setError("La catégorie du lot est requise")
          return false
        }
        // Additional validation for independent lots (no building)
        if (!building) {
          if (!lotInfo.street?.trim()) {
            setError("L'adresse est requise pour un lot indépendant")
            return false
          }
          if (!lotInfo.postalCode?.trim()) {
            setError("Le code postal est requis pour un lot indépendant")
            return false
          }
          if (!lotInfo.city?.trim()) {
            setError("La ville est requise pour un lot indépendant")
            return false
          }
        }
        return true

      case 3:
        // Contacts/managers step - no strict validation (can be empty)
        return true

      default:
        return true
    }
  }

  const handleNext = () => {
    setError("")
    setSuccess("")

    if (!validateStep(currentStep)) {
      return
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setError("")
    setSuccess("")

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Contact management functions
  const handleContactAdd = (contact: any, contactType: string, context?: { lotId?: string }) => {
    logger.info('🎯 [LOT-EDIT] Contact ajouté:', contact.name, 'type:', contactType)

    // For lot edit, we only add to the single lot
    setLotContacts((prev) => ({
      ...prev,
      [contactType]: [...(prev[contactType] || []), contact]
    }))
  }

  const handleBuildingContactRemove = (contactId: string, contactType: string) => {
    // Not used in lot edit (no building-level contacts)
  }

  const removeContactFromLot = (lotId: string, contactType: string, contactId: string) => {
    setLotContacts(prev => ({
      ...prev,
      [contactType]: (prev[contactType] || []).filter(c => c.id !== contactId)
    }))
  }

  const getLotContactsByType = (lotId: string, contactType: string): any[] => {
    return lotContacts[contactType] || []
  }

  const getAllLotContacts = (lotId: string): any[] => {
    return Object.values(lotContacts).flat()
  }

  // Manager management functions
  const getAssignedManagers = (lotId: string): User[] => {
    return lotManagers.map(m => m.user)
  }

  const removeManagerFromLot = (lotId: string, managerId: string) => {
    setLotManagers(prev => prev.filter(manager => manager.user.id !== managerId))
  }

  const openManagerModal = (lotId: string) => {
    // Could implement modal later if needed
    logger.info('🔧 [LOT-EDIT] Manager modal requested for lot:', lotId)
  }

  const openBuildingManagerModal = () => {
    // Not used in lot edit
  }

  const removeBuildingManager = (managerId: string) => {
    // Not used in lot edit
  }

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }))
  }

  const handleSave = async () => {
    if (!validateStep(currentStep)) {
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      logger.info("🔧 [LOT-EDIT] Starting lot update", {
        lotId,
        reference: lotInfo.reference,
        category: lotInfo.category
      })

      // Prepare lot data
      const lotData: any = {
        reference: lotInfo.reference.trim(),
        floor: lotInfo.floor ? parseInt(lotInfo.floor) : undefined,
        apartment_number: lotInfo.doorNumber?.trim() || undefined,
        category: lotInfo.category,
        description: lotInfo.description?.trim() || undefined
      }

      // Add address fields for independent lots
      if (!building) {
        lotData.street = lotInfo.street?.trim() || undefined
        lotData.postal_code = lotInfo.postalCode?.trim() || undefined
        lotData.city = lotInfo.city?.trim() || undefined
        lotData.country = lotInfo.country || "Belgique"
      }

      // Prepare contacts data (flatten ContactsByType to array)
      const contacts: Array<{ contactId: string; contactType: string; isPrimary: boolean }> = []

      // Add tenants
      lotContacts.tenant?.forEach((contact, index) => {
        contacts.push({
          contactId: contact.id,
          contactType: "locataire",
          isPrimary: index === 0 // First tenant is primary
        })
      })

      // Add providers
      lotContacts.provider?.forEach(contact => {
        contacts.push({
          contactId: contact.id,
          contactType: "prestataire",
          isPrimary: false
        })
      })

      // Add owners
      lotContacts.owner?.forEach(contact => {
        contacts.push({
          contactId: contact.id,
          contactType: "proprietaire",
          isPrimary: false
        })
      })

      // Add managers (gestionnaires)
      lotManagers.forEach(manager => {
        contacts.push({
          contactId: manager.user.id,
          contactType: "gestionnaire",
          isPrimary: false
        })
      })

      // Call Server Action
      const result = await updateCompleteLot({
        lotId,
        lot: lotData,
        contacts
      })

      if (result.success) {
        logger.info("✅ [LOT-EDIT] Lot updated successfully")
        setSuccess("Lot modifié avec succès !")

        // Redirect to lot details page
        router.push(`/gestionnaire/biens/lots/${lotId}`)
        router.refresh()
      } else {
        logger.error("❌ [LOT-EDIT] Update failed:", result.error)
        setError(result.error || "Erreur lors de la modification du lot")
      }

    } catch (error) {
      logger.error("❌ [LOT-EDIT] Unexpected error:", error)
      setError("Une erreur inattendue s'est produite")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header - Sticky at top */}
      <StepProgressHeader
        title="Modifier le lot"
        subtitle={`Lot "${lotInfo.reference}"`}
        backButtonText="Retour"
        onBack={() => router.push(`/gestionnaire/biens/lots/${lotId}`)}
        steps={lotSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowFutureSteps={true}
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 lg:px-10 pt-5 sm:pt-6 lg:pt-10 pb-20">
        <main className="content-max-width pb-8">
        {/* Success/Error Alerts */}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Building Association (Read-Only) */}
        {currentStep === 1 && (
          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Association à un immeuble
            </h2>

            {building ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Ce lot est associé à l'immeuble suivant :
                </p>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Nom :</strong> {building.name}</p>
                  {building.address_record?.street && <p><strong>Adresse :</strong> {building.address_record.street}</p>}
                  {building.address_record?.city && <p><strong>Ville :</strong> {building.address_record.city}</p>}
                </div>
                <p className="text-xs text-blue-700 mt-3">
                  ℹ️ L'association à un immeuble ne peut pas être modifiée en mode édition.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted border border-border rounded-lg">
                <p className="text-sm text-foreground font-medium mb-1">
                  Lot indépendant
                </p>
                <p className="text-xs text-muted-foreground">
                  Ce lot n'est pas associé à un immeuble.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Lot Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Conditional rendering based on lot type */}
            {building ? (
              // Building-associated lot - Use BuildingInfoForm (no address section)
              <div className="bg-card rounded-lg shadow p-6">
                <BuildingInfoForm
                  buildingInfo={{
                    name: lotInfo.reference,
                    address: "",
                    postalCode: "",
                    city: "",
                    country: "Belgique",
                    description: lotInfo.description,
                    floor: lotInfo.floor,
                    doorNumber: lotInfo.doorNumber,
                    category: lotInfo.category
                  }}
                  setBuildingInfo={(info) => {
                    setLotInfo({
                      reference: info.name,
                      floor: info.floor || "",
                      doorNumber: info.doorNumber || "",
                      description: info.description,
                      category: info.category || "appartement"
                    })
                  }}
                  selectedManagerId=""
                  setSelectedManagerId={() => {}}
                  teamManagers={[]}
                  userTeam={userTeam}
                  isLoading={false}
                  showManagerSection={false}
                  showAddressSection={false}
                  entityType="lot"
                  showTitle={false}
                />
              </div>
            ) : (
              // Independent lot - Use IndependentLotInputCardV2 (with full address)
              <div className="bg-card rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Informations du lot indépendant
                </h2>
                <IndependentLotInputCardV2
                  lot={{
                    id: lotId,
                    reference: lotInfo.reference,
                    category: lotInfo.category,
                    street: lotInfo.street || "",
                    postalCode: lotInfo.postalCode || "",
                    city: lotInfo.city || "",
                    country: lotInfo.country || "Belgique",
                    floor: lotInfo.floor,
                    doorNumber: lotInfo.doorNumber,
                    description: lotInfo.description
                  }}
                  lotNumber={1}
                  isExpanded={true}
                  onUpdate={(field, value) => {
                    setLotInfo((prev) => ({
                      ...prev,
                      [field]: value
                    }))
                  }}
                  onDuplicate={() => {}} // Not used in edit mode
                  onRemove={() => {}} // Not used in edit mode
                  onToggleExpand={() => {}} // Always expanded in edit mode
                  hideActions={true} // Hide duplicate/remove/expand buttons in edit mode
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Contacts and Managers */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <BuildingContactsStepV3
              buildingInfo={{
                name: building?.name || "Lot indépendant",
                address: building?.address || "",
                postalCode: "",
                city: building?.city || "",
                country: "Belgique",
                description: ""
              }}
              teamManagers={teamManagers.map(tm => tm.user)}
              buildingManagers={[]}
              userProfile={userProfile}
              userTeam={userTeam}
              lots={[{
                id: lotId,
                reference: lotInfo.reference,
                floor: lotInfo.floor,
                doorNumber: lotInfo.doorNumber,
                description: lotInfo.description,
                category: lotInfo.category
              }]}
              expandedLots={expandedLots}
              buildingContacts={{ provider: [], owner: [], other: [] }}
              lotContactAssignments={{
                [lotId]: lotContacts
              }}
              assignedManagers={{
                [lotId]: lotManagers.map(m => m.user)
              }}
              contactSelectorRef={contactSelectorRef}
              handleContactAdd={handleContactAdd}
              handleBuildingContactRemove={handleBuildingContactRemove}
              removeContactFromLot={removeContactFromLot}
              getLotContactsByType={getLotContactsByType}
              getAllLotContacts={getAllLotContacts}
              getAssignedManagers={getAssignedManagers}
              removeManagerFromLot={removeManagerFromLot}
              openManagerModal={openManagerModal}
              openBuildingManagerModal={openBuildingManagerModal}
              removeBuildingManager={removeBuildingManager}
              toggleLotExpansion={toggleLotExpansion}
            />
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <BuildingConfirmationStep
              buildingInfo={{
                name: building?.name || lotInfo.reference,
                // For independent lots, use lot address; for building lots, use building address
                address: building?.address || lotInfo.street || "",
                postalCode: building ? "" : (lotInfo.postalCode || ""),
                city: building?.city || lotInfo.city || "",
                country: building ? "Belgique" : (lotInfo.country || "Belgique"),
                description: building ? "" : lotInfo.description
              }}
              lots={[{
                id: lotId,
                reference: lotInfo.reference,
                floor: lotInfo.floor,
                doorNumber: lotInfo.doorNumber,
                description: lotInfo.description,
                category: lotInfo.category
              }]}
              buildingManagers={[]}
              buildingContacts={{ provider: [], owner: [], other: [] }}
              lotContactAssignments={{
                [lotId]: lotContacts
              }}
              assignedManagers={{
                [lotId]: lotManagers.map(m => m.user)
              }}
            />
          </div>
        )}
        </main>
      </div>

      {/* Sticky Footer Navigation - Outside all steps */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex justify-between w-full content-max-width">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || saving}
            className="flex items-center space-x-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Précédent</span>
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <span>Suivant : {lotSteps[currentStep]?.label || 'Étape suivante'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>Enregistrer</span>
                  <Check className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
