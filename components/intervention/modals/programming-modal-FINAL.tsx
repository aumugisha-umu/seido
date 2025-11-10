"use client"

import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Check,
  CalendarDays,
  Users,
  MapPin,
  Building2,
  FileText,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ContactSection } from "@/components/ui/contact-section"
import { cn } from "@/lib/utils"
import { type InterventionAction } from "@/lib/intervention-actions-service"
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  isBuildingWideIntervention,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface Provider {
  id: string
  name: string
  email?: string
  role?: string
  speciality?: string
  availability?: "available" | "busy" | "unknown"
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface ProgrammingModalFinalProps {
  isOpen: boolean
  onClose: () => void
  intervention: InterventionAction | null
  programmingOption: "direct" | "propose" | "organize" | null
  onProgrammingOptionChange: (option: "direct" | "propose" | "organize") => void
  directSchedule: TimeSlot
  onDirectScheduleChange: (schedule: TimeSlot) => void
  proposedSlots: TimeSlot[]
  onAddProposedSlot: () => void
  onUpdateProposedSlot: (index: number, field: keyof TimeSlot, value: string) => void
  onRemoveProposedSlot: (index: number) => void
  selectedProviders: string[]
  onProviderToggle: (providerId: string) => void
  providers: Provider[]
  onConfirm: () => void
  isFormValid: boolean
  teamId: string
  requireQuote?: boolean
  onRequireQuoteChange?: (required: boolean) => void
  instructions?: string
  onInstructionsChange?: (instructions: string) => void
  managers?: Contact[]
  selectedManagers?: string[]
  onManagerToggle?: (managerId: string) => void
  onOpenManagerModal?: () => void
  onOpenProviderModal?: () => void
}

export const ProgrammingModalFinal = ({
  isOpen,
  onClose,
  intervention,
  programmingOption,
  onProgrammingOptionChange,
  directSchedule,
  onDirectScheduleChange,
  proposedSlots,
  onAddProposedSlot,
  onUpdateProposedSlot,
  onRemoveProposedSlot,
  selectedProviders = [],
  onProviderToggle,
  providers,
  onConfirm,
  isFormValid,
  teamId,
  requireQuote = false,
  onRequireQuoteChange,
  instructions = "",
  onInstructionsChange,
  managers = [],
  selectedManagers = [],
  onManagerToggle,
  onOpenManagerModal,
  onOpenProviderModal
}: ProgrammingModalFinalProps) => {
  if (!intervention) return null

  // Get selected contacts for ContactSection
  const selectedManagerContacts: Contact[] = managers
    .filter(m => selectedManagers.includes(m.id))
    .map(m => ({ ...m, type: 'gestionnaire' as const }))

  const selectedProviderContacts: Contact[] = providers
    .filter(p => selectedProviders.includes(p.id))
    .map(p => ({ ...p, type: 'prestataire' as const, email: p.email || '' }))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[1100px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            Programmer l'intervention
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pb-6 px-1">
          {/* 1. Intervention Summary - Same layout as intervention-detail-header */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="text-center">
              {/* Titre et badges - Layout horizontal comme dans le header de détail */}
              <div className="flex items-center justify-center space-x-3 mb-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {intervention?.title || "Sans titre"}
                </h2>

                {/* Badge de statut */}
                <Badge
                  className={`flex items-center space-x-1 font-medium border ${
                    (() => {
                      const status = (intervention?.status || '').toLowerCase()
                      if (status === 'approuvee' || status === 'approuvée') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      if (status === 'planifiee' || status === 'planifiée' || status === 'planification') return 'bg-blue-100 text-blue-800 border-blue-200'
                      if (status === 'en cours') return 'bg-blue-100 text-blue-800 border-blue-200'
                      return 'bg-amber-100 text-amber-800 border-amber-200'
                    })()
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    (() => {
                      const status = (intervention?.status || '').toLowerCase()
                      if (status === 'approuvee' || status === 'approuvée') return 'bg-emerald-500'
                      if (status === 'planifiee' || status === 'planifiée' || status === 'planification') return 'bg-blue-500'
                      if (status === 'en cours') return 'bg-blue-600'
                      return 'bg-amber-500'
                    })()
                  }`} />
                  <span>{intervention?.status || 'Demande'}</span>
                </Badge>

                {/* Badge d'urgence */}
                <Badge
                  className={`flex items-center space-x-1 font-medium border ${
                    getPriorityColor(intervention?.priority || (intervention as any)?.urgency || 'normale')
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    (intervention?.priority || (intervention as any)?.urgency) === "urgente" ? "bg-red-500" :
                    (intervention?.priority || (intervention as any)?.urgency) === "haute" ? "bg-orange-500" :
                    (intervention?.priority || (intervention as any)?.urgency) === "normale" ? "bg-blue-500" :
                    "bg-slate-500"
                  }`} />
                  <span>{getPriorityLabel(intervention?.priority || (intervention as any)?.urgency || 'normale')}</span>
                </Badge>
              </div>

              {/* Location - En dessous comme dans le header */}
              <div className="flex items-center justify-center space-x-1 text-sm text-slate-600">
                {intervention && getInterventionLocationIcon(intervention as any) === "building" ? (
                  <Building2 className="h-3 w-3" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                <span className="truncate max-w-xs">
                  {intervention ? getInterventionLocationText(intervention as any) : 'Localisation non spécifiée'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 2. Assignations Section with ContactSection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Participants de l'intervention
              </h2>
              <p className="text-sm text-slate-600">
                Sélectionnez les gestionnaires et prestataires à notifier
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gestionnaires ContactSection */}
              <ContactSection
                sectionType="managers"
                contacts={selectedManagerContacts}
                onAddContact={onOpenManagerModal}
                onRemoveContact={onManagerToggle}
                minRequired={1}
                customLabel="Gestionnaire(s) assigné(s)"
              />

              {/* Prestataires ContactSection */}
              <ContactSection
                sectionType="providers"
                contacts={selectedProviderContacts}
                onAddContact={onOpenProviderModal}
                onRemoveContact={onProviderToggle}
                customLabel="Prestataire(s) à contacter"
              />
            </div>
          </div>

          <Separator />

          {/* 3. Planning Method Selection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
                Méthode de planification
                {!programmingOption && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    Requis
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-slate-600">
                Choisissez comment organiser cette intervention
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Direct Schedule */}
              <button
                type="button"
                onClick={() => onProgrammingOptionChange("direct")}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all text-left",
                  programmingOption === "direct"
                    ? "border-blue-500 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    programmingOption === "direct" ? "bg-blue-100" : "bg-slate-100"
                  }`}>
                    <CalendarDays className={`h-5 w-5 ${
                      programmingOption === "direct" ? "text-blue-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm mb-1 ${
                      programmingOption === "direct" ? "text-blue-900" : "text-slate-900"
                    }`}>
                      Fixer le rendez-vous
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Définissez la date et l'heure du rendez-vous
                    </p>
                  </div>
                </div>
                {programmingOption === "direct" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* Option 2: Propose Slots */}
              <button
                type="button"
                onClick={() => onProgrammingOptionChange("propose")}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all text-left",
                  programmingOption === "propose"
                    ? "border-purple-500 bg-purple-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    programmingOption === "propose" ? "bg-purple-100" : "bg-slate-100"
                  }`}>
                    <Clock className={`h-5 w-5 ${
                      programmingOption === "propose" ? "text-purple-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm mb-1 ${
                      programmingOption === "propose" ? "text-purple-900" : "text-slate-900"
                    }`}>
                      Proposer des disponibilités
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Les parties choisissent parmi vos créneaux
                    </p>
                  </div>
                </div>
                {programmingOption === "propose" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* Option 3: Let Organize */}
              <button
                type="button"
                onClick={() => onProgrammingOptionChange("organize")}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all text-left",
                  programmingOption === "organize"
                    ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                )}
              >
                <div className="flex flex-col gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    programmingOption === "organize" ? "bg-emerald-100" : "bg-slate-100"
                  }`}>
                    <Users className={`h-5 w-5 ${
                      programmingOption === "organize" ? "text-emerald-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm mb-1 ${
                      programmingOption === "organize" ? "text-emerald-900" : "text-slate-900"
                    }`}>
                      Laisser s'organiser
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Les participants se coordonnent directement
                    </p>
                  </div>
                </div>
                {programmingOption === "organize" && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 4. Conditional Content Based on Selected Method */}
          {programmingOption === "direct" && (
            <div className="space-y-3 p-4 bg-blue-50/30 border border-blue-200 rounded-lg">
              <DateTimePicker
                mode="datetime"
                dateValue={directSchedule.date}
                timeValue={directSchedule.startTime}
                onDateChange={(date) => onDirectScheduleChange({ ...directSchedule, date })}
                onTimeChange={(time) => onDirectScheduleChange({ ...directSchedule, startTime: time })}
                dateLabel="Date du rendez-vous"
                timeLabel="Heure de début"
                required
                minDate={new Date().toISOString().split('T')[0]}
              />
              <div className="pt-2">
                <Label htmlFor="end-time" className="text-sm font-medium text-slate-900 mb-2 block">
                  Heure de fin (optionnelle)
                </Label>
                <DateTimePicker
                  mode="time"
                  timeValue={directSchedule.endTime}
                  onTimeChange={(time) => onDirectScheduleChange({ ...directSchedule, endTime: time })}
                  timeLabel="Heure de fin"
                />
              </div>
            </div>
          )}

          {programmingOption === "propose" && (
            <div className="space-y-3 p-4 bg-purple-50/30 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-slate-900">
                  Créneaux proposés ({proposedSlots.length})
                </Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={onAddProposedSlot}
                  variant="outline"
                  className="h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter un créneau
                </Button>
              </div>

              {proposedSlots.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500 bg-white rounded border-2 border-dashed border-slate-200">
                  Aucun créneau proposé. Cliquez sur "Ajouter un créneau" pour commencer.
                </div>
              ) : (
                <div className="space-y-3">
                  {proposedSlots.map((slot, index) => (
                    <div key={index} className="p-3 bg-white border border-purple-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Créneau {index + 1}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveProposedSlot(index)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <DateTimePicker
                        mode="timerange"
                        dateValue={slot.date}
                        timeValue={slot.startTime}
                        endTimeValue={slot.endTime}
                        onDateChange={(date) => onUpdateProposedSlot(index, 'date', date)}
                        onTimeChange={(time) => onUpdateProposedSlot(index, 'startTime', time)}
                        onEndTimeChange={(time) => onUpdateProposedSlot(index, 'endTime', time)}
                        dateLabel="Date"
                        timeLabel="Début"
                        endTimeLabel="Fin"
                        required
                        minDate={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {programmingOption === "organize" && (
            <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-emerald-900 mb-1">
                  Coordination autonome
                </h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Les participants recevront une notification et pourront se coordonner directement
                  entre eux pour fixer le rendez-vous. Vous serez notifié une fois la date confirmée.
                </p>
              </div>
            </div>
          )}

          {/* Preview message when no method selected */}
          {!programmingOption && (
            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
              <p className="text-sm text-slate-600 text-center">
                ↑ Sélectionnez une méthode de planification ci-dessus pour continuer
                <br />
                <span className="text-xs text-slate-500 mt-1 block">
                  (Les options de devis et instructions apparaîtront ensuite)
                </span>
              </p>
            </div>
          )}

          {/* 5. Quote Toggle (except for "organize" mode) */}
          {programmingOption && programmingOption !== "organize" && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-4 bg-amber-50/30 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm mb-1">
                      Demander un devis
                    </h3>
                    <p className="text-xs text-slate-600">
                      Exiger un devis avant la planification définitive
                    </p>
                  </div>
                </div>
                <Switch
                  checked={requireQuote}
                  onCheckedChange={onRequireQuoteChange || (() => {})}
                />
              </div>
            </>
          )}

          {/* 6. Instructions générales */}
          {programmingOption && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label htmlFor="instructions" className="text-sm font-medium text-slate-900">
                  Instructions générales
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="Ajoutez des instructions ou informations supplémentaires pour cette intervention..."
                  value={instructions}
                  onChange={(e) => onInstructionsChange?.(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-slate-500">
                  Ces informations seront partagées avec tous les participants
                </p>
              </div>
            </>
          )}
        </div>

        {/* 7. Footer */}
        <DialogFooter className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="min-w-[100px]"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isFormValid || !programmingOption}
            className="min-w-[140px]"
          >
            <Check className="h-4 w-4 mr-2" />
            Confirmer la planification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export types for re-use
export type ProgrammingModalProps = ProgrammingModalFinalProps
export type ProgrammingOption = "direct" | "propose" | "organize"
export type { TimeSlot, Provider, Contact }

// Also export with alias 'Manager' for backward compatibility
export type Manager = Contact

export default ProgrammingModalFinal
