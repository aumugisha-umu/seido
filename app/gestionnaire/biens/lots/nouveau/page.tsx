"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Home, Users, ArrowLeft, ArrowRight, Plus, X, User, MapPin, FileText, Building2, Check, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import ContactFormModal from "@/components/contact-form-modal"
import { BuildingInfoForm } from "@/components/building-info-form"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import PropertySelector from "@/components/property-selector"
import { BuildingLotsStepV2 } from "@/components/building-lots-step-v2"
import { BuildingContactsStepV2 } from "@/components/building-contacts-step-v2"
import { BuildingConfirmationStep } from "@/components/building-confirmation-step"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { TeamCheckModal } from "@/components/team-check-modal"
import { createTeamService, createLotService, createContactInvitationService } from "@/lib/services"
import type { Team } from "@/lib/services/core/service-types"
import { useToast } from "@/hooks/use-toast"
import { assignContactToLotAction, createLotAction, createContactWithOptionalInviteAction } from "./actions"


import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { lotSteps } from "@/lib/step-configurations"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import type { CreateContactData } from "@/app/gestionnaire/dashboard/actions"


import { LotCategory, getLotCategoryConfig, getAllLotCategories } from "@/lib/lot-types"
import { logger, logError } from '@/lib/logger'
interface TeamManager {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  role: string
}

interface LotData {
  // Step 1: Building Association
  buildingAssociation: "existing" | "new" | "independent"
  selectedBuilding?: string
  newBuilding?: {
    name: string
    address: string
    postalCode: string
    city: string
    country: string
    description: string
  }
  independentAddress?: string
  
  // General Building Information (for Step 2)
  generalBuildingInfo?: {
    name: string
    address: string
    postalCode: string
    city: string
    country: string
    description: string
    // Champs spécifiques aux lots
    floor?: string
    doorNumber?: string
    category?: LotCategory
  }

  // Step 2: Lot Details
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory

  // Step 3: Contacts
  assignedContacts: {
    tenant: { id: string; name: string; email: string; type: string }[]
    provider: { id: string; name: string; email: string; type: string }[]
    owner: { id: string; name: string; email: string; type: string }[]
    other: { id: string; name: string; email: string; type: string }[]
  }
  
  // Step 3: Gestionnaires spécifiques du lot
  assignedLotManagers?: { id: string; name: string; email: string; role: string }[]
}

