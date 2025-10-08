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
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface Provider {
  id: string
  name: string
  role: string
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
  selectedProviders: string[]
  onProviderToggle: (providerId: string) => void
  providers: Provider[]
  onConfirm: () => void
  isFormValid: boolean
}

export const ProgrammingModalEnhanced = ({
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
  providers = [],
  onConfirm,
  isFormValid,
}: ProgrammingModalEnhancedProps) => {
  const [searchTerm, setSearchTerm] = useState("")

  // Filter providers based on search
  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header - Simplified and elegant */}
        <DialogHeader className="px-6 py-4 bg-gradient-to-r from-sky-50/50 to-transparent border-b">
          <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Calendar className="h-5 w-5 text-sky-600" />
            </div>
            Programmer l'intervention
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Intervention Summary - Compact and informative */}
          <div className="px-6 py-4 bg-slate-50/50 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-slate-900 mb-1">
                  {intervention?.title || "Intervention"}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className="gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-sky-500" />
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

              {/* Quick info tooltip */}
              {intervention?.description && (
                <div className="group relative">
                  <Info className="h-5 w-5 text-slate-400 cursor-help" />
                  <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-64 p-3 bg-white rounded-lg shadow-lg border text-sm text-slate-600">
                    {intervention.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Section Title */}
            <div>
              <h2 className="text-base font-semibold text-slate-900 mb-1">
                Méthode de planification
              </h2>
              <p className="text-sm text-slate-500">
                Choisissez comment organiser cette intervention
              </p>
            </div>

            {/* Planning Options - Modern card design */}
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
                        "border-sky-500 bg-sky-50/50 shadow-sm",
                        "after:absolute after:inset-y-0 after:left-0 after:w-1 after:bg-sky-500 after:rounded-l-lg"
                      ] : "border-slate-200 bg-white hover:bg-slate-50/50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "mt-0.5 p-2 rounded-lg transition-colors",
                        isSelected ? "bg-sky-100" : "bg-slate-100 group-hover:bg-sky-100"
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
                            <Check className="h-4 w-4 text-sky-600" />
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-slate-600">
                          {option.description}
                        </p>
                      </div>

                      <ChevronRight className={cn(
                        "h-5 w-5 transition-all",
                        isSelected ? "text-sky-600 translate-x-1" : "text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1"
                      )} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Conditional Forms - Better integrated */}
            {programmingOption && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <Separator className="mb-6" />

                {/* Direct Schedule Form */}
                {programmingOption === "direct" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <CalendarDays className="h-5 w-5 text-sky-600" />
                      <h3 className="font-medium text-slate-900">
                        Définir le créneau
                      </h3>
                    </div>

                    <div className="p-4 bg-sky-50/30 border border-sky-200 rounded-lg space-y-4">
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
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-5 w-5 text-emerald-600" />
                      <h3 className="font-medium text-slate-900">
                        Proposer des créneaux
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {proposedSlots.map((slot, index) => (
                        <div key={index} className="p-4 bg-white border border-slate-200 rounded-lg space-y-3">
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
                        className="w-full border-dashed border-2 hover:border-emerald-400 hover:bg-emerald-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un créneau
                      </Button>
                    </div>
                  </div>
                )}

                {/* Let Others Organize */}
                {programmingOption === "organize" && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex gap-3">
                      <Users className="h-5 w-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-700 font-medium mb-1">
                          Organisation autonome
                        </p>
                        <p className="text-sm text-slate-600">
                          Le locataire et le prestataire recevront une notification pour organiser directement la planification entre eux.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Provider Selection - Well integrated */}
                {programmingOption && programmingOption !== "organize" && providers.length > 0 && (
                  <>
                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-sky-600" />
                          <h3 className="font-medium text-slate-900">
                            Sélection des prestataires
                          </h3>
                        </div>
                        <span className="text-sm text-slate-500">
                          {selectedProviders.length} sélectionné(s)
                        </span>
                      </div>

                      {/* Search bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un prestataire..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Provider list */}
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                        {filteredProviders.length > 0 ? (
                          filteredProviders.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => onProviderToggle(provider.id)}
                              className={cn(
                                "w-full flex items-center justify-between p-3 rounded-lg transition-all",
                                selectedProviders.includes(provider.id)
                                  ? "bg-sky-50 border border-sky-200"
                                  : "bg-white hover:bg-slate-50 border border-transparent"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                  selectedProviders.includes(provider.id)
                                    ? "bg-sky-100 text-sky-700"
                                    : "bg-slate-100 text-slate-600"
                                )}>
                                  {provider.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-medium text-slate-900">
                                    {provider.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {provider.role}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {provider.availability && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    provider.availability === "available" && "bg-green-100 text-green-700",
                                    provider.availability === "busy" && "bg-red-100 text-red-700",
                                    provider.availability === "unknown" && "bg-slate-100 text-slate-600"
                                  )}>
                                    {provider.availability === "available" && "Disponible"}
                                    {provider.availability === "busy" && "Occupé"}
                                    {provider.availability === "unknown" && "À confirmer"}
                                  </span>
                                )}
                                {selectedProviders.includes(provider.id) && (
                                  <div className="w-5 h-5 bg-sky-600 rounded-full flex items-center justify-center">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4">
                            Aucun prestataire trouvé
                          </p>
                        )}
                      </div>

                      <button className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">
                        <Plus className="h-4 w-4" />
                        Ajouter un nouveau prestataire
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Clean and focused */}
        <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t">
          <div className="flex gap-3 justify-end w-full">
            <Button
              variant="outline"
              onClick={onClose}
              className="min-w-[100px]"
            >
              Annuler
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!isFormValid}
              className="min-w-[140px] bg-sky-600 hover:bg-sky-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Export as default and named export for compatibility
export { ProgrammingModalEnhanced as ProgrammingModal }
export default ProgrammingModalEnhanced