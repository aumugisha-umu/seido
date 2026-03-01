"use client"
import { useState, useEffect, useMemo } from "react"
import type React from "react"

import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Home,
  Building2,
  AlertTriangle,
  Tag,
  FileText,
  Paperclip,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { URGENCY_LEVELS } from "@/lib/intervention-data"
import { InterventionTypeCombobox } from "@/components/intervention/intervention-type-combobox"
import { useInterventionTypes } from "@/hooks/use-intervention-types"
import { generateInterventionId } from "@/lib/id-utils"
import { logger } from '@/lib/logger'
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { tenantInterventionSteps } from "@/lib/step-configurations"
import { InterventionConfirmationSummary, type InterventionConfirmationData } from "@/components/interventions/intervention-confirmation-summary"
import { useInterventionUpload, DOCUMENT_TYPES } from "@/hooks/use-intervention-upload"
import { InterventionFileAttachment } from "@/components/intervention/intervention-file-attachment"
import { toast } from "sonner"
// Props from server component
interface NouvelleDemandPageProps {
  userId: string
  userRole: string
  teamId?: string
  tenantLots: Array<{
    id: string
    apartment_number?: string
    reference: string
    building?: {
      id: string
      name: string
      address_record?: {
        street?: string
        postal_code?: string
        city?: string
      } | null
    }
    surface_area?: number
  }>
}