export default function NewLotPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { handleSuccess } = useCreationSuccess()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { data: managerData, forceRefetch: refetchManagerData } = useManagerStats()
  const [currentStep, setCurrentStep] = useState(1)
  
  // États pour la gestion des gestionnaires de lot
  const [isLotManagerModalOpen, setIsLotManagerModalOpen] = useState(false)
  const [isGestionnaireModalOpen, setIsGestionnaireModalOpen] = useState(false)
  
  // États pour les informations générales de l'immeuble (étape 2)
  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [teamManagers, setTeamManagers] = useState<TeamManager[]>([])
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryCountsByTeam, setCategoryCountsByTeam] = useState<Record<string, number>>({})
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string>("")
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  const [lotData, setLotData] = useState<LotData>({
    buildingAssociation: "existing",
    reference: "",
    floor: "",
    doorNumber: "",
    description: "",
    category: "appartement",
    assignedContacts: {
      tenant: [],
      provider: [],
      syndic: [],
      notary: [],
      insurance: [],
      other: [],
    },
    assignedLotManagers: [],
    newBuilding: {
      name: "",
      address: "",
      postalCode: "",
      city: "",
      country: "Belgique",
      description: "",
    },
    generalBuildingInfo: {
      name: "", // Sera initialisé avec la référence par défaut
      address: "",
      postalCode: "",
      city: "",
      country: "Belgique",
      description: "",
      // Champs spécifiques aux lots
      floor: "",
      doorNumber: "",
      category: "appartement",
    },
  })

  // Flag to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)

  // ✅ Pre-fill detection
  const searchParams = useSearchParams()
  const [isPreFilled, setIsPreFilled] = useState(false)

  // ✅ Multi-lots state (pour mode "existing building")
  const [lots, setLots] = useState<Array<{
    id: string
    reference: string
    floor: string
    doorNumber: string
    description: string
    category: LotCategory
  }>>([])
  const [expandedLots, setExpandedLots] = useState<{[key: string]: boolean}>({})
  const [lotContactAssignments, setLotContactAssignments] = useState<{
    [lotId: string]: {
      [contactType: string]: { id: string; name: string; email: string; type: string }[]
    }
  }>({})
  const [assignedManagersByLot, setAssignedManagersByLot] = useState<{
    [lotId: string]: { id: string; name: string; email: string; role: string }[]
  }>({})
  const [buildingContacts, setBuildingContacts] = useState<{
    [type: string]: { id: string; name: string; email: string; type: string }[]
  }>({})

  // ✅ NEW: Lazy service initialization - Services créés uniquement quand auth est prête
  const [services, setServices] = useState<{
    team: ReturnType<typeof createTeamService> | null
    lot: ReturnType<typeof createLotService> | null
    contactInvitation: ReturnType<typeof createContactInvitationService> | null
  } | null>(null)

  // Step 1: Créer les services quand l'auth est prête
  useEffect(() => {
    if (!user) {
      logger.info("❌ [SERVICE-INIT] No user, skipping service creation")
      return
    }
    if (services) {
      logger.info("✅ [SERVICE-INIT] Services already initialized")
      return
    }

    logger.info("🔧 [SERVICE-INIT] Auth ready, creating services now...")
    setServices({
      team: createTeamService(),
      lot: createLotService(),
      contactInvitation: createContactInvitationService()
    })
    logger.info("✅ [SERVICE-INIT] Services created successfully")
  }, [user, services])

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Charger l'équipe de l'utilisateur et ses gestionnaires
  useEffect(() => {
    logger.info("🔐 useAuth hook user state:", user)

    const loadUserTeamAndManagers = async () => {
      // ✅ Check services are ready
      if (!services) {
        logger.info("⏳ [DATA-LOAD] Services not yet initialized, waiting...")
        return
      }

      if (!user?.id || teamStatus !== 'verified') {
        logger.info("⚠️ User ID not found or team not verified, skipping team loading")
        return
      }

      try {
        logger.info("📡 Loading user teams for user:", user.id)
        setIsLoading(true)
        setError("")

        // 1. Récupérer les équipes de l'utilisateur
        const teamsResult = await services.team.getUserTeams(user.id)
        const userTeams = teamsResult?.data || []
        logger.info("✅ User teams loaded:", userTeams)
        setTeams(userTeams)

        if (userTeams.length === 0) {
          setError('Vous devez faire partie d\'une équipe pour créer des lots')
          return
        }

        // 2. Prendre la première équipe (un gestionnaire n'a normalement qu'une équipe)
        const primaryTeam = userTeams[0]
        setUserTeam(primaryTeam)
        logger.info("🏢 Primary team:", primaryTeam.name)

        // 3. Récupérer les membres de cette équipe
        logger.info("👥 Loading team members for team:", primaryTeam.id)
        let teamMembers = []
        try {
          const membersResult = await services.team.getTeamMembers(primaryTeam.id)
          teamMembers = membersResult?.data || []
          logger.info("✅ Team members loaded:", teamMembers)
        } catch (membersError) {
          logger.error("❌ Error loading team members:", membersError)
          teamMembers = [] // Continue avec un tableau vide
        }
        
        // 4. Filtrer pour ne garder que les gestionnaires
        const managers = teamMembers.filter((member: TeamManager) => 
          member.user && member.user.role === 'gestionnaire'
        )
        logger.info("👑 Managers in team:", managers)
        
        // 5. TOUJOURS s'assurer que l'utilisateur actuel est disponible s'il est gestionnaire
        const currentUserExists = managers.find((member: TeamManager) => 
          member.user.id === user.id
        )
        
        if (!currentUserExists && user.role === 'gestionnaire') {
          logger.info("🔧 Adding current user as available manager (creator/admin)")
          const currentUserAsManager = {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            },
            role: 'admin' // Le créateur de l'équipe est admin
          }
          managers.push(currentUserAsManager)
        }
        
        logger.info("📋 Final managers list:", managers)
        setTeamManagers(managers)
        
        // 6. Sélectionner l'utilisateur actuel par défaut s'il est gestionnaire
        const currentUserAsMember = managers.find((member: TeamManager) => 
          member.user.id === user.id
        )
        
        if (currentUserAsMember) {
          logger.info("🎯 Auto-selecting current user as manager:", user.id)
          setSelectedManagerId(user.id)
        } else if (managers.length > 0) {
          logger.info("🎯 Auto-selecting first available manager:", managers[0].user.id)
          setSelectedManagerId(managers[0].user.id)
        }
        
      } catch (err) {
        logger.error('❌ Error loading teams and managers:', err)
        logger.error('❌ Full error object:', JSON.stringify(err, null, 2))
        setError('Erreur lors du chargement des gestionnaires')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserTeamAndManagers()
  }, [services, user?.id, teamStatus, user])

  // Récupérer les comptages par catégorie quand l'équipe est chargée
  useEffect(() => {
    const loadCategoryCountsByTeam = async () => {
      // ✅ Check services are ready
      if (!services) {
        logger.info("⏳ Services not ready, cannot load category counts")
        return
      }

      if (!userTeam?.id) {
        logger.info("⚠️ No team available, skipping category counts loading")
        return
      }

      try {
        logger.info("📊 Loading lot counts by category for team:", userTeam.id)
        const result = await services.lot.getLotStatsByCategory(userTeam.id)
        if (result.success) {
          logger.info("✅ Category counts loaded:", result.data)
          setCategoryCountsByTeam(result.data || {})
        } else {
          logger.error("❌ Error loading category counts:", result.error)
          setCategoryCountsByTeam({})
        }
      } catch (error) {
        logger.error("❌ Error loading category counts:", error)
        setCategoryCountsByTeam({}) // Valeur par défaut en cas d'erreur
      }
    }

    loadCategoryCountsByTeam()
  }, [services, userTeam?.id])

  // ✅ NEW: Pré-remplissage depuis immeuble (gestionnaire)
  useEffect(() => {
    if (!services || isPreFilled) {
      return
    }

    const buildingId = searchParams.get("buildingId")
    if (buildingId) {
      logger.info("🏢 [PRE-FILL] Pre-filling with building:", buildingId)

      // Sélectionner "existing" + immeuble
      setLotData(prev => ({
        ...prev,
        buildingAssociation: "existing",
        selectedBuilding: buildingId
      }))

      // Passer à l'étape 2
      setCurrentStep(2)
      setIsPreFilled(true)

      logger.info("✅ [PRE-FILL] Building pre-selected, moved to step 2")
    }
  }, [services, searchParams, isPreFilled])

  // Réinitialiser le nom quand on change le type d'association
  useEffect(() => {
    // Si on passe d'un type à l'autre, réinitialiser le nom pour éviter les conflits
    if (lotData.generalBuildingInfo?.name) {
      const currentName = lotData.generalBuildingInfo.name.toLowerCase()
      const shouldReset = 
        (lotData.buildingAssociation === "independent" && currentName.startsWith('immeuble')) ||
        (lotData.buildingAssociation === "existing") // Toujours réinitialiser pour "existing" car pas de formulaire building-info
      
      if (shouldReset) {
        setLotData(prev => ({
          ...prev,
          generalBuildingInfo: {
            ...prev.generalBuildingInfo!,
            name: ""
          }
        }))
      }
    }
  }, [lotData.buildingAssociation, lotData.generalBuildingInfo?.name])

  // Initialiser la référence par défaut pour les nouveaux immeubles
  // Note: Désactivé car l'option "new" redirige maintenant vers la page de création d'immeuble

  // Initialiser et mettre à jour automatiquement la référence du lot
  useEffect(() => {
    if (!categoryCountsByTeam || Object.keys(categoryCountsByTeam).length === 0) {
      return // Attendre que les données de catégorie soient chargées
    }

    // Générer la nouvelle référence par défaut basée sur la catégorie actuelle
    const category = lotData.category || "appartement"
    const categoryConfig = getLotCategoryConfig(category)
    const currentCategoryCount = categoryCountsByTeam[category] || 0
    const nextNumber = currentCategoryCount + 1
    const newDefaultReference = `${categoryConfig.label} ${nextNumber}`
    
    // Vérifier si la référence actuelle est vide ou correspond à une référence générée par défaut
    const currentReference = lotData.reference
    
    // Créer dynamiquement le pattern basé sur tous les labels de catégorie possibles
    const allCategories = getAllLotCategories()
    const categoryLabels = allCategories.map(cat => cat.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const generatedReferencePattern = new RegExp(`^(${categoryLabels.join('|')})\\s+\\d+$`)
    const isEmptyOrDefault = !currentReference || generatedReferencePattern.test(currentReference)

    // Ne mettre à jour que si la référence est vide ou générée par défaut
    if (isEmptyOrDefault && currentReference !== newDefaultReference) {
      setLotData(prev => ({
        ...prev,
        reference: newDefaultReference
      }))
    }
  }, [lotData.category, categoryCountsByTeam, lotData.reference])


  // Afficher la vérification d'équipe si nécessaire
  // Only show TeamCheckModal after client-side hydration to prevent mismatch
  if (isMounted && (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam))) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  // Générer référence par défaut basée sur la catégorie du lot
  const generateDefaultReference = () => {
    if (!categoryCountsByTeam || Object.keys(categoryCountsByTeam).length === 0) {
      // Fallback si les données de catégorie ne sont pas encore chargées
      return "Appartement 1"
    }
    
    const category = lotData.category || "appartement"
    const categoryConfig = getLotCategoryConfig(category)
    const currentCategoryCount = categoryCountsByTeam[category] || 0
    const nextNumber = currentCategoryCount + 1
    return `${categoryConfig.label} ${nextNumber}`
  }

  // ✅ Initialisation automatique du premier lot (pour mode "existing building")
  useEffect(() => {
    if (currentStep === 2 &&
        lotData.buildingAssociation === "existing" &&
        lots.length === 0 &&
        categoryCountsByTeam && Object.keys(categoryCountsByTeam).length > 0) {

      logger.info("🏠 [MULTI-LOT] Auto-initializing first lot...")

      const category: LotCategory = "appartement"
      const categoryConfig = getLotCategoryConfig(category)
      const currentCategoryCount = categoryCountsByTeam[category] || 0
      const nextNumber = currentCategoryCount + 1

      const initialLot = {
        id: "lot1",
        reference: `${categoryConfig.label} ${nextNumber}`,
        floor: "0",
        doorNumber: "",
        description: "",
        category
      }

      setLots([initialLot])
      setExpandedLots({ [initialLot.id]: true })

      logger.info("✅ [MULTI-LOT] First lot initialized:", initialLot.reference)
    }
  }, [currentStep, lotData.buildingAssociation, lots.length, categoryCountsByTeam])

  // ✅ Récupération des contacts de l'immeuble sélectionné
  useEffect(() => {
    if (lotData.selectedBuilding && lotData.buildingAssociation === "existing" && services?.lot) {
      const fetchBuildingContacts = async () => {
        try {
          logger.info("📞 [BUILDING-CONTACTS] Fetching contacts for building:", lotData.selectedBuilding)

          // TODO: Récupérer les contacts de l'immeuble depuis le service
          // Pour l'instant, on initialise vide
          // const result = await services.building.getBuildingWithContacts(lotData.selectedBuilding)
          // if (result.success) {
          //   setBuildingContacts(result.data.contacts)
          // }

          setBuildingContacts({})
          logger.info("✅ [BUILDING-CONTACTS] Building contacts loaded")
        } catch (error) {
          logger.error("❌ [BUILDING-CONTACTS] Error fetching building contacts:", error)
        }
      }

      fetchBuildingContacts()
    }
  }, [lotData.selectedBuilding, lotData.buildingAssociation, services])

  // ✅ Ouvrir tous les lots à l'étape 3 (contacts)
  useEffect(() => {
    if (currentStep === 3 && lotData.buildingAssociation === "existing" && lots.length > 0) {
      const allExpanded: {[key: string]: boolean} = {}
      lots.forEach(lot => {
        allExpanded[lot.id] = true
      })
      setExpandedLots(allExpanded)
      logger.info("📂 [MULTI-LOT] All lots expanded for contact assignment")
    }
  }, [currentStep, lotData.buildingAssociation, lots])

  // ========================================
  // Fonctions de gestion multi-lots
  // ========================================

  const addLot = () => {
    if (lotData.buildingAssociation !== "existing") return

    const category: LotCategory = "appartement"
    const categoryConfig = getLotCategoryConfig(category)
    const currentCategoryCount = categoryCountsByTeam[category] || 0
    const existingLotsOfCategory = lots.filter(l => l.category === category).length
    const nextNumber = currentCategoryCount + existingLotsOfCategory + 1

    const newLot = {
      id: `lot${Date.now()}`,
      reference: `${categoryConfig.label} ${nextNumber}`,
      floor: "0",
      doorNumber: "",
      description: "",
      category
    }

    // Ajouter en haut de liste
    setLots([newLot, ...lots])

    // Ouvrir seulement le nouveau lot
    setExpandedLots({ [newLot.id]: true })

    logger.info("➕ [MULTI-LOT] Lot added:", newLot.reference)
  }

  const duplicateLot = (lotId: string) => {
    const lotToDuplicate = lots.find(lot => lot.id === lotId)
    if (!lotToDuplicate) return

    const newLot = {
      ...lotToDuplicate,
      id: `lot${Date.now()}`,
      reference: `${lotToDuplicate.reference} (copie)`
    }

    setLots([newLot, ...lots])
    setExpandedLots({ [newLot.id]: true })

    logger.info("📋 [MULTI-LOT] Lot duplicated:", newLot.reference)
  }

  const removeLot = (lotId: string) => {
    if (lots.length <= 1) {
      toast({
        title: "⚠️ Impossible de supprimer",
        description: "Au moins un lot est requis",
        variant: "destructive"
      })
      return
    }

    setLots(lots.filter(lot => lot.id !== lotId))

    // Nettoyer les états associés
    const newExpandedLots = {...expandedLots}
    delete newExpandedLots[lotId]
    setExpandedLots(newExpandedLots)

    const newContactAssignments = {...lotContactAssignments}
    delete newContactAssignments[lotId]
    setLotContactAssignments(newContactAssignments)

    const newManagerAssignments = {...assignedManagersByLot}
    delete newManagerAssignments[lotId]
    setAssignedManagersByLot(newManagerAssignments)

    logger.info("🗑️ [MULTI-LOT] Lot removed:", lotId)
  }

  const updateLot = (lotId: string, field: keyof typeof lots[0], value: string) => {
    setLots(lots.map(lot => {
      if (lot.id === lotId) {
        const updatedLot = { ...lot, [field]: value }

        // Si la catégorie change, recalculer la référence
        if (field === 'category') {
          const categoryConfig = getLotCategoryConfig(value as LotCategory)
          const currentCategoryCount = categoryCountsByTeam[value] || 0
          const existingLotsOfCategory = lots.filter(l => l.category === value && l.id !== lotId).length
          const nextNumber = currentCategoryCount + existingLotsOfCategory + 1
          updatedLot.reference = `${categoryConfig.label} ${nextNumber}`
        }

        return updatedLot
      }
      return lot
    }))
  }

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }))
  }

  const handleNext = () => {
    // Si on est à l'étape 1 et qu'on a choisi de créer un nouvel immeuble, rediriger
    if (currentStep === 1 && lotData.buildingAssociation === "new") {
      logger.info("🏗️ Redirecting to building creation...")
      router.push("/gestionnaire/biens/immeubles/nouveau")
      return
    }
    
    // Sinon, navigation normale
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      if (!user?.id) {
        logger.error("❌ User not found")
        toast({
          title: "Erreur d'authentification",
          description: "Utilisateur non connecté. Veuillez vous reconnecter.",
          variant: "destructive",
        })
        return
      }

    if (!userTeam?.id) {
      logger.error("❌ User team not found. User ID:", user.id, "TeamStatus:", teamStatus, "Teams:", teams)
      toast({
        title: "Erreur d'équipe",
        description: "Aucune équipe n'a été trouvée pour votre compte. Veuillez contacter un administrateur.",
        variant: "destructive",
      })
      return
    }

    // 🆕 MODE MULTI-LOTS pour immeuble existant
    if (lotData.buildingAssociation === "existing" && lots.length > 0) {
      try {
        logger.info(`🚀 Creating ${lots.length} lots for building:`, lotData.selectedBuilding)

        // Créer tous les lots en parallèle
        const lotCreationPromises = lots.map(async (lot) => {
          try {
            const lotDataToCreate = {
              reference: lot.reference,
              building_id: lotData.selectedBuilding || null,
              floor: parseInt(String(lot.floor)) || 0,
              apartment_number: lot.doorNumber || null,
              category: lot.category,
              description: lot.description || null,
              team_id: userTeam.id,
            }

            const result = await createLotAction(lotDataToCreate)

            if (!result.success || !result.data) {
              logger.error(`❌ Failed to create lot ${lot.reference}:`, result.error)
              return null
            }

            return { lot, createdLot: result.data }
          } catch (error) {
            logger.error(`❌ Error creating lot ${lot.reference}:`, error)
            return null
          }
        })

        const creationResults = await Promise.all(lotCreationPromises)
        const successfulCreations = creationResults.filter(result => result !== null) as Array<{lot: typeof lots[0], createdLot: any}>

        logger.info(`✅ Created ${successfulCreations.length}/${lots.length} lots`)

        // Assigner les contacts et managers à chaque lot créé
        for (const { lot, createdLot } of successfulCreations) {
          // Assigner les managers spécifiques du lot
          const lotManagers = assignedManagersByLot[lot.id] || []
          if (lotManagers.length > 0) {
            logger.info(`👥 Assigning ${lotManagers.length} managers to lot ${lot.reference}`)

            const managerPromises = lotManagers.map(async (manager, index) => {
              try {
                return await assignContactToLotAction(
                  createdLot.id,
                  manager.id,
                  index === 0 // Premier = principal
                )
              } catch (error) {
                logger.error(`❌ Error assigning manager ${manager.name}:`, error)
                return null
              }
            })

            await Promise.all(managerPromises)
          }

          // Assigner les contacts du lot
          const lotContacts = lotContactAssignments[lot.id] || {}
          const totalContacts = Object.values(lotContacts).flat().length

          if (totalContacts > 0) {
            logger.info(`📞 Assigning ${totalContacts} contacts to lot ${lot.reference}`)

            const contactPromises = Object.entries(lotContacts).flatMap(([contactType, contacts]) =>
              contacts.map(async (contact: any, index: number) => {
                try {
                  return await assignContactToLotAction(
                    createdLot.id,
                    contact.id,
                    index === 0 // Premier de chaque type = principal
                  )
                } catch (error) {
                  logger.error(`❌ Error assigning contact ${contact.name}:`, error)
                  return null
                }
              })
            )

            await Promise.all(contactPromises)
          }
        }

        // Succès - Rediriger vers la page de l'immeuble
        await handleSuccess({
          successTitle: `${successfulCreations.length} lot${successfulCreations.length > 1 ? 's créés' : ' créé'} avec succès`,
          successDescription: `Les lots ont été créés et assignés à l'immeuble.`,
          redirectPath: `/gestionnaire/biens/immeubles/${lotData.selectedBuilding}`,
          refreshData: refetchManagerData,
        })

        return
      } catch (error) {
        logger.error("❌ Error in multi-lot creation:", error)
        toast({
          title: "Erreur lors de la création des lots",
          description: "Une erreur est survenue. Veuillez réessayer.",
          variant: "destructive",
        })
        return
      }
    }

    // MODE CLASSIQUE - Création d'un seul lot (independent ou new)
    try {
      logger.info("🚀 Creating lot with data:", lotData)
      
      const lotDataToCreate = {
        reference: lotData.buildingAssociation === "independent"
          ? (lotData.generalBuildingInfo?.name || `Lot ${Date.now()}`)
          : (lotData.reference || `Lot ${Date.now()}`),
        building_id: (lotData.buildingAssociation === "existing" && lotData.selectedBuilding)
          ? (typeof lotData.selectedBuilding === 'string' ? lotData.selectedBuilding : (lotData.selectedBuilding as {id: string})?.id)
          : null,
        floor: lotData.buildingAssociation === "independent"
          ? (lotData.generalBuildingInfo?.floor ? parseInt(String(lotData.generalBuildingInfo.floor)) : 0)
          : (lotData.floor ? parseInt(String(lotData.floor)) : 0),
        apartment_number: lotData.buildingAssociation === "independent"
          ? (lotData.generalBuildingInfo?.doorNumber || null)
          : (lotData.doorNumber || null),
        category: lotData.buildingAssociation === "independent"
          ? (lotData.generalBuildingInfo?.category || lotData.category)
          : lotData.category,
        description: lotData.buildingAssociation === "independent"
          ? (lotData.generalBuildingInfo?.description || null)
          : (lotData.description || null),
        team_id: userTeam.id,
        // Note: surface_area et rooms supprimés - colonnes inexistantes dans la DB
      }

      // Créer le lot via Server Action pour avoir le bon contexte d'authentification
      const result = await createLotAction(lotDataToCreate)

      if (!result.success || !result.data) {
        logger.error("❌ Lot creation failed:", result.error)
        toast({
          title: "Erreur lors de la création du lot",
          description: result.error?.message || "Une erreur est survenue",
          variant: "destructive",
        })
        return
      }

      const createdLot = result.data
      logger.info("✅ Lot created successfully:", createdLot)

      // Assigner les gestionnaires au lot via lot_contacts si des gestionnaires ont été sélectionnés
      if (lotData.assignedLotManagers && lotData.assignedLotManagers.length > 0) {
        logger.info("👥 Assigning managers to lot via lot_contacts:", lotData.assignedLotManagers)
        
        // Assigner tous les gestionnaires via lot_contacts
        const managerAssignmentPromises = lotData.assignedLotManagers.map(async (manager, index) => {
          try {
            const isPrincipal = index === 0
            logger.info(`📝 Assigning manager ${manager.name} (${manager.id}) to lot ${createdLot.id} as ${isPrincipal ? 'principal' : 'additional'}`)
            return await assignContactToLotAction(
              createdLot.id,
              manager.id,
              isPrincipal // Le premier est principal, les autres sont additionnels
            )
          } catch (error) {
            logger.error(`❌ Error assigning manager ${manager.name} to lot:`, error)
            return null
          }
        })

        const assignmentResults = await Promise.all(managerAssignmentPromises)
        const successfulAssignments = assignmentResults.filter((result: unknown) => result !== null)
        
        logger.info("✅ Manager assignments completed:", {
          total: lotData.assignedLotManagers.length,
          successful: successfulAssignments.length,
          principalManager: lotData.assignedLotManagers[0].name,
          additionalManagers: successfulAssignments.length - 1
        })
      }

      // Assigner les contacts sélectionnés au lot
      const totalContacts = Object.values(lotData.assignedContacts).flat().length
      if (totalContacts > 0) {
        logger.info("👥 Assigning selected contacts to lot:", totalContacts, "contacts")
        
        // Créer les promesses d'assignation pour tous les types de contacts
        const contactAssignmentPromises = Object.entries(lotData.assignedContacts).flatMap(([contactType, contacts]) => 
          contacts.map(async (contact, index) => {
            try {
              const isPrimary = index === 0 // Le premier contact de chaque type est principal
              logger.info(`📝 Assigning ${contactType} contact ${contact.name} (${contact.id}) to lot ${createdLot.id}`)
              return await assignContactToLotAction(
                createdLot.id,
                contact.id,
                isPrimary
              )
            } catch (error) {
              logger.error(`❌ Error assigning ${contactType} contact ${contact.name} to lot:`, error)
              return null
            }
          })
        )

        const contactAssignmentResults = await Promise.all(contactAssignmentPromises)
        const successfulContactAssignments = contactAssignmentResults.filter((result: unknown) => result !== null)
        
        logger.info("✅ Contact assignments completed:", {
          total: totalContacts,
          successful: successfulContactAssignments.length,
          failed: totalContacts - successfulContactAssignments.length
        })
      }

      // Gérer le succès avec la nouvelle stratégie
      await handleSuccess({
        successTitle: "Lot créé avec succès",
        successDescription: `Le lot "${createdLot.reference}" a été créé et assigné à votre équipe.`,
        redirectPath: "/gestionnaire/biens",
        refreshData: refetchManagerData,
      })
      
    } catch (error) {
      logger.error("❌ Error creating lot:", error)
      toast({
        title: "Erreur lors de la création",
        description: "Une erreur est survenue lors de la création du lot. Veuillez réessayer.",
        variant: "destructive",
      })
    }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Fonction pour ouvrir le modal de création de gestionnaire
  const openGestionnaireModal = () => {
    setIsGestionnaireModalOpen(true)
  }

  // Fonction pour gérer la création d'un nouveau gestionnaire
  const handleGestionnaireCreated = async (contactData: CreateContactData) => {
    try {
      logger.info("🆕 Création d'un nouveau gestionnaire:", contactData)
      
      if (!userTeam?.id) {
        logger.error("❌ No team found for user")
        return
      }

      // Utiliser la Server Action pour créer le gestionnaire avec le bon contexte d'authentification
      const result = await createContactWithOptionalInviteAction({
        type: 'gestionnaire',
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        address: contactData.address,
        speciality: contactData.speciality,
        notes: contactData.notes,
        inviteToApp: contactData.inviteToApp,
        teamId: userTeam.id
      })

      if (!result.success || !result.data) {
        logger.error("❌ Failed to create manager:", result.error)
        toast({
          title: "Erreur lors de la création du gestionnaire",
          description: typeof result.error === 'string' ? result.error : "Une erreur est survenue",
          variant: "destructive",
        })
        return
      }

      // Si l'invitation a réussi, l'utilisateur sera créé avec les bonnes permissions
      // Créer l'objet manager pour l'état local avec l'ID réel du contact
      const newManager = {
        user: {
          id: result.data.contact.id, // Utiliser l'ID réel du contact
          name: result.data.contact.name,
          email: result.data.contact.email,
          role: 'gestionnaire'
        },
        role: 'gestionnaire' // Aligné avec user.role et team_member_role enum
      }

      setTeamManagers([...teamManagers, newManager])
      setIsGestionnaireModalOpen(false)

      logger.info("✅ Gestionnaire créé avec succès, ID:", result.data.contact.id)
      
    } catch (error) {
      logger.error("❌ Erreur lors de la création du gestionnaire:", error)
    }
  }

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      if (lotData.buildingAssociation === "existing") {
        return lotData.selectedBuilding !== undefined
      } else if (lotData.buildingAssociation === "new") {
        return true // Toujours permettre de passer à l'étape suivante (redirection)
      } else {
        return true // Lot indépendant
      }
    }
    if (currentStep === 2) {
      // Si lot indépendant, vérifier les informations générales
      if (lotData.buildingAssociation === "independent") {
        const addressValid = lotData.generalBuildingInfo?.address && lotData.generalBuildingInfo.address.trim() !== ""
        const referenceValid = lotData.generalBuildingInfo?.name && lotData.generalBuildingInfo.name.trim() !== ""
        
        // Pour les lots indépendants, vérifier aussi les champs spécifiques aux lots
        const lotSpecificFieldsValid = Boolean(
          lotData.generalBuildingInfo?.floor !== undefined
        )
        return addressValid && referenceValid && lotSpecificFieldsValid
      } else {
        // Pour les lots liés à un immeuble existant ou nouveau, vérifier les détails du lot
        const lotDetailsValid = lotData.reference && lotData.reference.trim() !== ""
        return lotDetailsValid
      }
    }
    return true
  }


  const renderStep1 = () => (
    <Card>
      <CardContent className="py-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Association immeuble</h2>
          <p className="text-gray-600 mb-6">Comment souhaitez-vous gérer ce lot ?</p>
        </div>

        <RadioGroup
        value={lotData.buildingAssociation}
        onValueChange={(value: "existing" | "new" | "independent") =>
          setLotData((prev) => ({ ...prev, buildingAssociation: value }))
        }
        className="space-y-4"
      >
        <div 
          className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm ${
            lotData.buildingAssociation === "existing" 
              ? "border-blue-500 bg-blue-50 shadow-sm" 
              : "border-gray-200 bg-white"
          }`}
          onClick={() => setLotData((prev) => ({ ...prev, buildingAssociation: "existing" }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setLotData((prev) => ({ ...prev, buildingAssociation: "existing" }))
            }
          }}
          tabIndex={0}
          role="radio"
          aria-checked={lotData.buildingAssociation === "existing"}
        >
          <RadioGroupItem value="existing" id="existing" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="existing" className="font-medium text-gray-900 cursor-pointer">
              Lier à un immeuble existant
            </Label>
            <p className="text-sm text-gray-600 mt-1">Associez ce lot à un immeuble que vous avez déjà créé</p>
          </div>
        </div>

        <div 
          className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm ${
            lotData.buildingAssociation === "new" 
              ? "border-blue-500 bg-blue-50 shadow-sm" 
              : "border-gray-200 bg-white"
          }`}
          onClick={() => setLotData((prev) => ({ ...prev, buildingAssociation: "new" }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setLotData((prev) => ({ ...prev, buildingAssociation: "new" }))
            }
          }}
          tabIndex={0}
          role="radio"
          aria-checked={lotData.buildingAssociation === "new"}
        >
          <RadioGroupItem value="new" id="new" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="new" className="font-medium text-gray-900 cursor-pointer">
              Ajouter un immeuble
            </Label>
            <p className="text-sm text-gray-600 mt-1">Créez un nouvel immeuble et associez-y ce lot</p>
          </div>
        </div>

        <div 
          className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm ${
            lotData.buildingAssociation === "independent" 
              ? "border-blue-500 bg-blue-50 shadow-sm" 
              : "border-gray-200 bg-white"
          }`}
          onClick={() => setLotData((prev) => ({ ...prev, buildingAssociation: "independent" }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setLotData((prev) => ({ ...prev, buildingAssociation: "independent" }))
            }
          }}
          tabIndex={0}
          role="radio"
          aria-checked={lotData.buildingAssociation === "independent"}
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

      {lotData.buildingAssociation === "existing" && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-sky-600" />
            <span>Sélectionner un immeuble</span>
          </h3>

          <PropertySelector
            mode="select"
            onBuildingSelect={(buildingId) => {
              setLotData(prev => ({
                ...prev,
                selectedBuilding: buildingId || undefined
              }))
            }}
            selectedBuildingId={lotData.selectedBuilding}
            showActions={false}
            showOnlyBuildings={true}
            hideLotsSelect={true}
          />
        </div>
      )}

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
                    Une fois l'immeuble créé, vous pourrez revenir ici pour créer votre lot et l'associer 
                    à ce nouvel immeuble.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 mb-2">
                    Puis vous créerez le lot
                  </h4>
                  <p className="text-amber-700 text-sm leading-relaxed">
                    Après avoir créé l'immeuble, vous pourrez utiliser l'option "Lier à un immeuble existant" 
                    pour associer votre lot au nouvel immeuble que vous venez de créer.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-gray-600 italic">
                💡 Conseil : Cette approche en deux étapes vous permet de créer un immeuble complet 
                avec tous ses lots d'un coup, puis d'ajouter des lots individuels plus tard si nécessaire.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
      </CardContent>
    </Card>
  )

  const renderStep2 = () => {
    // Si lot indépendant, affichage avec Card
    if (lotData.buildingAssociation === "independent") {
      return (
        <Card>
          <CardContent className="py-6 space-y-6">
            <BuildingInfoForm
            buildingInfo={lotData.generalBuildingInfo!}
            setBuildingInfo={(info) => setLotData((prev) => ({ ...prev, generalBuildingInfo: info }))}
            selectedManagerId={selectedManagerId}
            setSelectedManagerId={setSelectedManagerId}
            teamManagers={teamManagers}
            userTeam={userTeam}
            isLoading={isLoading}
            onCreateManager={openGestionnaireModal}
            showManagerSection={true}
            showAddressSection={true}
            entityType="lot"
            showTitle={true}
            buildingsCount={managerData?.buildings?.length || 0}
            categoryCountsByTeam={categoryCountsByTeam}
          />
          </CardContent>
        </Card>
      )
    }

    // ✅ Mode "existing building" - Utiliser BuildingLotsStepV2 pour multi-lots
    if (lotData.buildingAssociation === "existing") {
      const selectedBuilding = managerData?.buildings?.find(
        b => b.id === lotData.selectedBuilding
      )

      return (
        <BuildingLotsStepV2
          lots={lots}
          expandedLots={expandedLots}
          buildingReference={selectedBuilding?.name || "Immeuble sélectionné"}
          buildingAddress={selectedBuilding?.address || ""}
          onAddLot={addLot}
          onUpdateLot={updateLot}
          onDuplicateLot={duplicateLot}
          onRemoveLot={removeLot}
          onToggleLotExpansion={toggleLotExpansion}
        />
      )
    }

    // ❌ Ce cas ne devrait plus arriver (new redirige vers création immeuble)
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-6">
            <p className="text-gray-500">Configuration du lot...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Callbacks pour le composant ContactSelector - Interface mise à jour
  const handleContactSelected = (contact: Contact, contactType: string) => {
    logger.info('✅ Contact selected:', contact.name, 'type:', contactType)
    setLotData((prev) => ({
      ...prev,
      assignedContacts: {
        ...prev.assignedContacts,
        [contactType]: [...prev.assignedContacts[contactType as keyof typeof prev.assignedContacts], contact],
      },
    }))
  }

  const handleContactRemoved = (contactId: string, contactType: string) => {
    logger.info('🗑️ Contact removed:', contactId, 'type:', contactType)
    setLotData((prev) => ({
      ...prev,
      assignedContacts: {
        ...prev.assignedContacts,
        [contactType]: prev.assignedContacts[contactType as keyof typeof prev.assignedContacts].filter(
          (contact: Contact) => contact.id !== contactId
        ),
      },
    }))
  }

  const handleContactCreated = (contact: Contact, contactType: string) => {
    logger.info('🆕 Contact created:', contact.name, 'type:', contactType)
    // Le contact créé est automatiquement ajouté par handleContactSelected
  }

  // Fonctions pour la gestion des gestionnaires de lot
  const openLotManagerModal = () => {
    setIsLotManagerModalOpen(true)
  }

  const addLotManager = (manager: TeamManager) => {
    // 🆕 Si on a un lotId actif (mode multi-lots), assigner au lot spécifique
    if (currentLotIdForModal) {
      setAssignedManagersByLot(prev => ({
        ...prev,
        [currentLotIdForModal]: [...(prev[currentLotIdForModal] || []), manager]
      }))
      setCurrentLotIdForModal(null)
      setIsLotManagerModalOpen(false)
      return
    }

    // Mode classique - Assigner au lot unique
    setLotData(prev => {
      const currentManagers = prev.assignedLotManagers || []
      // Vérifier si le gestionnaire n'est pas déjà assigné
      const alreadyAssigned = currentManagers.some(m => m.id === manager.user.id)
      if (alreadyAssigned) return prev

      const newManager = {
        id: manager.user.id,
        name: manager.user.name,
        email: manager.user.email,
        role: manager.role || 'member'
      }

      return {
        ...prev,
        assignedLotManagers: [...currentManagers, newManager]
      }
    })
    setIsLotManagerModalOpen(false)
  }

  const removeLotManager = (_managerId: string) => {
    setLotData(prev => ({
      ...prev,
      assignedLotManagers: (prev.assignedLotManagers || []).filter(manager => manager.id !== _managerId)
    }))
  }

  // 🆕 Helper functions for BuildingContactsStepV2
  const [currentLotIdForModal, setCurrentLotIdForModal] = useState<string | null>(null)
  const [buildingManagers, setBuildingManagers] = useState<UserType[]>([])

  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  const getAllLotContacts = (lotId: string): Contact[] => {
    const assignments = lotContactAssignments[lotId] || {}
    return Object.values(assignments).flat()
  }

  const getAssignedManagers = (lotId: string): UserType[] => {
    return assignedManagersByLot[lotId] || []
  }

  const removeManagerFromLot = (lotId: string, managerId: string) => {
    setAssignedManagersByLot(prev => ({
      ...prev,
      [lotId]: (prev[lotId] || []).filter(m => m.user.id !== managerId)
    }))
  }

  const openManagerModal = (lotId: string) => {
    setCurrentLotIdForModal(lotId)
    setIsLotManagerModalOpen(true)
  }

  const openBuildingManagerModal = () => {
    // Pour le mode lot creation, on ne gère pas les managers de l'immeuble
    // (l'immeuble existe déjà, on ne peut pas modifier ses managers)
    toast({
      title: "Fonction non disponible",
      description: "Les gestionnaires de l'immeuble ne peuvent pas être modifiés lors de la création de lots.",
      variant: "default",
    })
  }

  const removeBuildingManager = (managerId: string) => {
    // Idem - on ne peut pas supprimer les managers de l'immeuble existant
    toast({
      title: "Fonction non disponible",
      description: "Les gestionnaires de l'immeuble ne peuvent pas être modifiés lors de la création de lots.",
      variant: "default",
    })
  }

  const handleContactAdd = (contact: Contact, contactType: string, context?: { lotId?: string }) => {
    if (context?.lotId) {
      setLotContactAssignments(prev => ({
        ...prev,
        [context.lotId]: {
          ...prev[context.lotId],
          [contactType]: [...(prev[context.lotId]?.[contactType] || []), contact]
        }
      }))
    }
  }

  const handleBuildingContactRemove = (contactId: string, contactType: string) => {
    // Pour le mode lot creation, on ne gère pas les contacts de l'immeuble
    toast({
      title: "Fonction non disponible",
      description: "Les contacts de l'immeuble ne peuvent pas être modifiés lors de la création de lots.",
      variant: "default",
    })
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

  const renderStep3 = () => {
    // ✅ Mode "existing building" - Utiliser BuildingContactsStepV2 pour multi-lots
    if (lotData.buildingAssociation === "existing") {
      const selectedBuilding = managerData?.buildings?.find(
        b => b.id === lotData.selectedBuilding
      )

      if (!user || !userTeam) {
        return (
          <div className="text-center py-8">
            <p className="text-red-600">Erreur: utilisateur ou équipe non trouvé</p>
          </div>
        )
      }

      return (
        <BuildingContactsStepV2
          buildingInfo={{
            name: selectedBuilding?.name || "Immeuble",
            address: selectedBuilding?.address || "",
            postalCode: "",
            city: "",
            country: "",
            description: ""
          }}
          teamManagers={teamManagers}
          buildingManagers={buildingManagers}
          userProfile={{
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.name || user.email || "",
            role: user.user_metadata?.role || "gestionnaire"
          }}
          userTeam={userTeam}
          lots={lots}
          expandedLots={expandedLots}
          buildingContacts={buildingContacts}
          lotContactAssignments={lotContactAssignments}
          assignedManagers={assignedManagersByLot}
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
      )
    }

    // Mode "independent" - Garder le formulaire actuel
    const showLotManagerSection = lotData.buildingAssociation === "existing"

    return (
      <Card>
        <CardContent className="p-6 space-y-6">
        {showLotManagerSection && (
          <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Responsable spécifique du lot</h3>
              </div>
            </div>
            
            <div className="mb-3 p-3 bg-purple-100/50 rounded text-sm text-purple-700">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Responsable de l'immeuble :</span>
              </div>
              {selectedManagerId && teamManagers.length > 0 ? (
                (() => {
                  const buildingManager = teamManagers.find(m => m.user.id === selectedManagerId)
                  return buildingManager ? (
                    <span>{buildingManager.user.name}</span>
                  ) : (
                    <span className="text-gray-500">Non trouvé</span>
                  )
                })()
              ) : (
                <span className="text-gray-500">Aucun</span>
              )}
              <div className="mt-1 text-xs">+ Responsable(s) spécifique(s) ci-dessous</div>
            </div>
            
            <div className="space-y-3">
              {(lotData.assignedLotManagers || []).map((manager) => (
                <div
                  key={manager.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{manager.name}</div>
                      <div className="text-xs text-gray-500">{manager.email}</div>
                      <div className="flex gap-1 mt-1">
                        {manager.id === user?.id && (
                          <Badge variant="outline" className="text-xs">Vous</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          Responsable du lot
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLotManager(manager.id)}
                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={openLotManagerModal}
                className="w-full text-sm border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter responsable du lot
              </Button>
              
              <p className="text-xs text-gray-600 mt-2">
                Recevra les notifications spécifiques à ce lot en plus du responsable de l'immeuble
              </p>
            </div>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-2">
          <ContactSelector
            ref={contactSelectorRef}
            teamId={userTeam?.id || ""}
            displayMode="compact"
            title="Contacts assignés"
            description="Spécifiques à ce lot"
            selectedContacts={lotData.assignedContacts}
            onContactSelected={handleContactSelected}
            onContactRemoved={handleContactRemoved}
            onContactCreated={handleContactCreated}
            allowedContactTypes={["tenant", "provider", "owner", "other"]}
            hideTitle={false}
          />
        </div>
        </CardContent>
      </Card>
    )
  }

  const renderStep4 = () => {
    const buildingManager = teamManagers.find(m => m.user.id === selectedManagerId)
    const getAssociationType = () => {
      switch (lotData.buildingAssociation) {
        case "existing": return "Lié à un immeuble existant"
        case "new": return "Nouvel immeuble créé"
        case "independent": return "Lot indépendant"
        default: return "Non défini"
      }
    }

    // Mode "existing" avec multi-lots - Utiliser BuildingConfirmationStep
    if (lotData.buildingAssociation === "existing") {
      const selectedBuilding = managerData?.buildings?.find(
        b => b.id === lotData.selectedBuilding
      )

      if (!selectedBuilding) {
        return (
          <div className="text-center py-8">
            <p className="text-red-600">Immeuble sélectionné introuvable</p>
          </div>
        )
      }

      // Préparer buildingInfo
      const buildingInfo = {
        name: selectedBuilding.name || "",
        address: selectedBuilding.address || "",
        postalCode: "", // Not available in building data
        city: "", // Not available in building data
        country: "", // Not available in building data
        description: "" // Not available in building data
      }

      // Préparer buildingManagers (vide car on ne gère pas les managers de l'immeuble existant)
      const buildingManagers: any[] = []

      return (
        <BuildingConfirmationStep
          buildingInfo={buildingInfo}
          buildingManagers={buildingManagers}
          buildingContacts={buildingContacts}
          lots={lots}
          lotContactAssignments={lotContactAssignments}
          assignedManagers={assignedManagersByLot}
        />
      )
    }

    // Mode "independent" ou "new" - Garder le rendu actuel
    return (
      <div className="space-y-4">
        {/* Type d'association */}
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

              {/* Responsable Badge - Style compact Material Design */}
              {buildingManager && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-xs text-blue-900 truncate">{buildingManager.user.name}</span>
                    <span className="text-xs text-blue-600">•</span>
                    <span className="text-xs text-blue-600 whitespace-nowrap">
                      {lotData.buildingAssociation === "independent" ? "Responsable" : "Responsable"}
                    </span>
                    {buildingManager.user.id === user?.id && (
                      <span className="inline-flex items-center px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-sm border border-blue-300 ml-1">Vous</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              {/* Affichage selon le type d'association */}
              {lotData.buildingAssociation === "existing" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Immeuble sélectionné</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 pl-5">
                      {managerData?.buildings?.find((b: any) => b.id === lotData.selectedBuilding)?.name || "Non trouvé"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Adresse</span>
                    </div>
                    <div className="pl-5 bg-white rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        {managerData?.buildings?.find((b: any) => b.id === lotData.selectedBuilding)?.address || "Adresse non trouvée"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {lotData.buildingAssociation === "independent" && lotData.generalBuildingInfo && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Home className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Référence du lot</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 pl-5">
                      {lotData.generalBuildingInfo.name || "Non spécifié"}
                    </p>
                  </div>

                  {/* Adresse complète */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Adresse complète</span>
                    </div>
                    <div className="pl-5 bg-white rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        {[
                          lotData.generalBuildingInfo.address,
                          [lotData.generalBuildingInfo.postalCode, lotData.generalBuildingInfo.city].filter(Boolean).join(' '),
                          lotData.generalBuildingInfo.country
                        ].filter(Boolean).join(', ') || "Adresse non spécifiée"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {lotData.generalBuildingInfo.description && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700">Description</span>
                      </div>
                      <div className="pl-5 bg-white rounded-md border border-slate-200 p-3">
                        <p className="text-sm text-slate-700 leading-relaxed">{lotData.generalBuildingInfo.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </CardContent>
        </Card>

        {/* Détails du lot */}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <span className="text-xs font-medium text-slate-700">Référence :</span>
                  <p className="text-sm text-slate-900">
                    {lotData.buildingAssociation === "independent" 
                      ? lotData.generalBuildingInfo?.name || lotData.reference
                      : lotData.reference
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-700">Catégorie :</span>
                  <p className="text-sm text-slate-900 capitalize">
                    {lotData.buildingAssociation === "independent" 
                      ? (lotData.generalBuildingInfo?.category || lotData.category)
                      : lotData.category
                    }
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-700">Étage :</span>
                  <p className="text-sm text-slate-900">
                    {lotData.buildingAssociation === "independent" 
                      ? (lotData.generalBuildingInfo?.floor || "0")
                      : (lotData.floor || "0")
                    }
                  </p>
                </div>
              </div>
              
              {(lotData.doorNumber || lotData.generalBuildingInfo?.doorNumber) && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-slate-700">Numéro de porte :</span>
                  <p className="text-sm text-slate-900">
                    {lotData.buildingAssociation === "independent" 
                      ? (lotData.generalBuildingInfo?.doorNumber || "Non spécifié")
                      : (lotData.doorNumber || "Non spécifié")
                    }
                  </p>
                </div>
              )}

              {(lotData.description || (lotData.buildingAssociation === "independent" && lotData.generalBuildingInfo?.description)) && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs font-medium text-slate-700">Description :</span>
                  <p className="text-xs text-slate-900">
                    {lotData.buildingAssociation === "independent" 
                      ? (lotData.generalBuildingInfo?.description || lotData.description)
                      : lotData.description
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacts et gestionnaires */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Contacts et gestionnaires</h3>
                <p className="text-xs text-slate-600">Assignations pour ce lot</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 space-y-3">
              {/* Gestionnaires spécifiques du lot */}
              {(lotData.assignedLotManagers && lotData.assignedLotManagers.length > 0) && (
                <div>
                  <span className="text-xs font-medium text-slate-700 mb-2 block">Responsables spécifiques du lot :</span>
                  <div className="space-y-1">
                    {lotData.assignedLotManagers.map((manager, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white px-2 py-1 rounded border">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-slate-900">{manager.name}</span>
                        <span className="text-xs text-slate-600">({manager.email})</span>
                        {manager.id === user?.id && (
                          <Badge variant="outline" className="text-xs">Vous</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts assignés */}
              {Object.values(lotData.assignedContacts).some(contactArray => contactArray.length > 0) && (
                <div>
                  <span className="text-xs font-medium text-slate-700 mb-2 block">Contacts assignés :</span>
                  <div className="space-y-1">
                    {Object.entries(lotData.assignedContacts).map(([type, contacts]) => 
                      contacts.length > 0 && (
                        <div key={type} className="flex items-center gap-2 bg-white px-2 py-1 rounded border">
                          <div className={`w-2 h-2 rounded-full ${
                            type === 'tenant' ? 'bg-blue-500' :
                            type === 'provider' ? 'bg-green-500' :
                            type === 'owner' ? 'bg-amber-500' : 'bg-slate-500'
                          }`}></div>
                          <span className="text-sm font-medium text-slate-900">
                            {contacts.length} {
                              type === 'tenant' ? 'locataire' :
                              type === 'provider' ? 'prestataire' :
                              type === 'owner' ? 'propriétaire' : 'autre'
                            }{contacts.length > 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-slate-600">
                            ({contacts.map(c => c.name).join(', ')})
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Message si aucun contact/gestionnaire */}
              {!lotData.assignedLotManagers?.length && 
               !Object.values(lotData.assignedContacts).some(contactArray => contactArray.length > 0) && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-500">Aucun contact ou gestionnaire spécifique assigné</p>
                  <p className="text-xs text-slate-400">Le responsable principal gérera ce lot</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculer le subtitle pour afficher l'immeuble sélectionné (à partir de l'étape 2)
  const getHeaderSubtitle = () => {
    if (currentStep < 2 || !lotData.selectedBuilding) return undefined

    if (managerData?.buildings) {
      const building = managerData.buildings.find(
        b => b.id === lotData.selectedBuilding
      )
      if (building) {
        return `🏢 ${building.name}`
      }
    }

    return undefined
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - Sticky au niveau supérieur */}
      <StepProgressHeader
        title="Ajouter un nouveau lot"
        subtitle={getHeaderSubtitle()}
        backButtonText="Retour aux biens"
        onBack={() => router.push("/gestionnaire/biens")}
        steps={lotSteps}
        currentStep={currentStep}
      />

      {/* Main Content with uniform padding (responsive) and bottom space for footer */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 lg:px-10 pt-5 sm:pt-6 lg:pt-10 pb-20">
          <main className="max-w-6xl mx-auto pb-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </main>
        </div>

      {/* Footer Navigation */}
      <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex justify-between w-full max-w-6xl mx-auto">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Précédent</span>
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              className="flex items-center space-x-2"
              disabled={!canProceedToNextStep()}
            >
              <span>Suivant : {lotSteps[currentStep]?.label || 'Étape suivante'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex items-center space-x-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Création en cours...</span>
                </>
              ) : (
                <>
                  <span>Créer le lot</span>
                  <Check className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Lot Manager Assignment Modal */}
      <Dialog open={isLotManagerModalOpen} onOpenChange={setIsLotManagerModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Assigner un responsable spécifique au lot
            </DialogTitle>
            <DialogDescription>
              Ce responsable recevra les notifications spécifiques à ce lot, en complément du responsable de l'immeuble
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isLoading && teamManagers.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {teamManagers.map((manager) => {
                    const isAlreadyAssigned = Boolean(
                      lotData.assignedLotManagers?.some(m => m.id === manager.user.id)
                    )
                    const isBuildingManager = manager.user.id === selectedManagerId
                    
                    return (
                      <div
                        key={manager.user.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          isAlreadyAssigned || isBuildingManager
                            ? 'bg-gray-100 border-gray-300 opacity-60' 
                            : 'hover:bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isBuildingManager ? 'bg-blue-100' : 'bg-purple-100'
                          }`}>
                            <User className={`w-5 h-5 ${isBuildingManager ? 'text-blue-600' : 'text-purple-600'}`} />
                          </div>
                          <div>
                            <div className="font-medium">{manager.user.name}</div>
                            <div className="text-sm text-gray-500">{manager.user.email}</div>
                            <div className="flex gap-1 mt-1">
                              {manager.user.id === user?.id && (
                                <Badge variant="outline" className="text-xs">Vous</Badge>
                              )}
                              {isBuildingManager && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Responsable de l'immeuble</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => addLotManager(manager)} 
                          disabled={isAlreadyAssigned || isBuildingManager}
                          className={`${
                            isAlreadyAssigned || isBuildingManager
                              ? 'bg-gray-300 text-gray-500' 
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                          size="sm"
                        >
                          {isAlreadyAssigned 
                            ? 'Déjà assigné' 
                            : isBuildingManager 
                              ? 'Responsable de l\'immeuble'
                              : 'Assigner'
                          }
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Aucun gestionnaire disponible
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {isLoading 
                    ? 'Chargement des gestionnaires...'
                    : 'Aucun gestionnaire trouvé dans votre équipe'
                  }
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
                Ajouter un responsable
              </Button>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setIsLotManagerModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gestionnaire Creation Modal */}
      <ContactFormModal
        isOpen={isGestionnaireModalOpen}
        onClose={() => setIsGestionnaireModalOpen(false)}
        onSubmit={handleGestionnaireCreated}
        defaultType="gestionnaire"
      />
    </div>
  )
}

