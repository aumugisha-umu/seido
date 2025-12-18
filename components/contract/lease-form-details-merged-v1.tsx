"use client"

/**
 * Version 1: Minimalist Merged Step (RECOMMENDED)
 *
 * Design Philosophy:
 * - Single card with logical visual grouping
 * - Clean separation via Separator components
 * - Auto-generated reference displayed prominently
 * - Financial data highlighted with primary color
 * - Mobile-first responsive grid
 *
 * UX Benefits:
 * - Less cognitive load (single scrollable form)
 * - Clear visual hierarchy via separators
 * - Quick reference validation with read-only field
 * - Instant financial total feedback
 */

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DocumentFileAttachment } from '@/components/ui/document-file-attachment'
import { DatePicker } from '@/components/ui/date-picker'
import { Info, Calendar, Euro, TrendingUp, Paperclip, AlertTriangle, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  PaymentFrequency,
  PAYMENT_FREQUENCY_LABELS,
  CONTRACT_DURATION_OPTIONS,
  ContractDocumentType,
} from '@/lib/types/contract.types'
import { ContractFileWithPreview, CONTRACT_DOCUMENT_TYPES } from '@/hooks/use-contract-upload'
import { getOverlappingContracts, type OverlappingContractInfo } from '@/app/actions/contract-actions'

interface LeaseFormDetailsMergedV1Props {
  // Lot info for auto-reference generation
  lotReference?: string

  // Form data
  title: string // Editable reference
  startDate: string
  durationMonths: number
  comments: string
  paymentFrequency: PaymentFrequency
  rentAmount: number
  chargesAmount: number

