"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Home, Users, ArrowLeft, ArrowRight, Check, Plus, X, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import ContactFormModal from "@/components/contact-form-modal"
import { BuildingInfoForm } from "@/components/building-info-form"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { teamService, type Team } from "@/lib/database-service"
import { TeamCheckModal } from "@/components/team-check-modal"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { lotSteps } from "@/lib/step-configurations"

const countries = [
  "Belgique",
  "France",
  "Luxembourg",
  "Pays-Bas",
  "Allemagne",
  "Espagne",
  "Italie",
  "Portugal",
  "Royaume-Uni",
  "Suisse",
  "Autriche",
  "République tchèque",
  "Pologne",
  "Danemark",
  "Suède",
  "Norvège",
  "Finlande",
  "Autre"
]

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
    constructionYear: string
    floors: string
    description: string
    // Champs spécifiques aux lots
    floor?: string
    doorNumber?: string
    surface?: string
  }

  // Step 2: Lot Details
  reference: string
  floor: string
  doorNumber: string
  surface: string
  description: string

  // Step 3: Contacts
  assignedContacts: {
    locataire: string[]
    prestataire: string[]
    syndic: string[]
    notaire: string[]
    assurance: string[]
    autre: string[]
  }
}

export default function NewLotPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { data: managerData, loading: buildingsLoading } = useManagerStats()
  const [currentStep, setCurrentStep] = useState(1)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactModalType, setContactModalType] = useState<string>("locataire")
  const [showBuildingSelector, setShowBuildingSelector] = useState(false)
  const [buildingSearchQuery, setBuildingSearchQuery] = useState("")
  
  // États pour les informations générales du bâtiment (étape 2)
  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [teamManagers, setTeamManagers] = useState<any[]>([])
  const [userTeam, setUserTeam] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string>("")

  const [lotData, setLotData] = useState<LotData>({
    buildingAssociation: "existing",
    reference: "",
    floor: "",
    doorNumber: "",
    surface: "",
    description: "",
    assignedContacts: {
      locataire: [],
      prestataire: [],
      syndic: [],
      notaire: [],
      assurance: [],
      autre: [],
    },
    generalBuildingInfo: {
      name: "", // Sera initialisé avec la référence par défaut
      address: "",
      postalCode: "",
      city: "",
      country: "Belgique",
      constructionYear: "",
      floors: "",
      description: "",
      // Champs spécifiques aux lots
      floor: "",
      doorNumber: "",
      surface: "",
    },
  })

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
          setError('Vous devez faire partie d\'une équipe pour créer des lots')
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

  // Initialiser la référence par défaut quand les données sont chargées
  useEffect(() => {
    if (managerData?.buildings && lotData.generalBuildingInfo?.name === "") {
      const totalLots = managerData.buildings.reduce((total: number, building: any) => {
        return total + (building.lots?.length || 0)
      }, 0)
      
      const nextLotNumber = totalLots + 1
      const defaultRef = `Lot${String(nextLotNumber).padStart(3, "0")}`
      
      setLotData(prev => ({
        ...prev,
        generalBuildingInfo: {
          ...prev.generalBuildingInfo!,
          name: defaultRef
        }
      }))
    }
  }, [managerData?.buildings, lotData.generalBuildingInfo?.name])

  // Afficher la vérification d'équipe si nécessaire
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  // Get buildings from manager data
  const buildings = managerData?.buildings || []
  const filteredBuildings = buildings.filter(building => 
    building.name.toLowerCase().includes(buildingSearchQuery.toLowerCase()) ||
    building.address.toLowerCase().includes(buildingSearchQuery.toLowerCase())
  )

  // Générer référence par défaut basée sur le nombre de lots existants
  const generateDefaultReference = () => {
    const totalLots = buildings.reduce((total, building) => {
      return total + (building.lots?.length || 0)
    }, 0)
    
    const nextLotNumber = totalLots + 1
    
    if (lotData.buildingAssociation === "independent") {
      return `Lot${String(nextLotNumber).padStart(3, "0")}`
    } else if (lotData.buildingAssociation === "new") {
      return `Lot${String(nextLotNumber).padStart(3, "0")}`
    } else {
      return `Lot${String(nextLotNumber).padStart(3, "0")}`
    }
  }


  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFinish = () => {
    console.log("[v0] Lot created:", lotData)
    router.push("/gestionnaire/dashboard")
  }

  const handleContactSubmit = (contactData: any) => {
    console.log("[v0] Contact created:", {
      ...contactData,
      fullName: `${contactData.firstName} ${contactData.lastName}`,
    })
    
    if (contactData.inviteToApp) {
      console.log("📧 Une invitation sera envoyée à:", contactData.email)
    }
    
    setIsContactModalOpen(false)
  }

  const addContact = (type: string) => {
    setContactModalType(type)
    setIsContactModalOpen(true)
  }

  const removeContact = (type: string, index: number) => {
    setLotData((prev) => ({
      ...prev,
      assignedContacts: {
        ...prev.assignedContacts,
        [type]: prev.assignedContacts[type as keyof typeof prev.assignedContacts].filter((_, i) => i !== index),
      },
    }))
  }

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      if (lotData.buildingAssociation === "existing") {
        return lotData.selectedBuilding !== undefined
      } else if (lotData.buildingAssociation === "new") {
        return lotData.newBuilding?.address.trim() !== ""
      } else {
        return true // Lot indépendant
      }
    }
    if (currentStep === 2) {
      // Si nouveau bâtiment ou lot indépendant, vérifier les informations générales
      if (lotData.buildingAssociation === "new" || lotData.buildingAssociation === "independent") {
        const addressValid = lotData.generalBuildingInfo?.address.trim() !== ""
        const referenceValid = lotData.generalBuildingInfo?.name?.trim() !== ""
        
        // Pour les lots indépendants, vérifier aussi les champs spécifiques aux lots
        let lotSpecificFieldsValid = true
        if (lotData.buildingAssociation === "independent") {
          lotSpecificFieldsValid = (
            lotData.generalBuildingInfo?.floor !== undefined &&
            lotData.generalBuildingInfo?.surface?.trim() !== ""
          )
        }
        return addressValid && referenceValid && lotSpecificFieldsValid
      } else {
        // Pour les lots liés à un bâtiment existant, vérifier les détails du lot
        const lotDetailsValid = lotData.reference.trim() !== ""
        return lotDetailsValid
      }
    }
    return true
  }

  const openGestionnaireModal = () => {
    // TODO: Implémenter la création de gestionnaire si nécessaire
    console.log("Création de gestionnaire non implémentée dans nouveau-lot")
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Association bâtiment</h2>
        <p className="text-gray-600 mb-6">Comment souhaitez-vous gérer ce lot ?</p>
      </div>

      <RadioGroup
        value={lotData.buildingAssociation}
        onValueChange={(value: "existing" | "new" | "independent") =>
          setLotData((prev) => ({ ...prev, buildingAssociation: value }))
        }
        className="space-y-4"
      >
        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="existing" id="existing" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="existing" className="font-medium text-gray-900">
              Lier à un bâtiment existant
            </Label>
            <p className="text-sm text-gray-600 mt-1">Associez ce lot à un bâtiment que vous avez déjà créé</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="new" id="new" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="new" className="font-medium text-gray-900">
              Créer un nouveau bâtiment
            </Label>
            <p className="text-sm text-gray-600 mt-1">Créez un nouveau bâtiment et associez-y ce lot</p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 border rounded-lg">
          <RadioGroupItem value="independent" id="independent" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="independent" className="font-medium text-gray-900">
              Laisser le lot indépendant
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Ce lot ne sera pas associé à un bâtiment (maison individuelle, etc.)
            </p>
          </div>
        </div>
      </RadioGroup>

      {lotData.buildingAssociation === "existing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Sélectionner un bâtiment</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Rechercher un bâtiment..." 
                className="pl-10" 
                value={buildingSearchQuery}
                onChange={(e) => setBuildingSearchQuery(e.target.value)}
              />
            </div>
            <div className="mt-4">
              {buildingsLoading ? (
                <div className="text-center py-8 text-gray-500">Chargement des bâtiments...</div>
              ) : filteredBuildings.length === 0 ? (
                buildingSearchQuery ? (
                  <div className="text-center py-8 text-gray-500">Aucun bâtiment trouvé pour "{buildingSearchQuery}"</div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Vous n'avez pas encore créé de bâtiment</p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => router.push('/gestionnaire/nouveau-batiment')}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Créer un bâtiment
                    </Button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                  {filteredBuildings.map((building) => {
                    const isSelected = lotData.selectedBuilding === building.id;
                    const occupiedLots = building.lots?.filter((lot: any) => lot.status === 'occupied').length || 0;
                    
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
                        aria-label={`Sélectionner le bâtiment ${building.name}`}
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
                        
                        {/* Informations du bâtiment */}
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
                          
                          {/* Stats du bâtiment */}
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Nouveau bâtiment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="buildingName">Nom du bâtiment</Label>
              <Input
                id="buildingName"
                placeholder="Résidence des Jardins, Immeuble Alpha, etc."
                value={lotData.newBuilding?.name || ""}
                onChange={(e) =>
                  setLotData((prev) => ({
                    ...prev,
                    newBuilding: { ...prev.newBuilding!, name: e.target.value },
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="buildingAddress">Adresse complète *</Label>
              <Input
                id="buildingAddress"
                placeholder="15 Avenue des Fleurs"
                value={lotData.newBuilding?.address || ""}
                onChange={(e) =>
                  setLotData((prev) => ({
                    ...prev,
                    newBuilding: { ...prev.newBuilding!, address: e.target.value },
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="buildingPostalCode">Code postal</Label>
                <Input
                  id="buildingPostalCode"
                  placeholder="1000"
                  value={lotData.newBuilding?.postalCode || ""}
                  onChange={(e) =>
                    setLotData((prev) => ({
                      ...prev,
                      newBuilding: { ...prev.newBuilding!, postalCode: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="buildingCity">Ville</Label>
                <Input
                  id="buildingCity"
                  placeholder="Bruxelles"
                  value={lotData.newBuilding?.city || ""}
                  onChange={(e) =>
                    setLotData((prev) => ({
                      ...prev,
                      newBuilding: { ...prev.newBuilding!, city: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="buildingCountry">Pays</Label>
                <Select 
                  value={lotData.newBuilding?.country || "Belgique"} 
                  onValueChange={(value) =>
                    setLotData((prev) => ({
                      ...prev,
                      newBuilding: { ...prev.newBuilding!, country: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un pays" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="buildingDescription">Description</Label>
              <Textarea
                id="buildingDescription"
                placeholder="Informations complémentaires sur le bâtiment..."
                value={lotData.newBuilding?.description || ""}
                onChange={(e) =>
                  setLotData((prev) => ({
                    ...prev,
                    newBuilding: { ...prev.newBuilding!, description: e.target.value },
                  }))
                }
              />
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
              Ce lot ne sera pas associé à un bâtiment. Vous pourrez définir ses informations générales à l'étape suivante.
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
            defaultReference={generateDefaultReference()}
          />
        </div>
      )
    }

    // Affichage standard pour les autres cas
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Configuration du lot</h2>
        </div>

        {/* Informations générales (si nouveau bâtiment) */}
        {lotData.buildingAssociation === "new" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Informations générales</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                showTitle={false}
                defaultReference={generateDefaultReference()}
              />
            </CardContent>
          </Card>
        )}

        {/* Détails du lot - Seulement si pas lot indépendant (car BuildingInfoForm gère déjà ces détails) */}
        {lotData.buildingAssociation !== "independent" && (
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
                  value={lotData.reference}
                  onChange={(e) => setLotData((prev) => ({ ...prev, reference: e.target.value }))}
                />
              </div>

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
                <Label htmlFor="surface">Surface (m²)</Label>
                <Input
                  id="surface"
                  placeholder="45"
                  value={lotData.surface}
                  onChange={(e) => setLotData((prev) => ({ ...prev, surface: e.target.value }))}
                />
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

  const renderStep3 = () => {
    const contactTypes = [
      { key: "locataire", label: "Locataire", icon: Users, color: "blue" },
      { key: "prestataire", label: "Prestataire", icon: Building2, color: "green" },
      { key: "syndic", label: "Syndic", icon: Building2, color: "purple" },
      { key: "notaire", label: "Notaire", icon: Building2, color: "orange" },
      { key: "assurance", label: "Assurance", icon: Building2, color: "red" },
      { key: "autre", label: "Autre", icon: Users, color: "gray" },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Assignation des contacts</h2>
          <p className="text-gray-600">Assignez des contacts à vos lots (optionnel)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contactTypes.map((type) => {
            const Icon = type.icon
            const contacts = lotData.assignedContacts[type.key as keyof typeof lotData.assignedContacts]

            return (
              <Card key={type.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <Icon className="h-4 w-4" />
                    <span>{type.label}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contacts.map((contact, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-sm">{contact}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(type.key, index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => addContact(type.key)} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter {type.label.toLowerCase()}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-8">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
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

          {currentStep < 3 ? (
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

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        defaultType={contactModalType}
      />
    </div>
  )
}
