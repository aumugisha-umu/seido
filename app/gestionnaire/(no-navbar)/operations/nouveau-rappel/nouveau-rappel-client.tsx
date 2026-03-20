'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StepProgressHeader } from '@/components/ui/step-progress-header'
import { reminderSteps } from '@/lib/step-configurations'
import { createReminderAction } from '@/app/actions/reminder-actions'
import { getTeamGestionnairesAction } from '@/app/actions/email-conversation-actions'
import PropertySelector from '@/components/property-selector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Building2,
  Home,
  CalendarIcon,
  Flag,
  User,
  FileText,
  CheckCircle,
  Loader2,
  Repeat,
  ClipboardList,
  LinkIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RecurrenceConfig, buildRecurrenceSummary } from '@/components/recurrence/recurrence-config'

// ============================================================================
// TYPES
// ============================================================================

interface TeamGestionnaire {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  role: string
}

interface Building {
  id: string
  name: string
  lots?: Lot[]
  address_record?: {
    formatted_address?: string | null
    street?: string | null
    city?: string | null
  } | null
  [key: string]: unknown
}

interface Lot {
  id: string
  name: string
  building_id?: string | null
  building_name?: string | null
  [key: string]: unknown
}

interface NouveauRappelClientProps {
  buildings: Building[]
  lots: Lot[]
  teamId: string
  userId: string
}

