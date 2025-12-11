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
  Save
} from 'lucide-react'
import { logger } from '@/lib/logger'
import { useContractUpload } from '@/hooks/use-contract-upload'
import type {
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
  ContractWithRelations,
  ContractDocumentType
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
  contacts: [],
  guaranteeType: 'pas_de_garantie',
  guaranteeAmount: undefined,
  guaranteeNotes: ''
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Generate contract reference from lot and dates: BAIL-{LOT_REF}-{START}-{END}
function generateContractReference(lotReference: string | undefined, startDate: string, durationMonths: number): string {
  if (!lotReference || !startDate) return ''
  const start = new Date(startDate)
  const end = new Date(startDate)
  end.setMonth(end.getMonth() + durationMonths)

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
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Document upload hook with category support
  const {
    files: documentFiles,
    isUploading: isUploadingDocuments,
    addFiles: addDocumentFiles,
    removeFile: removeDocumentFile,
    updateFileDocumentType,
    uploadFiles: uploadDocumentFiles,
    hasFiles: hasDocuments,
    hasPendingUploads
  } = useContractUpload({
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

  // Validation per step (4 steps total)
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Lot selection
        return !!formData.lotId
      case 1: // Details + Payments
        return !!(formData.startDate && formData.durationMonths && formData.rentAmount && formData.rentAmount > 0)
      case 2: // Contacts & Guarantee
        const hasLocataire = (formData.contacts || []).some(c => c.role === 'locataire')
        return hasLocataire
      case 3: // Confirmation
        return true
      default:
        return false
    }
  }, [formData])

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
  }, [])

  const handleStepClick = useCallback((index: number) => {
    if (index < currentStep) {
      setCurrentStep(index)
    } else if (index === currentStep + 1 && validateStep(currentStep)) {
      setCurrentStep(index)
    }
  }, [currentStep, validateStep])

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
          logger.info({ fileCount: documentFiles.length }, '📤 [CONTRACT-FORM] Uploading documents...')
          await uploadDocumentFiles(contractId)
        }

        // Send notification
        await createContractNotification(contractId)

        toast.success('Bail créé avec succès')
        router.push(`/gestionnaire/contrats/${contractId}`)
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
          logger.info({ fileCount: documentFiles.length }, '📤 [CONTRACT-FORM] Uploading new documents...')
          await uploadDocumentFiles(contractId)
        }

        toast.success('Contrat mis à jour avec succès')
        router.push(`/gestionnaire/contrats/${contractId}`)
      }
    } catch (error) {
      logger.error(`Error ${mode === 'create' ? 'creating' : 'updating'} contract:`, error)
      toast.error(error instanceof Error ? error.message : `Erreur lors de ${mode === 'create' ? 'la création' : 'la mise à jour'} du bail`)
    } finally {
      setIsSubmitting(false)
    }
  }, [mode, formData, teamId, existingContract, router, currentStep, validateStep, selectedLot, syncContacts, hasPendingUploads, documentFiles.length, uploadDocumentFiles])

  // Page title based on mode
  const pageTitle = mode === 'create' ? 'Nouveau bail' : 'Modifier le contrat'
  const submitLabel = mode === 'create' ? 'Créer le bail' : 'Enregistrer les modifications'
  const submitIcon = mode === 'create' ? Check : Save
  const SubmitIcon = submitIcon

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      // Step 1: Lot Selection
      case 0:
        return (
          <div className="content-max-width space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center max-w-2xl mx-auto mb-4">
              <h2 className="text-2xl font-bold mb-2">Sélectionnez le lot</h2>
              <p className="text-muted-foreground">
                {mode === 'create'
                  ? 'Choisissez le lot auquel sera associé ce bail.'
                  : 'Modifiez le lot si nécessaire (attention: cette action peut avoir des conséquences).'}
              </p>
            </div>

            <div className="h-[500px] w-full overflow-hidden">
              <PropertySelector
                mode="select"
                onLotSelect={handleLotSelect}
                selectedLotId={formData.lotId}
                initialData={initialBuildingsData}
                showViewToggle={true}
                showOnlyLots={true}
              />
            </div>
          </div>
        )

      // Step 2: Merged Details (Dates + Payments + Documents with categories)
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
            files={documentFiles}
            onAddFiles={addDocumentFiles}
            onRemoveFile={removeDocumentFile}
            onUpdateFileType={updateFileDocumentType}
            isUploading={isUploadingDocuments}
            onFieldChange={(field, value) => updateField(field as keyof ContractFormData, value)}
            lotId={formData.lotId}
            existingContractId={existingContract?.id}
          />
        )

      // Step 3: Contacts & Guarantee
      case 2:
        return (
          <Card className="shadow-sm content-max-width min-w-0">
            <CardContent className="px-6 py-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Contacts et garantie</h2>
                <p className="text-sm text-muted-foreground">
                  Ajoutez les locataires et garants, puis définissez la garantie locative.
                </p>
              </div>

              {/* Contacts section - Side by side layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ContactSection
                  sectionType="tenants"
                  contacts={selectedTenants}
                  onAddContact={() => contactSelectorRef.current?.openContactModal('tenant')}
                  onRemoveContact={(id) => removeContactById(id, 'locataire')}
                  minRequired={1}
                />

                <ContactSection
                  sectionType="guarantors"
                  contacts={selectedGuarantors}
                  onAddContact={() => contactSelectorRef.current?.openContactModal('guarantor')}
                  onRemoveContact={(id) => removeContactById(id, 'garant')}
                />
              </div>

              <Separator />

              {/* Guarantee section */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Garantie locative
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Type de garantie</Label>
                    <Select
                      value={formData.guaranteeType}
                      onValueChange={(value) => updateField('guaranteeType', value as GuaranteeType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(GUARANTEE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.guaranteeType !== 'pas_de_garantie' && (
                    <div>
                      <Label htmlFor="guaranteeAmount">Montant de la garantie</Label>
                      <div className="relative">
                        <Input
                          id="guaranteeAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.guaranteeAmount || ''}
                          onChange={(e) => updateField('guaranteeAmount', parseFloat(e.target.value) || undefined)}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                    </div>
                  )}

                  {formData.guaranteeType !== 'pas_de_garantie' && (
                    <div className="md:col-span-2">
                      <Label htmlFor="guaranteeNotes">Notes sur la garantie</Label>
                      <Textarea
                        id="guaranteeNotes"
                        value={formData.guaranteeNotes}
                        onChange={(e) => updateField('guaranteeNotes', e.target.value)}
                        placeholder="Informations complémentaires..."
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>

            {/* ContactSelector modal */}
            <ContactSelector
              ref={contactSelectorRef}
              teamId={teamId}
              displayMode="compact"
              hideUI={true}
              selectionMode="multi"
              allowedContactTypes={['tenant', 'guarantor']}
              selectedContacts={{
                tenant: selectedTenants,
                guarantor: selectedGuarantors
              }}
              onContactSelected={(contact, contactType) => {
                const role = contactType === 'tenant' ? 'locataire' : 'garant'
                addContact(contact.id, role as ContractContactRole)
              }}
              onContactRemoved={(contactId, contactType) => {
                const role = contactType === 'tenant' ? 'locataire' : 'garant'
                removeContactById(contactId, role as ContractContactRole)
              }}
              onRequestContactCreation={(contactType) => {
                if (mode === 'create') {
                  logger.info(`🔗 [CONTRACT-FORM] Redirecting to contact creation flow`, { contactType })
                  saveAndRedirect('/gestionnaire/contacts/nouveau', { type: contactType })
                } else {
                  // In edit mode, open new tab or show message
                  toast.info('Créez d\'abord le contact depuis la page contacts, puis revenez ici.')
                }
              }}
            />
          </Card>
        )

      // Step 4: Confirmation
      case 3:
        const displayRef = formData.title?.trim() || generateContractReference(
          selectedLot?.reference,
          formData.startDate!,
          formData.durationMonths || 12
        )
        return (
          <div className="content-max-width space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        {new Date(formData.startDate!).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
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
        currentStep={currentStep}
        title={pageTitle}
        backButtonText="Retour"
        onBack={() => {
          if (mode === 'create') {
            router.push('/gestionnaire/contrats')
          } else {
            router.push(`/gestionnaire/contrats/${existingContract?.id}`)
          }
        }}
        onStepClick={handleStepClick}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pt-10 pb-20">
        {renderStepContent()}
      </div>

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
