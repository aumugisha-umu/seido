"use client"

/**
 * Version 1: Fully Merged Step (RECOMMENDED)
 *
 * Design Philosophy:
 * - Single comprehensive card with all contract details
 * - Clean separation via Separator components
 * - Auto-generated reference displayed prominently
 * - Financial data highlighted with primary color
 * - Contacts and guarantee integrated seamlessly
 * - Mobile-first responsive grid
 *
 * UX Benefits:
 * - Minimal cognitive load (single scrollable form)
 * - Clear visual hierarchy via separators and section icons
 * - All contract info in one place
 * - Instant validation feedback
 */

import { useState, useEffect, RefObject, forwardRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DatePicker } from '@/components/ui/date-picker'
import { ContactSection } from '@/components/ui/contact-section'
import ContactSelector from '@/components/contact-selector'
import { Info, Calendar, Euro, AlertTriangle, Loader2, Users, Shield, Clock, FileText } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  PaymentFrequency,
  ChargesType,
  GuaranteeType,
  PAYMENT_FREQUENCY_LABELS,
  CHARGES_TYPE_LABELS,
  CONTRACT_DURATION_OPTIONS,
  GUARANTEE_TYPE_LABELS,
} from '@/lib/types/contract.types'
import { checkContractOverlapWithDetails, type OverlappingContractInfo, type OverlapCheckDetailedResult } from '@/app/actions/contract-actions'

interface Contact {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string
}

interface ContactSelectorRef {
  openContactModal: (contactType: 'tenant' | 'guarantor') => void
}

interface LeaseFormDetailsMergedV1Props {
  // Lot info for auto-reference generation
  lotReference?: string

  // Form data - Details
  title: string // Editable reference
  startDate: string
  durationMonths: number
  comments: string
  paymentFrequency: PaymentFrequency
  rentAmount: number
  chargesAmount: number
  chargesType: ChargesType

  // Form data - Contacts & Guarantee
  selectedTenants: Contact[]
  selectedGuarantors: Contact[]
  guaranteeType: GuaranteeType
  guaranteeAmount?: number
  guaranteeNotes: string

  // Handlers
  onFieldChange: (field: string, value: any) => void
  onAddContact: (contactType: 'tenant' | 'guarantor') => void
  onRemoveContact: (contactId: string, role: 'locataire' | 'garant') => void

  // Contact selector ref and related props
  contactSelectorRef?: RefObject<ContactSelectorRef>
  teamId: string
  mode: 'create' | 'edit'
  addContact: (contactId: string, role: any) => void
  saveAndRedirect?: (path: string, data: any) => void

  // Overlap validation
  lotId?: string              // Pour vérification de chevauchement
  existingContractId?: string // Pour exclure en mode édition

  // Callback pour remonter le résultat de l'overlap check (pour validation step)
  onOverlapCheckChange?: (result: {
    hasOverlap: boolean
    hasDuplicateTenant: boolean
  } | null) => void

  // Styling
  className?: string
}

/**
 * État de la vérification de chevauchement avec détection doublon
 *
 * Note (2026-01): La logique "collocation" a été retirée car c'est un mode d'occupation
 * géré au niveau du bail, pas une catégorie de lot.
 * - hasOverlap = WARNING (création autorisée, le gestionnaire décide si c'est une colocation)
 * - hasDuplicateTenant = ERREUR BLOQUANTE (même locataire ne peut pas avoir 2 baux sur le même lot)
 */
interface OverlapCheckState {
  isChecking: boolean
  hasOverlap: boolean
  overlappingContracts: OverlappingContractInfo[]
  nextAvailableDate: string | null
  hasDuplicateTenant: boolean
  duplicateTenantContracts: OverlappingContractInfo[]
}

