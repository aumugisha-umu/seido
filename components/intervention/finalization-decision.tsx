import { useState } from "react"
import {
  Euro,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

interface FinalizationFormData {
  decision: 'validate' | 'reject'
  internalComments: string
  providerFeedback: string
  scheduleFollowUp: boolean
  followUpDate?: Date
  followUpType?: string
}

interface FinalizationDecisionProps {
  contextData: any
  formData: FinalizationFormData
  setFormData: (data: FinalizationFormData | ((prev: FinalizationFormData) => FinalizationFormData)) => void
  onSubmit: () => Promise<void>
  submitting: boolean
  onClose: () => void
  className?: string
}

export const FinalizationDecision = ({
  contextData,
  formData,
  setFormData,
  onSubmit,
  submitting,
  onClose,
  className
}: FinalizationDecisionProps) => {
  const finalCost = contextData.intervention.final_cost || contextData.selectedQuote?.amount || 0
  const estimatedCost = contextData.intervention.estimated_cost || 0
  const variance = estimatedCost ? ((finalCost - estimatedCost) / estimatedCost * 100) : 0

  // Detect if we're on mobile
  const isMobileLayout = typeof window !== 'undefined' && window.innerWidth < 1024

  return (
    <div className={cn(
      "h-full flex flex-col",
      // Mobile: Compact card styling
      "lg:bg-transparent bg-white rounded-lg shadow-sm border border-gray-200 lg:border-0 lg:shadow-none",
      className
    )}>
      <div className="flex-1 min-h-0 space-y-2 sm:space-y-3 p-3 lg:p-0">
        {/* Header - Compact on mobile, normal on desktop */}
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-2 sm:p-3 border border-sky-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 text-sky-800">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <h3 className="font-semibold text-xs sm:text-sm lg:text-base">Décision finale</h3>
            </div>
            {/* Mobile only: Show cost in header */}
            <div className="lg:hidden flex items-center gap-1">
              <Euro className="h-3 w-3 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">
                {finalCost.toFixed(0)}€
              </span>
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-sky-600 lg:mt-1">
            Validez ou rejetez la clôture
          </p>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {/* Decision Radio Group - Responsive labels */}
          <div>
            <Label className="text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 block text-gray-800">
              Votre décision
            </Label>
            <RadioGroup
              value={formData.decision}
              onValueChange={(value: 'validate' | 'reject') =>
                setFormData(prev => ({ ...prev, decision: value }))
              }
              className="space-y-2"
            >
              {/* Validate Option - Responsive sizing */}
              <div className={cn(
                "flex items-start space-x-1.5 sm:space-x-2 p-1.5 sm:p-2 rounded border transition-all cursor-pointer hover:bg-green-50/50",
                formData.decision === 'validate' ? "border-green-400 bg-green-50/80" : "border-gray-200"
              )}>
                <RadioGroupItem
                  value="validate"
                  id="validate"
                  className="mt-0.5 sm:mt-1 h-3.5 w-3.5 sm:h-4 sm:w-4 data-[state=checked]:border-green-600 data-[state=checked]:text-green-600"
                />
                <label htmlFor="validate" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    <span className="font-medium text-xs sm:text-sm text-green-800">Valider la clôture</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-green-700">
                    Les travaux sont conformes et satisfaisants.
                  </p>
                </label>
              </div>

              {/* Reject Option - Responsive sizing */}
              <div className={cn(
                "flex items-start space-x-1.5 sm:space-x-2 p-1.5 sm:p-2 rounded border transition-all cursor-pointer hover:bg-red-50/50",
                formData.decision === 'reject' ? "border-red-400 bg-red-50/80" : "border-gray-200"
              )}>
                <RadioGroupItem
                  value="reject"
                  id="reject"
                  className="mt-0.5 sm:mt-1 h-3.5 w-3.5 sm:h-4 sm:w-4 data-[state=checked]:border-red-600 data-[state=checked]:text-red-600"
                />
                <label htmlFor="reject" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                    <span className="font-medium text-xs sm:text-sm text-red-800">Rejeter la clôture</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-red-700">
                    Des problèmes nécessitent une intervention.
                  </p>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Internal Comments - Responsive sizing */}
          <div>
            <Label htmlFor="internalComments" className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 block text-gray-800">
              Commentaires internes <span className="text-gray-500 font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="internalComments"
              value={formData.internalComments}
              onChange={(e) => setFormData(prev => ({ ...prev, internalComments: e.target.value }))}
              placeholder="Vos notes pour l'équipe de gestion..."
              className="min-h-[50px] sm:min-h-[60px] resize-none text-xs sm:text-sm bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Provider Feedback (only if rejecting) - Responsive */}
          {formData.decision === 'reject' && (
            <div className="p-1.5 sm:p-2 bg-red-50 border border-red-200 rounded">
              <Label htmlFor="providerFeedback" className="text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 block text-red-800">
                Message pour le prestataire *
              </Label>
              <Textarea
                id="providerFeedback"
                value={formData.providerFeedback}
                onChange={(e) => setFormData(prev => ({ ...prev, providerFeedback: e.target.value }))}
                placeholder="Points à corriger..."
                className="min-h-[40px] sm:min-h-[50px] resize-none bg-white border-red-200 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm"
                required
              />
            </div>
          )}

          {/* Follow-up Scheduling - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:block pt-1.5 sm:pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between p-1.5 sm:p-2 bg-blue-50 border border-blue-200 rounded mb-1.5 sm:mb-2">
              <div className="flex-1">
                <Label htmlFor="followUp" className="text-xs sm:text-sm font-medium cursor-pointer text-blue-800">
                  Programmer un suivi
                </Label>
                <p className="text-[10px] sm:text-xs text-blue-600 mt-0.5">
                  Créer automatiquement une nouvelle intervention
                </p>
              </div>
              <Switch
                id="followUp"
                checked={formData.scheduleFollowUp}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, scheduleFollowUp: checked }))}
                className="data-[state=checked]:bg-blue-600 scale-75 sm:scale-100"
              />
            </div>

            {formData.scheduleFollowUp && (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="followUpDate" className="text-sm font-medium mb-1 block">
                    Date du suivi
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="followUpDate"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8",
                          !formData.followUpDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarCheck className="mr-1 h-3 w-3" />
                        <span className="text-xs">
                          {formData.followUpDate ? (
                            format(formData.followUpDate, "dd/MM/yyyy", { locale: fr })
                          ) : (
                            "Sélectionner"
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formData.followUpDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, followUpDate: date }))}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {formData.followUpDate && (
                  <div className="p-2 bg-blue-100 border border-blue-200 rounded">
                    <div className="flex items-center gap-1 text-blue-800">
                      <CalendarCheck className="h-3 w-3" />
                      <span className="text-xs font-medium">Suivi programmé</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Le {format(formData.followUpDate, "dd/MM/yyyy", { locale: fr })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons - Compact on mobile */}
      <div className="flex-shrink-0 p-2 sm:p-3 lg:p-3 bg-gradient-to-t from-white to-gray-50 lg:from-transparent lg:to-transparent border-t border-gray-200 lg:border-gray-200">
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-9 sm:h-8 text-[11px] sm:text-xs"
          >
            Annuler
          </Button>

          <Button
            onClick={onSubmit}
            disabled={submitting || (formData.decision === 'reject' && !formData.providerFeedback.trim())}
            className={cn(
              "flex-1 h-9 sm:h-8 text-[11px] sm:text-xs font-medium transition-all",
              formData.decision === 'validate'
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            )}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-white mr-0.5 sm:mr-1" />
                En cours...
              </>
            ) : (
              <>
                {formData.decision === 'validate' ? (
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                ) : (
                  <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                )}
                {formData.decision === 'validate' ? 'Valider' : 'Rejeter'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}