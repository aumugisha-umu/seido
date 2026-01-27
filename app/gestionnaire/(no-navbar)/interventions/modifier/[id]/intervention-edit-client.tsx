"use client"

/**
 * Intervention Edit Client Component
 * Formulaire de modification d'intervention - Structure identique à la création
 */

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Building2, AlertTriangle, Home, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { interventionSteps } from "@/lib/step-configurations"
import { URGENCY_LEVELS } from "@/lib/intervention-data"
import { InterventionTypeCombobox } from "@/components/intervention/intervention-type-combobox"
import { AssignmentSectionV2 } from "@/components/intervention/assignment-section-v2"
import { InterventionConfirmationSummary, type InterventionConfirmationData } from "@/components/interventions/intervention-confirmation-summary"
import { InterventionFileAttachment } from "@/components/intervention/intervention-file-attachment"
import { useInterventionUpload } from "@/hooks/use-intervention-upload"
import { ContactSelector, type ContactSelectorRef } from "@/components/contact-selector"
import { updateInterventionAction } from "@/app/actions/intervention-actions"
import type { BuildingTenantsResult, ActiveTenantsResult } from "@/lib/services/domain/contract.service"

// Types
interface TimeSlot {
  id?: string
  date: string
  startTime: string
  endTime: string
}

interface Assignment {
  id: string
  user_id: string
  role: string
  provider_instructions?: string | null
  requires_confirmation?: boolean
  confirmation_status?: string | null
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface InterventionData {
  id: string
  title: string
  description: string
  type: string
  urgency: string
  status: string
  reference: string
  lot_id: string | null
  building_id: string | null
  team_id: string
  created_by: string
  instructions: string
  requires_quote: boolean
  // Mode d'assignation et confirmation
  assignment_mode?: 'single' | 'group' | 'separate'
  requires_participant_confirmation?: boolean
  // Planification
  scheduling_type?: 'fixed' | 'flexible' | 'slots'
  scheduled_date?: string | null
}

interface ExistingDocument {
  id: string
  original_filename: string
  file_size: number
  mime_type: string
  document_type: string
  storage_path: string
  uploaded_at: string
  /** URL signée pour preview/téléchargement (générée côté serveur) */
  signedUrl?: string
}

interface InterventionEditClientProps {
  initialData: {
    intervention: InterventionData
    assignments: Assignment[]
    timeSlots: any[]
    quotes: any[]
    documents: ExistingDocument[]
    lot: any | null
    building: any | null
    // Tenant data for assignment section
    tenants: ActiveTenantsResult | null
    buildingTenants: BuildingTenantsResult | null
    currentTenantIds: string[]
  }
  buildingsData: {
    buildings: any[]
    lots: any[]
    teamId: string
    userId: string
  }
  teamMembers: {
    managers: any[]
    providers: any[]
  }
  currentUserId: string
}

export default function InterventionEditClient({
  initialData,
  buildingsData,
  teamMembers,
  currentUserId,
}: InterventionEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Step state - Start at step 2 since location is read-only and shown in the blue info box
  const [currentStep, setCurrentStep] = useState(2)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Form state - pre-filled with initial data
  const [formData, setFormData] = useState({
    title: initialData.intervention.title || "",
    description: initialData.intervention.description || "",
    type: initialData.intervention.type || "",
    urgency: initialData.intervention.urgency || "normale",
  })

  // Participants state
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>(
    initialData.assignments
      .filter(a => a.role === 'gestionnaire' || a.role === 'admin')
      .map(a => a.user_id)
  )
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>(
    initialData.assignments
      .filter(a => a.role === 'prestataire')
      .map(a => a.user_id)
  )

  // Planning state - Initialiser depuis DB
  const [schedulingType, setSchedulingType] = useState<"fixed" | "slots" | "flexible">(
    initialData.intervention.scheduling_type || 'flexible'
  )
  const [fixedDateTime, setFixedDateTime] = useState(() => {
    const scheduledDate = initialData.intervention.scheduled_date
    if (scheduledDate) {
      // Parse ISO date: "2024-01-15T14:30:00.000Z" -> { date: "2024-01-15", time: "14:30" }
      const dateObj = new Date(scheduledDate)
      return {
        date: dateObj.toISOString().split('T')[0],
        time: `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`
      }
    }
    return { date: "", time: "" }
  })
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    initialData.timeSlots.map(ts => ({
      id: ts.id,
      date: ts.slot_date,  // ✅ Utiliser le nom de colonne correct (DB: slot_date)
      startTime: ts.start_time,
      endTime: ts.end_time,
    }))
  )
  const [globalMessage, setGlobalMessage] = useState(initialData.intervention.instructions || "")
  const [expectsQuote, setExpectsQuote] = useState(initialData.intervention.requires_quote || false)

