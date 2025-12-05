"use client"

/**
 * Version 2: Card-Based Grouped Layout
 *
 * Design Philosophy:
 * - Three distinct cards for visual separation
 * - Each card represents a logical group
 * - More whitespace and breathing room
 * - Ideal for users who prefer visual chunking
 *
 * UX Benefits:
 * - Clear mental model (3 sections = 3 cards)
 * - Easier to scan and focus on one section at a time
 * - Good for larger screens with more horizontal space
 * - Professional dashboard-like appearance
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Info, Calendar, Clock, Euro, TrendingUp, FileText } from 'lucide-react'
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

interface LeaseFormDetailsMergedV2Props {
  // Lot info for auto-reference generation
  lotReference?: string

  // Form data
  startDate: string
  durationMonths: number
  comments: string
  paymentFrequency: PaymentFrequency
  rentAmount: number
  chargesAmount: number

  // Handlers
  onFieldChange: (field: string, value: any) => void

  // Styling
  className?: string
}

export default function LeaseFormDetailsMergedV2({
  lotReference,
  startDate,
  durationMonths,
  comments,
  paymentFrequency,
  rentAmount,
  chargesAmount,
  onFieldChange,
  className
}: LeaseFormDetailsMergedV2Props) {
  // Generate reference: BAIL-{LOT_REF}-{YYYY-MM}
  const generatedReference = lotReference
    ? `BAIL-${lotReference}-${new Date(startDate).getFullYear()}-${String(new Date(startDate).getMonth() + 1).padStart(2, '0')}`
    : 'BAIL-XXX-XXXX-XX'

  // Calculate monthly total
  const monthlyTotal = (rentAmount || 0) + (chargesAmount || 0)

  return (
    <div className={cn("space-y-4 content-max-width min-w-0", className)}>
      {/* Header with description */}
      <div className="text-center max-w-2xl mx-auto mb-2">
        <h2 className="text-2xl font-bold mb-2">Détails du bail</h2>
        <p className="text-muted-foreground">
          Complétez les informations de dates, durée et montants du contrat.
        </p>
      </div>

      {/* Card 1: Reference & Dates */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Référence et dates
              </CardTitle>
              <CardDescription className="mt-1.5">
                Période de validité du contrat de bail
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Auto-generated Reference */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                  Référence du bail
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                          Référence générée automatiquement au format: BAIL-{'{LOT_REF}'}-{'{ANNÉE-MOIS}'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="font-mono font-semibold text-base text-primary truncate">
                  {generatedReference}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">Auto</Badge>
            </div>
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
        </CardContent>
      </Card>

      {/* Card 2: Financial Details */}
      <Card className="shadow-sm border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <Euro className="h-4 w-4" />
            Montants et paiement
          </CardTitle>
          <CardDescription className="mt-1.5">
            Loyer, charges et fréquence de paiement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Payment frequency */}
          <div>
            <Label htmlFor="paymentFrequency">Fréquence de paiement</Label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Total highlight */}
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold text-primary">Total mensuel</span>
              </div>
              <span className="text-3xl font-bold text-primary tabular-nums">
                {monthlyTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Additional Notes */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Notes complémentaires
          </CardTitle>
          <CardDescription className="mt-1.5">
            Informations supplémentaires sur le bail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <Label htmlFor="comments" className="sr-only">Commentaires</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => onFieldChange('comments', e.target.value)}
              placeholder="Ajoutez des notes ou commentaires sur ce contrat..."
              rows={4}
              className="resize-none"
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Ces informations sont visibles uniquement par l'équipe de gestion et ne seront pas partagées avec les locataires.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
