"use client"

import { useState } from "react"
import {
  Users,
  User,
  Wrench,
  Calendar,
  Clock,
  CalendarDays,
  MessageSquare,
  Plus,
  X,
  Info,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Label } from "@/components/ui/label"
import ContactSelector from "@/components/ui/contact-selector"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  role?: string
  speciality?: string
  isCurrentUser?: boolean
  type: "gestionnaire" | "prestataire" | "locataire"
}

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface AssignmentSectionV2Props {
  managers: Contact[]
  providers: Contact[]
  tenants: Contact[]  // Locataires du lot (affichés automatiquement)
  selectedManagerIds: string[]
  selectedProviderIds: string[]
  onManagerSelect: (managerId: string) => void
  onProviderSelect: (providerId: string) => void
  onContactCreated: (contact: any) => void
  schedulingType: "fixed" | "slots" | "flexible"
  onSchedulingTypeChange: (type: "fixed" | "slots" | "flexible") => void
  fixedDateTime: { date: string; time: string }
  onFixedDateTimeChange: (dateTime: { date: string; time: string }) => void
  timeSlots: TimeSlot[]
  onAddTimeSlot: () => void
  onUpdateTimeSlot: (index: number, field: keyof TimeSlot, value: string) => void
  onRemoveTimeSlot: (index: number) => void
  expectsQuote: boolean
  onExpectsQuoteChange: (expects: boolean) => void
  globalMessage: string
  onGlobalMessageChange: (message: string) => void
  individualMessages: Record<string, string>
  onIndividualMessageChange: (contactId: string, message: string) => void
  teamId: string
  isLoading?: boolean
}

