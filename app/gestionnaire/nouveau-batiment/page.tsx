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
} from "lucide-react"
import { useRouter } from "next/navigation"
import ContactFormModal from "@/components/contact-form-modal"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { compositeService, teamService, contactService, type Team } from "@/lib/database-service"
import { TeamCheckModal } from "@/components/team-check-modal"

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
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

export default function NewBuildingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()

  // Afficher la vérification d'équipe si nécessaire
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }
  
  const [currentStep, setCurrentStep] = useState(1)
  const [buildingInfo, setBuildingInfo] = useState<BuildingInfo>({
    name: "",
    address: "",
    postalCode: "",
    city: "",
    constructionYear: "",
    floors: "",
    description: "",
  })
  const [lots, setLots] = useState<Lot[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [assignedManagers, setAssignedManagers] = useState<{[key: string]: any[]}>({}) // gestionnaires assignés par lot
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
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

  const steps = [
    { number: 1, title: "Bâtiment", subtitle: "Informations générales", completed: currentStep > 1 },
    { number: 2, title: "Lots", subtitle: "Configuration des lots", completed: currentStep > 2 },
    { number: 3, title: "Contacts", subtitle: "Assignation optionnelle", completed: false },
  ]

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

  const openContactModal = async (type: string) => {
    setSelectedContactType(type)
    setSearchTerm("")
    setIsContactModalOpen(true)
    
    // Charger les contacts existants du type correspondant
    if (userTeam?.id) {
      setIsLoadingContacts(true)
      try {
        console.log(`📞 Loading existing contacts for type: ${type}`)
        const teamContacts = await contactService.getTeamContacts(userTeam.id)
        console.log("✅ Team contacts loaded:", teamContacts)
        
        // Filtrer selon le type si c'est un prestataire (utilise la speciality)
        let filteredContacts = teamContacts
        if (type === 'provider') {
          // Pour les prestataires, on affiche tous ceux qui ont une spécialité
          filteredContacts = teamContacts.filter(contact => contact.speciality)
        } else if (type === 'tenant') {
          // Pour les locataires, on affiche ceux sans spécialité ou avec spécialité "autre"
          filteredContacts = teamContacts.filter(contact => 
            !contact.speciality || contact.speciality === 'autre'
          )
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
    const newContact: Contact = {
      id: Date.now().toString(),
      name: contactData.name,
      email: contactData.email,
      type: selectedContactType as any,
    }
    setContacts([...contacts, newContact])
    setIsContactModalOpen(false)
    setSearchTerm("")
  }

  const removeContact = (id: string) => {
    setContacts(contacts.filter((contact) => contact.id !== id))
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

      console.log("📡 Calling compositeService.createCompleteProperty...")

      // Créer le bâtiment complet avec lots et contacts
      const result = await compositeService.createCompleteProperty({
        building: buildingData,
        lots: lotsData,
        contacts: contactsData,
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
    setPrefilledContactType(type)
    setIsContactFormModalOpen(true)
    setIsContactModalOpen(false) // Close the selection modal
  }

  const handleContactCreated = (contactData: any) => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name: `${contactData.firstName} ${contactData.lastName}`,
      email: contactData.email,
      type: contactData.type as any,
    }
    setContacts([...contacts, newContact])
    setIsContactFormModalOpen(false)
  }

  const handleGestionnaireCreated = async (contactData: any) => {
    console.log("🆕 Nouveau gestionnaire créé:", contactData)
    
    // Ajouter le nouveau gestionnaire à la liste des managers disponibles
    const newManager = {
      user: {
        id: `temp_${Date.now()}`, // ID temporaire
        name: `${contactData.firstName} ${contactData.lastName}`,
        email: contactData.email,
        role: 'gestionnaire'
      },
      role: 'member'
    }
    
    setTeamManagers([...teamManagers, newManager])
    setSelectedManagerId(newManager.user.id)
    setIsGestionnaireModalOpen(false)
    
    // Log de l'invitation si cochée
    if (contactData.inviteToApp) {
      console.log("📧 Une invitation sera envoyée à:", contactData.email)
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Créer un bâtiment avec plusieurs lots</h1>
          
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

          {/* Steps */}
          <div className="flex items-center space-x-8 mt-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.completed
                        ? "bg-green-500 text-white"
                        : currentStep === step.number
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step.completed ? <Check className="w-5 h-5" /> : step.number}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-sm font-medium text-gray-900">{step.title}</div>
                    <div className="text-xs text-gray-500">{step.subtitle}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${step.completed ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

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
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Building className="w-4 h-4" />
                  Nom du bâtiment <span className="text-gray-400">(optionnel)</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Résidence des Champs-Élysées"
                  value={buildingInfo.name}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, name: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Donnez un nom distinctif à votre bâtiment pour l'identifier facilement
                </p>
              </div>

              {/* Manager Selection */}
              <div>
                <Label htmlFor="manager" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="w-4 h-4" />
                  Responsable du bâtiment
                </Label>
                
                {!isLoading && teamManagers.length > 0 && userTeam ? (
                  <>
                    <Select value={selectedManagerId} onValueChange={(value) => {
                      if (value === "create-new") {
                        openGestionnaireModal()
                      } else {
                        setSelectedManagerId(value)
                      }
                    }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Sélectionnez un responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamManagers.map((member: any) => (
                          <SelectItem key={member.user.id} value={member.user.id}>
                            <div className="flex items-center gap-2">
                              <span>{member.user.name}</span>
                              {member.user.id === user?.id && (
                                <Badge variant="secondary" className="text-xs">Vous</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new" className="border-t mt-1 pt-2">
                          <div className="flex items-center gap-2 text-blue-600">
                            <Users className="w-4 h-4" />
                            <span>Créer un nouveau gestionnaire</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Ce gestionnaire sera responsable du bâtiment • Équipe : <strong>{userTeam.name}</strong>
                    </p>
                  </>
                ) : (
                  <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {isLoading 
                        ? 'Chargement des gestionnaires de votre équipe...'
                        : teamManagers.length === 0 
                          ? 'Aucun gestionnaire trouvé dans votre équipe'
                          : 'Impossible de charger les gestionnaires'
                      }
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {isLoading
                        ? 'Veuillez patienter...'
                        : teamManagers.length === 0 
                          ? 'Contactez l\'administrateur pour ajouter des gestionnaires à votre équipe.'
                          : 'Contactez l\'administrateur pour résoudre ce problème.'
                      }
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MapPin className="w-4 h-4" />
                  Adresse complète*
                </Label>
                <Input
                  id="address"
                  placeholder="123 Rue de la Paix"
                  value={buildingInfo.address}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="postalCode" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Hash className="w-4 h-4" />
                    Code postal
                  </Label>
                  <Input
                    id="postalCode"
                    placeholder="75001"
                    value={buildingInfo.postalCode}
                    onChange={(e) => setBuildingInfo({ ...buildingInfo, postalCode: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MapPin className="w-4 h-4" />
                    Ville
                  </Label>
                  <Input
                    id="city"
                    placeholder="Paris"
                    value={buildingInfo.city}
                    onChange={(e) => setBuildingInfo({ ...buildingInfo, city: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="constructionYear"
                    className="flex items-center gap-2 text-sm font-medium text-gray-700"
                  >
                    <Calendar className="w-4 h-4" />
                    Année de construction
                  </Label>
                  <Input
                    id="constructionYear"
                    placeholder="2010"
                    value={buildingInfo.constructionYear}
                    onChange={(e) => setBuildingInfo({ ...buildingInfo, constructionYear: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="floors" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Building className="w-4 h-4" />
                    Nombre d'étages
                  </Label>
                  <Input
                    id="floors"
                    placeholder="4"
                    value={buildingInfo.floors}
                    onChange={(e) => setBuildingInfo({ ...buildingInfo, floors: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4" />
                  Description <span className="text-gray-400">(optionnel)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Ajoutez des informations supplémentaires sur votre bâtiment..."
                  value={buildingInfo.description}
                  onChange={(e) => setBuildingInfo({ ...buildingInfo, description: e.target.value })}
                  className="mt-1 min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Décrivez votre bâtiment : commodités, particularités, état général...
                </p>
              </div>

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
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    Créer le bâtiment et continuer
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
                  const lotContacts = getContactsByType("tenant") // Simplification pour maintenant
                  
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
                                const assignedContacts = getContactsByType(type.key)

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
                                            onClick={() => removeContact(contact.id)}
                                            className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      ))}

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openContactModal(type.key)}
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
                    onClick={() => {
                      console.log("🖱️ Create button clicked!")
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
                      "Créer le bâtiment"
                    )}
                  </Button>
                </div>
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
                <Button variant="ghost" onClick={() => setIsContactModalOpen(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Contact Form Modal */}
        <ContactFormModal
          isOpen={isContactFormModalOpen}
          onClose={() => setIsContactFormModalOpen(false)}
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
                      const isAlreadyAssigned = selectedLotForManager && 
                        getAssignedManagers(selectedLotForManager).some(m => m.user.id === manager.user.id)
                      
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
