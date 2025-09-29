"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Search,
  AlertTriangle,
  Loader2,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import ContactFormModal from "@/components/contact-form-modal"  // Encore utilisé pour la création de gestionnaire
import { BuildingInfoForm } from "@/components/building-info-form"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { compositeService, teamService, contactService, contactInvitationService, lotService, determineAssignmentType, type Team } from "@/lib/database-service"
import { TeamCheckModal } from "@/components/team-check-modal"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { buildingSteps } from "@/lib/step-configurations"
import { LotCategory, getLotCategoryConfig, getAllLotCategories } from "@/lib/lot-types"
import LotCategorySelector from "@/components/ui/lot-category-selector"

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  constructionYear: string
  floors: string
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
  { key: "syndic", label: "Syndic", icon: Shield, color: "text-purple-600" },
  { key: "notary", label: "Notaire", icon: FileCheck, color: "text-orange-600" },
  { key: "insurance", label: "Assurance", icon: Car, color: "text-red-600" },
  { key: "other", label: "Autre", icon: MoreHorizontal, color: "text-gray-600" },
]

const countries = [
  "Belgique",
  "France",
  "Luxembourg",
  "Pays-Bas",
  "Allemagne",
]

// Mapping des noms de pays vers codes ISO-2
const countryToISOCode: Record<string, string> = {
  "Belgique": "BE",
  "France": "FR", 
  "Luxembourg": "LU",
  "Pays-Bas": "NL",
  "Allemagne": "DE",
}

