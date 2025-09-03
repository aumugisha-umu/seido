"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "lucide-react"
import { useRouter } from "next/navigation"
import ContactFormModal from "@/components/contact-form-modal"

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
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContactType, setSelectedContactType] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isContactFormModalOpen, setIsContactFormModalOpen] = useState(false)
  const [prefilledContactType, setPrefilledContactType] = useState<string>("")

  const steps = [
    { number: 1, title: "Bâtiment", subtitle: "Informations générales", completed: currentStep > 1 },
    { number: 2, title: "Lots", subtitle: "Configuration des lots", completed: currentStep > 2 },
    { number: 3, title: "Contacts", subtitle: "Assignation optionnelle", completed: false },
  ]

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

  const openContactModal = (type: string) => {
    setSelectedContactType(type)
    setIsContactModalOpen(true)
  }

  const addContact = (email: string) => {
    const newContact: Contact = {
      id: Date.now().toString(),
      name: email.split("@")[0],
      email,
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

  const canProceedToNextStep = () => {
    if (currentStep === 1) {
      return buildingInfo.address.trim() !== ""
    }
    if (currentStep === 2) {
      return lots.length > 0
    }
    return true
  }

  const handleFinish = () => {
    // Ici on sauvegarderait les données
    console.log("Building created:", { buildingInfo, lots, contacts })
    router.push("/dashboard/gestionnaire")
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
      name: contactData.name,
      email: contactData.email,
      type: contactData.type as any,
    }
    setContacts([...contacts, newContact])
    setIsContactFormModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Créer un bâtiment avec plusieurs lots</h1>

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
              <CardTitle>Assignation des contacts</CardTitle>
              <CardDescription>Assignez des contacts à vos lots (optionnel)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{contacts.length}</div>
                  <div className="text-sm text-gray-600">assignations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{lots.length}</div>
                  <div className="text-sm text-gray-600">lots assignés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <div className="text-sm text-gray-600">moy./lot</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">100%</div>
                  <div className="text-sm text-gray-600">couverture</div>
                </div>
              </div>

              {/* Lots with contacts */}
              <div className="space-y-6">
                {lots.map((lot) => (
                  <Card key={lot.id} className="border-gray-200">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{lot.reference}</h3>
                        <Badge variant="secondary">{getContactsByType("tenant").length} contact(s) assigné(s)</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        {contactTypes.map((type) => {
                          const Icon = type.icon
                          const assignedContacts = getContactsByType(type.key)

                          return (
                            <div key={type.key} className="space-y-3">
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
                                    <span className="text-sm">{contact.email}</span>
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
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Étape précédente
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    Passer cette étape
                  </Button>
                  <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                    Terminer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Selection Modal */}
        <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Sélectionner un locataire
              </DialogTitle>
              <DialogDescription>Personne qui occupe le logement</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Rechercher un locataire par nom, email, téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchTerm && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">a@n.coma</div>
                      <div className="text-sm text-gray-500">a@n.coma</div>
                    </div>
                    <Button onClick={() => addContact("a@n.coma")} className="bg-black text-white hover:bg-gray-800">
                      Sélectionner
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2"
                  onClick={() => openContactFormModal(selectedContactType)}
                >
                  <Plus className="w-4 h-4" />
                  Créer un nouveau locataire
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
      </div>
    </div>
  )
}
