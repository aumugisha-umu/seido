"use client"

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StepProgressHeader } from '@/components/ui/step-progress-header'
import { contractSteps } from '@/lib/step-configurations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createContract, addContractContact } from '@/app/actions/contract-actions'
import { createContractNotification } from '@/app/actions/notification-actions'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Home,
  Search,
  X,
  Euro,
  Calendar,
  Users,
  Shield,
  FileText,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import type {
  ContractType,
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
  ContractCreationClientProps
} from '@/lib/types/contract.types'
import {
  CONTRACT_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  GUARANTEE_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  CONTRACT_CONTACT_ROLE_LABELS
} from '@/lib/types/contract.types'

// Initial form data
const initialFormData: Partial<ContractFormData> = {
  lotId: '',
  title: '',
  contractType: 'bail_habitation',
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

export default function ContractCreationClient({
  teamId,
  initialLots,
  initialContacts,
  prefilledLotId,
  renewFromId
}: ContractCreationClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<ContractFormData>>({
    ...initialFormData,
    lotId: prefilledLotId || ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [contactSearchTerm, setContactSearchTerm] = useState('')

  // Filter lots by search term
  const filteredLots = useMemo(() => {
    if (!searchTerm) return initialLots
    const term = searchTerm.toLowerCase()
    return initialLots.filter(lot =>
      lot.reference.toLowerCase().includes(term) ||
      lot.building?.name?.toLowerCase().includes(term) ||
      lot.building?.address?.toLowerCase().includes(term) ||
      lot.street?.toLowerCase().includes(term) ||
      lot.city?.toLowerCase().includes(term)
    )
  }, [initialLots, searchTerm])

  // Filter contacts by search term and role
  const filteredContacts = useMemo(() => {
    let filtered = initialContacts
    if (contactSearchTerm) {
      const term = contactSearchTerm.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term)
      )
    }
    return filtered
  }, [initialContacts, contactSearchTerm])

  // Get selected lot
  const selectedLot = useMemo(() => {
    return initialLots.find(lot => lot.id === formData.lotId)
  }, [initialLots, formData.lotId])

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
  const addContact = useCallback((contactId: string, role: ContractContactRole, isPrimary: boolean = false) => {
    setFormData(prev => ({
      ...prev,
      contacts: [
        ...(prev.contacts || []),
        { userId: contactId, role, isPrimary }
      ]
    }))
  }, [])

  const removeContact = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter((_, i) => i !== index)
    }))
  }, [])

  const togglePrimary = useCallback((index: number) => {
    setFormData(prev => {
      const contacts = [...(prev.contacts || [])]
      const targetContact = contacts[index]

      // Remove primary from others with same role
      contacts.forEach((c, i) => {
        if (c.role === targetContact.role && i !== index) {
          c.isPrimary = false
        }
      })

      // Toggle target
      contacts[index] = { ...targetContact, isPrimary: !targetContact.isPrimary }
      return { ...prev, contacts }
    })
  }, [])

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 0: // Lot selection
        return !!formData.lotId
      case 1: // Contract info
        return !!(formData.title && formData.startDate && formData.durationMonths)
      case 2: // Payments
        return formData.rentAmount !== undefined && formData.rentAmount > 0
      case 3: // Contacts & Guarantee
        const hasLocataire = (formData.contacts || []).some(c => c.role === 'locataire')
        return hasLocataire
      case 4: // Confirmation
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
      // Create the contract
      const contractResult = await createContract({
        team_id: teamId,
        lot_id: formData.lotId!,
        title: formData.title!,
        contract_type: formData.contractType as ContractType,
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
        throw new Error(contractResult.error || 'Erreur lors de la création du contrat')
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

      toast.success('Contrat créé avec succès')
      router.push(`/gestionnaire/contrats/${contractId}`)
    } catch (error) {
      logger.error('Error creating contract:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du contrat')
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
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Sélectionnez le lot</h2>
              <p className="text-sm text-muted-foreground">
                Choisissez le lot auquel sera associé ce contrat de bail.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un lot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lots grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
              {filteredLots.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun lot disponible</p>
                </div>
              ) : (
                filteredLots.map((lot) => (
                  <Card
                    key={lot.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      formData.lotId === lot.id && 'ring-2 ring-primary'
                    )}
                    onClick={() => updateField('lotId', lot.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {lot.building ? (
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                          ) : (
                            <Home className="h-8 w-8 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">
                              {lot.building ? `${lot.building.name} - ` : ''}Lot {lot.reference}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {lot.building?.address || lot.street || lot.city || lot.category}
                            </p>
                          </div>
                        </div>
                        {formData.lotId === lot.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )

      // Step 2: Contract Info
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Informations du contrat</h2>
              <p className="text-sm text-muted-foreground">
                Renseignez les informations générales du bail.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="md:col-span-2">
                <Label htmlFor="title">Titre du contrat *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Ex: Bail appartement T3 - Dupont"
                />
              </div>

              {/* Contract type */}
              <div>
                <Label>Type de contrat *</Label>
                <RadioGroup
                  value={formData.contractType}
                  onValueChange={(value) => updateField('contractType', value as ContractType)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bail_habitation" id="bail_habitation" />
                    <Label htmlFor="bail_habitation" className="font-normal">
                      Bail d'habitation (vide)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bail_meuble" id="bail_meuble" />
                    <Label htmlFor="bail_meuble" className="font-normal">
                      Bail meublé
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Start date */}
              <div>
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Durée du bail *</Label>
                <Select
                  value={String(formData.durationMonths)}
                  onValueChange={(value) => updateField('durationMonths', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Comments */}
              <div className="md:col-span-2">
                <Label htmlFor="comments">Commentaires</Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => updateField('comments', e.target.value)}
                  placeholder="Notes supplémentaires..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        )

      // Step 3: Payments
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Informations de paiement</h2>
              <p className="text-sm text-muted-foreground">
                Définissez le loyer et les charges mensuelles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment frequency */}
              <div>
                <Label>Fréquence de paiement</Label>
                <Select
                  value={formData.paymentFrequency}
                  onValueChange={(value) => updateField('paymentFrequency', value as PaymentFrequency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div /> {/* Spacer */}

              {/* Rent amount */}
              <div>
                <Label htmlFor="rentAmount">Loyer (hors charges) *</Label>
                <div className="relative">
                  <Input
                    id="rentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rentAmount || ''}
                    onChange={(e) => updateField('rentAmount', parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
              </div>

              {/* Charges amount */}
              <div>
                <Label htmlFor="chargesAmount">Charges</Label>
                <div className="relative">
                  <Input
                    id="chargesAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.chargesAmount || ''}
                    onChange={(e) => updateField('chargesAmount', parseFloat(e.target.value) || 0)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total mensuel</span>
                  <span className="text-2xl font-bold text-primary">
                    {monthlyTotal.toLocaleString('fr-FR')} €
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      // Step 4: Contacts & Guarantee
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Contacts et garantie</h2>
              <p className="text-sm text-muted-foreground">
                Ajoutez les locataires et garants, puis définissez la garantie locative.
              </p>
            </div>

            {/* Contacts section */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contacts liés au contrat
              </h3>

              {/* Selected contacts */}
              {(formData.contacts || []).length > 0 && (
                <div className="space-y-2">
                  {(formData.contacts || []).map((contact, index) => {
                    const contactInfo = initialContacts.find(c => c.id === contact.userId)
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {contactInfo?.name?.[0] || 'C'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{contactInfo?.name}</p>
                            <p className="text-xs text-muted-foreground">{contactInfo?.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={contact.role === 'locataire' ? 'default' : 'secondary'}>
                            {CONTRACT_CONTACT_ROLE_LABELS[contact.role]}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Checkbox
                              checked={contact.isPrimary}
                              onCheckedChange={() => togglePrimary(index)}
                              id={`primary-${index}`}
                            />
                            <Label htmlFor={`primary-${index}`} className="text-xs">
                              Principal
                            </Label>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeContact(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Contact search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un contact..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Available contacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {filteredContacts.filter(c =>
                  !(formData.contacts || []).some(fc => fc.userId === c.id)
                ).slice(0, 10).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 rounded border border-border hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.email}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addContact(contact.id, 'locataire', true)}
                      >
                        + Locataire
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addContact(contact.id, 'garant', false)}
                      >
                        + Garant
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning if no locataire */}
              {!(formData.contacts || []).some(c => c.role === 'locataire') && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">Au moins un locataire est requis pour créer le contrat.</span>
                </div>
              )}
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
          </div>
        )

      // Step 5: Confirmation
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Récapitulatif</h2>
              <p className="text-sm text-muted-foreground">
                Vérifiez les informations avant de créer le contrat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lot info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Lot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedLot && (
                    <div>
                      <p className="font-medium">
                        {selectedLot.building ? `${selectedLot.building.name} - ` : ''}
                        Lot {selectedLot.reference}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedLot.address || selectedLot.city}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contract info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Contrat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="font-medium">{formData.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {CONTRACT_TYPE_LABELS[formData.contractType as ContractType]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Début: {new Date(formData.startDate!).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Durée: {CONTRACT_DURATION_OPTIONS.find(o => o.value === formData.durationMonths)?.label || `${formData.durationMonths} mois`}
                  </p>
                </CardContent>
              </Card>

              {/* Financial info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Finances
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loyer</span>
                    <span>{formData.rentAmount?.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Charges</span>
                    <span>{(formData.chargesAmount || 0).toLocaleString('fr-FR')} €</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total mensuel</span>
                    <span className="text-primary">{monthlyTotal.toLocaleString('fr-FR')} €</span>
                  </div>
                </CardContent>
              </Card>

              {/* Contacts info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contacts ({(formData.contacts || []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(formData.contacts || []).map((contact, index) => {
                    const info = initialContacts.find(c => c.id === contact.userId)
                    return (
                      <div key={index} className="flex items-center gap-2 py-1">
                        <span className="font-medium">{info?.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {CONTRACT_CONTACT_ROLE_LABELS[contact.role]}
                        </Badge>
                        {contact.isPrimary && (
                          <Badge variant="outline" className="text-xs">Principal</Badge>
                        )}
                      </div>
                    )
                  })}
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
    <div className="contract-creation min-h-screen bg-background">
      {/* Step header */}
      <StepProgressHeader
        steps={contractSteps}
        currentStep={currentStep}
        title="Nouveau contrat"
        onStepClick={handleStepClick}
        onBack={() => router.push('/gestionnaire/contrats')}
      />

      {/* Main content */}
      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            {renderStepContent()}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Précédent
              </Button>

              {currentStep < contractSteps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!validateStep(currentStep)}
                >
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !validateStep(currentStep)}
                >
                  {isSubmitting ? 'Création...' : 'Créer le contrat'}
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
