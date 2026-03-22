"use client"

import React, { useRef, useState, useEffect, useMemo } from "react"
import {
  Calendar,
  Clock,
  Plus,
  Check,
  CalendarDays,
  Users,
  User,
  UserCheck,
  MapPin,
  Building2,
  FileText,
  Info,
  X,
  ArrowRight,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker24h } from "@/components/ui/time-picker-24h"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarWidget } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ContactSection } from "@/components/ui/contact-section"
import { ContactSelector, type ContactSelectorRef } from "@/components/contact-selector"
import { cn } from "@/lib/utils"
import type { BuildingTenantsResult } from "@/app/actions/contract-actions"
import { type InterventionAction } from "@/lib/intervention-actions-service"
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  isBuildingWideIntervention,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"
import { QuoteRequestCard } from "@/components/quotes/quote-request-card"
import { ParticipantConfirmationSelector } from "@/components/intervention/participant-confirmation-selector"
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
  has_account?: boolean  // Indicates if user is invited (has auth_id)
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
  onAddProposedSlot: (data?: { date: string; startTime: string; endTime: string }) => void
  onUpdateProposedSlot: (index: number, field: keyof TimeSlot, value: string) => void
  onRemoveProposedSlot: (index: number) => void
  selectedProviders: string[]
  onProviderToggle: (providerId: string) => void
  providers: Provider[]
  onConfirm: () => void
  isFormValid: boolean
  isSubmitting?: boolean
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
  // Tenant section props
  showTenantsSection?: boolean
  includeTenants?: boolean
  onIncludeTenantsChange?: (include: boolean) => void
  // Building tenants (grouped by lot for building-wide interventions)
  buildingTenants?: BuildingTenantsResult | null
  loadingBuildingTenants?: boolean
  // Lots selection (for granular control)
  excludedLotIds?: string[]
  onLotToggle?: (lotId: string) => void
  // Confirmation participants
  requiresConfirmation?: boolean
  onRequiresConfirmationChange?: (requires: boolean) => void
  confirmationRequired?: string[]
  onConfirmationRequiredChange?: (userId: string, required: boolean) => void
  currentUserId?: string
}

// ── Helpers for compact slot display ──

function formatSlotDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateStr
  }
}

function formatSlotDateLong(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

// ── Sub-component: Popover content for adding a time slot ──

function TimeSlotPopoverContent({ onAdd, onCancel }: {
  onAdd: (slot: { date: string; startTime: string; endTime: string }) => void
  onCancel: () => void
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : ''

  const isValid = dateStr && startTime && endTime

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-slate-900">Nouveau créneau</div>

      {/* Calendar */}
      <CalendarWidget
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        disabled={{ before: today }}
        className="rounded-md border border-slate-200"
      />

      {/* Time pickers */}
      <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
        <TimePicker24h value={startTime} onChange={setStartTime} />
        <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <TimePicker24h value={endTime} onChange={setEndTime} />
      </div>

      {/* Preview */}
      {dateStr && (startTime || endTime) && (
        <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <span className="font-medium text-purple-900">{formatSlotDateLong(dateStr)}</span>
          {startTime && endTime && (
            <span className="text-purple-600 ml-2">{startTime} - {endTime}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-xs">
          Annuler
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!isValid}
          onClick={() => {
            if (isValid) {
              onAdd({ date: dateStr, startTime, endTime })
            }
          }}
          className="text-xs bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  )
}

// ── Sub-component: Propose slots section with badges + popover ──

function ProposeSlotsSection({
  proposedSlots,
  onAddProposedSlot,
  onRemoveProposedSlot,
  hasOtherConfirmationParticipants,
  requiresConfirmation,
  onRequiresConfirmationChange,
  onConfirmationRequiredChange,
  confirmationManagers,
  confirmationProviders,
  confirmationTenants,
  confirmationRequired,
}: {
  proposedSlots: TimeSlot[]
  onAddProposedSlot: (data?: { date: string; startTime: string; endTime: string }) => void
  onRemoveProposedSlot: (index: number) => void
  hasOtherConfirmationParticipants: boolean
  requiresConfirmation?: boolean
  onRequiresConfirmationChange?: (requires: boolean) => void
  onConfirmationRequiredChange?: (userId: string, required: boolean) => void
  confirmationManagers: Array<Contact & { isCurrentUser?: boolean }>
  confirmationProviders: Contact[]
  confirmationTenants: Contact[]
  confirmationRequired: string[]
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  return (
    <div className="space-y-3 p-4 bg-purple-50/30 border border-purple-200 rounded-lg">
      <Label className="text-sm font-medium text-slate-900">
        Créneaux proposés ({proposedSlots.length})
      </Label>

      {/* Slot badges + Add button */}
      <div className="flex flex-wrap items-center gap-2">
        {proposedSlots.map((slot, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm group hover:bg-purple-100 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
            <span className="font-medium text-purple-900">{formatSlotDate(slot.date)}</span>
            <span className="text-purple-600">{slot.startTime} - {slot.endTime}</span>
            <button
              type="button"
              onClick={() => onRemoveProposedSlot(index)}
              className="ml-1 p-0.5 rounded-full text-purple-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Add slot via popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800 h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Ajouter un créneau
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start" side="bottom">
            <TimeSlotPopoverContent
              onAdd={(slot) => {
                onAddProposedSlot(slot)
                setPopoverOpen(false)
              }}
              onCancel={() => setPopoverOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Empty state */}
      {proposedSlots.length === 0 && (
        <div className="text-center py-4 text-sm text-slate-500 bg-white rounded border-2 border-dashed border-slate-200">
          Cliquez sur &quot;Ajouter un créneau&quot; pour proposer des disponibilités.
        </div>
      )}

      {/* ✅ FIX 2026-03-01: 2+ slots = mandatory confirmation, 1 slot = optional (like fixed) */}
      {hasOtherConfirmationParticipants && onConfirmationRequiredChange && proposedSlots.length >= 2 && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <Label className="text-sm font-medium">
              Participants qui doivent valider les créneaux
            </Label>
            <Badge variant="secondary" className="text-xs">
              Obligatoire
            </Badge>
          </div>
          <p className="text-xs text-blue-600 mb-2">
            Les participants sélectionnés devront confirmer leur disponibilité sur les créneaux proposés.
          </p>

          <ParticipantConfirmationSelector
            managers={confirmationManagers}
            providers={confirmationProviders}
            tenants={confirmationTenants}
            confirmationRequired={confirmationRequired}
            onToggle={onConfirmationRequiredChange}
            mandatory={true}
          />
        </div>
      )}

      {/* 1 slot = optional confirmation toggle (like Date fixe) */}
      {hasOtherConfirmationParticipants && onRequiresConfirmationChange && proposedSlots.length === 1 && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <Label className="text-sm font-medium cursor-pointer">
                Demander confirmation des participants
              </Label>
            </div>
            <Switch
              checked={requiresConfirmation}
              onCheckedChange={onRequiresConfirmationChange}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          {requiresConfirmation && onConfirmationRequiredChange && (
            <ParticipantConfirmationSelector
              managers={confirmationManagers}
              providers={confirmationProviders}
              tenants={confirmationTenants}
              confirmationRequired={confirmationRequired}
              onToggle={onConfirmationRequiredChange}
              mandatory={false}
            />
          )}
        </div>
      )}
    </div>
  )
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
  isSubmitting = false,
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
  onCancelQuoteRequest,
  // Tenant section props
  showTenantsSection = false,
  includeTenants = true,
  onIncludeTenantsChange,
  buildingTenants = null,
  loadingBuildingTenants = false,
  excludedLotIds = [],
  onLotToggle,
  requiresConfirmation = false,
  onRequiresConfirmationChange,
  confirmationRequired = [],
  onConfirmationRequiredChange,
  currentUserId
}: ProgrammingModalFinalProps) => {
  // Ref for ContactSelector modal
  const contactSelectorRef = useRef<ContactSelectorRef>(null)

  // Track contacts added via ContactSelector that aren't in the initial props
  const [addedProviders, setAddedProviders] = useState<Contact[]>([])
  const [addedManagers, setAddedManagers] = useState<Contact[]>([])

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAddedProviders([])
      setAddedManagers([])
    }
  }, [isOpen])

  // Get selected contacts — merge props + newly added contacts, then filter by selection
  // NOTE: useMemo hooks MUST be before the early return to respect Rules of Hooks
  const selectedManagerContacts: Contact[] = useMemo(() => {
    const fromProps = managers.map(m => ({ ...m, type: 'gestionnaire' as const }))
    const all = [...fromProps, ...addedManagers.filter(a => !fromProps.some(p => p.id === a.id))]
    return all.filter(m => selectedManagers.includes(m.id))
  }, [managers, addedManagers, selectedManagers])

  const selectedProviderContacts: Contact[] = useMemo(() => {
    const fromProps = providers.map(p => ({ ...p, type: 'prestataire' as const, email: p.email || '' }))
    const all = [...fromProps, ...addedProviders.filter(a => !fromProps.some(p => p.id === a.id))]
    return all.filter(p => selectedProviders.includes(p.id))
  }, [providers, addedProviders, selectedProviders])

  // Filtered contacts for confirmation selector — only those with accounts
  const confirmationManagers = useMemo(() => {
    return selectedManagerContacts
      .filter(m => m.has_account !== false)
      .map(m => ({ ...m, isCurrentUser: m.id === currentUserId }))
  }, [selectedManagerContacts, currentUserId])

  const confirmationProviders = useMemo(() => {
    return selectedProviderContacts.filter(p => p.has_account !== false)
  }, [selectedProviderContacts])

  const confirmationTenants = useMemo(() => {
    return tenants
      .filter(t => selectedTenants.includes(t.id) && t.has_account !== false)
      .map(t => ({ ...t, type: 'locataire' as const }))
  }, [tenants, selectedTenants])

  // Check if there are other participants besides current user (for confirmation section)
  const hasOtherConfirmationParticipants = useMemo(() => {
    const otherManagers = confirmationManagers.filter(m => !m.isCurrentUser)
    return otherManagers.length + confirmationProviders.length + confirmationTenants.length > 0
  }, [confirmationManagers, confirmationProviders, confirmationTenants])

  if (!intervention) return null

  // Get all quote requests for this intervention (show all statuses)
  const allQuoteRequests = quoteRequests || []

  // Active quotes: pending or sent, no amount submitted yet (cancellable)
  const activeQuoteRequests = allQuoteRequests.filter(q =>
    ['pending', 'sent'].includes(q.status) && q.amount <= 0
  )

  // Tenants unchanged (not added via ContactSelector)
  const selectedTenantContacts: Contact[] = tenants
    .filter(t => selectedTenants.includes(t.id))
    .map(t => ({ ...t, type: 'locataire' as const }))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent
        className="w-[1100px] max-w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden"
        showCloseButton={false}
        onPointerDownOutside={isSubmitting ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={isSubmitting ? (e) => e.preventDefault() : undefined}
      >
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
              disabled={isSubmitting}
              className="absolute top-6 right-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-30"
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
                {(intervention?.creator_name || intervention?.created_by) && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>Créée par : {intervention.creator_name || intervention.created_by}</span>
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

          {/* 1. Participants Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Participants
              </h2>
            </div>

            <div className={cn(
              "grid grid-cols-1 gap-4",
              showTenantsSection ? "md:grid-cols-3" : "md:grid-cols-2"
            )}>
              {/* Gestionnaires ContactSection */}
              <ContactSection
                sectionType="managers"
                contacts={selectedManagerContacts}
                onAddContact={onOpenManagerModal || (() => contactSelectorRef.current?.openContactModal('manager'))}
                onRemoveContact={onManagerToggle}
                minRequired={1}
                customLabel="Gestionnaire(s) assigné(s)"
              />

              {/* Prestataires ContactSection */}
              <ContactSection
                sectionType="providers"
                contacts={selectedProviderContacts}
                onAddContact={onOpenProviderModal || (() => contactSelectorRef.current?.openContactModal('provider'))}
                onRemoveContact={onProviderToggle}
                customLabel="Prestataire(s) à contacter"
              />

              {/* Locataires Section - Only show if there are tenants */}
              {showTenantsSection && (
                <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
                  {/* Header with toggle */}
                  <div className="w-full flex items-center justify-between gap-2 p-2.5 bg-blue-50">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-sm text-blue-900">Locataires</span>
                      {/* Badge count */}
                      {buildingTenants ? (
                        (() => {
                          const includedCount = buildingTenants.byLot
                            .filter(lot => !excludedLotIds?.includes(lot.lotId))
                            .reduce((sum, lot) => sum + lot.tenants.length, 0)
                          const includedLotsCount = buildingTenants.byLot
                            .filter(lot => !excludedLotIds?.includes(lot.lotId)).length
                          return includedCount > 0 && (
                            <>
                              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                                {includedCount}
                              </span>
                              <span className="text-xs text-blue-600">
                                ({includedLotsCount} lot{includedLotsCount > 1 ? 's' : ''})
                              </span>
                            </>
                          )
                        })()
                      ) : tenants.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                          {tenants.length}
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={includeTenants}
                      onCheckedChange={onIncludeTenantsChange}
                      className="data-[state=checked]:bg-blue-600"
                      disabled={loadingBuildingTenants}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-2 bg-white flex-1 max-h-60 overflow-y-auto">
                    {loadingBuildingTenants ? (
                      <div className="p-3 text-center text-xs text-gray-500">
                        Chargement des locataires...
                      </div>
                    ) : buildingTenants ? (
                      /* Building tenants - grouped by lot with individual switches */
                      includeTenants && buildingTenants.byLot.length > 0 ? (
                        <div className="space-y-3">
                          {buildingTenants.byLot.map((lotGroup) => {
                            const isLotIncluded = !excludedLotIds?.includes(lotGroup.lotId)

                            return (
                              <div key={lotGroup.lotId}>
                                {/* Lot header with switch */}
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                  <span className="text-xs font-medium text-slate-600">
                                    {lotGroup.lotReference}
                                    <span className="text-slate-400 ml-1">
                                      ({lotGroup.tenants.length})
                                    </span>
                                  </span>
                                  <Switch
                                    checked={isLotIncluded}
                                    onCheckedChange={() => onLotToggle?.(lotGroup.lotId)}
                                    className="scale-75 data-[state=checked]:bg-blue-600"
                                  />
                                </div>

                                {/* Tenants in this lot */}
                                <div className={cn("space-y-1", !isLotIncluded && "opacity-40")}>
                                  {lotGroup.tenants.map((tenant, index) => {
                                    const isInvited = (tenant as any).has_account !== false

                                    return (
                                      <div
                                        key={tenant.id || `tenant-${lotGroup.lotId}-${index}`}
                                        className={cn(
                                          "flex items-center gap-2 p-2 rounded border",
                                          isInvited
                                            ? "bg-blue-50/50 border-blue-100"
                                            : "bg-slate-50 border-slate-200"
                                        )}
                                      >
                                        <div className={cn(
                                          "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                          isInvited ? "bg-blue-200" : "bg-slate-200"
                                        )}>
                                          <User className={cn(
                                            "w-4 h-4",
                                            isInvited ? "text-blue-700" : "text-slate-500"
                                          )} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <span className={cn(
                                              "font-medium text-sm truncate",
                                              !isInvited && "text-slate-600"
                                            )}>
                                              {tenant.name}
                                            </span>
                                            {isInvited && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border-green-300"
                                              >
                                                Compte Seido
                                              </Badge>
                                            )}
                                          </div>
                                          {tenant.email && (
                                            <div className="text-xs text-gray-500 truncate">{tenant.email}</div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-500">
                          {includeTenants ? 'Aucun locataire dans cet immeuble' : 'Les locataires ne seront pas notifiés'}
                        </div>
                      )
                    ) : (
                      /* Lot tenants - simple list */
                      includeTenants && tenants.length > 0 ? (
                        <div className="space-y-1.5">
                          {tenants.map((tenant, index) => {
                            const isInvited = tenant.has_account !== false

                            return (
                              <div
                                key={tenant.id || `tenant-${index}`}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded border",
                                  isInvited
                                    ? "bg-blue-50/50 border-blue-100"
                                    : "bg-slate-50 border-slate-200"
                                )}
                              >
                                <div className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                  isInvited ? "bg-blue-200" : "bg-slate-200"
                                )}>
                                  <User className={cn(
                                    "w-4 h-4",
                                    isInvited ? "text-blue-700" : "text-slate-500"
                                  )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "font-medium text-sm truncate",
                                      !isInvited && "text-slate-600"
                                    )}>
                                      {tenant.name}
                                    </span>
                                    {isInvited && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0 h-4 bg-green-50 text-green-700 border-green-300"
                                      >
                                        Compte Seido
                                      </Badge>
                                    )}
                                  </div>
                                  {tenant.email && (
                                    <div className="text-xs text-gray-500 truncate">{tenant.email}</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-500">
                          {includeTenants ? 'Aucun locataire' : 'Les locataires ne seront pas notifiés'}
                        </div>
                      )
                    )}
                  </div>

                  {/* Info message */}
                  {includeTenants && (tenants.length > 0 || (buildingTenants && buildingTenants.byLot.length > 0)) && (
                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs text-slate-600 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        Les locataires invités seront notifiés et pourront suivre l'intervention.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-sm text-slate-600">
                Seuls les contacts invités (ayant un compte) recevront les notifications et auront accès au suivi.
              </p>
          </div>

          <Separator />

          {/* 2. Instructions et messages */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Instructions et messages
              </h2>
              <p className="text-sm text-slate-600">
                Ajoutez des instructions ou informations supplémentaires pour cette intervention
              </p>
            </div>

            {/* General instructions */}
            <div className="space-y-2">
              <Textarea
                id="instructions"
                placeholder="Instructions visibles par tous les prestataires et gestionnaires assignés"
                value={instructions}
                onChange={(e) => onInstructionsChange?.(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                Visibles par tous les prestataires assignés
              </p>
            </div>

            {/* Info notice about instruction visibility */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800 text-xs">
                Les instructions ne seront pas visibles par le locataire. Seuls les contacts invités (ayant un compte) et assignés à l'intervention pourront les consulter.
              </p>
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
                {activeQuoteRequests.length > 0
                  ? `${activeQuoteRequests.length} demande${activeQuoteRequests.length > 1 ? 's' : ''} d'estimation en cours`
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
                      Seuls les prestataires invités (ayant un compte) recevront la demande d&apos;estimation
                    </p>
                  </div>
                </div>
                <Switch
                  checked={requireQuote || intervention.requires_quote}
                  onCheckedChange={onRequireQuoteChange || (() => {})}
                />
              </div>

              {/* Warning when toggling OFF with active quotes */}
              {!requireQuote && activeQuoteRequests.length > 0 && (
                <div className="flex items-start gap-2 text-amber-700 bg-amber-100 p-3 rounded-md border border-amber-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    À la confirmation, {activeQuoteRequests.length > 1
                      ? `les ${activeQuoteRequests.length} demandes d'estimation ci-dessous seront annulées`
                      : "la demande d'estimation ci-dessous sera annulée"
                    } et les prestataires ayant un compte en seront notifiés.
                  </span>
                </div>
              )}

              {/* Display active quote requests (pending/sent) — shown regardless of intervention status */}
              {activeQuoteRequests.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-amber-300">
                  <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    {activeQuoteRequests.length > 1
                      ? `${activeQuoteRequests.length} demandes envoyées`
                      : "Demande envoyée"
                    }
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeQuoteRequests.map(request => (
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
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
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
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-slate-700">Heure de fin</Label>
                  <TimePicker24h
                    value={directSchedule.endTime}
                    onChange={(time) => onDirectScheduleChange({ ...directSchedule, endTime: time })}
                  />
                </div>
              </div>

              {/* Optional confirmation section — matching creation flow */}
              {hasOtherConfirmationParticipants && onRequiresConfirmationChange && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                      <Label className="text-sm font-medium cursor-pointer">
                        Demander confirmation des participants
                      </Label>
                    </div>
                    <Switch
                      checked={requiresConfirmation}
                      onCheckedChange={onRequiresConfirmationChange}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>

                  {requiresConfirmation && onConfirmationRequiredChange && (
                    <ParticipantConfirmationSelector
                      managers={confirmationManagers}
                      providers={confirmationProviders}
                      tenants={confirmationTenants}
                      confirmationRequired={confirmationRequired}
                      onToggle={onConfirmationRequiredChange}
                      mandatory={false}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {programmingOption === "propose" && (
            <ProposeSlotsSection
              proposedSlots={proposedSlots}
              onAddProposedSlot={onAddProposedSlot}
              onRemoveProposedSlot={onRemoveProposedSlot}
              hasOtherConfirmationParticipants={hasOtherConfirmationParticipants}
              requiresConfirmation={requiresConfirmation}
              onRequiresConfirmationChange={onRequiresConfirmationChange}
              onConfirmationRequiredChange={onConfirmationRequiredChange}
              confirmationManagers={confirmationManagers}
              confirmationProviders={confirmationProviders}
              confirmationTenants={confirmationTenants}
              confirmationRequired={confirmationRequired}
            />
          )}

          {programmingOption === "organize" && (
            <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-sm text-emerald-900 mb-1">
                  Coordination autonome
                </h3>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Les participants invités (ayant un compte) recevront une notification et pourront communiquer entre eux via la section discussion et l'outil de disponibilités fourni pour fixer le rendez-vous. Vous serez notifié une fois la date confirmée.
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
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              Annuler
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!isFormValid || !programmingOption || isSubmitting}
              className="min-w-[160px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isSubmitting ? 'Planification en cours...' : 'Confirmer la planification'}
            </Button>
          </div>
        </div>

        {/* Contact Selector Modal (hidden, opened via ref) */}
        <ContactSelector
          ref={contactSelectorRef}
          teamId={teamId}
          displayMode="compact"
          hideUI={true}
          selectedContacts={{
            manager: selectedManagerContacts,
            provider: selectedProviderContacts
          }}
          onContactSelected={(contact, contactType) => {
            if (contactType === 'manager') {
              setAddedManagers(prev =>
                prev.some(m => m.id === contact.id) ? prev : [...prev, { ...contact, type: 'gestionnaire' as const }]
              )
              onManagerToggle?.(contact.id)
            } else if (contactType === 'provider') {
              setAddedProviders(prev =>
                prev.some(p => p.id === contact.id) ? prev : [...prev, { ...contact, type: 'prestataire' as const, email: contact.email || '' }]
              )
              onProviderToggle?.(contact.id)
            }
          }}
          onContactRemoved={(contactId, contactType) => {
            if (contactType === 'manager') {
              onManagerToggle?.(contactId)
            } else if (contactType === 'provider') {
              onProviderToggle?.(contactId)
            }
          }}
        />
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
