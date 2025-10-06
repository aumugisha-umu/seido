"use client"

/**
 * usePropertyCreation Hook - Centralized state management for property creation
 *
 * This hook encapsulates all business logic for building and lot creation,
 * providing a clean interface for components while maintaining type safety.
 */


import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import {
  createServerTeamService,
  createServerBuildingService,
  createServerLotService,
  createServerCompositeService,
  createServerContactInvitationService
} from "@/lib/services"
import { getLotCategoryConfig, getAllLotCategories } from "@/lib/lot-types"
import type {
import { logger, logError } from '@/lib/logger'
PropertyMode,
  PropertyFormData,
  BuildingFormData,
  LotFormData,
  NavigationState,
  TeamData,
  StepValidation,
  PropertyCreationActions,
  UsePropertyCreationReturn,
  PropertyCreationConfig,
  BuildingInfo,
  LotInfo,
  TeamManager,
  Contact,
  ValidationState,
  PropertyCreationResult
} from "@/components/property-creation/types"

const DEFAULT_BUILDING_INFO: BuildingInfo = {
  name: "",
  address: "",
  postalCode: "",
  city: "",
  country: "Belgique",
  constructionYear: "",
  floors: "",
  description: "",
}

const DEFAULT_LOT_INFO: LotInfo = {
  reference: "",
  floor: "0",
  doorNumber: "",
  description: "",
  category: "appartement",
}

const DEFAULT_CONTACT_ASSIGNMENTS = {
  tenant: [],
  provider: [],
  syndic: [],
  notary: [],
  insurance: [],
  other: [],
}

