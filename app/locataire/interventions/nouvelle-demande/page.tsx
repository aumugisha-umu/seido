"use client"
import { useState } from "react"
import type React from "react"

import {
  ArrowLeft,
  Home,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Upload,
  File,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PROBLEM_TYPES, URGENCY_LEVELS } from "@/lib/intervention-data"
import { generateId, generateInterventionId } from "@/lib/id-utils"

interface Disponibilite {
  id: string
  date: string
  heureDebut: string
  heureFin: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
}

export default function NouvelleDemandePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLogement, setSelectedLogement] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [formData, setFormData] = useState({
    titre: "",
    type: "",
    urgence: "",
    description: "",
    localisation: "",
  })
  const [disponibilites, setDisponibilites] = useState<Disponibilite[]>([])
  const [newDisponibilite, setNewDisponibilite] = useState({
    date: "",
    heureDebut: "09:00",
    heureFin: "17:00",
  })
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const steps = [
    { id: 1, name: "Logement", description: "Choisir le logement", icon: Home },
    { id: 2, name: "Demande", description: "Décrire le problème", icon: Building2 },
    { id: 3, name: "Confirmation", description: "Demande envoyée", icon: CheckCircle },
  ]

  const logements = [
    {
      id: "bt11",
      name: "Bt 11",
      address: "Marconi 9",
      surface: "Surface non spécifiée",
      interventions: "Aucune intervention active",
    },
    {
      id: "lot001",
      name: "Lot001",
      address: "",
      surface: "Surface non spécifiée",
      interventions: "Aucune intervention active",
    },
  ]

  const handleLogementSelect = (logementId: string) => {
    setSelectedLogement(logementId)
    setCurrentStep(2)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const ajouterDisponibilite = () => {
    if (newDisponibilite.date) {
      const nouvelleDisponibilite: Disponibilite = {
        id: generateId('disponibilite'),
        ...newDisponibilite,
      }
      setDisponibilites((prev) => [...prev, nouvelleDisponibilite])
      setNewDisponibilite({
        date: "",
        heureDebut: "09:00",
        heureFin: "17:00",
      })
    }
  }

  const supprimerDisponibilite = (id: string) => {
    setDisponibilites((prev) => prev.filter((d) => d.id !== id))
  }

  const handleSubmit = () => {
    setCurrentStep(3)
  }

  const interventionId = generateInterventionId()
  const numeroDeclaration = `#${interventionId}`

  const handleConfirmCreation = () => {
    setShowSuccessModal(true)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push(`/locataire/interventions/${interventionId}`)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleRetourDashboard = () => {
    router.push("/locataire/dashboard")
  }

  const handleVoirDetails = () => {
    router.push(`/locataire/interventions/${interventionId}`)
  }

  const selectedLogementData = logements.find((l) => l.id === selectedLogement)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        id: generateId('file'),
        name: file.name,
        size: file.size,
        type: file.type,
      }))
      setUploadedFiles((prev) => [...prev, ...newFiles])
    }
    event.target.value = ""
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (currentStep === 1) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/locataire/interventions"
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tableau de bord
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Déclarer un sinistre</h1>
          <p className="text-gray-600">Choisissez le logement pour lequel vous souhaitez déclarer un sinistre.</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step.id === currentStep
                    ? "bg-blue-600 text-white"
                    : step.id < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <div className="ml-3 text-sm">
                <p className="font-medium">{step.name}</p>
                <p className="text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className="w-16 h-px bg-gray-300 mx-4" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Déclarer un sinistre</h2>
          </div>
          <p className="text-gray-600 mb-6">Choisissez le logement pour lequel vous souhaitez déclarer un sinistre.</p>

          <h3 className="text-center text-lg font-medium mb-6">Choisissez le logement concerné</h3>
          <p className="text-center text-gray-600 mb-8">
            Sélectionnez le logement pour lequel vous souhaitez faire une demande d'intervention.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {logements.map((logement) => (
              <Card key={logement.id} className="border hover:border-blue-300 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Home className="h-5 w-5 text-gray-600" />
                      <h3 className="font-semibold">{logement.name}</h3>
                    </div>
                  </div>

                  <div className="h-6 mb-2">
                    {logement.address && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{logement.address}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{logement.surface}</p>
                  <p className="text-sm text-gray-500 mb-4">{logement.interventions}</p>

                  <Button onClick={() => handleLogementSelect(logement.id)} className="w-full" variant="outline">
                    Sélectionner
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 2) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setCurrentStep(1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Changer de logement
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Déclarer un sinistre</h1>
          <p className="text-gray-600">
            Signalez un problème dans votre logement. Votre propriétaire sera automatiquement notifié.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step.id === currentStep
                    ? "bg-blue-600 text-white"
                    : step.id < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                <step.icon className="h-5 w-5" />
              </div>
              <div className="ml-3 text-sm">
                <p className="font-medium">{step.name}</p>
                <p className="text-gray-500">{step.description}</p>
              </div>
              {index < steps.length - 1 && <div className="w-16 h-px bg-gray-300 mx-4" />}
            </div>
          ))}
        </div>

        {/* Selected Property Info */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{selectedLogementData?.name}</span>
              {selectedLogementData?.address && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{selectedLogementData.address}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-6">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Détails du sinistre</h2>
          </div>

          <h3 className="text-lg font-medium">Décrire le sinistre</h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="titre" className="text-sm font-medium text-gray-700">
                Titre du problème *
              </Label>
              <Input
                id="titre"
                placeholder="Ex: Fuite d'eau dans la salle de bain"
                value={formData.titre}
                onChange={(e) => handleInputChange("titre", e.target.value)}
                className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                Type de problème
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                <SelectTrigger className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
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
              <Label htmlFor="urgence" className="text-sm font-medium text-gray-700">
                Urgence
              </Label>
              <Select value={formData.urgence} onValueChange={(value) => handleInputChange("urgence", value)}>
                <SelectTrigger className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                  <SelectValue placeholder="Sélectionnez l'urgence" />
                </SelectTrigger>
                <SelectContent>
                  {URGENCY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${level.color}`}>{level.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description détaillée *
              </Label>
              <Textarea
                id="description"
                placeholder="Décrivez le problème en détail : où, quand, comment..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="mt-2 min-h-[100px] border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <Label htmlFor="localisation" className="text-sm font-medium text-gray-700">
                Localisation précise (optionnel)
              </Label>
              <Input
                id="localisation"
                placeholder="Ex: Cuisine, sous l'évier"
                value={formData.localisation}
                onChange={(e) => handleInputChange("localisation", e.target.value)}
                className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Pièces jointes (optionnel)</Label>
              <p className="text-xs text-gray-500 mt-1">
                Ajoutez des photos ou documents pour illustrer le problème (max 10MB par fichier)
              </p>

              <div className="mt-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600">Cliquez pour télécharger</span> ou glissez-déposez
                    </p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF jusqu'à 10MB</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Uploaded files list */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Fichiers ajoutés ({uploadedFiles.length})</h4>
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <File className="h-4 w-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Disponibilités */}
            <div>
              <Label className="text-sm font-medium text-gray-700">Vos disponibilités (optionnel)</Label>
              <div className="mt-2 space-y-4">
                <div className="flex items-center space-x-2">
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600 cursor-pointer" onClick={ajouterDisponibilite}>
                    Ajouter une disponibilité
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                      Date
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={newDisponibilite.date}
                      onChange={(e) => setNewDisponibilite((prev) => ({ ...prev, date: e.target.value }))}
                      className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heureDebut" className="text-sm font-medium text-gray-700">
                      Heure début
                    </Label>
                    <Input
                      id="heureDebut"
                      type="time"
                      value={newDisponibilite.heureDebut}
                      onChange={(e) => setNewDisponibilite((prev) => ({ ...prev, heureDebut: e.target.value }))}
                      className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="heureFin" className="text-sm font-medium text-gray-700">
                      Heure fin
                    </Label>
                    <Input
                      id="heureFin"
                      type="time"
                      value={newDisponibilite.heureFin}
                      onChange={(e) => setNewDisponibilite((prev) => ({ ...prev, heureFin: e.target.value }))}
                      className="mt-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <Button onClick={ajouterDisponibilite} className="bg-green-600 hover:bg-green-700">
                    Ajouter cette disponibilité
                  </Button>
                </div>

                {/* Liste des disponibilités */}
                {disponibilites.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Vos disponibilités ({disponibilites.length})</h4>
                    <div className="space-y-2">
                      {disponibilites.map((dispo) => (
                        <div key={dispo.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              {new Date(dispo.date).toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })}
                            </span>
                            <span className="text-sm text-gray-500">
                              {dispo.heureDebut} - {dispo.heureFin}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => supprimerDisponibilite(dispo.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={() => setCurrentStep(1)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.titre || !formData.description}
              className="bg-black hover:bg-gray-800"
            >
              Continuer vers la confirmation
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === 3) {
    const dateEnvoi = new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirmer la création</h1>
          <p className="text-gray-600">Vérifiez les informations ci-dessous avant de créer l'intervention</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {/* Logement */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Home className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Logement</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Nom:</span> {selectedLogementData?.name}
                </p>
                {selectedLogementData?.address && (
                  <p>
                    <span className="font-medium">Adresse:</span> {selectedLogementData.address}
                  </p>
                )}
                <p>
                  <span className="font-medium">Surface:</span> {selectedLogementData?.surface}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Problème */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Problème</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Titre:</span> {formData.titre}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {formData.type || "Non spécifié"}
                </p>
                <p>
                  <span className="font-medium">Urgence:</span> {formData.urgence || "Non spécifié"}
                </p>
                {formData.localisation && (
                  <p>
                    <span className="font-medium">Localisation:</span> {formData.localisation}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-l-4 border-l-purple-500 lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Building2 className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Description</h3>
              </div>
              <p className="text-sm text-gray-700">{formData.description}</p>
              {uploadedFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Fichiers joints ({uploadedFiles.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                      <span key={file.id} className="inline-flex items-center px-2 py-1 bg-gray-100 text-xs rounded">
                        <File className="h-3 w-3 mr-1" />
                        {file.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disponibilités */}
          {disponibilites.length > 0 && (
            <Card className="border-l-4 border-l-green-500 lg:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Disponibilités proposées</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {disponibilites.map((dispo) => (
                    <div key={dispo.id} className="text-sm bg-green-50 p-2 rounded">
                      {new Date(dispo.date).toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      de {dispo.heureDebut} à {dispo.heureFin}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Modifier
          </Button>
          <Button onClick={handleConfirmCreation} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmer la création
          </Button>
        </div>

        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-start mb-4">
                <div></div>
                <button onClick={() => setShowSuccessModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Intervention créée avec succès !</h3>
                <p className="text-gray-600 mb-4">Votre demande a été créée et le propriétaire a été notifié.</p>
              </div>

              <div className="space-y-3">
                <Button onClick={handleRetourDashboard} variant="outline" className="w-full bg-transparent">
                  <Home className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Button>
                <Button onClick={handleVoirDetails} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Building2 className="h-4 w-4 mr-2" />
                  Voir les détails de l'intervention
                </Button>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                Redirection automatique vers les détails dans {countdown} secondes
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
