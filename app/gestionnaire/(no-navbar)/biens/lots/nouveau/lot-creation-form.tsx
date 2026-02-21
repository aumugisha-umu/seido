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
import { Home, Users, ArrowLeft, ArrowRight, Plus, X, User, MapPin, FileText, Building2, Check, Loader2, Paperclip, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { BuildingInfoForm } from "@/components/building-info-form"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import PropertySelector from "@/components/property-selector"
import { BuildingLotsStepV2 } from "@/components/building-lots-step-v2"
import { BuildingContactsStepV3 } from "@/components/building-contacts-step-v3"
import { BuildingConfirmationStep } from "@/components/building-confirmation-step"
import { PropertyInterventionsStep } from "@/components/property-interventions-step"
import type { ScheduledInterventionData } from "@/components/contract/intervention-schedule-row"
import { LotContactCardV4 } from "@/components/ui/lot-contact-card-v4"
import { IndependentLotsStepV2 } from "@/components/independent-lots-step-v2"
import type { IndependentLot } from "@/components/ui/independent-lot-input-card-v2"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { createLotService, createContactInvitationService } from "@/lib/services"
import type { Team, User as UserType, Contact } from "@/lib/services/core/service-types"
import { useToast } from "@/hooks/use-toast"
import { assignContactToLotAction, createLotAction, createContactWithOptionalInviteAction, getBuildingWithRelations, createAddressAction } from "./actions"


import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { lotSteps } from "@/lib/step-configurations"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import type { CreateContactData } from "@/app/gestionnaire/dashboard/actions"


import { LotCategory, getLotCategoryConfig, getAllLotCategories } from "@/lib/lot-types"
import { GoogleMapsProvider } from "@/components/google-maps"
import { logger, logError } from '@/lib/logger'
import { usePropertyDocumentUpload } from '@/hooks/use-property-document-upload'
import { LOT_DOCUMENT_SLOTS } from '@/lib/constants/property-document-slots'
import { useMultiLotDocumentUpload } from '@/hooks/use-multi-lot-document-upload'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DocumentChecklistGeneric } from '@/components/documents/document-checklist-generic'
import type { UsePropertyDocumentUploadReturn } from '@/hooks/use-property-document-upload'
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

