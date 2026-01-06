"use client"

import React, { useState, useEffect, useRef } from "react"
import type { User, Team, Building } from "@/lib/services/core/service-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User as UserIcon,
  Plus,
  Loader2,
  Users,
  ArrowLeft,
  ChevronDown,
  AlertTriangle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { BuildingInfoForm } from "@/components/building-info-form"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import { createTeamService, createContactInvitationService } from "@/lib/services"
import { updateCompleteProperty } from "@/app/actions/building-actions"
import { BuildingConfirmationStep } from "@/components/building-confirmation-step"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { buildingSteps } from "@/lib/step-configurations"
import { LotCategory, getLotCategoryConfig } from "@/lib/lot-types"
import { logger } from '@/lib/logger'
import { BuildingLotsStepV2 } from "@/components/building-lots-step-v2"
import { BuildingContactsStepV3 } from "@/components/building-contacts-step-v3"
import type {
  BuildingInfo,
  ComponentLot,
  Contact,
  ContactsByType,
  LotContactAssignments,
  LotManagerAssignments
} from "@/lib/utils/building-transform"
import { isNewLot, isExistingLot } from "@/lib/utils/building-transform"

// Mapping des noms de pays vers valeurs enum DB (Phase 2)
const countryToDBEnum: Record<string, string> = {
  "Belgique": "belgique",
  "France": "france",
  "Luxembourg": "luxembourg",
  "Pays-Bas": "pays-bas",
  "Allemagne": "allemagne",
  "Suisse": "suisse",
  "Autre": "autre",
}

interface EditBuildingClientProps {
  buildingId: string
  userProfile: {
    id: string
    email: string
    name: string
    role: string
  }
  userTeam: Team
  initialBuilding: {
    buildingInfo: BuildingInfo
    lots: ComponentLot[]
    buildingManagers: Array<{ user: User }>
    buildingContacts: ContactsByType
    lotContactAssignments: LotContactAssignments
    assignedManagers: LotManagerAssignments
  }
  initialTeamManagers: Array<{ user: User }>
}

