"use client"

/**
 * Version 3: Compact Two-Column Layout
 *
 * Design Philosophy:
 * - Maximum information density without clutter
 * - Two-column layout on desktop for efficiency
 * - Financial data in prominent right sidebar
 * - Optimized for workflow efficiency (gestionnaire focus)
 *
 * UX Benefits:
 * - Faster form completion (less scrolling)
 * - Financial summary always visible (sticky)
 * - Professional, data-dense interface
 * - Ideal for power users with larger screens
 */

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Calendar, Euro, TrendingUp, FileText, Sparkles } from 'lucide-react'
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

interface LeaseFormDetailsMergedV3Props {
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

export default function LeaseFormDetailsMergedV3({
  lotReference,
  startDate,
  durationMonths,
  comments,
  paymentFrequency,
  rentAmount,
  chargesAmount,
  onFieldChange,
  className
}: LeaseFormDetailsMergedV3Props) {
  // Generate reference: BAIL-{LOT_REF}-{YYYY-MM}
  const generatedReference = lotReference
    ? `BAIL-${lotReference}-${new Date(startDate).getFullYear()}-${String(new Date(startDate).getMonth() + 1).padStart(2, '0')}`
    : 'BAIL-XXX-XXXX-XX'

  // Calculate monthly total
  const monthlyTotal = (rentAmount || 0) + (chargesAmount || 0)

  // Calculate end date
  const endDate = new Date(startDate)
  endDate.setMonth(endDate.getMonth() + durationMonths)

  return (
    <div className={cn("space-y-6 content-max-width min-w-0", className)}>
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Détails du bail</h2>
        <p className="text-sm text-muted-foreground">
          Informations contractuelles et financières du bail.
        </p>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form Fields (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="px-6 py-6 space-y-6">
              {/* Auto-generated Reference */}
              <Alert className="border-primary/30 bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertDescription className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                      Référence auto-générée
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">
                              Format: BAIL-{'{LOT_REF}'}-{'{ANNÉE-MOIS}'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </p>
                    <p className="font-mono font-semibold text-base text-primary truncate">
                      {generatedReference}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Auto</Badge>
                </AlertDescription>
              </Alert>

              {/* Dates & Duration - Compact Grid */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Période contractuelle
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start date */}
                  <div>
                    <Label htmlFor="startDate" className="text-xs">
                      Date de début <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => onFieldChange('startDate', e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <Label htmlFor="duration" className="text-xs">
                      Durée <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={String(durationMonths)}
                      onValueChange={(value) => onFieldChange('durationMonths', parseInt(value))}
                    >
                      <SelectTrigger id="duration" className="mt-1.5">
                        <SelectValue />
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

                {/* End date preview */}
                <div className="text-xs text-muted-foreground flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Date de fin prévisionnelle: <strong>{endDate.toLocaleDateString('fr-FR', { dateStyle: 'long' })}</strong>
                  </span>
                </div>
              </div>

              {/* Financial Fields - Compact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Euro className="h-4 w-4" />
                  Paiement
                </div>

                {/* Payment frequency */}
                <div>
                  <Label htmlFor="paymentFrequency" className="text-xs">Fréquence</Label>
                  <Select
                    value={paymentFrequency}
                    onValueChange={(value) => onFieldChange('paymentFrequency', value as PaymentFrequency)}
                  >
                    <SelectTrigger id="paymentFrequency" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_FREQUENCY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Rent */}
                  <div>
                    <Label htmlFor="rentAmount" className="text-xs">
                      Loyer HC <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="rentAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={rentAmount || ''}
                        onChange={(e) => onFieldChange('rentAmount', parseFloat(e.target.value) || 0)}
                        className="pr-7"
                        placeholder="0.00"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                    </div>
                  </div>

                  {/* Charges */}
                  <div>
                    <Label htmlFor="chargesAmount" className="text-xs">Charges</Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="chargesAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={chargesAmount || ''}
                        onChange={(e) => onFieldChange('chargesAmount', parseFloat(e.target.value) || 0)}
                        className="pr-7"
                        placeholder="0.00"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Notes internes
                </div>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => onFieldChange('comments', e.target.value)}
                  placeholder="Commentaires visibles uniquement par l'équipe..."
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Financial Summary (1/3 width, sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <Card className="shadow-md border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="px-5 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total mensuel</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Loyer HC</span>
                      <span className="font-medium tabular-nums">
                        {(rentAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Charges</span>
                      <span className="font-medium tabular-nums">
                        {(chargesAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary/20" />

                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-sm font-semibold text-primary">Total</span>
                    <span className="text-3xl font-bold text-primary tabular-nums">
                      {monthlyTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </span>
                  </div>

                  {/* Frequency indicator */}
                  <div className="pt-2">
                    <Badge variant="secondary" className="w-full justify-center">
                      {PAYMENT_FREQUENCY_LABELS[paymentFrequency]}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick info card */}
            <Card className="shadow-sm">
              <CardContent className="px-4 py-4 space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-2 text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Référence automatique:</strong> La référence du bail est générée selon le lot et la date de début.
                    </p>
                    <p>
                      <strong className="text-foreground">Montants requis:</strong> Le loyer hors charges est obligatoire pour créer le contrat.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
