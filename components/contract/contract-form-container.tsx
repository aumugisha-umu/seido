"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSaveFormState, useRestoreFormState } from '@/hooks/use-form-persistence'
import { toast } from 'sonner'
import { StepProgressHeader } from '@/components/ui/step-progress-header'
import { contractSteps, supplierContractSteps } from '@/lib/step-configurations'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ContactSelectorRef } from '@/components/contact-selector'
import PropertySelector from '@/components/property-selector'
import LeaseFormDetailsMerged from '@/components/contract/lease-form-details-merged-v1'
import { DocumentChecklist } from '@/components/contract/document-checklist'
import { LeaseInterventionsStep, type RentReminderConfig } from '@/components/contract/lease-interventions-step'
import type { ScheduledInterventionData } from '@/components/contract/intervention-schedule-row'
import { ParticipantChip } from '@/components/interventions/shared/layout/participants-row'
import {
  LEASE_INTERVENTION_TEMPLATES,
  createMissingDocumentIntervention,
  resolveTemplateText,
  INSURANCE_EXPIRY_NEXT_DAY_VALUE,
  type SchedulingOption
} from '@/lib/constants/lease-interventions'
import { LEASE_DOCUMENT_SLOTS } from '@/lib/constants/lease-document-slots'
import { format } from 'date-fns'
import {
  createContract,
  addContractContact,
  addContractContactsBatch,
  updateContract,
  updateContractContact,
  removeContractContact
} from '@/app/actions/contract-actions'
import { createContractNotification } from '@/app/actions/notification-actions'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Euro,
  Calendar,
  FileText,
  Save,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  Bell
} from 'lucide-react'
import { InterventionPlannerStep } from '@/components/contract/intervention-planner-step'
import { SUPPLIER_ASSIGNABLE_ROLES } from '@/lib/constants/assignable-roles'
import { createSupplierReminderIntervention, createEmptySupplierCustomIntervention } from '@/lib/constants/supplier-interventions'
import type { InterventionPlannerSection } from '@/lib/types/intervention-planner.types'
import { SupplierContractsStep } from '@/components/contract/supplier-contracts-step'
import { SupplierConfirmationStep } from '@/components/contract/supplier-confirmation-step'
import type {
  SupplierContractFormItem,
  SupplierContractReminderConfig
} from '@/lib/types/supplier-contract.types'
import { createEmptySupplierContractItem } from '@/lib/types/supplier-contract.types'
import { createBrowserSupabaseClient } from '@/lib/services'
import {
  createSupplierContractsAction,
} from '@/app/actions/supplier-contract-actions'
import { logger } from '@/lib/logger'
import { useContractUploadByCategory } from '@/hooks/use-contract-upload-by-category'
import type {
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
  ContractWithRelations,
  ChargesType
} from '@/lib/types/contract.types'
import {
  GUARANTEE_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  CONTRACT_CONTACT_ROLE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  CHARGES_TYPE_LABELS
} from '@/lib/types/contract.types'
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationFinancialHighlight,
  ConfirmationContactGrid,
  ConfirmationDocumentList,
} from '@/components/confirmation'

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
  contractMode?: 'bail' | 'fournisseur'
  teamId: string
  initialBuildingsData: BuildingsData
  initialContacts: Contact[]

  // Create mode
  prefilledLotId?: string | null

  // Edit mode
  existingContract?: ContractWithRelations

  // Current logged-in gestionnaire (for pre-assigning interventions)
  currentUser?: { id: string; name: string }

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
  contractMode = 'bail',
  teamId,
  initialBuildingsData,
  initialContacts,
  prefilledLotId,
  existingContract,
  currentUser,
  sessionKey: initialSessionKey,
  newContactId: initialNewContactId,
  contactType: initialContactType
}: ContractFormContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSupplierMode = contractMode === 'fournisseur'
  const activeSteps = isSupplierMode ? supplierContractSteps : contractSteps

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

  // ── Supplier mode state ──
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null)
  const selectedBuildingName = useMemo(() => {
    if (!selectedBuildingId) return ''
    return initialBuildingsData.buildings.find((b: any) => b.id === selectedBuildingId)?.name || ''
  }, [selectedBuildingId, initialBuildingsData.buildings])
  const [supplierContracts, setSupplierContracts] = useState<SupplierContractFormItem[]>(() => {
    if (isSupplierMode) return [createEmptySupplierContractItem('', 1)]
    return []
  })
  const [supplierScheduledInterventions, setSupplierScheduledInterventions] = useState<ScheduledInterventionData[]>([])
  // Number of existing supplier contracts in DB for the selected property (offset for reference numbering)
  const [existingContractCount, setExistingContractCount] = useState(0)

  // Sync supplier interventions when contracts change (add/remove/update end dates)
  useEffect(() => {
    if (!isSupplierMode) return
    setSupplierScheduledInterventions(prev => {
      const contractsWithEndDate = supplierContracts.filter(c => c.endDate)
      const existingByKey = new Map(prev.filter(i => !i.key.startsWith('custom_')).map(i => [i.key, i]))
      const customInterventions = prev.filter(i => i.key.startsWith('custom_'))

      const contractInterventions = contractsWithEndDate.map(contract => {
        const existing = existingByKey.get(contract.tempId)
        if (existing) {
          // Preserve user edits (enabled, assignedUsers, custom date) but update options
          const endDateObj = new Date(contract.endDate)
          const fresh = createSupplierReminderIntervention(contract, currentUser)

          // Detect if selectedSchedulingOption was still on a "default" value
          // (end_date or notice_date) vs a manual pick (ref_minus_1m, etc.)
          const wasOnDefaultValue = existing.selectedSchedulingOption === 'end_date'
            || existing.selectedSchedulingOption === 'notice_date'
          const shouldUpdateDefault = wasOnDefaultValue
            && existing.selectedSchedulingOption !== fresh.selectedSchedulingOption

          const effectiveOption = shouldUpdateDefault
            ? fresh.selectedSchedulingOption
            : existing.selectedSchedulingOption

          return {
            ...existing,
            title: fresh.title,
            description: fresh.description,
            availableOptions: fresh.availableOptions,
            selectedSchedulingOption: effectiveOption,
            // Recalculate date if auto-calculated or default changed
            scheduledDate: (shouldUpdateDefault || existing.isAutoCalculated)
              ? (fresh.availableOptions.find(o => o.value === effectiveOption)?.calculateDate(endDateObj, endDateObj) ?? existing.scheduledDate)
              : existing.scheduledDate,
          }
        }
        return createSupplierReminderIntervention(contract, currentUser)
      })

      return [...customInterventions, ...contractInterventions]
    })
  }, [isSupplierMode, supplierContracts, currentUser])

  // ─── Supplier custom intervention handlers ─────────────────
  const handleSupplierAddCustom = useCallback(() => {
    setSupplierScheduledInterventions(prev => {
      const lastCustomIdx = prev.reduce((acc, item, idx) => item.key.startsWith('custom_') ? idx : acc, -1)
      const newCustom = createEmptySupplierCustomIntervention(currentUser)
      const result = [...prev]
      result.splice(lastCustomIdx + 1, 0, newCustom)
      return result
    })
  }, [currentUser])

  const handleSupplierDeleteCustom = useCallback((key: string) => {
    setSupplierScheduledInterventions(prev => prev.filter(i => i.key !== key))
  }, [])

  const handleSupplierCustomTitleChange = useCallback((key: string, title: string) => {
    setSupplierScheduledInterventions(prev =>
      prev.map(i => i.key === key ? { ...i, title, enabled: title.trim().length > 0 } : i)
    )
  }, [])

  const handleSupplierCustomDescriptionChange = useCallback((key: string, description: string) => {
    setSupplierScheduledInterventions(prev =>
      prev.map(i => i.key === key ? { ...i, description } : i)
    )
  }, [])

  // Interventions planifiées (étape 3)
  const [scheduledInterventions, setScheduledInterventions] = useState<ScheduledInterventionData[]>([])
  const [rentReminderConfig, setRentReminderConfig] = useState<RentReminderConfig>({
    enabled: false,
    dayOfMonth: 1,
    assignedUsers: currentUser
      ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
      : []
  })

  // État de l'overlap check (remonté depuis LeaseFormDetailsMerged pour validation step)
  // Note (2026-01): hasOverlap n'est plus bloquant (warning seulement), seul hasDuplicateTenant bloque
  const [overlapCheckResult, setOverlapCheckResult] = useState<{
    hasOverlap: boolean
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
    setSlotExpiryDate,
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
    if (isSupplierMode) return
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

    // Option dynamique assurance : lendemain de la date d'expiration si renseignée
    const insuranceSlot = slots.find(s => s.type === 'attestation_assurance')
    const insuranceExpiryDate = insuranceSlot?.files?.[0]?.expiryDate

    // Pré-assigner le gestionnaire actuel à chaque intervention
    const defaultAssignedUsers = currentUser
      ? [{ userId: currentUser.id, role: 'gestionnaire' as const, name: currentUser.name }]
      : []

    // Interventions standard avec titres résolus + options de planification
    const standardInterventions: ScheduledInterventionData[] = applicableTemplates.map(template => {
      // Construire les options disponibles
      let options: SchedulingOption[] = [...template.schedulingOptions]
      let defaultOption = template.defaultSchedulingOption

      // Ajouter l'option dynamique assurance si applicable
      if (template.key === 'insurance_reminder' && insuranceExpiryDate) {
        const expiryDateObj = parseLocalDate(insuranceExpiryDate)
        const formattedExpiry = format(expiryDateObj, 'dd/MM/yyyy')
        const insuranceDynamicOption: SchedulingOption = {
          value: INSURANCE_EXPIRY_NEXT_DAY_VALUE,
          label: `Lendemain expiration assurance (${formattedExpiry})`,
          calculateDate: () => {
            const d = parseLocalDate(insuranceExpiryDate)
            d.setDate(d.getDate() + 1)
            return d
          }
        }
        options = [insuranceDynamicOption, ...options]
        defaultOption = INSURANCE_EXPIRY_NEXT_DAY_VALUE
      }

      // Calculer la date depuis l'option par défaut
      const selectedOption = options.find(o => o.value === defaultOption)
      const scheduledDate = selectedOption
        ? selectedOption.calculateDate(startDate, endDate)
        : template.calculateDefaultDate(startDate, endDate)

      return {
        key: template.key,
        title: resolveTemplateText(template.title, formData.chargesType as ChargesType),
        description: resolveTemplateText(template.description, formData.chargesType as ChargesType),
        interventionTypeCode: template.interventionTypeCode,
        icon: template.icon,
        colorClass: template.colorClass,
        enabled: template.enabledByDefault,
        scheduledDate,
        isAutoCalculated: true,
        availableOptions: options,
        selectedSchedulingOption: defaultOption,
        assignedUsers: defaultAssignedUsers
      }
    })

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
        isAutoCalculated: true,
        availableOptions: template.schedulingOptions,
        selectedSchedulingOption: template.defaultSchedulingOption,
        assignedUsers: defaultAssignedUsers
      }
    })

    setScheduledInterventions([...standardInterventions, ...documentInterventions])
  }, [isSupplierMode, formData.startDate, formData.durationMonths, formData.chargesType, missingRecommendedDocuments, slots, currentUser])

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
    uploadedFiles: [],
    supplierContracts,
  }), [currentStep, formData, supplierContracts])

  // Hook for save and redirect (create mode)
  const { saveAndRedirect } = useSaveFormState(formState)

  // Hook for restoring state after contact creation return (create mode)
  const { newContactId, sessionKey } = useRestoreFormState((restoredState: any) => {
    if (mode === 'create') {
      logger.info(`📥 [CONTRACT-FORM] Restoring form state after contact creation`)
      setCurrentStep(restoredState.currentStep)
      setFormData(restoredState.formData)
      if (restoredState.supplierContracts?.length) {
        setSupplierContracts(restoredState.supplierContracts)
      }
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
  const handleLotSelect = useCallback(async (lotId: string | null) => {
    setFormData(prev => ({ ...prev, lotId: lotId || '' }))
    // In supplier mode, clear building if selecting lot
    if (isSupplierMode && lotId) {
      setSelectedBuildingId(null)
      // Fetch count of existing supplier contracts for this lot
      let offset = 0
      try {
        const supabase = createBrowserSupabaseClient()
        const { count } = await supabase
          .from('supplier_contracts')
          .select('*', { count: 'exact', head: true })
          .eq('lot_id', lotId)
          .is('deleted_at', null)
        offset = count || 0
      } catch { /* fallback to 0 */ }
      setExistingContractCount(offset)
      // Update references on existing supplier contracts
      const lotRef = initialBuildingsData.lots.find((l: any) => l.id === lotId)?.reference || ''
      setSupplierContracts(prev => prev.map((c, i) => ({
        ...c,
        reference: c.reference.startsWith('CF-') ? `CF-${lotRef}-${String(offset + i + 1).padStart(3, '0')}` : c.reference
      })))
    }
  }, [isSupplierMode, initialBuildingsData.lots])

  const handleBuildingSelect = useCallback(async (buildingId: string | null) => {
    setSelectedBuildingId(buildingId)
    if (buildingId) {
      setFormData(prev => ({ ...prev, lotId: '' }))
      // Fetch count of existing supplier contracts for this building
      let offset = 0
      try {
        const supabase = createBrowserSupabaseClient()
        const { count } = await supabase
          .from('supplier_contracts')
          .select('*', { count: 'exact', head: true })
          .eq('building_id', buildingId)
          .is('deleted_at', null)
        offset = count || 0
      } catch { /* fallback to 0 */ }
      setExistingContractCount(offset)
      const building = initialBuildingsData.buildings.find((b: any) => b.id === buildingId)
      const buildingName = building?.name || ''
      // Generate a short ref from building name (first 4 chars uppercase)
      const ref = buildingName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'IMM'
      setSupplierContracts(prev => prev.map((c, i) => ({
        ...c,
        reference: c.reference.startsWith('CF-') ? `CF-${ref}-${String(offset + i + 1).padStart(3, '0')}` : c.reference
      })))
    }
  }, [initialBuildingsData.buildings])

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

      // Handle supplier mode: assign to first unassigned supplier contract
      if (isSupplierMode && (contactTypeParam === 'provider' || contactTypeParam === 'prestataire')) {
        const unassignedContract = supplierContracts.find(c => !c.supplierId)
        if (unassignedContract) {
          setSupplierContracts(prev => prev.map(c =>
            c.tempId === unassignedContract.tempId
              ? { ...c, supplierId: contactId, supplierName: contactData.name }
              : c
          ))
          toast.success(`${contactData.name} assigné automatiquement !`)
        } else {
          toast.info(`${contactData.name} créé. Assignez-le manuellement.`)
        }
        sessionStorage.removeItem(`contact-data-${sessionKeyParam}`)
        return
      }

      const roleMap: Record<string, ContractContactRole> = {
        'tenant': 'locataire',
        'locataire': 'locataire',
        'guarantor': 'garant',
        'garant': 'garant'
      }
      const role = roleMap[contactTypeParam || '']
      if (!role) return // Don't auto-assign if no valid type param

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
    if (isSupplierMode) {
      switch (step) {
        case 0: // Property selection (building or lot)
          return !!selectedBuildingId || !!formData.lotId
        case 1: // Supplier contracts form
          return supplierContracts.length > 0 && supplierContracts.every(c => c.reference.trim() !== '' && c.supplierId)
        case 2: // Interventions
          return !supplierScheduledInterventions.some(i => i.key.startsWith('custom_') && i.enabled && !i.title.trim())
        case 3: // Confirmation
          return true
        default:
          return false
      }
    }
    switch (step) {
      case 0: // Lot selection
        return !!formData.lotId
      case 1: // Details + Contacts + Guarantee (MERGED)
        const hasStartDate = !!formData.startDate
        const hasDuration = !!formData.durationMonths
        const hasRent = !!(formData.rentAmount && formData.rentAmount > 0)
        const hasLocataire = (formData.contacts || []).some(c => c.role === 'locataire')
        // ✅ Seul le doublon locataire est bloquant - les chevauchements sont en warning (colocation/cohabitation permise)
        const noDuplicateTenant = !overlapCheckResult?.hasDuplicateTenant
        return hasStartDate && hasDuration && hasRent && hasLocataire && noDuplicateTenant
      case 2: // Documents (optionnel - toujours valide)
        return true
      case 3: // Interventions
        return !scheduledInterventions.some(i => i.key.startsWith('custom_') && i.enabled && !i.title.trim())
      case 4: // Confirmation
        return true
      default:
        return false
    }
  }, [formData, overlapCheckResult, isSupplierMode, selectedBuildingId, supplierContracts, scheduledInterventions, supplierScheduledInterventions])

  // Navigation
  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez compléter tous les champs requis')
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, activeSteps.length - 1))
  }, [currentStep, validateStep, activeSteps.length])

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

  // Submit supplier contracts
  const handleSupplierSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez compléter tous les champs requis')
      return
    }
    setIsSubmitting(true)
    try {
      const result = await createSupplierContractsAction({
        buildingId: selectedBuildingId,
        lotId: formData.lotId || null,
        teamId,
        contracts: supplierContracts.map(c => ({
          reference: c.reference,
          supplierId: c.supplierId,
          cost: c.cost,
          costFrequency: c.costFrequency,
          startDate: c.startDate,
          endDate: c.endDate,
          noticePeriodValue: c.noticePeriodValue,
          noticePeriodUnit: c.noticePeriodUnit,
          description: c.description,
        })),
        // Custom reminders (custom_*) are excluded — server action only handles contract-linked reminders for now
        reminders: supplierScheduledInterventions
          .filter(i => !i.key.startsWith('custom_'))
          .reduce((acc, i) => {
            acc[i.key] = {
              enabled: i.enabled,
              assignedUsers: i.assignedUsers.map(u => ({ userId: u.userId, role: u.role, name: u.name })),
            }
            return acc
          }, {} as Record<string, SupplierContractReminderConfig>),
      })

      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la création')
        return
      }

      // Upload documents for each contract via API route (per-file, no size limit)
      const contractIds = result.data!.contractIds
      const uploadResults = await Promise.allSettled(
        supplierContracts.flatMap((contract, i) =>
          contractIds[i]
            ? contract.files.map(async file => {
                const fd = new FormData()
                fd.append('file', file)
                fd.append('supplierContractId', contractIds[i])
                fd.append('teamId', teamId)
                const response = await fetch('/api/upload-supplier-contract-document', {
                  method: 'POST',
                  body: fd,
                })
                if (!response.ok) {
                  const body = await response.json().catch(() => ({}))
                  throw new Error(body.error || `Upload failed: ${response.status}`)
                }
                return response.json()
              })
            : []
        )
      )

      const failedUploads = uploadResults.filter(r => r.status === 'rejected')
      if (failedUploads.length > 0) {
        logger.error({ failedUploads }, 'Some supplier contract document uploads failed')
        toast.warning(`${result.data!.count} contrat(s) créé(s), mais ${failedUploads.length} document(s) n'ont pas pu être uploadé(s)`)
      } else {
        toast.success(`${result.data!.count} contrat(s) fournisseur(s) créé(s)`)
      }

      // Redirect to building or lot detail
      if (selectedBuildingId) {
        router.push(`/gestionnaire/biens/immeubles/${selectedBuildingId}`)
      } else if (formData.lotId) {
        router.push(`/gestionnaire/biens/lots/${formData.lotId}`)
      } else {
        router.push('/gestionnaire/contrats')
      }
    } catch (error) {
      logger.error({ error }, 'Error submitting supplier contracts')
      toast.error('Erreur inattendue')
    } finally {
      setIsSubmitting(false)
    }
  }, [currentStep, validateStep, selectedBuildingId, formData.lotId, teamId, supplierContracts, supplierScheduledInterventions, router])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (isSupplierMode) {
      return handleSupplierSubmit()
    }

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

        // Add contacts (batch: 1 auth check + 1 bulk insert)
        const contactsToAdd = formData.contacts || []
        if (contactsToAdd.length > 0) {
          await addContractContactsBatch(
            contactsToAdd.map(contact => ({
              contract_id: contractId,
              user_id: contact.userId,
              role: contact.role,
              is_primary: contact.isPrimary
            }))
          )
        }

        // Compute rent reminder dates synchronously before parallel phase (pure date math)
        const toCreate = scheduledInterventions.filter(i => i.enabled && i.scheduledDate)
        let reminderDates: Date[] = []
        if (rentReminderConfig.enabled && formData.startDate && formData.durationMonths) {
          const leaseStart = parseLocalDate(formData.startDate)
          const leaseEnd = calculateContractEndDate(formData.startDate, formData.durationMonths)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const current = new Date(leaseStart.getFullYear(), leaseStart.getMonth(), 1)
          const endMonth = new Date(leaseEnd.getFullYear(), leaseEnd.getMonth(), 1)
          while (current <= endMonth) {
            const d = new Date(current.getFullYear(), current.getMonth(), rentReminderConfig.dayOfMonth)
            if (d >= today) reminderDates.push(d)
            current.setMonth(current.getMonth() + 1)
          }
        }

        // Parallelize: documents + interventions + reminders (US-E02)
        await Promise.all([
          // Op 1: Upload documents
          hasPendingUploads ? (async () => {
            logger.info('[CONTRACT-FORM] Uploading documents...')
            await uploadDocumentFiles(contractId)
          })() : Promise.resolve(),

          // Op 2: Create scheduled interventions
          toCreate.length > 0 ? (async () => {
            logger.info(`[CONTRACT-FORM] Creating ${toCreate.length} interventions...`)
            const { createInterventionAction } = await import('@/app/actions/intervention-actions')
            const results = await Promise.allSettled(
              toCreate.map(async (intervention) => createInterventionAction({
                title: intervention.title,
                description: intervention.description,
                type: intervention.interventionTypeCode,
                urgency: 'basse',
                lot_id: formData.lotId!,
                team_id: teamId,
                contract_id: contractId,
                requested_date: intervention.scheduledDate || undefined
              }, {
                useServiceRole: true,
                assignments: intervention.assignedUsers.length > 0
                  ? intervention.assignedUsers.map(a => ({ userId: a.userId, role: a.role }))
                  : undefined
              }))
            )
            const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
            const failedCount = results.length - successCount
            if (successCount > 0) {
              logger.info({ successCount, failedCount, contractId }, 'Lease interventions created')
            }
          })() : Promise.resolve(),

          // Op 3: Create rent payment reminders
          reminderDates.length > 0 ? (async () => {
            logger.info(`[CONTRACT-FORM] Creating ${reminderDates.length} rent payment reminders (batch)...`)
            const { createBatchRentRemindersAction } = await import('@/app/actions/intervention-actions')
            const reminders = reminderDates.map(date => {
              const monthLabel = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)
              return {
                title: `Rappel loyer — ${capitalizedMonth}`,
                scheduledDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
              }
            })
            const batchResult = await createBatchRentRemindersAction(reminders, {
              lot_id: formData.lotId!,
              team_id: teamId,
              contract_id: contractId,
              assignments: rentReminderConfig.assignedUsers.length > 0
                ? rentReminderConfig.assignedUsers.map(a => ({ userId: a.userId, role: a.role }))
                : undefined
            })
            if (batchResult.success && batchResult.data) {
              logger.info({ ...batchResult.data, contractId }, 'Rent payment reminders created (batch)')
            } else {
              logger.warn({ error: batchResult.error, contractId }, 'Batch rent reminders failed')
            }
          })() : Promise.resolve(),
        ])

        // Send notification (fire-and-forget — non-critical for user flow)
        createContractNotification(contractId).catch(() => {})

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
  const pageTitle = isSupplierMode
    ? 'Contrats fournisseurs'
    : mode === 'create' ? 'Nouveau bail' : 'Modifier le contrat'
  const submitLabel = isSupplierMode
    ? 'Créer les contrats'
    : mode === 'create' ? 'Créer le bail' : 'Enregistrer les modifications'
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
    // ── SUPPLIER MODE ──
    if (isSupplierMode) {
      switch (currentStep) {
        case 0: // Property selection (building or lot)
          return (
            <div className="flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center max-w-2xl mx-auto mb-4 flex-shrink-0">
                <h2 className="text-2xl font-bold mb-2">Sélectionnez le bien</h2>
                <p className="text-muted-foreground">
                  Choisissez l&apos;immeuble ou le lot auquel rattacher les contrats fournisseurs.
                </p>
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <PropertySelector
                  mode="select"
                  onBuildingSelect={handleBuildingSelect}
                  onLotSelect={handleLotSelect}
                  selectedBuildingId={selectedBuildingId || undefined}
                  selectedLotId={formData.lotId}
                  initialData={initialBuildingsData}
                  showViewToggle={true}
                  compactCards={true}
                  hideBuildingSelect={false}
                />
              </div>
            </div>
          )
        case 1: // Supplier contracts form
          return (
            <SupplierContractsStep
              contracts={supplierContracts}
              onContractsChange={setSupplierContracts}
              propertyReference={selectedBuildingName || (initialBuildingsData.lots.find((l: any) => l.id === formData.lotId)?.reference) || ''}
              teamId={teamId}
              existingContractCount={existingContractCount}
              onRequestContactCreation={(contactType) => {
                saveAndRedirect('/gestionnaire/contacts/nouveau', { type: contactType })
              }}
            />
          )
        case 2: { // Interventions — Reminder configuration via shared planner
          const customInterventions = supplierScheduledInterventions.filter(i => i.key.startsWith('custom_'))
          const contractInterventions = supplierScheduledInterventions.filter(i => !i.key.startsWith('custom_'))

          const supplierSections: InterventionPlannerSection[] = [
            {
              id: 'custom',
              title: 'Rappels personnalisés',
              icon: Calendar,
              iconColorClass: 'text-indigo-500',
              rows: customInterventions,
              allowCustomAdd: true,
            },
            {
              id: 'contract_reminders',
              title: 'Rappels de fin de contrat',
              icon: Bell,
              iconColorClass: 'text-amber-500',
              rows: contractInterventions,
            },
          ]

          return (
            <InterventionPlannerStep
              title="Rappels d'échéance"
              subtitle="Programmez des rappels avant les dates d'échéance de vos contrats fournisseurs. Cette étape est optionnelle."
              headerIcon={CalendarCheck}
              sections={supplierSections}
              scheduledInterventions={supplierScheduledInterventions}
              onInterventionsChange={setSupplierScheduledInterventions}
              teamId={teamId}
              assignableRoles={SUPPLIER_ASSIGNABLE_ROLES}
              allowedContactTypes={['manager', 'provider']}
              onAddCustomIntervention={handleSupplierAddCustom}
              onDeleteCustomIntervention={handleSupplierDeleteCustom}
              onCustomTitleChange={handleSupplierCustomTitleChange}
              onCustomDescriptionChange={handleSupplierCustomDescriptionChange}
            />
          )
        }
        case 3: // Confirmation
          return (
            <SupplierConfirmationStep
              contracts={supplierContracts}
              buildingName={selectedBuildingName}
              lotReference={initialBuildingsData.lots.find((l: any) => l.id === formData.lotId)?.reference}
              contacts={initialContacts}
              scheduledInterventions={supplierScheduledInterventions}
            />
          )
        default:
          return null
      }
    }

    // ── BAIL MODE (existing) ──
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
              onSetSlotExpiryDate={setSlotExpiryDate}
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
            startDate={formData.startDate ? parseLocalDate(formData.startDate) : null}
            endDate={formData.startDate && formData.durationMonths ? calculateContractEndDate(formData.startDate, formData.durationMonths) : null}
            teamId={teamId}
            leaseTenantIds={(formData.contacts || []).filter(c => c.role === 'locataire').map(c => c.userId)}
            availableContacts={initialContacts}
            rentReminderConfig={rentReminderConfig}
            onRentReminderChange={setRentReminderConfig}
          />
        )

      // Step 4: Confirmation
      case 4:
        const displayRef = formData.title?.trim() || generateContractReference(
          selectedLot?.reference,
          formData.startDate!,
          formData.durationMonths || 12
        )
        const endDate = formData.startDate && formData.durationMonths
          ? calculateContractEndDate(formData.startDate, formData.durationMonths)
          : null
        const durationLabel = CONTRACT_DURATION_OPTIONS.find(o => o.value === formData.durationMonths)?.label || `${formData.durationMonths} mois`
        const chargesTypeLabel = formData.chargesType ? CHARGES_TYPE_LABELS[formData.chargesType] : ''
        const frequencyLabel = formData.paymentFrequency ? PAYMENT_FREQUENCY_LABELS[formData.paymentFrequency] : ''
        const enabledInterventions = scheduledInterventions.filter(i => i.enabled && i.scheduledDate)
        const disabledInterventions = scheduledInterventions.filter(i => !i.enabled)

        // Map document slots for ConfirmationDocumentList
        const documentSlotsSummary = slots.map(slot => {
          const slotConfig = LEASE_DOCUMENT_SLOTS.find(s => s.type === slot.type)
          return {
            label: slotConfig?.label || slot.type,
            fileCount: slot.files.length,
            fileNames: slot.files.map((f: any) => ({ name: f.name || f.fileName || '', url: f.signedUrl })),
            recommended: slotConfig?.recommended ?? false,
          }
        })

        // Map contacts into groups for ConfirmationContactGrid
        const tenantContacts = (formData.contacts || [])
          .filter(c => c.role === 'locataire')
          .map(c => {
            const info = initialContacts.find(ic => ic.id === c.userId)
            return { id: c.userId, name: info?.name || 'Inconnu', email: info?.email || undefined, sublabel: CONTRACT_CONTACT_ROLE_LABELS[c.role] }
          })
        const guarantorContacts = (formData.contacts || [])
          .filter(c => c.role === 'garant')
          .map(c => {
            const info = initialContacts.find(ic => ic.id === c.userId)
            return { id: c.userId, name: info?.name || 'Inconnu', email: info?.email || undefined, sublabel: CONTRACT_CONTACT_ROLE_LABELS[c.role] }
          })

        // Guarantee pairs
        const guaranteePairs = (() => {
          if (formData.guaranteeType === 'pas_de_garantie' || !formData.guaranteeType) {
            return [{ label: 'Type', value: 'Aucune garantie' }]
          }
          const pairs: { label: string; value: React.ReactNode; empty?: boolean }[] = [
            { label: 'Type', value: GUARANTEE_TYPE_LABELS[formData.guaranteeType] },
            { label: 'Montant', value: formData.guaranteeAmount ? `${formData.guaranteeAmount.toLocaleString('fr-FR')} €` : undefined, empty: !formData.guaranteeAmount },
            { label: 'Notes', value: formData.guaranteeNotes || undefined, empty: !formData.guaranteeNotes },
          ]
          return pairs
        })()

        return (
          <ConfirmationPageShell maxWidth="5xl">
            <ConfirmationEntityHeader
              icon={FileText}
              title={displayRef}
              subtitle={selectedLot ? `${selectedLot.building?.name || 'Lot'} · Lot ${selectedLot.reference}` : undefined}
              badges={[
                { label: durationLabel },
                { label: formData.startDate ? parseLocalDate(formData.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '' },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
              {/* RIGHT COLUMN (sidebar) - order-first on mobile */}
              <div className="order-first lg:order-none lg:col-start-2">
                <ConfirmationFinancialHighlight
                  title="Finances"
                  icon={Euro}
                  lines={[
                    { label: 'Loyer HC', value: `${(formData.rentAmount || 0).toLocaleString('fr-FR')} €` },
                    { label: 'Charges', value: `${(formData.chargesAmount || 0).toLocaleString('fr-FR')} €` },
                    { label: 'Type charges', value: chargesTypeLabel, muted: true },
                    { label: 'Frequence', value: frequencyLabel, muted: true },
                  ]}
                  totalLabel="Total mensuel"
                  totalValue={`${monthlyTotal.toLocaleString('fr-FR')} €`}
                />
              </div>

              {/* LEFT COLUMN */}
              <div className="space-y-5 lg:col-start-1 lg:row-start-1">
                <ConfirmationSection title="Lot concerne">
                  <ConfirmationKeyValueGrid pairs={[
                    { label: 'Immeuble', value: selectedLot?.building?.name || 'N/A', empty: !selectedLot?.building?.name },
                    { label: 'Reference lot', value: selectedLot?.reference || 'N/A', empty: !selectedLot?.reference },
                    { label: 'Adresse', value: selectedLot?.street || selectedLot?.city || undefined, empty: !selectedLot?.street && !selectedLot?.city },
                    { label: 'Etage', value: selectedLot?.floor != null ? `${selectedLot.floor}` : undefined, empty: selectedLot?.floor == null },
                  ]} />
                </ConfirmationSection>

                <ConfirmationSection title="Details du bail">
                  <ConfirmationKeyValueGrid pairs={[
                    { label: 'Reference', value: <span className="font-mono text-primary">{displayRef}</span> },
                    { label: "Date d'effet", value: formData.startDate ? parseLocalDate(formData.startDate).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : undefined, empty: !formData.startDate },
                    { label: 'Date de fin', value: endDate ? endDate.toLocaleDateString('fr-FR', { dateStyle: 'long' }) : undefined, empty: !endDate },
                    { label: 'Duree', value: durationLabel },
                    { label: 'Type de charges', value: chargesTypeLabel, empty: !chargesTypeLabel },
                    { label: 'Frequence de paiement', value: frequencyLabel, empty: !frequencyLabel },
                    ...(formData.comments ? [{ label: 'Commentaires', value: formData.comments, fullWidth: true }] : []),
                  ]} />
                </ConfirmationSection>

                <ConfirmationSection title="Garantie">
                  <ConfirmationKeyValueGrid pairs={guaranteePairs} />
                </ConfirmationSection>

                <ConfirmationSection title="Signataires">
                  <ConfirmationContactGrid
                    groups={[
                      { type: 'Locataires', contacts: tenantContacts, emptyLabel: 'Aucun locataire' },
                      { type: 'Garants', contacts: guarantorContacts, emptyLabel: 'Aucun garant' },
                    ]}
                    columns={2}
                  />
                </ConfirmationSection>

                <ConfirmationSection title="Documents">
                  <ConfirmationDocumentList slots={documentSlotsSummary} />
                </ConfirmationSection>

                <ConfirmationSection title="Interventions & rappels">
                  {(enabledInterventions.length > 0 || rentReminderConfig.enabled) ? (
                    <div className="space-y-2">
                      {enabledInterventions.map((intervention, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{intervention.title}</span>
                            <span className="text-muted-foreground">
                              - {intervention.scheduledDate ? format(intervention.scheduledDate, 'dd/MM/yyyy') : '\u2014'}
                            </span>
                            {intervention.assignedUsers.length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {intervention.assignedUsers.map(user => (
                                  <ParticipantChip
                                    key={user.userId}
                                    participant={{ id: user.userId, name: user.name }}
                                    roleKey={user.role === 'gestionnaire' ? 'managers' : user.role === 'prestataire' ? 'providers' : 'tenants'}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {disabledInterventions.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span>
                            {disabledInterventions.length} intervention(s) desactivee(s)
                          </span>
                        </div>
                      )}
                      {rentReminderConfig.enabled && (
                        <div className="mt-4 flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="font-medium">Rappels de paiement du loyer</span>
                          <span className="text-muted-foreground">&mdash; le {rentReminderConfig.dayOfMonth} de chaque mois</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune intervention planifiee</p>
                  )}
                </ConfirmationSection>
              </div>
            </div>

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
                        <p className="text-sm text-amber-700">- {toRemove} contact(s) seront retires</p>
                      )}
                      {toAdd > 0 && (
                        <p className="text-sm text-amber-700">+ {toAdd} contact(s) seront ajoutes</p>
                      )}
                    </CardContent>
                  </Card>
                )
              }
              return null
            })()}
          </ConfirmationPageShell>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* HEADER - StepProgressHeader */}
      <StepProgressHeader
        steps={activeSteps}
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
              data-testid="wizard-prev-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          )}

          {currentStep < activeSteps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto ml-auto"
              data-testid="wizard-next-btn"
            >
              Continuer
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !validateStep(currentStep)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto ml-auto"
              data-testid="wizard-submit-btn"
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
