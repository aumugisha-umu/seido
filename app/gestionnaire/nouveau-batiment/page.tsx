"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { useRouter } from "next/navigation"
import ContactFormModal from "@/components/contact-form-modal"
import { BuildingInfoForm } from "@/components/building-info-form"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { compositeService, teamService, contactService, contactInvitationService, type Team } from "@/lib/database-service"
import { TeamCheckModal } from "@/components/team-check-modal"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { buildingSteps } from "@/lib/step-configurations"

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
  surface: string
  monthlyRent: string
  deposit: string
  description: string
}

interface Contact {
  id: string
  name: string
  email: string
  type: "tenant" | "provider" | "syndic" | "notary" | "insurance" | "other"
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

export default function NewBuildingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()

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
  const [assignedManagers, setAssignedManagers] = useState<{[key: string]: any[]}>({}) // gestionnaires assignés par lot
  const [lotContactAssignments, setLotContactAssignments] = useState<{[lotId: string]: {[contactType: string]: Contact[]}}>({}) // contacts assignés par lot
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
  const [selectedLotForContact, setSelectedLotForContact] = useState<string>("") // lot sélectionné pour assignation de contact
  const [searchTerm, setSearchTerm] = useState("")
  const [isContactFormModalOpen, setIsContactFormModalOpen] = useState(false)
  const [prefilledContactType, setPrefilledContactType] = useState<string>("")
  const [existingContacts, setExistingContacts] = useState<any[]>([])
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)
  
  // États pour la gestion des gestionnaires
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [selectedLotForManager, setSelectedLotForManager] = useState<string>("")
  
  // Nouveaux états pour Supabase
  const [teams, setTeams] = useState<Team[]>([])
  const [teamManagers, setTeamManagers] = useState<any[]>([])
  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [userTeam, setUserTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  
  // États pour la création de gestionnaire
  const [isGestionnaireModalOpen, setIsGestionnaireModalOpen] = useState(false)

  // TOUS LES useEffect DOIVENT AUSSI ÊTRE AVANT LES EARLY RETURNS (Rules of Hooks)
  // Charger l'équipe de l'utilisateur et ses gestionnaires
  useEffect(() => {
    console.log("🔐 useAuth hook user state:", user)
    
    const loadUserTeamAndManagers = async () => {
      if (!user?.id || teamStatus !== 'verified') {
        console.log("⚠️ User ID not found or team not verified, skipping team loading")
        return
      }

      try {
        console.log("📡 Loading user teams for user:", user.id)
        setIsLoading(true)
        setError("")
        
        // 1. Récupérer les équipes de l'utilisateur
        const userTeams = await teamService.getUserTeams(user.id)
        console.log("✅ User teams loaded:", userTeams)
        setTeams(userTeams)
        
        if (userTeams.length === 0) {
          setError('Vous devez faire partie d\'une équipe pour créer des bâtiments')
          return
        }
        
        // 2. Prendre la première équipe (un gestionnaire n'a normalement qu'une équipe)
        const primaryTeam = userTeams[0]
        setUserTeam(primaryTeam)
        console.log("🏢 Primary team:", primaryTeam.name)
        
        // 3. Récupérer les membres de cette équipe
        console.log("👥 Loading team members for team:", primaryTeam.id)
        let teamMembers = []
        try {
          teamMembers = await teamService.getMembers(primaryTeam.id)
          console.log("✅ Team members loaded:", teamMembers)
        } catch (membersError) {
          console.error("❌ Error loading team members:", membersError)
          teamMembers = [] // Continue avec un tableau vide
        }
        
        // 4. Filtrer pour ne garder que les gestionnaires
        const managers = teamMembers.filter((member: any) => 
          member.user && member.user.role === 'gestionnaire'
        )
        console.log("👑 Managers in team:", managers)
        
        // 5. TOUJOURS s'assurer que l'utilisateur actuel est disponible s'il est gestionnaire
        const currentUserExists = managers.find((member: any) => 
          member.user.id === user.id
        )
        
        if (!currentUserExists && user.role === 'gestionnaire') {
          console.log("🔧 Adding current user as available manager (creator/admin)")
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
        
        console.log("📋 Final managers list:", managers)
        setTeamManagers(managers)
        
        // 6. Sélectionner l'utilisateur actuel par défaut s'il est gestionnaire
        const currentUserAsMember = managers.find((member: any) => 
          member.user.id === user.id
        )
        
        if (currentUserAsMember) {
          console.log("🎯 Auto-selecting current user as manager:", user.id)
          setSelectedManagerId(user.id)
        } else if (managers.length > 0) {
          console.log("🎯 Auto-selecting first available manager:", managers[0].user.id)
          setSelectedManagerId(managers[0].user.id)
        }
        
      } catch (err) {
        console.error('❌ Error loading teams and managers:', err)
        console.error('❌ Full error object:', JSON.stringify(err, null, 2))
        setError('Erreur lors du chargement des gestionnaires')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserTeamAndManagers()
  }, [user?.id, teamStatus])

  // Pré-remplir le responsable du bâtiment pour tous les lots quand on passe à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && selectedManagerId && lots.length > 0) {
      const buildingManager = teamManagers.find(member => member.user.id === selectedManagerId)
      if (buildingManager) {
        const initialAssignments: {[key: string]: any[]} = {}
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

  // Afficher la vérification d'équipe si nécessaire (APRÈS tous les hooks)
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }


  const addLot = () => {
    const newLot: Lot = {
      id: `lot${lots.length + 1}`,
      reference: `Lot${String(lots.length + 1).padStart(3, "0")}`,
      floor: "0",
      doorNumber: "",
      surface: "",
      monthlyRent: "",
      deposit: "",
      description: "",
    }
    setLots([...lots, newLot])
  }

  const updateLot = (id: string, field: keyof Lot, value: string) => {
    setLots(lots.map((lot) => (lot.id === id ? { ...lot, [field]: value } : lot)))
  }

  const removeLot = (id: string) => {
    setLots(lots.filter((lot) => lot.id !== id))
  }

  const duplicateLot = (id: string) => {
    const lotToDuplicate = lots.find((lot) => lot.id === id)
    if (lotToDuplicate) {
      const newLot: Lot = {
        ...lotToDuplicate,
        id: `lot${Date.now()}`,
        reference: `Lot${String(lots.length + 1).padStart(3, "0")}`,
      }
      setLots([...lots, newLot])
    }
  }

  const openGlobalContactModal = async (type: string) => {
    setSelectedContactType(type)
    setSelectedLotForContact("") // Pas de lot spécifique
    setSearchTerm("")
    setIsContactModalOpen(true)
    
    // Charger les contacts existants du type correspondant
    if (userTeam?.id) {
      setIsLoadingContacts(true)
      try {
        console.log(`📞 Loading existing contacts for type: ${type}`)
        const teamContacts = await contactService.getTeamContacts(userTeam.id)
        console.log("✅ Team contacts loaded:", teamContacts)
        
        // Filtrer selon le type de contact demandé (même logique que openContactModal)
        let filteredContacts = teamContacts
        if (type === 'provider') {
          // Pour les prestataires, on affiche tous ceux qui ont une spécialité
          filteredContacts = teamContacts.filter(contact => contact.speciality)
        } else if (type === 'tenant') {
          // Pour les locataires, on affiche ceux avec contact_type "locataire"
          filteredContacts = teamContacts.filter(contact => 
            contact.contact_type === 'locataire' || (!contact.speciality || contact.speciality === 'autre')
          )
        } else if (type === 'syndic') {
          // Pour les syndics, on affiche ceux avec contact_type "syndic"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'syndic')
        } else if (type === 'notary') {
          // Pour les notaires, on affiche ceux avec contact_type "notaire"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'notaire')
        } else if (type === 'insurance') {
          // Pour les assurances, on affiche ceux avec contact_type "assurance"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'assurance')
        } else if (type === 'other') {
          // Pour les autres, on affiche ceux avec contact_type "autre"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'autre')
        }
        
        console.log(`📋 Filtered ${type} contacts:`, filteredContacts)
        setExistingContacts(filteredContacts)
      } catch (error) {
        console.error("❌ Error loading team contacts:", error)
        setExistingContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    }
  }

  const addContact = (contactData: any) => {
    // Utiliser la nouvelle fonction pour gérer les assignations par lot
    addExistingContactToLot(contactData)
  }

  const removeContact = (id: string) => {
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
  const getAllLotContacts = (lotId: string): Contact[] => {
    const lotAssignments = lotContactAssignments[lotId] || {}
    return Object.values(lotAssignments).flat()
  }

  const getContactsByType = (type: string) => {
    return contacts.filter((contact) => contact.type === type)
  }

  const getTotalStats = () => {
    const totalSurface = lots.reduce((sum, lot) => sum + (Number.parseFloat(lot.surface) || 0), 0)
    const totalRent = lots.reduce((sum, lot) => sum + (Number.parseFloat(lot.monthlyRent) || 0), 0)
    const avgRent = lots.length > 0 ? totalRent / lots.length : 0

    return { totalSurface, totalRent, avgRent }
  }

  // Filtrer les contacts selon le terme de recherche
  const getFilteredContacts = () => {
    if (!searchTerm.trim()) return existingContacts
    
    return existingContacts.filter(contact => 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.phone && contact.phone.includes(searchTerm))
    )
  }

  // Obtenir les informations du type de contact sélectionné
  const getSelectedContactTypeInfo = () => {
    return contactTypes.find(type => type.key === selectedContactType) || contactTypes[0]
  }

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
    console.log("🚀 handleFinish called")
    console.log("📊 Current state:", {
      user: user?.id ? `User ID: ${user.id}` : "No user",
      buildingInfo,
      lots: `${lots.length} lots`,
      contacts: `${contacts.length} contacts`,
      selectedManagerId
    })

    if (!user?.id) {
      console.error("❌ No user ID found")
      setError("Vous devez être connecté pour créer un bâtiment")
      return
    }

    if (!buildingInfo.address.trim()) {
      console.error("❌ No address provided")
      setError("L'adresse du bâtiment est requise")
      return
    }

    if (lots.length === 0) {
      console.error("❌ No lots provided")
      setError("Au moins un lot est requis")
      return
    }

    if (!selectedManagerId) {
      console.error("❌ No manager selected")
      setError("Veuillez sélectionner un responsable")
      return
    }

    if (!userTeam?.id) {
      console.error("❌ No user team found")
      setError("Impossible de déterminer votre équipe")
      return
    }

    console.log("✅ All validations passed, starting creation...")

    try {
      setIsCreating(true)
      setError("")
      console.log("🔄 Set isCreating to true")

      // Préparer les données du bâtiment
      const buildingData = {
        name: buildingInfo.name.trim() || `Bâtiment ${buildingInfo.address}`,
        address: buildingInfo.address.trim(),
        city: buildingInfo.city.trim() || "Non spécifié",
        country: buildingInfo.country.trim() || "Belgique",
        postal_code: buildingInfo.postalCode.trim() || "",
        description: buildingInfo.description.trim(),
        construction_year: buildingInfo.constructionYear ? parseInt(buildingInfo.constructionYear) : undefined,
        manager_id: selectedManagerId,
        team_id: userTeam!.id,
      }
      console.log("🏢 Building data prepared:", buildingData)
      console.log("🎯 Team assignment verified:", { userId: user?.id, teamId: userTeam!.id, teamName: userTeam!.name })

      // Préparer les données des lots
      const lotsData = lots.map((lot) => ({
        reference: lot.reference.trim(),
        floor: lot.floor ? parseInt(lot.floor) : 0,
        apartment_number: lot.doorNumber.trim() || undefined,
        surface_area: lot.surface ? parseFloat(lot.surface) : undefined,
        rooms: undefined, // Peut être ajouté plus tard
        rent_amount: lot.monthlyRent ? parseFloat(lot.monthlyRent) : undefined,
        charges_amount: lot.deposit ? parseFloat(lot.deposit) : undefined,
      }))
      console.log("🏠 Lots data prepared:", lotsData)

      // Préparer les données des contacts si ils existent
      const contactsData = contacts.map((contact) => ({
        name: contact.name,
        email: contact.email,
        speciality: contact.type === 'provider' ? 'autre' : undefined,
        team_id: userTeam!.id,
      }))
      console.log("👥 Contacts data prepared:", contactsData)
      console.log("🔗 All contacts will be linked to team:", userTeam!.id)

      // Préparer les assignations de contacts aux lots
      const lotContactAssignmentsData = Object.entries(lotContactAssignments).map(([lotId, assignments]) => {
        // Trouver l'index du lot dans le tableau lotsData basé sur l'ID
        const lotIndex = lots.findIndex(lot => lot.id === lotId)
        return {
          lotId: lotId,
          lotIndex: lotIndex, // Index du lot dans le tableau lotsData
          assignments: Object.entries(assignments).flatMap(([contactType, contacts]) =>
            contacts.map(contact => ({
              contactId: contact.id,
              contactType: contactType,
              isPrimary: false // Peut être étendu plus tard
            }))
          )
        }
      }).filter(item => item.lotIndex !== -1) // Filtrer les lots qui n'existent plus
      console.log("🔗 Lot-contact assignments prepared:", lotContactAssignmentsData)

      console.log("📡 Calling compositeService.createCompleteProperty...")

      // Créer le bâtiment complet avec lots et contacts
      const result = await compositeService.createCompleteProperty({
        building: buildingData,
        lots: lotsData,
        contacts: contactsData,
        lotContactAssignments: lotContactAssignmentsData,
      })

      console.log("✅ Building created successfully:", result)
      console.log("🔄 Redirecting to dashboard...")

      // Rediriger vers le dashboard avec un message de succès
      router.push("/gestionnaire/dashboard?success=building-created")
    } catch (err) {
      console.error("❌ Error creating building:", err)
      console.error("📋 Error details:", {
        message: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
        full: err
      })
      setError(
        err instanceof Error 
          ? `Erreur lors de la création : ${err.message}`
          : "Une erreur est survenue lors de la création du bâtiment"
      )
    } finally {
      console.log("🔄 Setting isCreating to false")
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

  const openContactFormModal = (type: string) => {
    console.log("📝 Opening contact form modal:", {
      type,
      currentSelectedLot: selectedLotForContact,
      currentSelectedType: selectedContactType
    })
    
    setPrefilledContactType(type)
    setIsContactFormModalOpen(true)
    setIsContactModalOpen(false) // Close the selection modal
    
    // ✅ CORRECTION: Préserver les informations du lot et type sélectionnés
    // Ne pas réinitialiser selectedLotForContact et selectedContactType
    // Ils restent définis depuis openContactModal()
    
    console.log("✅ Contact form modal opened with context preserved:", {
      lotId: selectedLotForContact,
      contactType: selectedContactType,
      prefilledType: type
    })
  }

  // Fonction pour nettoyer le contexte de sélection (appelée en cas d'annulation)
  const cleanContactContext = () => {
    console.log("🧹 Cleaning contact context (user cancelled)")
    setSelectedLotForContact("")
    setSelectedContactType("")
    setPrefilledContactType("")
  }

  // Fonction pour ouvrir le modal de contact pour un lot spécifique
  const openContactModal = async (lotId: string, contactType: string) => {
    console.log("📞 Opening contact modal for specific lot:", { lotId, contactType })
    
    setSelectedLotForContact(lotId)
    setSelectedContactType(contactType)
    setSearchTerm("")
    setIsContactModalOpen(true)
    
    // ✅ CORRECTION: Charger les contacts existants du type correspondant (comme dans openGlobalContactModal)
    if (userTeam?.id) {
      setIsLoadingContacts(true)
      try {
        console.log(`📞 Loading existing contacts for type: ${contactType}`)
        const teamContacts = await contactService.getTeamContacts(userTeam.id)
        console.log("✅ Team contacts loaded:", teamContacts)
        
        // Filtrer selon le type de contact demandé
        let filteredContacts = teamContacts
        if (contactType === 'provider') {
          // Pour les prestataires, on affiche tous ceux qui ont une spécialité
          filteredContacts = teamContacts.filter(contact => contact.speciality)
        } else if (contactType === 'tenant') {
          // Pour les locataires, on affiche ceux avec contact_type "locataire"
          filteredContacts = teamContacts.filter(contact => 
            contact.contact_type === 'locataire' || (!contact.speciality || contact.speciality === 'autre')
          )
        } else if (contactType === 'syndic') {
          // Pour les syndics, on affiche ceux avec contact_type "syndic"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'syndic')
        } else if (contactType === 'notary') {
          // Pour les notaires, on affiche ceux avec contact_type "notaire"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'notaire')
        } else if (contactType === 'insurance') {
          // Pour les assurances, on affiche ceux avec contact_type "assurance"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'assurance')
        } else if (contactType === 'other') {
          // Pour les autres, on affiche ceux avec contact_type "autre"
          filteredContacts = teamContacts.filter(contact => contact.contact_type === 'autre')
        }
        
        console.log(`📋 Filtered ${contactType} contacts:`, filteredContacts)
        setExistingContacts(filteredContacts)
      } catch (error) {
        console.error("❌ Error loading team contacts:", error)
        setExistingContacts([])
      } finally {
        setIsLoadingContacts(false)
      }
    }
  }

  // Fonction pour ajouter un contact existant à un lot
  const addExistingContactToLot = (contact: any) => {
    const newContact: Contact = {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      type: selectedContactType as any,
    }
    
    // Ajouter le contact à la liste globale s'il n'y est pas déjà
    if (!contacts.some(c => c.id === contact.id)) {
      setContacts([...contacts, newContact])
    }

    // Assigner le contact au lot spécifique si un lot est sélectionné
    if (selectedLotForContact) {
      assignContactToLot(selectedLotForContact, selectedContactType, newContact)
    }
    
    setIsContactModalOpen(false)
    setSearchTerm("")
  }

  const handleContactCreated = async (contactData: any) => {
    try {
      console.log("🆕 Création d'un nouveau contact:", contactData)
      
      if (!userTeam?.id) {
        console.error("❌ No team found for user")
        return
      }

      // Utiliser le service d'invitation pour créer le contact et optionnellement l'utilisateur
      const result = await contactInvitationService.createContactWithOptionalInvite({
        type: contactData.type,
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

      console.log("✅ Contact créé avec succès:", result.contact)
      
      // Ajouter le contact créé à la liste locale
      const newContact: Contact = {
        id: result.contact.id,
        name: result.contact.name,
        email: result.contact.email,
        type: result.contact.contact_type as any,
      }
      
      setContacts([...contacts, newContact])
      
      // AUSSI ajouter le contact à la liste des contacts existants pour qu'il apparaisse dans les modals
      console.log("🔄 Adding contact to existing contacts list for immediate display")
      setExistingContacts(prevExisting => [...prevExisting, result.contact])
      
      // Assigner le contact au lot spécifique si un lot est sélectionné
      if (selectedLotForContact && result.contact.contact_type) {
        console.log("🎯 Auto-assigning contact to lot:", {
          lotId: selectedLotForContact,
          contactType: result.contact.contact_type,
          selectedContactType: selectedContactType,
          contactName: newContact.name
        })
        
        // CORRECTION: Utiliser selectedContactType (frontend format) pour la consistance avec les contacts existants
        // au lieu de result.contact.contact_type (database format)
        assignContactToLot(selectedLotForContact, selectedContactType, newContact)
        console.log("✅ Contact auto-assigned to lot successfully")
      } else {
        console.log("ℹ️ No auto-assignment:", { 
          hasLot: !!selectedLotForContact,
          hasContactType: !!result.contact.contact_type,
          selectedLotForContact,
          contactType: result.contact.contact_type
        })
      }
      
      setIsContactFormModalOpen(false)
      
      // Nettoyer le contexte après assignation réussie
      setSelectedLotForContact("")
      setSelectedContactType("")
      setPrefilledContactType("")
      console.log("🧹 Context cleaned after successful contact creation and assignment")
      
      // Afficher un message si une invitation a été envoyée
      if (result.invitation?.success) {
        console.log("📧 Invitation envoyée avec succès à:", contactData.email)
      } else if (result.invitation?.error) {
        console.warn("⚠️ Contact créé mais invitation échouée:", result.invitation.error)
      }
      
    } catch (error) {
      console.error("❌ Erreur lors de la création du contact:", error)
      // Vous pourriez vouloir afficher une notification d'erreur à l'utilisateur ici
    }
  }

  const handleGestionnaireCreated = async (contactData: any) => {
    try {
      console.log("🆕 Création d'un nouveau gestionnaire:", contactData)
      
      if (!userTeam?.id) {
        console.error("❌ No team found for user")
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

      console.log("✅ Gestionnaire créé avec succès:", result.contact)
      
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
      
      // Afficher un message si une invitation a été envoyée
      if (result.invitation?.success) {
        console.log("📧 Invitation gestionnaire envoyée avec succès à:", contactData.email)
      } else if (result.invitation?.error) {
        console.warn("⚠️ Gestionnaire créé mais invitation échouée:", result.invitation.error)
      }
      
    } catch (error) {
      console.error("❌ Erreur lors de la création du gestionnaire:", error)
      // Vous pourriez vouloir afficher une notification d'erreur à l'utilisateur ici
    }
  }

  const openGestionnaireModal = () => {
    setIsGestionnaireModalOpen(true)
  }

  // Fonctions pour la gestion des gestionnaires assignés aux lots
  const openManagerModal = (lotId: string) => {
    setSelectedLotForManager(lotId)
    setIsManagerModalOpen(true)
  }

  const addManagerToLot = (lotId: string, manager: any) => {
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

  const getAssignedManagers = (lotId: string) => {
    return assignedManagers[lotId] || []
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <StepProgressHeader
          title="Ajouter un nouveau bâtiment"
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Informations du bâtiment
                  </CardTitle>
                  <CardDescription>Commençons par les informations de base de votre bâtiment</CardDescription>
                </div>
                <Badge variant="secondary">Progression: {getProgressPercentage()}%</Badge>
              </div>
            </CardHeader>
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
              />

              <div className="flex justify-end">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToNextStep()}
                  className="bg-blue-600 hover:bg-blue-700"
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
              <CardHeader>
                <CardTitle>Configuration des lots</CardTitle>
                <CardDescription>Ajoutez et configurez les lots de votre bâtiment</CardDescription>
              </CardHeader>
              <CardContent>
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
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{lots.length}</div>
                        <div className="text-sm text-gray-600">Lot</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{getTotalStats().totalRent}€</div>
                        <div className="text-sm text-gray-600">Loyers/mois</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{getTotalStats().totalSurface}m²</div>
                        <div className="text-sm text-gray-600">Surface totale</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{Math.round(getTotalStats().avgRent)}€</div>
                        <div className="text-sm text-gray-600">Loyer moyen</div>
                      </div>
                    </div>

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
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </div>
                                <div>
                                  <h3 className="font-medium">{lot.reference}</h3>
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
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
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

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Surface (m²)</Label>
                                <Input
                                  placeholder="45"
                                  value={lot.surface}
                                  onChange={(e) => updateLot(lot.id, "surface", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Loyer mensuel (€)</Label>
                                <Input
                                  placeholder="1200"
                                  value={lot.monthlyRent}
                                  onChange={(e) => updateLot(lot.id, "monthlyRent", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Dépôt de garantie (€)</Label>
                                <Input
                                  placeholder="1200"
                                  value={lot.deposit}
                                  onChange={(e) => updateLot(lot.id, "deposit", e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            </div>

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
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-6">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    Retour au bâtiment
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(3)}
                    disabled={!canProceedToNextStep()}
                    className="bg-sky-600 hover:bg-sky-700"
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
            <CardHeader>
              <CardTitle>Assignation des contacts et gestionnaires</CardTitle>
              <CardDescription>Assignez des contacts et gestionnaires à vos lots (optionnel)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
                  <div className="text-sm text-gray-600">contacts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Object.values(assignedManagers).reduce((total, managers) => total + managers.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">gestionnaires</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{lots.length}</div>
                  <div className="text-sm text-gray-600">lots</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {lots.filter(lot => getAssignedManagers(lot.id).length > 0).length}
                  </div>
                  <div className="text-sm text-gray-600">avec gestionnaire</div>
                </div>
              </div>

              {/* Lots with contacts and managers */}
              <div className="space-y-6">
                {lots.map((lot) => {
                  const lotManagers = getAssignedManagers(lot.id)
                  const lotContacts = getAllLotContacts(lot.id) // Utiliser les vraies assignations
                  
                  return (
                    <Card key={lot.id} className="border-gray-200">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{lot.reference}</h3>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {lotManagers.length} gestionnaire(s)
                            </Badge>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              {lotContacts.length} contact(s)
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Section Gestionnaires */}
                          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-5 h-5 text-blue-600" />
                              <span className="font-medium text-blue-900">Gestionnaires assignés</span>
                            </div>
                            
                            <div className="space-y-2">
                              {lotManagers.map((manager) => (
                                <div
                                  key={manager.user.id}
                                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">{manager.user.name}</div>
                                      <div className="text-xs text-gray-500">{manager.user.email}</div>
                                      {manager.user.id === selectedManagerId && (
                                        <Badge variant="outline" className="text-xs mt-1">Responsable du bâtiment</Badge>
                                      )}
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
                                className="w-full text-sm border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter un gestionnaire
                              </Button>
                            </div>
                          </div>

                          {/* Section Contacts */}
                          <div className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <User className="w-5 h-5 text-gray-600" />
                              <span className="font-medium text-gray-900">Contacts assignés</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              {contactTypes.map((type) => {
                                const Icon = type.icon
                                const assignedContacts = getLotContactsByType(lot.id, type.key)

                                return (
                                  <div key={type.key} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Icon className={`w-4 h-4 ${type.color}`} />
                                      <span className="font-medium text-sm">{type.label}</span>
                                    </div>

                                    <div className="space-y-2">
                                      {assignedContacts.map((contact) => (
                                        <div
                                          key={contact.id}
                                          className="flex items-center justify-between p-2 bg-green-50 rounded-lg"
                                        >
                                          <span className="text-sm">{contact.name || contact.email}</span>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeContactFromLot(lot.id, type.key, contact.id)}
                                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openContactModal(lot.id, type.key)}
                                        className="w-full text-xs"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Ajouter {type.label.toLowerCase()}
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(2)}
                  disabled={isCreating}
                >
                  Étape précédente
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push("/gestionnaire/dashboard")}
                    disabled={isCreating}
                  >
                    Passer cette étape
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(4)}
                    className="bg-sky-600 hover:bg-sky-700"
                  >
                    Créer le bâtiment
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirmer la création du bâtiment</h2>
                <p className="text-slate-600">Vérifiez toutes les informations avant de créer le bâtiment</p>
              </div>

              <div className="space-y-6 mb-8">
                {/* Building Information */}
                <Card className="border-l-4 border-l-sky-500">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                        <Building className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Informations du bâtiment</h3>
                        <p className="text-sm text-slate-600">Détails généraux du bâtiment</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm font-medium text-slate-700">Nom :</span>
                          <p className="text-slate-900">{buildingInfo.name || "Non spécifié"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-700">Année de construction :</span>
                          <p className="text-slate-900">{buildingInfo.constructionYear || "Non spécifiée"}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">Adresse :</span>
                        <p className="text-slate-900">{buildingInfo.address}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm font-medium text-slate-700">Code postal :</span>
                          <p className="text-slate-900">{buildingInfo.postalCode || "Non spécifié"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-700">Ville :</span>
                          <p className="text-slate-900">{buildingInfo.city || "Non spécifiée"}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-700">Pays :</span>
                          <p className="text-slate-900">{buildingInfo.country}</p>
                        </div>
                      </div>
                      {buildingInfo.description && (
                        <div>
                          <span className="text-sm font-medium text-slate-700">Description :</span>
                          <p className="text-slate-900 text-sm mt-1">{buildingInfo.description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Lots Summary */}
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">Lots configurés ({lots.length})</h3>
                        <p className="text-sm text-slate-600">Configuration des lots du bâtiment</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      {/* Stats globales */}
                      <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-white rounded-lg border">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{lots.length}</div>
                          <div className="text-sm text-slate-600">Lots</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-sky-600">{getTotalStats().totalRent}€</div>
                          <div className="text-sm text-slate-600">Loyers/mois</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{getTotalStats().totalSurface}m²</div>
                          <div className="text-sm text-slate-600">Surface totale</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-600">{Math.round(getTotalStats().avgRent)}€</div>
                          <div className="text-sm text-slate-600">Loyer moyen</div>
                        </div>
                      </div>
                      
                      {/* Liste des lots */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {lots.map((lot, index) => (
                          <div key={lot.id} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">
                                {index + 1}
                              </div>
                              <div>
                                <span className="font-medium text-slate-900">{lot.reference}</span>
                                {lot.doorNumber && <span className="text-slate-500 ml-2">({lot.doorNumber})</span>}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-slate-600">
                              <span>Étage {lot.floor}</span>
                              {lot.surface && <span>{lot.surface}m²</span>}
                              {lot.monthlyRent && <span>{lot.monthlyRent}€/mois</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gestionnaire responsable */}
                {selectedManagerId && (
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Gestionnaire responsable</h3>
                          <p className="text-sm text-slate-600">Responsable principal du bâtiment</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        {(() => {
                          const manager = teamManagers.find(m => m.user.id === selectedManagerId)
                          return manager ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{manager.user.name}</div>
                                <div className="text-sm text-slate-600">{manager.user.email}</div>
                                {manager.user.id === user?.id && (
                                  <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mt-1">
                                    Vous
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-500">Gestionnaire non trouvé</p>
                          )
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Contacts assignés */}
                {(contacts.length > 0 || Object.values(assignedManagers).some(managers => managers.length > 0)) && (
                  <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Contacts et assignations</h3>
                          <p className="text-sm text-slate-600">Contacts assignés aux lots</p>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-white rounded border">
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{contacts.length}</div>
                            <div className="text-xs text-slate-600">Contacts créés</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {Object.values(assignedManagers).reduce((total, managers) => total + managers.length, 0)}
                            </div>
                            <div className="text-xs text-slate-600">Gestionnaires assignés</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {lots.filter(lot => getAssignedManagers(lot.id).length > 0 || getAllLotContacts(lot.id).length > 0).length}
                            </div>
                            <div className="text-xs text-slate-600">Lots avec contacts</div>
                          </div>
                        </div>
                        
                        {contacts.length === 0 && Object.values(assignedManagers).every(managers => managers.length === 0) && (
                          <p className="text-center text-slate-500 text-sm">Aucun contact supplémentaire assigné</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
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

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(3)}
                  disabled={isCreating}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  onClick={() => {
                    console.log("🖱️ Confirm creation button clicked!")
                    handleFinish()
                  }} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmer la création
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Selection Modal */}
        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedContactType === 'tenant' && <User className="w-5 h-5" />}
                {selectedContactType === 'provider' && <Briefcase className="w-5 h-5" />}
                {selectedContactType === 'syndic' && <Shield className="w-5 h-5" />}
                {selectedContactType === 'notary' && <FileCheck className="w-5 h-5" />}
                {selectedContactType === 'insurance' && <Car className="w-5 h-5" />}
                {selectedContactType === 'other' && <MoreHorizontal className="w-5 h-5" />}
                Sélectionner un {getSelectedContactTypeInfo().label.toLowerCase()}
              </DialogTitle>
              <DialogDescription>
                {selectedContactType === 'tenant' && 'Personne qui occupe le logement'}
                {selectedContactType === 'provider' && 'Prestataire pour les interventions'}
                {selectedContactType === 'syndic' && 'Syndic de copropriété'}
                {selectedContactType === 'notary' && 'Notaire pour les actes'}
                {selectedContactType === 'insurance' && 'Compagnie d\'assurance'}
                {selectedContactType === 'other' && 'Autre type de contact'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder={`Rechercher un ${getSelectedContactTypeInfo().label.toLowerCase()} par nom, email, téléphone...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Loading state */}
              {isLoadingContacts && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Chargement des contacts...</span>
                </div>
              )}

              {/* Contacts list */}
              {!isLoadingContacts && (
                <div className="max-h-64 overflow-y-auto">
                  {getFilteredContacts().length > 0 ? (
                    <div className="space-y-2">
                      {getFilteredContacts().map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-sm text-gray-500">{contact.email}</div>
                            {contact.phone && (
                              <div className="text-xs text-gray-400">{contact.phone}</div>
                            )}
                            {contact.speciality && (
                              <div className="text-xs text-green-600 capitalize mt-1">
                                {contact.speciality}
                              </div>
                            )}
                          </div>
                          <Button 
                            onClick={() => addContact(contact)} 
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            size="sm"
                          >
                            Sélectionner
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {selectedContactType === 'tenant' && <User className="w-8 h-8 text-blue-600" />}
                        {selectedContactType === 'provider' && <Briefcase className="w-8 h-8 text-green-600" />}
                        {selectedContactType === 'syndic' && <Shield className="w-8 h-8 text-purple-600" />}
                        {selectedContactType === 'notary' && <FileCheck className="w-8 h-8 text-orange-600" />}
                        {selectedContactType === 'insurance' && <Car className="w-8 h-8 text-red-600" />}
                        {selectedContactType === 'other' && <MoreHorizontal className="w-8 h-8 text-gray-600" />}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">
                        {searchTerm ? 'Aucun contact trouvé' : `Aucun ${getSelectedContactTypeInfo().label.toLowerCase()} enregistré`}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {searchTerm 
                          ? `Aucun contact ne correspond à "${searchTerm}"`
                          : `Vous n'avez pas encore de ${getSelectedContactTypeInfo().label.toLowerCase()} dans votre équipe`
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  onClick={() => openContactFormModal(selectedContactType)}
                >
                  <Plus className="w-4 h-4" />
                  Créer un nouveau {getSelectedContactTypeInfo().label.toLowerCase()}
                </Button>
                <Button variant="ghost" onClick={() => {
                  setIsContactModalOpen(false)
                  cleanContactContext() // Nettoyer le contexte en cas d'annulation
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Contact Form Modal */}
        <ContactFormModal
          isOpen={isContactFormModalOpen}
          onClose={() => {
            setIsContactFormModalOpen(false)
            cleanContactContext() // Nettoyer le contexte en cas d'annulation
          }}
          onSubmit={handleContactCreated}
          defaultType={prefilledContactType}
        />

        {/* Gestionnaire Creation Modal */}
        <ContactFormModal
          isOpen={isGestionnaireModalOpen}
          onClose={() => setIsGestionnaireModalOpen(false)}
          onSubmit={handleGestionnaireCreated}
          defaultType="gestionnaire"
        />

        {/* Manager Assignment Modal */}
        <Dialog open={isManagerModalOpen} onOpenChange={setIsManagerModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Assigner un gestionnaire au lot {selectedLotForManager && lots.find(l => l.id === selectedLotForManager)?.reference}
              </DialogTitle>
              <DialogDescription>
                Sélectionnez un gestionnaire de votre équipe pour ce lot
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {!isLoading && teamManagers.length > 0 ? (
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
                              ? 'bg-gray-100 border-gray-300 opacity-60' 
                              : 'hover:bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">{manager.user.name}</div>
                              <div className="text-sm text-gray-500">{manager.user.email}</div>
                              <div className="flex gap-1 mt-1">
                                {manager.user.id === user?.id && (
                                  <Badge variant="outline" className="text-xs">Vous</Badge>
                                )}
                                {manager.user.id === selectedManagerId && (
                                  <Badge variant="secondary" className="text-xs">Responsable du bâtiment</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            onClick={() => selectedLotForManager && addManagerToLot(selectedLotForManager, manager)} 
                            disabled={isAlreadyAssigned}
                            className={`${
                              isAlreadyAssigned 
                                ? 'bg-gray-300 text-gray-500' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
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

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  onClick={openGestionnaireModal}
                >
                  <Plus className="w-4 h-4" />
                  Créer un nouveau gestionnaire
                </Button>
                <Button variant="ghost" onClick={() => setIsManagerModalOpen(false)}>
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
