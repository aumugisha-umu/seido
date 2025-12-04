"use client"

import React, { useState, useEffect, useRef } from "react"
import type { User, Team, Contact } from "@/lib/services/core/service-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Building,
  MapPin,
  Calendar,
  Hash,
  FileText,
  Plus,
  Check,
  User,
  Briefcase,
  Shield,
  FileCheck,
  Car,
  MoreHorizontal,
  Copy,
  X,
  AlertTriangle,
  Loader2,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import { toast } from "sonner"
import { useSaveFormState, useRestoreFormState, loadFormState, clearFormState } from "@/hooks/use-form-persistence"
import { BuildingInfoForm } from "@/components/building-info-form"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { createTeamService, createBuildingService, createLotService, createContactInvitationService } from "@/lib/services"
import { createCompleteProperty } from "@/app/actions/building-actions"
import { BuildingConfirmationStep } from "@/components/building-confirmation-step"







import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { buildingSteps } from "@/lib/step-configurations"
import { LotCategory, getLotCategoryConfig, getAllLotCategories } from "@/lib/lot-types"
import LotCategorySelector from "@/components/ui/lot-category-selector"
import { logger, logError } from '@/lib/logger'
import { BuildingLotsStepV2 } from "@/components/building-lots-step-v2"
import { BuildingContactsStepV3 } from "@/components/building-contacts-step-v3"

// Type for team members with user details (from getTeamMembers)
type TeamManagerWithUser = {
  id: string
  team_id: string
  user_id: string
  role: string
  joined_at: string
  left_at: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
    provider_category: string | null
  } | null
}

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description: string
}

interface Lot {
  id: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
}

interface Contact {
  id: string
  name: string
  email: string
  type: string
  phone?: string
  speciality?: string
}

const contactTypes = [
  { key: "tenant", label: "Locataire", icon: User, color: "text-blue-600" },
  { key: "provider", label: "Prestataire", icon: Briefcase, color: "text-green-600" },
  { key: "owner", label: "Propriétaire", icon: Shield, color: "text-amber-600" },
  { key: "other", label: "Autre", icon: MoreHorizontal, color: "text-gray-600" },
]


// Mapping des noms de pays vers valeurs enum DB (Phase 2)
// Les valeurs doivent correspondre à l'enum country de la migration Phase 2
const countryToDBEnum: Record<string, string> = {
  "Belgique": "belgique",
  "France": "france",
  "Luxembourg": "luxembourg",
  "Pays-Bas": "pays-bas",
  "Allemagne": "allemagne",
  "Suisse": "suisse",
  "Autre": "autre",
}

interface NewImmeublePageProps {
  userProfile: {
    id: string
    email: string
    name: string
    role: string
  }
  userTeam: Team
  allTeams: Team[]
  initialTeamManagers: TeamManagerWithUser[]
  initialCategoryCounts: Record<string, number>
}

