"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSaveFormState, useRestoreFormState } from '@/hooks/use-form-persistence'
import { toast } from 'sonner'
import { StepProgressHeader } from '@/components/ui/step-progress-header'
import { contractSteps } from '@/lib/step-configurations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ContactSection } from '@/components/ui/contact-section'
import ContactSelector, { ContactSelectorRef } from '@/components/contact-selector'
import PropertySelector from '@/components/property-selector'
import LeaseFormDetailsMerged from '@/components/contract/lease-form-details-merged-v1'
import { DocumentChecklist } from '@/components/contract/document-checklist'
import { LeaseInterventionsStep } from '@/components/contract/lease-interventions-step'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'
import {
  LEASE_INTERVENTION_TEMPLATES,
  createMissingDocumentIntervention,
  resolveTemplateText
} from '@/lib/constants/lease-interventions'
import { LEASE_DOCUMENT_SLOTS } from '@/lib/constants/lease-document-slots'
import { format } from 'date-fns'
import {
  createContract,
  addContractContact,
  updateContract,
  updateContractContact,
  removeContractContact
} from '@/app/actions/contract-actions'
import { createContractNotification } from '@/app/actions/notification-actions'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Home,
  Euro,
  Calendar,
  Users,
  Shield,
  FileText,
  Save,
  Paperclip,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { logger } from '@/lib/logger'
import { useContractUploadByCategory } from '@/hooks/use-contract-upload-by-category'
import type {
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
  ContractWithRelations,
  ContractDocumentType,
  ChargesType
} from '@/lib/types/contract.types'
import {
  GUARANTEE_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  CONTRACT_CONTACT_ROLE_LABELS
} from '@/lib/types/contract.types'

// ============================================================================
// TYPES
// ============================================================================

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
}

interface BuildingsData {
  buildings: any[]
  lots: any[]
  teamId: string | null
}

export interface ContractFormContainerProps {
  mode: 'create' | 'edit'
  teamId: string
  initialBuildingsData: BuildingsData
  initialContacts: Contact[]

  // Create mode
  prefilledLotId?: string | null

  // Edit mode
  existingContract?: ContractWithRelations

  // Contact creation redirect (create mode only)
  sessionKey?: string | null
  newContactId?: string | null
  contactType?: string | null
}

// Contact with tracking for edit mode
interface FormContact {
  id?: string // Database ID for existing contacts
  userId: string
  role: ContractContactRole
  isPrimary: boolean
}