export default function NouvelleDemandePage({
  userId,
  userRole,
  teamId,
  tenantLots
}: NouvelleDemandPageProps) {
  const router = useRouter()
  const { getTypeLabel } = useInterventionTypes()

  // State for the form
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLogement, setSelectedLogement] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: "",
    urgence: "normale",
    description: "",
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createdInterventionId, setCreatedInterventionId] = useState<string | null>(null)
  const [creationError, setCreationError] = useState<string | null>(null)

  // File upload hook
  const fileUpload = useInterventionUpload({
    onUploadError: (error) => {
      toast.error("Erreur")
    }
  })

  // Détermine si on doit afficher l'étape de sélection du logement
  const shouldSkipStepOne = useMemo(() => {
    return tenantLots.length === 1
  }, [tenantLots])

  // Steps dynamiques selon le nombre de lots
  const steps = useMemo(() => {
    if (shouldSkipStepOne) {
      return tenantInterventionSteps.slice(1) // Demande + Confirmation
    }
    return tenantInterventionSteps // Tous les steps
  }, [shouldSkipStepOne])

  // Transform lots data for display (from server props)
  const logements = useMemo(() => {
    return tenantLots.map(lot => {
      // Format address from address_record
      const addressRecord = lot.building?.address_record
      const addressParts = addressRecord
        ? [addressRecord.street, addressRecord.postal_code, addressRecord.city].filter(Boolean)
        : []
      const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : "Lot indépendant"

      return {
        id: lot.id,
        name: lot.apartment_number || `Lot ${lot.reference}`,
        address: formattedAddress,
        surface: lot.surface_area ? `${lot.surface_area}m²` : "Surface non spécifiée",
        building: lot.building?.name || `Lot ${lot.reference}`,
        interventions: "Aucune intervention active",
        reference: lot.reference,
        building_id: lot.building?.id || null
      }
    })
  }, [tenantLots])

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

  // Moved before conditional return to respect React hooks rules
  const selectedLogementData = logements.find((l) => l.id === selectedLogement)

  // Génère automatiquement le titre de l'intervention
  // Moved before conditional return to respect React hooks rules
  const generateTitle = useMemo(() => {
    return () => {
      if (!formData.type || !selectedLogementData) return ""

      const typeLabel = getTypeLabel(formData.type)
      const lotRef = selectedLogementData.reference || selectedLogementData.name
      const urgencyMap: Record<string, string> = {
        'basse': 'Basse',
        'normale': 'Normale',
        'haute': 'Haute',
        'urgente': 'Urgente',
      }
      const urgencyLabel = urgencyMap[formData.urgence] || 'Normale'

      return `${typeLabel} - ${lotRef} (${urgencyLabel})`
    }
  }, [formData.type, formData.urgence, selectedLogementData, getTypeLabel])

  // Conditional return for no lots
  if (tenantLots.length === 0) {
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
    // L'utilisateur cliquera sur "Sélectionner ce logement" pour avancer
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
        title: generateTitle(),
        description: formData.description,
        type: formData.type, // ✅ Obligatoire
        urgency: formData.urgence || 'normale',
        lot_id: selectedLogement, // Use the selected lot ID
        teamId: teamId  // Pass teamId from server props
      }

      logger.info("🔧 Creating intervention with data:", interventionData)

      // Create FormData to handle files
      const formDataToSend = new FormData()

      // Add intervention data as JSON
      formDataToSend.append('interventionData', JSON.stringify(interventionData))

      // Add files
      fileUpload.files.forEach((fileWithPreview, index) => {
        formDataToSend.append(`file_${index}`, fileWithPreview.file)
        // Also send metadata for each file
        formDataToSend.append(`file_${index}_metadata`, JSON.stringify({
          id: fileWithPreview.id,
          name: fileWithPreview.file.name,
          size: fileWithPreview.file.size,
          type: fileWithPreview.file.type,
          documentType: fileWithPreview.documentType
        }))
      })

      // Add file count for easier processing on backend
      formDataToSend.append('fileCount', fileUpload.files.length.toString())

      logger.info(`🔧 Sending intervention with ${fileUpload.files.length} files`)

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

      // ✅ Toast amélioré: feedback humain pour le persona locataire (Emma)
      toast.success("Demande envoyée !", { description: "C'est noté ! On revient vers vous sous 24h." })

      // Redirect vers la page de l'intervention pour que le locataire puisse suivre sa demande
      router.push(`/locataire/interventions/${result.intervention.id}`)

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

  // Helper pour gérer la navigation
  const handleNext = () => {
    if (currentStep === 2) {
      // Vérifier que le formulaire est valide avant de continuer
      if (!formData.description || !formData.type) return
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
    if (currentStep === 2) return formData.description && formData.type
    if (currentStep === 3) return !isCreating
    return false
  }

  // Render helpers pour chaque étape
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Choisissez le logement concerné</h2>
        <p className="text-sm text-gray-600">
          Sélectionnez le logement pour lequel vous souhaitez faire une demande.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {logements.map((logement) => (
          <Card
            key={logement.id}
            className={`border transition-colors cursor-pointer ${
              selectedLogement === logement.id
                ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/50'
                : 'hover:border-blue-300'
            }`}
            onClick={() => handleLogementSelect(logement.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Home className="h-5 w-5 text-gray-600 shrink-0" />
                <h3 className="font-semibold truncate">{logement.name}</h3>
              </div>

              {logement.address && (
                <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                  <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{logement.address}</span>
                </div>
              )}

              <p className="text-sm text-gray-600 mb-1">{logement.surface}</p>
              <p className="text-sm text-gray-500 mb-3">{logement.interventions}</p>

              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleLogementSelect(logement.id)
                }}
                className="w-full"
                variant={selectedLogement === logement.id ? "default" : "outline"}
              >
                {selectedLogement === logement.id ? "✓ Sélectionné" : "Sélectionner"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Selected Property Info - Simplified */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <Home className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="font-medium truncate">{selectedLogementData?.name}</span>
        {selectedLogementData?.address && (
          <>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <span className="text-gray-600 truncate hidden sm:inline">{selectedLogementData.address}</span>
          </>
        )}
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Détails du sinistre</h2>
          </div>

          <div className="space-y-4">
            {/* Type de problème + Urgence sur la même ligne */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type" icon={Tag} required>
                  Type de problème
                </Label>
                <div className="mt-1.5">
                  <InterventionTypeCombobox
                    value={formData.type}
                    onValueChange={(value) => handleInputChange("type", value)}
                    placeholder="Sélectionnez le type"
                    categoryFilter={["bien", "locataire"]}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="urgence" icon={AlertTriangle}>
                  Urgence <span className="text-muted-foreground font-normal">(optionnel)</span>
                </Label>
                <Select value={formData.urgence} onValueChange={(value) => handleInputChange("urgence", value)}>
                  <SelectTrigger className="mt-1.5 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <SelectValue placeholder="Sélectionnez l'urgence" />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${level.color}`}>{level.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" icon={FileText} required>
                Description détaillée
              </Label>
              <Textarea
                id="description"
                placeholder="Décrivez le problème en détail : où, quand, comment..."
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="mt-1.5 min-h-[100px] border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <Label icon={Paperclip}>
                Pièces jointes <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Photos ou documents (max 10MB/fichier)
              </p>
              <div className="mt-1.5">
                <InterventionFileAttachment
                  files={fileUpload.files}
                  onAddFiles={fileUpload.addFiles}
                  onRemoveFile={fileUpload.removeFile}
                  onUpdateFileType={fileUpload.updateFileDocumentType}
                  isUploading={fileUpload.isUploading}
                  maxFiles={10}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => {
    const confirmationData: InterventionConfirmationData = {
      variant: 'tenant', // Tenant-specific display with timeline
      logement: {
        type: 'lot',
        name: selectedLogementData?.name || '',
        building: selectedLogementData?.building,
        address: selectedLogementData?.address,
      },
      intervention: {
        title: generateTitle(),
        description: formData.description,
        category: formData.type,
        urgency: formData.urgence || 'normale',
      },
      contacts: [], // Locataire n'assigne pas de contacts
      files: fileUpload.files.map(fileWithPreview => {
        const documentTypeLabel = DOCUMENT_TYPES.find(
          type => type.value === fileWithPreview.documentType
        )?.label || fileWithPreview.documentType

        return {
          id: fileWithPreview.id,
          name: fileWithPreview.file.name,
          size: (fileWithPreview.file.size / (1024 * 1024)).toFixed(1) + ' MB',
          type: fileWithPreview.file.type,
          previewUrl: fileWithPreview.preview, // Image preview URL
          category: documentTypeLabel, // Document category for display
        }
      }),
    }

    return (
      <InterventionConfirmationSummary
        data={confirmationData}
        onBack={() => setCurrentStep(2)}
        onConfirm={handleConfirmCreation}
        currentStep={shouldSkipStepOne ? 2 : 3}
        totalSteps={shouldSkipStepOne ? 2 : 3}
        isLoading={isCreating}
        showFooter={false}
        showPlanning={false}
        showSuccessHeader={false}
        onGoToDashboard={() => router.push('/locataire/dashboard')}
      />
    )
  }

  // Calculer le subtitle pour afficher le bien sélectionné (à partir de l'étape 2)
  const getHeaderSubtitle = () => {
    if (currentStep < 2 || !selectedLogement) return undefined

    const selectedLot = logements.find(lot => lot.id === selectedLogement)
    if (selectedLot) {
      return `📍 ${selectedLot.name}`
    }

    return undefined
  }

  // Structure unifiée pour tous les steps (alignée sur le pattern gestionnaire)
  return (
    <>
      {/* Header - Sticky au niveau supérieur */}
      <StepProgressHeader
        title="Déclarer un sinistre"
        subtitle={getHeaderSubtitle()}
        backButtonText="Retour"
        onBack={() => router.push("/locataire/dashboard")}
        steps={steps}
        currentStep={shouldSkipStepOne ? currentStep - 1 : currentStep}
      />

      {/* Main Content with horizontal padding and bottom space for footer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pb-6 bg-gray-50">
        <main className="max-w-6xl mx-auto w-full pt-4">
          {/* Step 1: Sélection du logement */}
          {currentStep === 1 && !shouldSkipStepOne && renderStep1()}

          {/* Step 2: Formulaire de demande */}
          {currentStep === 2 && renderStep2()}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && renderStep3()}
        </main>
      </div>

      {/* Footer Navigation - Always visible at bottom */}
      <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2 sm:gap-3 w-full max-w-6xl mx-auto">
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
              className="w-full sm:w-auto sm:ml-auto"
            >
              <span className="sm:hidden">
                {currentStep === 1 ? "Sélectionner" : "Continuer"}
              </span>
              <span className="hidden sm:inline">
                {currentStep === 1 ? "Sélectionner ce logement" : "Continuer"}
              </span>
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirmCreation}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto sm:ml-auto disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span className="sm:hidden">Création...</span>
                  <span className="hidden sm:inline">Création en cours...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="sm:hidden">Confirmer</span>
                  <span className="hidden sm:inline">Confirmer la création</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pb-6 bg-gray-50">
        <main className="max-w-6xl mx-auto w-full pt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-28 mb-1.5" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Navigation skeleton */}
      <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-3 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-2 sm:gap-3 w-full max-w-6xl mx-auto">
          <Skeleton className="h-9 w-full sm:w-24" />
          <Skeleton className="h-9 w-full sm:w-32" />
        </div>
      </div>
    </>
  )
}

