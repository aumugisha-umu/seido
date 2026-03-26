'use client'

import { Clock, X } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ProviderAvailability {
  person: string
  role: string
  date: string
  startTime: string
  endTime: string
  userId?: string
}

interface AvailabilitySlotListProps {
  providerAvailabilities: ProviderAvailability[]
  selectedSlot: string
  onSlotChange: (slotId: string) => void
  rejectMessage: string
  onRejectMessageChange: (message: string) => void
  generateSlotId: (avail: ProviderAvailability, index: number) => string
}

export function AvailabilitySlotList({
  providerAvailabilities,
  selectedSlot,
  onSlotChange,
  rejectMessage,
  onRejectMessageChange,
  generateSlotId,
}: AvailabilitySlotListProps) {
  return (
    <>
      {/* Slot selection */}
      <div>
        <h4 className="font-medium text-slate-900 mb-4">Creneaux proposes</h4>
        <RadioGroup value={selectedSlot} onValueChange={onSlotChange} className="space-y-4">
          {providerAvailabilities.map((avail, index) => {
            const slotId = generateSlotId(avail, index)
            const isSelected = selectedSlot === slotId

            return (
              <div key={slotId} className="space-y-3">
                {/* Provider header (displayed once per provider) */}
                {(index === 0 || providerAvailabilities[index - 1].person !== avail.person) && (
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-900">{avail.person}</h5>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        prestataire
                      </span>
                    </div>
                  </div>
                )}

                {/* Selectable slot */}
                <div
                  className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={slotId} id={slotId} />
                    <label htmlFor={slotId} className="flex-1 cursor-pointer">
                      <div className={`p-3 rounded-lg ${isSelected ? 'bg-white/70' : 'bg-slate-50'}`}>
                        <div className="flex items-center space-x-2">
                          <Clock className={`h-4 w-4 ${isSelected ? 'text-sky-600' : 'text-slate-500'}`} />
                          <span className={`font-medium ${isSelected ? 'text-sky-900' : 'text-slate-700'}`}>
                            {new Date(avail.date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                            })}
                          </span>
                          <span className={`text-sm ${isSelected ? 'text-sky-700' : 'text-slate-600'}`}>
                            de {avail.startTime.substring(0, 5)} a {avail.endTime.substring(0, 5)}
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Reject option */}
          <div className="border-t pt-4">
            <div
              className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                selectedSlot === 'reject'
                  ? 'border-red-300 bg-red-50 ring-2 ring-red-200'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="reject" id="reject" />
                <label htmlFor="reject" className="flex-1 cursor-pointer">
                  <div className={`p-3 rounded-lg ${selectedSlot === 'reject' ? 'bg-white/70' : 'bg-slate-50'}`}>
                    <div className="flex items-center space-x-2">
                      <X className={`h-4 w-4 ${selectedSlot === 'reject' ? 'text-red-600' : 'text-slate-500'}`} />
                      <span className={`font-medium ${selectedSlot === 'reject' ? 'text-red-900' : 'text-slate-700'}`}>
                        Aucun creneau ne me convient
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Reject message area */}
      {selectedSlot === 'reject' && (
        <div className="space-y-3">
          <Label htmlFor="reject-message" className="text-sm font-medium text-slate-700">
            Expliquez pourquoi aucun creneau ne vous convient (obligatoire)
          </Label>
          <Textarea
            id="reject-message"
            placeholder="Exemple: Je ne suis pas disponible ces jours-la, j'aurais besoin d'autres creneaux..."
            value={rejectMessage}
            onChange={(e) => onRejectMessageChange(e.target.value)}
            className="border-slate-200 focus:border-red-300 focus:ring-red-200"
            rows={3}
          />
        </div>
      )}
    </>
  )
}
