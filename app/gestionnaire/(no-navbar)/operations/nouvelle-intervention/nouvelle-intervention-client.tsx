"use client"

import type React from "react"

import { useState, useRef, useMemo, useCallback } from "react"
import { useRealtimeOptional } from "@/contexts/realtime-context"
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
  AlertTriangle,
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  Pencil,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSaveFormState, useRestoreFormState } from "@/hooks/use-form-persistence"
import PropertySelector from "@/components/property-selector"
import { URGENCY_LEVELS } from "@/lib/intervention-data"
import { InterventionTypeCombobox } from "@/components/intervention/intervention-type-combobox"
import type { InterventionTypesData } from "@/hooks/use-intervention-types"
import { determineAssignmentType, createTeamService, createContactService, createTenantService, createLotService, createBuildingService } from '@/lib/services'
import { useAuth } from "@/hooks/use-auth"
import ContactSelectorOld from "@/components/ui/contact-selector"
import { ContactSelector, type ContactSelectorRef } from "@/components/contact-selector"
import { ContactSection } from "@/components/ui/contact-section"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { interventionSteps } from "@/lib/step-configurations"
import { logger, logError } from '@/lib/logger'
import { getTeamContactsAction } from '@/app/actions/contacts'
import { getActiveTenantsByLotAction, getActiveTenantsByBuildingAction, type BuildingTenantsResult } from '@/app/actions/contract-actions'
import { AssignmentSectionV2 } from "@/components/intervention/assignment-section-v2"
import { useInterventionUpload, DOCUMENT_TYPES } from "@/hooks/use-intervention-upload"
import { InterventionFileAttachment } from "@/components/intervention/intervention-file-attachment"
import { InterventionConfirmationSummary, type InterventionConfirmationData } from "@/components/interventions/intervention-confirmation-summary"
import { Switch } from "@/components/ui/switch"

// ✅ Type centralisé pour les adresses (table addresses)
interface AddressRecord {
  id?: string
  street?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  formatted_address?: string | null
  lat?: number | null
  lng?: number | null
}

// Helper pour extraire l'adresse formatée depuis address_record
function getFormattedAddress(addressRecord?: AddressRecord | null): string {
  if (!addressRecord) return ''
  if (addressRecord.formatted_address) return addressRecord.formatted_address
  const parts = [addressRecord.street, addressRecord.postal_code, addressRecord.city].filter(Boolean)
  return parts.join(', ')
}

// Types for server-loaded data
interface Building {
  id: string
  name: string
  address_record?: AddressRecord | null
  lots?: Lot[]
}

interface Lot {
  id: string
  reference: string
  building_id?: string | null
  address_record?: AddressRecord | null  // ✅ Lots indépendants ont leur propre adresse
  building?: { id: string; name: string; address_record?: AddressRecord | null }
  building_name?: string
  status?: string
  floor?: number
  interventions?: number
  is_occupied?: boolean  // ✅ Basé sur contrats actifs
  tenant?: { name?: string | null }  // ✅ Locataire principal
}

interface BuildingsData {
  buildings: Building[]
  lots: Lot[]
  teamId: string | null
  userId: string | null  // ✅ Ajout pour pré-sélection gestionnaire
  interventionCount?: number  // ✅ Pour numérotation titre par défaut
}

interface NouvelleInterventionClientProps {
  initialBuildingsData: BuildingsData
  /** Pre-fetched intervention types from server (avoids loading spinner) */
  initialInterventionTypes?: InterventionTypesData | null
}