  // File upload with document types
  files: ContractFileWithPreview[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (fileId: string) => void
  onUpdateFileType: (fileId: string, documentType: ContractDocumentType) => void
  isUploading?: boolean

  // Handlers
  onFieldChange: (field: string, value: any) => void

  // Overlap validation
  lotId?: string              // Pour vérification de chevauchement
  existingContractId?: string // Pour exclure en mode édition

  // Styling
  className?: string
}

/**
 * État de la vérification de chevauchement
 */
interface OverlapCheckState {
  isChecking: boolean
  hasOverlap: boolean
  overlappingContracts: OverlappingContractInfo[]
  nextAvailableDate: string | null
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
  files,
  onAddFiles,
  onRemoveFile,
  onUpdateFileType,
  isUploading = false,
  onFieldChange,
  lotId,
  existingContractId,
  className
}: LeaseFormDetailsMergedV1Props) {
  // État pour la vérification de chevauchement
  const [overlapCheck, setOverlapCheck] = useState<OverlapCheckState>({
    isChecking: false,
    hasOverlap: false,
    overlappingContracts: [],
    nextAvailableDate: null
  })

  // Vérification de chevauchement avec debounce
  useEffect(() => {
    // Skip si pas de lot sélectionné ou pas de date
    if (!lotId || !startDate || !durationMonths) {
      setOverlapCheck({
        isChecking: false,
        hasOverlap: false,
        overlappingContracts: [],
        nextAvailableDate: null
      })
      return
    }

    // Debounce de 500ms
    const timer = setTimeout(async () => {
      setOverlapCheck(prev => ({ ...prev, isChecking: true }))

      try {
        const result = await getOverlappingContracts(
          lotId,
          startDate,
          durationMonths,
          existingContractId
        )

        if (result.success && result.data) {
          setOverlapCheck({
            isChecking: false,
            hasOverlap: result.data.hasOverlap,
            overlappingContracts: result.data.overlappingContracts,
            nextAvailableDate: result.data.nextAvailableDate
          })
        } else {
          setOverlapCheck(prev => ({ ...prev, isChecking: false }))
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de chevauchement:', error)
        setOverlapCheck(prev => ({ ...prev, isChecking: false }))
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [lotId, startDate, durationMonths, existingContractId])

  // Formater une date pour l'affichage
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Calculate end date from start date + duration
  const calculateEndDate = (start: string, months: number): Date => {
    const date = new Date(start)
    date.setMonth(date.getMonth() + months)
    return date
  }

  const startDateObj = new Date(startDate)
  const endDateObj = calculateEndDate(startDate, durationMonths)

  // Format dates for display (MM/YYYY)
  const formatDateShort = (date: Date): string => {
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
  }

  // Generate suggested reference: BAIL-{LOT_REF}-{START}-{END}
  const suggestedReference = lotReference
    ? `BAIL-${lotReference}-${formatDateShort(startDateObj)}-${formatDateShort(endDateObj)}`
    : 'BAIL-XXX-XX/XXXX-XX/XXXX'

  // Calculate monthly total
  const monthlyTotal = (rentAmount || 0) + (chargesAmount || 0)

  return (
    <Card className={cn("shadow-sm content-max-width min-w-0", className)}>
      <CardContent className="px-6 py-6 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold mb-2">Détails du bail</h2>
          <p className="text-sm text-muted-foreground">
            Dates, durée, loyer et charges du contrat de location.
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

        {/* Section 1: Dates & Duration */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            Dates et durée
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start date */}
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-1.5">
                Date de début <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                value={startDate}
                onChange={(value) => onFieldChange('startDate', value)}
                placeholder="Sélectionner une date"
                className="w-full"
              />
            </div>

            {/* Duration */}
            <div>
              <Label htmlFor="duration" className="flex items-center gap-1.5">
                Durée du bail <span className="text-destructive">*</span>
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

          {/* Alerte de chevauchement - Conflit détecté */}
          {!overlapCheck.isChecking && overlapCheck.hasOverlap && (
            <Alert className="border-amber-200 bg-amber-50 animate-in fade-in-50 duration-300">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 font-semibold">
                Conflit de période détecté
              </AlertTitle>
              <AlertDescription className="text-amber-700">
                <p className="mb-2">
                  Un ou plusieurs contrats existent déjà sur cette période pour ce lot :
                </p>
                <ul className="space-y-1">
                  {overlapCheck.overlappingContracts.map((contract) => (
                    <li key={contract.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-medium">{contract.title}</span>
                      <span className="text-amber-600">
                        ({formatDateDisplay(contract.start_date)} → {formatDateDisplay(contract.end_date)})
                      </span>
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        {contract.status === 'actif' ? 'Actif' : 'Brouillon'}
                      </Badge>
                    </li>
                  ))}
                </ul>

                {overlapCheck.nextAvailableDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-800"
                    onClick={() => onFieldChange('startDate', overlapCheck.nextAvailableDate)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Utiliser le {formatDateDisplay(overlapCheck.nextAvailableDate)}
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
            Montants mensuels
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rent amount */}
            <div>
              <Label htmlFor="rentAmount" className="flex items-center gap-1.5">
                Loyer (hors charges) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="rentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rentAmount || ''}
                  onChange={(e) => onFieldChange('rentAmount', parseFloat(e.target.value) || 0)}
                  className="pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
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
                  value={chargesAmount || ''}
                  onChange={(e) => onFieldChange('chargesAmount', parseFloat(e.target.value) || 0)}
                  className="pr-8"
                  placeholder="0.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </div>

            {/* Payment frequency */}
            <div>
              <Label htmlFor="paymentFrequency">Fréquence</Label>
              <Select
                value={paymentFrequency}
                onValueChange={(value) => onFieldChange('paymentFrequency', value as PaymentFrequency)}
              >
                <SelectTrigger id="paymentFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Total highlight */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">Total mensuel</span>
              </div>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {monthlyTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Section 3: Additional Notes */}
        <div className="space-y-4">
          <Label htmlFor="comments">Commentaires</Label>
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

        <Separator />

        {/* Section 4: Document Upload with Category Selection */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4 text-primary" />
            Documents
          </div>
          <DocumentFileAttachment
            files={files}
            documentTypes={CONTRACT_DOCUMENT_TYPES}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
            onUpdateFileType={onUpdateFileType}
            isUploading={isUploading}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            maxFiles={10}
            label="Ajouter des documents"
            hint="Déposez des fichiers ici ou cliquez sur le bouton ci-dessus. Sélectionnez le type de document pour chaque fichier."
          />
          <p className="text-xs text-muted-foreground">
            Bail signé, état des lieux, attestation d'assurance, diagnostics, justificatifs...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