export default function NewImmeubleePage() {
  const _router = useRouter()
  const { toast } = useToast()
  const { handleSuccess } = useCreationSuccess()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { data: managerData, forceRefetch: refetchManagerData } = useManagerStats()

  // TOUS LES HOOKS useState DOIVENT ÊTRE AVANT LES EARLY RETURNS (Rules of Hooks)
  const [currentStep, setCurrentStep] = useState(1)
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>({
    name: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Belgique",
    constructionYear: "",
    floors: "",
    description: "",
  })
  const [lots, setLots] = useState<Lot[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  // Contacts assignés au niveau de l'immeuble (format pour ContactSelector)
  const [buildingContacts, setBuildingContacts] = useState<{[contactType: string]: Contact[]}>({
    tenant: [],
    provider: [],
    syndic: [],
    notary: [],
    insurance: [],
    other: [],
  })
  const [assignedManagers, setAssignedManagers] = useState<{[key: string]: unknown[]}>({}) // gestionnaires assignés par lot
  const [lotContactAssignments, setLotContactAssignments] = useState<{[lotId: string]: {[contactType: string]: Contact[]}}>({}) // contacts assignés par lot
  
  // [SUPPRIMÉ] États des modals maintenant gérés dans ContactSelector centralisé :
  // isContactModalOpen, selectedContactType, selectedLotForContact, searchTerm,
  // isContactFormModalOpen, prefilledContactType, existingContacts, isLoadingContacts
  
  // Référence au ContactSelector pour ouvrir les modals depuis l'extérieur
  const contactSelectorRef = useRef<ContactSelectorRef>(null)
  
  // États pour la gestion des gestionnaires
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [selectedLotForManager, setSelectedLotForManager] = useState<string>("")
  
  // Nouveaux états pour Supabase
  const [teams, setTeams] = useState<Team[]>([])
  const [teamManagers, setTeamManagers] = useState<unknown[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [categoryCountsByTeam, setCategoryCountsByTeam] = useState<Record<string, number>>({})
  
  // États pour la création de gestionnaire
  const [isGestionnaireModalOpen, setIsGestionnaireModalOpen] = useState(false)
  
  // État pour gérer l'affichage des détails de chaque lot
  const [expandedLots, setExpandedLots] = useState<{[key: string]: boolean}>({})

  // TOUS LES useEffect DOIVENT AUSSI ÊTRE AVANT LES EARLY RETURNS (Rules of Hooks)
  // Charger l'équipe de l'utilisateur et ses gestionnaires
  useEffect(() => {
    const loadUserTeamAndManagers = async () => {
      if (!user?.id || teamStatus !== 'verified') {
        return
      }

      try {
        setIsLoading(true)
        setError("")
        
        // 1. Récupérer les équipes de l'utilisateur
        const userTeams = await teamService.getUserTeams(user.id)
        setTeams(userTeams)
        
        if (userTeams.length === 0) {
          setError('Vous devez faire partie d\'une équipe pour créer des immeubles')
          return
        }
        
        // 2. Prendre la première équipe (un gestionnaire n'a normalement qu'une équipe)
        const primaryTeam = userTeams[0]
        setUserTeam(primaryTeam)
        
        // 3. Récupérer les membres de cette équipe
        let teamMembers = []
        try {
          teamMembers = await teamService.getMembers(primaryTeam.id)
        } catch (membersError) {
          console.error("Error loading team members:", membersError)
          teamMembers = [] // Continue avec un tableau vide
        }
        
        // 4. Filtrer pour ne garder que les gestionnaires
        const managers = teamMembers.filter((_member: unknown) => 
          member.user && member.user.role === 'gestionnaire'
        )
        
        // 5. TOUJOURS s'assurer que l'utilisateur actuel est disponible s'il est gestionnaire
        const currentUserExists = managers.find((_member: unknown) => 
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
            role: 'admin' // Le créateur de l'équipe est admin
          }
          managers.push(currentUserAsManager)
        }
        
        setTeamManagers(managers)
        
        // 6. Sélectionner l'utilisateur actuel par défaut s'il est gestionnaire
        const currentUserAsMember = managers.find((_member: unknown) => 
          member.user.id === user.id
        )
        
        if (currentUserAsMember) {
          setSelectedManagerId(user.id)
        } else if (managers.length > 0) {
          setSelectedManagerId(managers[0].user.id)
        }
        
      } catch (err) {
        console.error('Error loading teams and managers:', err)
        setError('Erreur lors du chargement des gestionnaires')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserTeamAndManagers()
  }, [user?.id, teamStatus])

  // Récupérer les comptages par catégorie quand l'équipe est chargée
  useEffect(() => {
    const loadCategoryCountsByTeam = async () => {
      if (!userTeam?.id) {
        return
      }

      try {
        const counts = await lotService.getCountByCategory(userTeam.id)
        setCategoryCountsByTeam(counts)
      } catch (error) {
        console.error("Error loading category counts:", error)
        setCategoryCountsByTeam({}) // Valeur par défaut en cas d'erreur
      }
    }

    loadCategoryCountsByTeam()
  }, [userTeam?.id])

  // Initialiser le nom par défaut de l'immeuble quand les données sont disponibles
  useEffect(() => {
    if (managerData?.buildings && !buildingInfo.name) {
      const nextBuildingNumber = managerData.buildings.length + 1
      setBuildingInfo(prev => ({
        ...prev,
        name: `Immeuble ${nextBuildingNumber}`
      }))
    }
  }, [managerData?.buildings, buildingInfo.name])

  // Pré-remplir le responsable de l'immeuble pour tous les lots quand on passe à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && selectedManagerId && lots.length > 0) {
      const buildingManager = teamManagers.find(member => member.user.id === selectedManagerId)
      if (buildingManager) {
        const initialAssignments: {[key: string]: unknown[]} = {}
        lots.forEach(lot => {
          // Vérifier si ce lot n'a pas déjà des gestionnaires assignés
          if (!assignedManagers[lot.id] || assignedManagers[lot.id].length === 0) {
            initialAssignments[lot.id] = [buildingManager]
          } else {
            initialAssignments[lot.id] = assignedManagers[lot.id]
          }
        })
        setAssignedManagers(prev => ({ ...prev, ...initialAssignments }))
      }
    }
  }, [currentStep, selectedManagerId, lots, teamManagers])

  // Ouvrir tous les lots par défaut quand on arrive à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && lots.length > 0) {
      const allExpanded: {[key: string]: boolean} = {}
      lots.forEach(lot => {
        allExpanded[lot.id] = true
      })
      setExpandedLots(allExpanded)
    }
  }, [currentStep, lots])

  // Mettre à jour automatiquement la référence des lots quand leur catégorie change
  useEffect(() => {
    if (!categoryCountsByTeam || Object.keys(categoryCountsByTeam).length === 0) {
      return // Attendre que les données de catégorie soient chargées
    }

    // Créer dynamiquement le pattern basé sur tous les labels de catégorie possibles
    const allCategories = getAllLotCategories()
    const categoryLabels = allCategories.map(cat => cat.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const generatedReferencePattern = new RegExp(`^(${categoryLabels.join('|')})\\s+\\d+$`)

    // Vérifier chaque lot pour voir si sa référence doit être mise à jour
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

      // Ne mettre à jour que si la référence est vide ou générée par défaut
      if (isEmptyOrDefault && currentReference !== newDefaultReference) {
        lotsToUpdate.push({ id: lot.id, newReference: newDefaultReference })
      }
    })

    // Appliquer toutes les mises à jour en une seule fois
    if (lotsToUpdate.length > 0) {
      setLots(prevLots => 
        prevLots.map(lot => {
          const update = lotsToUpdate.find(u => u.id === lot.id)
          return update ? { ...lot, reference: update.newReference } : lot
        })
      )
    }
  }, [lots.map(lot => lot.category).join(','), categoryCountsByTeam])

  // Afficher la vérification d'équipe si nécessaire (APRÈS tous les hooks)
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }


  const addLot = () => {
    // Générer la référence basée sur la catégorie par défaut (appartement)
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
    setLots(lots.map((lot) => (lot.id === id ? { ...lot, [field]: value } : lot)))
  }

  const removeLot = (_id: string) => {
    setLots(lots.filter((lot) => lot.id !== id))
    // Nettoyer l'état d'expansion pour ce lot
    const newExpandedLots = {...expandedLots}
    delete newExpandedLots[id]
    setExpandedLots(newExpandedLots)
  }

  const toggleLotExpansion = (_lotId: string) => {
    setExpandedLots({
      ...expandedLots,
      [lotId]: !expandedLots[lotId]
    })
  }

  const duplicateLot = (_id: string) => {
    const lotToDuplicate = lots.find((lot) => lot.id === id)
    if (lotToDuplicate) {
      // Générer la référence basée sur la catégorie du lot dupliqué
      const category = lotToDuplicate.category || "appartement"
      const categoryConfig = getLotCategoryConfig(category)
      const currentCategoryCount = categoryCountsByTeam[category] || 0
      const nextNumber = currentCategoryCount + lots.filter(lot => lot.category === category).length + 1
      
      const newLot: Lot = {
        ...lotToDuplicate,
        id: `lot${Date.now()}`,
        reference: `${categoryConfig.label} ${nextNumber}`,
      }
      // Ajouter le lot dupliqué en haut de la liste
      setLots([newLot, ...lots])
      // Fermer toutes les cartes et ouvrir seulement le lot dupliqué
      setExpandedLots({[newLot.id]: true})
    }
  }

  // Callbacks pour la gestion des contacts (nouvelle interface centralisée avec contexte)
  const handleContactAdd = (contact: Contact, contactType: string, context?: { lotId?: string }) => {
    console.log('🎯 [IMMEUBLE] Contact ajouté:', contact.name, 'type:', contactType, context?.lotId ? `à lot ${context.lotId}` : 'niveau immeuble')
    
    if (context?._lotId) {
      // AJOUTER AU LOT SPÉCIFIQUE
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
      // AJOUTER AUX CONTACTS GÉNÉRAUX DE L'IMMEUBLE
    setBuildingContacts((prev) => ({
      ...prev,
      [contactType]: [...prev[contactType], contact],
    }))
    }
    
    // Ajouter aussi à la liste globale des contacts si pas déjà présent
    if (!contacts.some(c => c.id === contact.id)) {
      setContacts([...contacts, contact])
    }
  }

  const handleBuildingContactRemove = (contactId: string, contactType: string) => {
    setBuildingContacts((prev) => ({
      ...prev,
      [contactType]: prev[contactType].filter(contact => contact.id !== contactId),
    }))
    
    // Retirer aussi de la liste globale des contacts si plus utilisé
    const isContactUsedElsewhere = Object.entries(buildingContacts).some(([type, contactsArray]) => 
      type !== contactType && contactsArray.some(c => c.id === contactId)
    ) || Object.values(lotContactAssignments).some(assignments => 
      Object.values(assignments).some(contactsArray => contactsArray.some(c => c.id === contactId))
    )
    
    if (!isContactUsedElsewhere) {
      setContacts(contacts.filter(c => c.id !== contactId))
    }
  }

  // Fonction pour ouvrir le ContactSelector avec un type spécifique (pour les boutons individuels)
  const openContactModalForType = (contactType: string, lotId?: string) => {
    console.log('🎯 [IMMEUBLE] Opening ContactSelector for type:', contactType, 'lotId:', _lotId)
    if (contactSelectorRef.current) {
      contactSelectorRef.current.openContactModal(contactType, _lotId)
    } else {
      console.error('❌ [IMMEUBLE] ContactSelector ref not found')
    }
  }

  // [SUPPRIMÉ] addContact maintenant géré dans ContactSelector

  const removeContact = (_id: string) => {
    setContacts(contacts.filter((contact) => contact.id !== id))
    
    // Aussi retirer ce contact de toutes les assignations de lots
    const newLotContactAssignments = { ...lotContactAssignments }
    Object.keys(newLotContactAssignments).forEach(lotId => {
      Object.keys(newLotContactAssignments[lotId]).forEach(contactType => {
        newLotContactAssignments[lotId][contactType] = newLotContactAssignments[lotId][contactType].filter(c => c.id !== id)
      })
    })
    setLotContactAssignments(newLotContactAssignments)
  }

  // Fonction pour assigner un contact à un lot spécifique
  const assignContactToLot = (lotId: string, contactType: string, contact: Contact) => {
    setLotContactAssignments(prev => ({
      ...prev,
      [lotId]: {
        ...prev[lotId],
        [contactType]: [...(prev[lotId]?.[contactType] || []), contact]
      }
    }))
  }

  // Fonction pour retirer un contact d'un lot spécifique
  const removeContactFromLot = (lotId: string, contactType: string, contactId: string) => {
    setLotContactAssignments(prev => ({
      ...prev,
      [lotId]: {
        ...prev[lotId],
        [contactType]: (prev[lotId]?.[contactType] || []).filter(c => c.id !== contactId)
      }
    }))
  }

  // Fonction pour obtenir les contacts assignés à un lot par type
  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  // Fonction pour obtenir tous les contacts assignés à un lot
  const getAllLotContacts = (_lotId: string): Contact[] => {
    const lotAssignments = lotContactAssignments[lotId] || {}
    return Object.values(lotAssignments).flat()
  }

  const getContactsByType = (_type: string) => {
    return contacts.filter((contact) => contact.type === type)
  }

  const getTotalStats = () => {
    // Statistiques des lots sans la surface
    return { totalLots: lots.length }
  }

  // [SUPPRIMÉ] getFilteredContacts et getSelectedContactTypeInfo maintenant gérés dans ContactSelector

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return buildingInfo.address.trim() !== ""
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
    if (!user?.id) {
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

    if (!selectedManagerId) {
      setError("Veuillez sélectionner un responsable")
      return
    }

    if (!userTeam?.id) {
      setError("Impossible de déterminer votre équipe")
      return
    }

    try {
      setIsCreating(true)
      setError("")

      // Préparer les données de l'immeuble
      const immeubleData = {
        name: buildingInfo.name.trim() || `Immeuble ${buildingInfo.address}`,
        address: buildingInfo.address.trim(),
        city: buildingInfo.city.trim() || "Non spécifié",
        country: countryToISOCode[buildingInfo.country.trim()] || countryToISOCode["Belgique"] || "BE",
        postal_code: buildingInfo.postalCode.trim() || "",
        description: buildingInfo.description.trim(),
        construction_year: buildingInfo.constructionYear ? parseInt(buildingInfo.constructionYear) : undefined,
        team_id: userTeam!.id,
      }

      // Préparer les données des lots
      const lotsData = lots.map((lot) => ({
        reference: lot.reference.trim(),
        floor: lot.floor ? parseInt(lot.floor) : 0,
        apartment_number: lot.doorNumber.trim() || undefined,
        surface_area: undefined, // Surface retirée
        rooms: undefined, // Peut être ajouté plus tard
        charges_amount: undefined, // Charges amount removed
        category: lot.category,
      }))

      // Préparer les données des contacts si ils existent
      const contactsData = contacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        speciality: contact.type === 'provider' ? 'autre' : undefined,
        team_id: userTeam!.id,
      }))

      // Préparer les assignations de contacts aux lots
      const lotContactAssignmentsData = Object.entries(lotContactAssignments).map(([_lotId, assignments]) => {
        // Trouver l'index du lot dans le tableau lotsData basé sur l'ID
        const lotIndex = lots.findIndex(lot => lot.id === _lotId)
        
        // Récupérer les contacts classiques assignés à ce lot
        const contactAssignments = Object.entries(assignments).flatMap(([contactType, contacts]) =>
          contacts.map(contact => ({
            contactId: contact.id,
            contactType: contactType,
            isPrimary: false // Peut être étendu plus tard
          }))
        )
        
        // Ajouter les gestionnaires assignés à ce lot
        const managersForThisLot = assignedManagers[lotId] || []
        const managerAssignments = managersForThisLot.map((manager, index) => ({
          contactId: manager.user.id, // ✅ CORRECTION : utiliser manager.user.id au lieu de manager.id
          contactType: 'gestionnaire',
          isPrimary: index === 0, // Le premier gestionnaire est principal, les autres additionnels
          isLotPrincipal: index === 0 // Marquer le gestionnaire principal pour lot_contacts.is_primary
        }))
        
        return {
          lotId: _lotId,
          lotIndex: lotIndex, // Index du lot dans le tableau lotsData
          assignments: [...contactAssignments, ...managerAssignments]
        }
      }).filter(item => item.lotIndex !== -1) // Filtrer les lots qui n'existent plus

      // Créer l'immeuble complet avec lots et contacts
      const result = await compositeService.createCompleteProperty({
        building: immeubleData,
        lots: lotsData,
        contacts: contactsData,
        lotContactAssignments: lotContactAssignmentsData,
      })

      // Gérer le succès avec la nouvelle stratégie
      await handleSuccess({
        successTitle: "Immeuble créé avec succès",
        successDescription: `L'immeuble "${result.building.name}" avec ${result.lots.length} lot(s) a été créé et assigné à votre équipe.`,
        redirectPath: "/gestionnaire/biens",
        refreshData: refetchManagerData,
      })
    } catch (err) {
      console.error("Error creating building:", err)
      setError(
        err instanceof Error 
          ? `Erreur lors de la création : ${err.message}`
          : "Une erreur est survenue lors de la création de l'immeuble"
      )
    } finally {
      setIsCreating(false)
    }
  }

  const getProgressPercentage = () => {
    if (currentStep === 1) {
      const filledFields = Object.values(buildingInfo).filter((value) => value.trim() !== "").length
      return Math.round((filledFields / 7) * 100)
    }
    return 0
  }

  // [SUPPRIMÉ] openContactFormModal maintenant géré dans ContactSelector

  // [SUPPRIMÉ] cleanContactContext maintenant inutile (gestion centralisée dans ContactSelector)

  // [SUPPRIMÉ] La fonction openContactModal est maintenant centralisée dans ContactSelector

  // [SUPPRIMÉ] addExistingContactToLot maintenant inutile (gestion centralisée dans ContactSelector)

  // [SUPPRIMÉ] handleContactCreated maintenant géré dans ContactSelector centralisé

  const handleGestionnaireCreated = async (_contactData: unknown) => {
    try {
      if (!userTeam?.id) {
        console.error("No team found for user")
        return
      }

      // Utiliser le service d'invitation pour créer le gestionnaire et optionnellement l'utilisateur
      const result = await contactInvitationService.createContactWithOptionalInvite({
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

      // Si l'invitation a réussi, l'utilisateur sera créé avec les bonnes permissions
      // Créer l'objet manager pour l'état local
      const newManager = {
        user: {
          id: result.contact.id, // Utiliser l'ID réel du contact
          name: result.contact.name,
          email: result.contact.email,
          role: 'gestionnaire'
        },
        role: 'member'
      }
      
      setTeamManagers([...teamManagers, newManager])
      setSelectedManagerId(newManager.user.id)
      setIsGestionnaireModalOpen(false)
      
    } catch (error) {
      console.error("Erreur lors de la création du gestionnaire:", error)
      // Vous pourriez vouloir afficher une notification d'erreur à l'utilisateur ici
    }
  }

  const openGestionnaireModal = () => {
    setIsGestionnaireModalOpen(true)
  }

  // Fonctions pour la gestion des gestionnaires assignés aux lots
  const openManagerModal = (_lotId: string) => {
    setSelectedLotForManager(_lotId)
    setIsManagerModalOpen(true)
  }

  const addManagerToLot = (lotId: string, manager: unknown) => {
    setAssignedManagers(prev => {
      const currentManagers = prev[lotId] || []
      // Vérifier si le gestionnaire n'est pas déjà assigné
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

  const getAssignedManagers = (_lotId: string) => {
    return assignedManagers[lotId] || []
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <StepProgressHeader
          title="Ajouter un immeuble"
          backButtonText="Retour aux biens"
          onBack={() => router.push("/gestionnaire/biens")}
          steps={buildingSteps}
          currentStep={currentStep}
        />

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Chargement des équipes...</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Building Information */}
        {currentStep === 1 && (
          <Card>
            <CardContent className="space-y-6">
              <BuildingInfoForm
                buildingInfo={buildingInfo}
                setBuildingInfo={setBuildingInfo}
                selectedManagerId={selectedManagerId}
                setSelectedManagerId={setSelectedManagerId}
                teamManagers={teamManagers}
                userTeam={userTeam}
                isLoading={isLoading}
                onCreateManager={openGestionnaireModal}
                showManagerSection={true}
                showAddressSection={true}
                buildingsCount={managerData?.buildings?.length || 0}
                categoryCountsByTeam={categoryCountsByTeam}
              />

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-0">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToNextStep()}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  Continuer vers les lots
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Lots Configuration */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4 sm:p-6">
                {lots.length === 0 ? (
                  <div className="text-center py-12">
                    <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lot configuré</h3>
                    <p className="text-gray-500 mb-6">
                      Commencez par ajouter votre premier lot. Vous pourrez ensuite le dupliquer pour gagner du temps.
                    </p>
                    <Button onClick={addLot} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter mon premier lot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">

                    <div className="flex justify-center">
                      <Button
                        onClick={addLot}
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50 bg-transparent"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un lot
                      </Button>
                    </div>

                    {/* Lots */}
                    <div className="space-y-4">
                      {lots.map((lot, index) => (
                        <Card key={lot.id} className="border-blue-200">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleLotExpansion(lot.id)}>
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                  {lots.length - index}
                                </div>
                                <div>
                                  <h3 className="font-medium">{lot.reference}</h3>
                                </div>
                                <div className="ml-2">
                                  {expandedLots[lot.id] ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => duplicateLot(lot.id)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLot(lot.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {expandedLots[lot.id] && (
                            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  <Hash className="w-4 h-4 inline mr-1" />
                                  Référence *
                                </Label>
                                <Input
                                  value={lot.reference}
                                  onChange={(e) => updateLot(lot.id, "reference", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  <Building className="w-4 h-4 inline mr-1" />
                                  Étage
                                </Label>
                                <Input
                                  value={lot.floor}
                                  onChange={(e) => updateLot(lot.id, "floor", e.target.value)}
                                  className="mt-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">De -5 (sous-sol) à 100</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">
                                  <Hash className="w-4 h-4 inline mr-1" />
                                  Numéro de porte
                                </Label>
                                <Input
                                  placeholder="A, 12, A-bis..."
                                  value={lot.doorNumber}
                                  onChange={(e) => updateLot(lot.id, "doorNumber", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            </div>

                            {/* Sélection de catégorie */}
                            <LotCategorySelector
                              value={lot.category}
                              onChange={(category) => updateLot(lot.id, "category", category)}
                              displayMode="grid"
                              required
                            />

                            <div>
                              <Label className="text-sm font-medium text-gray-700">Description</Label>
                              <Textarea
                                placeholder="Informations supplémentaires sur ce lot..."
                                value={lot.description}
                                onChange={(e) => updateLot(lot.id, "description", e.target.value)}
                                className="mt-1"
                              />
                              <p className="text-xs text-gray-500 mt-1">Particularités, état, équipements...</p>
                            </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)} className="w-full sm:w-auto order-2 sm:order-1">
                    Retour à l'immeuble
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    disabled={!canProceedToNextStep()}
                    className="bg-sky-600 hover:bg-sky-700 w-full sm:w-auto order-1 sm:order-2"
                  >
                    Continuer vers les contacts
                  </Button>
                </div>
                {lots.length === 0 && (
                  <p className="text-center text-sm text-gray-500 mt-2">Ajoutez au moins un lot pour continuer</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Contacts Assignment */}
        {currentStep === 3 && (
          <Card>
            <CardContent className="space-y-3 p-4">
              
              {/* Building Information with Manager */}
              <Card className="border-blue-200 bg-blue-50/30 mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Building Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <h2 className="text-lg font-semibold text-gray-900 truncate">
                          {buildingInfo.name || `Immeuble - ${buildingInfo.address}`}
                        </h2>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">
                        {buildingInfo.address}, {buildingInfo.city} {buildingInfo.postalCode && `- ${buildingInfo.postalCode}`}
                      </p>
                      {buildingInfo.description && (
                        <p className="text-xs text-gray-500 line-clamp-2">{buildingInfo.description}</p>
                      )}
                    </div>
                    
                    {/* Building Manager - Compact */}
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-blue-200 flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                      <div className="text-right">
                        {selectedManagerId && teamManagers.length > 0 ? (
                          (() => {
                            const manager = teamManagers.find(m => m.user.id === selectedManagerId)
                            return manager ? (
                              <>
                                <div className="font-medium text-sm text-blue-900">{manager.user.name}</div>
                                <div className="text-xs text-gray-500">Responsable</div>
                                {manager.user.id === user?.id && (
                                  <Badge variant="outline" className="text-xs mt-0.5">Vous</Badge>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-gray-500">Non trouvé</div>
                            )
                          })()
                        ) : (
                          <div className="text-xs text-gray-500">Non sélectionné</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Building-Level Contacts */}
              <Card className="border-orange-200 bg-orange-50/30">
                <CardContent className="p-4">
                  <ContactSelector
                    ref={contactSelectorRef}
                    teamId={userTeam?.id}
                    displayMode="compact"
                    title="Contacts de l'immeuble"
                    description="Disponibles pour tous les lots"
                    selectedContacts={buildingContacts}
                    onContactSelected={handleContactAdd}
                    onContactRemoved={handleBuildingContactRemove}
                    allowedContactTypes={["provider", "syndic", "notary", "insurance", "other"]}
                    hideTitle={false}
                  />
                </CardContent>
              </Card>

              {/* Lots with contacts and managers */}
              <div className="space-y-3">
                {[...lots].reverse().map((lot) => {
                  const lotManagers = getAssignedManagers(lot.id)
                  const lotContacts = getAllLotContacts(lot.id) // Utiliser les vraies assignations
                  
                  return (
                    <Card key={lot.id} className="border-gray-200">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleLotExpansion(lot.id)}>
                            <h3 className="font-medium">{lot.reference}</h3>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                {lotManagers.filter(m => m.user.id !== selectedManagerId).length} responsable(s) spécifique(s)
                              </Badge>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {lotContacts.length} contact(s)
                              </Badge>
                            </div>
                            <div className="ml-2">
                              {expandedLots[lot.id] ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {expandedLots[lot.id] && (
                        <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Section Responsable spécifique du lot */}
                          <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span className="font-medium text-purple-900 text-sm">Responsable spécifique du lot</span>
                            </div>
                            
                            <div className="mb-2 p-2 bg-purple-100/50 rounded text-xs text-purple-700">
                              <div className="flex items-center gap-1 mb-1">
                                <Building className="w-3 h-3" />
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
                            
                            <div className="space-y-2">
                              {lotManagers.filter(manager => manager.user.id !== selectedManagerId).map((manager) => (
                                <div
                                  key={manager.user.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">{manager.user.name}</div>
                                      <div className="text-xs text-gray-500">{manager.user.email}</div>
                                      <Badge variant="secondary" className="text-xs mt-1 bg-purple-100 text-purple-700">
                                        Responsable du lot
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeManagerFromLot(lot.id, manager.user.id)}
                                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openManagerModal(lot.id)}
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

                          {/* Section Contacts */}
                          <div className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-gray-600" />
                              <span className="font-medium text-gray-900 text-sm">Contacts assignés</span>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {contactTypes.map((type) => {
                                const Icon = type.icon
                                const assignedContacts = getLotContactsByType(lot.id, type.key)

                                return (
                                  <div key={type.key} className="space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <Icon className={`w-3.5 h-3.5 ${type.color}`} />
                                      <span className="font-medium text-xs">{type.label}</span>
                                    </div>

                                    <div className="space-y-1.5">
                                      {assignedContacts.map((contact) => (
                                        <div
                                          key={contact.id}
                                          className="flex items-center justify-between p-2 bg-green-50 rounded text-xs"
                                        >
                                          <span className="truncate flex-1 mr-2">{contact.name || contact.email}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeContactFromLot(lot.id, type.key, contact.id)}
                                            className="text-red-500 hover:text-red-700 h-5 w-5 p-0 flex-shrink-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openContactModalForType(type.key, lot.id)}
                                        className="w-full text-xs py-1.5 h-7"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Ajouter
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        </CardContent>
                      )}
                    </Card>
                  )
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(2)}
                  disabled={isCreating}
                  className="w-full sm:w-auto order-3 sm:order-1"
                >
                  Étape précédente
                </Button>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 order-1 sm:order-2">
                  <Button 
                    onClick={() => setCurrentStep(4)}
                    className="bg-sky-600 hover:bg-sky-700 w-full sm:w-auto"
                  >
                    Créer l'immeuble
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card>
            <CardContent className="p-4">

              <div className="space-y-3 mb-4">
                {/* Building Information */}
                <Card className="border-l-4 border-l-sky-500">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                          <Building className="h-4 w-4 text-sky-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Informations de l'immeuble</h3>
                          <p className="text-xs text-slate-600">Détails généraux de l'immeuble</p>
                        </div>
                      </div>
                      
                      {/* Responsable Badge - Compact Material Design */}
                      {selectedManagerId && (
                        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                              const manager = teamManagers.find(m => m.user.id === selectedManagerId)
                              return manager ? (
                                <>
                                  <span className="font-medium text-xs text-blue-900 truncate">{manager.user.name}</span>
                                  <span className="text-xs text-blue-600">•</span>
                                  <span className="text-xs text-blue-600 whitespace-nowrap">Responsable</span>
                                  {manager.user.id === user?.id && (
                                    <span className="inline-flex items-center px-1 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-sm border border-blue-300 ml-1">Vous</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">Non trouvé</span>
                              )
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      {/* Informations principales */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700">Nom de l'immeuble</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 pl-5">
                            {buildingInfo.name || "Non spécifié"}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700">Année de construction</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 pl-5">
                            {buildingInfo.constructionYear || "Non spécifiée"}
                          </p>
                        </div>
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
                              buildingInfo.address,
                              [buildingInfo.postalCode, buildingInfo.city].filter(Boolean).join(' '),
                              buildingInfo.country
                            ].filter(Boolean).join(', ') || "Adresse non spécifiée"}
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      {buildingInfo.description && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs font-medium text-slate-700">Description</span>
                          </div>
                          <div className="pl-5 bg-white rounded-md border border-slate-200 p-3">
                            <p className="text-sm text-slate-700 leading-relaxed">{buildingInfo.description}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Contacts de l'immeuble */}
                      {Object.values(buildingContacts).some(contactArray => contactArray.length > 0) && (
                        <div className="pt-2 mt-2 border-t border-slate-200">
                          <span className="text-xs font-medium text-slate-700 mb-2 block">Contacts de l'immeuble :</span>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(buildingContacts).map(([type, contacts]) => 
                              contacts.length > 0 && (
                                <div key={type} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-300">
                                  {type === 'provider' && <span className="w-2 h-2 bg-green-500 rounded-full"></span>}
                                  {type === 'syndic' && <span className="w-2 h-2 bg-purple-500 rounded-full"></span>}
                                  {type === 'notary' && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                                  {type === 'insurance' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                                  {type === 'other' && <span className="w-2 h-2 bg-slate-500 rounded-full"></span>}
                                  <span className="text-xs font-medium text-slate-700">
                                    {contacts.length} {type === 'provider' ? 'prestataire' : type === 'syndic' ? 'syndic' : type === 'notary' ? 'notaire' : type === 'insurance' ? 'assurance' : 'autre'}{contacts.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Lots Summary */}
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">Lots configurés ({lots.length})</h3>
                        <p className="text-xs text-slate-600">Configuration des lots de l'immeuble</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      
                      {/* Liste des lots */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {lots.map((lot, index) => {
                          const categoryConfig = getLotCategoryConfig(lot.category)
                          return (
                            <div key={lot.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-xs font-medium text-green-600">
                                  {index + 1}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-slate-900">{lot.reference}</span>
                                    {lot.doorNumber && <span className="text-slate-500 text-xs">({lot.doorNumber})</span>}
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge 
                                      variant="outline" 
                                      className={`${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color} text-xs h-4 px-1.5`}
                                    >
                                      {categoryConfig.label}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-slate-600">
                                <span>Étage {lot.floor}</span>
                                
                                {/* Contact Summary with Tooltip */}
                                {(() => {
                                  const lotContacts = getAllLotContacts(lot.id)
                                  const lotManagers = getAssignedManagers(lot.id).filter(m => m.user.id !== selectedManagerId)
                                  const hasAssignments = lotContacts.length > 0 || lotManagers.length > 0
                                  
                                  if (!hasAssignments) return null
                                  
                                  // Group contacts by type
                                  const contactsByType = lotContacts.reduce((acc, contact) => {
                                    acc[contact.type] = (acc[contact.type] || 0) + 1
                                    return acc
                                  }, {} as Record<string, number>)
                                  
                                  const summaryItems = []
                                  if (contactsByType.tenant) summaryItems.push(`${contactsByType.tenant} locataire${contactsByType.tenant > 1 ? 's' : ''}`)
                                  if (contactsByType.provider) summaryItems.push(`${contactsByType.provider} prestataire${contactsByType.provider > 1 ? 's' : ''}`)
                                  if (contactsByType.syndic) summaryItems.push(`${contactsByType.syndic} syndic${contactsByType.syndic > 1 ? 's' : ''}`)
                                  if (contactsByType.notary) summaryItems.push(`${contactsByType.notary} notaire${contactsByType.notary > 1 ? 's' : ''}`)
                                  if (contactsByType.insurance) summaryItems.push(`${contactsByType.insurance} assurance${contactsByType.insurance > 1 ? 's' : ''}`)
                                  if (contactsByType.other) summaryItems.push(`${contactsByType.other} autre${contactsByType.other > 1 ? 's' : ''}`)
                                  if (lotManagers.length > 0) summaryItems.push(`${lotManagers.length} resp.${lotManagers.length > 1 ? 's' : ''}`)
                                  
                                  return (
                                    <div className="relative group">
                                      {/* Summary Badge */}
                                      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs cursor-help">
                                        <Users className="w-3 h-3 text-blue-600" />
                                        <span className="text-blue-700 font-medium">
                                          {summaryItems.slice(0, 2).join(', ')}{summaryItems.length > 2 && '...'}
                                        </span>
                                      </div>
                                      
                                      {/* Tooltip on Hover - Adaptive positioning */}
                                      <div className={`absolute right-0 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ${
                                        index < 2 ? 'top-full mt-2' : 'bottom-full mb-2'
                                      }`}>
                                        <div className="space-y-2">
                                          <div className="font-medium text-xs text-slate-700 mb-2">Contacts assignés à {lot.reference}</div>
                                          
                                          {/* Contacts */}
                                          {lotContacts.length > 0 && (
                                            <div className="space-y-1">
                                              {lotContacts.map((contact, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs">
                                                  <span className={`w-2 h-2 rounded-full ${
                                                    contact.type === 'tenant' ? 'bg-blue-500' :
                                                    contact.type === 'provider' ? 'bg-green-500' :
                                                    contact.type === 'syndic' ? 'bg-purple-500' :
                                                    contact.type === 'notary' ? 'bg-orange-500' :
                                                    contact.type === 'insurance' ? 'bg-red-500' : 'bg-slate-500'
                                                  }`}></span>
                                                  <span className="text-slate-700">{contact.name}</span>
                                                  <span className="text-slate-500 capitalize">
                                                    ({contact.type === 'tenant' ? 'locataire' : 
                                                      contact.type === 'provider' ? 'prestataire' : 
                                                      contact.type === 'syndic' ? 'syndic' :
                                                      contact.type === 'notary' ? 'notaire' :
                                                      contact.type === 'insurance' ? 'assurance' : 'autre'})
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {/* Lot Managers */}
                                          {lotManagers.length > 0 && (
                                            <div className="space-y-1 pt-1 border-t border-slate-200">
                                              {lotManagers.map((manager, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs">
                                                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                                  <span className="text-slate-700">{manager.user.name}</span>
                                                  <span className="text-slate-500">(resp. lot)</span>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Tooltip Arrow - Adaptive */}
                                        {index < 2 ? (
                                          /* Arrow pointing up (tooltip below) */
                                          <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-200"></div>
                                        ) : (
                                          /* Arrow pointing down (tooltip above) */
                                          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-200"></div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="text-red-800 font-medium">Erreur</p>
                  </div>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(3)}
                  disabled={isCreating}
                  size="sm"
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Retour
                </Button>
                <Button 
                  onClick={handleFinish} 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Confirmer la création
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* [SUPPRIMÉ] Contact Selection Modal et Contact Form Modal maintenant gérés dans ContactSelector centralisé */}

        {/* Gestionnaire Creation Modal */}
        <ContactFormModal
          isOpen={isGestionnaireModalOpen}
          onClose={() => setIsGestionnaireModalOpen(false)}
          onSubmit={handleGestionnaireCreated}
          defaultType="gestionnaire"
        />

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
              {!isLoading && teamManagers.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {teamManagers.map((manager) => {
                      const isAlreadyAssigned = Boolean(selectedLotForManager && 
                        getAssignedManagers(selectedLotForManager).some(m => m.user.id === manager.user.id))
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
                            onClick={() => selectedLotForManager && addManagerToLot(selectedLotForManager, manager)} 
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
                  Créer un nouveau responsable
                </Button>
                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setIsManagerModalOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