export default function NewImmeubleePage({
  userProfile,
  userTeam,
  allTeams,
  initialTeamManagers,
  initialCategoryCounts
}: NewImmeublePageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleSuccess } = useCreationSuccess()
  const { data: managerData, forceRefetch: refetchManagerData } = useManagerStats()

  // TOUS LES HOOKS useState DOIVENT ÊTRE AVANT LES EARLY RETURNS (Rules of Hooks)
  const [currentStep, setCurrentStep] = useState(1)
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>({
    name: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Belgique",
    description: "",
  })
  const [lots, setLots] = useState<Lot[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  // Contacts assignes au niveau de l'immeuble (format pour ContactSelector)
  const [buildingContacts, setBuildingContacts] = useState<{[contactType: string]: Contact[]}>({
    tenant: [],
    provider: [],
    owner: [],
    other: [],
  })
  const [buildingManagers, setBuildingManagers] = useState<User[]>([]) // gestionnaires de l'immeuble
  const [assignedManagers, setAssignedManagers] = useState<{[key: string]: User[]}>({}) // gestionnaires assignes par lot
  const [lotContactAssignments, setLotContactAssignments] = useState<{[lotId: string]: {[contactType: string]: Contact[]}}>({}) // contacts assignes par lot
  
  // [SUPPRIME] Etats des modals maintenant geres dans ContactSelector centralise :
  // isContactModalOpen, selectedContactType, selectedLotForContact, searchTerm,
  // isContactFormModalOpen, prefilledContactType, existingContacts, isLoadingContacts
  
  // Reference au ContactSelector pour ouvrir les modals depuis l'exterieur
  const contactSelectorRef = useRef<ContactSelectorRef>(null)
  
  // Etats pour la gestion des gestionnaires
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [selectedLotForManager, setSelectedLotForManager] = useState<string>("")
  const [isBuildingManagerModalOpen, setIsBuildingManagerModalOpen] = useState(false)
  
  // Nouveaux etats pour Supabase
  const [teamManagers, setTeamManagers] = useState<TeamManagerWithUser[]>(initialTeamManagers)
  const [error, setError] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [categoryCountsByTeam, setCategoryCountsByTeam] = useState<Record<string, number>>(initialCategoryCounts)
  // Validation état: nom unique immeuble
  const [isNameDuplicate, setIsNameDuplicate] = useState(false)
  const [isNameChecking, setIsNameChecking] = useState(false)
  // Flag pour tracker si l'utilisateur a édité manuellement le nom de l'immeuble
  const [hasUserEditedName, setHasUserEditedName] = useState(false)
  
  // Etat pour gerer l'affichage des details de chaque lot
  const [expandedLots, setExpandedLots] = useState<{[key: string]: boolean}>({})

  // Flag to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)

  // Flag to track if step 3 has been initialized (to prevent reopening all lots)
  const hasInitializedStep3 = useRef(false)

  // ✅ NEW: Lazy service initialization - Services créés uniquement quand userProfile est prêt
  // Note: This component receives userProfile as a prop, so we use that instead of useAuth
  const [services, setServices] = useState<{
    team: ReturnType<typeof createTeamService> | null
    building: ReturnType<typeof createBuildingService> | null
    lot: ReturnType<typeof createLotService> | null
    contactInvitation: ReturnType<typeof createContactInvitationService> | null
  } | null>(null)

  // ✅ Hook pour sauvegarder l'état du formulaire avant redirect vers création de contact
  const formState = {
    currentStep,
    buildingInfo,
    lots,
    buildingContacts,
    buildingManagers,
    assignedManagers,
    lotContactAssignments,
    expandedLots
  }
  const { saveAndRedirect } = useSaveFormState(formState)

  // Step 1: Créer les services quand userProfile est disponible
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
      building: createBuildingService(),
      lot: createLotService(),
      contactInvitation: createContactInvitationService()
    })
    logger.info("✅ [SERVICE-INIT] Services created successfully")
  }, [userProfile, services])

  // TOUS LES useEffect DOIVENT AUSSI ÊTRE AVANT LES EARLY RETURNS (Rules of Hooks)
  // Set mounted flag to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ✅ Restaurer l'état du formulaire au retour de la création de contact
  const { newContactId, cancelled } = useRestoreFormState((restoredState: any) => {
    logger.info(`📥 [BUILDING-FORM] Restoring form state after contact creation`)

    // Restaurer tous les états
    setCurrentStep(restoredState.currentStep)
    setBuildingInfo(restoredState.buildingInfo)
    setLots(restoredState.lots)
    setBuildingContacts(restoredState.buildingContacts)
    setBuildingManagers(restoredState.buildingManagers)
    setAssignedManagers(restoredState.assignedManagers)
    setLotContactAssignments(restoredState.lotContactAssignments)
    setExpandedLots(restoredState.expandedLots)
  })

  // Afficher un message de succès et ajouter automatiquement le contact créé
  useEffect(() => {
    if (!newContactId) return

    const sessionKey = searchParams.get('sessionKey')
    if (!sessionKey) return

    logger.info(`✅ [BUILDING-FORM] New contact created: ${newContactId}`)

    // Récupérer le type de contact depuis les searchParams
    const contactType = searchParams.get('contactType')

    // Mapper le type français vers les catégories du contact selector
    const categoryMap: Record<string, string> = {
      'prestataire': 'provider',
      'locataire': 'tenant',
      'proprietaire': 'owner',
      'gestionnaire': 'other',
      'autre': 'other'
    }

    const category = contactType ? categoryMap[contactType] : null

    if (!category) {
      logger.warn(`⚠️ [BUILDING-FORM] Unknown contact type: ${contactType}`)
      toast.success('Contact créé avec succès ! Vous pouvez maintenant le sélectionner.')
      return
    }

    // Récupérer les données du contact depuis sessionStorage
    try {
      const contactDataStr = sessionStorage.getItem(`contact-data-${sessionKey}`)
      if (!contactDataStr) {
        logger.warn(`⚠️ [BUILDING-FORM] No contact data found in sessionStorage`)
        toast.success('Contact créé avec succès ! Vous pouvez maintenant le sélectionner.')
        return
      }

      const contactData = JSON.parse(contactDataStr)

      // Nettoyer le sessionStorage
      sessionStorage.removeItem(`contact-data-${sessionKey}`)

      // Vérifier que le contact n'est pas déjà ajouté
      const existingContacts = buildingContacts[category] || []
      if (existingContacts.some(c => c.id === contactData.id)) {
        logger.info(`ℹ️ [BUILDING-FORM] Contact already in list, skipping`)
        toast.success('Contact créé avec succès !')
        return
      }

      // Ajouter le contact dans la bonne catégorie
      setBuildingContacts(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), contactData]
      }))

      logger.info(`✅ [BUILDING-FORM] Contact automatically added to ${category}`, contactData)
      toast.success(`${contactData.name} ajouté automatiquement !`)
    } catch (error) {
      logger.error(`❌ [BUILDING-FORM] Failed to add contact:`, error)
      toast.success('Contact créé avec succès ! Vous pouvez maintenant le sélectionner.')
    }
  }, [newContactId, searchParams, buildingContacts])

  // ✅ Initialiser buildingManagers avec l'utilisateur actuel par défaut
  useEffect(() => {
    if (teamManagers.length > 0 && buildingManagers.length === 0) {
      const currentUserAsMember = teamManagers.find((member) =>
        member.user?.id === userProfile.id
      )

      if (currentUserAsMember?.user) {
        setBuildingManagers([currentUserAsMember.user]) // ✅ Stocker seulement User, pas TeamMember
      }
    }
  }, [teamManagers, userProfile.id, buildingManagers.length])

  // Initialiser le nom par defaut de l'immeuble quand les donnees sont disponibles
  // Ne remplir automatiquement que si l'utilisateur n'a jamais édité le champ
  useEffect(() => {
    if (managerData?.buildings && !buildingInfo.name && !hasUserEditedName) {
      const nextBuildingNumber = managerData.buildings.length + 1
      setBuildingInfo(prev => ({
        ...prev,
        name: `Immeuble ${nextBuildingNumber}`
      }))
    }
  }, [managerData?.buildings, hasUserEditedName])

  // Ouvrir tous les lots par defaut quand on arrive a l'etape 3 (une seule fois)
  useEffect(() => {
    if (currentStep === 3 && lots.length > 0 && !hasInitializedStep3.current) {
      const allExpanded: {[key: string]: boolean} = {}
      lots.forEach(lot => {
        allExpanded[lot.id] = true
      })
      setExpandedLots(allExpanded)
      hasInitializedStep3.current = true
    }

    // Reset flag when leaving step 3
    if (currentStep !== 3) {
      hasInitializedStep3.current = false
    }
  }, [currentStep, lots])

  // Mettre a jour automatiquement la reference des lots quand leur categorie change
  useEffect(() => {
    if (!categoryCountsByTeam || Object.keys(categoryCountsByTeam).length === 0) {
      return // Attendre que les donnees de categorie soient chargees
    }

    // Creer dynamiquement le pattern base sur tous les labels de categorie possibles
    const allCategories = getAllLotCategories()
    const categoryLabels = allCategories.map(cat => cat.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const generatedReferencePattern = new RegExp(`^(${categoryLabels.join('|')})\\s+\\d+$`)

    // Verifier chaque lot pour voir si sa reference doit etre mise a jour
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

      // Ne mettre a jour que si la reference est vide ou generee par defaut
      if (isEmptyOrDefault && currentReference !== newDefaultReference) {
        lotsToUpdate.push({ id: lot.id, newReference: newDefaultReference })
      }
    })

    // Appliquer toutes les mises a jour en une seule fois
    if (lotsToUpdate.length > 0) {
      setLots(prevLots => 
        prevLots.map(lot => {
          const update = lotsToUpdate.find(u => u.id === lot.id)
          return update ? { ...lot, reference: update.newReference } : lot
        })
      )
    }
  }, [lots.map(lot => lot.category).join(','), categoryCountsByTeam])

  // Initialiser automatiquement le premier lot quand on arrive à l'étape 2
  useEffect(() => {
    if (currentStep === 2 && lots.length === 0 && categoryCountsByTeam !== undefined) {
      logger.info('🏗️ [IMMEUBLE] Auto-initializing first lot at step 2')

      const category = "appartement"
      const categoryConfig = getLotCategoryConfig(category)
      const currentCategoryCount = categoryCountsByTeam[category] || 0
      const nextNumber = currentCategoryCount + 1

      const initialLot: Lot = {
        id: `lot1`,
        reference: `${categoryConfig.label} ${nextNumber}`,
        floor: "0",
        doorNumber: "",
        description: "",
        category: "appartement",
      }

      setLots([initialLot])
      setExpandedLots({ [initialLot.id]: true })

      logger.info('✅ [IMMEUBLE] First lot auto-created:', initialLot.reference)
    }
  }, [currentStep, lots.length, categoryCountsByTeam])


  const addLot = () => {
    // Generer la reference basee sur la categorie par defaut (appartement)
    const category = "appartement"
    const categoryConfig = getLotCategoryConfig(category)
    const currentCategoryCount = categoryCountsByTeam[category] || 0
    const nextNumber = currentCategoryCount + lots.filter(lot => lot.category === category).length + 1
    
    const newLot: Lot = {
      id: `lot${lots.length + 1}`,
      reference: `${categoryConfig.label} ${nextNumber}`,
      floor: "0",
      doorNumber: "",
      description: "",
      category: "appartement",
    }
    // Ajouter le nouveau lot en haut de la liste
    setLots([newLot, ...lots])
    // Fermer toutes les cartes et ouvrir seulement le nouveau lot
    setExpandedLots({[newLot.id]: true})
  }

  const updateLot = (id: string, field: keyof Lot, value: string) => {
    setLots(lots.map((lot) => {
      if (lot.id === id) {
        const updatedLot = { ...lot, [field]: value }
        
        // Si la catégorie change, recalculer la référence
        if (field === 'category') {
          const categoryConfig = getLotCategoryConfig(value)
          const currentCategoryCount = categoryCountsByTeam[value] || 0
          const existingLotsOfCategory = lots.filter(l => l.category === value && l.id !== id).length
          const nextNumber = currentCategoryCount + existingLotsOfCategory + 1
          updatedLot.reference = `${categoryConfig.label} ${nextNumber}`
        }
        
        return updatedLot
      }
      return lot
    }))
  }

  const removeLot = (_id: string) => {
    setLots(lots.filter((lot) => lot.id !== _id))
    // Nettoyer l'etat d'expansion pour ce lot
    const newExpandedLots = {...expandedLots}
    delete newExpandedLots[_id]
    setExpandedLots(newExpandedLots)
  }

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots({
      ...expandedLots,
      [lotId]: !expandedLots[lotId]
    })
  }

  const duplicateLot = (_id: string) => {
    const lotToDuplicate = lots.find((lot) => lot.id === _id)
    if (lotToDuplicate) {
      const newLot: Lot = {
        ...lotToDuplicate,
        id: `lot${Date.now()}`,
        reference: `${lotToDuplicate.reference} (copie)`,
      }
      // Ajouter le lot duplique en haut de la liste
      setLots([newLot, ...lots])
      // Fermer toutes les cartes et ouvrir seulement le lot duplique
      setExpandedLots({[newLot.id]: true})
    }
  }

  // Fonction pour gérer le changement du nom de l'immeuble
  // Marque que l'utilisateur a édité le champ et empêche le remplissage automatique
  const handleBuildingNameChange = (newName: string) => {
    // Marquer que l'utilisateur a édité le champ
    if (!hasUserEditedName) {
      setHasUserEditedName(true)
    }

    // Mettre à jour le buildingInfo
    setBuildingInfo(prev => ({
      ...prev,
      name: newName
    }))
  }

  // Callbacks pour la gestion des contacts (nouvelle interface centralisee avec contexte)
  const handleContactAdd = (contact: Contact, contactType: string, context?: { lotId?: string }) => {
    logger.info('🎯 [IMMEUBLE] Contact ajouté:', contact.name, 'type:', contactType, context?.lotId ? `à lot ${context.lotId}` : 'niveau immeuble')

    if (context?.lotId) {
      // AJOUTER AU LOT SPECIFIQUE
      setLotContactAssignments((prev) => {
        const lotId = context.lotId!  // On sait que lotId existe ici
        return {
          ...prev,
          [lotId]: {
            ...prev[lotId],
            [contactType]: [...(prev[lotId]?.[contactType] || []), contact]
          }
        }
      })
    } else {
      // AJOUTER AUX CONTACTS GENERAUX DE L'IMMEUBLE
    setBuildingContacts((prev) => ({
      ...prev,
      [contactType]: [...prev[contactType], contact],
    }))
    }
    
    // Ajouter aussi a la liste globale des contacts si pas deja present
    if (!contacts.some(c => c.id === contact.id)) {
      setContacts([...contacts, contact])
    }
  }

  const handleBuildingContactRemove = (contactId: string, contactType: string) => {
    setBuildingContacts((prev) => ({
      ...prev,
      [contactType]: prev[contactType].filter(contact => contact.id !== contactId),
    }))
    
    // Retirer aussi de la liste globale des contacts si plus utilise
    const isContactUsedElsewhere = Object.entries(buildingContacts).some(([type, contactsArray]) => 
      type !== contactType && contactsArray.some(c => c.id === contactId)
    ) || Object.values(lotContactAssignments).some(assignments => 
      Object.values(assignments).some(contactsArray => contactsArray.some(c => c.id === contactId))
    )
    
    if (!isContactUsedElsewhere) {
      setContacts(contacts.filter(c => c.id !== contactId))
    }
  }

  // Fonction pour ouvrir le ContactSelector avec un type specifique (pour les boutons individuels)
  const openContactModalForType = (contactType: string, lotId?: string) => {
    logger.info('🎯 [IMMEUBLE] Opening ContactSelector for type:', contactType, 'lotId:', lotId)
    if (contactSelectorRef.current) {
      contactSelectorRef.current.openContactModal(contactType, lotId)
    } else {
      logger.error('❌ [IMMEUBLE] ContactSelector ref not found')
    }
  }

  // [SUPPRIME] addContact maintenant gere dans ContactSelector

  const _removeContact = (_id: string) => {
    setContacts(contacts.filter((contact) => contact.id !== _id))

    // Aussi retirer ce contact de toutes les assignations de lots
    const newLotContactAssignments = { ...lotContactAssignments }
    Object.keys(newLotContactAssignments).forEach(lotId => {
      Object.keys(newLotContactAssignments[lotId]).forEach(contactType => {
        newLotContactAssignments[lotId][contactType] = newLotContactAssignments[lotId][contactType].filter(c => c.id !== _id)
      })
    })
    setLotContactAssignments(newLotContactAssignments)
  }

  // Fonction pour assigner un contact a un lot specifique
  // const _assignContactToLot = (lotId: string, contactType: string, contact: Contact) => {
  //   setLotContactAssignments(prev => ({
  //     ...prev,
  //     [lotId]: {
  //       ...prev[lotId],
  //       [contactType]: [...(prev[lotId]?.[contactType] || []), contact]
  //     }
  //   }))
  // }

  // Fonction pour retirer un contact d'un lot specifique
  const removeContactFromLot = (lotId: string, contactType: string, contactId: string) => {
    setLotContactAssignments(prev => ({
      ...prev,
      [lotId]: {
        ...prev[lotId],
        [contactType]: (prev[lotId]?.[contactType] || []).filter(c => c.id !== contactId)
      }
    }))
  }

  // Fonction pour obtenir les contacts assignes a un lot par type
  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  // Fonction pour obtenir tous les contacts assignes a un lot
  const getAllLotContacts = (lotId: string): Contact[] => {
    const lotAssignments = lotContactAssignments[lotId] || {}
    return Object.values(lotAssignments).flat()
  }

  // const _getContactsByType = (_type: string) => {
  //   return contacts.filter((contact) => contact.type === type)
  // }

  // const _getTotalStats = () => {
  //   // Statistiques des lots sans la surface
  //   return { totalLots: lots.length }
  // }

  // [SUPPRIME] getFilteredContacts et getSelectedContactTypeInfo maintenant geres dans ContactSelector

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      // Référence de l'immeuble requise
      if (!buildingInfo.name.trim()) return false
      // Adresse requise
      if (!buildingInfo.address.trim()) return false
      // Vérification de l'unicité du nom en cours
      if (isNameChecking) return false
      // Nom dupliqué dans l'équipe
      if (isNameDuplicate) return false
      return true
    }
    if (currentStep === 2) {
      return lots.length > 0
    }
    if (currentStep === 3) {
      return true // L'assignation des contacts est optionnelle
    }
    return true
  }

  const handleFinish = async () => {
    if (!userProfile?.id) {
      setError("Vous devez être connecté pour créer un immeuble")
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
      setIsCreating(true)
      setError("")

      // Preparer les donnees de l'immeuble
      const immeubleData = {
        name: buildingInfo.name.trim() || `Immeuble ${buildingInfo.address}`,
        address: buildingInfo.address.trim(),
        city: buildingInfo.city.trim() || "Non spécifié",
        country: countryToDBEnum[buildingInfo.country.trim()] || "belgique",
        postal_code: buildingInfo.postalCode.trim() || "",
        description: buildingInfo.description.trim(),
        team_id: userTeam!.id,
      }

      // Preparer les donnees des lots
      const lotsData = lots.map((lot) => ({
        reference: lot.reference.trim(),
        floor: lot.floor ? parseInt(lot.floor) : 0,
        apartment_number: lot.doorNumber.trim() || undefined,
        surface_area: undefined, // Surface retiree
        rooms: undefined, // Peut etre ajoute plus tard
        charges_amount: undefined, // Charges amount removed
        category: lot.category,
        description: lot.description?.trim() || undefined,
      }))

      // ✅ Preparer les building_contacts (contacts de l'immeuble)
      const contactsData = [
        // Contacts de l'immeuble (provider, owner, other)
        ...Object.entries(buildingContacts).flatMap(([contactType, contactArray]) =>
          contactArray.map(contact => ({
            id: contact.id,
            type: contactType,
            isPrimary: false
          }))
        ),
        // Gestionnaires de l'immeuble (toujours inclus)
        ...buildingManagers.map((manager, index) => ({
          id: manager.id, // ✅ Utiliser manager.id directement
          type: 'gestionnaire',
          isPrimary: index === 0 // Premier gestionnaire = principal
        }))
      ]

      // Preparer les assignations de contacts aux lots
      const lotContactAssignmentsData = Object.entries(lotContactAssignments).map(([lotId, assignments]) => {
        // Trouver l'index du lot dans le tableau lotsData base sur l'ID
        const lotIndex = lots.findIndex(lot => lot.id === lotId)
        
        // Recuperer les contacts classiques assignes a ce lot
        const contactAssignments = Object.entries(assignments).flatMap(([contactType, contacts]) =>
          contacts.map(contact => ({
            contactId: contact.id,
            contactType: contactType,
            isPrimary: false // Peut etre etendu plus tard
          }))
        )
        
        // Ajouter les gestionnaires assignes a ce lot
        const managersForThisLot = assignedManagers[lotId] || []
        const managerAssignments = managersForThisLot.map((manager, index) => ({
          contactId: manager.id, // ✅ Utiliser manager.id directement
          contactType: 'gestionnaire',
          isPrimary: index === 0, // Le premier gestionnaire est principal, les autres additionnels
          isLotPrincipal: index === 0 // Marquer le gestionnaire principal pour lot_contacts.is_primary
        }))
        
        return {
          lotId: lotId,
          lotIndex: lotIndex, // Index du lot dans le tableau lotsData
          assignments: [...contactAssignments, ...managerAssignments]
        }
      }).filter(item => item.lotIndex !== -1) // Filtrer les lots qui n'existent plus

      // ✅ Utiliser la Server Action pour créer l'immeuble avec auth server-side
      // La Server Action utilise createServerCompositeService() avec le server client authentifié
      // Cela garantit que auth.uid() est disponible pour les RLS policies
      const result = await createCompleteProperty({
        building: immeubleData,
        lots: lotsData,
        buildingContacts: contactsData, // ✨ Contacts de l'immeuble
        lotContactAssignments: lotContactAssignmentsData,
      })

      // Verifier le succes de l'operation
      if (!result.success) {
        // ✅ Safely extract error message whether string or object
        const errorMessage = typeof result.error === 'string'
          ? result.error
          : result.error?.message || JSON.stringify(result.error) || 'Échec de la création de l\'immeuble'
        throw new Error(errorMessage)
      }

      // ✅ Rediriger avec toast et refresh des données
      await handleSuccess({
        successTitle: "✅ Immeuble créé avec succès",
        successDescription: `L'immeuble "${result.data.building.name}" avec ${result.data.lots.length} lot(s) a été créé et assigné à votre équipe.`,
        redirectPath: "/gestionnaire/biens",
        refreshData: refetchManagerData,
      })
    } catch (err) {
      logger.error("Error creating building:", err)
      setError(
        err instanceof Error 
          ? `Erreur lors de la création : ${err.message}`
          : "Une erreur est survenue lors de la création de l'immeuble"
      )
    } finally {
      setIsCreating(false)
    }
  }

  // const _getProgressPercentage = () => {
  //   if (currentStep === 1) {
  //     const filledFields = Object.values(buildingInfo).filter((value) => value.trim() !== "").length
  //     return Math.round((filledFields / 7) * 100)
  //   }
  //   return 0
  // }

  // [SUPPRIME] openContactFormModal maintenant gere dans ContactSelector

  // [SUPPRIME] cleanContactContext maintenant inutile (gestion centralisee dans ContactSelector)

  // [SUPPRIME] La fonction openContactModal est maintenant centralisee dans ContactSelector

  // [SUPPRIME] addExistingContactToLot maintenant inutile (gestion centralisee dans ContactSelector)

  // [SUPPRIME] handleContactCreated maintenant gere dans ContactSelector centralise

  const openGestionnaireModal = () => {
    router.push('/gestionnaire/contacts/nouveau')
  }

  // Fonctions pour la gestion des gestionnaires assignes aux lots
  const openManagerModal = (lotId: string) => {
    setSelectedLotForManager(lotId)
    setIsManagerModalOpen(true)
  }

  const addManagerToLot = (lotId: string, manager: TeamManagerWithUser) => {
    setAssignedManagers(prev => {
      const currentManagers = prev[lotId] || []
      // Verifier si le gestionnaire n'est pas deja assigne
      const alreadyAssigned = currentManagers.some(m => m.id === manager.user?.id)
      if (alreadyAssigned || !manager.user) return prev

      return {
        ...prev,
        [lotId]: [...currentManagers, manager.user] // ✅ Stocker seulement User, pas TeamMember
      }
    })
    setIsManagerModalOpen(false)
  }

  const removeManagerFromLot = (lotId: string, managerId: string) => {
    setAssignedManagers(prev => ({
      ...prev,
      [lotId]: (prev[lotId] || []).filter(manager => manager.id !== managerId) // ✅ Utiliser manager.id directement
    }))
  }

  const getAssignedManagers = (lotId: string) => {
    return assignedManagers[lotId] || []
  }

  // Fonctions pour la gestion des gestionnaires de l'immeuble
  const openBuildingManagerModal = () => {
    setIsBuildingManagerModalOpen(true)
  }

  const addBuildingManager = (manager: TeamManagerWithUser) => {
    // Vérifier si le gestionnaire n'est pas déjà dans la liste
    const alreadyExists = buildingManagers.some(m => m.id === manager.user?.id)
    if (!alreadyExists && manager.user) {
      setBuildingManagers([...buildingManagers, manager.user]) // ✅ Stocker seulement User, pas TeamMember
    }
    setIsBuildingManagerModalOpen(false)
  }

  const removeBuildingManager = (managerId: string) => {
    // Ne pas permettre de retirer si c'est le dernier gestionnaire
    if (buildingManagers.length <= 1) return

    setBuildingManagers(buildingManagers.filter(m => m.id !== managerId)) // ✅ Utiliser m.id directement
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Header */}
      <StepProgressHeader
        title="Ajouter un immeuble"
        backButtonText="Retour aux biens"
        onBack={() => router.push("/gestionnaire/biens")}
        steps={buildingSteps}
        currentStep={currentStep}
      />

      {/* Main content with horizontal padding and bottom space for footer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pt-10 pb-20">

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Building Information */}
        {currentStep === 1 && (
          <Card className="shadow-sm content-max-width min-w-0">
            <CardContent className="px-6 py-6 space-y-6">
              <BuildingInfoForm
                buildingInfo={buildingInfo}
                setBuildingInfo={setBuildingInfo}
                onNameChange={handleBuildingNameChange}
                teamManagers={teamManagers}
                userTeam={userTeam}
                isLoading={false}
                onCreateManager={openGestionnaireModal}
                showManagerSection={false}
                showAddressSection={true}
                buildingsCount={managerData?.buildings?.length || 0}
                categoryCountsByTeam={categoryCountsByTeam}
                onNameValidationChange={({ isChecking, isDuplicate }) => {
                  setIsNameChecking(isChecking)
                  setIsNameDuplicate(isDuplicate)
                }}
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
        </div>

        {/* Footer Navigation - Always visible at bottom */}
        <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
          <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
              {/* Back Button - Only show from step 2 onwards */}
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="w-full sm:w-auto"
                  disabled={isCreating}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {currentStep === 2 && "Retour à l'immeuble"}
                  {currentStep === 3 && "Étape précédente"}
                  {currentStep === 4 && "Retour"}
                </Button>
              )}

              {/* Next/Submit Button - Always show */}
              <Button
                onClick={() => {
                  if (currentStep === 4) {
                    handleFinish()
                  } else {
                    setCurrentStep(currentStep + 1)
                  }
                }}
                disabled={!canProceedToNextStep() || (currentStep === 4 && isCreating)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto ml-auto"
              >
                {isCreating && currentStep === 4 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {currentStep === 1 && "Continuer vers les lots"}
                {currentStep === 2 && "Continuer vers les contacts"}
                {currentStep === 3 && "Créer l'immeuble"}
                {currentStep === 4 && (isCreating ? "Création en cours..." : "Confirmer la création")}
                {currentStep < 4 && <ChevronDown className="w-4 h-4 ml-2 rotate-[-90deg]" />}
              </Button>
          </div>
        </div>

        {/* [SUPPRIME] Contact Selection Modal et Contact Form Modal maintenant geres dans ContactSelector centralise */}

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
                    {teamManagers.filter(manager => manager.user).map((manager) => {
                      const isAlreadyAssigned = Boolean(selectedLotForManager &&
                        getAssignedManagers(selectedLotForManager).some(m => m.id === manager.user?.id))
                      const isBuildingManager = buildingManagers.some(m => m.id === manager.user?.id)

                      return (
                        <div
                          key={manager.user.id}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            isAlreadyAssigned
                              ? 'bg-muted border-border opacity-60'
                              : isBuildingManager
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-purple-50 border-purple-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isBuildingManager ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                              {isBuildingManager ? (
                                <Building className="w-5 h-5 text-blue-600" />
                              ) : (
                                <User className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{manager.user.name}</div>
                              <div className="text-sm text-muted-foreground">{manager.user.email}</div>
                              <div className="flex gap-1 mt-1">
                                {manager.user.id === userProfile.id && (
                                  <Badge variant="outline" className="text-xs">Vous</Badge>
                                )}
                                {isBuildingManager && (
                                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1">
                                    <Building className="w-3 h-3" />
                                    Gestionnaire de l'immeuble
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => selectedLotForManager && addManagerToLot(selectedLotForManager, manager)}
                            disabled={isAlreadyAssigned || isBuildingManager}
                            className={`${
                              isAlreadyAssigned
                                ? 'bg-muted text-muted-foreground'
                                : isBuildingManager
                                ? 'bg-blue-300 text-blue-700'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            }`}
                            size="sm"
                          >
                            {isAlreadyAssigned ? 'Déjà assigné' : isBuildingManager ? 'Déjà sur l\'immeuble' : 'Assigner'}
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
                      if (!manager.user) return null // Skip if user data is missing
                      const isAlreadyAssigned = buildingManagers.some(m => m.id === manager.user?.id)

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
                              <User className="w-5 h-5 text-blue-600" />
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
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
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

        {/* ContactSelector Modal - Required for contact selection */}
        <ContactSelector
          ref={contactSelectorRef}
          teamId={userTeam.id}
          displayMode="compact"
          selectionMode="multi"
          hideUI={true}
          selectedContacts={buildingContacts}
          lotContactAssignments={lotContactAssignments}
          onContactSelected={handleContactAdd}
          onContactCreated={handleContactAdd}
          onContactRemoved={(contactId, contactType, context) => {
            if (context?.lotId) {
              removeContactFromLot(context.lotId, contactType, contactId)
            } else {
              handleBuildingContactRemove(contactId, contactType)
            }
          }}
          onRequestContactCreation={(contactType, lotId) => {
            // Sauvegarder et rediriger vers le flow multi-étapes
            logger.info(`🔗 [BUILDING-FORM] Redirecting to contact creation flow`, { contactType, lotId })
            saveAndRedirect('/gestionnaire/contacts/nouveau', { type: contactType })
          }}
        />
    </div>
  )
}

