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

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { FileUploader } from '@/components/ui/file-uploader'
import { Info, Calendar, Euro, TrendingUp, Paperclip } from 'lucide-react'
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
} from '@/lib/types/contract.types'

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

  // File upload
  files: File[]
  onFilesChange: (files: File[]) => void

  // Handlers
  onFieldChange: (field: string, value: any) => void

  // Styling
  className?: string
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
  onFilesChange,
  onFieldChange,
  className
}: LeaseFormDetailsMergedV1Props) {
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
              <div className="relative">
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => onFieldChange('startDate', e.target.value)}
                  className="pr-10"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
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
            Informations complémentaires visibles uniquement par l&apos;équipe de gestion.
          </p>
        </div>

        <Separator />

        {/* Section 4: Document Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4 text-primary" />
            Documents
          </div>
          <FileUploader
            files={files}
            onFilesChange={onFilesChange}
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
            maxSize={10}
            label="Pièces jointes (optionnel)"
          />
          <p className="text-xs text-muted-foreground">
            Bail signé, état des lieux, attestation d&apos;assurance, diagnostics...
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
