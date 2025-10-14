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
import { Home, Users, ArrowLeft, ArrowRight, Plus, X, Search, User, MapPin, FileText, Building2, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import ContactFormModal from "@/components/contact-form-modal"
import { BuildingInfoForm } from "@/components/building-info-form"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
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
    syndic: { id: string; name: string; email: string; type: string }[]
    notary: { id: string; name: string; email: string; type: string }[]
    insurance: { id: string; name: string; email: string; type: string }[]
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
  const { data: managerData, loading: buildingsLoading, forceRefetch: refetchManagerData } = useManagerStats()
  const [currentStep, setCurrentStep] = useState(1)
  const [buildingSearchQuery, setBuildingSearchQuery] = useState("")
  
  // États pour la gestion des gestionnaires de lot
  const [isLotManagerModalOpen, setIsLotManagerModalOpen] = useState(false)
  const [isGestionnaireModalOpen, setIsGestionnaireModalOpen] = useState(false)
  
  // États pour les informations générales de l'immeuble (étape 2)
  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [teamManagers, setTeamManagers] = useState<TeamManager[]>([])
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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

  // Initialize services
  const [teamService] = useState(() => createTeamService())
  const [lotService] = useState(() => createLotService())
  const [contactInvitationService] = useState(() => createContactInvitationService())

  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Charger l'équipe de l'utilisateur et ses gestionnaires
  useEffect(() => {
    logger.info("🔐 useAuth hook user state:", user)
    
    const loadUserTeamAndManagers = async () => {
      if (!user?.id || teamStatus !== 'verified') {
        logger.info("⚠️ User ID not found or team not verified, skipping team loading")
        return
      }

      try {
        logger.info("📡 Loading user teams for user:", user.id)
        setIsLoading(true)
        setError("")

        // 1. Récupérer les équipes de l'utilisateur
        const teamsResult = await teamService.getUserTeams(user.id)
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
          const membersResult = await teamService.getTeamMembers(primaryTeam.id)
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
  }, [user?.id, teamStatus, user])

  // Récupérer les comptages par catégorie quand l'équipe est chargée
  useEffect(() => {
    const loadCategoryCountsByTeam = async () => {
      if (!userTeam?.id) {
        logger.info("⚠️ No team available, skipping category counts loading")
        return
      }

      try {
        logger.info("📊 Loading lot counts by category for team:", userTeam.id)
        const result = await lotService.getLotStatsByCategory(userTeam.id)
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
  }, [userTeam?.id])


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

  // Get buildings from manager data
  const buildings = managerData?.buildings || []
  const filteredBuildings = buildings.filter(building => 
    building.name.toLowerCase().includes(buildingSearchQuery.toLowerCase()) ||
    building.address.toLowerCase().includes(buildingSearchQuery.toLowerCase())
  )

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
    <div className="space-y-6">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Sélectionner un immeuble</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Rechercher un immeuble..." 
                className="pl-10" 
                value={buildingSearchQuery}
                onChange={(e) => setBuildingSearchQuery(e.target.value)}
              />
            </div>
            <div className="mt-4">
              {buildingsLoading ? (
                <div className="text-center py-8 text-gray-500">Chargement des immeubles...</div>
              ) : filteredBuildings.length === 0 ? (
                buildingSearchQuery ? (
                  <div className="text-center py-8 text-gray-500">Aucun immeuble trouvé pour "{buildingSearchQuery}"</div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Vous n'avez pas encore créé d'immeuble</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Créer un immeuble
                    </Button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                  {filteredBuildings.map((building) => {
                    const isSelected = lotData.selectedBuilding === building.id;
                    const occupiedLots = building.lots?.filter((lot: {status: string}) => lot.status === 'occupied').length || 0;
                    
                    return (
                      <div
                        key={building.id}
                        className={`group relative p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 focus:outline-none min-h-[140px] ${
                          isSelected 
                            ? "bg-sky-50 border-sky-500 shadow-sm focus:border-sky-600" 
                            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                        }`}
                        onClick={() => setLotData(prev => ({ 
                          ...prev, 
                          selectedBuilding: building.id === prev.selectedBuilding ? undefined : building.id
                        }))}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLotData(prev => ({ 
                              ...prev, 
                              selectedBuilding: building.id === prev.selectedBuilding ? undefined : building.id
                            }));
                          }
                        }}
                        role="button"
                        aria-pressed={isSelected}
                        aria-label={`Sélectionner l'immeuble ${building.name}`}
                      >
                        {/* En-tête avec icône et sélecteur */}
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected 
                              ? "bg-sky-100" 
                              : "bg-slate-100 group-hover:bg-slate-200"
                          }`}>
                            <Building2 className={`h-4 w-4 ${
                              isSelected ? "text-sky-600" : "text-slate-600"
                            }`} />
                          </div>
                          
                          {/* Indicateur de sélection */}
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center shadow-sm">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            ) : (
                              <div className="w-5 h-5 border-2 border-slate-300 rounded-full group-hover:border-slate-400 transition-colors"></div>
                            )}
                          </div>
                        </div>
                        
                        {/* Informations de l'immeuble */}
                        <div className="space-y-2">
                          <h4 className={`font-semibold text-sm line-clamp-1 ${
                            isSelected ? "text-sky-900" : "text-slate-900"
                          }`} title={building.name}>
                            {building.name}
                          </h4>
                          <p className={`text-xs line-clamp-2 leading-relaxed ${
                            isSelected ? "text-sky-700" : "text-slate-600"
                          }`} title={building.address}>
                            {building.address}
                          </p>
                          
                          {/* Stats de l'immeuble */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-1">
                              <div className={`w-3 h-3 rounded flex items-center justify-center ${
                                isSelected ? "bg-sky-200" : "bg-slate-200"
                              }`}>
                                <Home className={`h-2 w-2 ${
                                  isSelected ? "text-sky-600" : "text-slate-500"
                                }`} />
                              </div>
                              <span className={`text-xs font-medium ${
                                isSelected ? "text-sky-700" : "text-slate-600"
                              }`}>
                                {building.lots?.length || 0}
                              </span>
                            </div>
                            
                            {occupiedLots > 0 && (
                              <div className="flex items-center space-x-1">
                                <div className={`w-3 h-3 rounded flex items-center justify-center ${
                                  isSelected ? "bg-emerald-200" : "bg-emerald-100"
                                }`}>
                                  <Users className={`h-2 w-2 ${
                                    isSelected ? "text-emerald-600" : "text-emerald-500"
                                  }`} />
                                </div>
                                <span className={`text-xs font-medium ${
                                  isSelected ? "text-sky-700" : "text-slate-600"
                                }`}>
                                  {occupiedLots}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Indicateur visuel de sélection */}
                        {isSelected && (
                          <div className="absolute -inset-px bg-gradient-to-r from-sky-600 to-sky-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10"></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
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
    </div>
  )

  const renderStep2 = () => {
    // Si lot indépendant, affichage simplifié sans Card wrapper
    if (lotData.buildingAssociation === "independent") {
      return (
        <div className="space-y-6">
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
            buildingsCount={buildings.length}
            categoryCountsByTeam={categoryCountsByTeam}
          />
        </div>
      )
    }

    // Affichage standard pour les autres cas
    return (
      <div className="space-y-6">


        {/* Détails du lot - Seulement si lié à un immeuble existant */}
        {lotData.buildingAssociation === "existing" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Home className="h-5 w-5" />
                <span>Détails du lot</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reference">Référence du lot *</Label>
                <Input
                  id="reference"
                  placeholder={generateDefaultReference()}
                  value={lotData.reference || ""}
                  onChange={(e) => setLotData((prev) => ({ ...prev, reference: e.target.value }))}
                />
              </div>

              {/* Sélection de catégorie */}
              <LotCategorySelector
                value={lotData.category}
                onChange={(category) => setLotData((prev) => ({ ...prev, category }))}
                displayMode="grid"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="floor">Étage</Label>
                  <Input
                    id="floor"
                    placeholder="0"
                    value={lotData.floor}
                    onChange={(e) => setLotData((prev) => ({ ...prev, floor: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="doorNumber">Numéro de porte</Label>
                  <Input
                    id="doorNumber"
                    placeholder="A, 101, etc."
                    value={lotData.doorNumber}
                    onChange={(e) => setLotData((prev) => ({ ...prev, doorNumber: e.target.value }))}
                  />
                </div>
              </div>


              <div>
                <Label htmlFor="description">Description / Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Informations complémentaires sur le lot..."
                  value={lotData.description}
                  onChange={(e) => setLotData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )}
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

  const renderStep3 = () => {
    // Montrer la section gestionnaire seulement si le lot est lié à un immeuble existant
    const showLotManagerSection = lotData.buildingAssociation === "existing"

    return (
      <div className="space-y-6">
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

        <ContactSelector
          ref={contactSelectorRef}
          teamId={userTeam?.id || ""}
          displayMode="full"
          title="Assignation des contacts"
          description="Assignez des contacts à vos lots (optionnel)"
          selectedContacts={lotData.assignedContacts}
          onContactSelected={handleContactSelected}
          onContactRemoved={handleContactRemoved}
          onContactCreated={handleContactCreated}
          allowedContactTypes={["tenant", "provider", "syndic", "insurance", "other"]}
        />
      </div>
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
                      {buildings.find(b => b.id === lotData.selectedBuilding)?.name || "Non trouvé"}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-medium text-slate-700">Adresse</span>
                    </div>
                    <div className="pl-5 bg-white rounded-md border border-slate-200 p-3">
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">
                        {buildings.find(b => b.id === lotData.selectedBuilding)?.address || "Adresse non trouvée"}
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
                            type === 'syndic' ? 'bg-purple-500' :
                            type === 'notary' ? 'bg-orange-500' :
                            type === 'insurance' ? 'bg-red-500' : 'bg-slate-500'
                          }`}></div>
                          <span className="text-sm font-medium text-slate-900">
                            {contacts.length} {
                              type === 'tenant' ? 'locataire' :
                              type === 'provider' ? 'prestataire' :
                              type === 'syndic' ? 'syndic' :
                              type === 'notary' ? 'notaire' :
                              type === 'insurance' ? 'assurance' : 'autre'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <StepProgressHeader
          title="Ajouter un nouveau lot"
          backButtonText="Retour aux biens"
          onBack={() => router.push("/gestionnaire/biens")}
          steps={lotSteps}
          currentStep={currentStep}
        />
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
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
            <Button onClick={handleFinish} className="flex items-center space-x-2">
              <span>Créer le lot</span>
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>

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

