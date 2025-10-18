"use client"

import type React from "react"

import { useState } from "react"
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
  Upload,
  FileText,
  Trash2,
  Users,
  User,
  Wrench,
  UserCheck,
  Eye,
  AlertTriangle,
  Paperclip,
  Calendar,
  Clock,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import PropertySelector from "@/components/property-selector"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PROBLEM_TYPES, URGENCY_LEVELS } from "@/lib/intervention-data"





import { determineAssignmentType, createTeamService, createContactService, createTenantService, createLotService, createBuildingService } from '@/lib/services'

import { useAuth } from "@/hooks/use-auth"
import ContactSelector from "@/components/ui/contact-selector"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { FileUploader } from "@/components/ui/file-uploader"
import { interventionSteps } from "@/lib/step-configurations"
import { logger, logError } from '@/lib/logger'
import { AssignmentSectionV2 } from "@/components/intervention/assignment-section-v2"

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
    urgency: "",
    description: "",
    availabilities: [] as Array<{ date: string; startTime: string; endTime: string }>,
  })
  const [files, setFiles] = useState<File[]>([])

  const [schedulingType, setSchedulingType] = useState<"fixed" | "slots" | "flexible">("flexible")
  const [fixedDateTime, setFixedDateTime] = useState({ date: "", time: "" })
  const [timeSlots, setTimeSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([])
  const [messageType, setMessageType] = useState<"global" | "individual">("global")
  const [globalMessage, setGlobalMessage] = useState("")
  const [individualMessages, setIndividualMessages] = useState<Record<string, string>>({})

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
      // 1. Récupérer l'équipe de l'utilisateur
      const teamsResult = await services.team.getUserTeams(user.id)
      const teams = teamsResult?.data || []
      const team = teams[0]
      if (team) {
        setCurrentUserTeam(team)

        // 2. NOUVELLE LOGIQUE UNIFIÉE : Récupérer tous les contacts et filtrer
        const contactsResult = await services.contact.getTeamContacts(team.id)
        const contacts = contactsResult?.data || []
        logger.info("📋 All team contacts:", contacts.map(c => ({ id: c.id, name: c.name, role: c.role, provider_category: c.provider_category })))
        
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
        const newIds = normalizedPrevIds.filter(id => id !== normalizedProviderId)
        logger.info("🔧 Prestataire retiré, nouveaux IDs:", newIds)
        return newIds
      } else {
        // Sinon l'ajouter
        const newIds = [...normalizedPrevIds, normalizedProviderId]
        logger.info("🔧 Prestataire ajouté, nouveaux IDs:", newIds)
        return newIds
      }
    })
  }

  const handleContactCreated = (_newContact: unknown) => {
    // Ajouter le nouveau contact à la liste appropriée (nouvelle architecture)
    logger.info("🆕 Contact créé:", { id: newContact.id, name: newContact.name, role: newContact.role, provider_category: newContact.provider_category })
    const assignmentType = determineAssignmentType(newContact)
    logger.info("🔍 AssignmentType déterminé:", assignmentType)
    
    if (assignmentType === 'manager') {
      const managerData = {
        id: newContact.id,
        name: newContact.name,
        role: "Gestionnaire",
        email: newContact.email,
        phone: newContact.phone,
        isCurrentUser: newContact.email === user?.email,
        type: "gestionnaire",
      }
      logger.info("➕ Ajout du gestionnaire à la liste:", managerData.name)
      setManagers((prev) => [...prev, managerData])
    } else if (assignmentType === 'provider') {
      const providerData = {
        id: newContact.id,
        name: newContact.name,
        role: "Prestataire",
        email: newContact.email,
        phone: newContact.phone,
        speciality: newContact.speciality,
        isCurrentUser: false,
        type: "prestataire",
      }
      logger.info("➕ Ajout du prestataire à la liste:", providerData.name)
      setProviders((prev) => [...prev, providerData])
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
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    logger.info("Intervention créée:", {
      selectedLogement,
      formData,
      files,
      selectedContacts: getSelectedContacts(),
      schedulingType,
      fixedDateTime,
      timeSlots,
      messageType,
      globalMessage,
      individualMessages,
    });
    router.push("/gestionnaire/interventions");
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles((prev) => [...prev, ...selectedFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
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

      const interventionData = {
        // Basic intervention data
        title: formData.title,
        description: formData.description,
        type: formData.type,
        urgency: formData.urgency,
        
        // Housing selection
        selectedLogement,
        selectedBuildingId: normalizedSelectedBuildingId,
        selectedLotId: normalizedSelectedLotId,
        
        // Contact assignments
        selectedManagerIds,
        selectedProviderIds,
        
        // Scheduling
        schedulingType,
        fixedDateTime,
        timeSlots,
        
        // Messages
        messageType,
        globalMessage,
        individualMessages,
        
        // Options
        expectsQuote,
        
        // Files (for now, we'll pass file names/metadata, actual upload to be implemented)
        files: files.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        })),
        
        // Team context
        teamId: currentUserTeam?.id
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

      // Call the API
      const response = await fetch('/api/create-manager-intervention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interventionData),
      })

      logger.info("📡 API Response status:", response.status)
      const result = await response.json()

      if (!response.ok) {
        logger.error("❌ API Error response:", result)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
        {/* Header */}
        <StepProgressHeader
          title="Créer une intervention"
          backButtonText="Retour aux interventions"
          onBack={() => router.back()}
          steps={interventionSteps}
          currentStep={currentStep}
        />

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
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-medium">Détails de l'intervention</h3>
              </div>

              <div>
                <h4 className="font-medium mb-4">Décrire l'intervention</h4>

                <div className="space-y-4">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Urgence</label>
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

                  {/* Description (70%) + File Uploader (30%) */}
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                    {/* Description - Prend la majorité de l'espace */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée *</label>
                      <Textarea
                        placeholder="Décrivez le problème en détail : où, quand, comment..."
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        className="min-h-[180px] border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                      />
                    </div>

                    {/* File Uploader - Compact sur la droite */}
                    <FileUploader
                      files={files}
                      onFilesChange={setFiles}
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      maxSize={10}
                      label="Fichiers joints (optionnel)"
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
              individualMessages={individualMessages}
              onIndividualMessageChange={(contactId, message) => {
                setIndividualMessages(prev => ({...prev, [contactId]: message}))
              }}
              teamId={currentUserTeam?.id || ""}
              isLoading={loading}
            />
          </Card>
        )}

        {/* Get values from form data */}
        {currentStep === 4 &&
          (() => {
            const problemTitle = formData.title
            const problemType = formData.type
            const urgency = formData.urgency
            const description = formData.description
            const uploadedFiles = files

            return (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-8 w-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmer la création</h2>
                    <p className="text-gray-600">Vérifiez les informations ci-dessous avant de créer l'intervention</p>
                  </div>

                  <div className="space-y-6 mb-8">
                    {/* Logement Information */}
                    <Card className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Logement sélectionné</h3>
                            <p className="text-sm text-gray-600">Bien concerné par l'intervention</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          {selectedLogement?.type === "building" ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Building2 className="h-4 w-4 text-gray-600" />
                                <span className="font-medium">Bâtiment entier</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {selectedLogement.name} - {selectedLogement.address}
                              </div>
                              <div className="text-sm text-gray-500">
                                {selectedLogement.lots} lots • {selectedLogement.occupancy} occupés
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Home className="h-4 w-4 text-gray-600" />
                                <span className="font-medium">{selectedLogement?.name}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {selectedLogement?.building} - {selectedLogement?.address}
                              </div>
                              <div className="text-sm text-gray-500">
                                Étage {selectedLogement?.floor} • {selectedLogement?.tenant || "Vacant"}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Problem Details */}
                    <Card className="border-l-4 border-l-orange-500">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Détails du problème</h3>
                            <p className="text-sm text-gray-600">Description de l'intervention</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Titre:</span>
                            <p className="text-gray-900">{problemTitle}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-gray-700">Type:</span>
                              <p className="text-gray-900">{problemType}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700">Urgence:</span>
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  urgency === "Urgente - Immédiate"
                                    ? "bg-red-100 text-red-800"
                                    : urgency === "Importante - 24h"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {urgency}
                              </span>
                            </div>
                          </div>
                          {description && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Description:</span>
                              <p className="text-gray-900 text-sm mt-1">{description}</p>
                            </div>
                          )}
                          {uploadedFiles.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Fichiers joints:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {uploadedFiles.map((file, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    <Paperclip className="h-3 w-3 mr-1" />
                                    {file.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assigned Contacts */}
                    <Card className="border-l-4 border-l-green-500">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Personnes assignées ({getSelectedContacts().length})
                            </h3>
                            <p className="text-sm text-gray-600">Responsables de l'intervention</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="space-y-3">
                            {getSelectedContacts().map((contact) => (
                              <div
                                key={contact.id}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border"
                              >
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      contact.role === "Gestionnaire" ? "bg-blue-100" : "bg-green-100"
                                    }`}
                                  >
                                    {contact.role === "Gestionnaire" ? (
                                      <User className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Wrench className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-gray-900">{contact.name}</span>
                                      {contact.isCurrentUser && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                          Vous
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                                      <span>{contact.email}</span>
                                      <span>{contact.phone}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      contact.role === "Gestionnaire"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                  >
                                    {contact.role}
                                  </span>
                                  {contact.speciality && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                      {contact.speciality}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Scheduling */}
                    <Card className="border-l-4 border-l-purple-500">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Planification</h3>
                            <p className="text-sm text-gray-600">Horaires de l'intervention</p>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          {schedulingType === "fixed" && (
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">Date fixe:</span>
                                <span>{fixedDateTime.date}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">Heure:</span>
                                <span>{fixedDateTime.time}</span>
                              </div>
                            </div>
                          )}
                          {schedulingType === "slots" && (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                <span className="font-medium">Créneaux proposés:</span>
                              </div>
                              <div className="space-y-2">
                                {timeSlots.map((slot, index) => (
                                  <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span>{slot.date}</span>
                                    <span className="text-gray-500">de</span>
                                    <span className="font-medium">{slot.startTime}</span>
                                    <span className="text-gray-500">à</span>
                                    <span className="font-medium">{slot.endTime}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {schedulingType === "flexible" && (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-purple-600" />
                              <span className="font-medium">Horaire à définir ultérieurement</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Instructions */}
                    {(globalMessage || Object.keys(individualMessages).length > 0) && (
                      <Card className="border-l-4 border-l-indigo-500">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <MessageSquare className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Instructions</h3>
                              <p className="text-sm text-gray-600">Messages pour les assignés</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {messageType === "global" && globalMessage && (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                                  <span className="font-medium">Message global:</span>
                                </div>
                                <div className="bg-white p-3 rounded border-l-4 border-l-indigo-500">
                                  <p className="text-gray-900">{globalMessage}</p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Ce message sera visible par tous les assignés (non visible par le locataire)
                                  </p>
                                </div>
                              </div>
                            )}
                            {messageType === "individual" && Object.keys(individualMessages).length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                                  <span className="font-medium">Messages individuels:</span>
                                </div>
                                <div className="space-y-2">
                              {Object.entries(individualMessages).map(([contactId, message]) => {
                                const contact = getSelectedContacts().find(
                                  (c) => c.id.toString() === contactId.toString(),
                                )
                                    return message ? (
                                      <div
                                        key={contactId}
                                        className="bg-white p-3 rounded border-l-4 border-l-indigo-500"
                                      >
                                        <div className="flex items-center space-x-2 mb-2">
                                          <span className="font-medium text-gray-900">{contact?.name}:</span>
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs ${
                                              contact?.role === "Gestionnaire"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-green-100 text-green-800"
                                            }`}
                                          >
                                            {contact?.role}
                                          </span>
                                        </div>
                                        <p className="text-gray-900">{message}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                          Seule cette personne verra ce message
                                        </p>
                                      </div>
                                    ) : null
                                  })}
                                </div>
                              </div>
                            )}
                            {getSelectedContacts().length === 1 && globalMessage && (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                                  <span className="font-medium">Instructions:</span>
                                </div>
                                <div className="bg-white p-3 rounded border-l-4 border-l-indigo-500">
                                  <p className="text-gray-900">{globalMessage}</p>
                                  <p className="text-xs text-gray-500 mt-2">
                                    Ces instructions ne seront pas vues par le locataire
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {expectsQuote && (
                      <Card className="border-l-4 border-l-yellow-500">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Devis requis</h3>
                              <p className="text-sm text-gray-600">Un devis sera demandé avant l'intervention</p>
                            </div>
                          </div>
                          <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-yellow-600" />
                              <span className="font-medium text-yellow-800">
                                Les prestataires devront fournir un devis avant de commencer l'intervention
                              </span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-2">
                              L'intervention ne pourra pas débuter tant que le devis n'aura pas été approuvé par le
                              gestionnaire.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-red-800 font-medium">Erreur</p>
                      </div>
                      <p className="text-red-700 mt-1">{error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

        {/* Sticky Navigation - Always visible at bottom */}
        <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm shadow-md border border-gray-200 rounded-lg px-6 py-4 mt-2 max-w-7xl mx-4 sm:mx-6 xl:mx-auto">
          <div className="flex flex-col sm:flex-row justify-between gap-2">
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
                (currentStep === 1 && !selectedLogement) ||
                (currentStep === 2 && (!formData.title || !formData.description)) ||
                (currentStep === 3 && selectedManagerIds.length === 0) ||
                isCreating
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
      </main>
    </div>
  )
}

