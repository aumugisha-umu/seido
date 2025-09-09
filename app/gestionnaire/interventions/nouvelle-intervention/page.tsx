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
  Search,
  UserCheck,
  Eye,
  AlertTriangle,
  Paperclip,
  Calendar,
  Clock,
  MessageSquare,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import PropertySelector from "@/components/property-selector"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PROBLEM_TYPES, URGENCY_LEVELS } from "@/lib/intervention-data"
import { userService, contactService, teamService } from "@/lib/database-service"
import { useAuth } from "@/hooks/use-auth"
import ContactSelector from "@/components/ui/contact-selector"

export default function NouvelleInterventionPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLogement, setSelectedLogement] = useState<any>(null)
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | undefined>()
  const [selectedLotId, setSelectedLotId] = useState<number | undefined>()
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
  const [individualMessages, setIndividualMessages] = useState<Record<number, string>>({})

  const [selectedManagerId, setSelectedManagerId] = useState<string>("")
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([])

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [isPreFilled, setIsPreFilled] = useState(false)
  const [createdInterventionId, setCreatedInterventionId] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>("")

  const [expectsQuote, setExpectsQuote] = useState(false)

  // États pour les données réelles
  const [managers, setManagers] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserTeam, setCurrentUserTeam] = useState<any>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Fonction pour charger les données réelles depuis la DB
  const loadRealData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 1. Récupérer l'équipe de l'utilisateur
      const teams = await teamService.getUserTeams(user.id)
      const team = teams[0]
      if (team) {
        setCurrentUserTeam(team)
        
        // 2. Récupérer les gestionnaires réels depuis team_members -> users
        const managersData = await contactService.getTeamManagers(team.id)
        
        // Marquer l'utilisateur connecté
        managersData.forEach((manager: any) => {
          manager.isCurrentUser = manager.email === user.email
        })
        
        // 3. Récupérer les prestataires depuis contacts
        const contacts = await contactService.getTeamContacts(team.id)
        const providersData = contacts
          .filter((contact: any) => contact.contact_type === 'prestataire')
          .map((contact: any) => ({
            id: contact.id,
            name: contact.name,
            role: "Prestataire",
            email: contact.email,
            phone: contact.phone,
            speciality: contact.speciality,
            isCurrentUser: false,
            type: "prestataire",
          }))

        setManagers(managersData)
        setProviders(providersData)

        // Pré-sélectionner l'utilisateur connecté comme gestionnaire
        const currentManager = managersData.find(manager => manager.isCurrentUser)
        if (currentManager && !selectedManagerId) {
          setSelectedManagerId(currentManager.id)
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des données:", error)
    } finally {
      setLoading(false)
    }
  }

  // Charger les données au montage du composant
  useEffect(() => {
    loadRealData()
  }, [user?.id])

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

      // Pre-select logement based on location info
      // Parse location to extract lot info (e.g., "Lot003 • 123 Rue de la Paix, 75001 Paris")
      if (tenantLocation.includes("Lot")) {
        const lotMatch = tenantLocation.match(/Lot(\d+)/)
        if (lotMatch) {
          const lotNumber = lotMatch[1]
          // TODO: Récupérer les vraies données du lot depuis la DB
          // Pour l'instant on garde un comportement minimal
          setSelectedLogement({
            id: Number.parseInt(lotNumber),
            name: `Lot${lotNumber.padStart(3, "0")}`,
            type: "lot",
            building: "Logement pré-sélectionné",
            address: "Adresse à récupérer depuis la DB",
            floor: 1,
            tenant: searchParams.get("tenantId") || "Locataire",
          })
          setSelectedLotId(Number.parseInt(lotNumber))

          // Skip to step 2 since step 1 is pre-filled
          setCurrentStep(2)
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
    
    // Ajouter le gestionnaire sélectionné
    if (selectedManagerId) {
      const manager = managers.find(m => m.id === selectedManagerId)
      if (manager) contacts.push(manager)
    }
    
    // Ajouter les prestataires sélectionnés
    selectedProviderIds.forEach(providerId => {
      const provider = providers.find(p => p.id === providerId)
      if (provider) contacts.push(provider)
    })
    
    return contacts
  }

  // Fonctions de gestion des contacts
  const handleManagerSelect = (managerId: string) => {
    setSelectedManagerId(managerId)
  }

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderIds(prevIds => {
      if (prevIds.includes(providerId)) {
        // Si déjà sélectionné, le retirer
        return prevIds.filter(id => id !== providerId)
      } else {
        // Sinon l'ajouter
        return [...prevIds, providerId]
      }
    })
  }

  const handleContactCreated = (newContact: any) => {
    // Ajouter le nouveau contact à la liste appropriée
    if (newContact.contact_type === 'gestionnaire') {
      const managerData = {
        id: newContact.id,
        name: newContact.name,
        role: "Gestionnaire",
        email: newContact.email,
        phone: newContact.phone,
        isCurrentUser: newContact.email === user?.email,
        type: "gestionnaire",
      }
      setManagers((prev) => [...prev, managerData])
    } else if (newContact.contact_type === 'prestataire') {
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
      setProviders((prev) => [...prev, providerData])
    }
  }


  const handleBuildingSelect = (buildingId: number) => {
    setSelectedBuildingId(buildingId)
    setSelectedLotId(undefined)
    setSelectedLogement({ type: "building", id: buildingId })
  }

  const handleLotSelect = (lotId: number, buildingId?: number) => {
    setSelectedLotId(lotId)
    setSelectedBuildingId(buildingId)
    setSelectedLogement({ type: "lot", id: lotId, buildingId })
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
    console.log("Intervention créée:", {
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
    })
    router.push("/gestionnaire/interventions")
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
      console.log("🚀 Starting intervention creation...")
      
      // Prepare data for API call
      const interventionData = {
        // Basic intervention data
        title: formData.title,
        description: formData.description,
        type: formData.type,
        urgency: formData.urgency,
        
        // Housing selection
        selectedLogement,
        selectedBuildingId,
        selectedLotId,
        
        // Contact assignments
        selectedManagerId,
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

      console.log("📝 Sending intervention data:", interventionData)

      // Call the API
      const response = await fetch('/api/create-manager-intervention', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interventionData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de l\'intervention')
      }

      console.log("✅ Intervention created successfully:", result)

      // Store the created intervention ID
      setCreatedInterventionId(result.intervention.id)

      // Show success modal
      setShowSuccessModal(true)
      setCountdown(10)

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push(`/gestionnaire/interventions/${result.intervention.id}`)
            return 0
          }
          return prev - 1
        })
      }, 1000)

    } catch (error) {
      console.error("❌ Error creating intervention:", error)
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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux interventions
            </Button>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer une intervention</h1>
          <p className="text-gray-600">Créez une nouvelle demande d'intervention pour votre patrimoine immobilier.</p>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                <Home className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">Logement</p>
                <p className="text-xs text-gray-500">Choisir le logement</p>
              </div>
            </div>

            <div className={`h-1 w-12 ${currentStep >= 2 ? "bg-blue-500" : "bg-gray-200"}`} />

            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">Demande</p>
                <p className="text-xs text-gray-500">Décrire le problème</p>
              </div>
            </div>

            <div className={`h-1 w-12 ${currentStep >= 3 ? "bg-blue-500" : "bg-gray-200"}`} />

            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= 3 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">Contacts</p>
                <p className="text-xs text-gray-500">Planification</p>
              </div>
            </div>

            <div className={`h-1 w-12 ${currentStep >= 4 ? "bg-blue-500" : "bg-gray-200"}`} />

            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= 4 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">Confirmation</p>
                <p className="text-xs text-gray-500">Demande envoyée</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Sélection du logement avec PropertySelector */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <PropertySelector
              mode="select"
              title="Créer une intervention"
              subtitle="Sélectionnez le logement pour lequel vous souhaitez créer une intervention."
              onBuildingSelect={handleBuildingSelect}
              onLotSelect={handleLotSelect}
              selectedBuildingId={selectedBuildingId}
              selectedLotId={selectedLotId}
              showActions={false}
            />

            <div className="flex justify-end">
              <Button onClick={handleNext} disabled={!selectedLogement} className="px-8">
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Formulaire de description */}
        {currentStep === 2 && selectedLogement && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Home className="h-5 w-5 text-blue-600" />
                    <span>Intervention sélectionnée</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedLogement.type === "building" ? "Bâtiment" : "Lot"} sélectionné
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="h-5 w-5 text-orange-500" />
                <h3 className="text-lg font-medium">Détails de l'intervention</h3>
              </div>

              <div>
                <h4 className="font-medium mb-4">Décrire l'intervention</h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Titre du problème *</label>
                    <Input
                      placeholder="Ex: Fuite d'eau dans la salle de bain"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de problème</label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Urgence</label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, urgency: value }))}
                    >
                      <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée *</label>
                    <Textarea
                      placeholder="Décrivez le problème en détail : où, quand, comment..."
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      className="min-h-[100px] border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fichiers joints (optionnel)</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-gray-500 mb-4">
                        Formats acceptés: JPG, PNG, PDF, DOC (max 10MB par fichier)
                      </p>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("file-upload")?.click()}
                      >
                        Sélectionner des fichiers
                      </Button>
                    </div>

                    {files.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium text-gray-700">Fichiers sélectionnés:</p>
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={handleBack}>
                  Retour
                </Button>
                <Button onClick={handleNext} disabled={!formData.title || !formData.description} className="px-8">
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Assignation et Planification</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Assignez l'intervention à un ou plusieurs gestionnaires/prestataires et définissez la planification.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Assigner l'intervention à</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Le gestionnaire est automatiquement assigné. Vous pouvez optionnellement ajouter un prestataire.
                </p>

                {/* Contact Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Gestionnaire */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <User className="h-4 w-4" />
                      <span>Gestionnaire *</span>
                    </label>
                    <ContactSelector
                      contacts={managers}
                      selectedContactId={selectedManagerId}
                      onContactSelect={handleManagerSelect}
                      onContactCreated={handleContactCreated}
                      contactType="gestionnaire"
                      placeholder="Sélectionner un gestionnaire"
                      isLoading={loading}
                      teamId={currentUserTeam?.id || ""}
                    />
                  </div>

                  {/* Prestataire */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                      <Wrench className="h-4 w-4" />
                      <span>Prestataire</span>
                    </label>
                    <ContactSelector
                      contacts={providers}
                      selectedContactIds={selectedProviderIds}
                      onContactSelect={handleProviderSelect}
                      onContactCreated={handleContactCreated}
                      contactType="prestataire"
                      placeholder="Sélectionner un prestataire"
                      isLoading={loading}
                      teamId={currentUserTeam?.id || ""}
                    />
                  </div>
                </div>

                {/* Selected Contacts Display */}
                {(selectedManagerId || selectedProviderIds.length > 0) && (
                  <div className="space-y-3">
                    <h5 className="font-medium text-sm text-gray-700">
                      Personnes assignées ({getSelectedContacts().length})
                    </h5>
                    {getSelectedContacts().map((contact) => (
                      <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {contact.name}
                                {contact.isCurrentUser && <span className="text-blue-600">(Vous)</span>}
                              </span>
                              <Badge variant={contact.role === "Gestionnaire" ? "default" : "secondary"}>
                                {contact.role}
                              </Badge>
                              {contact.speciality && (
                                <Badge variant="outline" className="text-xs">
                                  {contact.speciality}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {contact.email} • {contact.phone}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (contact.type === "gestionnaire") {
                              setSelectedManagerId("")
                            } else if (contact.type === "prestataire") {
                              setSelectedProviderIds(prev => prev.filter(id => id !== contact.id))
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scheduling Options */}
              <div>
                <h4 className="font-medium mb-4">Planification</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="flexible"
                      name="scheduling"
                      checked={schedulingType === "flexible"}
                      onChange={() => setSchedulingType("flexible")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="flexible" className="font-medium">
                      Horaire à définir
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="fixed"
                      name="scheduling"
                      checked={schedulingType === "fixed"}
                      onChange={() => setSchedulingType("fixed")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="fixed" className="font-medium">
                      Date et heure fixe
                    </label>
                  </div>

                  {schedulingType === "fixed" && (
                    <div className="ml-7 flex items-center space-x-3">
                      <Input
                        type="date"
                        value={fixedDateTime.date}
                        onChange={(e) => setFixedDateTime((prev) => ({ ...prev, date: e.target.value }))}
                        className="border-2 border-gray-300 focus:border-blue-500"
                      />
                      <Input
                        type="time"
                        value={fixedDateTime.time}
                        onChange={(e) => setFixedDateTime((prev) => ({ ...prev, time: e.target.value }))}
                        className="border-2 border-gray-300 focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id="slots"
                      name="scheduling"
                      checked={schedulingType === "slots"}
                      onChange={() => setSchedulingType("slots")}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="slots" className="font-medium">
                      Proposer des créneaux
                    </label>
                  </div>

                  {schedulingType === "slots" && (
                    <div className="ml-7 space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTimeSlot}
                        className="flex items-center space-x-2 bg-transparent"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Ajouter un créneau</span>
                      </Button>

                      {timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <Input
                            type="date"
                            value={slot.date}
                            onChange={(e) => updateTimeSlot(index, "date", e.target.value)}
                            className="flex-1 border-2 border-gray-300 focus:border-blue-500"
                          />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateTimeSlot(index, "startTime", e.target.value)}
                            className="w-32 border-2 border-gray-300 focus:border-blue-500"
                          />
                          <span className="text-gray-500">à</span>
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateTimeSlot(index, "endTime", e.target.value)}
                            className="w-32 border-2 border-gray-300 focus:border-blue-500"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Options */}
              {(selectedManagerId || selectedProviderIds.length > 0) && (
                <div>
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="expectsQuote"
                        checked={expectsQuote}
                        onChange={(e) => setExpectsQuote(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="expectsQuote" className="font-medium text-blue-900">
                        Demander un devis
                      </label>
                    </div>
                    <p className="text-sm text-blue-700 mt-2 ml-7">
                      Les prestataires assignés devront fournir un devis avant de commencer l'intervention
                    </p>
                  </div>

                  {getSelectedContacts().length > 1 ? (
                    <>
                      <h4 className="font-medium mb-2">Demande au groupe ou individuelle ?</h4>
                      <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                          <input
                            type="radio"
                            id="group"
                            name="messageType"
                            value="global"
                            checked={messageType === "global"}
                            onChange={(e) => setMessageType(e.target.value as "global" | "individual")}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label htmlFor="group" className="font-medium">
                              Demande au groupe
                            </label>
                            <p className="text-sm text-gray-600 mb-2">
                              Ces instructions ne seront pas vues par le locataire
                            </p>
                            {messageType === "global" && (
                              <Textarea
                                placeholder="Instructions à communiquer à tous les assignés de cette intervention..."
                                value={globalMessage}
                                onChange={(e) => setGlobalMessage(e.target.value)}
                                className="min-h-[80px] border-2 border-gray-300 focus:border-blue-500"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-start space-x-3">
                          <input
                            type="radio"
                            id="individual"
                            name="messageType"
                            value="individual"
                            checked={messageType === "individual"}
                            onChange={(e) => setMessageType(e.target.value as "global" | "individual")}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label htmlFor="individual" className="font-medium">
                              Demandes individuelles
                            </label>
                            <p className="text-sm text-gray-600 mb-2">
                              Seule la personne concernée pourra voir ses instructions
                            </p>
                            {messageType === "individual" && (
                              <div className="space-y-3 mt-3">
                                {getSelectedContacts().map((contact) => {
                                  return contact ? (
                                    <div key={contact.id} className="border rounded-lg p-3">
                                      <div className="flex items-center space-x-2 mb-2">
                                        {contact.type === "gestionnaire" ? (
                                          <UserCheck className="h-4 w-4 text-blue-600" />
                                        ) : (
                                          <Wrench className="h-4 w-4 text-green-600" />
                                        )}
                                        <span className="font-medium">{contact.name}</span>
                                        <span className="text-sm text-gray-500">({contact.type})</span>
                                      </div>
                                      <Textarea
                                        placeholder={`Instructions spécifiques pour ${contact.name}...`}
                                        value={individualMessages[contact.id] || ""}
                                        onChange={(e) =>
                                          setIndividualMessages((prev) => ({
                                            ...prev,
                                            [contact.id]: e.target.value,
                                          }))
                                        }
                                        className="min-h-[60px] border-2 border-gray-300 focus:border-blue-500"
                                      />
                                    </div>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium mb-2">Instructions à communiquer</h4>
                      <p className="text-sm text-gray-600 mb-4">Ces instructions ne seront pas vues par le locataire</p>
                      <Textarea
                        placeholder="Instructions à communiquer à l'assigné de cette intervention..."
                        value={globalMessage}
                        onChange={(e) => setGlobalMessage(e.target.value)}
                        className="min-h-[80px] border-2 border-gray-300 focus:border-blue-500"
                      />
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={handleBack}>
                  Retour
                </Button>
                <Button 
                  onClick={handleNext} 
                  disabled={!selectedManagerId} 
                  className="px-8"
                >
                  Créer l'intervention
                </Button>
              </div>
            </CardContent>
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

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(3)} disabled={isCreating}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Retour
                    </Button>
                    <Button 
                      onClick={handleCreateIntervention} 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Création...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Créer l'intervention
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

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
