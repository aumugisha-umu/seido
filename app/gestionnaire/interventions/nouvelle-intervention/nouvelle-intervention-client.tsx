"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Home,
  ArrowLeft,
  CheckCircle,
  Plus,
  X,
  Users,
  User,
  Wrench,
  UserCheck,
  Eye,
  AlertTriangle,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSaveFormState, useRestoreFormState } from "@/hooks/use-form-persistence"
import PropertySelector from "@/components/property-selector"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PROBLEM_TYPES, URGENCY_LEVELS } from "@/lib/intervention-data"
import { determineAssignmentType, createTeamService, createContactService, createTenantService, createLotService, createBuildingService } from '@/lib/services'
import { useAuth } from "@/hooks/use-auth"
import ContactSelectorOld from "@/components/ui/contact-selector"
import { ContactSelector, type ContactSelectorRef } from "@/components/contact-selector"
import { ContactSection } from "@/components/ui/contact-section"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { interventionSteps } from "@/lib/step-configurations"
import { logger, logError } from '@/lib/logger'
import { AssignmentSectionV2 } from "@/components/intervention/assignment-section-v2"
import { useInterventionUpload, DOCUMENT_TYPES } from "@/hooks/use-intervention-upload"
import { InterventionFileAttachment } from "@/components/intervention/intervention-file-attachment"
import { InterventionConfirmationSummary, type InterventionConfirmationData } from "@/components/interventions/intervention-confirmation-summary"

// Types for server-loaded data
interface Building {
  id: string
  name: string
  address: string
  lots?: Lot[]
}

interface Lot {
  id: string
  reference: string
  building_id?: string | null
  building?: { id: string; name: string; address: string }
  building_name?: string
  status?: string
  floor?: number
  interventions?: number
}

interface BuildingsData {
  buildings: Building[]
  lots: Lot[]
  teamId: string | null
}

interface NouvelleInterventionClientProps {
  initialBuildingsData: BuildingsData
}