export default function NouvelleInterventionClient({
  initialBuildingsData,
  initialInterventionTypes
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

  // ✅ FIX 2026-01-26: Move router/auth hooks to the top to avoid "Cannot access before initialization"
  // These hooks must be called before any useMemo/useCallback that reference their values
  const router = useRouter()
  const realtime = useRealtimeOptional()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)
  const [selectedLogement, setSelectedLogement] = useState<any>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | undefined>()
  const [selectedLotId, setSelectedLotId] = useState<string | undefined>()
  const [formData, setFormData] = useState({
    title: "",
    type: "autre_technique", // ✅ Valeur par défaut: "Autre (technique)" - option la plus flexible
    urgency: "normale", // ✅ Valeur par défaut requise
    description: "",
    availabilities: [] as Array<{ date: string; startTime: string; endTime: string }>,
  })

  // File upload hook (replaces files state)
  const fileUpload = useInterventionUpload({
    documentType: 'intervention_photo',
    onUploadError: (error) => {
      toast.error("Erreur")
    }
  })

  const [schedulingType, setSchedulingType] = useState<"fixed" | "slots" | "flexible">("flexible")
  const [fixedDateTime, setFixedDateTime] = useState({ date: "", time: "09:00" }) // ✅ Heure par défaut pour éviter oublis
  const [timeSlots, setTimeSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([])
  const [globalMessage, setGlobalMessage] = useState("")

  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([])
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])

  const [isPreFilled, setIsPreFilled] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>("")

  const [expectsQuote, setExpectsQuote] = useState(false)

  // Source email ID (when intervention is created from an email)
  const [sourceEmailId, setSourceEmailId] = useState<string | null>(null)

  // Toggle pour inclure les locataires (lots occupés uniquement)
  const [includeTenants, setIncludeTenants] = useState<boolean>(true)

  // Contract selection for occupied lots
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [availableContracts, setAvailableContracts] = useState<Array<{
    id: string
    title: string
    tenantNames: string[]
    startDate: string
    endDate: string
  }>>([])

  // État pour les locataires d'un immeuble (groupés par lot)
  const [buildingTenants, setBuildingTenants] = useState<BuildingTenantsResult | null>(null)
  const [loadingBuildingTenants, setLoadingBuildingTenants] = useState(false)

  // État pour les lots exclus (sélection granulaire par lot)
  // ✅ Utiliser Array au lieu de Set pour éviter les re-renders inutiles (Set comparé par référence)
  const [excludedLotIds, setExcludedLotIds] = useState<string[]>([])

  // Handler pour toggle un lot
  const handleLotToggle = (lotId: string) => {
    setExcludedLotIds(prev =>
      prev.includes(lotId)
        ? prev.filter(id => id !== lotId)
        : [...prev, lotId]
    )
  }

  // États pour la confirmation des participants
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)
  const [confirmationRequired, setConfirmationRequired] = useState<string[]>([])

  // ✅ FIX: Tracker si l'utilisateur a manuellement modifié la sélection de confirmation
  // Ceci permet de préserver sa sélection lors des re-renders ou toggles
  const userHasModifiedConfirmation = useRef(false)

  // Handler pour toggle la confirmation d'un participant
  const handleConfirmationRequiredChange = (userId: string, required: boolean) => {
    userHasModifiedConfirmation.current = true  // ✅ Marquer comme modifié par l'utilisateur
    setConfirmationRequired(prev =>
      required ? [...prev, userId] : prev.filter(id => id !== userId)
    )
  }

  // Handler pour le toggle "Demander confirmation" - sélectionne tous par défaut
  // ✅ SIMPLIFIÉ: Utilise buildAllParticipantIds (défini plus bas) pour éviter la duplication
  const handleRequiresConfirmationChange = (requires: boolean) => {
    setRequiresConfirmation(requires)

    if (requires) {
      // Seulement auto-peupler si l'utilisateur n'a pas modifié manuellement
      // ET si la liste est vide (première activation)
      if (!userHasModifiedConfirmation.current && confirmationRequired.length === 0) {
        setConfirmationRequired(buildAllParticipantIds())
      }
      // Si l'utilisateur a déjà modifié, on garde sa sélection
    }
    // Note: on ne vide PAS la sélection quand on désactive le toggle
    // pour permettre à l'utilisateur de réactiver sans perdre sa sélection
  }

  // États pour les données réelles
  const [managers, setManagers] = useState<unknown[]>([])
  const [providers, setProviders] = useState<unknown[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserTeam, setCurrentUserTeam] = useState<any>(null)

  // ✅ Filtrer les locataires selon le contrat sélectionné
  // Si aucun contrat n'est sélectionné (null), on ne montre pas de locataires
  const filteredTenants = useMemo(() => {
    // Pas de lot sélectionné ou pas occupé
    if (!selectedLogement?.tenants || selectedLogement.type !== 'lot') {
      return []
    }

    // Aucun contrat sélectionné → pas de locataires à afficher
    if (!selectedContractId) {
      return []
    }

    // Contrat sélectionné → filtrer les locataires par contract_id
    return selectedLogement.tenants.filter(
      (tenant: any) => tenant.contract_id === selectedContractId
    )
  }, [selectedLogement, selectedContractId])

  // ✅ Fonction utilitaire centralisée pour construire la liste des participants à confirmer
  // Utilisé par handleRequiresConfirmationChange et useEffect de schedulingType
  const buildAllParticipantIds = useCallback((): string[] => {
    const ids: string[] = []
    const currentUserId = user?.id

    // 1. Gestionnaires sélectionnés (sauf utilisateur courant, only with account)
    for (const managerId of selectedManagerIds) {
      const manager = managers.find((m: any) => String(m.id) === managerId)
      if (manager && !(manager as any).isCurrentUser && managerId !== currentUserId
          && (manager as any).has_account !== false) {
        ids.push(managerId)
      }
    }

    // 2. Prestataires sélectionnés (only with account — non-invited can't respond)
    const eligibleProviderIds = selectedProviderIds.filter(pid => {
      const provider = (providers as any[]).find((p: any) => String(p.id) === pid)
      return !provider || provider.has_account !== false
    })
    ids.push(...eligibleProviderIds)

    // 3. Locataires (logique unifiée, only with account)
    if (selectedLogement?.type === 'lot' && selectedContractId && includeTenants) {
      // Lot-level: utiliser filteredTenants (filtrés par contrat sélectionné)
      filteredTenants.forEach((tenant: any) => {
        if (tenant.user_id && tenant.has_account !== false) {
          ids.push(tenant.user_id)
        }
      })
    } else if (selectedLogement?.type === 'building' && buildingTenants && includeTenants) {
      // Building-level: parcourir les lots non exclus
      for (const lotGroup of buildingTenants.byLot) {
        if (!excludedLotIds.includes(lotGroup.lotId)) {
          for (const tenant of lotGroup.tenants) {
            if (tenant.has_account !== false) {
              ids.push(tenant.user_id)
            }
          }
        }
      }
    }

    return [...new Set(ids)] // Dédupliquer
  }, [
    selectedManagerIds,
    selectedProviderIds,
    selectedLogement,
    selectedContractId,
    filteredTenants,
    buildingTenants,
    includeTenants,
    excludedLotIds,
    managers,
    providers,
    user?.id
  ])

  // Ref pour le modal ContactSelector
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // ✅ FIX: Ref to track mount status (persists across Strict Mode remounts)
  // Unlike local variables in useEffect, refs persist and only change on final unmount
  const isMountedRef = useRef(true)

  // ✅ FIX: Manage mount lifecycle - only set to false on final unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, []) // Empty deps = runs once on mount, cleanup on final unmount

  // ✅ NOTE: router, searchParams, user hooks moved to top of component (lines 112-115)

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
    files: fileUpload.files,
    // Contract selection
    selectedContractId,
    availableContracts
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
    // Contract selection
    if (restoredState.selectedContractId) setSelectedContractId(restoredState.selectedContractId)
    if (restoredState.availableContracts) setAvailableContracts(restoredState.availableContracts)
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

  // Fonction pour charger l'équipe de l'utilisateur (les contacts sont chargés séparément)
  const loadUserTeam = async () => {
    logger.info("📡 loadUserTeam démarré avec user:", user?.id)

    if (!user?.id) {
      logger.info("⚠️ Pas d'utilisateur, arrêt de loadUserTeam")
      return
    }

    setLoading(true)
    try {
      // ✅ Récupérer l'équipe de l'utilisateur
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
        logger.info("✅ User team loaded:", { id: team.id, name: team.name })
      }
    } catch (error) {
      logger.error("Erreur lors du chargement de l'équipe:", error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Charger l'équipe utilisateur au démarrage
  useEffect(() => {
    if (user?.id && !currentUserTeam) {
      loadUserTeam()
    }
  }, [user?.id])

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
          // ✅ Adresse: priorité au lot indépendant, sinon adresse du building
          const lotAddress = getFormattedAddress(lot.address_record)
            || getFormattedAddress(lot.building?.address_record)
          setSelectedLogement({
            id: lot.id,
            name: lot.reference,
            type: "lot",
            building: lot.building?.name || "Immeuble",
            address: lotAddress,
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
        // ✅ Adresse: priorité au lot indépendant, sinon adresse du building
        const lotAddress = getFormattedAddress(lot.address_record)
          || getFormattedAddress(lot.building?.address_record)
        setSelectedLogement({
          id: lot.id,
          name: lot.reference,
          type: "lot",
          building: lot.building?.name || "Immeuble",
          address: lotAddress,
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

  // Step 2: Load data when services become available (for lot/building related data)
  useEffect(() => {
    if (!services) {
      logger.info("⏳ [DATA-LOAD] Services not yet initialized, waiting...")
      return
    }
    if (!user?.id) {
      logger.info("⚠️ [DATA-LOAD] No user, skipping data load")
      return
    }

    logger.info("🔄 [DATA-LOAD] Services ready for user:", user.email)
    // Note: Contacts are now loaded separately via the dedicated useEffect below
  }, [services, user?.id])

  // ✅ Charger les contacts dès que teamId est disponible (userId depuis Server Component)
  // Ne dépend PAS de useAuth() - données disponibles au premier rendu !
  useEffect(() => {
    const teamId = initialBuildingsData.teamId
    const userId = initialBuildingsData.userId

    if (!teamId) {
      logger.info("⏳ [CONTACTS-LOAD] Waiting for teamId")
      return
    }

    const loadContacts = async () => {
      logger.info("📡 [CONTACTS-LOAD] Loading contacts for team:", teamId, "userId:", userId)

      try {
        const contactsResult = await getTeamContactsAction(teamId)
        if (!contactsResult.success) {
          logger.error("❌ [CONTACTS-LOAD] Failed to fetch team contacts:", contactsResult.error)
          return
        }

        const contacts = contactsResult.data || []
        logger.info("📋 [CONTACTS-LOAD] Loaded contacts:", contacts.length)

        // Filtrer les gestionnaires
        const managersData = contacts
          .filter((contact: any) => determineAssignmentType(contact) === 'manager')
          .map((contact: any) => ({
            id: contact.id,
            name: contact.name,
            role: "Gestionnaire",
            email: contact.email,
            phone: contact.phone,
            isCurrentUser: userId ? String(contact.id) === String(userId) : false,
            type: "gestionnaire" as const,
          }))

        // Filtrer les prestataires
        const providersData = contacts
          .filter((contact: any) => determineAssignmentType(contact) === 'provider')
          .map((contact: any) => ({
            id: contact.id,
            name: contact.name,
            role: "Prestataire",
            email: contact.email,
            phone: contact.phone,
            speciality: contact.speciality,
            isCurrentUser: false,
            type: "prestataire" as const,
            has_account: !!contact.auth_user_id,
          }))

        logger.info("👥 [CONTACTS-LOAD] Managers:", managersData.length, "Providers:", providersData.length)

        setManagers(managersData)
        setProviders(providersData)

        // Pré-sélectionner l'utilisateur connecté comme gestionnaire
        const currentUserManager = managersData.find((m: any) => m.isCurrentUser)
        if (currentUserManager) {
          logger.info("🏠 [CONTACTS-LOAD] Pre-selecting current user:", currentUserManager.name)
          setSelectedManagerIds(prevIds => {
            if (prevIds.length === 0) {
              return [String(currentUserManager.id)]
            }
            return prevIds
          })
        }
      } catch (error) {
        logger.error("❌ [CONTACTS-LOAD] Error:", error)
      }
    }

    loadContacts()
  }, [initialBuildingsData.teamId, initialBuildingsData.userId])  // ✅ Pas de user?.id !

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

  // ✅ Extract primitive value BEFORE useEffect to avoid reference changes
  // This prevents multiple useEffect executions from searchParams object changing
  const fromEmailParam = searchParams.get('fromEmail')

  // ✅ NEW: Pré-remplissage depuis email (création d'intervention depuis la boîte mail)
  // ✅ OPTIMIZED: PDF is generated in background while user fills form (instant redirect)
  // ✅ FIX: Uses isMountedRef instead of local variable to survive React Strict Mode remounts
  useEffect(() => {
    if (isPreFilled) return // Prevent re-execution if already pre-filled

    if (fromEmailParam !== 'true') return

    // Récupérer les données depuis sessionStorage
    const emailDataStr = sessionStorage.getItem('intervention-from-email')
    if (!emailDataStr) {
      logger.warn('⚠️ [PRE-FILL-EMAIL] No email data found in sessionStorage')
      return
    }

    try {
      const emailData = JSON.parse(emailDataStr)
      logger.info('📧 [PRE-FILL-EMAIL] Pre-filling from email:', {
        emailId: emailData.emailId,
        title: emailData.title?.substring(0, 50),
        pdfPending: emailData.pdfPending
      })

      // 1. Stocker l'emailId pour liaison après création
      if (emailData.emailId) {
        setSourceEmailId(emailData.emailId)
      }

      // 2. Pré-remplir le formulaire (titre et description)
      setFormData(prev => ({
        ...prev,
        title: emailData.title || prev.title,
        description: emailData.description || prev.description
      }))

      // 3. ✅ BACKGROUND PDF GENERATION: Fetch PDF asynchronously
      // User can start filling the form immediately while PDF generates (~5s)
      if (emailData.pdfPending && emailData.emailId) {
        logger.debug({ emailId: emailData.emailId }, '[PRE-FILL-EMAIL] Starting background PDF generation')

        // Fire-and-forget: generate PDF in background
        fetch(`/api/emails/${emailData.emailId}/pdf`)
          .then(response => response.json())
          .then(pdfResult => {
            // ✅ FIX: Use ref instead of local variable - persists across Strict Mode remounts
            if (!isMountedRef.current) {
              return
            }

            if (pdfResult.success && !pdfResult.fallback && pdfResult.pdfUrl) {
              // Download the PDF from the signed URL
              return fetch(pdfResult.pdfUrl)
                .then(response => {
                  if (!response.ok) throw new Error(`PDF download failed: ${response.status}`)
                  return response.blob()
                })
                .then(blob => {
                  // ✅ FIX: Check ref again after async download
                  if (!isMountedRef.current) {
                    return
                  }

                  // Create File object and add to form
                  const pdfFile = new File([blob], pdfResult.filename || 'email.pdf', {
                    type: 'application/pdf'
                  })

                  fileUpload.addFiles([pdfFile], 'email') // ✅ Set document type to 'email' for email PDFs
                  logger.info({ filename: pdfFile.name, size: pdfFile.size }, '[PRE-FILL-EMAIL] PDF attachment added')
                })
            } else {
              logger.debug({
                success: pdfResult.success,
                fallback: pdfResult.fallback,
                hasUrl: !!pdfResult.pdfUrl,
                error: pdfResult.error
              }, '[PRE-FILL-EMAIL] PDF not available')
            }
          })
          .catch(pdfError => {
            if (!isMountedRef.current) return
            logger.warn({ error: pdfError }, '[PRE-FILL-EMAIL] Background PDF generation failed')
            // Non-blocking: intervention can be created without PDF
          })
      }
      // Legacy support: if pdfUrl already exists (old flow), download it directly
      else if (emailData.pdfUrl && emailData.pdfFilename) {
        logger.info('📄 [PRE-FILL-EMAIL] Downloading pre-generated PDF...')

        fetch(emailData.pdfUrl)
          .then(response => {
            if (!response.ok) throw new Error('PDF download failed')
            return response.blob()
          })
          .then(blob => {
            if (!isMountedRef.current) return

            const pdfFile = new File([blob], emailData.pdfFilename, {
              type: 'application/pdf'
            })

            fileUpload.addFiles([pdfFile], 'email') // ✅ Set document type to 'email' for email PDFs
            logger.info('✅ [PRE-FILL-EMAIL] PDF attachment added')
          })
          .catch(pdfError => {
            if (!isMountedRef.current) return
            logger.warn('⚠️ [PRE-FILL-EMAIL] Could not add PDF attachment:', pdfError)
          })
      }

      // 4. Nettoyer sessionStorage
      sessionStorage.removeItem('intervention-from-email')

      // 5. Marquer comme pré-rempli
      setIsPreFilled(true)

      logger.info('✅ [PRE-FILL-EMAIL] Form pre-filled from email')

    } catch (parseError) {
      logger.error('❌ [PRE-FILL-EMAIL] Failed to parse email data:', parseError)
      sessionStorage.removeItem('intervention-from-email')
    }
    // ✅ No cleanup needed here - isMountedRef is managed by its own useEffect
  }, [fromEmailParam, isPreFilled]) // ✅ Use primitive value instead of searchParams object

  // ✅ NEW: Pré-remplissage depuis lot/immeuble (gestionnaire)
  useEffect(() => {
    if (!services) {
      logger.info("⏳ Services not ready, cannot pre-fill lot/building")
      return
    }

    if (isPreFilled) return // Prevent re-execution if already pre-filled

    // ✅ Support both camelCase (legacy) and snake_case (from finalization modal)
    const lotId = searchParams.get("lotId") || searchParams.get("lot_id")
    const buildingId = searchParams.get("buildingId") || searchParams.get("building_id")

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

  // ✅ NEW: Pré-remplissage depuis intervention de suivi (follow-up après finalisation)
  useEffect(() => {
    if (isPreFilled) return // Prevent re-execution if already pre-filled

    const fromInterventionId = searchParams.get("from_intervention")
    if (!fromInterventionId) return

    // ⚠️ Attendre que services soit prêt AVANT de modifier le formulaire
    // pour éviter les exécutions multiples du setFormData
    if (!services) {
      logger.info("⏳ [PRE-FILL-FOLLOWUP] Services not ready, waiting...")
      return
    }

    logger.info("🔄 [PRE-FILL-FOLLOWUP] Pre-filling from follow-up intervention:", fromInterventionId)

    // 1. Lire les paramètres (snake_case envoyés par la modale de finalisation)
    const lotId = searchParams.get("lot_id")
    const buildingId = searchParams.get("building_id")
    const title = searchParams.get("title")
    const type = searchParams.get("type")
    const context = searchParams.get("context")

    // 2. Pré-remplir le formulaire (une seule fois, services est prêt)
    if (title || type || context) {
      setFormData(prev => ({
        ...prev,
        title: title || prev.title,
        type: type || prev.type,
        description: context ? `${context}\n\n` : prev.description
      }))
      logger.info("📝 [PRE-FILL-FOLLOWUP] Form data pre-filled:", { title, type, context })
    }

    // 3. Charger le lot ou immeuble
    if (lotId) {
      logger.info("🏠 [PRE-FILL-FOLLOWUP] Loading lot:", lotId)
      loadSpecificLot(lotId).then(() => {
        setIsPreFilled(true)
        logger.info("✅ [PRE-FILL-FOLLOWUP] Lot loaded, form ready")
      })
    } else if (buildingId) {
      logger.info("🏢 [PRE-FILL-FOLLOWUP] Loading building:", buildingId)
      handleBuildingSelect(buildingId).then(() => {
        setCurrentStep(2)
        setIsPreFilled(true)
        logger.info("✅ [PRE-FILL-FOLLOWUP] Building loaded, moved to step 2")
      })
    } else {
      setIsPreFilled(true)
      logger.info("✅ [PRE-FILL-FOLLOWUP] No lot/building, but form data set")
    }
  }, [services, searchParams, isPreFilled])

  // Reset ou pré-sélection des confirmations selon le mode de planification
  // ✅ FIX 2026-03-01: Slots with 1 créneau = like fixed (optional confirmation)
  // Slots with 2+ créneaux = mandatory confirmation (auto-select all participants)
  const isMultiSlot = schedulingType === 'slots' && timeSlots.length >= 2
  useEffect(() => {
    if (schedulingType !== 'fixed' && schedulingType !== 'slots') {
      // Mode flexible : pas de confirmation
      setRequiresConfirmation(false)
      setConfirmationRequired([])
      userHasModifiedConfirmation.current = false
    } else if (isMultiSlot) {
      // Mode créneaux multiples : sélectionner tous les participants par défaut
      if (!userHasModifiedConfirmation.current) {
        setConfirmationRequired(buildAllParticipantIds())
      }
    } else if (schedulingType === 'slots' && timeSlots.length < 2) {
      // 1 créneau ou 0 : like fixed mode — reset to optional
      if (!userHasModifiedConfirmation.current) {
        setRequiresConfirmation(false)
        setConfirmationRequired([])
      }
    }
  }, [schedulingType, isMultiSlot, timeSlots.length, buildAllParticipantIds])

  // ✅ Reset le flag de modification quand le mode de planification change
  useEffect(() => {
    userHasModifiedConfirmation.current = false
  }, [schedulingType])

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
  // ✅ SIMPLIFIÉ: Suppression de la normalisation redondante (les IDs sont déjà des strings)
  const handleManagerSelect = (managerId: string) => {
    logger.info("👤 Sélection du gestionnaire:", { managerId })
    setSelectedManagerIds(prevIds => {
      logger.info("👤 IDs gestionnaires actuels:", prevIds)
      if (prevIds.includes(managerId)) {
        // Si déjà sélectionné, le retirer
        const newIds = prevIds.filter(id => id !== managerId)
        logger.info("👤 Gestionnaire retiré, nouveaux IDs:", newIds)
        // Retirer aussi de la liste de confirmation
        setConfirmationRequired(prev => prev.filter(id => id !== managerId))
        return newIds
      } else {
        // Sinon l'ajouter
        const newIds = [...prevIds, managerId]
        logger.info("👤 Gestionnaire ajouté, nouveaux IDs:", newIds)
        // Si confirmation active, l'ajouter automatiquement à la liste
        if (requiresConfirmation) {
          // Vérifier que ce n'est pas l'utilisateur courant
          const manager = managers.find((m: any) => String(m.id) === managerId)
          if (manager && !(manager as any).isCurrentUser && managerId !== user?.id) {
            setConfirmationRequired(prev => [...prev, managerId])
          }
        }
        return newIds
      }
    })
  }

  const handleProviderSelect = (providerId: string) => {
    logger.info("🔧 Sélection du prestataire:", { providerId })
    logger.info("🔧 Provider sélectionné depuis la liste:", providers.find(p => String(p.id) === providerId))
    setSelectedProviderIds(prevIds => {
      logger.info("🔧 IDs prestataires actuels:", prevIds)
      if (prevIds.includes(providerId)) {
        // Si déjà sélectionné, le retirer
        const newIds = prevIds.filter(id => id !== providerId)
        logger.info("🔧 Prestataire retiré, nouveaux IDs:", newIds)
        // Si on passe à 1 ou 0 prestataire, revenir au mode single
        // Retirer aussi de la liste de confirmation
        setConfirmationRequired(prev => prev.filter(id => id !== providerId))
        return newIds
      } else {
        // Multi-sélection : ajouter le prestataire
        const newIds = [...prevIds, providerId]
        logger.info("🔧 Prestataire ajouté, nouveaux IDs:", newIds)
        // Si confirmation active, l'ajouter automatiquement à la liste
        if (requiresConfirmation) {
          setConfirmationRequired(prev => [...prev, providerId])
        }
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
    // Reset building tenants, excluded lots, and contract selection when changing selection
    setBuildingTenants(null)
    setExcludedLotIds([])
    setIncludeTenants(false)
    setSelectedContractId(null)
    setAvailableContracts([])

    if (!buildingId) {
      setSelectedLogement(null)
      return
    }

    // ✅ Utiliser les données initiales pour l'état optimiste (évite "Immeuble undefined")
    const buildingFromInitial = initialBuildingsData.buildings.find(b => String(b.id) === buildingId)
    setSelectedLogement({
      type: "building",
      id: buildingId,
      name: buildingFromInitial?.name || `Immeuble ${buildingId.slice(0, 8)}`,
      building: buildingFromInitial?.name,
      address: getFormattedAddress(buildingFromInitial?.address_record)
    })

    // ✅ FIX: Générer titre par défaut AVANT le check des services
    // Utilise les données initiales qui sont toujours disponibles
    if (!formData.title) {
      const nextNumber = (initialBuildingsData.interventionCount || 0) + 1
      const buildingName = buildingFromInitial?.name || 'Immeuble'
      setFormData(prev => ({
        ...prev,
        title: `Intervention #${nextNumber} - ${buildingName}`
      }))
    }

    // ✅ FIX: Charger les tenants d'immeuble via Server Action AVANT le check services
    // Les Server Actions ne dépendent pas des services client
    setLoadingBuildingTenants(true)
    try {
      const tenantsResult = await getActiveTenantsByBuildingAction(buildingId)
      if (tenantsResult.success && tenantsResult.data) {
        setBuildingTenants(tenantsResult.data)
        // Activer le toggle si des locataires existent
        setIncludeTenants(tenantsResult.data.hasActiveTenants)
        logger.info('✅ Building tenants loaded (early):', {
          buildingId,
          totalCount: tenantsResult.data.totalCount,
          occupiedLotsCount: tenantsResult.data.occupiedLotsCount
        })
      }
    } catch (tenantError) {
      logger.warn("Could not load building tenants (early):", tenantError)
    } finally {
      setLoadingBuildingTenants(false)
    }

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
          address: getFormattedAddress((result.data as any).address_record),
          buildingId: result.data.id
        })
        setSelectedBuildingId(String(result.data.id))

        // ✅ Générer titre par défaut si vide
        if (!formData.title) {
          const nextNumber = (initialBuildingsData.interventionCount || 0) + 1
          const buildingName = result.data.name || buildingFromInitial?.name || 'Immeuble'
          setFormData(prev => ({
            ...prev,
            title: `Intervention #${nextNumber} - ${buildingName}`
          }))
        }
      }
    } catch (err) {
      logger.error("❌ Error loading building data:", err)
      // Fallback déjà défini par l'état optimiste avec données initiales
    }
  }

  // Helper pour trouver un lot dans les données initiales (évite "Lot undefined")
  const findLotInInitialData = (lotId: string, buildingId?: string) => {
    // 1. Chercher dans les lots indépendants
    const independentLot = initialBuildingsData.lots.find(l => String(l.id) === lotId)
    if (independentLot) return independentLot

    // 2. Chercher dans les lots des immeubles
    for (const building of initialBuildingsData.buildings) {
      const lot = building.lots?.find(l => String(l.id) === lotId)
      if (lot) {
        return { ...lot, building: { id: building.id, name: building.name, address_record: building.address_record } }
      }
    }

    return null
  }

  const handleLotSelect = async (lotId: string | null, buildingId?: string) => {
    // Reset building tenants and contract selection when switching lots
    setBuildingTenants(null)
    setSelectedContractId(null)
    setAvailableContracts([])

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
    // ✅ Utiliser les données initiales pour l'état optimiste (évite "Lot undefined")
    const lotFromInitial = findLotInInitialData(lotIdStr, buildingIdStr)
    // ✅ Adresse: priorité au lot indépendant, sinon adresse du building
    const lotAddress = getFormattedAddress(lotFromInitial?.address_record)
      || getFormattedAddress(lotFromInitial?.building?.address_record)
    setSelectedLogement({
      type: "lot",
      id: lotIdStr,
      buildingId: buildingIdStr,
      name: lotFromInitial?.reference || `Lot ${lotIdStr.slice(0, 8)}`,
      building: lotFromInitial?.building?.name,
      address: lotAddress,
      is_occupied: lotFromInitial?.is_occupied || false
    })
    // ✅ Initialiser includeTenants depuis données initiales pour cohérence avec étape 1
    setIncludeTenants(lotFromInitial?.is_occupied || false)

    // ✅ FIX: Générer titre par défaut AVANT le check des services
    // Utilise les données initiales qui sont toujours disponibles
    if (!formData.title) {
      const nextNumber = (initialBuildingsData.interventionCount || 0) + 1
      const lotName = lotFromInitial?.reference || 'Lot'
      setFormData(prev => ({
        ...prev,
        title: `Intervention #${nextNumber} - ${lotName}`
      }))
    }

    // ✅ FIX: Charger les tenants via Server Action AVANT le check services
    // Les Server Actions ne dépendent pas des services client
    if (lotFromInitial?.is_occupied) {
      try {
        const tenantsResult = await getActiveTenantsByLotAction(lotIdStr)
        if (tenantsResult.success && tenantsResult.data?.tenants.length > 0) {
          const primaryTenant = tenantsResult.data.tenants.find(t => t.is_primary)
            || tenantsResult.data.tenants[0]

          const tenants = tenantsResult.data.tenants.map(t => ({
            user_id: t.user_id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            contract_id: t.contract_id  // Pour filtrer par contrat sélectionné
          }))

          // Mettre à jour selectedLogement avec les tenants
          setSelectedLogement(prev => prev ? {
            ...prev,
            tenant: primaryTenant.name,
            tenantEmail: primaryTenant.email,
            tenantPhone: primaryTenant.phone,
            tenants
          } : prev)

          // ✅ Extract unique contracts from tenants (with dates)
          const contractsMap = new Map<string, { id: string; title: string; tenantNames: string[]; startDate: string; endDate: string }>()
          tenantsResult.data.tenants.forEach(tenant => {
            if (tenant.contract_id) {
              const existing = contractsMap.get(tenant.contract_id)
              if (existing) {
                existing.tenantNames.push(tenant.name)
              } else {
                contractsMap.set(tenant.contract_id, {
                  id: tenant.contract_id,
                  title: tenant.contract_title,
                  tenantNames: [tenant.name],
                  startDate: tenant.contract_start_date,
                  endDate: tenant.contract_end_date
                })
              }
            }
          })

          const contracts = Array.from(contractsMap.values())
          setAvailableContracts(contracts)

          // Auto-select if only one contract
          if (contracts.length === 1) {
            setSelectedContractId(contracts[0].id)
          } else {
            setSelectedContractId(null)
          }

          logger.info("✅ [LOT-SELECT] Tenant and contract data loaded (early):", {
            primaryTenant: primaryTenant.name,
            tenantsCount: tenants.length,
            contractsCount: contracts.length
          })
        }
      } catch (tenantError) {
        logger.warn("⚠️ [LOT-SELECT] Could not load tenant data (early):", tenantError)
      }
    }

    if (!services) {
      logger.info("⏳ Services not ready, cannot load lot details")
      return
    }

    try {
      // Load real lot data with relations when selecting a lot
      const lotResult = await services.lot.getByIdWithRelations(lotIdStr)

      if (lotResult && lotResult.success && lotResult.data) {
        const lotData = lotResult.data as any

        // ✅ Charger les locataires actifs depuis les contrats pour obtenir email et téléphone
        let tenantName: string | null = lotData.tenant?.name || null
        let tenantEmail: string | null = null
        let tenantPhone: string | null = null
        let tenants: Array<{ user_id: string; name: string; email: string | null; phone: string | null; contract_id: string | null }> = []

        try {
          const tenantsResult = await getActiveTenantsByLotAction(lotIdStr)
          if (tenantsResult.success && tenantsResult.data?.tenants.length > 0) {
            // Prendre le locataire principal ou le premier
            const primaryTenant = tenantsResult.data.tenants.find(t => t.is_primary)
              || tenantsResult.data.tenants[0]

            tenantName = primaryTenant.name
            tenantEmail = primaryTenant.email
            tenantPhone = primaryTenant.phone

            // Stocker tous les locataires avec contract_id pour filtrage
            tenants = tenantsResult.data.tenants.map(t => ({
              user_id: t.user_id,
              name: t.name,
              email: t.email,
              phone: t.phone,
              contract_id: t.contract_id  // Pour filtrer par contrat sélectionné
            }))

            logger.info("✅ [LOT-SELECT] Tenant data loaded from contracts:", {
              primaryTenant: tenantName,
              tenantsCount: tenants.length
            })
          }
        } catch (tenantError) {
          logger.warn("⚠️ [LOT-SELECT] Could not load tenant data from contracts:", tenantError)
        }

        // ✅ Adresse: priorité au lot indépendant, sinon adresse du building
        const lotDataAddress = getFormattedAddress(lotData.address_record)
          || getFormattedAddress(lotData.building?.address_record)
        setSelectedLogement({
          id: lotData.id,
          name: lotData.reference,
          type: "lot",
          building: lotData.building?.name || "Immeuble",
          address: lotDataAddress,
          buildingId: lotData.building_id || lotData.building?.id,
          floor: lotData.floor,
          tenant: tenantName,
          tenantEmail,
          tenantPhone,
          tenants, // Liste de tous les locataires
          // ✅ Préserver is_occupied des données initiales (basées sur contrats actifs)
          is_occupied: lotFromInitial?.is_occupied ?? lotData.is_occupied ?? false
        })
        // Toggle locataires: coché par défaut si lot occupé (basé sur contrats actifs)
        setIncludeTenants(lotFromInitial?.is_occupied ?? lotData.is_occupied ?? false)
        setSelectedLotId(String(lotData.id))
        setSelectedBuildingId(lotData.building_id ? String(lotData.building_id) : (lotData.building?.id ? String(lotData.building.id) : undefined))

        // ✅ Générer titre par défaut si vide
        if (!formData.title) {
          const nextNumber = (initialBuildingsData.interventionCount || 0) + 1
          const lotName = lotData.reference || lotFromInitial?.reference || 'Lot'
          setFormData(prev => ({
            ...prev,
            title: `Intervention #${nextNumber} - ${lotName}`
          }))
        }
      } else {
        // Fallback to minimal data if lot not found (utilise données initiales)
        const fallbackAddress = getFormattedAddress(lotFromInitial?.address_record)
          || getFormattedAddress(lotFromInitial?.building?.address_record)
        setSelectedLotId(lotIdStr)
        setSelectedBuildingId(buildingIdStr)
        setSelectedLogement({
          type: "lot",
          id: lotIdStr,
          buildingId: buildingIdStr,
          name: lotFromInitial?.reference || `Lot ${lotIdStr.slice(0, 8)}`,
          building: lotFromInitial?.building?.name,
          address: fallbackAddress
        })
      }
    } catch (error) {
      logger.error("❌ Error loading lot data:", error)
      // Fallback to minimal data (utilise données initiales)
      const fallbackAddress = getFormattedAddress(lotFromInitial?.address_record)
        || getFormattedAddress(lotFromInitial?.building?.address_record)
      setSelectedLotId(lotIdStr)
      setSelectedBuildingId(buildingIdStr)
      setSelectedLogement({
        type: "lot",
        id: lotIdStr,
        buildingId: buildingIdStr,
        name: lotFromInitial?.reference || `Lot ${lotIdStr.slice(0, 8)}`,
        building: lotFromInitial?.building?.name,
        address: fallbackAddress
      })
    }
  }

  const addAvailability = () => {
    setFormData((prev) => ({
      ...prev,
      availabilities: [...prev.availabilities, { date: "", startTime: "09:00", endTime: "17:00" }],
    }))
  }

  const addTimeSlot = (slot?: { date: string; startTime: string; endTime: string }) => {
    setTimeSlots((prev) => [...prev, slot || { date: "", startTime: "09:00", endTime: "17:00" }])
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
        toast.error("Validation échouée", { description: error })
      })
      return
    }

    if (currentStep < 4) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      // Track the maximum step reached for header navigation
      if (nextStep > maxStepReached) {
        setMaxStepReached(nextStep)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handler for step clicks in the header (updates currentStep, maxStepReached is already tracked)
  const handleStepClick = (step: number) => {
    setCurrentStep(step)
    // Update maxStepReached if navigating forward
    if (step > maxStepReached) {
      setMaxStepReached(step)
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
        // description est optionnelle (gestionnaire)
        if (!formData.urgency?.trim()) {
          errors.push("L'urgence est requise")
        }
        if (!formData.type?.trim()) {
          errors.push("Le type d'intervention est requis")
        }
        break

      case 3: // Contacts
        if (selectedManagerIds.length === 0) {
          errors.push("Au moins un gestionnaire doit être assigné")
        }
        break

      case 4: // Planification - validation selon le mode
        // ✅ FIX 2026-01-25: Validation conditionnelle selon schedulingType
        if (schedulingType === 'fixed') {
          if (!fixedDateTime.date) {
            errors.push("Veuillez sélectionner une date pour l'intervention")
          }
          if (!fixedDateTime.time) {
            errors.push("Veuillez sélectionner une heure pour l'intervention")
          }
        }
        if (schedulingType === 'slots') {
          if (!timeSlots || timeSlots.length === 0) {
            errors.push("Veuillez ajouter au moins un créneau horaire")
          }
        }
        // Mode 'flexible' : aucune validation requise (c'est le comportement souhaité)
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
    router.push("/gestionnaire/operations");
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
    // ✅ Protection contre les doubles clics
    if (isCreating) return

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
        type: formData.type, // ✅ Obligatoire
        urgency: formData.urgency,

        // Housing selection
        selectedLogement,
        selectedBuildingId: normalizedSelectedBuildingId,
        selectedLotId: normalizedSelectedLotId,

        // Contact assignments
        selectedManagerIds,
        selectedProviderIds,

        // Multi-provider mode
        assignmentMode: selectedProviderIds.length > 1 ? 'group' : 'single',

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
        // Include tenants for lots OR buildings
        includeTenants: (selectedLogement?.type === 'lot' && selectedLogement?.is_occupied)
          ? includeTenants
          : (selectedLogement?.type === 'building' && buildingTenants?.hasActiveTenants)
            ? includeTenants
            : false,
        // Excluded lots (for building interventions with granular selection)
        // ✅ excludedLotIds est déjà un array, pas besoin de Array.from()
        excludedLotIds: selectedLogement?.type === 'building' && includeTenants
          ? excludedLotIds
          : [],

        // Confirmation des participants
        // ✅ FIX 2026-03-01: slots with 1 créneau = like fixed (depends on toggle)
        // slots with 2+ créneaux = always mandatory
        requiresParticipantConfirmation:
          (schedulingType === 'fixed' && requiresConfirmation) ||
          isMultiSlot ||
          (schedulingType === 'slots' && timeSlots.length < 2 && requiresConfirmation),
        confirmationRequiredUserIds:
          ((schedulingType === 'fixed' && requiresConfirmation) || isMultiSlot || (schedulingType === 'slots' && timeSlots.length < 2 && requiresConfirmation))
            ? confirmationRequired
            : [],

        // Team context
        teamId: currentUserTeam?.id || initialBuildingsData.teamId,

        // Source email (for automatic linking after creation)
        sourceEmailId: sourceEmailId || undefined,

        // Contract link (for occupied lots with active contracts)
        contractId: selectedContractId || undefined,

        // ✅ FIX 2026-01-25: Explicit tenant selection for lot interventions
        // Only include tenant IDs from the selected contract (filteredTenants)
        // This prevents auto-assignment of ALL active tenants when no contract is selected
        selectedTenantIds: selectedLogement?.type === 'lot' && includeTenants && filteredTenants.length > 0
          ? filteredTenants.map((t: { user_id: string }) => t.user_id).filter(Boolean)
          : []
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

      // ✅ Pattern simplifié: toast + redirect immédiat (sans délai 500ms)
      toast.success("Intervention créée avec succès", { description: `L'intervention "${result.intervention.title}" a été créée et assignée.` })

      // Redirect immédiat vers la page de détail de l'intervention
      realtime?.broadcastInvalidation(['interventions', 'stats'])
      router.push(`/gestionnaire/operations/interventions/${result.intervention.id}`)

    } catch (error) {
      logger.error("❌ Error creating intervention:", error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setError(errorMessage)
    } finally {
      setIsCreating(false)
    }
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
        backButtonText="Retour"
        onBack={() => router.back()}
        steps={interventionSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowFutureSteps={false}
        maxReachableStep={maxStepReached}
      />

      {/* Main Content with horizontal padding and bottom space for footer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pb-10 bg-background">
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
                showViewToggle={true}
              />
            </div>
          </div>
        )}

        {/* Step 2: Formulaire de description */}
        {currentStep === 2 && selectedLogement && (
          <div className="space-y-6">
            {/* Détails de l'intervention - avec localisation intégrée */}
            <Card>
            <CardContent className="p-0 flex flex-col gap-6">
              {/* Header avec titre + localisation compacte */}
              <div className="flex flex-col gap-3">
                {/* Titre de la card */}
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-medium">Détails de l'intervention</h3>
                </div>

                {/* Localisation + Contrat - Grille alignée avec le formulaire en dessous (2fr_1fr) */}
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                  {/* Localisation compacte + bouton modifier - Aligné avec Titre/Description */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg min-w-0">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm">
                        {selectedLogement.type === 'lot'
                          ? (selectedLogement.building
                              ? `${selectedLogement.building} › Lot ${selectedLogement.name}`
                              : `Lot ${selectedLogement.name}`)
                          : selectedLogement.name}
                      </span>
                      {selectedLogement.address && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{selectedLogement.address}</span>
                        </>
                      )}
                      {/* Badge occupation (lots uniquement) */}
                      {selectedLogement.type === 'lot' && (
                        <Badge variant={selectedLogement.is_occupied ? "default" : "secondary"} className="ml-1 flex-shrink-0">
                          {selectedLogement.is_occupied ? "Occupé" : "Vacant"}
                        </Badge>
                      )}
                    </div>
                    {/* Bouton modifier -> retour étape 1 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                      className="h-8 px-2 text-muted-foreground hover:text-foreground flex-shrink-0 ml-2"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Modifier le bien</span>
                    </Button>
                  </div>

                  {/* Contract Selection - Aligné avec Type+Urgence / Files */}
                  {selectedLogement?.type === 'lot' &&
                   selectedLogement?.is_occupied &&
                   availableContracts.length > 0 ? (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
                      <label className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2 block">
                        Lier à un contrat
                      </label>
                      <Select
                        value={selectedContractId || 'none'}
                        onValueChange={(value) => {
                          const newContractId = value === 'none' ? null : value
                          setSelectedContractId(newContractId)
                          setIncludeTenants(newContractId !== null)
                        }}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 h-auto py-2 w-full">
                          <SelectValue placeholder="Sélectionner...">
                            {selectedContractId && availableContracts.find(c => c.id === selectedContractId) ? (
                              <div className="flex flex-col items-start text-left">
                                <span className="font-medium text-sm">
                                  {availableContracts.find(c => c.id === selectedContractId)?.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {availableContracts.find(c => c.id === selectedContractId)?.tenantNames.join(', ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Aucun</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">Aucun contrat</span>
                          </SelectItem>
                          {availableContracts.map((contract) => {
                            const formatDate = (dateStr: string) => {
                              const date = new Date(dateStr)
                              return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
                            }
                            const dateRange = `${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}`

                            return (
                              <SelectItem key={contract.id} value={contract.id}>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{contract.title}</span>
                                    <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                      {dateRange}
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {contract.tenantNames.join(', ')}
                                  </span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    /* Placeholder vide pour maintenir la grille alignée */
                    <div />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                <h4 className="font-medium">Décrire l'intervention</h4>
                  {/* Titre (2/3) + Type & Urgence (1/3) - Aligné avec Description/File uploader */}
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                    {/* Titre - Même largeur que Description */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Titre de l'intervention *</label>
                      <Input
                        placeholder="Ex: Fuite d'eau dans la salle de bain"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Type + Urgence - Partagent le 1/3 restant */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Catégorie d'intervention <span className="text-red-500">*</span>
                        </label>
                        <InterventionTypeCombobox
                          value={formData.type}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                          placeholder="Sélectionnez la catégorie"
                          className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 w-full"
                          initialData={initialInterventionTypes}
                        />
                      </div>

                      <div className="min-w-0">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Urgence <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={formData.urgency}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, urgency: value }))}
                        >
                          <SelectTrigger className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 w-full">
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
                      <label className="block text-sm font-medium text-foreground mb-2">Description détaillée</label>
                      <Textarea
                        placeholder="Décrivez l'intervention en détail : où, quand, comment..."
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        className="min-h-[280px] border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>

                    {/* File Uploader - 1/3 largeur (aligné avec Type+Urgence) */}
                    <div className="h-[280px]">
                      <label className="block text-sm font-medium text-foreground mb-2">Fichiers joints (optionnel)</label>
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
                      <div key={index} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <Input
                          type="date"
                          value={availability.date}
                          onChange={(e) => updateAvailability(index, "date", e.target.value)}
                          className="flex-1 border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <Input
                          type="time"
                          value={availability.startTime}
                          onChange={(e) => updateAvailability(index, "startTime", e.target.value)}
                          className="w-32 border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-muted-foreground">a</span>
                        <Input
                          type="time"
                          value={availability.endTime}
                          onChange={(e) => updateAvailability(index, "endTime", e.target.value)}
                          className="w-32 border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card className="p-6">
              <AssignmentSectionV2
                managers={managers as any[]}
                providers={providers as any[]}
                tenants={filteredTenants.map((t: any, i: number) => ({
                  id: t.user_id || `tenant-${selectedLogement?.id || 'unknown'}-${i}`,
                  name: t.name || 'Locataire',
                  email: t.email || '',
                  phone: t.phone || '',
                  type: 'locataire' as const,
                  has_account: t.has_account  // ✅ FIX 2026-02-01: Pass through invitation status
                }))}
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
                // Tenant toggle props (for occupied lots with selected contract OR buildings with tenants)
                showTenantsSection={
                  (selectedLogement?.type === 'lot' && selectedLogement?.is_occupied === true && selectedContractId !== null) ||
                  (selectedLogement?.type === 'building' && buildingTenants?.hasActiveTenants === true)
                }
                includeTenants={includeTenants}
                onIncludeTenantsChange={setIncludeTenants}
                // Building tenants (grouped by lot)
                buildingTenants={selectedLogement?.type === 'building' ? buildingTenants : null}
                loadingBuildingTenants={loadingBuildingTenants}
                // Lots selection (for granular control)
                excludedLotIds={excludedLotIds}
                onLotToggle={handleLotToggle}
                // Confirmation des participants
                requiresConfirmation={requiresConfirmation}
                onRequiresConfirmationChange={handleRequiresConfirmationChange}
                confirmationRequired={confirmationRequired}
                onConfirmationRequiredChange={handleConfirmationRequiredChange}
              />
            </Card>
          </div>
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
                // ✅ FIX: Ne passer tenant QUE si des locataires sont réellement inclus
                // Évite le fallback dans InterventionConfirmationSummary qui afficherait
                // un locataire même si l'utilisateur n'en a pas sélectionné
                tenant: (
                  // Cas 1: Lot avec contrat sélectionné et locataires inclus
                  (selectedLogement?.type === 'lot' && includeTenants && selectedContractId && filteredTenants.length > 0) ||
                  // Cas 2: Immeuble avec locataires inclus
                  (selectedLogement?.type === 'building' && includeTenants && buildingTenants?.hasActiveTenants)
                ) ? selectedLogement?.tenant : undefined,
              },
              intervention: {
                title: formData.title,
                description: formData.description,
                category: formData.type,
                urgency: formData.urgency,
                room: formData.room,
              },
              contacts: [
                // Gestionnaires et prestataires sélectionnés
                ...getSelectedContacts().map(contact => ({
                  id: contact.id.toString(),
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone,
                  role: contact.role,
                  speciality: contact.speciality,
                  isCurrentUser: contact.isCurrentUser,
                  has_account: (contact as any).has_account,
                })),
                // ✅ Ajouter les locataires du lot filtrés par contrat sélectionné
                ...(filteredTenants.length > 0 && includeTenants && selectedContractId
                  ? filteredTenants.map((tenant: { user_id: string; name: string; email: string | null; phone: string | null; contract_id: string | null; has_account?: boolean }, index: number) => ({
                      id: tenant.user_id || `tenant-${selectedLogement?.id}-${index}`,
                      name: tenant.name,
                      role: 'Locataire',
                      email: tenant.email || undefined,
                      phone: tenant.phone || undefined,
                      isCurrentUser: false,
                      has_account: tenant.has_account,
                    }))
                  : []),
                // 🆕 Ajouter les locataires d'immeuble (depuis buildingTenants)
                // ✅ FIX 2026-03-01: Dédupliquer par user_id — un locataire sur 2 lots n'apparaît qu'une fois
                // ✅ FIX 2026-01-25: UNIQUEMENT pour interventions IMMEUBLE (pas de lot sélectionné)
                ...(buildingTenants && includeTenants && !selectedLotId
                  ? (() => {
                      const seen = new Set<string>()
                      return buildingTenants.byLot
                        .filter(lot => !excludedLotIds.includes(lot.lotId))
                        .flatMap(lot => lot.tenants
                          .filter(tenant => {
                            if (seen.has(tenant.user_id)) return false
                            seen.add(tenant.user_id)
                            return true
                          })
                          .map((tenant) => ({
                            id: tenant.user_id,
                            name: tenant.name,
                            role: 'Locataire',
                            email: tenant.email || undefined,
                            phone: tenant.phone || undefined,
                            isCurrentUser: false,
                            has_account: tenant.has_account,
                          })))
                    })()
                  : [])
              ],
              scheduling: schedulingType === 'slots' && timeSlots.length > 0
                ? {
                    type: 'slots' as const,
                    slots: timeSlots.map(slot => ({
                      date: slot.date,
                      startTime: slot.startTime,
                      endTime: slot.endTime,
                    })),
                  }
                : schedulingType === 'fixed' && fixedDateTime.date
                ? {
                    type: 'immediate' as const,
                    slots: [{
                      date: fixedDateTime.date,
                      startTime: fixedDateTime.time || '09:00',
                      endTime: fixedDateTime.time || '09:00', // Même valeur = pas de range
                    }],
                  }
                : schedulingType === 'flexible'
                ? { type: 'flexible' as const }
                : undefined,
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
                  type: fileWithPreview.file.type || documentTypeLabel,
                  previewUrl: fileWithPreview.preview, // Image preview URL
                }
              }),
              expectsQuote,
              variant: 'manager' as const, // Manager-specific display
              assignmentMode: selectedProviderIds.length > 1 ? 'group' : 'single',
              // Participant confirmation data
              // ✅ FIX 2026-03-01: 1 créneau = like fixed (optional), 2+ = mandatory
              requiresParticipantConfirmation:
                (schedulingType === 'fixed' && requiresConfirmation) ||
                isMultiSlot ||
                (schedulingType === 'slots' && timeSlots.length < 2 && requiresConfirmation),
              confirmationRequiredUserIds: confirmationRequired,
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
                showSuccessHeader={false}
                onGoToDashboard={() => router.push('/gestionnaire/dashboard')}
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
        <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
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
            returnPath: '/gestionnaire/operations/nouvelle-intervention'
          })
        }}
      />

    </>
  )
}