  // Mode d'assignation - Initialiser depuis DB
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'group' | 'separate'>(
    initialData.intervention.assignment_mode || 'single'
  )

  // Instructions par prestataire - Initialiser depuis assignments
  const [providerInstructions, setProviderInstructions] = useState<Record<string, string>>(() => {
    const instructions: Record<string, string> = {}
    for (const assignment of initialData.assignments) {
      if (assignment.role === 'prestataire' && assignment.provider_instructions) {
        instructions[assignment.user_id] = assignment.provider_instructions
      }
    }
    return instructions
  })

  // États de confirmation - Initialiser depuis DB
  const [requiresConfirmation, setRequiresConfirmation] = useState(
    initialData.intervention.requires_participant_confirmation || false
  )
  const [confirmationRequired, setConfirmationRequired] = useState<string[]>(() =>
    initialData.assignments
      .filter(a => a.requires_confirmation)
      .map(a => a.user_id)
  )

  // Documents existants - IDs des documents à supprimer
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([])

  // Handler pour marquer un document existant pour suppression
  const handleRemoveExistingDocument = (documentId: string) => {
    setDocumentsToDelete(prev => [...prev, documentId])
  }

  // Tenant states - Initialize based on existing assignments OR property occupancy
  const [includeTenants, setIncludeTenants] = useState<boolean>(() => {
    // If tenants are already assigned, keep them included
    const hasExistingTenants = initialData.currentTenantIds.length > 0
    // Or if the lot is occupied / building has active tenants
    const isLotOccupied = initialData.lot?.is_occupied === true
    const hasBuildingTenants = initialData.buildingTenants?.hasActiveTenants === true
    return hasExistingTenants || isLotOccupied || hasBuildingTenants
  })

  // ✅ Utiliser Array au lieu de Set pour éviter les re-renders inutiles (Set comparé par référence)
  const [excludedLotIds, setExcludedLotIds] = useState<string[]>(() => {
    // For building interventions: determine which lots are currently excluded
    if (initialData.buildingTenants) {
      const currentTenantUserIds = new Set(initialData.currentTenantIds)
      const excludedLots: string[] = []

      for (const lotGroup of initialData.buildingTenants.byLot) {
        // If none of this lot's tenants are assigned, it's excluded
        const hasAssignedTenant = lotGroup.tenants.some(t =>
          currentTenantUserIds.has(t.user_id)
        )
        if (!hasAssignedTenant) {
          excludedLots.push(lotGroup.lotId)
        }
      }
      return excludedLots
    }
    return []
  })

  // Handler for lot toggle (building interventions)
  const handleLotToggle = (lotId: string) => {
    setExcludedLotIds(prev =>
      prev.includes(lotId)
        ? prev.filter(id => id !== lotId)
        : [...prev, lotId]
    )
  }

  // File upload - pass interventionId for existing intervention
  const fileUpload = useInterventionUpload({
    interventionId: initialData.intervention.id,
  })

  // Managers and providers from team members
  const managers = teamMembers.managers.map(m => ({
    id: m.user_id,  // user_id is always present in TeamMember
    name: m.user?.name || m.name || 'Gestionnaire',
    email: m.user?.email || m.email || '',
    role: 'gestionnaire',
  }))

  const providers = teamMembers.providers.map(p => ({
    id: p.user_id,  // user_id is always present in TeamMember
    name: p.user?.name || p.name || 'Prestataire',
    email: p.user?.email || p.email || '',
    role: 'prestataire',
  }))

  // Navigation handlers
  // Skip step 1 (location is read-only), so step 2 goes back to previous page
  const handleBack = () => {
    if (currentStep > 2) {
      setCurrentStep(currentStep - 1)
    } else {
      router.back()
    }
  }