export default function NouvelleInterventionClient({
  initialBuildingsData
}: NouvelleInterventionClientProps) {
  logger.info("🚀 NouvelleInterventionPage - Composant initialisé")

  // DEBUG: Log received initial data
  logger.info("🔍 [DEBUG] Client received initialBuildingsData:", {
    buildingsCount: initialBuildingsData.buildings.length,
    lotsCount: initialBuildingsData.lots.length,
    teamId: initialBuildingsData.teamId,
    firstLot: initialBuildingsData.lots[0] ? {
      id: initialBuildingsData.lots[0].id,
      reference: initialBuildingsData.lots[0].reference,
      status: initialBuildingsData.lots[0].status,
      is_occupied: initialBuildingsData.lots[0].is_occupied,
      tenant: initialBuildingsData.lots[0].tenant
    } : null
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLogement, setSelectedLogement] = useState<any>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>()
  const [selectedLotId, setSelectedLotId] = useState<string | undefined>()
  const [formData, setFormData] = useState({
    title: "",
    type: "",
    urgency: "normale", // ✅ Valeur par défaut requise
    description: "",
    availabilities: [] as Array<{ date: string; startTime: string; endTime: string }>,
  })

  // File upload hook (replaces files state)
  const fileUpload = useInterventionUpload({
    documentType: 'intervention_photo',
    onUploadError: (error) => {
      toast({ title: "Erreur", description: error, variant: "destructive" })
    }
  })

  const [schedulingType, setSchedulingType] = useState<"fixed" | "slots" | "flexible">("flexible")
  const [fixedDateTime, setFixedDateTime] = useState({ date: "", time: "" })
  const [timeSlots, setTimeSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([])
  const [globalMessage, setGlobalMessage] = useState("")

  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([])
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [countdown] = useState(10)
  const [isPreFilled, setIsPreFilled] = useState(false)
  const [createdInterventionId] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>("")

  const [expectsQuote, setExpectsQuote] = useState(false)

  // États pour les données réelles
  const [managers, setManagers] = useState<unknown[]>([])
  const [providers, setProviders] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserTeam, setCurrentUserTeam] = useState<any>(null)

  // Ref pour le modal ContactSelector
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  const router = useRouter()
  // const { toast } = useToast()
  const { handleSuccess } = useCreationSuccess()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  // ✅ NEW: Lazy service initialization - Services créés uniquement quand auth est prête
  const [services, setServices] = useState<{
    team: ReturnType<typeof createTeamService> | null
    contact: ReturnType<typeof createContactService> | null
    tenant: ReturnType<typeof createTenantService> | null
    lot: ReturnType<typeof createLotService> | null
    building: ReturnType<typeof createBuildingService> | null
  } | null>(null)

  // ✅ Hook pour sauvegarder l'état du formulaire avant redirect vers création de contact
  const formState = {
    currentStep,
    selectedLogement,
    selectedBuildingId,
    selectedLotId,
    formData,
    schedulingType,
    fixedDateTime,
    timeSlots,
    globalMessage,
    selectedManagerIds,
    selectedProviderIds,
    expectsQuote,
    files: fileUpload.files
  }
  const { saveAndRedirect } = useSaveFormState(formState)

  // ✅ Restaurer l'état du formulaire au retour de la création de contact
  const { newContactId, cancelled } = useRestoreFormState((restoredState: any) => {
    logger.info(`📥 [INTERVENTION-FORM] Restoring form state after contact creation`)

    // Restaurer tous les états
    setCurrentStep(restoredState.currentStep)
    setSelectedLogement(restoredState.selectedLogement)
    setSelectedBuildingId(restoredState.selectedBuildingId)
    setSelectedLotId(restoredState.selectedLotId)
    setFormData(restoredState.formData)
    setSchedulingType(restoredState.schedulingType)
    setFixedDateTime(restoredState.fixedDateTime)
    setTimeSlots(restoredState.timeSlots)
    setGlobalMessage(restoredState.globalMessage)
    setSelectedManagerIds(restoredState.selectedManagerIds)
    setSelectedProviderIds(restoredState.selectedProviderIds)
    setExpectsQuote(restoredState.expectsQuote)
    // Note: files ne sont pas restaurés car ils ne sont pas sérialisables
  })

  // Step 1: Créer les services quand l'auth est prête
  useEffect(() => {
    if (authLoading) {
      logger.info("⏳ [SERVICE-INIT] Waiting for auth to complete...")
      return
    }
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
      contact: createContactService(),
      tenant: createTenantService(),
      lot: createLotService(),
      building: createBuildingService()
    })
    logger.info("✅ [SERVICE-INIT] Services created successfully")
  }, [authLoading, user, services])

  // Log simplifié maintenant que le problème est résolu
  logger.info("🔍 États:", {
    managers: managers.length,
    providers: providers.length,
    selectedManagers: selectedManagerIds.length,
    selectedProviders: selectedProviderIds.length
  })

  // Fonction pour charger les données réelles depuis la DB avec logique unifiée
  const loadRealData = async () => {
    logger.info("📡 loadRealData démarré avec user:", user?.id)

    // ✅ Check services are ready
    if (!services) {
      logger.info("⏳ Services not ready yet, skipping data load")
      return
    }

    if (!user?.id) {
      logger.info("⚠️ Pas d'utilisateur, arrêt de loadRealData")
      return
    }

    setLoading(true)
    try {
      logger.info("🔄 Chargement des données en cours...")
      // 1. ✅ APPEL API: Récupérer l'équipe de l'utilisateur
      const teamsResponse = await fetch(`/api/user-teams?userId=${user.id}`)
      if (!teamsResponse.ok) {
        logger.error("❌ Failed to fetch user teams")
        return
      }
      const teamsResult = await teamsResponse.json()
      const teams = teamsResult?.data || []
      const team = teams[0]
      if (team) {
        setCurrentUserTeam(team)

        // 2. ✅ APPEL API: Utiliser la route API au lieu du service browser
        const response = await fetch(`/api/team-contacts?teamId=${team.id}`)
        if (!response.ok) {
          logger.error("❌ Failed to fetch team contacts")
          return
        }
        const contactsResult = await response.json()
        const contacts = contactsResult?.contacts || []
        logger.info("📋 All team contacts:", contacts.map((c: any) => ({ id: c.id, name: c.name, role: c.role, provider_category: c.provider_category })))
        
        // Filtrer les gestionnaires avec la même logique que les prestataires
        const managersData = contacts
          .filter((contact: unknown) => determineAssignmentType(contact) === 'manager')
          .map((contact: unknown) => ({
            id: contact.id,
            name: contact.name,
            role: "Gestionnaire",
            email: contact.email,
            phone: contact.phone,
            isCurrentUser: contact.email === user.email,
            type: "gestionnaire",
          }))
        
        // Filtrer les prestataires avec la même logique
        const providersData = contacts
          .filter((contact: unknown) => determineAssignmentType(contact) === 'provider')
          .map((contact: unknown) => ({
            id: contact.id,
            name: contact.name,
            role: "Prestataire",
            email: contact.email,
            phone: contact.phone,
            speciality: contact.speciality,
            isCurrentUser: false,
            type: "prestataire",
          }))

        logger.info("👥 Managers filtrés:", managersData.map(m => ({ id: m.id, name: m.name, email: m.email, isCurrentUser: m.isCurrentUser })))
        logger.info("🔧 Providers filtrés:", providersData.map(p => ({ id: p.id, name: p.name, email: p.email })))
        
        setManagers(managersData)
        setProviders(providersData)

        // Pré-sélectionner l'utilisateur connecté comme gestionnaire
        const currentManager = managersData.find(manager => manager.isCurrentUser)
        if (currentManager && selectedManagerIds.length === 0) {
          logger.info("🏠 Pré-sélection du gestionnaire connecté:", { id: currentManager.id, name: currentManager.name })
          setSelectedManagerIds([String(currentManager.id)])
        }
      }
    } catch (error) {
      logger.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Auto-sélectionner le contact créé après retour de la création
  useEffect(() => {
    if (!newContactId) return

    logger.info(`✅ [INTERVENTION-FORM] New contact created: ${newContactId}`)

    // Récupérer le type de contact depuis les searchParams
    const contactType = searchParams.get('contactType')

    // Auto-sélectionner le contact selon son type
    if (contactType === 'gestionnaire' || contactType === 'manager') {
      setSelectedManagerIds(prev => {
        if (prev.includes(newContactId)) return prev
        return [...prev, newContactId]
      })
      logger.info(`👤 [INTERVENTION-FORM] Auto-selected manager: ${newContactId}`)
    } else if (contactType === 'prestataire' || contactType === 'provider') {
      // Pour prestataire: remplacer (1 seul autorisé)
      setSelectedProviderIds([newContactId])
      logger.info(`🔧 [INTERVENTION-FORM] Auto-selected provider (replaced): ${newContactId}`)
    }
  }, [newContactId, searchParams])

  // Load tenant's assigned lots
  const loadTenantLots = async (tenantId: string) => {
    if (!services) {
      logger.info("⏳ Services not ready, cannot load tenant lots")
      return
    }

    try {
      const lots = await services.tenant.getAllTenantLots(tenantId)
      logger.info("📍 Tenant lots loaded:", lots)
      
      if (lots.length > 0) {
        // If tenant has only one lot, auto-select it
        if (lots.length === 1) {
          const lot = lots[0]
          setSelectedLogement({
            id: lot.id,
            name: lot.reference,
            type: "lot",
            building: lot.building?.name || "Immeuble",
            address: lot.building?.address || "",
            buildingId: lot.building_id,
            floor: lot.floor,
            tenant: lot.tenant?.name || null,
            is_occupied: lot.is_occupied || false
          })
          setSelectedLotId(String(lot.id))
          setSelectedBuildingId(lot.building_id ? String(lot.building_id) : undefined)
          setCurrentStep(2) // Skip to step 2 since lot is pre-selected
        }
        // If multiple lots, let user choose in step 1
      }
    } catch (error) {
      logger.error("❌ Error loading tenant lots:", error)
    }
  }

  // Load specific lot by ID or reference
  const loadSpecificLot = async (lotIdentifier: string) => {
    if (!services) {
      logger.info("⏳ Services not ready, cannot load specific lot")
      return
    }

    try {
      // Use getByIdWithRelations to get tenant information
      const lotResult = await services.lot.getByIdWithRelations(lotIdentifier)
      logger.info("📍 Specific lot loaded:", lotResult)

      if (lotResult && lotResult.success && lotResult.data) {
        const lot = lotResult.data as any
        setSelectedLogement({
          id: lot.id,
          name: lot.reference,
          type: "lot",
          building: lot.building?.name || "Immeuble",
          address: lot.building?.address || "",
          buildingId: lot.building_id,
          floor: lot.floor,
          tenant: lot.tenant?.name || null,
          is_occupied: lot.is_occupied || false
        })
        setSelectedLotId(String(lot.id))
        setSelectedBuildingId(lot.building_id ? String(lot.building_id) : undefined)
        setCurrentStep(2) // Skip to step 2 since lot is pre-selected
      }
    } catch (error) {
      logger.error("❌ Error loading specific lot:", error)
      // If lot not found, don't pre-select anything, let user choose in step 1
    }
  }

  // Step 2: Load data when services become available
  useEffect(() => {
    if (!services) {
      logger.info("⏳ [DATA-LOAD] Services not yet initialized, waiting...")
      return
    }
    if (!user?.id) {
      logger.info("⚠️ [DATA-LOAD] No user, skipping data load")
      return
    }

    logger.info("🔄 [DATA-LOAD] Services ready, loading contacts for user:", user.email)
    loadRealData()
  }, [services, user?.id])

  useEffect(() => {
    if (isPreFilled) return // Prevent re-execution if already pre-filled

    const fromApproval = searchParams.get("fromApproval")
    if (fromApproval === "true") {
      // Pre-fill form data from URL parameters
      const title = searchParams.get("title") || ""
      const type = searchParams.get("type") || ""
      const priority = searchParams.get("priority") || ""
      const description = searchParams.get("description") || ""
      const tenantLocation = searchParams.get("location") || ""

      // Set form data
      setFormData({
        title,
        type,
        urgency: priority === "urgent" ? "urgent" : priority === "critique" ? "critique" : "normale",
        description,
        availabilities: [],
      })

      // Pre-select lot based on tenant or location info
      const tenantId = searchParams.get("tenantId")
      if (tenantId) {
        // For tenant-initiated interventions, get their assigned lots
        loadTenantLots(tenantId)
      } else if (tenantLocation.includes("Lot")) {
        // Parse location to extract lot info and load real lot data
        const lotMatch = tenantLocation.match(/Lot(\d+)/)
        if (lotMatch) {
          const lotNumber = lotMatch[1]
          loadSpecificLot(lotNumber)
        }
      }

      // Mark as pre-filled to prevent re-execution
      setIsPreFilled(true)
    }
  }, [])

  // ✅ NEW: Pré-remplissage depuis lot/immeuble (gestionnaire)
  useEffect(() => {
    if (!services) {
      logger.info("⏳ Services not ready, cannot pre-fill lot/building")
      return
    }

    if (isPreFilled) return // Prevent re-execution if already pre-filled

    const lotId = searchParams.get("lotId")
    const buildingId = searchParams.get("buildingId")

    if (lotId) {
      // Pré-remplir avec un lot spécifique
      logger.info("🏠 [PRE-FILL] Pre-filling with lot:", lotId)
      loadSpecificLot(lotId) // Cette fonction passe déjà à l'étape 2
      setIsPreFilled(true)
    } else if (buildingId) {
      // Pré-remplir avec un immeuble spécifique
      logger.info("🏢 [PRE-FILL] Pre-filling with building:", buildingId)
      handleBuildingSelect(buildingId).then(() => {
        // Passer à l'étape 2 après avoir chargé l'immeuble
        setCurrentStep(2)
        logger.info("✅ [PRE-FILL] Building selected, moved to step 2")
      })
      setIsPreFilled(true)
    }
  }, [services, searchParams, isPreFilled])

  const getRelatedContacts = () => {
    return [...managers, ...providers]
  }

  const getSelectedContacts = () => {
    const contacts = []
    
    // Ajouter les gestionnaires sélectionnés
    selectedManagerIds.forEach(managerId => {
      const manager = managers.find(m => String(m.id) === String(managerId))
      if (manager) {
        contacts.push(manager)
      } else {
        logger.warn("⚠️ Gestionnaire non trouvé:", { 
          managerId, 
          availableManagers: managers.map(m => ({ id: m.id, name: m.name }))
        })
      }
    })
    
    // Ajouter les prestataires sélectionnés
    selectedProviderIds.forEach(providerId => {
      const provider = providers.find(p => String(p.id) === String(providerId))
      if (provider) {
        contacts.push(provider)
      } else {
        logger.warn("⚠️ Prestataire non trouvé:", { 
          providerId, 
          availableProviders: providers.map(p => ({ id: p.id, name: p.name }))
        })
      }
    })
    
    return contacts
  }

  // Fonctions de gestion des contacts
  const handleManagerSelect = (managerId: string) => {
    logger.info("👤 Sélection du gestionnaire:", { managerId, type: typeof managerId })
    const normalizedManagerId = String(managerId)
    setSelectedManagerIds(prevIds => {
      logger.info("👤 IDs gestionnaires actuels:", prevIds)
      const normalizedPrevIds = prevIds.map(id => String(id))
      if (normalizedPrevIds.includes(normalizedManagerId)) {
        // Si déjà sélectionné, le retirer
        const newIds = normalizedPrevIds.filter(id => id !== normalizedManagerId)
        logger.info("👤 Gestionnaire retiré, nouveaux IDs:", newIds)
        return newIds
      } else {
        // Sinon l'ajouter
        const newIds = [...normalizedPrevIds, normalizedManagerId]
        logger.info("👤 Gestionnaire ajouté, nouveaux IDs:", newIds)
        return newIds
      }
    })
  }

  const handleProviderSelect = (providerId: string) => {
    logger.info("🔧 Sélection du prestataire:", { providerId, type: typeof providerId })
    logger.info("🔧 Provider sélectionné depuis la liste:", providers.find(p => String(p.id) === String(providerId)))
    const normalizedProviderId = String(providerId)
    setSelectedProviderIds(prevIds => {
      logger.info("🔧 IDs prestataires actuels:", prevIds)
      const normalizedPrevIds = prevIds.map(id => String(id))
      if (normalizedPrevIds.includes(normalizedProviderId)) {
        // Si déjà sélectionné, le retirer
        const newIds = []
        logger.info("🔧 Prestataire retiré, nouveaux IDs:", newIds)
        return newIds
      } else {
        // ⚠️ LIMITATION: Un seul prestataire autorisé
        // Remplacer le prestataire existant par le nouveau
        const newIds = [normalizedProviderId]
        logger.info("🔧 Prestataire sélectionné (remplace l'ancien), nouveaux IDs:", newIds)
        return newIds
      }
    })
  }

  const handleContactCreated = (newContact: unknown) => {
    // Vérification de sécurité
    if (!newContact || typeof newContact !== 'object') {
      logger.error("❌ Contact invalide reçu:", newContact)
      return
    }

    // Ajouter le nouveau contact à la liste appropriée (nouvelle architecture)
    logger.info("🆕 Contact créé:", { id: (newContact as any).id, name: (newContact as any).name, role: (newContact as any).role, provider_category: (newContact as any).provider_category })
    const assignmentType = determineAssignmentType(newContact)
    logger.info("🔍 AssignmentType déterminé:", assignmentType)
    
    const contact = newContact as any // Cast pour accéder aux propriétés

    if (assignmentType === 'manager') {
      const managerData = {
        id: contact.id,
        name: contact.name,
        role: "Gestionnaire",
        email: contact.email,
        phone: contact.phone,
        isCurrentUser: contact.email === user?.email,
        type: "gestionnaire",
      }
      logger.info("➕ Ajout du gestionnaire à la liste:", managerData.name)
      setManagers((prev) => [...prev, managerData])
      // ✅ Auto-sélectionner le gestionnaire créé
      setSelectedManagerIds((prev) => [...prev, String(contact.id)])
      logger.info("✅ Gestionnaire auto-sélectionné:", contact.id)
    } else if (assignmentType === 'provider') {
      const providerData = {
        id: contact.id,
        name: contact.name,
        role: "Prestataire",
        email: contact.email,
        phone: contact.phone,
        speciality: contact.speciality,
        isCurrentUser: false,
        type: "prestataire",
      }
      logger.info("➕ Ajout du prestataire à la liste:", providerData.name)
      setProviders((prev) => [...prev, providerData])
      // ✅ Auto-sélectionner le prestataire créé
      setSelectedProviderIds((prev) => [...prev, String(contact.id)])
      logger.info("✅ Prestataire auto-sélectionné:", contact.id)
    } else {
      logger.info("⚠️ Contact créé mais pas ajouté aux listes (assignmentType non géré):", assignmentType)
    }
  }


  const handleBuildingSelect = async (buildingId: string | null) => {
    setSelectedBuildingId(buildingId || undefined)
    setSelectedLotId(undefined)
    if (!buildingId) {
      setSelectedLogement(null)
      return
    }

    // Optimistic minimal selection
    setSelectedLogement({ type: "building", id: buildingId })

    if (!services) {
      logger.info("⏳ Services not ready, cannot load building details")
      return
    }

    try {
      const result = await services.building.getById(buildingId)
      if (result && result.success && result.data) {
        setSelectedLogement({
          id: result.data.id,
          name: result.data.name,
          type: "building",
          building: result.data.name,
          address: result.data.address || "",
          buildingId: result.data.id
        })
        setSelectedBuildingId(String(result.data.id))
      }
    } catch (err) {
      logger.error("❌ Error loading building data:", err)
    }
  }

  const handleLotSelect = async (lotId: string | null, buildingId?: string) => {
    if (!lotId) {
      setSelectedLotId(undefined)
      setSelectedBuildingId(buildingId || undefined)
      setSelectedLogement(null)
      return
    }
    // Optimistic UI update so the selection is visible immediately
    const lotIdStr = String(lotId)
    const buildingIdStr = buildingId ? String(buildingId) : undefined
    setSelectedLotId(lotIdStr)
    if (buildingIdStr) setSelectedBuildingId(buildingIdStr)
    // Align behavior with building selection: always set current selection to the lot
    setSelectedLogement({ type: "lot", id: lotIdStr, buildingId: buildingIdStr })

    if (!services) {
      logger.info("⏳ Services not ready, cannot load lot details")
      return
    }

    try {
      // Load real lot data with relations when selecting a lot
      const lotResult = await services.lot.getByIdWithRelations(lotIdStr)

      if (lotResult && lotResult.success && lotResult.data) {
        const lotData = lotResult.data as any
        setSelectedLogement({
          id: lotData.id,
          name: lotData.reference,
          type: "lot",
          building: lotData.building?.name || "Immeuble",
          address: lotData.building?.address || "",
          buildingId: lotData.building_id || lotData.building?.id,
          floor: lotData.floor,
          tenant: lotData.tenant?.name || null,
          is_occupied: lotData.is_occupied || false
        })
        setSelectedLotId(String(lotData.id))
        setSelectedBuildingId(lotData.building_id ? String(lotData.building_id) : (lotData.building?.id ? String(lotData.building.id) : undefined))
      } else {
        // Fallback to minimal data if lot not found
        setSelectedLotId(lotIdStr)
        setSelectedBuildingId(buildingIdStr)
        setSelectedLogement({ type: "lot", id: lotIdStr, buildingId: buildingIdStr })
      }
    } catch (error) {
      logger.error("❌ Error loading lot data:", error)
      // Fallback to minimal data
      setSelectedLotId(lotIdStr)
      setSelectedBuildingId(buildingIdStr)
      setSelectedLogement({ type: "lot", id: lotIdStr, buildingId: buildingIdStr })
    }
  }

  const addAvailability = () => {
    setFormData((prev) => ({
      ...prev,
      availabilities: [...prev.availabilities, { date: "", startTime: "09:00", endTime: "17:00" }],
    }))
  }

  const addTimeSlot = () => {
    setTimeSlots((prev) => [...prev, { date: "", startTime: "09:00", endTime: "17:00" }])
  }

  const removeTimeSlot = (index: number) => {
    setTimeSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const updateTimeSlot = (index: number, field: string, value: string) => {
    setTimeSlots((prev) => prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)))
  }

  const removeAvailability = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      availabilities: prev.availabilities.filter((_, i) => i !== index),
    }))
  }

  const updateAvailability = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      availabilities: prev.availabilities.map((avail, i) => (i === index ? { ...avail, [field]: value } : avail)),
    }))
  }

  const handleNext = () => {
    const validation = validateCurrentStep()

    if (!validation.valid) {
      // Afficher les erreurs avec toast
      validation.errors.forEach(error => {
        toast({
          title: "Validation échouée",
          description: error,
          variant: "destructive"
        })
      })
      return
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Validate current step before proceeding
  const validateCurrentStep = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    switch (currentStep) {
      case 1: // Logement
        if (!selectedLogement) {
          errors.push("Veuillez sélectionner un logement")
        }
        break

      case 2: // Détails intervention
        if (!formData.title?.trim()) {
          errors.push("Le titre est requis")
        }
        if (!formData.description?.trim()) {
          errors.push("La description est requise")
        }
        if (!formData.urgency?.trim()) {
          errors.push("L'urgence est requise")
        }
        // type est optionnel selon le schéma
        break

      case 3: // Contacts
        if (selectedManagerIds.length === 0) {
          errors.push("Au moins un gestionnaire doit être assigné")
        }
        break

      case 4: // Planification (pas de champs requis)
        // Les champs de cette étape sont optionnels
        break
    }

    return { valid: errors.length === 0, errors }
  }

  const handleSubmit = () => {
    logger.info("Intervention créée:", {
      selectedLogement,
      formData,
      files: fileUpload.files,
      selectedContacts: getSelectedContacts(),
      schedulingType,
      fixedDateTime,
      timeSlots,
      globalMessage,
    });
    router.push("/gestionnaire/interventions");
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    fileUpload.addFiles(selectedFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }


  const handleCreateIntervention = async () => {
    setIsCreating(true)
    setError("")

    try {
      logger.info("🚀 Starting intervention creation...")
      logger.info("👤 Current user:", { id: user?.id, email: user?.email })
      logger.info("🏗️ Current team:", { id: currentUserTeam?.id, name: currentUserTeam?.name })
      
      // Prepare data for API call
      // Normalize potentially undefined IDs to null so we don't send "undefined" strings
      const normalizeIdValue = (value: unknown): string | null => {
        const str = value != null ? String(value) : ''
        if (!str || str === 'undefined' || str === 'null') return null
        return str
      }
      const normalizedSelectedBuildingId = normalizeIdValue(selectedBuildingId)
      const normalizedSelectedLotId = normalizeIdValue(selectedLotId)

      // 🔍 DEBUG: Log scheduling state before building payload
      console.log('🔍 [CLIENT-DEBUG] Scheduling state before submission:', {
        schedulingType,
        fixedDateTime,
        fixedDateTimeDate: fixedDateTime.date,
        fixedDateTimeTime: fixedDateTime.time,
        fixedDateTimeHasDate: !!fixedDateTime.date,
        fixedDateTimeHasTime: !!fixedDateTime.time,
        timeSlots,
        timeSlotsLength: timeSlots.length
      })

      const interventionData = {
        // Basic intervention data
        title: formData.title,
        description: formData.description,
        type: formData.type || undefined, // ✅ undefined si vide (optionnel)
        urgency: formData.urgency,

        // Housing selection
        selectedLogement,
        selectedBuildingId: normalizedSelectedBuildingId,
        selectedLotId: normalizedSelectedLotId,

        // Contact assignments
        selectedManagerIds,
        selectedProviderIds,

        // Scheduling - Send scheduling type directly (valid values: 'fixed', 'flexible', 'slots')
        schedulingType: schedulingType,
        fixedDateTime: schedulingType === 'fixed' && fixedDateTime.date && fixedDateTime.time
          ? { date: fixedDateTime.date, time: fixedDateTime.time }
          : null,
        timeSlots: schedulingType === 'slots'
          ? timeSlots.map(slot => ({
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime
            }))
          : [],

        // Messages
        globalMessage,

        // Options
        expectsQuote,

        // Team context
        teamId: currentUserTeam?.id || initialBuildingsData.teamId
      }

      logger.info("📝 Sending intervention data:", interventionData)
      logger.info("🔍 Detailed contact assignments:", {
        managersCount: selectedManagerIds.length,
        managerIds: selectedManagerIds,
        managerIdTypes: selectedManagerIds.map(id => typeof id),
        providersCount: selectedProviderIds.length,
        providerIds: selectedProviderIds,
        providerIdTypes: selectedProviderIds.map(id => typeof id),
        expectsQuote
      })
      logger.info("🔍 [CLIENT-DEBUG] Scheduling payload being sent:", {
        schedulingType: interventionData.schedulingType,
        fixedDateTime: interventionData.fixedDateTime,
        timeSlots: interventionData.timeSlots,
        timeSlotsLength: interventionData.timeSlots?.length
      })

      // ✅ Create FormData to handle files properly
      const formDataToSend = new FormData()

      // Add intervention data as JSON
      formDataToSend.append('interventionData', JSON.stringify(interventionData))

      // Add files with metadata
      fileUpload.files.forEach((fileWithPreview, index) => {
        formDataToSend.append(`file_${index}`, fileWithPreview.file)
        // Send metadata including document type
        formDataToSend.append(`file_${index}_metadata`, JSON.stringify({
          id: fileWithPreview.id,
          name: fileWithPreview.file.name,
          size: fileWithPreview.file.size,
          type: fileWithPreview.file.type,
          documentType: fileWithPreview.documentType
        }))
      })
      formDataToSend.append('fileCount', fileUpload.files.length.toString())

      logger.info(`📎 Sending intervention with ${fileUpload.files.length} files`)

      // Call the API
      const response = await fetch('/api/create-manager-intervention', {
        method: 'POST',
        // ✅ Don't set Content-Type - browser sets it with boundary for multipart/form-data
        body: formDataToSend,
      })

      logger.info("📡 API Response status:", response.status)
      const result = await response.json()

      if (!response.ok) {
        logger.error("❌ API Error response:", result)
        if (result.details) {
          logger.error("📋 Validation details:", result.details)
        }
        throw new Error(result.error || 'Erreur lors de la création de l\'intervention')
      }

      logger.info("✅ Intervention created successfully:", result)

      // Gérer le succès avec vidage du cache (la navigation forcera le rechargement)
      await handleSuccess({
        successTitle: "Intervention créée avec succès",
        successDescription: `L'intervention "${result.intervention.title}" a été créée et assignée.`,
        redirectPath: "/gestionnaire/interventions",
        refreshData: async () => {
          // Vider le cache pour forcer le rechargement des interventions lors de la navigation
          // const { createServerStatsService } = await import("@/lib/services")
          if (user?.id) {
            logger.info("Cache clearing for user:", user.id)
            // Stats service cache clearing functionality would be handled by new architecture
          }
        },
        hardRefreshFallback: false, // La navigation vers une nouvelle page force naturellement le rechargement
      })

    } catch (error) {
      logger.error("❌ Error creating intervention:", error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleNavigation = (path: string) => {
    setShowSuccessModal(false)
    router.push(path)
  }

  // Calculer le subtitle pour afficher le bien sélectionné (à partir de l'étape 2)
  const getHeaderSubtitle = () => {
    if (currentStep < 2 || !selectedLogement) return undefined

    if (selectedLogement.type === "lot") {
      return `📍 ${selectedLogement.name || "Lot sélectionné"}`
    } else if (selectedLogement.type === "building") {
      return `🏢 ${selectedLogement.name || "Immeuble sélectionné"}`
    }

    return undefined
  }

  return (
    <>
      {/* Header - Sticky au niveau supérieur */}
      <StepProgressHeader
        title="Créer une intervention"
        subtitle={getHeaderSubtitle()}
        backButtonText="Retour aux interventions"
        onBack={() => router.back()}
        steps={interventionSteps}
        currentStep={currentStep}
      />

      {/* Main Content with horizontal padding and bottom space for footer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pb-10 bg-gray-50">
        <main className="content-max-width w-full pt-10">
        {/* Step 1: Sélection du logement avec PropertySelector */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <PropertySelector
                mode="select"
                onBuildingSelect={handleBuildingSelect}
                onLotSelect={handleLotSelect}
                selectedBuildingId={selectedBuildingId}
                selectedLotId={selectedLotId}
                showActions={false}
                initialData={initialBuildingsData}
              />
            </div>
          </div>
        )}

        {/* Step 2: Formulaire de description */}
        {currentStep === 2 && selectedLogement && (
          <Card>
            <CardContent className="p-0 flex flex-col gap-6">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-medium">Détails de l'intervention</h3>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                <h4 className="font-medium">Décrire l'intervention</h4>
                  {/* Titre (2/3) + Type & Urgence (1/3) - Aligné avec Description/File uploader */}
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                    {/* Titre - Même largeur que Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Titre du problème *</label>
                      <Input
                        placeholder="Ex: Fuite d'eau dans la salle de bain"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>

                    {/* Type + Urgence - Partagent le 1/3 restant */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Type de problème</label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full">
                            <SelectValue placeholder="Sélectionnez le type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROBLEM_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Urgence <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={formData.urgency}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, urgency: value }))}
                        >
                          <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full">
                            <SelectValue placeholder="Sélectionnez l'urgence" />
                          </SelectTrigger>
                          <SelectContent>
                            {URGENCY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Description + File Uploader - Même ratio que Titre/Type+Urgence */}
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                    {/* Description - 2/3 largeur (aligné avec Titre) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée *</label>
                      <Textarea
                        placeholder="Décrivez le problème en détail : où, quand, comment..."
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        className="min-h-[280px] border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                      />
                    </div>

                    {/* File Uploader - 1/3 largeur (aligné avec Type+Urgence) */}
                    <div className="h-[280px]">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fichiers joints (optionnel)</label>
                      <InterventionFileAttachment
                        files={fileUpload.files}
                        onAddFiles={fileUpload.addFiles}
                        onRemoveFile={fileUpload.removeFile}
                        onUpdateFileType={fileUpload.updateFileDocumentType}
                        isUploading={fileUpload.isUploading}
                        maxFiles={10}
                        className="h-[252px]"
                      />
                    </div>
                  </div>
              </div>

              {/* Disponibilités */}
              <div>
                {formData.availabilities.length > 0 && (
                  <div className="space-y-3">
                    {formData.availabilities.map((availability, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Input
                          type="date"
                          value={availability.date}
                          onChange={(e) => updateAvailability(index, "date", e.target.value)}
                          className="flex-1 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                        <Input
                          type="time"
                          value={availability.startTime}
                          onChange={(e) => updateAvailability(index, "startTime", e.target.value)}
                          className="w-32 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                        <span className="text-gray-500">à</span>
                        <Input
                          type="time"
                          value={availability.endTime}
                          onChange={(e) => updateAvailability(index, "endTime", e.target.value)}
                          className="w-32 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAvailability(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="p-6">
            <AssignmentSectionV2
              managers={managers as any[]}
              providers={providers as any[]}
              tenants={[]}
              selectedManagerIds={selectedManagerIds}
              selectedProviderIds={selectedProviderIds}
              onManagerSelect={handleManagerSelect}
              onProviderSelect={handleProviderSelect}
              onContactCreated={handleContactCreated}
              schedulingType={schedulingType}
              onSchedulingTypeChange={setSchedulingType}
              fixedDateTime={fixedDateTime}
              onFixedDateTimeChange={setFixedDateTime}
              timeSlots={timeSlots}
              onAddTimeSlot={addTimeSlot}
              onUpdateTimeSlot={(index, field, value) => updateTimeSlot(index, field as string, value)}
              onRemoveTimeSlot={removeTimeSlot}
              expectsQuote={expectsQuote}
              onExpectsQuoteChange={setExpectsQuote}
              globalMessage={globalMessage}
              onGlobalMessageChange={setGlobalMessage}
              teamId={(() => {
                const finalTeamId = currentUserTeam?.id || initialBuildingsData.teamId || ""
                logger.info(`🔍 [INTERVENTION-CLIENT] Passing teamId to ContactSelector: "${finalTeamId}" (currentUserTeam: ${currentUserTeam?.id}, initialData: ${initialBuildingsData.teamId})`)
                return finalTeamId
              })()}
              isLoading={loading}
              contactSelectorRef={contactSelectorRef}
            />
          </Card>
        )}

        {/* Get values from form data */}
        {currentStep === 4 &&
          (() => {
            // Préparer les données pour le composant de confirmation
            const confirmationData: InterventionConfirmationData = {
              logement: {
                type: selectedLogement?.type === 'building' ? 'Bâtiment entier' : (selectedLogement?.name || ''),
                name: selectedLogement?.type === 'building' ? selectedLogement.name : (selectedLogement?.name || ''),
                building: selectedLogement?.building,
                address: selectedLogement?.address,
                floor: selectedLogement?.floor,
                tenant: selectedLogement?.tenant,
              },
              intervention: {
                title: formData.title,
                description: formData.description,
                category: formData.type,
                urgency: formData.urgency,
                room: formData.room,
              },
              contacts: getSelectedContacts().map(contact => ({
                id: contact.id.toString(),
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                role: contact.role,
                speciality: contact.speciality,
                isCurrentUser: contact.isCurrentUser,
              })),
              scheduling: schedulingType === 'slots' && timeSlots.length > 0
                ? {
                    type: 'slots' as const,
                    slots: timeSlots.map(slot => ({
                      date: slot.date,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                    })),
                  }
                : schedulingType === 'immediate'
                ? { type: 'immediate' as const }
                : { type: 'flexible' as const },
              instructions: globalMessage
                ? {
                    type: 'global' as const,
                    globalMessage,
                  }
                : undefined,
              files: fileUpload.files.map(fileWithPreview => {
                const documentTypeLabel = DOCUMENT_TYPES.find(
                  type => type.value === fileWithPreview.documentType
                )?.label || fileWithPreview.documentType

                return {
                  id: fileWithPreview.id,
                  name: fileWithPreview.file.name,
                  size: (fileWithPreview.file.size / (1024 * 1024)).toFixed(1) + ' MB',
                  type: documentTypeLabel,
                }
              }),
              expectsQuote,
            }

            return (
              <InterventionConfirmationSummary
                data={confirmationData}
                onBack={() => setCurrentStep(3)}
                onConfirm={handleCreateIntervention}
                currentStep={4}
                totalSteps={4}
                isLoading={isCreating}
                showFooter={false}
              />
            )
          })()}

        {/* Error display (shown separately from confirmation) */}
        {currentStep === 4 && error && (
          <Card className="border-l-4 border-l-red-500 mt-4">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">Erreur</p>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </CardContent>
          </Card>
        )}
        </main>
      </div>

        {/* Footer Navigation - Always visible at bottom */}
        <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
            {/* Back Button - Show from step 2 onwards */}
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isCreating}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            )}

            {/* Next/Submit Button - Always show */}
            <Button
              onClick={() => {
                if (currentStep === 4) {
                  handleCreateIntervention()
                } else {
                  handleNext()
                }
              }}
              disabled={
                (() => {
                  const validation = validateCurrentStep()
                  return !validation.valid || isCreating
                })()
              }
              className={`w-full sm:w-auto ml-auto ${
                currentStep === 4 ? 'bg-green-600 hover:bg-green-700' : ''
              }`}
            >
              {isCreating && currentStep === 4 ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  {currentStep === 4 && <CheckCircle className="h-4 w-4 mr-2" />}
                  {currentStep === 1 && "Continuer"}
                  {currentStep === 2 && "Continuer"}
                  {currentStep === 3 && "Continuer"}
                  {currentStep === 4 && "Créer l'intervention"}
                </>
              )}
            </Button>
          </div>
      </div>

      {/* Contact Selector Modal */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={currentUserTeam?.id || initialBuildingsData.teamId || ""}
        displayMode="compact"
        hideUI={true}
        selectedContacts={{
          manager: (managers as any[]).filter((m: any) => selectedManagerIds.includes(String(m.id))),
          provider: (providers as any[]).filter((p: any) => selectedProviderIds.includes(String(p.id)))
        }}
        onContactSelected={(contact, contactType) => {
          logger.info(`✅ Contact selected: ${contact.name} (${contactType})`)
          if (contactType === 'manager') {
            handleManagerSelect(contact.id)
          } else if (contactType === 'provider') {
            handleProviderSelect(contact.id)
          }
        }}
        onContactCreated={(contact, contactType) => {
          logger.info(`✅ Contact created: ${contact.name} (${contactType})`)
          handleContactCreated(contact)
        }}
        onContactRemoved={(contactId, contactType) => {
          logger.info(`❌ Contact removed: ${contactId} (${contactType})`)
          if (contactType === 'manager') {
            handleManagerSelect(contactId)
          } else if (contactType === 'provider') {
            handleProviderSelect(contactId)
          }
        }}
        onRequestContactCreation={(contactType) => {
          logger.info(`🔗 [INTERVENTION] Redirecting to contact creation: ${contactType}`)
          saveAndRedirect('/gestionnaire/contacts/nouveau', {
            type: contactType,
            returnPath: '/gestionnaire/interventions/nouvelle-intervention'
          })
        }}
      />

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                Intervention créée avec succès !
              </DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Votre intervention a été créée et les personnes assignées ont été notifiées.
              </p>
              <div className="flex flex-col space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleNavigation("/gestionnaire/dashboard")}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Button>
                <Button
                  onClick={() => handleNavigation(`/gestionnaire/interventions/${createdInterventionId}`)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Voir les détails de l'intervention
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Redirection automatique vers les détails dans {countdown} secondes
              </p>
            </div>
          </DialogContent>
        </Dialog>
    </>
  )
}

