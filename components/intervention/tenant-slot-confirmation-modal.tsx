"use client"

import { useState } from "react"
import { Calendar, Clock, CheckCircle, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProviderAvailability {
  person: string
  role: string
  date: string
  startTime: string
  endTime: string
  userId?: string
}

interface TenantSlotConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  availabilities: ProviderAvailability[]
  interventionTitle: string
  onConfirm: (selectedSlot: { date: string; startTime: string; endTime: string; }, comment?: string) => Promise<void>
  loading?: boolean
}

export function TenantSlotConfirmationModal({
  isOpen,
  onClose,
  availabilities,
  interventionTitle,
  onConfirm,
  loading = false
}: TenantSlotConfirmationModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [comment, setComment] = useState('')

  const handleConfirm = async () => {
    if (!selectedSlot) return

    const [date, startTime, endTime] = selectedSlot.split('|')

    try {
      await onConfirm(
        { date, startTime, endTime },
        comment.trim() || undefined
      )

      // Reset form and close modal
      setSelectedSlot('')
      setComment('')
      onClose()
    } catch (error) {
      console.error('Erreur lors de la confirmation du créneau:', error)
    }
  }

  const handleClose = () => {
    setSelectedSlot('')
    setComment('')
    onClose()
  }

  // Group availabilities by date for better display
  const groupedAvailabilities = availabilities.reduce((acc, availability) => {
    const dateKey = availability.date
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(availability)
    return acc
  }, {} as Record<string, ProviderAvailability[]>)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Remove seconds if present
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirmer un créneau
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un créneau disponible pour l'intervention "{interventionTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {Object.keys(groupedAvailabilities).length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucun créneau disponible pour cette intervention.
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot}>
              {Object.entries(groupedAvailabilities).map(([date, dayAvailabilities]) => (
                <Card key={date} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(date)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dayAvailabilities.map((availability, index) => {
                      const slotValue = `${availability.date}|${formatTime(availability.startTime)}|${formatTime(availability.endTime)}`
                      const isSelected = selectedSlot === slotValue

                      return (
                        <div key={index} className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <RadioGroupItem value={slotValue} id={slotValue} />
                          <Label htmlFor={slotValue} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  {formatTime(availability.startTime)} - {formatTime(availability.endTime)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm font-medium">{availability.person}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {availability.role === 'prestataire' ? 'Prestataire' :
                                     availability.role === 'gestionnaire' ? 'Gestionnaire' :
                                     availability.role}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              ))}
            </RadioGroup>
          )}

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Commentaire (optionnel)
            </Label>
            <Textarea
              id="comment"
              placeholder="Ajoutez un commentaire sur ce créneau..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedSlot || loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Confirmation...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmer le créneau
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}