export default function LeaseFormDetailsMergedV1({
  lotReference,
  title,
  startDate,
  durationMonths,
  comments,
  paymentFrequency,
  rentAmount,
  chargesAmount,
  chargesType,
  selectedTenants,
  selectedGuarantors,
  guaranteeType,
  guaranteeAmount,
  guaranteeNotes,
  onFieldChange,
  onAddContact,
  onRemoveContact,
  contactSelectorRef,
  teamId,
  mode,
  addContact,
  saveAndRedirect,
  lotId,
  existingContractId,
  onOverlapCheckChange,
  className
}: LeaseFormDetailsMergedV1Props) {
  // État pour la vérification de chevauchement
  const [overlapCheck, setOverlapCheck] = useState<OverlapCheckState>({
    isChecking: false,
    hasOverlap: false,
    overlappingContracts: [],
    nextAvailableDate: null,
    hasDuplicateTenant: false,
    duplicateTenantContracts: []
  })

  // Extraire les IDs des locataires sélectionnés
  const tenantUserIds = selectedTenants.map(t => t.id)

  // Vérification de chevauchement avec debounce (inclut logique colocation/doublon)
  useEffect(() => {
    // Skip si pas de lot sélectionné ou pas de date
    if (!lotId || !startDate || !durationMonths) {
      setOverlapCheck({
        isChecking: false,
        hasOverlap: false,
        overlappingContracts: [],
        nextAvailableDate: null,
        hasDuplicateTenant: false,
        duplicateTenantContracts: []
      })
      return
    }

    // Debounce de 500ms
    const timer = setTimeout(async () => {
      setOverlapCheck(prev => ({ ...prev, isChecking: true }))

      try {
        // 🔍 DEBUG: Log des paramètres d'appel
        console.log('🔍 [OVERLAP-CHECK] Calling with:', {
          lotId,
          startDate,
          durationMonths,
          tenantUserIds,
          existingContractId
        })

        // Utilise la nouvelle action avec détection doublon/colocation
        const result = await checkContractOverlapWithDetails(
          lotId,
          startDate,
          durationMonths,
          tenantUserIds,
          existingContractId
        )

        // 🔍 DEBUG: Log du résultat complet
        console.log('🔍 [OVERLAP-CHECK] Result:', result)

        if (result.success && result.data) {
          console.log('🔍 [OVERLAP-CHECK] Setting state with hasOverlap:', result.data.hasOverlap)
          setOverlapCheck({
            isChecking: false,
            hasOverlap: result.data.hasOverlap,
            overlappingContracts: result.data.overlappingContracts,
            nextAvailableDate: result.data.nextAvailableDate,
            hasDuplicateTenant: result.data.hasDuplicateTenant,
            duplicateTenantContracts: result.data.duplicateTenantContracts
          })
        } else {
          // 🔍 DEBUG: Log de l'erreur
          console.error('🔍 [OVERLAP-CHECK] Action returned error:', result.error)
          setOverlapCheck(prev => ({ ...prev, isChecking: false }))
        }
      } catch (error) {
        // 🔍 DEBUG: Log de l'exception
        console.error('🔍 [OVERLAP-CHECK] Exception caught:', error)
        setOverlapCheck(prev => ({ ...prev, isChecking: false }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [lotId, startDate, durationMonths, existingContractId, tenantUserIds.join(',')]) // Re-check quand locataires changent

  // Remonter le résultat de l'overlap check au parent pour validation step
  useEffect(() => {
    if (onOverlapCheckChange) {
      if (!lotId || !startDate || !durationMonths) {
        // Pas de vérification possible, reset le résultat
        onOverlapCheckChange(null)
      } else if (!overlapCheck.isChecking) {
        // Vérification terminée, remonter le résultat
        onOverlapCheckChange({
          hasOverlap: overlapCheck.hasOverlap,
          hasDuplicateTenant: overlapCheck.hasDuplicateTenant
        })
      }
    }
  }, [overlapCheck, lotId, startDate, durationMonths, onOverlapCheckChange])

  /**
   * Parse une chaîne de date ISO (YYYY-MM-DD) en Date locale.
   * Évite le bug de timezone où new Date("2026-01-01") devient 31 déc en UTC+1.
   */
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Formater une date pour l'affichage
  const formatDateDisplay = (dateStr: string): string => {
    const date = parseLocalDate(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  /**
   * Calcule la date de fin du contrat (dernier jour inclus).
   *
   * Logique métier: un bail d'1 an commençant le 1er janvier se termine
   * le 31 décembre (dernier jour du bail), pas le 1er janvier suivant.
   *
   * Calcul: start + N mois - 1 jour
   * Exemple: 01/01/2026 + 12 mois - 1 jour = 31/12/2026
   */
  const calculateEndDate = (start: string, months: number): Date => {
    const date = parseLocalDate(start)
    date.setMonth(date.getMonth() + months)
    date.setDate(date.getDate() - 1) // Dernier jour du bail, pas premier jour après
    return date
  }

  const startDateObj = parseLocalDate(startDate)
  const endDateObj = calculateEndDate(startDate, durationMonths)

  // Format dates for display (MM/YYYY)
  const formatDateShort = (date: Date): string => {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
  }

  // Generate suggested reference: BAIL-{LOT_REF}-{START}-{END}
  const suggestedReference = lotReference
    ? `BAIL-${lotReference}-${formatDateShort(startDateObj)}-${formatDateShort(endDateObj)}`
    : 'BAIL-XXX-XX/XXXX-XX/XXXX'

  // Calculate total (rent + charges per payment period)
  const total = (rentAmount || 0) + (chargesAmount || 0)

  // Format number with thousand separators for display in inputs
  const formatNumberInput = (value: number | undefined): string => {
    if (value === undefined || value === 0) return ''
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  // Parse formatted string back to number
  const parseFormattedNumber = (value: string): number => {
    // Remove spaces (thousand separators) and replace comma with dot for decimals
    const cleaned = value.replace(/\s/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  return (
    <Card className={cn("shadow-sm min-w-0", className)}>
      <CardContent className="px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Détails du bail</h2>
          <p className="text-sm text-muted-foreground">
            Informations générales, financières, signataires et garantie du contrat de location.
          </p>
        </div>

        {/* Editable Reference with auto-suggestion */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="title" className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              Référence du bail
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Format suggéré: BAIL-{'{LOT}'}-{'{DÉBUT}'}-{'{FIN}'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Badge
              variant="outline"
              className="shrink-0 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => onFieldChange('title', suggestedReference)}
            >
              Générer auto
            </Badge>
          </div>
          <Input
            id="title"
            value={title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            placeholder={suggestedReference}
            className="font-mono font-semibold text-primary bg-white/80"
          />
          <p className="text-xs text-muted-foreground">
            Période: {formatDateShort(startDateObj)} → {formatDateShort(endDateObj)} ({durationMonths} mois)
          </p>
        </div>

        <Separator />

        {/* Section 1: Signataires (moved up) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            Signataires du bail
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ContactSection
              sectionType="tenants"
              contacts={selectedTenants}
              onAddContact={() => onAddContact('tenant')}
              onRemoveContact={(id) => onRemoveContact(id, 'locataire')}
              minRequired={1}
            />

            <ContactSection
              sectionType="guarantors"
              contacts={selectedGuarantors}
              onAddContact={() => onAddContact('guarantor')}
              onRemoveContact={(id) => onRemoveContact(id, 'garant')}
            />
          </div>
        </div>

        <Separator />

        {/* Section 2: Dates & Duration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Dates et durée
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start date */}
            <div className="space-y-1.5">
              <Label htmlFor="startDate" icon={Calendar} required size="sm">
                Date de début
              </Label>
              <DatePicker
                value={startDate}
                onChange={(value) => onFieldChange('startDate', value)}
                placeholder="Sélectionner une date"
                className="w-full"
              />
              {/* Calculated end date display */}
              {startDate && durationMonths > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>Date de fin :</span>
                  <span className="font-medium text-foreground">
                    {endDateObj.toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="duration" icon={Clock} required size="sm">
                Durée du bail
              </Label>
              <Select
                value={String(durationMonths)}
                onValueChange={(value) => onFieldChange('durationMonths', parseInt(value))}
              >
                <SelectTrigger id="duration">
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
          </div>

          {/* Alerte de chevauchement - Vérification en cours */}
          {overlapCheck.isChecking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              Vérification des contrats existants...
            </div>
          )}

          {/* ALERTE 1: Erreur bloquante - Doublon locataire (priorité haute) */}
          {!overlapCheck.isChecking && overlapCheck.hasDuplicateTenant && (
            <Alert variant="destructive" className="animate-in fade-in-50 duration-300">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-semibold">
                Doublon détecté
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">
                  Ce locataire a déjà un bail actif sur ce bien pour cette période.
                  Il s'agit peut-être d'un doublon.
                </p>
                <ul className="space-y-1">
                  {overlapCheck.duplicateTenantContracts.map((contract) => (
                    <li key={contract.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-medium">{contract.title}</span>
                      <span>
                        ({formatDateDisplay(contract.start_date)} → {formatDateDisplay(contract.end_date)})
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {contract.status === 'actif' ? 'Actif' : contract.status === 'a_venir' ? 'À venir' : contract.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm font-medium">
                  Veuillez sélectionner un autre locataire ou modifier les dates.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* ALERTE 2: Warning - Chevauchement détecté (création autorisée) */}
          {!overlapCheck.isChecking && overlapCheck.hasOverlap && !overlapCheck.hasDuplicateTenant && (
            <Alert className="border-amber-200 bg-amber-50 animate-in fade-in-50 duration-300">
              <Info className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 font-semibold">
                Bail existant sur cette période
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                <p className="mb-2">
                  Un bail existe déjà sur cette période. Si ce n&apos;est pas une colocation ou cohabitation,
                  utilisez la date suggérée ci-dessous.
                </p>
                <ul className="space-y-1">
                  {overlapCheck.overlappingContracts.map((contract) => (
                    <li key={contract.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-medium">{contract.title}</span>
                      <span className="text-amber-600">
                        ({formatDateDisplay(contract.start_date)} → {formatDateDisplay(contract.end_date)})
                      </span>
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        {contract.status === 'actif' ? 'Actif' : contract.status === 'a_venir' ? 'À venir' : contract.status}
                      </Badge>
                    </li>
                  ))}
                </ul>

                {overlapCheck.nextAvailableDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => onFieldChange('startDate', overlapCheck.nextAvailableDate)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Première date disponible : {formatDateDisplay(overlapCheck.nextAvailableDate)}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Section 2: Financial Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Euro className="h-4 w-4 text-primary" />
            Loyer et charges
          </div>

          {/* Single row: All financial fields aligned */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Rent amount - fixed width */}
            <div className="space-y-1.5 w-32">
              <Label htmlFor="rentAmount" icon={Euro} required size="sm">
                Loyer
              </Label>
              <div className="relative">
                <Input
                  id="rentAmount"
                  type="text"
                  inputMode="decimal"
                  value={formatNumberInput(rentAmount)}
                  onChange={(e) => onFieldChange('rentAmount', parseFormattedNumber(e.target.value))}
                  className="pr-6 h-9 text-right"
                  placeholder="0"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </div>

            {/* Charges amount + type grouped together */}
            <div className="space-y-1.5">
              <Label htmlFor="chargesAmount" icon={Euro} size="sm">
                Charges
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs">
                        <strong>Forfait</strong> : montant fixe sans régularisation<br/>
                        <strong>Provision</strong> : avance régularisée annuellement
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative w-28">
                  <Input
                    id="chargesAmount"
                    type="text"
                    inputMode="decimal"
                    value={formatNumberInput(chargesAmount)}
                    onChange={(e) => onFieldChange('chargesAmount', parseFormattedNumber(e.target.value))}
                    className="pr-6 h-9 text-right"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                </div>
                {/* Segmented control pill for charges type */}
                <div className="inline-flex h-9 rounded-md border border-border overflow-hidden">
                  <RadioGroup
                    value={chargesType}
                    onValueChange={(value) => onFieldChange('chargesType', value as ChargesType)}
                    className="flex flex-row gap-0 space-y-0"
                  >
                    <Label
                      htmlFor="charges-forfaitaire"
                      className={cn(
                        "flex items-center justify-center px-3 h-full cursor-pointer transition-all text-sm border-r border-border m-0",
                        chargesType === 'forfaitaire'
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value="forfaitaire" id="charges-forfaitaire" className="sr-only" />
                      Forfait
                    </Label>
                    <Label
                      htmlFor="charges-provision"
                      className={cn(
                        "flex items-center justify-center px-3 h-full cursor-pointer transition-all text-sm m-0",
                        chargesType === 'provision'
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-background hover:bg-muted/50"
                      )}
                    >
                      <RadioGroupItem value="provision" id="charges-provision" className="sr-only" />
                      Provision
                    </Label>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Payment frequency - compact */}
            <div className="space-y-1.5 w-28">
              <Label htmlFor="paymentFrequency" icon={Clock} size="sm">Fréquence</Label>
              <Select
                value={paymentFrequency}
                onValueChange={(value) => onFieldChange('paymentFrequency', value as PaymentFrequency)}
              >
                <SelectTrigger id="paymentFrequency" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total - Prominent but compact */}
            <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-primary/5 border border-primary/20 ml-auto">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Total {PAYMENT_FREQUENCY_LABELS[paymentFrequency].toLowerCase()}
              </span>
              <span className="text-base font-bold text-primary tabular-nums">
                {total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 4: Garantie (moved up after financials) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-primary" />
            Garantie locative
          </div>

          {/* Single row: Guarantee fields aligned like financial section */}
          <div className="flex flex-wrap items-end gap-3">
            {/* Guarantee type - wider to accommodate labels */}
            <div className="space-y-1.5 w-56">
              <Label htmlFor="guaranteeType" icon={Shield} size="sm">Type de garantie</Label>
              <Select
                value={guaranteeType}
                onValueChange={(value) => onFieldChange('guaranteeType', value as GuaranteeType)}
              >
                <SelectTrigger id="guaranteeType" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GUARANTEE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guarantee amount - same style as rent/charges */}
            {guaranteeType !== 'pas_de_garantie' && (
              <div className="space-y-1.5 w-40">
                <Label htmlFor="guaranteeAmount" icon={Euro} size="sm">
                  Montant de la garantie
                </Label>
                <div className="relative">
                  <Input
                    id="guaranteeAmount"
                    type="text"
                    inputMode="decimal"
                    value={formatNumberInput(guaranteeAmount)}
                    onChange={(e) => {
                      const parsed = parseFormattedNumber(e.target.value)
                      onFieldChange('guaranteeAmount', parsed === 0 ? undefined : parsed)
                    }}
                    className="pr-6 h-9 text-right"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
                </div>
              </div>
            )}
          </div>

          {/* Notes on guarantee - full width when present */}
          {guaranteeType !== 'pas_de_garantie' && (
            <div className="space-y-1.5">
              <Label htmlFor="guaranteeNotes" icon={FileText} size="sm">Notes sur la garantie</Label>
              <Textarea
                id="guaranteeNotes"
                value={guaranteeNotes}
                onChange={(e) => onFieldChange('guaranteeNotes', e.target.value)}
                placeholder="Informations complémentaires sur la garantie..."
                rows={2}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Section 5: Additional Notes */}
        <div className="space-y-4">
          <Label htmlFor="comments" icon={FileText}>Commentaires</Label>
          <Textarea
            id="comments"
            value={comments}
            onChange={(e) => onFieldChange('comments', e.target.value)}
            placeholder="Notes supplémentaires sur le bail..."
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Informations complémentaires visibles uniquement par l'équipe de gestion.
          </p>
        </div>

      </CardContent>

      {/* ContactSelector modal - Placed at Card level to be accessible */}
      {contactSelectorRef && (
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
            addContact(contact.id, role)
          }}
          onContactRemoved={(contactId, contactType) => {
            const role = contactType === 'tenant' ? 'locataire' : 'garant'
            onRemoveContact(contactId, role)
          }}
          onRequestContactCreation={(contactType) => {
            if (mode === 'create' && saveAndRedirect) {
              saveAndRedirect('/gestionnaire/contacts/nouveau', { type: contactType })
            } else {
              // In edit mode, show message
              console.log('Créez d\'abord le contact depuis la page contacts, puis revenez ici.')
            }
          }}
        />
      )}
    </Card>
  )
}