type Priority = 'basse' | 'normale' | 'haute'

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; badgeVariant: 'secondary' | 'default' | 'destructive' }> = {
  basse: { label: 'Basse', color: 'bg-gray-100 text-gray-700 border-gray-200', badgeVariant: 'secondary' },
  normale: { label: 'Normale', color: 'bg-blue-100 text-blue-700 border-blue-200', badgeVariant: 'default' },
  haute: { label: 'Haute', color: 'bg-red-100 text-red-700 border-red-200', badgeVariant: 'destructive' },
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function NouveauRappelClient({
  buildings,
  lots,
  teamId,
  userId,
}: NouveauRappelClientProps) {
  const router = useRouter()

  // Step state
  const [currentStep, setCurrentStep] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)

  // Step 1: Property linking
  const [linkToProperty, setLinkToProperty] = useState(false)
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)

  // Step 2: Reminder details
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>('normale')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)

  // Team members for assignment
  const [teamMembers, setTeamMembers] = useState<TeamGestionnaire[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Recurrence state
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false)
  const [rruleString, setRruleString] = useState('')

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load team gestionnaires on mount
  useEffect(() => {
    const loadMembers = async () => {
      setMembersLoading(true)
      const result = await getTeamGestionnairesAction(teamId)
      if (result.success) {
        setTeamMembers(result.data)
        // Pre-select current user
        const currentUser = result.data.find((m) => m.id === userId)
        if (currentUser) {
          setAssignedTo(currentUser.id)
        }
      }
      setMembersLoading(false)
    }
    loadMembers()
  }, [teamId, userId])

  // Clear property selection when toggle is off
  useEffect(() => {
    if (!linkToProperty) {
      setSelectedBuildingId(null)
      setSelectedLotId(null)
    }
  }, [linkToProperty])

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleBuildingSelect = useCallback((buildingId: string | null) => {
    setSelectedBuildingId(buildingId)
    // Clear lot when building changes (XOR constraint)
    setSelectedLotId(null)
  }, [])

  const handleLotSelect = useCallback((lotId: string | null) => {
    setSelectedLotId(lotId)
    // Clear building when lot is selected (XOR constraint)
    if (lotId) {
      setSelectedBuildingId(null)
    }
  }, [])

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      router.push('/gestionnaire/operations')
    } else {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep, router])

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1
      setMaxStepReached((max) => Math.max(max, next))
      return next
    })
  }, [])

  const handleStepClick = useCallback((step: number) => {
    if (step <= maxStepReached) {
      setCurrentStep(step)
    }
  }, [maxStepReached])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const formData = new FormData()
    formData.set('title', title)
    if (description) formData.set('description', description)
    if (dueDate) formData.set('due_date', new Date(dueDate).toISOString())
    formData.set('priority', priority)
    if (assignedTo) formData.set('assigned_to', assignedTo)
    if (selectedBuildingId) formData.set('building_id', selectedBuildingId)
    if (selectedLotId) formData.set('lot_id', selectedLotId)
    if (recurrenceEnabled && rruleString) {
      formData.set('rrule', rruleString)
      formData.set('recurrence_auto_create', 'true')
    }

    const result = await createReminderAction(formData)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Rappel créé avec succès')
      router.push('/gestionnaire/operations')
    } else {
      toast.error('Erreur', { description: result.error })
    }
  }

  // ── Validation ────────────────────────────────────────────────────────

  const isStep2Valid = title.trim().length > 0

  const isCurrentStepValid = () => {
    if (currentStep === 1) return true
    if (currentStep === 2) return isStep2Valid
    if (currentStep === 3) return isStep2Valid
    return false
  }

  // ── Derived data for summary ──────────────────────────────────────────

  const selectedBuilding = selectedBuildingId
    ? buildings.find((b) => b.id === selectedBuildingId)
    : null

  const selectedLot = selectedLotId
    ? lots.find((l) => l.id === selectedLotId)
    : null

  const assignedMember = assignedTo
    ? teamMembers.find((m) => m.id === assignedTo)
    : null

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header with step progress */}
      <StepProgressHeader
        title="Nouveau rappel"
        onBack={handleBack}
        backButtonText="Retour"
        steps={reminderSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        maxReachableStep={maxStepReached}
      />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pb-10 bg-background">
        <main className="content-max-width w-full pt-10">

        {/* ─── Step 1: Bien (Property) ─────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <LinkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Lier à un bien</h3>
                    <p className="text-sm text-muted-foreground">Associer ce rappel à un immeuble ou un lot</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <label
                    htmlFor="link-property-toggle"
                    className="block text-sm font-medium text-foreground"
                  >
                    Activer la liaison à un bien
                  </label>
                  <Switch
                    id="link-property-toggle"
                    checked={linkToProperty}
                    onCheckedChange={setLinkToProperty}
                    aria-label="Lier à un bien"
                  />
                </div>

                {linkToProperty && (
                  <div className="pt-2">
                    <PropertySelector
                      mode="select"
                      onBuildingSelect={handleBuildingSelect}
                      onLotSelect={handleLotSelect}
                      selectedBuildingId={selectedBuildingId ?? undefined}
                      selectedLotId={selectedLotId ?? undefined}
                      showActions={false}
                      initialData={{
                        buildings,
                        lots,
                        teamId,
                      }}
                      showViewToggle={true}
                      compactCards={true}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Step 2: Rappel (Details) ────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Détails du rappel</h3>
                    <p className="text-sm text-muted-foreground">Informations principales du rappel</p>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <label htmlFor="reminder-title" className="block text-sm font-medium text-foreground mb-2">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="reminder-title"
                    placeholder="Ex: Vérifier la chaudière"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={255}
                    aria-required="true"
                    className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label htmlFor="reminder-description" className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <Textarea
                    id="reminder-description"
                    placeholder="Détails supplémentaires..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Due date */}
                <div className="space-y-2">
                  <label htmlFor="reminder-due-date" className="block text-sm font-medium text-foreground mb-2">
                    Date d&apos;échéance
                  </label>
                  <DatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="jj/mm/aaaa"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Priorité</label>
                  <div className="flex gap-2">
                    {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`
                          px-4 py-2 rounded-md border-2 text-sm font-medium transition-all
                          ${priority === p
                            ? PRIORITY_CONFIG[p].color + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-background text-muted-foreground border-border hover:bg-muted'
                          }
                        `}
                        aria-pressed={priority === p}
                        aria-label={`Priorité ${PRIORITY_CONFIG[p].label}`}
                      >
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignment */}
                <div className="space-y-2">
                  <label htmlFor="reminder-assignee" className="block text-sm font-medium text-foreground mb-2">
                    Assigné à
                  </label>
                  {membersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des membres...
                    </div>
                  ) : (
                    <Select
                      value={assignedTo ?? 'none'}
                      onValueChange={(val) =>
                        setAssignedTo(val === 'none' ? null : val)
                      }
                    >
                      <SelectTrigger
                        id="reminder-assignee"
                        aria-label="Assigner le rappel"
                        className="border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        <SelectValue placeholder="Sélectionner un gestionnaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigné</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name || member.email || 'Utilisateur'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Recurrence */}
                <div className="pt-2 border-t border-border">
                  <RecurrenceConfig
                    enabled={recurrenceEnabled}
                    onEnabledChange={setRecurrenceEnabled}
                    value={rruleString}
                    onChange={setRruleString}
                    referenceDate={dueDate || undefined}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── Step 3: Confirmation ────────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Récapitulatif</h3>
                    <p className="text-sm text-muted-foreground">Vérifiez les informations avant de créer le rappel</p>
                  </div>
                </div>

                {/* Property */}
                {(selectedBuilding || selectedLot) && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    {selectedBuilding ? (
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    ) : (
                      <Home className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Bien associé</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBuilding?.name || selectedLot?.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Titre</p>
                    <p className="text-sm text-muted-foreground">{title}</p>
                  </div>
                </div>

                {/* Description */}
                {description && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {description}
                      </p>
                    </div>
                  </div>
                )}

                {/* Due date */}
                {dueDate && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Échéance</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(dueDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Priority */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Flag className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Priorité</p>
                    <Badge variant={PRIORITY_CONFIG[priority].badgeVariant}>
                      {PRIORITY_CONFIG[priority].label}
                    </Badge>
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Assigné à</p>
                    <p className="text-sm text-muted-foreground">
                      {assignedMember
                        ? assignedMember.name || assignedMember.email
                        : 'Non assigné'}
                    </p>
                  </div>
                </div>

                {/* Recurrence summary */}
                {recurrenceEnabled && rruleString && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Repeat className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Récurrence</p>
                      <p className="text-sm text-muted-foreground">
                        {buildRecurrenceSummary(rruleString)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        </main>
      </div>

      {/* Sticky footer navigation */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
          {/* Back button — hidden on step 1 */}
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}

          {/* Next / Submit button */}
          <Button
            onClick={() => {
              if (currentStep === 3) {
                handleSubmit()
              } else {
                handleNext()
              }
            }}
            disabled={!isCurrentStepValid() || isSubmitting}
            className={`w-full sm:w-auto ml-auto ${
              currentStep === 3 ? 'bg-green-600 hover:bg-green-700' : ''
            }`}
          >
            {isSubmitting && currentStep === 3 ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              <>
                {currentStep === 3 && <CheckCircle className="h-4 w-4 mr-2" />}
                {currentStep < 3 ? 'Continuer' : 'Créer le rappel'}
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
