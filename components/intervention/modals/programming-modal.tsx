"use client"

import { Calendar, Clock, Plus, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { type InterventionAction } from "@/lib/intervention-actions-service"

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface ProgrammingModalProps {
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
}: ProgrammingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-[95vw] sm:w-[calc(100%-2rem)] sm:max-w-[600px] md:max-w-[768px] lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6 border-b border-slate-200 bg-gradient-to-r from-sky-50 to-white sticky top-0 z-10">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg lg:text-xl font-semibold text-slate-900">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
            <span>Programmer l'intervention</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className={`grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 ${
            intervention?.availabilities && intervention.availabilities.length > 0
              ? 'lg:grid-cols-[minmax(350px,2fr)_minmax(450px,3fr)]'
              : 'lg:grid-cols-1'
          }`}>
            {/* Left Column - Intervention Details */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border border-sky-200 shadow-sm hover:shadow-md transition-all duration-300">
                <h3 className="font-semibold text-sky-900 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <div className="h-1 w-8 bg-sky-500 rounded-full" />
                  Détails de l'intervention
                </h3>

                {/* Grid layout for compact display */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5 mb-4">
                  <div>
                    <p className="text-xs font-medium text-sky-800 mb-0.5">Titre</p>
                    <p className="text-xs sm:text-sm text-slate-700">{intervention?.title || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-sky-800 mb-0.5">Type</p>
                    <p className="text-xs sm:text-sm text-slate-700">{intervention?.type || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-sky-800 mb-0.5">Priorité</p>
                    <p className="text-xs sm:text-sm text-slate-700">{intervention?.priority || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-sky-800 mb-0.5">Assigné à</p>
                    <p className="text-xs sm:text-sm text-slate-700">{intervention?.assignedTo || '-'}</p>
                  </div>
                </div>

                {/* Description */}
                {intervention?.description && (
                  <div className="pt-3 border-t border-sky-200">
                    <p className="text-xs font-medium text-sky-800 mb-1.5">Description</p>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{intervention.description}</p>
                  </div>
                )}

                {/* Attachments */}
                {intervention?.hasFiles && (
                  <div className="pt-3 border-t border-sky-200 mt-3">
                    <p className="text-xs font-medium text-sky-800 mb-1.5">Pièces jointes</p>
                    <p className="text-xs sm:text-sm text-slate-600 italic">
                      {intervention.filesCount || 'Plusieurs'} fichier(s) joint(s) à cette intervention
                    </p>
                  </div>
                )}
              </div>

            {/* Existing Availabilities - Only show if intervention has availabilities */}
            {intervention?.availabilities && intervention.availabilities.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 sm:p-5 lg:p-6 rounded-lg sm:rounded-xl border border-emerald-200 shadow-sm hover:shadow-md transition-all duration-300">
                <h3 className="font-semibold text-emerald-900 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <div className="h-1 w-8 bg-emerald-500 rounded-full" />
                  Disponibilités existantes
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {/* Display actual availabilities from intervention data */}
                  {intervention.availabilities.map((availability, index) => (
                    <div key={index}>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-800 mb-2 capitalize">
                        {availability.role || availability.person}
                      </p>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-700">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>
                          {new Date(availability.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {' de '}
                          {availability.startTime} à {availability.endTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Planning Options */}
          <div className={`space-y-4 sm:space-y-5 lg:space-y-6 ${
            (!intervention?.availabilities || intervention.availabilities.length === 0)
              ? 'lg:max-w-full'
              : ''
          }`}>
            <p className="text-slate-700 font-semibold text-sm sm:text-base lg:text-lg mb-4 sm:mb-6">Comment souhaitez-vous organiser la planification ?</p>

            {/* Two-column layout: radio options on left, forms on right */}
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4 sm:gap-6 lg:gap-8">
              {/* Left: Radio Options */}
              <div className="space-y-3 sm:space-y-4">
              <label
                className={`relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2 ${
                  programmingOption === "direct" ? "border-sky-500 bg-sky-50 shadow-lg" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="programming"
                  value="direct"
                  checked={programmingOption === "direct"}
                  onChange={(e) => onProgrammingOptionChange(e.target.value as "direct")}
                  className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 text-sky-600 border-2 border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base lg:text-lg">Fixer directement la date et heure</p>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">Vous définissez un créneau précis pour l'intervention</p>
                </div>
              </label>

              <label
                className={`relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2 ${
                  programmingOption === "propose" ? "border-sky-500 bg-sky-50 shadow-lg" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="programming"
                  value="propose"
                  checked={programmingOption === "propose"}
                  onChange={(e) => onProgrammingOptionChange(e.target.value as "propose")}
                  className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 text-sky-600 border-2 border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base lg:text-lg">Proposer des disponibilités</p>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">Les autres parties choisissent parmi vos créneaux</p>
                </div>
              </label>

              <label
                className={`relative flex items-start gap-3 sm:gap-4 p-3 sm:p-4 lg:p-5 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:border-sky-300 hover:bg-sky-50/30 hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-2 ${
                  programmingOption === "organize" ? "border-sky-500 bg-sky-50 shadow-lg" : "border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  name="programming"
                  value="organize"
                  checked={programmingOption === "organize"}
                  onChange={(e) => onProgrammingOptionChange(e.target.value as "organize")}
                  className="mt-0.5 sm:mt-1 w-4 h-4 sm:w-5 sm:h-5 text-sky-600 border-2 border-slate-300 focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base lg:text-lg">Laisser les autres s'organiser</p>
                  <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed">Le locataire et le prestataire se coordonnent directement</p>
                </div>
              </label>
              </div>

              {/* Right: Conditional Forms */}
              <div className="min-h-[200px]">
                {/* Direct Schedule Form */}
                {programmingOption === "direct" && (
              <div className="p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-sky-50 to-sky-100/30 border-2 border-sky-200 rounded-lg sm:rounded-xl animate-in slide-in-from-top-2 duration-300">
                <h4 className="font-semibold text-sky-900 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
                  Définir la date et heure
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Date de l'intervention</label>
                    <input
                      type="date"
                      value={directSchedule.date}
                      onChange={(e) => onDirectScheduleChange({ ...directSchedule, date: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-slate-300 rounded-md sm:rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 hover:border-sky-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Heure de début</label>
                      <input
                        type="time"
                        value={directSchedule.startTime}
                        onChange={(e) => onDirectScheduleChange({ ...directSchedule, startTime: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-slate-300 rounded-md sm:rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 hover:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Heure de fin</label>
                      <input
                        type="time"
                        value={directSchedule.endTime}
                        onChange={(e) => onDirectScheduleChange({ ...directSchedule, endTime: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-slate-300 rounded-md sm:rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 hover:border-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

                {/* Proposed Slots Form */}
                {programmingOption === "propose" && (
              <div className="p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-2 border-emerald-200 rounded-lg sm:rounded-xl animate-in slide-in-from-top-2 duration-300">
                <h4 className="font-semibold text-emerald-900 text-sm sm:text-base lg:text-lg mb-3 sm:mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  Proposer des créneaux
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  {proposedSlots.map((slot, index) => (
                    <div key={index} className="p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl border-2 border-emerald-200 shadow-sm space-y-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Date</label>
                        <input
                          type="date"
                          value={slot.date}
                          onChange={(e) => onUpdateProposedSlot(index, "date", e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-slate-300 rounded-md sm:rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-emerald-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Début</label>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => onUpdateProposedSlot(index, "startTime", e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-slate-300 rounded-md sm:rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Fin</label>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => onUpdateProposedSlot(index, "endTime", e.target.value)}
                            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-slate-300 rounded-md sm:rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-emerald-400"
                          />
                        </div>
                      </div>
                      {proposedSlots.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveProposedSlot(index)}
                          className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300 hover:border-red-400 text-xs sm:text-sm"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={onAddProposedSlot}
                    className="w-full border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800 transition-all duration-200 text-xs sm:text-sm py-2 sm:py-2.5"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Ajouter un créneau
                  </Button>
                </div>
              </div>
                )}

                {/* Info message when "organize" is selected */}
                {programmingOption === "organize" && (
                  <div className="p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-slate-50 to-slate-100/30 border-2 border-slate-200 rounded-lg sm:rounded-xl animate-in slide-in-from-top-2 duration-300">
                    <p className="text-slate-700 text-sm sm:text-base">
                      Le locataire et le prestataire recevront une notification pour organiser directement la planification entre eux.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white sticky bottom-0 z-10 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base border-2 hover:bg-slate-50 transition-all duration-200"
          >
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isFormValid}
            className="w-full sm:w-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 text-sm sm:text-base bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Confirmer la programmation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
