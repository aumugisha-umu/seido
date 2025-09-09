"use client"

import { useState } from "react"
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

  // Step 2: Lot Details
  reference: string
  floor: string
  doorNumber: string
  surface: string
  monthlyRent: string
  securityDeposit: string
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
  const [currentStep, setCurrentStep] = useState(1)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactModalType, setContactModalType] = useState<string>("locataire")
  const [showBuildingSelector, setShowBuildingSelector] = useState(false)

  const [lotData, setLotData] = useState<LotData>({
    buildingAssociation: "existing",
    reference: "",
    floor: "",
    doorNumber: "",
    surface: "",
    monthlyRent: "",
    securityDeposit: "",
    description: "",
    assignedContacts: {
      locataire: [],
      prestataire: [],
      syndic: [],
      notaire: [],
      assurance: [],
      autre: [],
    },
  })

  const steps = [
    { number: 1, title: "Bâtiment", subtitle: "Informations générales" },
    { number: 2, title: "Lots", subtitle: "Configuration des lots" },
    { number: 3, title: "Contacts", subtitle: "Assignation optionnelle" },
  ]

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
              <Input placeholder="Rechercher un bâtiment..." className="pl-10" />
            </div>
            <div className="mt-4 text-center py-8 text-gray-500">Vous n'avez pas encore créé de bâtiment</div>
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
            <p className="text-sm text-gray-600 mb-4">
              Ce lot ne sera pas associé à un bâtiment. Vous pourrez le lier plus tard si nécessaire.
            </p>
            <div>
              <Label htmlFor="independentAddress">Adresse du lot *</Label>
              <Input
                id="independentAddress"
                placeholder="25 Rue du Commerce, 75015 Paris"
                value={lotData.independentAddress || ""}
                onChange={(e) => setLotData((prev) => ({ ...prev, independentAddress: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Détails du lot</h2>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="reference">Référence du lot *</Label>
          <Input
            id="reference"
            placeholder="fgfdddd"
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

        <div className="grid grid-cols-2 gap-4">
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
            <Label htmlFor="monthlyRent">Loyer mensuel (€)</Label>
            <Input
              id="monthlyRent"
              placeholder="1200"
              value={lotData.monthlyRent}
              onChange={(e) => setLotData((prev) => ({ ...prev, monthlyRent: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="securityDeposit">Dépôt de garantie (€)</Label>
          <Input
            id="securityDeposit"
            placeholder="1200"
            value={lotData.securityDeposit}
            onChange={(e) => setLotData((prev) => ({ ...prev, securityDeposit: e.target.value }))}
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
      </div>
    </div>
  )

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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/gestionnaire/dashboard")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Retour au dashboard</span>
              </Button>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Créer un lot</h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.number < currentStep
                        ? "bg-green-500 text-white"
                        : step.number === currentStep
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step.number < currentStep ? <Check className="h-5 w-5" /> : step.number}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-sm font-medium text-gray-900">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.subtitle}</p>
                  </div>
                </div>
                {index < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-8" />}
              </div>
            ))}
          </div>
        </div>
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
            <Button onClick={handleNext} className="flex items-center space-x-2">
              <span>Suivant : {steps[currentStep].title}</span>
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
