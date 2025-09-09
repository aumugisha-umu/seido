"use client"

import { Calendar, Clock, Plus, Trash2 } from "lucide-react"
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>Programmer l'intervention</span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Intervention Details */}
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Détails de l'intervention</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Titre:</span> {intervention?.title}</p>
                <p><span className="font-medium">Type:</span> {intervention?.type}</p>
                <p><span className="font-medium">Priorité:</span> {intervention?.priority}</p>
                <p><span className="font-medium">Assigné à:</span> {intervention?.assignedTo}</p>
              </div>
            </div>

            {/* Existing Availabilities */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 mb-3">Disponibilités existantes</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-green-800 mb-2">Locataire</p>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-green-700">
                      <Clock className="h-4 w-4" />
                      <span>Vendredi 10 janvier de 08:00 à 18:00</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-green-700">
                      <Clock className="h-4 w-4" />
                      <span>Samedi 11 janvier de 09:00 à 17:00</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-800 mb-2">Prestataire</p>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <Clock className="h-4 w-4" />
                      <span>Vendredi 10 janvier de 14:00 à 18:00</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <Clock className="h-4 w-4" />
                      <span>Samedi 11 janvier de 08:00 à 12:00</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-100 p-3 rounded border-l-4 border-yellow-400">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Créneaux en commun</p>
                  <div className="flex items-center space-x-2 text-sm text-yellow-700">
                    <Clock className="h-4 w-4" />
                    <span>Vendredi 10 janvier de 14:00 à 18:00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Planning Options */}
          <div className="space-y-4">
            <p className="text-gray-700 font-medium">Comment souhaitez-vous organiser la planification ?</p>

            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="programming"
                  value="direct"
                  checked={programmingOption === "direct"}
                  onChange={(e) => onProgrammingOptionChange(e.target.value as "direct")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Fixer directement la date et heure</p>
                  <p className="text-sm text-gray-600">Vous définissez un créneau précis pour l'intervention</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="programming"
                  value="propose"
                  checked={programmingOption === "propose"}
                  onChange={(e) => onProgrammingOptionChange(e.target.value as "propose")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Proposer des disponibilités</p>
                  <p className="text-sm text-gray-600">Les autres parties choisissent parmi vos créneaux</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="programming"
                  value="organize"
                  checked={programmingOption === "organize"}
                  onChange={(e) => onProgrammingOptionChange(e.target.value as "organize")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Laisser les autres s'organiser</p>
                  <p className="text-sm text-gray-600">Le locataire et le prestataire se coordonnent directement</p>
                </div>
              </label>
            </div>

            {/* Direct Schedule Form */}
            {programmingOption === "direct" && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Définir la date et heure</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={directSchedule.date}
                      onChange={(e) => onDirectScheduleChange({ ...directSchedule, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                      <input
                        type="time"
                        value={directSchedule.startTime}
                        onChange={(e) => onDirectScheduleChange({ ...directSchedule, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                      <input
                        type="time"
                        value={directSchedule.endTime}
                        onChange={(e) => onDirectScheduleChange({ ...directSchedule, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Proposed Slots Form */}
            {programmingOption === "propose" && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Proposer des créneaux</h4>
                <div className="space-y-3">
                  {proposedSlots.map((slot, index) => (
                    <div key={index} className="grid grid-cols-1 gap-3 p-3 bg-white rounded border">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={slot.date}
                          onChange={(e) => onUpdateProposedSlot(index, "date", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => onUpdateProposedSlot(index, "startTime", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => onUpdateProposedSlot(index, "endTime", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      {proposedSlots.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveProposedSlot(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={onAddProposedSlot}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un créneau
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={!isFormValid}>
            Confirmer la programmation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