  const handleNext = () => {
    const validation = validateCurrentStep()
    if (!validation.valid) {
      toast({
        title: "Champs requis",
        description: validation.message,
        variant: "destructive",
      })
      return
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Validation
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return { valid: true, message: "" }
      case 2:
        if (!formData.title.trim()) {
          return { valid: false, message: "Le titre est requis" }
        }
        if (!formData.type) {
          return { valid: false, message: "La catégorie d'intervention est requise" }
        }
        if (!formData.urgency) {
          return { valid: false, message: "L'urgence est requise" }
        }
        return { valid: true, message: "" }
      case 3:
        if (selectedManagerIds.length === 0) {
          return { valid: false, message: "Au moins un gestionnaire doit être sélectionné" }
        }
        return { valid: true, message: "" }
      case 4:
        return { valid: true, message: "" }
      default:
        return { valid: true, message: "" }
    }
  }

  // Contact handlers
  const handleManagerSelect = (managerId: string) => {
    setSelectedManagerIds(prev =>
      prev.includes(managerId)
        ? prev.filter(id => id !== managerId)
        : [...prev, managerId]
    )
  }

  const handleProviderSelect = (providerId: string) => {
    setSelectedProviderIds(prev =>
      prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
    )
  }

  const handleContactCreated = (contact: any) => {
    // Refresh the contacts list if needed
    toast({
      title: "Contact créé",
      description: `${contact.name} a été ajouté`,
    })
  }

  // Time slots handlers
  const addTimeSlot = (slot?: { date: string; startTime: string; endTime: string }) => {
    setTimeSlots([
      ...timeSlots,
      slot || {
        date: new Date().toISOString().split('T')[0],
        startTime: "09:00",
        endTime: "12:00",
      },
    ])
  }

