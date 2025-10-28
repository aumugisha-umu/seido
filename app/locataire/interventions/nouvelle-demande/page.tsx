"use client"
import { useState, useEffect, useMemo } from "react"
import type React from "react"

import {
  ArrowLeft,
  Home,
  Building2,
  CheckCircle,
  AlertTriangle,
  X,
  Upload,
  File,
  Trash2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCreationSuccess } from "@/hooks/use-creation-success"
import { PROBLEM_TYPES, URGENCY_LEVELS } from "@/lib/intervention-data"
import { generateId, generateInterventionId } from "@/lib/id-utils"
import { useAuth } from "@/hooks/use-auth"
import { logger, logError } from '@/lib/logger'
import { getTenantLots } from '../actions'
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { tenantInterventionSteps } from "@/lib/step-configurations"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File // Store the actual File object for upload
}

export default function NouvelleDemandePage() {
  const router = useRouter()
  const { handleSuccess } = useCreationSuccess()
  const { user } = useAuth()

  // ALL useState hooks must be declared before any conditional returns
  const [allTenantLots, setAllTenantLots] = useState<{ id: string; apartment_number?: string; reference: string; building?: { id: string; name: string; address: string; postal_code: string; city: string }; surface_area?: number }[]>([])
  const [lotsLoading, setLotsLoading] = useState(true)
  const [lotsError, setLotsError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLogement, setSelectedLogement] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [formData, setFormData] = useState({
    titre: "",
    type: "",
    urgence: "",
    description: "",
  })
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [createdInterventionId, setCreatedInterventionId] = useState<string | null>(null)
  const [creationError, setCreationError] = useState<string | null>(null)

  // Détermine si on doit afficher l'étape de sélection du logement
  const shouldSkipStepOne = useMemo(() => {
    return allTenantLots.length === 1
  }, [allTenantLots])

  // Steps dynamiques selon le nombre de lots - utiliser la nouvelle configuration
  const steps = useMemo(() => {
    // Si on doit passer l'étape 1, on retourne uniquement les étapes 2 et 3
    if (shouldSkipStepOne) {
      return tenantInterventionSteps.slice(1) // Demande + Confirmation
    }

    return tenantInterventionSteps // Tous les steps (Logement + Demande + Confirmation)
  }, [shouldSkipStepOne])

  // Fetch all tenant lots (separate from the main tenantData)
  useEffect(() => {
    const fetchAllTenantLots = async () => {
      if (!user?.id || user.role !== 'locataire') {
        setLotsLoading(false)
        return
      }

      try {
        setLotsLoading(true)
        setLotsError(null)
        // ✅ Use Server Action instead of direct service call
        const lots = await getTenantLots(user.id)
        setAllTenantLots(lots || [])
      } catch (err) {
        logger.error('Error fetching tenant lots:', err)
        setLotsError(err instanceof Error ? err.message : 'Erreur lors du chargement des logements')
        setAllTenantLots([])
      } finally {
        setLotsLoading(false)
      }
    }

    fetchAllTenantLots()
  }, [user])

  // Transform lots data for display
  const logements = useMemo(() => {
    return allTenantLots.map(lot => ({
      id: lot.id,
      name: lot.apartment_number || `Lot ${lot.reference}`,
      address: lot.building ?
        `${lot.building.address}, ${lot.building.postal_code} ${lot.building.city}` :
        "Lot indépendant",
      surface: lot.surface_area ? `${lot.surface_area}m²` : "Surface non spécifiée",
      building: lot.building?.name || `Lot ${lot.reference}`,
      interventions: "Aucune intervention active", // Could be calculated if needed
      reference: lot.reference,
      building_id: lot.building?.id || null
    }))
  }, [allTenantLots])

  // Auto-select logement and skip step 1 if only one lot
  useEffect(() => {
    if (!selectedLogement && logements.length > 0) {
      setSelectedLogement(logements[0].id)
      
      // If only one lot, skip to step 2 directly
      if (shouldSkipStepOne) {
        setCurrentStep(2)
      }
    }
  }, [selectedLogement, logements, shouldSkipStepOne])

  // Conditional returns AFTER all hooks
  if (!user) return <div>Chargement...</div>

  if (lotsLoading) return <LoadingSkeleton />

  if (lotsError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Erreur lors du chargement des données: {lotsError}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (allTenantLots.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucun logement trouvé. Vous devez être associé à un logement pour créer une demande d'intervention.
            </p>
            <div className="flex justify-center mt-4">
              <Link href="/locataire/dashboard">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour au dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLogementSelect = (logementId: string) => {
    setSelectedLogement(logementId)
    setCurrentStep(2)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }


  const handleSubmit = () => {
    setCurrentStep(3)
  }

  // const interventionId = createdInterventionId || generateInterventionId()
  // const numeroDeclaration = `#${interventionId}` // unused

  const handleConfirmCreation = async () => {
    if (isCreating) return // Prevent multiple submissions
    
    try {
      setIsCreating(true)
      setCreationError(null) // Clear any previous error
      
      // Get the selected lot data
      // const selectedLotData = logements.find(l => l.id === selectedLogement)
      
      // Prepare the intervention data
      const interventionData = {
        title: formData.titre,
        description: formData.description,
        type: formData.type || null,
        urgency: formData.urgence || 'normale',
        lot_id: selectedLogement, // Use the selected lot ID
        teamId: user?.team_id  // ✅ Pass teamId from user profile (same pattern as manager)
      }

      logger.info("🔧 Creating intervention with data:", interventionData)

      // Create FormData to handle files
      const formDataToSend = new FormData()

      // Add intervention data as JSON
      formDataToSend.append('interventionData', JSON.stringify(interventionData))

      // Add files
      uploadedFiles.forEach((uploadedFile, index) => {
        formDataToSend.append(`file_${index}`, uploadedFile.file)
        // Also send metadata for each file
        formDataToSend.append(`file_${index}_metadata`, JSON.stringify({
          id: uploadedFile.id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: uploadedFile.type
        }))
      })

      // Add file count for easier processing on backend
      formDataToSend.append('fileCount', uploadedFiles.length.toString())

      logger.info(`🔧 Sending intervention with ${uploadedFiles.length} files`)

      // Call the API to create the intervention
      const response = await fetch('/api/create-intervention', {
        method: 'POST',
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        body: formDataToSend
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `API returned ${response.status}`)
      }

      logger.info("✅ Intervention created successfully:", result.intervention)

      // Store the real intervention ID
      setCreatedInterventionId(result.intervention.id)
      
      // Gérer le succès avec la nouvelle stratégie
      await handleSuccess({
        successTitle: "Demande d'intervention créée avec succès",
        successDescription: `Votre demande "${result.intervention.title}" a été transmise à votre gestionnaire.`,
        redirectPath: "/locataire/dashboard",
        refreshData: refreshData,
      })

    } catch (error) {
      logger.error("❌ Error creating intervention:", error)
      
      // Store error message to display in UI
      setCreationError(error instanceof Error ? error.message : 'Erreur inconnue lors de la création')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRetourDashboard = () => {
    router.push("/locataire/dashboard")
  }

  const handleVoirDetails = () => {
    const realInterventionId = createdInterventionId || generateInterventionId()
    router.push(`/locataire/interventions/${realInterventionId}`)
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
        file: file, // Store the actual File object
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

  // Helper pour gérer la navigation
  const handleNext = () => {
    if (currentStep === 2) {
      // Vérifier que le formulaire est valide avant de continuer
      if (!formData.titre || !formData.description) return
      setCurrentStep(3)
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (shouldSkipStepOne && currentStep === 2) {
      // Si on skip l'étape 1 et qu'on est à l'étape 2, retour au dashboard
      router.push('/locataire/dashboard')
    } else {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Helper pour savoir si on peut passer à l'étape suivante
  const canProceedToNextStep = () => {
    if (currentStep === 1) return selectedLogement !== null
    if (currentStep === 2) return formData.titre && formData.description
    if (currentStep === 3) return !isCreating
    return false
  }

  // Render helpers pour chaque étape
  const renderStep1 = () => (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Choisissez le logement concerné</h2>
          <p className="text-gray-600">
            Sélectionnez le logement pour lequel vous souhaitez faire une demande d'intervention.
          </p>
        </div>

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
      </CardContent>
    </Card>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Selected Property Info */}
      <Card className="bg-blue-50 border-blue-200">
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
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Détails du sinistre</h2>
          </div>

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
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirmer la création</h2>
          <p className="text-gray-600">Vérifiez les informations ci-dessous avant de créer l'intervention</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        </div>

        {/* Error Message */}
        {creationError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur lors de la création
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {creationError}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // Calculer le subtitle pour afficher le bien sélectionné (à partir de l'étape 2)
  const getHeaderSubtitle = () => {
    if (currentStep < 2 || !selectedLogement) return undefined

    const selectedLot = logements.find(lot => lot.id === selectedLogement)
    if (selectedLot) {
      return `📍 ${selectedLot.name}`
    }

    return undefined
  }

  // Structure unifiée pour tous les steps
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sticky au niveau supérieur */}
      <StepProgressHeader
        title="Déclarer un sinistre"
        subtitle={getHeaderSubtitle()}
        backButtonText="Retour au tableau de bord"
        onBack={() => router.push("/locataire/dashboard")}
        steps={steps}
        currentStep={shouldSkipStepOne ? currentStep - 1 : currentStep}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-2">
        {/* Step 1: Sélection du logement */}
        {currentStep === 1 && !shouldSkipStepOne && renderStep1()}

        {/* Step 2: Formulaire de demande */}
        {currentStep === 2 && renderStep2()}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && renderStep3()}
      </main>

      {/* Navigation Sticky */}
      <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4 -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="flex justify-between w-full max-w-6xl mx-auto">
          {/* Bouton Retour */}
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isCreating}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {shouldSkipStepOne && currentStep === 2 ? 'Annuler' : 'Retour'}
            </Button>
          )}

          {/* Bouton Suivant / Confirmer */}
          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedToNextStep()}
              className="w-full sm:w-auto ml-auto"
            >
              {currentStep === 1 ? "Sélectionner ce logement" : "Continuer vers la confirmation"}
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmCreation}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto ml-auto disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmer la création
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="sticky top-20 z-40 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>

      {/* Content skeleton */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-2">
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Navigation skeleton */}
      <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
        <div className="flex justify-between w-full max-w-6xl mx-auto">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}

// Fonction helper pour rafraîchir les données après création
function refreshData() {
  // Placeholder - cette fonction pourrait être utilisée pour rafraîchir les données
  return Promise.resolve()
}
