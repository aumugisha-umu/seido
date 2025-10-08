"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Plus, Trash2, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface UserAvailability {
  date: string
  startTime: string
  endTime: string
}

interface ProviderAvailabilityModalProps {
  isOpen: boolean
  onClose: () => void
  interventionId: string
  interventionTitle: string
  onSuccess?: () => void
}

export function ProviderAvailabilityModal({
  isOpen,
  onClose,
  interventionId,
  interventionTitle,
  onSuccess
}: ProviderAvailabilityModalProps) {
  const [availabilities, setAvailabilities] = useState<UserAvailability[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Charger les disponibilités existantes
  useEffect(() => {
    if (isOpen && interventionId) {
      loadExistingAvailabilities()
    }
  }, [isOpen, interventionId])

  const loadExistingAvailabilities = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/intervention/${interventionId}/availabilities`)
      const result = await response.json()

      if (result.success && result.userAvailabilities) {
        // Transformer les données en format local
        const existingAvails = result.userAvailabilities.map((avail: any) => ({
          date: avail.date,
          startTime: avail.start_time ? avail.start_time.substring(0, 5) : avail.startTime,
          endTime: avail.end_time ? avail.end_time.substring(0, 5) : avail.endTime
        }))

        setAvailabilities(existingAvails.length > 0 ? existingAvails : [createNewAvailability()])
      } else {
        // Aucune disponibilité existante, créer un créneau par défaut
        setAvailabilities([createNewAvailability()])
      }
    } catch (err) {
      console.error('Error loading availabilities:', err)
      setError('Impossible de charger vos disponibilités existantes')
      // En cas d'erreur, créer un créneau par défaut
      setAvailabilities([createNewAvailability()])
    } finally {
      setIsLoading(false)
    }
  }

  const createNewAvailability = (): UserAvailability => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    return {
      date: tomorrow.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00'
    }
  }

  const handleAddAvailability = () => {
    setAvailabilities(prev => [...prev, createNewAvailability()])
    setSuccessMessage(null)
  }

  const handleUpdateAvailability = (index: number, field: keyof UserAvailability, value: string) => {
    setAvailabilities(prev => prev.map((avail, i) =>
      i === index ? { ...avail, [field]: value } : avail
    ))
    setSuccessMessage(null)
  }

  const handleRemoveAvailability = (index: number) => {
    setAvailabilities(prev => prev.filter((_, i) => i !== index))
    setSuccessMessage(null)
  }

  const isValid = (): boolean => {
    if (availabilities.length === 0) return false

    return availabilities.every(avail => {
      if (!avail.date || !avail.startTime || !avail.endTime) return false

      // Vérifier que la date n'est pas dans le passé
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const availDate = new Date(avail.date)
      if (availDate < today) return false

      // Vérifier que l'heure de fin est après l'heure de début
      const [startHour, startMin] = avail.startTime.split(':').map(Number)
      const [endHour, endMin] = avail.endTime.split(':').map(Number)

      return startHour < endHour || (startHour === endHour && startMin < endMin)
    })
  }

  const handleSave = async () => {
    if (!isValid()) {
      setError('Veuillez vérifier que tous les créneaux sont valides')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      // Normaliser les disponibilités au format attendu par l'API
      const normalizedAvailabilities = availabilities.map(avail => ({
        date: avail.date,
        // Normaliser au format HH:MM (enlever secondes si présentes)
        startTime: avail.startTime.substring(0, 5),
        endTime: avail.endTime.substring(0, 5)
      }))

      console.log('📤 [ProviderAvailabilityModal] Envoi des disponibilités:', {
        interventionId,
        count: normalizedAvailabilities.length,
        availabilities: normalizedAvailabilities
      })

      const response = await fetch(`/api/intervention/${interventionId}/user-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          availabilities: normalizedAvailabilities,
          message: message.trim() || undefined
        })
      })

      const result = await response.json()

      console.log('📥 [ProviderAvailabilityModal] Réponse API:', result)

      if (!result.success) {
        // Afficher l'erreur complète retournée par l'API
        throw new Error(result.error || 'Erreur lors de la sauvegarde des disponibilités')
      }

      setSuccessMessage('Vos disponibilités ont été enregistrées avec succès')

      // Attendre un peu pour que l'utilisateur voie le message de succès
      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 1500)

    } catch (err) {
      console.error('❌ [ProviderAvailabilityModal] Erreur complète:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde'
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setAvailabilities([])
      setMessage('')
      setError(null)
      setSuccessMessage(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Ajouter mes disponibilités</span>
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Intervention : <span className="font-medium">{interventionTitle}</span>
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Chargement des disponibilités...</span>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Messages d'erreur et succès */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {/* Instructions */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">📅 Comment ça marche ?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Indiquez vos créneaux de disponibilité pour cette intervention</li>
                <li>• Le locataire pourra choisir un créneau parmi ceux que vous proposez</li>
                <li>• Vous pouvez ajouter plusieurs créneaux pour plus de flexibilité</li>
              </ul>
            </div>

            {/* Liste des créneaux */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Vos créneaux de disponibilité</h4>
                <span className="text-sm text-gray-500">{availabilities.length} créneau(x)</span>
              </div>

              {availabilities.length > 0 ? (
                <div className="space-y-3">
                  {availabilities.map((avail, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      {/* Tous les champs sur une seule ligne */}
                      <div className="flex gap-3 items-end">
                        {/* Date */}
                        <div className="flex flex-col gap-2 flex-1">
                          <Label className="text-sm font-medium">Date</Label>
                          <DateTimePicker
                            mode="date"
                            dateValue={avail.date}
                            onDateChange={(date) => handleUpdateAvailability(index, 'date', date)}
                            minDate={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        {/* Début */}
                        <div className="flex flex-col gap-2 flex-1">
                          <Label className="text-sm font-medium">Début</Label>
                          <TimePicker
                            value={avail.startTime}
                            onChange={(time) => handleUpdateAvailability(index, 'startTime', time)}
                            className="w-full"
                          />
                        </div>

                        {/* Fin */}
                        <div className="flex flex-col gap-2 flex-1">
                          <Label className="text-sm font-medium">Fin</Label>
                          <TimePicker
                            value={avail.endTime}
                            onChange={(time) => handleUpdateAvailability(index, 'endTime', time)}
                            className="w-full"
                          />
                        </div>

                        {/* Bouton supprimer */}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveAvailability(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 w-10 flex-shrink-0"
                          disabled={availabilities.length === 1}
                          title={availabilities.length === 1 ? "Au moins un créneau est requis" : "Supprimer ce créneau"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun créneau ajouté</p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleAddAvailability}
                className="w-full border-dashed border-2 hover:border-blue-400 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un autre créneau
              </Button>
            </div>

            {/* Message optionnel */}
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Message pour le locataire (optionnel)
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Je préfère les matinées mais je peux m'adapter si nécessaire..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Ce message sera visible par le locataire lors du choix du créneau
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid() || isSaving || isLoading}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