export function AssignmentSectionV2({
  managers,
  providers,
  tenants,
  selectedManagerIds,
  selectedProviderIds,
  onManagerSelect,
  onProviderSelect,
  onContactCreated,
  schedulingType,
  onSchedulingTypeChange,
  fixedDateTime,
  onFixedDateTimeChange,
  timeSlots,
  onAddTimeSlot,
  onUpdateTimeSlot,
  onRemoveTimeSlot,
  expectsQuote,
  onExpectsQuoteChange,
  globalMessage,
  onGlobalMessageChange,
  individualMessages,
  onIndividualMessageChange,
  teamId,
  isLoading = false
}: AssignmentSectionV2Props) {
  const [expandedSections, setExpandedSections] = useState({
    contacts: true,
    planning: true,
    quote: false,
    messages: true
  })

  const [showIndividualMessages, setShowIndividualMessages] = useState(false)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get selected contacts
  const selectedManagers = managers.filter(m => selectedManagerIds.includes(String(m.id)))
  const selectedProviders = providers.filter(p => selectedProviderIds.includes(String(p.id)))
  const allSelectedContacts = [...selectedManagers, ...selectedProviders, ...tenants]

  // Debug log
  console.log("🔍 AssignmentSectionV2 - Tenants received:", tenants)
  console.log("🔍 AssignmentSectionV2 - All contacts:", allSelectedContacts)

  return (
    <div className="space-y-4">
      {/* Unified Contact Selection Section */}
      <Collapsible open={expandedSections.contacts}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <CollapsibleTrigger
            onClick={() => toggleSection('contacts')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Participants de l'intervention
              </h3>
              {allSelectedContacts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allSelectedContacts.length} sélectionné{allSelectedContacts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {expandedSections.contacts ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-6 pb-6 space-y-4 border-t">
              {/* Managers and Providers Selectors - Side by Side */}
              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Managers Selector */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <User className="h-4 w-4" />
                    Gestionnaires
                    <span className="text-red-500">*</span>
                  </label>
                  <ContactSelector
                    contacts={managers}
                    selectedContactIds={selectedManagerIds}
                    onContactSelect={onManagerSelect}
                    onContactCreated={onContactCreated}
                    contactType="gestionnaire"
                    placeholder="Sélectionner un ou plusieurs gestionnaires"
                    isLoading={isLoading}
                    teamId={teamId}
                  />
                </div>

                {/* Providers Selector */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Wrench className="h-4 w-4" />
                    Prestataires
                  </label>
                  <ContactSelector
                    contacts={providers}
                    selectedContactIds={selectedProviderIds}
                    onContactSelect={onProviderSelect}
                    onContactCreated={onContactCreated}
                    contactType="prestataire"
                    placeholder="Sélectionner des prestataires (optionnel)"
                    isLoading={isLoading}
                    teamId={teamId}
                  />
                </div>
              </div>

              {/* Unified Participants Display */}
              {(tenants.length > 0 || allSelectedContacts.length > 0) && (
                <div className="pt-4 border-t">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      Participants
                    </h4>

                    {/* Tenants Section */}
                    {tenants.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-slate-600">Locataires (inclus d'office)</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {tenants.map((tenant) => (
                            <div
                              key={tenant.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-emerald-200"
                            >
                              <span className="text-sm font-medium text-slate-700">
                                {tenant.name}
                              </span>
                              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 border-0">
                                Locataire
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Participants */}
                    {allSelectedContacts.filter(c => c.type !== "locataire").length > 0 && (
                      <div>
                        {tenants.length > 0 && <div className="border-t border-slate-200 my-3" />}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-slate-600">Autres participants</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {allSelectedContacts.filter(c => c.type !== "locataire").map((contact) => (
                            <div
                              key={contact.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200"
                            >
                              <span className="text-sm font-medium text-slate-700">
                                {contact.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs border-0",
                                  contact.type === "gestionnaire" && "bg-blue-100 text-blue-800",
                                  contact.type === "prestataire" && "bg-green-100 text-green-800"
                                )}
                              >
                                {contact.type === "gestionnaire" ? "Gestionnaire" : "Prestataire"}
                              </Badge>
                              {contact.isCurrentUser && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  Vous
                                </Badge>
                              )}
                              <button
                                onClick={() => {
                                  if (contact.type === "gestionnaire") {
                                    onManagerSelect(String(contact.id))
                                  } else {
                                    onProviderSelect(String(contact.id))
                                  }
                                }}
                                className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Planning Section */}
      <Collapsible open={expandedSections.planning}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <CollapsibleTrigger
            onClick={() => toggleSection('planning')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Planification de l'intervention
              </h3>
              <Badge variant="outline" className="text-xs">
                {schedulingType === "flexible" ? "À définir" :
                 schedulingType === "fixed" ? "Date fixe" : "Créneaux multiples"}
              </Badge>
            </div>
            {expandedSections.planning ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-6 pb-6 space-y-4 border-t pt-4">
              {/* Inline Radio Options */}
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  schedulingType === "flexible"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}>
                  <input
                    type="radio"
                    name="scheduling"
                    checked={schedulingType === "flexible"}
                    onChange={() => onSchedulingTypeChange("flexible")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">À définir</span>
                    <p className="text-xs text-slate-600">Laissez les parties s'organiser</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  schedulingType === "fixed"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}>
                  <input
                    type="radio"
                    name="scheduling"
                    checked={schedulingType === "fixed"}
                    onChange={() => onSchedulingTypeChange("fixed")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Date fixe</span>
                    <p className="text-xs text-slate-600">Définir un créneau précis</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  schedulingType === "slots"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}>
                  <input
                    type="radio"
                    name="scheduling"
                    checked={schedulingType === "slots"}
                    onChange={() => onSchedulingTypeChange("slots")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Créneaux</span>
                    <p className="text-xs text-slate-600">Proposer plusieurs options</p>
                  </div>
                </label>
              </div>

              {/* Conditional content based on selection */}
              {schedulingType === "fixed" && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <DateTimePicker
                    mode="datetime"
                    dateValue={fixedDateTime.date}
                    timeValue={fixedDateTime.time}
                    onDateChange={(date) => onFixedDateTimeChange({ ...fixedDateTime, date })}
                    onTimeChange={(time) => onFixedDateTimeChange({ ...fixedDateTime, time })}
                    dateLabel="Date"
                    timeLabel="Heure"
                  />
                </div>
              )}

              {schedulingType === "slots" && (
                <div className="space-y-2">
                  {timeSlots.map((slot, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-600">Créneau {index + 1}</span>
                        {timeSlots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveTimeSlot(index)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="flex flex-col gap-3">
                          <Label className="text-sm font-medium px-1">Date</Label>
                          <DateTimePicker
                            mode="date"
                            dateValue={slot.date}
                            onDateChange={(date) => onUpdateTimeSlot(index, "date", date)}
                            dateLabel=""
                            className="w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <Label className="text-sm font-medium px-1">Début</Label>
                          <TimePicker
                            value={slot.startTime}
                            onChange={(time) => onUpdateTimeSlot(index, "startTime", time)}
                            className="w-full"
                          />
                        </div>
                        <div className="flex flex-col gap-3">
                          <Label className="text-sm font-medium px-1">Fin</Label>
                          <TimePicker
                            value={slot.endTime}
                            onChange={(time) => onUpdateTimeSlot(index, "endTime", time)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddTimeSlot}
                    className="w-full h-9 text-xs border-dashed"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter un créneau
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Quote Section - Compact */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-600" />
            <label htmlFor="quote-switch" className="text-base font-semibold text-slate-900 cursor-pointer">
              Demander un devis
            </label>
          </div>
          <Switch
            id="quote-switch"
            checked={expectsQuote}
            onCheckedChange={onExpectsQuoteChange}
          />
        </div>
        {expectsQuote && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800">
              Les prestataires devront fournir un devis avant l'intervention.
              L'intervention ne pourra débuter qu'après validation du devis.
            </p>
          </div>
        )}
      </div>

      {/* Messages Section */}
      <Collapsible open={expandedSections.messages}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <CollapsibleTrigger
            onClick={() => toggleSection('messages')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Instructions et messages
              </h3>
              {(globalMessage || Object.values(individualMessages).some(m => m)) && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            {expandedSections.messages ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-6 pb-6 space-y-4 border-t pt-4">
              {/* Global Message */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Send className="h-4 w-4" />
                  Instructions générales
                </label>
                <Textarea
                  placeholder="Instructions visibles par tous les assignés (non visible par le locataire)..."
                  value={globalMessage}
                  onChange={(e) => onGlobalMessageChange(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>

              {/* Individual Messages Toggle */}
              {allSelectedContacts.length > 1 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      Messages personnalisés
                    </label>
                    <Switch
                      checked={showIndividualMessages}
                      onCheckedChange={setShowIndividualMessages}
                    />
                  </div>

                  {showIndividualMessages && (
                    <div className="space-y-3">
                      {allSelectedContacts.map((contact) => (
                        <div key={contact.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              contact.type === "gestionnaire" ? "bg-blue-500" : "bg-green-500"
                            )} />
                            <span className="text-sm font-medium text-slate-700">
                              {contact.name}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {contact.type === "gestionnaire" ? "Gestionnaire" : "Prestataire"}
                            </Badge>
                          </div>
                          <Textarea
                            value={individualMessages[contact.id] || ""}
                            onChange={(e) => onIndividualMessageChange(contact.id, e.target.value)}
                            placeholder="Message personnalisé..."
                            rows={2}
                            className="resize-none text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Les instructions ne seront pas visibles par le locataire. Seuls les assignés pourront les consulter.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  )
}