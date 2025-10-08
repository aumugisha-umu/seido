"use client"

import { useState } from "react"
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Check,
  User,
  Users,
  Search,
  ChevronRight,
  CalendarDays,
  UserCheck,
  Info,
  MessageSquare,
  CheckCircle2,
  Home,
  Wrench
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { cn } from "@/lib/utils"
import { type InterventionAction } from "@/lib/intervention-actions-service"
import ContactSelector from "@/components/ui/contact-selector"

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  type?: 'provider' | 'tenant'
  speciality?: string
  availability?: "available" | "busy" | "unknown"
}

interface ProgrammingModalEnhancedProps {
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
  onConfirm: () => void
  isFormValid: boolean

  // New props for contact selection
  teamId: string
  providers?: Contact[]
  tenants?: Contact[]
  selectedContactIds?: string[]
  onContactSelect?: (contactId: string) => void
  onContactCreated?: (contact: any) => void

  // New props for personalized messages
  individualMessages?: Record<string, string>
  onIndividualMessageChange?: (contactId: string, message: string) => void
}

export const ProgrammingModal = ({
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
  onConfirm,
  isFormValid,
  teamId,
  providers = [],
  tenants = [],
  selectedContactIds = [],
  onContactSelect = () => {},
  onContactCreated = () => {},
  individualMessages = {},
  onIndividualMessageChange = () => {}
}: ProgrammingModalEnhancedProps) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [activeContactType, setActiveContactType] = useState<'provider' | 'tenant'>('provider')

  // Get selected contacts
  const selectedProviders = providers.filter(p => selectedContactIds.includes(p.id))
  const selectedTenants = tenants.filter(t => selectedContactIds.includes(t.id))
  const allSelectedContacts = [...selectedProviders, ...selectedTenants]

  // Planning option configuration
  const planningOptions = [
    {
      id: "direct",
      icon: CalendarDays,
      title: "Fixer directement la date",
      description: "Définissez un créneau précis pour l'intervention",
      color: "sky"
    },
    {
      id: "propose",
      icon: Clock,
      title: "Proposer des disponibilités",
      description: "Les parties choisissent parmi vos créneaux",
      color: "emerald"
    },
    {
      id: "organize",
      icon: Users,
      title: "Laisser s'organiser",
      description: "Coordination directe entre les parties",
      color: "slate"
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header - Enhanced with better visual hierarchy */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-sky-50 via-sky-50/50 to-transparent border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-sky-100 rounded-lg shadow-sm">
              <Calendar className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <span className="text-slate-900">Programmer l'intervention</span>
              {intervention?.title && (
                <span className="ml-2 text-sm font-normal text-slate-600">- {intervention.title}</span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Intervention Summary - More compact and informative */}
          {intervention && (
            <div className="py-3 bg-gradient-to-b from-slate-50/50 to-transparent border-b -mx-6 px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                      {intervention?.type || "Type"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1.5",
                        intervention?.priority === "Urgent" && "border-red-200 bg-red-50 text-red-700",
                        intervention?.priority === "Normal" && "border-amber-200 bg-amber-50 text-amber-700",
                        intervention?.priority === "Faible" && "border-green-200 bg-green-50 text-green-700"
                      )}
                    >
                      {intervention?.priority || "Priorité"}
                    </Badge>
                    {intervention?.assignedTo && (
                      <Badge variant="outline" className="gap-1.5">
                        <User className="h-3 w-3" />
                        {intervention.assignedTo}
                      </Badge>
                    )}
                  </div>
                </div>

                {intervention?.description && (
                  <div className="group relative">
                    <Info className="h-5 w-5 text-slate-400 cursor-help transition-colors group-hover:text-sky-600" />
                    <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-72 p-3 bg-white rounded-lg shadow-xl border text-sm text-slate-600">
                      <div className="font-medium text-slate-900 mb-1">Description</div>
                      {intervention.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section Title with better styling */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-slate-900">
                Méthode de planification
              </h2>
              <p className="text-sm text-slate-500">
                Choisissez comment organiser cette intervention avec les parties concernées
              </p>
            </div>

            {/* Planning Options - Enhanced design */}
            <div className="grid gap-3">
              {planningOptions.map((option) => {
                const Icon = option.icon
                const isSelected = programmingOption === option.id

                return (
                  <button
                    key={option.id}
                    onClick={() => onProgrammingOptionChange(option.id as any)}
                    className={cn(
                      "group relative w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
                      "hover:shadow-md hover:border-sky-300",
                      isSelected ? [
                        "border-sky-500 bg-gradient-to-r from-sky-50 to-sky-50/30 shadow-sm",
                        "after:absolute after:inset-y-0 after:left-0 after:w-1 after:bg-sky-500 after:rounded-l-lg"
                      ] : "border-slate-200 bg-white hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "mt-0.5 p-2 rounded-lg transition-all duration-200",
                        isSelected ? "bg-sky-100 shadow-sm" : "bg-slate-100 group-hover:bg-sky-100"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5 transition-colors",
                          isSelected ? "text-sky-600" : "text-slate-500 group-hover:text-sky-600"
                        )} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            "font-medium transition-colors",
                            isSelected ? "text-sky-900" : "text-slate-900"
                          )}>
                            {option.title}
                          </h3>
                          {isSelected && (
                            <div className="animate-in zoom-in-50 duration-200">
                              <Check className="h-4 w-4 text-sky-600" />
                            </div>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-600">
                          {option.description}
                        </p>
                      </div>

                      <ChevronRight className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isSelected ? "text-sky-600 translate-x-1" : "text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1"
                      )} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Conditional Forms - Better integrated */}
            {programmingOption && (
              <div className="animate-in slide-in-from-top-2 duration-300 space-y-6">
                <Separator />

                {/* Direct Schedule Form */}
                {programmingOption === "direct" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-sky-600" />
                      <h3 className="font-medium text-slate-900">
                        Définir le créneau
                      </h3>
                    </div>

                    <div className="p-4 bg-gradient-to-br from-sky-50/30 to-transparent border border-sky-200 rounded-lg space-y-4">
                      <DateTimePicker
                        mode="datetime"
                        dateValue={directSchedule.date}
                        timeValue={directSchedule.startTime}
                        onDateChange={(date) => onDirectScheduleChange({ ...directSchedule, date })}
                        onTimeChange={(time) => onDirectScheduleChange({ ...directSchedule, startTime: time })}
                        dateLabel="Date de l'intervention"
                        timeLabel="Heure de début"
                      />

                      <div className="flex flex-col gap-3 flex-1">
                        <Label className="text-sm font-medium text-slate-700 px-1">
                          Heure de fin
                        </Label>
                        <TimePicker
                          value={directSchedule.endTime}
                          onChange={(time) => onDirectScheduleChange({ ...directSchedule, endTime: time })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Proposed Slots Form */}
                {programmingOption === "propose" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-medium text-slate-900">
                        Proposer des créneaux
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {proposedSlots.map((slot, index) => (
                        <div key={index} className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 hover:border-emerald-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">
                              Créneau {index + 1}
                            </span>
                            {proposedSlots.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveProposedSlot(index)}
                                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <DateTimePicker
                              mode="datetime"
                              dateValue={slot.date}
                              timeValue={slot.startTime}
                              onDateChange={(date) => onUpdateProposedSlot(index, "date", date)}
                              onTimeChange={(time) => onUpdateProposedSlot(index, "startTime", time)}
                              dateLabel="Date"
                              timeLabel="Heure début"
                            />
                            <div className="flex flex-col gap-3">
                              <Label className="text-sm font-medium text-slate-700 px-1">Heure fin</Label>
                              <TimePicker
                                value={slot.endTime}
                                onChange={(time) => onUpdateProposedSlot(index, "endTime", time)}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={onAddProposedSlot}
                        className="w-full border-dashed border-2 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un créneau
                      </Button>
                    </div>
                  </div>
                )}

                {/* Let Others Organize */}
                {programmingOption === "organize" && (
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-transparent border border-slate-200 rounded-lg">
                    <div className="flex gap-3">
                      <Users className="h-5 w-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-700 font-medium mb-1">
                          Organisation autonome
                        </p>
                        <p className="text-sm text-slate-600">
                          Les parties concernées recevront une notification pour organiser directement la planification entre eux.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Selection Section - NEW */}
                <Separator className="my-6" />

                <div className="bg-white rounded-xl border-2 border-sky-200 shadow-md p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <div className="p-2 bg-sky-100 rounded-lg">
                          <UserCheck className="h-5 w-5 text-sky-600" />
                        </div>
                        Sélection des participants
                      </h3>
                      <p className="text-sm text-slate-600 mt-2">
                        Choisissez les prestataires et locataires concernés par cette planification
                      </p>
                    </div>
                    {allSelectedContacts.length > 0 && (
                      <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-sm px-3 py-1">
                        {allSelectedContacts.length} sélectionné(s)
                      </Badge>
                    )}
                  </div>

                  {/* Contact Type Tabs */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    <button
                      onClick={() => setActiveContactType('provider')}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                        activeContactType === 'provider'
                          ? "bg-white text-sky-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Wrench className="h-4 w-4 inline-block mr-2" />
                      Prestataires ({providers.length})
                    </button>
                    <button
                      onClick={() => setActiveContactType('tenant')}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                        activeContactType === 'tenant'
                          ? "bg-white text-sky-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Home className="h-4 w-4 inline-block mr-2" />
                      Locataires ({tenants.length})
                    </button>
                  </div>

                  {/* Contact Selector */}
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                    <ContactSelector
                      contacts={activeContactType === 'provider'
                        ? providers.map(p => ({
                            id: p.id,
                            name: p.name,
                            email: p.email,
                            phone: p.phone,
                            speciality: p.speciality
                          }))
                        : tenants.map(t => ({
                            id: t.id,
                            name: t.name,
                            email: t.email,
                            phone: t.phone
                          }))
                      }
                      selectedContactIds={selectedContactIds}
                      onContactSelect={onContactSelect}
                      onContactCreated={onContactCreated}
                      contactType={activeContactType === 'provider' ? 'prestataire' : 'gestionnaire'}
                      placeholder={
                        activeContactType === 'provider'
                          ? "Rechercher et sélectionner des prestataires..."
                          : "Rechercher et sélectionner des locataires..."
                      }
                      teamId={teamId}
                    />
                  </div>

                  {/* Selected Contacts Display */}
                  {allSelectedContacts.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allSelectedContacts.map(contact => (
                        <Badge
                          key={contact.id}
                          variant="secondary"
                          className="gap-1.5 px-3 py-1.5"
                        >
                          {contact.type === 'provider' ? (
                            <Wrench className="h-3 w-3" />
                          ) : (
                            <Home className="h-3 w-3" />
                          )}
                          {contact.name}
                          <button
                            onClick={() => onContactSelect(contact.id)}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Personalized Messages Section - NEW */}
                {allSelectedContacts.length > 0 && (
                  <>
                    <Separator className="my-6" />

                    <div className="bg-white rounded-xl border-2 border-amber-200 shadow-md p-6 space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <MessageSquare className="h-5 w-5 text-amber-600" />
                            </div>
                            Messages personnalisés
                          </h3>
                          <p className="text-sm text-slate-600 mt-2">
                            Ajoutez des instructions spécifiques pour chaque participant
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                          Optionnel
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        {allSelectedContacts.map((contact) => (
                          <Card
                            key={contact.id}
                            className={cn(
                              "transition-all duration-200 border-slate-200",
                              hoveredCard === contact.id && "shadow-md border-sky-200"
                            )}
                            onMouseEnter={() => setHoveredCard(contact.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                          >
                            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className="p-1.5 bg-sky-100 rounded flex-shrink-0">
                                    {contact.type === 'provider' ? (
                                      <Wrench className="h-3.5 w-3.5 text-sky-600" />
                                    ) : (
                                      <Home className="h-3.5 w-3.5 text-sky-600" />
                                    )}
                                  </div>
                                  <CardTitle className="text-sm font-medium text-slate-900 truncate">
                                    {contact.name}
                                  </CardTitle>
                                </div>
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  {contact.type === 'provider' ? contact.speciality || 'Prestataire' : 'Locataire'}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <Textarea
                                value={individualMessages[contact.id] || ''}
                                onChange={(e) => onIndividualMessageChange(contact.id, e.target.value)}
                                placeholder={`Instructions spécifiques pour ${contact.name}...`}
                                rows={3}
                                className="resize-none text-sm border-slate-200 focus:border-sky-300 focus:ring-sky-200/50 transition-colors"
                              />
                              {individualMessages[contact.id] && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Message personnalisé ajouté
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Enhanced with better visual hierarchy */}
        <DialogFooter className="px-6 py-4 bg-gradient-to-r from-slate-50 to-transparent border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-slate-500">
              {programmingOption && allSelectedContacts.length > 0 && (
                <span>{allSelectedContacts.length} participant(s) seront notifiés</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="min-w-[100px]"
              >
                Annuler
              </Button>
              <Button
                onClick={onConfirm}
                disabled={!isFormValid || (programmingOption && allSelectedContacts.length === 0)}
                className="min-w-[140px] bg-sky-600 hover:bg-sky-700 disabled:opacity-50 shadow-sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmer
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProgrammingModal