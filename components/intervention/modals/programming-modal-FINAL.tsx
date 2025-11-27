"use client"

import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Check,
  CalendarDays,
  Users,
  User,
  MapPin,
  Building2,
  FileText,
  Info,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker24h } from "@/components/ui/time-picker-24h"
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
import { QuoteRequestCard } from "@/components/quotes/quote-request-card"
import type { Database } from '@/lib/database.types'

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

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
  tenants?: Contact[]
  selectedTenants?: string[]
  onTenantToggle?: (tenantId: string) => void
  onOpenManagerModal?: () => void
  onOpenProviderModal?: () => void
  quoteRequests?: Quote[]
  onViewProvider?: (providerId: string) => void
  onCancelQuoteRequest?: (requestId: string) => void
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
  tenants = [],
  selectedTenants = [],
  onTenantToggle,
  onOpenManagerModal,
  onOpenProviderModal,
  quoteRequests = [],
  onViewProvider,
  onCancelQuoteRequest
}: ProgrammingModalFinalProps) => {
  if (!intervention) return null

  // Get all quote requests for this intervention (show all statuses)
  const allQuoteRequests = quoteRequests || []

  // Get selected contacts for ContactSection
  const selectedManagerContacts: Contact[] = managers
    .filter(m => selectedManagers.includes(m.id))
    .map(m => ({ ...m, type: 'gestionnaire' as const }))

  const selectedProviderContacts: Contact[] = providers
    .filter(p => selectedProviders.includes(p.id))
    .map(p => ({ ...p, type: 'prestataire' as const, email: p.email || '' }))

  const selectedTenantContacts: Contact[] = tenants
    .filter(t => selectedTenants.includes(t.id))
    .map(t => ({ ...t, type: 'locataire' as const }))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[1100px] max-w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden" showCloseButton={false}>
        {/* STICKY HEADER - Informations intervention */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-white border-b border-slate-200">
          <DialogHeader className="p-6 pb-4 relative">
            <DialogTitle className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
              <Calendar className="h-6 w-6 text-blue-600" />
              Programmer l'intervention
            </DialogTitle>
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>

          {/* Intervention Summary - Infos principales */}
          <div className="px-6 pb-4">
            <div className="text-center">
              {/* Titre et badges - Layout horizontal */}
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

              {/* Informations contextuelles */}
              <div className="flex items-center justify-center space-x-4 text-sm text-slate-600 flex-wrap gap-2">
                {/* Location */}
                <div className="flex items-center space-x-1">
                  {intervention && getInterventionLocationIcon(intervention as any) === "building" ? (
                    <Building2 className="h-3 w-3" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  <span className="truncate max-w-xs">
                    {intervention ? getInterventionLocationText(intervention as any) : 'Localisation non spécifiée'}
                  </span>
                </div>

                {/* Créé par */}
                {intervention?.created_by && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>Créée par : {intervention.created_by}</span>
                  </div>
                )}

                {/* Créé le */}
                {intervention?.created_at && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Créé le : {new Date(intervention.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT - Card blanche avec le contenu */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6">

          {/* 1. Instructions générales */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Instructions générales
              </h2>
              <p className="text-sm text-slate-600">
                Ajoutez des instructions ou informations supplémentaires pour cette intervention
              </p>
            </div>
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

          <Separator />

          {/* 2. Assignations Section with ContactSection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Participants
              </h2>
              <p className="text-sm text-slate-600">
                Sélectionnez les gestionnaires et prestataires participant à l'intervention. Les locataires sont ajoutés automatiquement selon le bien concerné.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Locataires ContactSection (Read-only - pas de bouton Ajouter) */}
              <ContactSection
                sectionType="tenants"
                contacts={selectedTenantContacts}
                onRemoveContact={onTenantToggle}
                customLabel="Locataire(s) concerné(s)"
              />
            </div>
          </div>

          <Separator />

          {/* 3. Quote Section - Toggle + Request Cards */}
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Estimation préalable
              </h2>
              <p className="text-sm text-slate-600">
                {intervention.status === 'demande_de_devis' && allQuoteRequests.length > 0
                  ? "Demande de devis en cours"
                  : "Demander une estimation du temps et du coût avant la planification"
                }
              </p>
            </div>

            <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-lg space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm mb-1">
                      Demander une estimation
                    </h3>
                    <p className="text-xs text-slate-600">
                      Le prestataire devra fournir une estimation du temps et du coût avant la planification définitive
                    </p>
                  </div>
                </div>
                <Switch
                  checked={requireQuote || intervention.status === 'demande_de_devis'}
                  onCheckedChange={onRequireQuoteChange || (() => {})}
                />
              </div>

              {/* Display quote requests if status is 'demande_de_devis' */}
              {intervention.status === 'demande_de_devis' && allQuoteRequests.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-amber-300">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Demande envoyée
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allQuoteRequests.map(request => (
                      <QuoteRequestCard
                        key={request.id}
                        request={request}
                        onViewProvider={onViewProvider}
                        onCancelRequest={onCancelQuoteRequest}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* 4. Planning Method Selection */}
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
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    programmingOption === "direct" ? "bg-blue-100" : "bg-slate-100"
                  }`}>
                    <CalendarDays className={`h-5 w-5 ${
                      programmingOption === "direct" ? "text-blue-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div className="flex-1">
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
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    programmingOption === "propose" ? "bg-purple-100" : "bg-slate-100"
                  }`}>
                    <Clock className={`h-5 w-5 ${
                      programmingOption === "propose" ? "text-purple-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div className="flex-1">
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
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    programmingOption === "organize" ? "bg-emerald-100" : "bg-slate-100"
                  }`}>
                    <Users className={`h-5 w-5 ${
                      programmingOption === "organize" ? "text-emerald-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div className="flex-1">
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

          {/* 5. Conditional Content Based on Selected Method */}
          {programmingOption === "direct" && (
            <div className="space-y-4 p-4 bg-blue-50/30 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Date du rendez-vous *</Label>
                  <DatePicker
                    value={directSchedule.date}
                    onChange={(date) => onDirectScheduleChange({ ...directSchedule, date })}
                    minDate={new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium">Heure de début *</Label>
                  <TimePicker24h
                    value={directSchedule.startTime}
                    onChange={(time) => onDirectScheduleChange({ ...directSchedule, startTime: time })}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-slate-700">Heure de fin (optionnelle)</Label>
                <TimePicker24h
                  value={directSchedule.endTime}
                  onChange={(time) => onDirectScheduleChange({ ...directSchedule, endTime: time })}
                  className="w-full max-w-[200px]"
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
                    <div key={index} className="p-3 bg-white border border-purple-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium">Date *</Label>
                          <DatePicker
                            value={slot.date}
                            onChange={(date) => onUpdateProposedSlot(index, 'date', date)}
                            minDate={new Date().toISOString().split('T')[0]}
                            className="w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium">Début *</Label>
                          <TimePicker24h
                            value={slot.startTime}
                            onChange={(time) => onUpdateProposedSlot(index, 'startTime', time)}
                            className="w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium">Fin *</Label>
                          <TimePicker24h
                            value={slot.endTime}
                            onChange={(time) => onUpdateProposedSlot(index, 'endTime', time)}
                            className="w-full"
                          />
                        </div>
                      </div>
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
                  Les participants recevront une notification et pourront communiquer entre eux via la section discussion et l'outil de disponibilités fourni pour fixer le rendez-vous. Vous serez notifié une fois la date confirmée.
                </p>
              </div>
            </div>
          )}

          {/* Preview message when no method selected */}
          {!programmingOption && (
            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
              <p className="text-sm text-slate-600 text-center">
                ↑ Sélectionnez une méthode de planification ci-dessus pour continuer
              </p>
            </div>
          )}
          </div>
        </div>

        {/* STICKY FOOTER - Boutons d'action */}
        <div className="flex-shrink-0 sticky bottom-0 z-10 bg-white border-t border-slate-200 p-6">
          <div className="flex items-center justify-end gap-3">
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
          </div>
        </div>
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