export function usePropertyCreation(config: PropertyCreationConfig): UsePropertyCreationReturn {
  const router = useRouter()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { data: managerData, forceRefetch: refetchManagerData } = useManagerStats()
  const { handleSuccess } = useCreationSuccess()

  // Services initialization
  const [services] = useState(() => ({
    team: createServerTeamService(),
    building: createServerBuildingService(),
    lot: createServerLotService(),
    composite: createServerCompositeService(),
    contactInvitation: createServerContactInvitationService(),
  }))

  // Core state
  const [formData, setFormData] = useState<PropertyFormData>(() => {
    if (config.mode === 'building') {
      const buildingData: BuildingFormData = {
        mode: 'building',
        currentStep: 1,
        buildingInfo: { ...DEFAULT_BUILDING_INFO },
        lots: [],
        selectedManagerId: "",
        buildingContacts: { ...DEFAULT_CONTACT_ASSIGNMENTS },
        lotContactAssignments: {},
        managerAssignments: {},
        ...config.initialData,
      }
      return buildingData
    } else {
      const lotData: LotFormData = {
        mode: config.mode,
        currentStep: 1,
        buildingAssociation: "existing",
        lotInfo: { ...DEFAULT_LOT_INFO },
        selectedManagerId: "",
        contactAssignments: { ...DEFAULT_CONTACT_ASSIGNMENTS },
        managerAssignments: [],
        ...config.initialData,
      }
      return lotData
    }
  })

  const [teamData, setTeamData] = useState<TeamData>({
    userTeam: null,
    teamManagers: [],
    selectedManagerId: "",
    categoryCountsByTeam: {},
    isLoading: false,
  })

  const [validation, setValidation] = useState<StepValidation>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Navigation state
  const navigation = useMemo<NavigationState>(() => {
    const totalSteps = config.mode === 'building' ? 4 : 4
    const currentStep = formData.currentStep

    return {
      currentStep,
      totalSteps,
      canGoNext: canProceedToNextStep(),
      canGoPrevious: currentStep > 1,
      isLoading: isLoading || isCreating,
      isCreating,
    }
  }, [formData.currentStep, isLoading, isCreating, config.mode])

  // Load team data and managers
  useEffect(() => {
    const loadTeamData = async () => {
      if (!user?.id || teamStatus !== 'verified') return

      try {
        setTeamData(prev => ({ ...prev, isLoading: true }))
        setError(null)

        // Load user teams
        const userTeams = await services.team.getUserTeams(user.id)
        if (userTeams.length === 0) {
          setError('Vous devez faire partie d\'une équipe pour créer des propriétés')
          return
        }

        const primaryTeam = userTeams[0]

        // Load team members
        let teamMembers = []
        try {
          teamMembers = await services.team.getMembers(primaryTeam.id)
        } catch (membersError) {
          logger.warn("Could not load team members:", membersError)
          teamMembers = []
        }

        // Filter managers
        const managers = teamMembers.filter((member) =>
          member.user && member.user.role === 'gestionnaire'
        )

        // Ensure current user is available if they're a manager
        const currentUserExists = managers.find((member) =>
          member.user.id === user.id
        )

        if (!currentUserExists && user.role === 'gestionnaire') {
          const currentUserAsManager = {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            },
            role: 'admin'
          }
          managers.push(currentUserAsManager)
        }

        // Load category counts for lot reference generation
        let categoryCountsByTeam = {}
        try {
          categoryCountsByTeam = await services.lot.getCountByCategory(primaryTeam.id)
        } catch (error) {
          logger.warn("Could not load category counts:", error)
        }

        // Select default manager
        const defaultManagerId = managers.find(m => m.user.id === user.id)?.user.id ||
                                 (managers.length > 0 ? managers[0].user.id : "")

        setTeamData({
          userTeam: primaryTeam,
          teamManagers: managers,
          selectedManagerId: defaultManagerId,
          categoryCountsByTeam,
          isLoading: false,
        })

        // Update form data with default manager
        if (defaultManagerId) {
          setFormData(prev => ({
            ...prev,
            selectedManagerId: defaultManagerId
          }))
        }

      } catch (err) {
        logger.error('Error loading team data:', err)
        setError('Erreur lors du chargement des gestionnaires')
        setTeamData(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadTeamData()
  }, [user?.id, teamStatus, services.team, services.lot])

  // Initialize building name with suggestions
  useEffect(() => {
    if (config.mode === 'building' && managerData?.buildings &&
        formData.mode === 'building' && !formData.buildingInfo.name) {
      const nextBuildingNumber = managerData.buildings.length + 1
      setFormData(prev => ({
        ...prev,
        buildingInfo: {
          ...(prev as BuildingFormData).buildingInfo,
          name: `Immeuble ${nextBuildingNumber}`
        }
      } as BuildingFormData))
    }
  }, [managerData?.buildings, formData, config.mode])

  // Auto-generate lot references based on category
  useEffect(() => {
    if (config.mode === 'building' && formData.mode === 'building') {
      const { lots } = formData as BuildingFormData
      const { categoryCountsByTeam } = teamData

      if (!categoryCountsByTeam || Object.keys(categoryCountsByTeam).length === 0) return

      const allCategories = getAllLotCategories()
      const categoryLabels = allCategories.map(cat => cat.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const generatedReferencePattern = new RegExp(`^(${categoryLabels.join('|')})\\s+\\d+$`)

      const lotsToUpdate: { id: string; newReference: string }[] = []

      lots.forEach(lot => {
        const category = lot.category || "appartement"
        const categoryConfig = getLotCategoryConfig(category)
        const lotsOfSameCategory = lots.filter(l => l.category === category)
        const currentCategoryCount = categoryCountsByTeam[category] || 0
        const lotIndex = lotsOfSameCategory.findIndex(l => l.id === lot.id)
        const nextNumber = currentCategoryCount + lotIndex + 1
        const newDefaultReference = `${categoryConfig.label} ${nextNumber}`

        const currentReference = lot.reference
        const isEmptyOrDefault = !currentReference || generatedReferencePattern.test(currentReference)

        if (isEmptyOrDefault && currentReference !== newDefaultReference) {
          lotsToUpdate.push({ id: lot.id!, newReference: newDefaultReference })
        }
      })

      if (lotsToUpdate.length > 0) {
        setFormData(prev => {
          const buildingData = prev as BuildingFormData
          return {
            ...buildingData,
            lots: buildingData.lots.map(lot => {
              const update = lotsToUpdate.find(u => u.id === lot.id)
              return update ? { ...lot, reference: update.newReference } : lot
            })
          }
        })
      }
    }
  }, [formData, teamData.categoryCountsByTeam, config.mode])

  // Validation functions
  const validateStep = useCallback((step: number): ValidationState => {
    const errors: Record<string, string> = {}
    const warnings: Record<string, string> = {}

    if (config.mode === 'building' && formData.mode === 'building') {
      const data = formData as BuildingFormData

      switch (step) {
        case 1:
          if (!data.buildingInfo.address.trim()) {
            errors.address = "L'adresse est requise"
          }
          if (!data.selectedManagerId) {
            errors.manager = "Veuillez sélectionner un responsable"
          }
          break
        case 2:
          if (data.lots.length === 0) {
            errors.lots = "Au moins un lot est requis"
          }
          break
        case 3:
          // Contact assignment is optional
          break
        case 4:
          // Final validation before submission
          if (!data.buildingInfo.address.trim()) {
            errors.address = "L'adresse est requise"
          }
          if (data.lots.length === 0) {
            errors.lots = "Au moins un lot est requis"
          }
          if (!data.selectedManagerId) {
            errors.manager = "Veuillez sélectionner un responsable"
          }
          if (!teamData.userTeam?.id) {
            errors.team = "Impossible de déterminer votre équipe"
          }
          break
      }
    } else if (formData.mode === 'lot' || formData.mode === 'independent') {
      const data = formData as LotFormData

      switch (step) {
        case 1:
          if (data.buildingAssociation === "existing" && !data.selectedBuilding) {
            errors.building = "Veuillez sélectionner un immeuble"
          }
          break
        case 2:
          if (data.buildingAssociation === "independent") {
            if (!data.independentProperty?.address?.trim()) {
              errors.address = "L'adresse est requise"
            }
            if (!data.independentProperty?.name?.trim()) {
              errors.name = "Le nom est requis"
            }
          } else {
            if (!data.lotInfo.reference.trim()) {
              errors.reference = "La référence du lot est requise"
            }
          }
          break
        case 3:
          // Contact assignment is optional
          break
        case 4:
          // Final validation
          if (data.buildingAssociation === "existing" && !data.selectedBuilding) {
            errors.building = "Veuillez sélectionner un immeuble"
          }
          if (!data.selectedManagerId) {
            errors.manager = "Veuillez sélectionner un responsable"
          }
          if (!teamData.userTeam?.id) {
            errors.team = "Impossible de déterminer votre équipe"
          }
          break
      }
    }

    const validationState: ValidationState = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
    }

    setValidation(prev => ({
      ...prev,
      [step]: validationState
    }))

    return validationState
  }, [formData, teamData.userTeam, config.mode])

  const canProceedToNextStep = useCallback((): boolean => {
    const currentStepValidation = validateStep(formData.currentStep)
    return currentStepValidation.isValid
  }, [formData.currentStep, validateStep])

  // Navigation actions
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      setFormData(prev => ({ ...prev, currentStep: step }))
    }
  }, [])

  const goNext = useCallback(() => {
    if (canProceedToNextStep() && formData.currentStep < 4) {
      // Special handling for lot creation with "new" building association
      if (formData.mode === 'lot' && formData.currentStep === 1) {
        const lotData = formData as LotFormData
        if (lotData.buildingAssociation === "new") {
          router.push("/gestionnaire/biens/immeubles/nouveau")
          return
        }
      }

      setFormData(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
    }
  }, [canProceedToNextStep, formData.currentStep, formData.mode, router])

  const goPrevious = useCallback(() => {
    if (formData.currentStep > 1) {
      setFormData(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
    }
  }, [formData.currentStep])

  // Form data update actions
  const updateBuildingInfo = useCallback((info: Partial<BuildingInfo>) => {
    if (formData.mode === 'building') {
      setFormData(prev => ({
        ...prev,
        buildingInfo: { ...(prev as BuildingFormData).buildingInfo, ...info }
      } as BuildingFormData))
    } else if (formData.mode === 'independent') {
      setFormData(prev => ({
        ...prev,
        independentProperty: { ...(prev as LotFormData).independentProperty, ...info }
      } as LotFormData))
    }
  }, [formData.mode])

  const addLot = useCallback(() => {
    if (formData.mode === 'building') {
      const data = formData as BuildingFormData
      const category = "appartement"
      const categoryConfig = getLotCategoryConfig(category)
      const currentCategoryCount = teamData.categoryCountsByTeam[category] || 0
      const nextNumber = currentCategoryCount + data.lots.filter(lot => lot.category === category).length + 1

      const newLot: LotInfo = {
        id: `lot${Date.now()}`,
        reference: `${categoryConfig.label} ${nextNumber}`,
        floor: "0",
        doorNumber: "",
        description: "",
        category: "appartement",
      }

      setFormData(prev => ({
        ...prev,
        lots: [newLot, ...(prev as BuildingFormData).lots]
      } as BuildingFormData))
    }
  }, [formData.mode, teamData.categoryCountsByTeam])

  const updateLot = useCallback((id: string, updates: Partial<LotInfo>) => {
    if (formData.mode === 'building') {
      setFormData(prev => ({
        ...prev,
        lots: (prev as BuildingFormData).lots.map(lot =>
          lot.id === id ? { ...lot, ...updates } : lot
        )
      } as BuildingFormData))
    }
  }, [formData.mode])

  const removeLot = useCallback((_id: string) => {
    if (formData.mode === 'building') {
      setFormData(prev => {
        const data = prev as BuildingFormData
        return {
          ...data,
          lots: data.lots.filter(lot => lot.id !== id),
          lotContactAssignments: Object.fromEntries(
            Object.entries(data.lotContactAssignments).filter(([lotId]) => lotId !== id)
          ),
          managerAssignments: Object.fromEntries(
            Object.entries(data.managerAssignments).filter(([lotId]) => lotId !== id)
          )
        }
      })
    }
  }, [formData.mode])

  const duplicateLot = useCallback((_id: string) => {
    if (formData.mode === 'building') {
      const data = formData as BuildingFormData
      const lotToDuplicate = data.lots.find(lot => lot.id === id)
      if (!lotToDuplicate) return

      const category = lotToDuplicate.category || "appartement"
      const categoryConfig = getLotCategoryConfig(category)
      const currentCategoryCount = teamData.categoryCountsByTeam[category] || 0
      const nextNumber = currentCategoryCount + data.lots.filter(lot => lot.category === category).length + 1

      const newLot: LotInfo = {
        ...lotToDuplicate,
        id: `lot${Date.now()}`,
        reference: `${categoryConfig.label} ${nextNumber}`,
      }

      setFormData(prev => ({
        ...prev,
        lots: [newLot, ...(prev as BuildingFormData).lots]
      } as BuildingFormData))
    }
  }, [formData.mode, teamData.categoryCountsByTeam])

  // Contact management actions
  const addContact = useCallback((contact: Contact, type: string, context?: { lotId?: string }) => {
    if (formData.mode === 'building') {
      setFormData(prev => {
        const data = prev as BuildingFormData
        if (context?.lotId) {
          return {
            ...data,
            lotContactAssignments: {
              ...data.lotContactAssignments,
              [context.lotId]: {
                ...data.lotContactAssignments[context.lotId],
                [type]: [...(data.lotContactAssignments[context.lotId]?.[type] || []), contact]
              }
            }
          }
        } else {
          return {
            ...data,
            buildingContacts: {
              ...data.buildingContacts,
              [type]: [...data.buildingContacts[type], contact]
            }
          }
        }
      })
    } else {
      setFormData(prev => ({
        ...prev,
        contactAssignments: {
          ...(prev as LotFormData).contactAssignments,
          [type]: [...(prev as LotFormData).contactAssignments[type], contact]
        }
      } as LotFormData))
    }
  }, [formData.mode])

  const removeContact = useCallback((contactId: string, type: string, context?: { lotId?: string }) => {
    if (formData.mode === 'building') {
      setFormData(prev => {
        const data = prev as BuildingFormData
        if (context?.lotId) {
          return {
            ...data,
            lotContactAssignments: {
              ...data.lotContactAssignments,
              [context.lotId]: {
                ...data.lotContactAssignments[context.lotId],
                [type]: (data.lotContactAssignments[context.lotId]?.[type] || []).filter(c => c.id !== contactId)
              }
            }
          }
        } else {
          return {
            ...data,
            buildingContacts: {
              ...data.buildingContacts,
              [type]: data.buildingContacts[type].filter(c => c.id !== contactId)
            }
          }
        }
      })
    } else {
      setFormData(prev => ({
        ...prev,
        contactAssignments: {
          ...(prev as LotFormData).contactAssignments,
          [type]: (prev as LotFormData).contactAssignments[type].filter(c => c.id !== contactId)
        }
      } as LotFormData))
    }
  }, [formData.mode])

  // Manager selection
  const selectManager = useCallback((_managerId: string) => {
    setFormData(prev => ({ ...prev, selectedManagerId: managerId }))
    setTeamData(prev => ({ ...prev, selectedManagerId: managerId }))
  }, [])

  const addLotManager = useCallback((lotId: string, manager: TeamManager) => {
    if (formData.mode === 'building') {
      setFormData(prev => {
        const data = prev as BuildingFormData
        const currentManagers = data.managerAssignments[lotId] || []
        const alreadyAssigned = currentManagers.some(m => m.user.id === manager.user.id)
        if (alreadyAssigned) return prev

        return {
          ...data,
          managerAssignments: {
            ...data.managerAssignments,
            [lotId]: [...currentManagers, manager]
          }
        }
      })
    }
  }, [formData.mode])

  const removeLotManager = useCallback((lotId: string, managerId: string) => {
    if (formData.mode === 'building') {
      setFormData(prev => {
        const data = prev as BuildingFormData
        return {
          ...data,
          managerAssignments: {
            ...data.managerAssignments,
            [lotId]: (data.managerAssignments[lotId] || []).filter(manager => manager.user.id !== managerId)
          }
        }
      })
    }
  }, [formData.mode])

  // Form submission
  const submit = useCallback(async (): Promise<void> => {
    if (!user?.id || !teamData.userTeam?.id) {
      setError("Vous devez être connecté et faire partie d'une équipe")
      return
    }

    const finalValidation = validateStep(4)
    if (!finalValidation.isValid) {
      setError("Veuillez corriger les erreurs avant de continuer")
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      let result: PropertyCreationResult

      if (formData.mode === 'building') {
        // Building creation logic
        const data = formData as BuildingFormData

        const buildingData = {
          name: data.buildingInfo.name.trim() || `Immeuble ${data.buildingInfo.address}`,
          address: data.buildingInfo.address.trim(),
          city: data.buildingInfo.city.trim() || "Non spécifié",
          country: data.buildingInfo.country.trim() || "BE",
          postal_code: data.buildingInfo.postalCode.trim() || "",
          description: data.buildingInfo.description.trim(),
          construction_year: data.buildingInfo.constructionYear ? parseInt(data.buildingInfo.constructionYear) : undefined,
          team_id: teamData.userTeam.id,
        }

        const lotsData = data.lots.map((lot) => ({
          reference: lot.reference.trim(),
          floor: lot.floor ? parseInt(lot.floor) : 0,
          apartment_number: lot.doorNumber.trim() || undefined,
          category: lot.category,
        }))

        const response = await services.composite.createCompleteProperty({
          building: buildingData,
          lots: lotsData,
          contacts: [], // TODO: Implement contact creation
          lotContactAssignments: [], // TODO: Implement contact assignments
        })

        // Verifier le succes de l'operation
        if (!response.success) {
          throw new Error(response.error || 'Échec de la création de l\'immeuble')
        }

        result = {
          building: response.data.building,
          lots: response.data.lots,
          success: true,
          message: `L'immeuble "${response.data.building.name}" avec ${response.data.lots.length} lot(s) a été créé.`,
        }

      } else {
        // Lot creation logic
        const data = formData as LotFormData

        const lotData = {
          reference: data.buildingAssociation === "independent"
            ? (data.independentProperty?.name || `Lot ${Date.now()}`)
            : (data.lotInfo.reference || `Lot ${Date.now()}`),
          building_id: (data.buildingAssociation === "existing" && data.selectedBuilding)
            ? data.selectedBuilding
            : null,
          floor: data.buildingAssociation === "independent"
            ? (data.independentProperty?.floor ? parseInt(data.independentProperty.floor) : 0)
            : (data.lotInfo.floor ? parseInt(data.lotInfo.floor) : 0),
          apartment_number: data.buildingAssociation === "independent"
            ? (data.independentProperty?.doorNumber || null)
            : (data.lotInfo.doorNumber || null),
          category: data.buildingAssociation === "independent"
            ? (data.independentProperty?.category || data.lotInfo.category)
            : data.lotInfo.category,
          team_id: teamData.userTeam.id,
        }

        const createdLot = await services.lot.create(lotData)

        result = {
          lots: [createdLot],
          success: true,
          message: `Le lot "${createdLot.reference}" a été créé.`,
        }
      }

      // Handle success
      if (config.onSuccess) {
        config.onSuccess(result)
      } else {
        await handleSuccess({
          successTitle: formData.mode === 'building' ? "Immeuble créé avec succès" : "Lot créé avec succès",
          successDescription: result.message,
          redirectPath: "/gestionnaire/biens",
          refreshData: refetchManagerData,
        })
      }

    } catch (err) {
      logger.error("Error creating property:", err)
      const errorMessage = err instanceof Error
        ? `Erreur lors de la création : ${err.message}`
        : "Une erreur est survenue lors de la création"

      setError(errorMessage)

      if (config.onError) {
        config.onError(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      setIsCreating(false)
    }
  }, [formData, teamData, user, validateStep, services, config, handleSuccess, refetchManagerData])

  // Validation utilities
  const validateForm = useCallback((): boolean => {
    for (let step = 1; step <= 4; step++) {
      const stepValidation = validateStep(step)
      if (!stepValidation.isValid) {
        return false
      }
    }
    return true
  }, [validateStep])

  const getStepValidation = useCallback((step: number): ValidationState => {
    return validation[step] || { isValid: true, errors: {}, warnings: {} }
  }, [validation])

  const resetForm = useCallback(() => {
    const initialFormData = config.mode === 'building'
      ? {
          mode: 'building' as const,
          currentStep: 1,
          buildingInfo: { ...DEFAULT_BUILDING_INFO },
          lots: [],
          selectedManagerId: teamData.selectedManagerId,
          buildingContacts: { ...DEFAULT_CONTACT_ASSIGNMENTS },
          lotContactAssignments: {},
          managerAssignments: {},
        }
      : {
          mode: config.mode,
          currentStep: 1,
          buildingAssociation: "existing" as const,
          lotInfo: { ...DEFAULT_LOT_INFO },
          selectedManagerId: teamData.selectedManagerId,
          contactAssignments: { ...DEFAULT_CONTACT_ASSIGNMENTS },
          managerAssignments: [],
        }

    setFormData(initialFormData)
    setValidation({})
    setError(null)
  }, [config.mode, teamData.selectedManagerId])

  // Actions object
  const actions = useMemo<PropertyCreationActions>(() => ({
    goToStep,
    goNext,
    goPrevious,
    updateBuildingInfo,
    addLot,
    updateLot,
    removeLot,
    duplicateLot,
    addContact,
    removeContact,
    selectManager,
    addLotManager,
    removeLotManager,
    submit,
    validateStep,
    validateForm,
  }), [
    goToStep, goNext, goPrevious, updateBuildingInfo, addLot, updateLot, removeLot, duplicateLot,
    addContact, removeContact, selectManager, addLotManager, removeLotManager, submit, validateStep, validateForm
  ])

  return {
    formData,
    navigation,
    teamData,
    validation,
    actions,
    isLoading: teamData.isLoading,
    error,
    canProceedToNextStep,
    getStepValidation,
    resetForm,
  }
}