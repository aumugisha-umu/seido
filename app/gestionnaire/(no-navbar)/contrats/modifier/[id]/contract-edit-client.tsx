"use client"

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { StepProgressHeader } from '@/components/ui/step-progress-header'
import { contractSteps } from '@/lib/step-configurations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  updateContract,
  addContractContact,
  removeContractContact,
  updateContractContact
} from '@/app/actions/contract-actions'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Home,
  Search,
  X,
  Euro,
  Users,
  Shield,
  FileText,
  AlertCircle,
  Save
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import type {
  ContractType,
  ContractFormData,
  PaymentFrequency,
  GuaranteeType,
  ContractContactRole,
  ContractEditClientProps,
  ContractContactWithUser
} from '@/lib/types/contract.types'
import {
  CONTRACT_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
  GUARANTEE_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  CONTRACT_CONTACT_ROLE_LABELS
} from '@/lib/types/contract.types'

/**
 * ContractEditClient - Formulaire d'edition de contrat (5 etapes)
 *
 * Similaire au formulaire de creation mais avec:
 * - Donnees pre-remplies a partir du contrat existant
 * - Gestion des contacts existants (modification/suppression)
 * - Appel a updateContract au lieu de createContract
 */
export default function ContractEditClient({
  teamId,
  contract,
  initialLots,
  initialContacts
}: ContractEditClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data from existing contract
  const [formData, setFormData] = useState<Partial<ContractFormData>>({
    lotId: contract.lot_id,
    title: contract.title,
    contractType: contract.contract_type,
    startDate: contract.start_date,
    durationMonths: contract.duration_months,
    comments: contract.comments || '',
    paymentFrequency: contract.payment_frequency,
    paymentFrequencyValue: contract.payment_frequency_value,
    rentAmount: contract.rent_amount,
    chargesAmount: contract.charges_amount,
    contacts: (contract.contacts || []).map(c => ({
      id: c.id, // Keep track of existing contact record ID
      userId: c.user_id,
      role: c.role,
      isPrimary: c.is_primary
    })),
    guaranteeType: contract.guarantee_type,
    guaranteeAmount: contract.guarantee_amount || undefined,
    guaranteeNotes: contract.guarantee_notes || ''
  })

  // Track contacts to add/remove/update
  const [contactsToRemove, setContactsToRemove] = useState<string[]>([])
  const [contactsToAdd, setContactsToAdd] = useState<{userId: string; role: ContractContactRole; isPrimary: boolean}[]>([])
  const [contactsToUpdate, setContactsToUpdate] = useState<{id: string; role: ContractContactRole; isPrimary: boolean}[]>([])

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

  // Filter contacts by search term
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

  // Contact management for edit mode
  const addContact = useCallback((contactId: string, role: ContractContactRole, isPrimary: boolean = false) => {
    // Check if it's an existing contact being re-added
    const existingContact = contract.contacts?.find(c => c.user_id === contactId)
    if (existingContact) {
      // Remove from removal list if it was marked for removal
      setContactsToRemove(prev => prev.filter(id => id !== existingContact.id))
    } else {
      // Add to new contacts list
      setContactsToAdd(prev => [...prev, { userId: contactId, role, isPrimary }])
    }

    setFormData(prev => ({
      ...prev,
      contacts: [
        ...(prev.contacts || []),
        { userId: contactId, role, isPrimary }
      ]
    }))
  }, [contract.contacts])

  const removeContact = useCallback((index: number) => {
    const contactToRemove = formData.contacts?.[index]
    if (!contactToRemove) return

    // Check if this is an existing contact (has an id from DB)
    const existingContact = contract.contacts?.find(c => c.user_id === contactToRemove.userId)
    if (existingContact) {
      setContactsToRemove(prev => [...prev, existingContact.id])
    } else {
      // Remove from new contacts list
      setContactsToAdd(prev => prev.filter(c => c.userId !== contactToRemove.userId))
    }

    setFormData(prev => ({
      ...prev,
      contacts: (prev.contacts || []).filter((_, i) => i !== index)
    }))
  }, [formData.contacts, contract.contacts])

  const togglePrimary = useCallback((index: number) => {
    setFormData(prev => {
      const contacts = [...(prev.contacts || [])]
      const targetContact = contacts[index]

      // Remove primary from others with same role
      contacts.forEach((c, i) => {
        if (c.role === targetContact.role && i !== index) {
          c.isPrimary = false

          // Track update for existing contacts
          const existingContact = contract.contacts?.find(ec => ec.user_id === c.userId)
          if (existingContact) {
            setContactsToUpdate(prev => {
              const existing = prev.find(u => u.id === existingContact.id)
              if (existing) {
                existing.isPrimary = false
                return [...prev]
              }
              return [...prev, { id: existingContact.id, role: c.role, isPrimary: false }]
            })
          }
        }
      })

      // Toggle target
      contacts[index] = { ...targetContact, isPrimary: !targetContact.isPrimary }

      // Track update for existing contact
      const existingTarget = contract.contacts?.find(ec => ec.user_id === targetContact.userId)
      if (existingTarget) {
        setContactsToUpdate(prev => {
          const existing = prev.find(u => u.id === existingTarget.id)
          if (existing) {
            existing.isPrimary = !targetContact.isPrimary
            return [...prev]
          }
          return [...prev, { id: existingTarget.id, role: targetContact.role, isPrimary: !targetContact.isPrimary }]
        })
      }

      return { ...prev, contacts }
    })
  }, [contract.contacts])

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 0:
        return !!formData.lotId
      case 1:
        return !!(formData.title && formData.startDate && formData.durationMonths)
      case 2:
        return formData.rentAmount !== undefined && formData.rentAmount > 0
      case 3:
        const hasLocataire = (formData.contacts || []).some(c => c.role === 'locataire')
        return hasLocataire
      case 4:
        return true
      default:
        return false
    }
  }, [formData])

  // Navigation
  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez completer tous les champs requis')
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

  // Submit form
  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      toast.error('Veuillez completer tous les champs requis')
      return
    }

    setIsSubmitting(true)

    try {
      // Update the contract
      const contractResult = await updateContract(contract.id, {
        lot_id: formData.lotId,
        title: formData.title,
        contract_type: formData.contractType as ContractType,
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
        throw new Error(contractResult.error || 'Erreur lors de la mise a jour du contrat')
      }

      // Remove contacts marked for removal
      for (const contactId of contactsToRemove) {
        await removeContractContact(contactId, contract.id)
      }

      // Update existing contacts
      for (const contactUpdate of contactsToUpdate) {
        if (!contactsToRemove.includes(contactUpdate.id)) {
          await updateContractContact(contactUpdate.id, contract.id, {
            role: contactUpdate.role,
            is_primary: contactUpdate.isPrimary
          })
        }
      }

      // Add new contacts
      for (const newContact of contactsToAdd) {
        await addContractContact({
          contract_id: contract.id,
          user_id: newContact.userId,
          role: newContact.role,
          is_primary: newContact.isPrimary
        })
      }

      toast.success('Contrat mis a jour avec succes')
      router.push(`/gestionnaire/contrats/${contract.id}`)
    } catch (error) {
      logger.error('Error updating contract:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise a jour du contrat')
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, contract.id, router, currentStep, validateStep, contactsToRemove, contactsToAdd, contactsToUpdate])

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      // Step 1: Lot Selection
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Lot associe au contrat</h2>
              <p className="text-sm text-muted-foreground">
                Modifiez le lot si necessaire (attention: cette action peut avoir des consequences).
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
                Modifiez les informations generales du bail.
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
                      Bail meuble
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Start date */}
              <div>
                <Label htmlFor="startDate">Date de debut *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duree du bail *</Label>
                <Select
                  value={String(formData.durationMonths)}
                  onValueChange={(value) => updateField('durationMonths', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionnez une duree" />
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
                  placeholder="Notes supplementaires..."
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
                Modifiez le loyer et les charges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment frequency */}
              <div>
                <Label>Frequence de paiement</Label>
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">EUR</span>
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
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">EUR</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total mensuel</span>
                  <span className="text-2xl font-bold text-primary">
                    {monthlyTotal.toLocaleString('fr-FR')} EUR
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
                Gerez les locataires, garants et la garantie locative.
              </p>
            </div>

            {/* Contacts section */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contacts lies au contrat
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
                  <span className="text-sm">Au moins un locataire est requis.</span>
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
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">EUR</span>
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
                      placeholder="Informations complementaires..."
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
              <h2 className="text-lg font-semibold mb-2">Recapitulatif des modifications</h2>
              <p className="text-sm text-muted-foreground">
                Verifiez les modifications avant d'enregistrer.
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
                    Debut: {new Date(formData.startDate!).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duree: {CONTRACT_DURATION_OPTIONS.find(o => o.value === formData.durationMonths)?.label || `${formData.durationMonths} mois`}
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
                    <span>{formData.rentAmount?.toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Charges</span>
                    <span>{(formData.chargesAmount || 0).toLocaleString('fr-FR')} EUR</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total mensuel</span>
                    <span className="text-primary">{monthlyTotal.toLocaleString('fr-FR')} EUR</span>
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

            {/* Changes summary */}
            {(contactsToRemove.length > 0 || contactsToAdd.length > 0) && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <h4 className="font-medium text-amber-800 mb-2">Modifications des contacts</h4>
                  {contactsToRemove.length > 0 && (
                    <p className="text-sm text-amber-700">
                      - {contactsToRemove.length} contact(s) seront retires
                    </p>
                  )}
                  {contactsToAdd.length > 0 && (
                    <p className="text-sm text-amber-700">
                      + {contactsToAdd.length} contact(s) seront ajoutes
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="contract-edit min-h-screen bg-background">
      {/* Step header */}
      <StepProgressHeader
        steps={contractSteps}
        currentStep={currentStep}
        title="Modifier le contrat"
        onStepClick={handleStepClick}
        onBack={() => router.push(`/gestionnaire/contrats/${contract.id}`)}
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
                Precedent
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
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  <Save className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