// Initial form data (title is editable but can be auto-generated)
const initialFormData: Partial<ContractFormData> = {
  lotId: '',
  title: '',
  startDate: new Date().toISOString().split('T')[0],
  durationMonths: 12,
  comments: '',
  paymentFrequency: 'mensuel',
  paymentFrequencyValue: 1,
  rentAmount: 0,
  chargesAmount: 0,
  chargesType: 'forfaitaire',
  contacts: [],
  guaranteeType: 'pas_de_garantie',
  guaranteeAmount: undefined,
  guaranteeNotes: ''
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse une chaîne de date ISO (YYYY-MM-DD) en Date locale.
 * Évite le bug de timezone où new Date("2026-01-01") devient 31 déc en UTC+1.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Calcule la date de fin du contrat (dernier jour inclus).
 *
 * Logique métier: un bail d'1 an commençant le 1er janvier se termine
 * le 31 décembre (dernier jour du bail), pas le 1er janvier suivant.
 */
function calculateContractEndDate(startDate: string, durationMonths: number): Date {
  const date = parseLocalDate(startDate)
  date.setMonth(date.getMonth() + durationMonths)
  date.setDate(date.getDate() - 1) // Dernier jour du bail
  return date
}

// Generate contract reference from lot and dates: BAIL-{LOT_REF}-{START}-{END}
function generateContractReference(lotReference: string | undefined, startDate: string, durationMonths: number): string {
  if (!lotReference || !startDate) return ''
  const start = parseLocalDate(startDate)
  const end = calculateContractEndDate(startDate, durationMonths)

  const formatDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `BAIL-${lotReference}-${formatDate(start)}-${formatDate(end)}`
}

// Map existing contract to form data
function mapContractToFormData(contract: ContractWithRelations): Partial<ContractFormData> {
  return {
    lotId: contract.lot_id,
    title: contract.title,
    startDate: contract.start_date,
    durationMonths: contract.duration_months,
    comments: contract.comments || '',
    paymentFrequency: contract.payment_frequency,
    paymentFrequencyValue: contract.payment_frequency_value,
    rentAmount: contract.rent_amount,
    chargesAmount: contract.charges_amount,
    chargesType: contract.charges_type,
    contacts: (contract.contacts || []).map(c => ({
      id: c.id,
      userId: c.user_id,
      role: c.role,
      isPrimary: c.is_primary
    })) as any[],
    guaranteeType: contract.guarantee_type,
    guaranteeAmount: contract.guarantee_amount || undefined,
    guaranteeNotes: contract.guarantee_notes || ''
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContractFormContainer({
  mode,
  teamId,
  initialBuildingsData,
  initialContacts,
  prefilledLotId,
  existingContract,
  sessionKey: initialSessionKey,
  newContactId: initialNewContactId,
  contactType: initialContactType
}: ContractFormContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read step and returnTo from URL params (for deep linking from lot card)
  const stepParam = searchParams.get('step')
  const returnToParam = searchParams.get('returnTo')

  const [currentStep, setCurrentStepState] = useState(() => {
    if (stepParam) {
      const step = parseInt(stepParam, 10)
      if (!isNaN(step) && step >= 0 && step <= 4) {
        return step
      }
    }
    return 0
  })
  const [maxStepReached, setMaxStepReached] = useState(() => {
    // En mode edit, toutes les étapes sont accessibles dès le départ
    if (mode === 'edit') return 4
    // Sinon, utiliser le step initial depuis URL ou 0
    if (stepParam) {
      const step = parseInt(stepParam, 10)
      if (!isNaN(step) && step >= 0 && step <= 4) {
        return step
      }
    }
    return 0
  })

  // Wrapper pour setCurrentStep qui met aussi à jour maxStepReached
  // Supporte les deux signatures: setCurrentStep(number) et setCurrentStep(prev => number)
  const setCurrentStep = useCallback((stepOrFn: number | ((prev: number) => number)) => {
    setCurrentStepState(prev => {
      const newStep = typeof stepOrFn === 'function' ? stepOrFn(prev) : stepOrFn
      const clampedStep = Math.max(0, Math.min(newStep, 4)) // 0-4 pour les contrats (5 étapes)
      // Update maxStepReached si nécessaire (en mode create uniquement)
      if (clampedStep > maxStepReached && mode === 'create') {
        setMaxStepReached(clampedStep)
      }
      return clampedStep
    })
  }, [maxStepReached, mode])
  const [returnTo] = useState<string | null>(() => {
    return returnToParam ? decodeURIComponent(returnToParam) : null
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Interventions planifiées (étape 3)
  const [scheduledInterventions, setScheduledInterventions] = useState<ScheduledInterventionData[]>([])

  // État de l'overlap check (remonté depuis LeaseFormDetailsMerged pour validation step)
  const [overlapCheckResult, setOverlapCheckResult] = useState<{
    hasOverlap: boolean
    isColocationAllowed: boolean
    hasDuplicateTenant: boolean
  } | null>(null)

  // Document upload hook with category-based slots
  const {
    slots,
    addFilesToSlot,
    removeFileFromSlot,
    progress: uploadProgress,
    missingRecommendedDocuments,
    isUploading: isUploadingDocuments,
    uploadFiles: uploadDocumentFiles,
    hasFiles: hasDocuments,
    hasPendingUploads
  } = useContractUploadByCategory({
    onUploadComplete: (documentIds) => {
      logger.info({ documentIds }, '✅ [CONTRACT-FORM] Documents uploaded successfully')
    },
    onUploadError: (error) => {
      toast.error(error)
    }
  })

  // Initialize form data based on mode
  const [formData, setFormData] = useState<Partial<ContractFormData>>(() => {
    if (mode === 'edit' && existingContract) {
      return mapContractToFormData(existingContract)
    }
    return {
      ...initialFormData,
      lotId: prefilledLotId || ''
    }
  })

  // Initialiser les interventions quand les données du bail changent
  useEffect(() => {
    if (!formData.startDate || !formData.durationMonths || !formData.chargesType) {
      setScheduledInterventions([])
      return
    }

    const startDate = parseLocalDate(formData.startDate)
    const endDate = calculateContractEndDate(formData.startDate, formData.durationMonths)

    // Filtrer les templates selon le type de charges
    const applicableTemplates = LEASE_INTERVENTION_TEMPLATES.filter(template => {
      if (!template.applicableChargesTypes) return true
      return template.applicableChargesTypes.includes(formData.chargesType as ChargesType)
    })

    // Interventions standard avec titres résolus
    const standardInterventions: ScheduledInterventionData[] = applicableTemplates.map(template => ({
      key: template.key,
      title: resolveTemplateText(template.title, formData.chargesType as ChargesType),
      description: resolveTemplateText(template.description, formData.chargesType as ChargesType),
      interventionTypeCode: template.interventionTypeCode,
      icon: template.icon,
      colorClass: template.colorClass,
      enabled: template.enabledByDefault,
      scheduledDate: template.calculateDefaultDate(startDate, endDate),
      isAutoCalculated: true
    }))

    // Interventions pour documents manquants
    const documentInterventions: ScheduledInterventionData[] = missingRecommendedDocuments.map((docType, index) => {
      const template = createMissingDocumentIntervention(docType, index)
      return {
        key: template.key,
        title: template.title as string,
        description: template.description as string,
        interventionTypeCode: template.interventionTypeCode,
        icon: template.icon,
        colorClass: template.colorClass,
        enabled: template.enabledByDefault,
        scheduledDate: template.calculateDefaultDate(startDate, endDate),
        isAutoCalculated: true
      }
    })

    setScheduledInterventions([...standardInterventions, ...documentInterventions])
  }, [formData.startDate, formData.durationMonths, formData.chargesType, missingRecommendedDocuments])

  // Track original contacts for edit mode (to determine adds/removes/updates)
  const [originalContacts] = useState<FormContact[]>(() => {
    if (mode === 'edit' && existingContract?.contacts) {
      return existingContract.contacts.map(c => ({
        id: c.id,
        userId: c.user_id,
        role: c.role,
        isPrimary: c.is_primary
      }))
    }
    return []
  })

  // Form state for persistence (create mode only)
  const formState = useMemo(() => ({
    currentStep,
    formData,
    uploadedFiles: []
  }), [currentStep, formData])

  // Hook for save and redirect (create mode)
  const { saveAndRedirect } = useSaveFormState(formState)

  // Hook for restoring state after contact creation return (create mode)
  const { newContactId, sessionKey } = useRestoreFormState((restoredState: any) => {
    if (mode === 'create') {
      logger.info(`📥 [CONTRACT-FORM] Restoring form state after contact creation`)
      setCurrentStep(restoredState.currentStep)
      setFormData(restoredState.formData)
    }
  })

  // Get selected lot from buildingsData
  const selectedLot = useMemo(() => {
    return initialBuildingsData.lots.find((lot: any) => lot.id === formData.lotId)
  }, [initialBuildingsData.lots, formData.lotId])

  // Computed arrays for ContactSection
  const selectedTenants = useMemo(() => {
    return (formData.contacts || [])
      .filter(c => c.role === 'locataire')
      .map(c => initialContacts.find(ic => ic.id === c.userId))
      .filter(Boolean) as typeof initialContacts
  }, [formData.contacts, initialContacts])

  const selectedGuarantors = useMemo(() => {
    return (formData.contacts || [])
      .filter(c => c.role === 'garant')
      .map(c => initialContacts.find(ic => ic.id === c.userId))
      .filter(Boolean) as typeof initialContacts
  }, [formData.contacts, initialContacts])

  // Calculate totals
  const monthlyTotal = (formData.rentAmount || 0) + (formData.chargesAmount || 0)

  // Handle lot selection
  const handleLotSelect = useCallback((lotId: string | null) => {
    setFormData(prev => ({ ...prev, lotId: lotId || '' }))
  }, [])

  // Update form field
  const updateField = useCallback(<K extends keyof ContractFormData>(
    field: K,
    value: ContractFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Contact management
  const addContact = useCallback((contactId: string, role: ContractContactRole) => {
    const exists = (formData.contacts || []).some(c => c.userId === contactId && c.role === role)
    if (exists) return

    setFormData(prev => ({
      ...prev,
      contacts: [
        ...(prev.contacts || []),
        { userId: contactId, role, isPrimary: false }
      ]
    }))
  }, [formData.contacts])

  const removeContactById = useCallback((contactId: string, role: ContractContactRole) => {
    setFormData(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter(c => !(c.userId === contactId && c.role === role))
    }))
  }, [])

  // Auto-select new contact after return from creation (create mode)
  useEffect(() => {
    if (mode !== 'create') return

    const contactId = newContactId || initialNewContactId
    const contactTypeParam = searchParams.get('contactType') || initialContactType
    const sessionKeyParam = sessionKey || initialSessionKey

    if (!contactId || !sessionKeyParam) return

    logger.info(`✅ [CONTRACT-FORM] New contact created: ${contactId}`)

    const contactDataStr = sessionStorage.getItem(`contact-data-${sessionKeyParam}`)
    if (!contactDataStr) {
      logger.warn(`⚠️ [CONTRACT-FORM] No contact data found in sessionStorage`)
      return
    }

    try {
      const contactData = JSON.parse(contactDataStr)

      const roleMap: Record<string, ContractContactRole> = {
        'tenant': 'locataire',
        'locataire': 'locataire',
        'guarantor': 'garant',
        'garant': 'garant'
      }
      const role = roleMap[contactTypeParam || ''] || 'locataire'

      const alreadySelected = formData.contacts?.some(c => c.userId === contactId)
      if (alreadySelected) {
        logger.info(`ℹ️ [CONTRACT-FORM] Contact already selected: ${contactId}`)
        sessionStorage.removeItem(`contact-data-${sessionKeyParam}`)
        return
      }

      addContact(contactId, role)
      toast.success(`${contactData.name} ajouté automatiquement !`)
      sessionStorage.removeItem(`contact-data-${sessionKeyParam}`)
    } catch (error) {
      logger.error(`❌ [CONTRACT-FORM] Error parsing contact data:`, error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newContactId, initialNewContactId, sessionKey, initialSessionKey, mode])

  // Validation per step (5 steps total - ajout Interventions)
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Lot selection
        return !!formData.lotId
      case 1: // Details + Contacts + Guarantee (MERGED)
        const hasStartDate = !!formData.startDate
        const hasDuration = !!formData.durationMonths
        const hasRent = !!(formData.rentAmount && formData.rentAmount > 0)
        const hasLocataire = (formData.contacts || []).some(c => c.role === 'locataire')
        // ✅ Bloquer si doublon OU si chevauchement sur lot non-colocation
        const noDuplicateTenant = !overlapCheckResult?.hasDuplicateTenant
        const noBlockingOverlap = !overlapCheckResult?.hasOverlap || overlapCheckResult?.isColocationAllowed
        return hasStartDate && hasDuration && hasRent && hasLocataire && noDuplicateTenant && noBlockingOverlap
      case 2: // Documents (optionnel - toujours valide)
        return true
      case 3: // Interventions (optionnel - toujours valide)
        return true
      case 4: // Confirmation
        return true
      default:
        return false
    }
  }, [formData, overlapCheckResult])

  // Navigation
  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez compléter tous les champs requis')
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, contractSteps.length - 1))
  }, [currentStep, validateStep])

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [setCurrentStep])

  const handleStepClick = useCallback((stepNumber: number) => {
    // stepNumber est 1-indexed (du header), convertir en 0-indexed pour le state
    const stepIndex = stepNumber - 1
    // En mode edit, toutes les étapes sont cliquables
    if (mode === 'edit') {
      setCurrentStep(stepIndex)
      return
    }
    // En mode create, permettre la navigation vers les étapes déjà visitées
    if (stepIndex <= maxStepReached) {
      setCurrentStep(stepIndex)
    }
  }, [mode, maxStepReached, setCurrentStep])

  // Sync contacts for edit mode
  const syncContacts = useCallback(async (contractId: string) => {
    const currentContacts = formData.contacts || []
    const currentUserIds = new Set(currentContacts.map(c => c.userId))
    const originalUserIds = new Set(originalContacts.map(c => c.userId))

    // Contacts to add (in current but not in original)
    for (const contact of currentContacts) {
      if (!originalUserIds.has(contact.userId)) {
        await addContractContact({
          contract_id: contractId,
          user_id: contact.userId,
          role: contact.role,
          is_primary: contact.isPrimary
        })
      }
    }

    // Contacts to remove (in original but not in current)
    for (const original of originalContacts) {
      if (!currentUserIds.has(original.userId) && original.id) {
        await removeContractContact(original.id, contractId)
      }
    }

    // Contacts to update (role or isPrimary changed)
    for (const contact of currentContacts) {
      const original = originalContacts.find(o => o.userId === contact.userId)
      if (original && original.id) {
        const roleChanged = original.role !== contact.role
        const primaryChanged = original.isPrimary !== contact.isPrimary
        if (roleChanged || primaryChanged) {
          await updateContractContact(original.id, contractId, {
            role: contact.role,
            is_primary: contact.isPrimary
          })
        }
      }
    }
  }, [formData.contacts, originalContacts])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez compléter tous les champs requis')
      return
    }

    setIsSubmitting(true)

    try {
      // Use user-provided title or auto-generate
      const finalTitle = formData.title?.trim() || generateContractReference(
        selectedLot?.reference,
        formData.startDate!,
        formData.durationMonths || 12
      )

      if (mode === 'create') {
        // CREATE MODE
        const contractResult = await createContract({
          team_id: teamId,
          lot_id: formData.lotId!,
          title: finalTitle,
          start_date: formData.startDate!,
          duration_months: formData.durationMonths!,
          payment_frequency: formData.paymentFrequency as PaymentFrequency,
          payment_frequency_value: formData.paymentFrequencyValue || 1,
          rent_amount: formData.rentAmount!,
          charges_amount: formData.chargesAmount || 0,
          guarantee_type: formData.guaranteeType as GuaranteeType,
          guarantee_amount: formData.guaranteeAmount,
          guarantee_notes: formData.guaranteeNotes,
          comments: formData.comments
        })

        if (!contractResult.success || !contractResult.data) {
          throw new Error(contractResult.error || 'Erreur lors de la création du bail')
        }

        const contractId = contractResult.data.id

        // Add contacts
        for (const contact of formData.contacts || []) {
          await addContractContact({
            contract_id: contractId,
            user_id: contact.userId,
            role: contact.role,
            is_primary: contact.isPrimary
          })
        }

        // Upload documents with their categories
        if (hasPendingUploads) {
          logger.info('[CONTRACT-FORM] Uploading documents...')
          await uploadDocumentFiles(contractId)
        }

        // Create scheduled interventions
        const toCreate = scheduledInterventions.filter(i => i.enabled && i.scheduledDate)
        if (toCreate.length > 0) {
          logger.info(`[CONTRACT-FORM] Creating ${toCreate.length} interventions...`)
          const { createInterventionAction } = await import('@/app/actions/intervention-actions')

          const results = await Promise.allSettled(
            toCreate.map(async (intervention) => {
              return createInterventionAction({
                title: intervention.title,
                description: intervention.description,
                type: intervention.interventionTypeCode,
                urgency: 'basse',
                lot_id: formData.lotId!,
                team_id: teamId,
                contract_id: contractId,  // Lier l'intervention au contrat
                requested_date: intervention.scheduledDate || undefined
              }, { useServiceRole: true })  // Bypass RLS pour création batch
            })
          )

          const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
          const failedCount = results.length - successCount

          if (successCount > 0) {
            logger.info({ successCount, failedCount, contractId }, 'Lease interventions created')
          }
        }

        // Send notification
        await createContractNotification(contractId)

        toast.success('Bail créé avec succès')

        // Navigate directly to contract details (no modal)
        router.push(returnTo || `/gestionnaire/contrats/${contractId}`)
      } else {
        // EDIT MODE
        const contractId = existingContract!.id

        const contractResult = await updateContract(contractId, {
          lot_id: formData.lotId,
          title: finalTitle,
          start_date: formData.startDate,
          duration_months: formData.durationMonths,
          payment_frequency: formData.paymentFrequency as PaymentFrequency,
          payment_frequency_value: formData.paymentFrequencyValue || 1,
          rent_amount: formData.rentAmount,
          charges_amount: formData.chargesAmount || 0,
          guarantee_type: formData.guaranteeType as GuaranteeType,
          guarantee_amount: formData.guaranteeAmount,
          guarantee_notes: formData.guaranteeNotes,
          comments: formData.comments
        })

        if (!contractResult.success) {
          throw new Error(contractResult.error || 'Erreur lors de la mise à jour du contrat')
        }

        // Sync contacts (add/remove/update)
        await syncContacts(contractId)

        // Upload new documents with their categories (edit mode)
        if (hasPendingUploads) {
          logger.info('[CONTRACT-FORM] Uploading new documents...')
          await uploadDocumentFiles(contractId)
        }

        toast.success('Contrat mis à jour avec succès')
        // Navigate to returnTo if provided, otherwise to contract details
        router.push(returnTo || `/gestionnaire/contrats/${contractId}`)
      }
    } catch (error) {
      logger.error(`Error ${mode === 'create' ? 'creating' : 'updating'} contract:`, error)
      toast.error(error instanceof Error ? error.message : `Erreur lors de ${mode === 'create' ? 'la création' : 'la mise à jour'} du bail`)
    } finally {
      setIsSubmitting(false)
    }
  }, [mode, formData, teamId, existingContract, router, currentStep, validateStep, selectedLot, syncContacts, hasPendingUploads, uploadDocumentFiles, returnTo])

  // Page title based on mode
  const pageTitle = mode === 'create' ? 'Nouveau bail' : 'Modifier le contrat'
  const submitLabel = mode === 'create' ? 'Créer le bail' : 'Enregistrer les modifications'
  const submitIcon = mode === 'create' ? Check : Save
  const SubmitIcon = submitIcon

  // Calculate end date for interventions step (dernier jour du bail)
  const endDateCalc = useMemo(() => {
    if (!formData.startDate || !formData.durationMonths) {
      return new Date()
    }
    return calculateContractEndDate(formData.startDate, formData.durationMonths || 12)
  }, [formData.startDate, formData.durationMonths])

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      // Step 0: Lot Selection - Layout style Patrimoine avec tabs Immeubles/Lots
      case 0:
        return (
          <div className="flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header fixe */}
            <div className="text-center max-w-2xl mx-auto mb-4 flex-shrink-0">
              <h2 className="text-2xl font-bold mb-2">Sélectionnez le lot</h2>
              <p className="text-muted-foreground">
                {mode === 'create'
                  ? 'Parcourez vos immeubles pour trouver le lot concerné par ce bail.'
                  : 'Modifiez le lot si nécessaire (attention: cette action peut avoir des conséquences).'}
              </p>
            </div>

            {/* PropertySelector - wrapper flex pour remplir l'espace disponible */}
            <div className="flex-1 flex flex-col min-h-0">
              <PropertySelector
                mode="select"
                onLotSelect={handleLotSelect}
                selectedLotId={formData.lotId}
                initialData={initialBuildingsData}
                showViewToggle={true}
                compactCards={true}
                hideBuildingSelect={true}
              />
            </div>
          </div>
        )

      // Step 1: Details + Contacts + Guarantee (MERGED)
      case 1:
        return (
          <LeaseFormDetailsMerged
            lotReference={selectedLot?.reference}
            title={formData.title || ''}
            startDate={formData.startDate || ''}
            durationMonths={formData.durationMonths || 12}
            comments={formData.comments || ''}
            paymentFrequency={formData.paymentFrequency as PaymentFrequency || 'mensuel'}
            rentAmount={formData.rentAmount || 0}
            chargesAmount={formData.chargesAmount || 0}
            chargesType={(formData as any).chargesType || 'forfaitaire'}
            selectedTenants={selectedTenants}
            selectedGuarantors={selectedGuarantors}
            guaranteeType={formData.guaranteeType as GuaranteeType || 'pas_de_garantie'}
            guaranteeAmount={formData.guaranteeAmount}
            guaranteeNotes={formData.guaranteeNotes || ''}
            onFieldChange={(field, value) => updateField(field as keyof ContractFormData, value)}
            onAddContact={(contactType) => contactSelectorRef.current?.openContactModal(contactType)}
            onRemoveContact={removeContactById}
            contactSelectorRef={contactSelectorRef}
            teamId={teamId}
            mode={mode}
            addContact={addContact}
            saveAndRedirect={saveAndRedirect}
            lotId={formData.lotId}
            existingContractId={existingContract?.id}
            onOverlapCheckChange={setOverlapCheckResult}
          />
        )

      // Step 2: Documents (optionnel)
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-4">
              <h2 className="text-2xl font-bold mb-2">Documents du bail</h2>
              <p className="text-muted-foreground">
                {mode === 'create'
                  ? 'Ajoutez les documents associés au contrat de location. Tous les documents sont optionnels.'
                  : 'Gérez les documents du bail. Vous pouvez ajouter ou retirer des fichiers.'}
              </p>
            </div>
            <DocumentChecklist
              slots={slots}
              onAddFilesToSlot={addFilesToSlot}
              onRemoveFileFromSlot={removeFileFromSlot}
              progress={uploadProgress}
              missingRecommendedDocuments={missingRecommendedDocuments}
              isUploading={isUploadingDocuments}
            />
          </div>
        )

      // Step 3: Interventions (optionnel)
      case 3:
        return (
          <LeaseInterventionsStep
            scheduledInterventions={scheduledInterventions}
            onInterventionsChange={setScheduledInterventions}
            missingDocuments={missingRecommendedDocuments}
          />
        )

      // Step 4: Confirmation
      case 4:
        const displayRef = formData.title?.trim() || generateContractReference(
          selectedLot?.reference,
          formData.startDate!,
          formData.durationMonths || 12
        )
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-2">Récapitulatif</h2>
              <p className="text-muted-foreground">
                {mode === 'create'
                  ? 'Vérifiez les informations avant de créer le bail.'
                  : 'Vérifiez les modifications avant d\'enregistrer.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lot info - Large Card */}
              <Card className="md:col-span-2 overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="h-4 w-4 text-primary" />
                    Lot concerné
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {selectedLot && (
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">
                          {selectedLot.building ? `${selectedLot.building.name}` : `Lot ${selectedLot.reference}`}
                        </p>
                        {selectedLot.building && <p className="text-muted-foreground">Lot {selectedLot.reference}</p>}
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedLot.street || selectedLot.city}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial info - Highlight Card */}
              <Card className="bg-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <Euro className="h-4 w-4" />
                    Finances
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loyer HC</span>
                      <span className="font-medium">{formData.rentAmount?.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Charges</span>
                      <span className="font-medium">{(formData.chargesAmount || 0).toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>
                  <Separator className="bg-primary/20" />
                  <div className="flex justify-between items-end">
                    <span className="font-medium text-sm">Total mensuel</span>
                    <span className="text-3xl font-bold text-primary tracking-tight">{monthlyTotal.toLocaleString('fr-FR')} €</span>
                  </div>
                </CardContent>
              </Card>

              {/* Guarantee info - Only show if guarantee is defined */}
              {formData.guaranteeType && formData.guaranteeType !== 'pas_de_garantie' && (
                <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Garantie locative
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</p>
                      <p className="font-medium mt-1">{GUARANTEE_TYPE_LABELS[formData.guaranteeType]}</p>
                    </div>
                    {formData.guaranteeAmount && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Montant</p>
                        <p className="font-medium mt-1 text-primary">{formData.guaranteeAmount.toLocaleString('fr-FR')} €</p>
                      </div>
                    )}
                    {formData.guaranteeNotes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                        <p className="text-sm mt-1 text-muted-foreground">{formData.guaranteeNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contract info */}
              <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Détails du bail
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Référence</p>
                    <p className="font-mono font-medium mt-1 text-primary">{displayRef}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date d'effet</p>
                      <p className="text-sm mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {parseLocalDate(formData.startDate!).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Durée</p>
                      <p className="text-sm mt-1">{CONTRACT_DURATION_OPTIONS.find(o => o.value === formData.durationMonths)?.label || `${formData.durationMonths} mois`}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contacts info */}
              <Card className="md:col-span-2 border-border/60 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Signataires ({(formData.contacts || []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(formData.contacts || []).map((contact, index) => {
                      const info = initialContacts.find(c => c.id === contact.userId)
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {info?.name?.[0] || 'C'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{info?.name}</p>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 mt-1">
                              {CONTRACT_CONTACT_ROLE_LABELS[contact.role]}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section Documents */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Documents ajoutés
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {hasDocuments ? (
                  <div className="space-y-2">
                    {slots.filter(slot => slot.files.length > 0).map((slot, index) => {
                      const slotConfig = LEASE_DOCUMENT_SLOTS.find(s => s.type === slot.type)
                      return (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="font-medium">{slotConfig?.label || slot.type}</span>
                          <span className="text-muted-foreground">
                            - {slot.files.length} fichier{slot.files.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )
                    })}
                    {missingRecommendedDocuments.length > 0 && (
                      <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-700">
                            <p className="font-medium mb-1">Documents recommandés manquants:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {missingRecommendedDocuments.map((docType, idx) => {
                                const slotConfig = LEASE_DOCUMENT_SLOTS.find(s => s.type === docType)
                                return (
                                  <li key={idx}>{slotConfig?.label || docType}</li>
                                )
                              })}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun document ajouté</p>
                )}
              </CardContent>
            </Card>

            {/* Section Interventions */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Interventions planifiées
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {scheduledInterventions.filter(i => i.enabled && i.scheduledDate).length > 0 ? (
                  <div className="space-y-2">
                    {scheduledInterventions
                      .filter(i => i.enabled && i.scheduledDate)
                      .map((intervention, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          <span className="font-medium">{intervention.title}</span>
                          <span className="text-muted-foreground">
                            - {intervention.scheduledDate ? format(intervention.scheduledDate, 'dd/MM/yyyy') : '—'}
                          </span>
                        </div>
                      ))}
                    {scheduledInterventions.filter(i => !i.enabled).length > 0 && (
                      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>
                          {scheduledInterventions.filter(i => !i.enabled).length} intervention(s) désactivée(s)
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune intervention planifiée</p>
                )}
              </CardContent>
            </Card>

            {/* Changes summary (edit mode only) */}
            {mode === 'edit' && (() => {
              const currentUserIds = new Set((formData.contacts || []).map(c => c.userId))
              const originalUserIds = new Set(originalContacts.map(c => c.userId))
              const toAdd = [...currentUserIds].filter(id => !originalUserIds.has(id)).length
              const toRemove = [...originalUserIds].filter(id => !currentUserIds.has(id)).length

              if (toAdd > 0 || toRemove > 0) {
                return (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium text-amber-800 mb-2">Modifications des contacts</h4>
                      {toRemove > 0 && (
                        <p className="text-sm text-amber-700">- {toRemove} contact(s) seront retirés</p>
                      )}
                      {toAdd > 0 && (
                        <p className="text-sm text-amber-700">+ {toAdd} contact(s) seront ajoutés</p>
                      )}
                    </CardContent>
                  </Card>
                )
              }
              return null
            })()}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* HEADER - StepProgressHeader */}
      <StepProgressHeader
        steps={contractSteps}
        currentStep={currentStep + 1}  // Convertir 0-indexed → 1-indexed pour le header
        title={pageTitle}
        backButtonText="Retour"
        onBack={() => {
          // Use returnTo if provided, otherwise default navigation
          if (returnTo) {
            router.push(returnTo)
          } else if (mode === 'create') {
            router.push('/gestionnaire/contrats')
          } else {
            router.push(`/gestionnaire/contrats/${existingContract?.id}`)
          }
        }}
        onStepClick={handleStepClick}
        allowFutureSteps={mode === 'edit'}
        maxReachableStep={maxStepReached + 1}  // Convertir 0-indexed → 1-indexed pour le header
      />

      {/* MAIN CONTENT */}
      {currentStep === 0 ? (
        // Step 0: Layout fixe comme Patrimoine - conteneur avec scroll interne
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 sm:px-6 lg:px-10 pt-6 pb-4">
          <main className="content-max-width w-full flex-1 flex flex-col min-h-0">
            {renderStepContent()}
          </main>
        </div>
      ) : (
        // Autres steps: Scroll page normal
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pb-10 pt-10">
          <main className="content-max-width w-full">
            {renderStepContent()}
          </main>
        </div>
      )}

      {/* FOOTER STICKY */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
        <div className="flex flex-col sm:flex-row justify-between gap-2 content-max-width">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}

          {currentStep < contractSteps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto ml-auto"
            >
              Continuer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateStep(currentStep)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto ml-auto"
            >
              {isSubmitting ? (mode === 'create' ? 'Création...' : 'Enregistrement...') : submitLabel}
              <SubmitIcon className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