  const updateTimeSlot = (index: number, field: string, value: string) => {
    const updated = [...timeSlots]
    updated[index] = { ...updated[index], [field]: value }
    setTimeSlots(updated)
  }

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  // Save handler
  const handleSave = async () => {
    setIsSaving(true)
    setError("")

    try {
      // Calculate tenant user IDs to include
      let tenantUserIds: string[] = []

      if (includeTenants) {
        if (initialData.buildingTenants) {
          // Building: get tenants from included lots (exclude lots in excludedLotIds)
          tenantUserIds = initialData.buildingTenants.byLot
            .filter(lot => !excludedLotIds.includes(lot.lotId))
            .flatMap(lot => lot.tenants.map(t => t.user_id))
          // Deduplicate
          tenantUserIds = [...new Set(tenantUserIds)]
        } else if (initialData.tenants) {
          // Lot: get all tenants
          tenantUserIds = initialData.tenants.tenants.map(t => t.user_id)
        }
      }

      const result = await updateInterventionAction(initialData.intervention.id, {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        urgency: formData.urgency,
        provider_guidelines: globalMessage,
        requires_quote: expectsQuote,
        assignedManagerIds: selectedManagerIds,
        assignedProviderIds: selectedProviderIds,
        assignedTenantIds: tenantUserIds,
        timeSlots: timeSlots.map(ts => ({
          id: ts.id,  // ✅ Inclure l'ID pour permettre l'upsert intelligent côté serveur
          slot_date: ts.date,
          start_time: ts.startTime,
          end_time: ts.endTime,
        })),
        // Mode d'assignation et confirmation
        assignment_mode: selectedProviderIds.length > 1 ? assignmentMode : 'single',
        requires_participant_confirmation:
          (schedulingType === 'fixed' && requiresConfirmation) ||
          schedulingType === 'slots',
        providerInstructions: assignmentMode === 'separate' ? providerInstructions : undefined,
        confirmationRequiredUserIds: confirmationRequired,
        // Documents à supprimer
        documentsToDelete: documentsToDelete.length > 0 ? documentsToDelete : undefined,
        // Planification
        scheduling_type: schedulingType,
        scheduled_date: schedulingType === 'fixed' && fixedDateTime.date && fixedDateTime.time
          ? `${fixedDateTime.date}T${fixedDateTime.time}:00`
          : null,
      })

      if (result.success) {
        toast({
          title: "Intervention modifiée",
          description: "Les modifications ont été enregistrées avec succès",
        })
        router.push(`/gestionnaire/interventions/${initialData.intervention.id}`)
      } else {
        setError(result.error || "Erreur lors de la modification")
        toast({
          title: "Erreur",
          description: result.error || "Impossible de modifier l'intervention",
          variant: "destructive",
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue"
      setError(message)
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Get selected contacts for confirmation summary
  const getSelectedContacts = () => {
    const selectedManagers = managers
      .filter(m => selectedManagerIds.includes(m.id))
      .map(m => ({
        ...m,
        isCurrentUser: m.id === currentUserId,
      }))

    const selectedProviders = providers
      .filter(p => selectedProviderIds.includes(p.id))

    // ✅ Inclure les locataires sélectionnés (même logique que handleSave)
    let selectedTenants: Array<{ id: string; name: string; email: string; role: string }> = []

    if (includeTenants) {
      if (initialData.buildingTenants) {
        // Immeuble : locataires des lots non-exclus
        selectedTenants = initialData.buildingTenants.byLot
          .filter(lot => !excludedLotIds.includes(lot.lotId))
          .flatMap(lot => lot.tenants.map(t => ({
            id: t.user_id,
            name: t.name,
            email: t.email || '',
            role: 'locataire'
          })))
      } else if (tenantsForSection.length > 0) {
        // Lot : tous les locataires
        selectedTenants = tenantsForSection.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email || '',
          role: 'locataire'
        }))
      }
    }

    return [...selectedManagers, ...selectedProviders, ...selectedTenants]
  }

  // Get header subtitle
  const getHeaderSubtitle = () => {
    if (initialData.lot) {
      return `Lot ${initialData.lot.reference}`
    }
    if (initialData.building) {
      return initialData.building.name
    }
    return initialData.intervention.reference
  }

  // Prepare tenants data for AssignmentSectionV2
  const tenantsForSection = initialData.tenants?.tenants?.map((t) => ({
    id: t.user_id,
    name: t.name,
    email: t.email || '',
    phone: t.phone || '',
    type: 'locataire' as const
  })) || []

  const isLotOccupied = initialData.lot?.is_occupied === true
  const hasBuildingTenants = initialData.buildingTenants?.hasActiveTenants === true
  const showTenantsSection = isLotOccupied || hasBuildingTenants

  return (
    <>
      {/* Header - Sticky au niveau supérieur */}
      <StepProgressHeader
        title="Modifier l'intervention"
        subtitle={getHeaderSubtitle()}
        backButtonText="Retour"
        onBack={() => router.back()}
        steps={interventionSteps}
        currentStep={currentStep}
        onStepClick={(step) => setCurrentStep(step)}
        allowFutureSteps={true}
      />

      {/* Main Content with horizontal padding and bottom space for footer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pb-10 bg-background">
        <main className="content-max-width w-full pt-10">
          {/* Step 2: Formulaire de description (location integrated into Détails card) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Détails de l'intervention - avec localisation intégrée */}
              <Card>
                <CardContent className="p-0 flex flex-col gap-6">
                  {/* Header avec titre + localisation compacte */}
                  <div className="flex flex-col gap-3">
                    {/* Titre de la card */}
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-orange-500" />
                      <h3 className="text-lg font-medium">Détails de l'intervention</h3>
                    </div>

                    {/* Localisation compacte (lecture seule) */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {initialData.lot
                            ? (initialData.building?.name
                              ? `${initialData.building.name} › Lot ${initialData.lot.reference}`
                              : `Lot ${initialData.lot.reference}`)
                            : initialData.building?.name || 'Non défini'}
                        </span>
                        {initialData.building?.address && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{initialData.building.address}</span>
                          </>
                        )}

                        {/* Badge occupation (lots uniquement) */}
                        {initialData.lot && (
                          <Badge variant={initialData.lot.is_occupied ? "default" : "secondary"} className="ml-1">
                            {initialData.lot.is_occupied ? "Occupé" : "Vacant"}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">Non modifiable</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 flex-1">
                    <h4 className="font-medium">Décrire l'intervention</h4>
                    {/* Titre (2/3) + Type & Urgence (1/3) */}
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                      {/* Titre */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Titre du problème *</label>
                        <Input
                          placeholder="Ex: Fuite d'eau dans la salle de bain"
                          value={formData.title}
                          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                          className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      {/* Type + Urgence */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Catégorie d'intervention <span className="text-red-500">*</span>
                          </label>
                          <InterventionTypeCombobox
                            value={formData.type}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                            placeholder="Sélectionnez la catégorie"
                            className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 w-full"
                          />
                        </div>

                        <div className="min-w-0">
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Urgence <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={formData.urgency}
                            onValueChange={(value) => setFormData((prev) => ({ ...prev, urgency: value }))}
                          >
                            <SelectTrigger className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 w-full">
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
                      </div>
                    </div>

                    {/* Description + File Uploader */}
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Description détaillée</label>
                        <Textarea
                          placeholder="Décrivez le problème en détail : où, quand, comment..."
                          value={formData.description}
                          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                          className="min-h-[280px] border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>

                      <div className="h-[280px]">
                        <label className="block text-sm font-medium text-foreground mb-2">Fichiers joints (optionnel)</label>
                        <InterventionFileAttachment
                          files={fileUpload.files}
                          onAddFiles={fileUpload.addFiles}
                          onRemoveFile={fileUpload.removeFile}
                          onUpdateFileType={fileUpload.updateFileDocumentType}
                          isUploading={fileUpload.isUploading}
                          maxFiles={10}
                          className="h-[252px]"
                          // Mode édition : documents existants
                          existingDocuments={initialData.documents}
                          onRemoveExistingDocument={handleRemoveExistingDocument}
                          documentsToDelete={documentsToDelete}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Contacts */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <Card className="p-6">
                <AssignmentSectionV2
                  managers={managers as any[]}
                  providers={providers as any[]}
                  tenants={tenantsForSection}
                  selectedManagerIds={selectedManagerIds}
                  selectedProviderIds={selectedProviderIds}
                  onManagerSelect={handleManagerSelect}
                  onProviderSelect={handleProviderSelect}
                  onContactCreated={handleContactCreated}
                  schedulingType={schedulingType}
                  onSchedulingTypeChange={setSchedulingType}
                  fixedDateTime={fixedDateTime}
                  onFixedDateTimeChange={setFixedDateTime}
                  timeSlots={timeSlots}
                  onAddTimeSlot={addTimeSlot}
                  onUpdateTimeSlot={(index, field, value) => updateTimeSlot(index, field as string, value)}
                  onRemoveTimeSlot={removeTimeSlot}
                  expectsQuote={expectsQuote}
                  onExpectsQuoteChange={setExpectsQuote}
                  globalMessage={globalMessage}
                  onGlobalMessageChange={setGlobalMessage}
                  teamId={buildingsData.teamId}
                  isLoading={false}
                  contactSelectorRef={contactSelectorRef}
                  assignmentMode={assignmentMode}
                  onAssignmentModeChange={setAssignmentMode}
                  providerInstructions={providerInstructions}
                  onProviderInstructionsChange={(providerId, instructions) => {
                    setProviderInstructions(prev => ({
                      ...prev,
                      [providerId]: instructions
                    }))
                  }}
                  // Tenant props
                  showTenantsSection={showTenantsSection}
                  includeTenants={includeTenants}
                  onIncludeTenantsChange={setIncludeTenants}
                  buildingTenants={initialData.buildingTenants}
                  loadingBuildingTenants={false}
                  excludedLotIds={excludedLotIds}
                  onLotToggle={handleLotToggle}
                  // Confirmation props
                  requiresConfirmation={requiresConfirmation}
                  onRequiresConfirmationChange={setRequiresConfirmation}
                  confirmationRequired={confirmationRequired}
                  onConfirmationRequiredChange={(userId, required) => {
                    setConfirmationRequired(prev =>
                      required ? [...prev, userId] : prev.filter(id => id !== userId)
                    )
                  }}
                />
              </Card>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 &&
            (() => {
              const confirmationData: InterventionConfirmationData = {
                logement: {
                  type: initialData.lot ? initialData.lot.reference : 'Bâtiment entier',
                  name: initialData.lot?.reference || initialData.building?.name || '',
                  building: initialData.building?.name,
                  address: initialData.building?.address,
                },
                intervention: {
                  title: formData.title,
                  description: formData.description,
                  category: formData.type,
                  urgency: formData.urgency,
                },
                contacts: getSelectedContacts().map(contact => ({
                  id: contact.id.toString(),
                  name: contact.name,
                  email: contact.email,
                  // ✅ Mapper correctement les 3 rôles possibles
                  role: contact.role === 'gestionnaire' ? 'Gestionnaire'
                    : contact.role === 'locataire' ? 'Locataire'
                      : 'Prestataire',
                  isCurrentUser: (contact as any).isCurrentUser,
                })),
                scheduling:
                  schedulingType === 'slots' && timeSlots.length > 0
                    ? {
                      type: 'slots' as const,
                      slots: timeSlots.map(slot => ({
                        date: slot.date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      })),
                    }
                    : schedulingType === 'fixed' && fixedDateTime.date
                      ? {
                        type: 'immediate' as const,
                        slots: [{
                          date: fixedDateTime.date,
                          startTime: fixedDateTime.time || '09:00',
                          endTime: fixedDateTime.time || '09:00', // Pas de range
                        }],
                      }
                      : { type: 'flexible' as const },
                instructions: globalMessage
                  ? {
                    type: 'global' as const,
                    globalMessage,
                  }
                  : undefined,
                files: [
                  // Documents existants (non supprimés)
                  ...initialData.documents
                    .filter(doc => !documentsToDelete.includes(doc.id))
                    .map(doc => ({
                      id: doc.id,
                      name: doc.original_filename,
                      size: (doc.file_size / (1024 * 1024)).toFixed(1) + ' MB',
                    })),
                  // Nouveaux fichiers
                  ...fileUpload.files.map(f => ({
                    id: f.id,
                    name: f.file.name,
                    size: (f.file.size / (1024 * 1024)).toFixed(1) + ' MB',
                  })),
                ],
                expectsQuote,
                assignmentMode: selectedProviderIds.length > 1 ? assignmentMode : 'single',
                providerInstructions: assignmentMode === 'separate' ? providerInstructions : undefined,
                // Données de confirmation des participants
                requiresParticipantConfirmation:
                  (schedulingType === 'fixed' && requiresConfirmation) ||
                  schedulingType === 'slots',
                confirmationRequiredUserIds: confirmationRequired,
              }

              return (
                <InterventionConfirmationSummary
                  data={confirmationData}
                  onBack={() => setCurrentStep(3)}
                  onConfirm={handleSave}
                  currentStep={4}
                  totalSteps={4}
                  isLoading={isSaving}
                  showFooter={true} // ✅ Utiliser le footer du composant
                  confirmLabel="Enregistrer les modifications" // ✅ Label personnalisé
                  loadingLabel="Enregistrement..."
                />
              )
            })()}

          {/* Error display */}
          {currentStep === 4 && error && (
            <Card className="border-l-4 border-l-red-500 mt-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 font-medium">Erreur</p>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Footer Navigation - Hidden for Step 4 since component has its own */}
      {currentStep !== 4 && (
        <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
          <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
            {/* Back Button */}
            {currentStep > 2 ? (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
            )}

            {/* Next Button */}
            <Button
              onClick={() => handleNext()}
              disabled={!validateCurrentStep().valid || isSaving}
              className="w-full sm:w-auto ml-auto"
            >
              {currentStep === 1 && "Continuer"}
              {currentStep === 2 && "Continuer"}
              {currentStep === 3 && "Continuer"}
            </Button>
          </div>
        </div>
      )}

      {/* Contact Selector Modal */}
      <ContactSelector
        ref={contactSelectorRef}
        teamId={buildingsData.teamId}
        displayMode="compact"
        hideUI={true}
        selectedContacts={{
          manager: managers.filter((m) => selectedManagerIds.includes(m.id)),
          provider: providers.filter((p) => selectedProviderIds.includes(p.id))
        }}
        onContactSelected={(contact, contactType) => {
          if (contactType === 'manager') {
            handleManagerSelect(contact.id)
          } else if (contactType === 'provider') {
            handleProviderSelect(contact.id)
          }
        }}
        onContactCreated={(contact) => {
          handleContactCreated(contact)
        }}
        onContactRemoved={(contactId, contactType) => {
          if (contactType === 'manager') {
            handleManagerSelect(contactId)
          } else if (contactType === 'provider') {
            handleProviderSelect(contactId)
          }
        }}
      />
    </>
  )
}
