"use client"

/**
 * Intervention Edit Client Component
 * Formulaire de modification d'intervention - Structure identique à la création
 */

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Building2, AlertTriangle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { interventionSteps } from "@/lib/step-configurations"
import { PROBLEM_TYPES, URGENCY_LEVELS } from "@/lib/intervention-data"
import { AssignmentSectionV2 } from "@/components/intervention/assignment-section-v2"
import { InterventionConfirmationSummary, type InterventionConfirmationData } from "@/components/interventions/intervention-confirmation-summary"
import { InterventionFileAttachment } from "@/components/intervention/intervention-file-attachment"
import { useInterventionUpload } from "@/hooks/use-intervention-upload"
import { ContactSelector, type ContactSelectorRef } from "@/components/contact-selector"
import { updateInterventionAction } from "@/app/actions/intervention-actions"

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
  require_quote: boolean
}

interface InterventionEditClientProps {
  initialData: {
    intervention: InterventionData
    assignments: Assignment[]
    timeSlots: any[]
    quotes: any[]
    lot: any | null
    building: any | null
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

  // Planning state
  const [schedulingType, setSchedulingType] = useState<"fixed" | "slots" | "flexible">(
    initialData.timeSlots.length > 0 ? "slots" : "flexible"
  )
  const [fixedDateTime, setFixedDateTime] = useState({ date: "", time: "" })
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    initialData.timeSlots.map(ts => ({
      id: ts.id,
      date: ts.proposed_date || ts.slot_date,
      startTime: ts.start_time,
      endTime: ts.end_time,
    }))
  )
  const [globalMessage, setGlobalMessage] = useState(initialData.intervention.instructions || "")
  const [expectsQuote, setExpectsQuote] = useState(initialData.intervention.require_quote || false)
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'group' | 'separate'>('single')
  const [providerInstructions, setProviderInstructions] = useState<Record<string, string>>({})

  // File upload - pass interventionId for existing intervention
  const fileUpload = useInterventionUpload({
    interventionId: initialData.intervention.id,
  })

  // Managers and providers from team members
  const managers = teamMembers.managers.map(m => ({
    id: m.user?.id || m.id,
    name: m.user?.name || m.name,
    email: m.user?.email || m.email,
    role: 'gestionnaire',
  }))

  const providers = teamMembers.providers.map(p => ({
    id: p.user?.id || p.id,
    name: p.user?.name || p.name,
    email: p.user?.email || p.email,
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
        if (!formData.description.trim()) {
          return { valid: false, message: "La description est requise" }
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
  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      {
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
      const result = await updateInterventionAction(initialData.intervention.id, {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        urgency: formData.urgency,
        instructions: globalMessage,
        require_quote: expectsQuote,
        assignedManagerIds: selectedManagerIds,
        assignedProviderIds: selectedProviderIds,
        timeSlots: timeSlots.map(ts => ({
          proposed_date: ts.date,
          start_time: ts.startTime,
          end_time: ts.endTime,
        })),
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

    return [...selectedManagers, ...selectedProviders]
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
      />

      {/* Main Content with horizontal padding and bottom space for footer */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pb-10 bg-background">
        <main className="content-max-width w-full pt-10">
          {/* Step 2: Formulaire de description (first step - location is shown in blue info box) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Encadré Bien Concerné (lecture seule) */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        {initialData.lot
                          ? `Lot ${initialData.lot.reference}`
                          : initialData.building?.name || 'Non défini'}
                      </span>
                      {initialData.building?.address && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">{initialData.building.address}</span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Non modifiable</span>
                  </div>
                </CardContent>
              </Card>

              {/* Détails de l'intervention */}
              <Card>
              <CardContent className="p-0 flex flex-col gap-6">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-medium">Détails de l'intervention</h3>
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
                        <label className="block text-sm font-medium text-foreground mb-2">Type de problème</label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 w-full">
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
                      <label className="block text-sm font-medium text-foreground mb-2">Description détaillée *</label>
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
                  tenants={[]}
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
                  role: contact.role === 'gestionnaire' ? 'Gestionnaire' : 'Prestataire',
                  isCurrentUser: (contact as any).isCurrentUser,
                })),
                scheduling: schedulingType === 'slots' && timeSlots.length > 0
                  ? {
                      type: 'slots' as const,
                      slots: timeSlots.map(slot => ({
                        date: slot.date,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                      })),
                    }
                  : { type: 'flexible' as const },
                instructions: globalMessage
                  ? {
                      type: 'global' as const,
                      globalMessage,
                    }
                  : undefined,
                files: fileUpload.files.map(f => ({
                  id: f.id,
                  name: f.file.name,
                  size: (f.file.size / (1024 * 1024)).toFixed(1) + ' MB',
                })),
                expectsQuote,
                assignmentMode: selectedProviderIds.length > 1 ? assignmentMode : 'single',
                providerInstructions: assignmentMode === 'separate' ? providerInstructions : undefined,
              }

              return (
                <InterventionConfirmationSummary
                  data={confirmationData}
                  onBack={() => setCurrentStep(3)}
                  onConfirm={handleSave}
                  currentStep={4}
                  totalSteps={4}
                  isLoading={isSaving}
                  showFooter={false}
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

      {/* Footer Navigation - Always visible at bottom */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
          {/* Back Button - Step 2 shows "Annuler" since it's the first step (location is read-only) */}
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

          {/* Next/Submit Button */}
          <Button
            onClick={() => {
              if (currentStep === 4) {
                handleSave()
              } else {
                handleNext()
              }
            }}
            disabled={!validateCurrentStep().valid || isSaving}
            className={`w-full sm:w-auto ml-auto ${
              currentStep === 4 ? 'bg-green-600 hover:bg-green-700' : ''
            }`}
          >
            {isSaving && currentStep === 4 ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                {currentStep === 4 && <CheckCircle className="h-4 w-4 mr-2" />}
                {currentStep === 1 && "Continuer"}
                {currentStep === 2 && "Continuer"}
                {currentStep === 3 && "Continuer"}
                {currentStep === 4 && "Enregistrer les modifications"}
              </>
            )}
          </Button>
        </div>
      </div>

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