export default function EditBuildingClient({
  buildingId,
  userProfile,
  userTeam,
  initialBuilding,
  initialTeamManagers,
}: EditBuildingClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1)

  // Handler pour le clic sur une étape dans le header (mode edit = toutes étapes cliquables)
  const handleStepClick = (step: number) => {
    setCurrentStep(step)
  }

  // Building data states - initialized with pre-populated data
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>(initialBuilding.buildingInfo)
  const [lots, setLots] = useState<ComponentLot[]>(initialBuilding.lots)
  const [buildingContacts, setBuildingContacts] = useState<ContactsByType>(initialBuilding.buildingContacts)
  const [buildingManagers, setBuildingManagers] = useState<Array<{ user: User }>>(initialBuilding.buildingManagers)
  const [assignedManagers, setAssignedManagers] = useState<LotManagerAssignments>(initialBuilding.assignedManagers)
  const [lotContactAssignments, setLotContactAssignments] = useState<LotContactAssignments>(initialBuilding.lotContactAssignments)

  // Track deleted lots for differential update
  const [deletedLotIds, setDeletedLotIds] = useState<string[]>([])

  // Contact selector reference
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Modal states
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [selectedLotForManager, setSelectedLotForManager] = useState<string>("")
  const [isBuildingManagerModalOpen, setIsBuildingManagerModalOpen] = useState(false)

  // Team managers
  const [teamManagers, setTeamManagers] = useState<Array<{ user: User }>>(initialTeamManagers)

  // UI states
  const [error, setError] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [expandedLots, setExpandedLots] = useState<{[key: string]: boolean}>({})
  const [isMounted, setIsMounted] = useState(false)
  const hasInitializedStep3 = useRef(false)

  // Services
  const [services, setServices] = useState<{
    team: ReturnType<typeof createTeamService> | null
    contactInvitation: ReturnType<typeof createContactInvitationService> | null
  } | null>(null)

  // Initialize services
  useEffect(() => {
    if (!userProfile) {
      logger.info("❌ [SERVICE-INIT] No userProfile, skipping service creation")
      return
    }
    if (services) {
      logger.info("✅ [SERVICE-INIT] Services already initialized")
      return
    }

    logger.info("🔧 [SERVICE-INIT] UserProfile ready, creating services now...")
    setServices({
      team: createTeamService(),
      contactInvitation: createContactInvitationService()
    })
    logger.info("✅ [SERVICE-INIT] Services created successfully")
  }, [userProfile, services])

  // Set mounted flag
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Reset form when buildingId changes (navigation to different building)
  useEffect(() => {
    logger.info('🔄 [EDIT-BUILDING] Resetting form with new initial data for building:', buildingId)

    setBuildingInfo(initialBuilding.buildingInfo)
    setLots(initialBuilding.lots)
    setBuildingContacts(initialBuilding.buildingContacts)
    setBuildingManagers(initialBuilding.buildingManagers)
    setAssignedManagers(initialBuilding.assignedManagers)
    setLotContactAssignments(initialBuilding.lotContactAssignments)
    setDeletedLotIds([])
    setCurrentStep(1)
    setError("")

    logger.info('✅ [EDIT-BUILDING] Form reset complete')
  }, [buildingId, initialBuilding])

  // Open all lots when arriving at step 3 (once)
  useEffect(() => {
    if (currentStep === 3 && lots.length > 0 && !hasInitializedStep3.current) {
      const allExpanded: {[key: string]: boolean} = {}
      lots.forEach(lot => {
        allExpanded[lot.id] = true
      })
      setExpandedLots(allExpanded)
      hasInitializedStep3.current = true
    }

    if (currentStep !== 3) {
      hasInitializedStep3.current = false
    }
  }, [currentStep, lots])

  // Lot management functions
  const addLot = () => {
    // Generate temp ID for new lot
    const tempId = `lot-new-${Date.now()}`
    const category = "appartement"
    const categoryConfig = getLotCategoryConfig(category)

    // Count existing lots of this category
    const existingLotsOfCategory = lots.filter(l => l.category === category).length

    const newLot: ComponentLot = {
      id: tempId,
      reference: `${categoryConfig.label} ${existingLotsOfCategory + 1}`,
      floor: "0",
      doorNumber: "",
      description: "",
      category: "appartement",
    }

    setLots([newLot, ...lots])
    setExpandedLots({[newLot.id]: true})
  }

  const updateLot = (id: string, field: keyof ComponentLot, value: string) => {
    setLots(lots.map((lot) => {
      if (lot.id === id) {
        const updatedLot = { ...lot, [field]: value }

        // Recalculate reference if category changes
        if (field === 'category') {
          const categoryConfig = getLotCategoryConfig(value)
          const existingLotsOfCategory = lots.filter(l => l.category === value && l.id !== id).length
          updatedLot.reference = `${categoryConfig.label} ${existingLotsOfCategory + 1}`
        }

        return updatedLot
      }
      return lot
    }))
  }

  const removeLot = (lotId: string) => {
    // If it's an existing lot (UUID), track it for deletion
    if (isExistingLot(lotId)) {
      setDeletedLotIds([...deletedLotIds, lotId])
    }

    setLots(lots.filter((lot) => lot.id !== lotId))

    // Clean up expansion state
    const newExpandedLots = {...expandedLots}
    delete newExpandedLots[lotId]
    setExpandedLots(newExpandedLots)

    // Clean up contact assignments
    const newLotContactAssignments = {...lotContactAssignments}
    delete newLotContactAssignments[lotId]
    setLotContactAssignments(newLotContactAssignments)

    // Clean up manager assignments
    const newAssignedManagers = {...assignedManagers}
    delete newAssignedManagers[lotId]
    setAssignedManagers(newAssignedManagers)
  }

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots({
      ...expandedLots,
      [lotId]: !expandedLots[lotId]
    })
  }

  const duplicateLot = (lotId: string) => {
    const lotToDuplicate = lots.find((lot) => lot.id === lotId)
    if (lotToDuplicate) {
      const newLot: ComponentLot = {
        ...lotToDuplicate,
        id: `lot-new-${Date.now()}`,
        reference: `${lotToDuplicate.reference} (copie)`,
      }
      setLots([newLot, ...lots])
      setExpandedLots({[newLot.id]: true})
    }
  }

  // Contact management functions
  const handleContactAdd = (contact: Contact, contactType: string, context?: { lotId?: string }) => {
    logger.info('🎯 [EDIT-BUILDING] Contact ajouté:', contact.name, 'type:', contactType, context?.lotId ? `à lot ${context.lotId}` : 'niveau immeuble')

    if (context?.lotId) {
      setLotContactAssignments((prev) => {
        const lotId = context.lotId!
        return {
          ...prev,
          [lotId]: {
            ...prev[lotId],
            [contactType]: [...(prev[lotId]?.[contactType] || []), contact]
          }
        }
      })
    } else {
      setBuildingContacts((prev) => ({
        ...prev,
        [contactType]: [...(prev[contactType] || []), contact],
      }))
    }
  }

  const handleBuildingContactRemove = (contactId: string, contactType: string) => {
    setBuildingContacts((prev) => ({
      ...prev,
      [contactType]: (prev[contactType] || []).filter(contact => contact.id !== contactId),
    }))
  }

  const removeContactFromLot = (lotId: string, contactType: string, contactId: string) => {
    setLotContactAssignments(prev => ({
      ...prev,
      [lotId]: {
        ...prev[lotId],
        [contactType]: (prev[lotId]?.[contactType] || []).filter(c => c.id !== contactId)
      }
    }))
  }

  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  const getAllLotContacts = (lotId: string): Contact[] => {
    const lotAssignments = lotContactAssignments[lotId] || {}
    return Object.values(lotAssignments).flat()
  }

  // Manager management functions
  const openManagerModal = (lotId: string) => {
    setSelectedLotForManager(lotId)
    setIsManagerModalOpen(true)
  }

  const addManagerToLot = (lotId: string, manager: User) => {
    setAssignedManagers(prev => {
      const currentManagers = prev[lotId] || []
      const alreadyAssigned = currentManagers.some(m => m.user.id === manager.user.id)
      if (alreadyAssigned) return prev

      return {
        ...prev,
        [lotId]: [...currentManagers, manager]
      }
    })
    setIsManagerModalOpen(false)
  }

  const removeManagerFromLot = (lotId: string, managerId: string) => {
    setAssignedManagers(prev => ({
      ...prev,
      [lotId]: (prev[lotId] || []).filter(manager => manager.user.id !== managerId)
    }))
  }

  const getAssignedManagers = (lotId: string) => {
    return assignedManagers[lotId] || []
  }

  const openBuildingManagerModal = () => {
    setIsBuildingManagerModalOpen(true)
  }

  const addBuildingManager = (manager: User) => {
    const alreadyExists = buildingManagers.some(m => m.user.id === manager.user.id)
    if (!alreadyExists) {
      setBuildingManagers([...buildingManagers, manager])
    }
    setIsBuildingManagerModalOpen(false)
  }

  const removeBuildingManager = (managerId: string) => {
    if (buildingManagers.length <= 1) return
    setBuildingManagers(buildingManagers.filter(m => m.user.id !== managerId))
  }

  const openGestionnaireModal = () => {
    router.push('/gestionnaire/contacts/nouveau')
  }

  // Navigation helpers
  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      if (!buildingInfo.name.trim()) return false
      if (!buildingInfo.address.trim()) return false
      return true
    }
    if (currentStep === 2) {
      return lots.length > 0
    }
    if (currentStep === 3) {
      return true
    }
    return true
  }

  const handleSave = async () => {
    if (!userProfile?.id) {
      setError("Vous devez être connecté pour modifier l'immeuble")
      return
    }

    if (!buildingInfo.address.trim()) {
      setError("L'adresse de l'immeuble est requise")
      return
    }

    if (lots.length === 0) {
      setError("Au moins un lot est requis")
      return
    }

    if (buildingManagers.length === 0) {
      setError("Au moins un gestionnaire d'immeuble est requis")
      return
    }

    if (!userTeam?.id) {
      setError("Impossible de déterminer votre équipe")
      return
    }

    try {
      setIsSaving(true)
      setError("")

      // Prepare building update data
      const buildingData = {
        name: buildingInfo.name.trim(),
        address: buildingInfo.address.trim(),
        city: buildingInfo.city.trim() || "Non spécifié",
        country: countryToDBEnum[buildingInfo.country.trim()] || "belgique",
        postal_code: buildingInfo.postalCode.trim() || "",
        description: buildingInfo.description.trim(),
      }

      // Separate new lots from existing lots
      const newLots = lots.filter(lot => isNewLot(lot.id))
      const updatedLots = lots.filter(lot => isExistingLot(lot.id))

      // Prepare lots data
      const lotsData = {
        new: newLots.map((lot) => ({
          reference: lot.reference.trim(),
          floor: lot.floor ? parseInt(lot.floor) : 0,
          apartment_number: lot.doorNumber.trim() || undefined,
          category: lot.category,
          description: lot.description?.trim() || undefined,
        })),
        updated: updatedLots.map((lot) => ({
          id: lot.id,
          reference: lot.reference.trim(),
          floor: lot.floor ? parseInt(lot.floor) : 0,
          apartment_number: lot.doorNumber.trim() || undefined,
          category: lot.category,
          description: lot.description?.trim() || undefined,
        })),
        deleted: deletedLotIds
      }

      // Prepare building contacts
      const contactsData = [
        ...Object.entries(buildingContacts).flatMap(([contactType, contactArray]) =>
          (contactArray || []).map(contact => ({
            id: contact.id,
            type: contactType,
            isPrimary: false
          }))
        ),
        ...buildingManagers.map((manager, index) => ({
          id: manager.user.id,
          type: 'gestionnaire',
          isPrimary: index === 0
        }))
      ]

      // Prepare lot contact assignments
      const lotContactAssignmentsData = Object.entries(lotContactAssignments).map(([lotId, assignments]) => {
        const contactAssignments = Object.entries(assignments).flatMap(([contactType, contacts]) =>
          (contacts || []).map(contact => ({
            contactId: contact.id,
            contactType: contactType,
            isPrimary: false
          }))
        )

        const managersForThisLot = assignedManagers[lotId] || []
        const managerAssignments = managersForThisLot.map((manager, index) => ({
          contactId: manager.user.id,
          contactType: 'gestionnaire',
          isPrimary: index === 0,
          isLotPrincipal: index === 0
        }))

        return {
          lotId: lotId,
          assignments: [...contactAssignments, ...managerAssignments]
        }
      })

      // Call updateCompleteProperty Server Action
      const result = await updateCompleteProperty({
        buildingId,
        building: buildingData,
        lots: lotsData,
        buildingContacts: contactsData,
        lotContactAssignments: lotContactAssignmentsData
      })

      // Check if update was successful
      if (!result.success) {
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || JSON.stringify(result.error) || 'Échec de la modification de l\'immeuble'
        throw new Error(errorMessage)
      }

      // Show success toast
      toast({
        title: "✅ Immeuble modifié avec succès",
        description: `L'immeuble "${result.data.building.name}" a été mis à jour avec ${result.data.lots.length} lot(s).`,
        variant: "success",
      })

      // Redirect back to building details (toast will remain visible during navigation)
      router.push(`/gestionnaire/biens/immeubles/${buildingId}`)
      router.refresh()

    } catch (err) {
      logger.error("Error updating building:", err)
      setError(
        err instanceof Error
          ? `Erreur lors de la modification : ${err.message}`
          : "Une erreur est survenue lors de la modification de l'immeuble"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="layout-padding min-h-screen bg-background py-2 sm:py-3">
      {/* Header */}
      <StepProgressHeader
        title="Modifier l'immeuble"
        backButtonText="Retour"
        onBack={() => router.push(`/gestionnaire/biens/immeubles/${buildingId}`)}
        steps={buildingSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowFutureSteps={true}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4 mx-4 sm:mx-6 content-max-width xl:mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Building Information */}
      {currentStep === 1 && (
        <Card className="shadow-sm content-max-width">
          <CardContent className="p-6 space-y-6">
            <BuildingInfoForm
              buildingInfo={buildingInfo}
              setBuildingInfo={setBuildingInfo}
              teamManagers={teamManagers}
              userTeam={userTeam}
              isLoading={false}
              onCreateManager={openGestionnaireModal}
              showManagerSection={false}
              showAddressSection={true}
              entityType="immeuble"
              buildingId={buildingId}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Lots Configuration */}
      {currentStep === 2 && (
        <BuildingLotsStepV2
          lots={lots}
          expandedLots={expandedLots}
          buildingReference={buildingInfo.name}
          buildingAddress={buildingInfo.address}
          buildingPostalCode={buildingInfo.postalCode}
          buildingCity={buildingInfo.city}
          buildingCountry={buildingInfo.country}
          onAddLot={addLot}
          onUpdateLot={updateLot}
          onDuplicateLot={duplicateLot}
          onRemoveLot={removeLot}
          onToggleLotExpansion={toggleLotExpansion}
        />
      )}

      {/* Step 3: Contacts Assignment */}
      {currentStep === 3 && (
        <BuildingContactsStepV3
          buildingInfo={buildingInfo}
          teamManagers={teamManagers}
          buildingManagers={buildingManagers}
          userProfile={userProfile}
          userTeam={userTeam}
          lots={lots}
          expandedLots={expandedLots}
          buildingContacts={buildingContacts}
          lotContactAssignments={lotContactAssignments}
          assignedManagers={assignedManagers}
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
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <BuildingConfirmationStep
          buildingInfo={buildingInfo}
          buildingManagers={buildingManagers}
          buildingContacts={buildingContacts}
          lots={lots}
          lotContactAssignments={lotContactAssignments}
          assignedManagers={assignedManagers}
        />
      )}

      {/* Sticky Navigation */}
      <div className="sticky-footer mt-6">
        <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="w-full sm:w-auto"
              disabled={isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 2 && "Retour à l'immeuble"}
              {currentStep === 3 && "Étape précédente"}
              {currentStep === 4 && "Retour"}
            </Button>
          )}

          <Button
            onClick={() => {
              if (currentStep === 4) {
                handleSave()
              } else {
                setCurrentStep(currentStep + 1)
              }
            }}
            disabled={!canProceedToNextStep() || (currentStep === 4 && isSaving)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto ml-auto"
          >
            {isSaving && currentStep === 4 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {currentStep === 1 && "Continuer vers les lots"}
            {currentStep === 2 && "Continuer vers les contacts"}
            {currentStep === 3 && "Vérifier les modifications"}
            {currentStep === 4 && (isSaving ? "Enregistrement..." : "Enregistrer les modifications")}
            {currentStep < 4 && <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />}
          </Button>
        </div>
      </div>

      {/* Manager Assignment Modal */}
      <Dialog open={isManagerModalOpen} onOpenChange={setIsManagerModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Assigner un responsable spécifique au lot {selectedLotForManager && lots.find(l => l.id === selectedLotForManager)?.reference}
            </DialogTitle>
            <DialogDescription>
              Ce responsable recevra les notifications spécifiques à ce lot, en complément du responsable de l'immeuble
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {teamManagers.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {teamManagers.map((manager) => {
                    const isAlreadyAssigned = Boolean(selectedLotForManager &&
                      getAssignedManagers(selectedLotForManager).some(m => m.user.id === manager.user.id))

                    return (
                      <div
                        key={manager.user.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isAlreadyAssigned
                            ? 'bg-muted border-border opacity-60'
                            : 'hover:bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-100">
                            <UserIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium">{manager.user.name}</div>
                            <div className="text-sm text-muted-foreground">{manager.user.email}</div>
                            <div className="flex gap-1 mt-1">
                              {manager.user.id === userProfile.id && (
                                <Badge variant="outline" className="text-xs">Vous</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => selectedLotForManager && addManagerToLot(selectedLotForManager, manager)}
                          disabled={isAlreadyAssigned}
                          className={`${
                            isAlreadyAssigned
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                          size="sm"
                        >
                          {isAlreadyAssigned ? 'Déjà assigné' : 'Assigner'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/70" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  Aucun gestionnaire disponible
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aucun gestionnaire trouvé dans votre équipe
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between pt-4 border-t gap-3">
              <Button
                variant="ghost"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                onClick={openGestionnaireModal}
              >
                <Plus className="w-4 h-4" />
                Créer un nouveau responsable
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setIsManagerModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Building Manager Assignment Modal */}
      <Dialog open={isBuildingManagerModalOpen} onOpenChange={setIsBuildingManagerModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Ajouter un gestionnaire à l'immeuble
            </DialogTitle>
            <DialogDescription>
              Les gestionnaires de l'immeuble recevront les notifications de l'immeuble et de tous les lots
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {teamManagers.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {teamManagers.map((manager) => {
                    const isAlreadyAssigned = buildingManagers.some(m => m.user.id === manager.user.id)

                    return (
                      <div
                        key={manager.user.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isAlreadyAssigned
                            ? 'bg-muted border-border opacity-60'
                            : 'hover:bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{manager.user.name}</div>
                            <div className="text-sm text-muted-foreground">{manager.user.email}</div>
                            <div className="flex gap-1 mt-1">
                              {manager.user.id === userProfile.id && (
                                <Badge variant="outline" className="text-xs">Vous</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => addBuildingManager(manager)}
                          disabled={isAlreadyAssigned}
                          className={`${
                            isAlreadyAssigned
                              ? 'bg-gray-300 text-gray-500'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          size="sm"
                        >
                          {isAlreadyAssigned ? 'Déjà assigné' : 'Ajouter'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/70" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  Aucun gestionnaire disponible
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Aucun gestionnaire trouvé dans votre équipe
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between pt-4 border-t gap-3">
              <Button
                variant="ghost"
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
                onClick={openGestionnaireModal}
              >
                <Plus className="w-4 h-4" />
                Créer un nouveau responsable
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setIsBuildingManagerModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
