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
import { createContract, addContractContact } from '@/app/actions/contract-actions'
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
  FileText
} from 'lucide-react'
import { logger } from '@/lib/logger'
import type {
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
  ContractCreationClientProps
} from '@/lib/types/contract.types'
import {
  GUARANTEE_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  CONTRACT_CONTACT_ROLE_LABELS
} from '@/lib/types/contract.types'

// Initial form data (title is editable but can be auto-generated)
const initialFormData: Partial<ContractFormData> = {
  lotId: '',
  title: '', // Editable reference
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

// Generate contract reference from lot and dates: BAIL-{LOT_REF}-{START}-{END}
function generateContractReference(lotReference: string | undefined, startDate: string, durationMonths: number): string {
  if (!lotReference || !startDate) return ''
  const start = new Date(startDate)
  const end = new Date(startDate)
  end.setMonth(end.getMonth() + durationMonths)

  const formatDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  return `BAIL-${lotReference}-${formatDate(start)}-${formatDate(end)}`
}

export default function ContractCreationClient({
  teamId,
  initialBuildingsData,
  initialContacts,
  prefilledLotId,
  renewFromId: _renewFromId, // Reserved for renewal feature
  // Props pour retour après création de contact
  sessionKey: initialSessionKey,
  newContactId: initialNewContactId,
  contactType: initialContactType
}: ContractCreationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<ContractFormData>>({
    ...initialFormData,
    lotId: prefilledLotId || ''
  })
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // État complet du formulaire (à sauvegarder/restaurer)
  const formState = useMemo(() => ({
    currentStep,
    formData,
    uploadedFiles: [] // Les fichiers ne peuvent pas être sérialisés
  }), [currentStep, formData])

  // Hook pour sauvegarder et rediriger
  const { saveAndRedirect } = useSaveFormState(formState)

  // Hook pour restaurer l'état après retour de création de contact
  const { newContactId, sessionKey } = useRestoreFormState((restoredState: any) => {
    logger.info(`📥 [CONTRACT-FORM] Restoring form state after contact creation`)
    setCurrentStep(restoredState.currentStep)
    setFormData(restoredState.formData)
  })

  // Handle lot selection from PropertySelector
  const handleLotSelect = useCallback((lotId: string | null) => {
    updateField('lotId', lotId || '')
  }, [])

  // Get selected lot from buildingsData
  const selectedLot = useMemo(() => {
    return initialBuildingsData.lots.find((lot: any) => lot.id === formData.lotId)
  }, [initialBuildingsData.lots, formData.lotId])

  // Computed arrays for ContactSection: map formData.contacts to full contact objects
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

  // Update form field
  const updateField = useCallback(<K extends keyof ContractFormData>(
    field: K,
    value: ContractFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Contact management
  const addContact = useCallback((contactId: string, role: ContractContactRole) => {
    // Check if contact already added with this role
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

  // Auto-sélectionner le nouveau contact après retour de création
  useEffect(() => {
    const contactId = newContactId || initialNewContactId
    const contactTypeParam = searchParams.get('contactType') || initialContactType
    const sessionKeyParam = sessionKey || initialSessionKey

    if (!contactId || !sessionKeyParam) return

    logger.info(`✅ [CONTRACT-FORM] New contact created: ${contactId}`)

    // Récupérer les données du contact depuis sessionStorage
    const contactDataStr = sessionStorage.getItem(`contact-data-${sessionKeyParam}`)
    if (!contactDataStr) {
      logger.warn(`⚠️ [CONTRACT-FORM] No contact data found in sessionStorage`)
      return
    }

    try {
      const contactData = JSON.parse(contactDataStr)

      // Mapper le type vers le rôle ContractContactRole
      const roleMap: Record<string, ContractContactRole> = {
        'tenant': 'locataire',
        'locataire': 'locataire',
        'guarantor': 'garant',
        'garant': 'garant'
      }
      const role = roleMap[contactTypeParam || ''] || 'locataire'

      // Vérifier si le contact n'est pas déjà sélectionné
      const alreadySelected = formData.contacts?.some(c => c.userId === contactId)
      if (alreadySelected) {
        logger.info(`ℹ️ [CONTRACT-FORM] Contact already selected: ${contactId}`)
        sessionStorage.removeItem(`contact-data-${sessionKeyParam}`)
        return
      }

      // Ajouter le contact
      addContact(contactId, role)

      // Afficher un toast de confirmation
      toast.success(`${contactData.name} ajouté automatiquement !`)

      // Nettoyer sessionStorage
      sessionStorage.removeItem(`contact-data-${sessionKeyParam}`)
    } catch (error) {
      logger.error(`❌ [CONTRACT-FORM] Error parsing contact data:`, error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newContactId, initialNewContactId, sessionKey, initialSessionKey])

  // Validation per step (4 steps total after merge)
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Lot selection
        return !!formData.lotId
      case 1: // Merged: Details (dates + payments)
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
    // Only allow going back or to the next valid step
    if (index < currentStep) {
      setCurrentStep(index)
    } else if (index === currentStep + 1 && validateStep(currentStep)) {
      setCurrentStep(index)
    }
  }, [currentStep, validateStep])

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez compléter tous les champs requis')
      return
    }

    setIsSubmitting(true)

    try {
      // Use user-provided title or auto-generate from lot reference and dates
      const finalTitle = formData.title?.trim() || generateContractReference(
        selectedLot?.reference,
        formData.startDate!,
        formData.durationMonths || 12
      )

      // Create the contract
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

      // Send notifications for new contract
      await createContractNotification(contractId)

      toast.success('Bail créé avec succès')
      router.push(`/gestionnaire/contrats/${contractId}`)
    } catch (error) {
      logger.error('Error creating contract:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du bail')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, teamId, router, currentStep, validateStep])

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
                Choisissez le lot auquel sera associé ce bail.
              </p>
            </div>

            {/* PropertySelector with view toggle */}
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

      // Step 2: Merged Details (Dates + Payments)
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
            files={uploadedFiles}
            onFilesChange={setUploadedFiles}
            onFieldChange={(field, value) => updateField(field as keyof ContractFormData, value)}
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

              {/* Contacts section using reusable ContactSection - Side by side layout */}
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

            {/* Reusable ContactSelector modal (same as building/lot/intervention) */}
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
              // Redirection vers le wizard multi-étapes pour création de contact
              onRequestContactCreation={(contactType) => {
                logger.info(`🔗 [CONTRACT-FORM] Redirecting to contact creation flow`, { contactType })
                saveAndRedirect('/gestionnaire/contacts/nouveau', { type: contactType })
              }}
            />
          </Card>
        )

      // Step 4: Confirmation
      case 3:
        // Use user-provided title or generate one
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
                Vérifiez les informations avant de créer le bail.
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
        title="Nouveau bail"
        backButtonText="Retour"
        onBack={() => router.push('/gestionnaire/contrats')}
      />

      {/* MAIN CONTENT - Pattern Immeuble */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 sm:px-6 lg:px-10 pt-10 pb-20">
        {renderStepContent()}
      </div>

      {/* FOOTER STICKY - Pattern Immeuble */}
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
              {isSubmitting ? 'Création...' : 'Créer le bail'}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