/** Documents tab for independent lots — accordion per lot with document checklist */
function IndependentLotsDocumentsTab({
  lots,
  lotDocUploads
}: {
  lots: { id: string; reference: string; category: string }[]
  lotDocUploads: { [lotId: string]: UsePropertyDocumentUploadReturn }
}) {
  const [expandedLots, setExpandedLots] = useState<{ [key: string]: boolean }>({})
  const toggleExpansion = (lotId: string) => {
    setExpandedLots(prev => ({ ...prev, [lotId]: !prev[lotId] }))
  }

  return (
    <div className="space-y-3">
      {lots.map((lot, index) => {
        const lotNumber = lots.length - index
        const upload = lotDocUploads[lot.id]
        if (!upload) return null
        const isExpanded = expandedLots[lot.id] || false
        const catConfig = getLotCategoryConfig(lot.category as LotCategory)

        return (
          <div key={lot.id} className="border rounded-lg bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggleExpansion(lot.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold bg-blue-100 text-blue-700">
                #{lotNumber}
              </div>
              <div className="flex-1 text-left">
                <span className="font-medium text-sm">{lot.reference}</span>
                <Badge variant="outline" className="ml-2 text-xs">{catConfig.label}</Badge>
              </div>
              {upload.hasFiles && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  {upload.progress.percentage}%
                </Badge>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 border-t">
                <DocumentChecklistGeneric
                  title={`Documents — ${lot.reference}`}
                  slots={upload.slots}
                  onAddFilesToSlot={upload.addFilesToSlot}
                  onRemoveFileFromSlot={upload.removeFileFromSlot}
                  progress={upload.progress}
                  missingRecommendedTypes={upload.missingRecommendedTypes}
                  isUploading={upload.isUploading}
                  onSetSlotExpiryDate={upload.setSlotExpiryDate}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface LotCreationFormProps {
  userProfile: { id: string; email: string; name: string; role: string }
  userTeam: Team
  allTeams: Team[]
  initialTeamManagers: TeamManager[]
  initialCategoryCounts: Record<string, number>
  prefillBuildingId: string | null
}

export default function LotCreationForm({
  userProfile,
  userTeam: initialUserTeam,
  allTeams,
  initialTeamManagers,
  initialCategoryCounts,
  prefillBuildingId,
}: LotCreationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { data: managerData } = useManagerStats()
  const [currentStep, setCurrentStepState] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)

  // Wrapper pour setCurrentStep qui met aussi à jour maxStepReached
  const setCurrentStep = (step: number) => {
    const clampedStep = Math.max(1, Math.min(step, 5)) // 5 étapes total (Immeuble, Lot, Contacts&Docs, Interventions, Confirmation)
    setCurrentStepState(clampedStep)
    if (clampedStep > maxStepReached) {
      setMaxStepReached(clampedStep)
    }
  }

  // Handler pour le clic sur une étape dans le header
  const handleStepClick = (step: number) => {
    setCurrentStep(step)
  }

  // États pour la gestion des gestionnaires de lot
  const [isLotManagerModalOpen, setIsLotManagerModalOpen] = useState(false)

  // États pour les informations générales de l'immeuble (étape 2)
  const [selectedManagerId, setSelectedManagerId] = useState<string>(userProfile.role === 'gestionnaire' ? userProfile.id : (initialTeamManagers[0]?.user?.id || ""))
  const [teamManagers, setTeamManagers] = useState<TeamManager[]>(initialTeamManagers)
  const [userTeam, setUserTeam] = useState<Team | null>(initialUserTeam)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categoryCountsByTeam, setCategoryCountsByTeam] = useState<Record<string, number>>(initialCategoryCounts)
  const [teams, setTeams] = useState<Team[]>(allTeams)
  const [error, setError] = useState<string>("")
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Interventions planifiées (étape 4)
  const [scheduledInterventions, setScheduledInterventions] = useState<ScheduledInterventionData[]>([])

  // Document upload hook for lot documents (single lot / independent mode fallback)
  const lotDocUpload = usePropertyDocumentUpload({
    entityType: 'lot',
    entityId: undefined, // Set after lot creation
    teamId: userTeam?.id,
    slotConfigs: LOT_DOCUMENT_SLOTS,
    onUploadError: (err) => toast({ title: 'Erreur upload', description: err, variant: 'destructive' })
  })

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
      owner: [],
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

  // Pre-fill detection (buildingId comes from server-side searchParams prop)
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
      [contactType: string]: Contact[]
    }
  }>({})
  const [assignedManagersByLot, setAssignedManagersByLot] = useState<{
    [lotId: string]: UserType[]
  }>({})
  // Format identique à la création d'immeuble: tenant, provider, owner, other
  const [buildingContacts, setBuildingContacts] = useState<{
    [type: string]: Contact[]
  }>({
    tenant: [],
    provider: [],
    owner: [],
    other: [],
  })

  // ✅ NEW: Independent lots state (pour mode "independent")
  const initialLotId = `lot-${Date.now()}`
  const [independentLots, setIndependentLots] = useState<IndependentLot[]>([
    {
      id: initialLotId,
      reference: "Lot 1",
      category: "appartement",
      street: "",
      postalCode: "",
      city: "",
      country: "Belgique",
      floor: "",
      doorNumber: "",
      description: ""
    }
  ])
  const [expandedIndependentLots, setExpandedIndependentLots] = useState<{[key: string]: boolean}>({
    [initialLotId]: true // ✅ Premier lot ouvert par défaut
  })

  // Multi-lot document upload hook for existing-building and independent modes
  const multiLotIds = lotData.buildingAssociation === "existing"
    ? lots.map(l => l.id)
    : independentLots.map(l => l.id)
  const { lotDocUploads, uploadForLot: uploadLotDocs } = useMultiLotDocumentUpload({
    lotIds: multiLotIds,
    teamId: userTeam?.id,
    slotConfigs: LOT_DOCUMENT_SLOTS,
    onUploadError: (err) => toast({ title: 'Erreur upload', description: err, variant: 'destructive' })
  })

  // Services initialized immediately — auth already verified server-side
  const [services] = useState(() => ({
    lot: createLotService(),
    contactInvitation: createContactInvitationService()
  }))

  // 🆕 State for BuildingContactsStepV3 (moved here to respect React's Rules of Hooks)
  const [currentLotIdForModal, setCurrentLotIdForModal] = useState<string | null>(null)
  const [buildingManagers, setBuildingManagers] = useState<UserType[]>([])
  const [existingBuildingLots, setExistingBuildingLots] = useState<Array<{
    id: string
    reference: string
    floor: string
    door_number: string
    description: string
    category: LotCategory
  }>>([])
  const [isLoadingBuildingData, setIsLoadingBuildingData] = useState(false)

  // Pre-fill from building page (gestionnaire navigates from building detail)
  useEffect(() => {
    if (isPreFilled || !prefillBuildingId) {
      return
    }

    const buildingId = prefillBuildingId
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
  }, [prefillBuildingId, isPreFilled])

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

  // ✅ Initialisation automatique du premier lot (pour mode "existing building")
  // NOTE: This hook MUST be called before any early returns to respect React's Rules of Hooks
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
  // NOTE: This hook MUST be called before any early returns to respect React's Rules of Hooks
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
  // NOTE: This hook MUST be called before any early returns to respect React's Rules of Hooks
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

  // ✅ Assigner automatiquement le gestionnaire au premier lot indépendant initial
  // NOTE: This hook MUST be called before any early returns to respect React's Rules of Hooks
  useEffect(() => {
    if (!userProfile || !selectedManagerId || teamManagers.length === 0) {
      return // Attendre que les données soient chargées
    }

    // Vérifier s'il y a un premier lot indépendant sans gestionnaire
    if (independentLots.length > 0) {
      const firstLot = independentLots[0]
      const hasManager = assignedManagersByLot[firstLot.id]?.length > 0

      if (!hasManager) {
        const currentUserAsManager = teamManagers.find(m => m.user.id === userProfile.id)
        if (currentUserAsManager) {
          setAssignedManagersByLot(prev => ({
            ...prev,
            [firstLot.id]: [currentUserAsManager.user]
          }))
          logger.info("👤 [INDEPENDENT-LOT] Default manager assigned to initial lot:", currentUserAsManager.user.name)
        }
      }
    }
  }, [userProfile, selectedManagerId, teamManagers, independentLots, assignedManagersByLot])

  // ✅ Load building data when a building is selected (for existing building mode)
  // NOTE: This hook MUST be called before any early returns to respect React's Rules of Hooks
  useEffect(() => {
    const loadBuildingData = async () => {
      if (lotData.buildingAssociation !== "existing" || !lotData.selectedBuilding) {
        // Reset if no building selected - format identique à l'initialisation
        setBuildingManagers([])
        setBuildingContacts({
          tenant: [],
          provider: [],
          owner: [],
          other: [],
        })
        setExistingBuildingLots([])
        return
      }

      setIsLoadingBuildingData(true)
      try {
        const result = await getBuildingWithRelations(lotData.selectedBuilding)
        if (!result.success || !result.building) {
          throw new Error(result.error || "Building data not found")
        }

        const building = result.building

        logger.info('🏢 [BUILDING-DATA] Building loaded:', {
          buildingId: building.id,
          buildingName: building.name,
          buildingContactsType: typeof building.building_contacts,
          buildingContactsIsArray: Array.isArray(building.building_contacts),
          buildingContactsLength: (building.building_contacts as any)?.length,
          buildingContactsRaw: building.building_contacts
        })

        // ✅ Extract building managers (type='gestionnaire' in building_contacts)
        // S'assurer que building_contacts est un tableau
        const buildingContactsArray = Array.isArray(building.building_contacts)
          ? building.building_contacts
          : []

        logger.info('🏢 [BUILDING-DATA] Building contacts array:', {
          length: buildingContactsArray.length,
          contacts: buildingContactsArray
        })

        const rawManagers = buildingContactsArray.filter((bc: any) => {
          if (!bc || typeof bc !== 'object') return false
          if (!bc.user || typeof bc.user !== 'object') return false
          const role = bc.user?.role
          logger.info('🔍 [BUILDING-DATA] Checking contact role:', {
            contactId: bc.user?.id,
            role: role,
            isManager: role === 'gestionnaire' || role === 'admin'
          })
          return role === 'gestionnaire' || role === 'admin'
        })

        logger.info('👥 [BUILDING-DATA] Raw managers filtered:', {
          count: rawManagers.length,
          managers: rawManagers
        })

        // ✅ Normalize managers to ensure all required properties exist
        // S'assurer que rawManagers est un tableau avant d'appeler .map()
        const safeRawManagers = Array.isArray(rawManagers) ? rawManagers : []
        const managers: UserType[] = safeRawManagers
          .map((bc: any) => {
            // Vérifications défensives supplémentaires
            if (!bc || typeof bc !== 'object') return null

            const user = bc.user
            if (!user || typeof user !== 'object') return null

            // Valider que l'id existe et n'est pas vide (requis)
            if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') return null

            // Ensure all required properties for User type (matching service-types.ts)
            // Inclure tous les champs requis même avec des valeurs par défaut
            const normalizedManager: UserType = {
              id: user.id,
              auth_user_id: user.auth_user_id || null,
              email: user.email || '',
              name: user.name || user.email || 'Sans nom',
              role: (user.role as 'admin' | 'gestionnaire' | 'prestataire' | 'proprietaire' | 'locataire') || 'gestionnaire',
              phone: user.phone || null,
              provider_category: user.provider_category || null,
              speciality: user.speciality || null,
              is_active: user.is_active !== undefined ? user.is_active : true,
              password_set: user.password_set !== undefined ? user.password_set : false,
              // Ces champs ne sont pas disponibles depuis building_contacts mais requis par User
              // On utilise des valeurs par défaut pour la compatibilité
              created_at: user.created_at || new Date().toISOString(),
              updated_at: user.updated_at || new Date().toISOString(),
            }

            return normalizedManager
          })
          .filter((m): m is UserType => m !== null && m.id && m.id.trim() !== '')

        logger.info('✅ [BUILDING-DATA] Normalized managers ready to set:', {
          count: managers.length,
          managers: managers
        })

        setBuildingManagers(managers)

        logger.info('✅ [BUILDING-DATA] Building managers state updated via setBuildingManagers')

        // ✅ Extract building contacts grouped by type (tenant, provider, owner, other)
        // Format identique à la création d'immeuble pour compatibilité
        const contacts: { [type: string]: Contact[] } = {
          tenant: [],
          provider: [],
          owner: [],
          other: []
        }

        // Utiliser le tableau sécurisé buildingContactsArray
        buildingContactsArray.forEach((bc: any) => {
          // Vérifications défensives
          if (!bc || typeof bc !== 'object') return
          if (!bc.user || typeof bc.user !== 'object') return

          // Valider que l'id existe et n'est pas vide (requis pour Contact)
          if (!bc.user.id || typeof bc.user.id !== 'string' || bc.user.id.trim() === '') return

          // Skip gestionnaires (they're in buildingManagers)
          const role = bc.user.role
          if (role === 'gestionnaire' || role === 'admin') return

          // Créer le contact avec tous les champs requis
          const contact: Contact = {
            id: bc.user.id,
            name: bc.user.name || bc.user.email || '',
            email: bc.user.email || '',
            type: role || 'other',
            phone: bc.user.phone || undefined,
            speciality: bc.user.speciality || bc.user.provider_category || undefined
          }

          // Map by role - format identique à la création d'immeuble
          if (role === 'locataire') {
            contacts.tenant.push(contact)
          } else if (role === 'prestataire') {
            contacts.provider.push(contact)
          } else if (role === 'proprietaire') {
            contacts.owner.push(contact)
          } else {
            contacts.other.push(contact)
          }
        })

        setBuildingContacts(contacts)

        // ✅ Extract existing lots from building
        const existingLots = Array.isArray(building.lots) ? building.lots : []
        const normalizedExistingLots = existingLots.map((lot: any) => ({
          id: lot.id,
          reference: lot.reference || '',
          floor: lot.floor || '',
          door_number: lot.door_number || '',
          description: lot.description || '',
          category: (lot.category as LotCategory) || 'appartement'
        }))

        logger.info('🏢 [BUILDING-DATA] Existing lots loaded:', {
          count: normalizedExistingLots.length,
          lots: normalizedExistingLots
        })

        setExistingBuildingLots(normalizedExistingLots)
      } catch (error) {
        logger.error("❌ [LOT-CREATION] Error loading building data:", error)
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les données de l'immeuble. Veuillez réessayer.",
          variant: "destructive",
        })
        // Reset on error - format identique à l'initialisation
        setBuildingManagers([])
        setBuildingContacts({
          tenant: [],
          provider: [],
          owner: [],
          other: [],
        })
        setExistingBuildingLots([])
      } finally {
        setIsLoadingBuildingData(false)
      }
    }

    loadBuildingData()
  }, [lotData.buildingAssociation, lotData.selectedBuilding, toast])

  // ========================================
  // HELPER FUNCTIONS (after ALL hooks)
  // ========================================

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

    // ✅ Assigner automatiquement l'utilisateur actuel comme gestionnaire par défaut
    if (userProfile && selectedManagerId) {
      const currentUserAsManager = teamManagers.find(m => m.user.id === userProfile.id)
      if (currentUserAsManager) {
        setAssignedManagersByLot(prev => ({
          ...prev,
          [newLot.id]: [currentUserAsManager.user]
        }))
        logger.info("👤 [MULTI-LOT] Default manager assigned to new lot:", currentUserAsManager.user.name)
      }
    }

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

    // ✅ Copier les gestionnaires du lot dupliqué
    const existingManagers = assignedManagersByLot[lotId] || []
    if (existingManagers.length > 0) {
      setAssignedManagersByLot(prev => ({
        ...prev,
        [newLot.id]: [...existingManagers]
      }))
      logger.info("👤 [MULTI-LOT] Managers copied to duplicated lot")
    }

    // ✅ Copier les contacts du lot dupliqué
    const existingContacts = lotContactAssignments[lotId]
    if (existingContacts) {
      setLotContactAssignments(prev => ({
        ...prev,
        [newLot.id]: { ...existingContacts }
      }))
      logger.info("📇 [MULTI-LOT] Contacts copied to duplicated lot")
    }

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

  // ========================================
  // Fonctions de gestion multi-lots INDÉPENDANTS
  // ========================================

  const addIndependentLot = () => {
    const nextNumber = independentLots.length + 1
    const newLot: IndependentLot = {
      id: `independent-lot-${Date.now()}`,
      reference: `Lot ${nextNumber}`,
      category: "appartement",
      street: "",
      postalCode: "",
      city: "",
      country: "Belgique",
      floor: "",
      doorNumber: "",
      description: ""
    }

    // Ajouter en haut de liste
    setIndependentLots([newLot, ...independentLots])

    // Ouvrir seulement le nouveau lot
    setExpandedIndependentLots({ [newLot.id]: true })

    // ✅ Assigner automatiquement l'utilisateur actuel comme gestionnaire par défaut
    if (userProfile && selectedManagerId) {
      const currentUserAsManager = teamManagers.find(m => m.user.id === userProfile.id)
      if (currentUserAsManager) {
        setAssignedManagersByLot(prev => ({
          ...prev,
          [newLot.id]: [currentUserAsManager.user]
        }))
        logger.info("👤 [INDEPENDENT-LOT] Default manager assigned to new lot:", currentUserAsManager.user.name)
      }
    }

    logger.info("➕ [INDEPENDENT-LOT] Lot added:", newLot.reference)
  }

  const duplicateIndependentLot = (lotId: string) => {
    const lotToDuplicate = independentLots.find(lot => lot.id === lotId)
    if (!lotToDuplicate) return

    const newLot: IndependentLot = {
      ...lotToDuplicate,
      id: `independent-lot-${Date.now()}`,
      reference: `${lotToDuplicate.reference} (copie)`,
      // Copie l'adresse mais on pourrait auto-incrémenter le numéro de porte
      doorNumber: lotToDuplicate.doorNumber ? `${lotToDuplicate.doorNumber}-bis` : ""
    }

    setIndependentLots([newLot, ...independentLots])
    setExpandedIndependentLots({ [newLot.id]: true })

    // ✅ Copier les gestionnaires du lot dupliqué
    const existingManagers = assignedManagersByLot[lotId] || []
    if (existingManagers.length > 0) {
      setAssignedManagersByLot(prev => ({
        ...prev,
        [newLot.id]: [...existingManagers]
      }))
      logger.info("👤 [INDEPENDENT-LOT] Managers copied to duplicated lot")
    }

    // ✅ Copier les contacts du lot dupliqué
    const existingContacts = lotContactAssignments[lotId]
    if (existingContacts) {
      setLotContactAssignments(prev => ({
        ...prev,
        [newLot.id]: { ...existingContacts }
      }))
      logger.info("📇 [INDEPENDENT-LOT] Contacts copied to duplicated lot")
    }

    logger.info("📋 [INDEPENDENT-LOT] Lot duplicated:", newLot.reference)
  }

  const removeIndependentLot = (lotId: string) => {
    if (independentLots.length <= 1) {
      toast({
        title: "⚠️ Impossible de supprimer",
        description: "Au moins un lot est requis",
        variant: "destructive"
      })
      return
    }

    setIndependentLots(prevLots => prevLots.filter(lot => lot.id !== lotId))

    // Nettoyer les états associés
    const newExpandedLots = {...expandedIndependentLots}
    delete newExpandedLots[lotId]
    setExpandedIndependentLots(newExpandedLots)

    const newContactAssignments = {...lotContactAssignments}
    delete newContactAssignments[lotId]
    setLotContactAssignments(newContactAssignments)

    const newManagerAssignments = {...assignedManagersByLot}
    delete newManagerAssignments[lotId]
    setAssignedManagersByLot(newManagerAssignments)

    logger.info("🗑️ [INDEPENDENT-LOT] Lot removed:", lotId)
  }

  const updateIndependentLot = (lotId: string, field: keyof IndependentLot, value: string) => {
    logger.info("📝 [PAGE] updateIndependentLot called:", { lotId, field, value })

    setIndependentLots(prevLots => {
      logger.info("📝 [PAGE] setIndependentLots updating:", {
        lotId,
        field,
        value,
        prevLotsCount: prevLots.length
      })

      return prevLots.map(lot => {
        if (lot.id === lotId) {
          const updatedLot = { ...lot, [field]: value }

          // Si la catégorie change, on peut recalculer la référence
          if (field === 'category') {
            const categoryConfig = getLotCategoryConfig(value as LotCategory)
            const existingLotsOfCategory = prevLots.filter(l => l.category === value && l.id !== lotId).length
            const nextNumber = existingLotsOfCategory + 1
            updatedLot.reference = `${categoryConfig.label} ${nextNumber}`
          }

          logger.info("✅ [PAGE] Lot updated:", { lotId, field, newValue: updatedLot[field] })
          return updatedLot
        }
        return lot
      })
    })
  }

  // Handle geocode result for independent lots (Google Maps integration)
  // STALE CLOSURE FIX: Use functional update (prevLots =>) to ensure we have the latest state
  // This is called AFTER onUpdate calls for address fields, so we must not overwrite those updates
  const handleIndependentLotGeocodeResult = (lotId: string, result: { latitude: number; longitude: number; placeId: string; formattedAddress: string } | null) => {
    logger.info(`📍 [INDEPENDENT-LOT] Geocode result for lot ${lotId}:`, result ? 'found' : 'not found')

    setIndependentLots(prevLots => prevLots.map(lot => {
      if (lot.id === lotId) {
        if (result) {
          // IMPORTANT: Spread lot FIRST to preserve address fields updated by onUpdate calls
          return {
            ...lot,
            latitude: result.latitude,
            longitude: result.longitude,
            placeId: result.placeId,
            formattedAddress: result.formattedAddress
          }
        } else {
          // Clear geocode data if no result
          const { latitude, longitude, placeId, formattedAddress, ...rest } = lot
          return rest as IndependentLot
        }
      }
      return lot
    }))
  }

  const toggleIndependentLotExpansion = (lotId: string) => {
    setExpandedIndependentLots(prev => ({
      ...prev,
      [lotId]: !prev[lotId]
    }))
  }

  // ========================================
  // Validation pour lots indépendants
  // ========================================

  const validateIndependentLots = (): { valid: boolean; message?: string } => {
    if (independentLots.length === 0) {
      return { valid: false, message: "Au moins un lot est requis" }
    }

    // Valider chaque lot
    for (let i = 0; i < independentLots.length; i++) {
      const lot = independentLots[i]
      const lotNumber = independentLots.length - i // Pour l'affichage

      // Validation référence
      if (!lot.reference || lot.reference.trim().length < 2) {
        return {
          valid: false,
          message: `Lot ${lotNumber}: Référence requise (min 2 caractères)`
        }
      }

      // Validation adresse - rue
      if (!lot.street || lot.street.trim().length < 3) {
        return {
          valid: false,
          message: `Lot ${lotNumber} (${lot.reference}): Rue requise (min 3 caractères)`
        }
      }

      // Validation adresse - code postal
      if (!lot.postalCode || lot.postalCode.trim().length < 2) {
        return {
          valid: false,
          message: `Lot ${lotNumber} (${lot.reference}): Code postal requis`
        }
      }

      // Validation adresse - ville
      if (!lot.city || lot.city.trim().length < 2) {
        return {
          valid: false,
          message: `Lot ${lotNumber} (${lot.reference}): Ville requise (min 2 caractères)`
        }
      }

      // Validation adresse - pays
      if (!lot.country) {
        return {
          valid: false,
          message: `Lot ${lotNumber} (${lot.reference}): Pays requis`
        }
      }
    }

    // Vérifier les références en double
    const references = independentLots.map(l => l.reference.toLowerCase().trim())
    const duplicates = references.filter((ref, index) => references.indexOf(ref) !== index)

    if (duplicates.length > 0) {
      // Trouver les lots avec des références en double
      const duplicateRefs = [...new Set(duplicates)]
      return {
        valid: false,
        message: `Références en double détectées: ${duplicateRefs.join(', ')}`
      }
    }

    return { valid: true }
  }

  const handleNext = () => {
    // Si on est à l'étape 1 et qu'on a choisi de créer un nouvel immeuble, rediriger
    if (currentStep === 1 && lotData.buildingAssociation === "new") {
      logger.info("🏗️ Redirecting to building creation...")
      router.push("/gestionnaire/biens/immeubles/nouveau")
      return
    }

    // Validation avant de passer à l'étape suivante
    if (currentStep === 2 && lotData.buildingAssociation === "independent") {
      const validation = validateIndependentLots()
      if (!validation.valid) {
        toast({
          title: "⚠️ Validation requise",
          description: validation.message || "Veuillez corriger les erreurs avant de continuer",
          variant: "destructive"
        })
        logger.warn(`⚠️ [VALIDATION] Blocked navigation: ${validation.message}`)
        return
      }
    }

    // Sinon, navigation normale
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Helper: Create scheduled interventions for a lot
  const createInterventionsForLot = async (lotId: string, teamId: string) => {
    const toCreate = scheduledInterventions.filter(i => i.enabled && i.scheduledDate)
    if (toCreate.length === 0) return

    try {
      const { createInterventionAction } = await import('@/app/actions/intervention-actions')
      const results = await Promise.allSettled(
        toCreate.map(async (intervention) => {
          return createInterventionAction({
            title: intervention.title,
            description: intervention.description,
            type: intervention.interventionTypeCode,
            urgency: 'basse',
            lot_id: lotId,
            team_id: teamId,
            requested_date: intervention.scheduledDate || undefined
          }, {
            useServiceRole: true,
            assignments: intervention.assignedUsers.length > 0
              ? intervention.assignedUsers.map(a => ({ userId: a.userId, role: a.role }))
              : undefined
          })
        })
      )
      const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as { success: boolean }).success).length
      logger.info({ successCount, total: results.length, lotId }, 'Lot interventions created')
    } catch (err) {
      logger.error('⚠️ Intervention creation failed (lot created successfully):', err)
    }
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      if (!userProfile?.id) {
        logger.error("❌ User not found")
        toast({
          title: "Erreur d'authentification",
          description: "Utilisateur non connecté. Veuillez vous reconnecter.",
          variant: "destructive",
        })
        return
      }

    if (!userTeam?.id) {
      logger.error("❌ User team not found. User ID:", userProfile.id, "Teams:", teams)
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

        // Create interventions for ALL successfully created lots
        for (const { createdLot } of successfulCreations) {
          await createInterventionsForLot(createdLot.id, userTeam.id)
        }

        // Upload staged documents for each lot
        for (const { lot, createdLot } of successfulCreations) {
          const upload = lotDocUploads[lot.id]
          if (upload?.hasFiles) {
            try {
              await uploadLotDocs(lot.id, createdLot.id, userTeam.id)
            } catch (docError) {
              logger.error(`⚠️ Document upload failed for lot ${createdLot.id}:`, docError)
            }
          }
        }

        // Succès - Rediriger vers la page de l'immeuble (navigation immédiate)
        toast({
          title: `${successfulCreations.length} lot${successfulCreations.length > 1 ? 's créés' : ' créé'} avec succès`,
          description: `Les lots ont été créés et assignés à l'immeuble.`,
          variant: "success",
        })
        router.push(`/gestionnaire/biens/immeubles/${lotData.selectedBuilding}`)

        return
      } catch (error) {
        // ✅ redirect() throws NEXT_REDIRECT - propager sans afficher d'erreur
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
          throw error
        }

        logger.error("❌ Error in multi-lot creation:", error)
        toast({
          title: "Erreur lors de la création des lots",
          description: "Une erreur est survenue. Veuillez réessayer.",
          variant: "destructive",
        })
        return
      }
    }

    // 🆕 MODE MULTI-LOTS INDÉPENDANTS
    if (lotData.buildingAssociation === "independent" && independentLots.length > 0) {
      try {
        // Validation finale avant soumission
        const validation = validateIndependentLots()
        if (!validation.valid) {
          toast({
            title: "⚠️ Validation échouée",
            description: validation.message || "Veuillez corriger les erreurs avant de soumettre",
            variant: "destructive"
          })
          logger.error(`❌ [VALIDATION] Submission blocked: ${validation.message}`)
          return
        }

        logger.info(`🚀 Creating ${independentLots.length} independent lots`)

        // Mapping country names to database enum values (lowercase French)
        const countryToDBEnum: Record<string, string> = {
          "Belgique": "belgique",
          "France": "france",
          "Luxembourg": "luxembourg",
          "Pays-Bas": "pays-bas",
          "Allemagne": "allemagne"
        }

        // Créer tous les lots en parallèle (TOUJOURS créer adresse dans table centralisée)
        const lotCreationPromises = independentLots.map(async (lot) => {
          try {
            let addressId: string | null = null

            // Step 1: ALWAYS create address in centralized table (with or without geocode data)
            // This ensures consistency - all addresses go through the addresses table
            if (lot.street || lot.city) {
              logger.info(`📍 [INDEPENDENT-LOT] Creating address for lot ${lot.reference}`, {
                street: lot.street,
                postalCode: lot.postalCode,
                city: lot.city,
                country: lot.country,
                hasGeocode: !!(lot.latitude && lot.longitude),
                latitude: lot.latitude,
                longitude: lot.longitude,
                placeId: lot.placeId,
                formattedAddress: lot.formattedAddress
              })
              const addressResult = await createAddressAction({
                street: lot.street,
                postalCode: lot.postalCode,
                city: lot.city,
                country: lot.country,
                // Include geocode data if available
                latitude: lot.latitude,
                longitude: lot.longitude,
                placeId: lot.placeId,
                formattedAddress: lot.formattedAddress
              }, userTeam.id)

              if (addressResult.success && addressResult.data) {
                addressId = addressResult.data.id
                logger.info(`✅ [INDEPENDENT-LOT] Address created: ${addressId}`)
              } else {
                logger.warn(`⚠️ [INDEPENDENT-LOT] Failed to create address: ${addressResult.error?.message}`)
              }
            }

            // Step 2: Create lot with address_id link
            // Note: After migration 20260129200002, lots table no longer has street/postal_code/city/country columns
            // All address data is stored in centralized addresses table via address_id
            const lotDataToCreate = {
              reference: lot.reference,
              building_id: null, // NULL = independent lot
              address_id: addressId, // Link to centralized address table
              floor: lot.floor ? parseInt(lot.floor) : null,
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
        const successfulCreations = creationResults.filter(result => result !== null) as Array<{lot: IndependentLot, createdLot: any}>

        logger.info(`✅ Created ${successfulCreations.length}/${independentLots.length} independent lots`)

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

        // Create interventions for ALL successfully created lots
        for (const { createdLot } of successfulCreations) {
          await createInterventionsForLot(createdLot.id, userTeam.id)
        }

        // Upload staged documents for each lot
        for (const { lot, createdLot } of successfulCreations) {
          const upload = lotDocUploads[lot.id]
          if (upload?.hasFiles) {
            try {
              await uploadLotDocs(lot.id, createdLot.id, userTeam.id)
            } catch (docError) {
              logger.error(`⚠️ Document upload failed for lot ${createdLot.id}:`, docError)
            }
          }
        }

        // Succès - Rediriger vers la page des biens (navigation immédiate)
        toast({
          title: `${successfulCreations.length} lot${successfulCreations.length > 1 ? 's indépendants créés' : ' indépendant créé'} avec succès`,
          description: `Les lots ont été créés avec leurs adresses respectives.`,
          variant: "success",
        })
        router.push(`/gestionnaire/biens`)

        return
      } catch (error) {
        // ✅ redirect() throws NEXT_REDIRECT - propager sans afficher d'erreur
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
          throw error
        }

        logger.error("❌ Error in independent multi-lot creation:", error)
        toast({
          title: "Erreur lors de la création des lots indépendants",
          description: "Une erreur est survenue. Veuillez réessayer.",
          variant: "destructive",
        })
        return
      }
    }

    // MODE CLASSIQUE - Création d'un seul lot (legacy mode, rarely used now)
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

      // Upload property documents if any were staged
      if (lotDocUpload.hasFiles) {
        try {
          await lotDocUpload.uploadFiles(createdLot.id, userTeam.id)
          logger.info('✅ Lot documents uploaded for lot:', createdLot.id)
        } catch (docError) {
          logger.error('⚠️ Document upload failed (lot created successfully):', docError)
        }
      }

      // Create scheduled interventions
      await createInterventionsForLot(createdLot.id, userTeam.id)

      // Succès - Rediriger vers la page des biens (navigation immédiate)
      toast({
        title: "Lot créé avec succès",
        description: `Le lot "${createdLot.reference}" a été créé et assigné à votre équipe.`,
        variant: "success",
      })
      router.push("/gestionnaire/biens")

    } catch (error) {
      // ✅ redirect() throws NEXT_REDIRECT - propager sans afficher d'erreur
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        throw error
      }

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

  // Fonction pour ouvrir le wizard de création de gestionnaire
  const openGestionnaireModal = () => {
    router.push('/gestionnaire/contacts/nouveau')
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
      // Si lot indépendant multi-lots, valider tous les lots
      if (lotData.buildingAssociation === "independent") {
        const validation = validateIndependentLots()
        if (!validation.valid && validation.message) {
          // Stocker le message de validation pour l'afficher si nécessaire
          logger.warn(`⚠️ [VALIDATION] ${validation.message}`)
        }
        return validation.valid
      } else if (lotData.buildingAssociation === "existing") {
        // Pour les lots liés à un immeuble existant, vérifier qu'au moins un lot est configuré
        return lots.length > 0
      }
    }
    return true
  }


  const renderStep1 = () => (
    <Card>
      <CardContent className="py-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Lier à un immeuble</h2>
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
              : "border-border bg-card"
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
          data-testid="radio-existing"
        >
          <RadioGroupItem value="existing" id="existing" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="existing" className="font-medium text-foreground cursor-pointer">
              Lier à un immeuble existant
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Associez ce lot à un immeuble que vous avez déjà créé</p>
          </div>
        </div>

        <div 
          className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm ${
            lotData.buildingAssociation === "new"
              ? "border-blue-500 bg-blue-50 shadow-sm"
              : "border-border bg-card"
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
          data-testid="radio-new"
        >
          <RadioGroupItem value="new" id="new" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="new" className="font-medium text-foreground cursor-pointer">
              Ajouter un immeuble
            </Label>
            <p className="text-sm text-muted-foreground mt-1">Créez un nouvel immeuble et associez-y ce lot</p>
          </div>
        </div>

        <div 
          className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm ${
            lotData.buildingAssociation === "independent"
              ? "border-blue-500 bg-blue-50 shadow-sm"
              : "border-border bg-card"
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
          data-testid="radio-independent"
        >
          <RadioGroupItem value="independent" id="independent" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="independent" className="font-medium text-foreground cursor-pointer">
              Laisser le lot indépendant
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
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
            <p className="text-sm text-muted-foreground">
              Ce lot ne sera pas associé à un immeuble. Vous pourrez définir ses informations générales à l'étape suivante.
            </p>
          </CardContent>
        </Card>
      )}
      </CardContent>
    </Card>
  )

  const renderStep2 = () => {
    // Mode "independent" - Utiliser IndependentLotsStepV2 avec Google Maps pour multi-lots avec adresses
    // Note: GoogleMapsProvider is now at page level to prevent hook count changes
    if (lotData.buildingAssociation === "independent") {
      return (
        <IndependentLotsStepV2
          lots={independentLots}
          expandedLots={expandedIndependentLots}
          onAddLot={addIndependentLot}
          onUpdateLot={updateIndependentLot}
          onGeocodeResult={handleIndependentLotGeocodeResult}
          onDuplicateLot={duplicateIndependentLot}
          onRemoveLot={removeIndependentLot}
          onToggleLotExpansion={toggleIndependentLotExpansion}
        />
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
          buildingAddress={selectedBuilding?.address_record?.street || ""}
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
      setAssignedManagersByLot(prev => {
        const existingManagers = prev[currentLotIdForModal] || []
        // Check if manager is already assigned
        const alreadyAssigned = existingManagers.some(m => m.id === manager.user.id)
        if (alreadyAssigned) return prev
        
        return {
          ...prev,
          [currentLotIdForModal]: [...existingManagers, manager.user]
        }
      })
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

  // 🆕 Helper functions for BuildingContactsStepV3
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
      [lotId]: (prev[lotId] || []).filter(m => m.id !== managerId)
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
      // Ajouter contact au lot spécifique
      setLotContactAssignments(prev => ({
        ...prev,
        [context.lotId]: {
          ...prev[context.lotId],
          [contactType]: [...(prev[context.lotId]?.[contactType] || []), contact]
        }
      }))
    } else {
      // Ajouter contact à l'immeuble (pour contacts temporaires avant validation)
      setBuildingContacts(prev => ({
        ...prev,
        [contactType]: [...(prev[contactType] || []), contact]
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
    // ✅ Mode "existing building" - Utiliser BuildingContactsStepV3 avec BuildingContactCardV3 et LotContactCardV4
    if (lotData.buildingAssociation === "existing") {
      const selectedBuilding = managerData?.buildings?.find(
        b => b.id === lotData.selectedBuilding
      )

      if (!userProfile || !userTeam) {
        return (
          <div className="text-center py-8">
            <p className="text-red-600">Erreur: utilisateur ou équipe non trouvé</p>
          </div>
        )
      }

      // Show loading state while building data is being fetched
      if (isLoadingBuildingData) {
        return (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-muted-foreground">Chargement des données de l'immeuble...</span>
          </div>
        )
      }

      const safeBuildingManagers = Array.isArray(buildingManagers) ? buildingManagers : []
      const safeBuildingContacts = buildingContacts && typeof buildingContacts === 'object' 
        ? {
            tenant: Array.isArray(buildingContacts.tenant) ? buildingContacts.tenant : [],
            provider: Array.isArray(buildingContacts.provider) ? buildingContacts.provider : [],
            owner: Array.isArray(buildingContacts.owner) ? buildingContacts.owner : [],
            other: Array.isArray(buildingContacts.other) ? buildingContacts.other : [],
          }
        : {
            tenant: [],
            provider: [],
            owner: [],
            other: [],
          }

      return (
        <>
          {/* Hidden ContactSelector for BuildingContactsStepV3 (used via ref) */}
          <ContactSelector
            ref={contactSelectorRef}
            teamId={userTeam?.id || ""}
            displayMode="compact"
            selectionMode="multi"
            hideUI={true}
            selectedContacts={safeBuildingContacts}
            lotContactAssignments={lotContactAssignments}
            onContactSelected={handleContactAdd}
            onContactRemoved={(contactId: string, contactType: string, context?: { lotId?: string }) => {
              if (context?.lotId) {
                removeContactFromLot(context.lotId, contactType, contactId)
              } else {
                handleBuildingContactRemove(contactId, contactType)
              }
            }}
            allowedContactTypes={["tenant", "provider", "owner", "other"]}
          />
          
          <BuildingContactsStepV3
            buildingInfo={{
              name: selectedBuilding?.name || "Immeuble",
              address: selectedBuilding?.address_record?.street || "",
              postalCode: selectedBuilding?.address_record?.postal_code || "",
              city: selectedBuilding?.address_record?.city || "",
              country: selectedBuilding?.address_record?.country || "",
              description: selectedBuilding?.description || ""
            }}
            teamManagers={teamManagers.map(tm => tm.user)} // Convert to UserType[]
            buildingManagers={safeBuildingManagers}
            userProfile={{
              id: userProfile.id,
              email: userProfile.email || "",
              name: userProfile.name || userProfile.email || "",
              role: userProfile.role || "gestionnaire"
            }}
            userTeam={userTeam}
            lots={lots}
            expandedLots={expandedLots}
            buildingContacts={safeBuildingContacts}
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
            buildingDocUpload={lotDocUpload}
            lotDocUploads={lotDocUploads}
          />
        </>
      )
    }

    // ✅ Mode "independent" - Multi-lots avec LotContactCardV4
    if (!userProfile || !userTeam) {
      return (
        <div className="text-center py-8">
          <p className="text-red-600">Erreur: utilisateur ou équipe non trouvé</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Hidden ContactSelector for modal functionality */}
        <ContactSelector
          ref={contactSelectorRef}
          teamId={userTeam?.id || ""}
          displayMode="compact"
          selectionMode="multi"
          hideUI={true}
          selectedContacts={{
            tenant: [],
            provider: [],
            owner: [],
            other: []
          }}
          lotContactAssignments={lotContactAssignments}
          onContactSelected={(contact, contactType, context) => {
            if (context?.lotId) {
              // Assign to specific lot
              setLotContactAssignments(prev => ({
                ...prev,
                [context.lotId]: {
                  ...prev[context.lotId],
                  [contactType]: [...(prev[context.lotId]?.[contactType] || []), contact]
                }
              }))
            }
          }}
          onContactRemoved={(contactId: string, contactType: string, context?: { lotId?: string }) => {
            if (context?.lotId) {
              removeContactFromLot(context.lotId, contactType, contactId)
            }
          }}
          allowedContactTypes={["tenant", "provider", "owner", "other"]}
        />

        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <span>Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4">
            <div className="space-y-3 @container">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {independentLots.map((lot, index) => {
                  const isExpanded = expandedIndependentLots[lot.id] || false
                  const lotNumber = independentLots.length - index
                  const lotManagers = assignedManagersByLot[lot.id] || []
                  const providers = lotContactAssignments[lot.id]?.provider || []
                  const owners = lotContactAssignments[lot.id]?.owner || []
                  const others = lotContactAssignments[lot.id]?.other || []

                  return (
                    <div
                      key={lot.id}
                      className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}
                    >
                      <LotContactCardV4
                        lotNumber={lotNumber}
                        lotReference={lot.reference}
                        lotCategory={lot.category}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleIndependentLotExpansion(lot.id)}
                        lotManagers={lotManagers}
                        onAddLotManager={() => openManagerModal(lot.id)}
                        onRemoveLotManager={(managerId) => removeManagerFromLot(lot.id, managerId)}
                        providers={providers}
                        owners={owners}
                        others={others}
                        onAddContact={(contactType) => {
                          contactSelectorRef.current?.openContactModal(contactType, lot.id)
                        }}
                        onRemoveContact={(contactId, contactType) => {
                          removeContactFromLot(lot.id, contactType, contactId)
                        }}
                        buildingManagers={[]}
                        buildingProviders={[]}
                        buildingOwners={[]}
                        buildingOthers={[]}
                        floor={lot.floor}
                        doorNumber={lot.doorNumber}
                        description={`${lot.street}, ${lot.postalCode} ${lot.city}${lot.description ? ` - ${lot.description}` : ''}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <IndependentLotsDocumentsTab
              lots={independentLots}
              lotDocUploads={lotDocUploads}
            />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Step 4: Interventions
  const renderStep4 = () => {
    // Determine entity type and document data based on association mode
    const entityType = lotData.buildingAssociation === 'existing' ? 'lot_in_building' as const : 'lot' as const

    // Collect document expiry dates from all lot doc uploads
    const documentExpiryDates: Record<string, string> = {}
    // For multi-lot modes, merge expiry dates from all lot uploads
    const allUploads = Object.values(lotDocUploads)
    for (const upload of allUploads) {
      for (const slot of upload.slots) {
        if (slot.files.length > 0 && slot.files[0]?.expiryDate && !documentExpiryDates[slot.type]) {
          documentExpiryDates[slot.type] = slot.files[0].expiryDate
        }
      }
    }
    // Also check single-lot upload
    for (const slot of lotDocUpload.slots) {
      if (slot.files.length > 0 && slot.files[0]?.expiryDate && !documentExpiryDates[slot.type]) {
        documentExpiryDates[slot.type] = slot.files[0].expiryDate
      }
    }

    // Collect missing documents from all lot uploads
    const allMissingDocs = new Set<string>()
    for (const upload of allUploads) {
      for (const docType of upload.missingRecommendedTypes) {
        allMissingDocs.add(docType)
      }
    }
    // Also check single-lot upload
    for (const docType of lotDocUpload.missingRecommendedTypes) {
      allMissingDocs.add(docType)
    }

    return (
      <PropertyInterventionsStep
        entityType={entityType}
        scheduledInterventions={scheduledInterventions}
        onInterventionsChange={setScheduledInterventions}
        missingDocuments={Array.from(allMissingDocs)}
        documentExpiryDates={documentExpiryDates}
        teamId={userTeam?.id || ''}
        availableContacts={[]}
        currentUser={{ id: userProfile.id, name: userProfile.name || userProfile.email || '' }}
      />
    )
  }

  // Step 5: Confirmation
  const renderStep5 = () => {
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

      // Préparer buildingInfo avec address_record (nouvelle structure centralisée)
      const buildingInfo = {
        name: selectedBuilding.name || "",
        address: selectedBuilding.address_record?.street || "",
        postalCode: selectedBuilding.address_record?.postal_code || "",
        city: selectedBuilding.address_record?.city || "",
        country: selectedBuilding.address_record?.country || "",
        description: selectedBuilding.description || ""
      }

      // ✅ Use the same buildingManagers state that was populated at step 3
      // (Retrieved via useEffect when building is selected)
      const safeBuildingManagers = Array.isArray(buildingManagers) ? buildingManagers : []

      return (
        <BuildingConfirmationStep
          buildingInfo={buildingInfo}
          buildingManagers={safeBuildingManagers}
          buildingContacts={buildingContacts}
          lots={lots}
          existingLots={existingBuildingLots}
          lotContactAssignments={lotContactAssignments}
          assignedManagers={assignedManagersByLot}
        />
      )
    }

    // Mode "independent" avec multi-lots - Utiliser lot cards en mode preview
    if (lotData.buildingAssociation === "independent") {
      return (
        <div className="space-y-4">
          {/* Header compact - title and count on same line */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-medium text-foreground">Lots indépendants</h3>
                <span className="text-sm text-muted-foreground">
                  • {independentLots.length} lot{independentLots.length > 1 ? 's' : ''} à créer
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lot Cards with expand/collapse enabled */}
          <div className="space-y-3">
            {/* Grid layout: 1 col mobile, 2 col tablet, 3 col desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {independentLots.map((lot, index) => {
                const lotNumber = independentLots.length - index
                const lotManagers = assignedManagersByLot[lot.id] || []
                const providers = lotContactAssignments[lot.id]?.provider || []
                const owners = lotContactAssignments[lot.id]?.owner || []
                const others = lotContactAssignments[lot.id]?.other || []
                const isExpanded = expandedIndependentLots[lot.id] || false

                return (
                  <div
                    key={lot.id}
                    className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}
                  >
                    <LotContactCardV4
                      lotNumber={lotNumber}
                      lotReference={lot.reference}
                      lotCategory={lot.category}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleIndependentLotExpansion(lot.id)}
                      lotManagers={lotManagers}
                      providers={providers}
                      owners={owners}
                      others={others}
                      // Mode read-only pour confirmation
                      readOnly={true}
                      // Display lot details + address
                      floor={lot.floor}
                      doorNumber={lot.doorNumber}
                      description={`${lot.street}, ${lot.postalCode} ${lot.city}${lot.description ? ` - ${lot.description}` : ''}`}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    // Mode "new" (création d'immeuble) - Fallback (normalement redirigé)
    // Ce cas ne devrait pas se produire car on redirige vers /immeubles/nouveau
    return (
      <div className="text-center py-8">
        <p className="text-red-600">
          Mode de création d'immeuble - Vous devriez être redirigé vers la page de création d'immeuble
        </p>
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

  // Déterminer le texte et la destination du bouton retour
  const backButtonText = "Retour"
  const backDestination = prefillBuildingId
    ? `/gestionnaire/biens/immeubles/${prefillBuildingId}`
    : "/gestionnaire/biens"

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Header - Sticky au niveau supérieur */}
      <StepProgressHeader
        title="Ajouter un nouveau lot"
        subtitle={getHeaderSubtitle()}
        backButtonText={backButtonText}
        onBack={() => router.push(backDestination)}
        steps={lotSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowFutureSteps={false}
        maxReachableStep={maxStepReached}
      />

      {/* Main Content with uniform padding (responsive) and bottom space for footer */}
      {/* GoogleMapsProvider wraps all steps to prevent "Rendered fewer hooks" error */}
      {/* (Moving it inside renderStep2 causes hook count changes when switching modes) */}
      <GoogleMapsProvider>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pt-6 pb-20">
          <main className="content-max-width pb-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </main>
        </div>
      </GoogleMapsProvider>

      {/* Footer Navigation */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex justify-between w-full content-max-width">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 bg-transparent"
            data-testid="wizard-prev-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Précédent</span>
          </Button>

          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              className="flex items-center space-x-2"
              disabled={!canProceedToNextStep()}
              data-testid="wizard-next-btn"
            >
              <span>Suivant : {lotSteps[currentStep]?.label || 'Étape suivante'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex items-center space-x-2"
              disabled={isSubmitting}
              data-testid="wizard-submit-btn"
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
                            ? 'bg-muted border-border opacity-60'
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
                            <div className="text-sm text-muted-foreground">{manager.user.email}</div>
                            <div className="flex gap-1 mt-1">
                              {manager.user.id === userProfile.id && (
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
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
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
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/70" />
                </div>
                <h3 className="font-medium text-foreground mb-2">
                  Aucun gestionnaire disponible
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
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
    </div>
  )
}

