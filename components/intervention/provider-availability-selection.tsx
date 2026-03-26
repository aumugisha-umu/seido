"use client"

import { useState } from "react"
import { Calendar, Check, X, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { logger } from '@/lib/logger'
import { AvailabilitySlotList } from './availability-slot-list'
import { AvailabilityCalendar } from './availability-calendar'
interface ProviderAvailability {
  person: string
  role: string
  date: string
  startTime: string
  endTime: string
  userId?: string
}

interface TenantCounterProposal {
  date: string
  startTime: string
  endTime: string
}

interface ProviderAvailabilitySelectionProps {
  availabilities: ProviderAvailability[]
  interventionId: string
  onResponse: () => void
  loading?: boolean
  scheduledDate?: string
  scheduledTime?: string
  isScheduled?: boolean
}

export function ProviderAvailabilitySelection({
  availabilities,
  interventionId,
  onResponse,
  loading = false,
  scheduledDate,
  scheduledTime,
  isScheduled = false
}: ProviderAvailabilitySelectionProps) {
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rejectMessage, setRejectMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showModificationMode, setShowModificationMode] = useState(false)

  // Filtrer seulement les disponibilités des prestataires
  const providerAvailabilities = availabilities.filter(avail => avail.role === 'prestataire')

  // Générer un ID unique pour chaque créneau
  const generateSlotId = (avail: ProviderAvailability, index: number) =>
    `${avail.userId}-${avail.date}-${avail.startTime}-${avail.endTime}-${index}`

  // Convertir l'ID de slot en objet de créneau
  const parseSlotId = (_slotId: string) => {
    const slot = providerAvailabilities.find((avail, index) =>
      generateSlotId(avail, index) === slotId
    )
    return slot ? {
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime
    } : null
  }

  // Fonction pour normaliser le format d'heure (HH:MM:SS → HH:MM)
  const normalizeTimeFormat = (_time: string): string => {
    return time && time.length > 5 ? time.substring(0, 5) : time
  }

  // Validation robuste des données de créneau
  const validateSlotData = (slotData: { date: string; startTime: string; endTime: string }) => {
    const errors: string[] = []

    // Normaliser les heures avant validation
    const normalizedStartTime = normalizeTimeFormat(slotData.startTime)
    const normalizedEndTime = normalizeTimeFormat(slotData.endTime)

    logger.info('🔧 [SLOT-VALIDATION] Normalizing times:', {
      original: { startTime: slotData.startTime, endTime: slotData.endTime },
      normalized: { startTime: normalizedStartTime, endTime: normalizedEndTime }
    })

    // Vérifier le format de la date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(slotData.date)) {
      errors.push('Format de date invalide (YYYY-MM-DD attendu)')
    }

    // Vérifier le format des heures normalisées
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(normalizedStartTime)) {
      errors.push('Format d\'heure de début invalide (HH:MM attendu)')
    }
    if (!timeRegex.test(normalizedEndTime)) {
      errors.push('Format d\'heure de fin invalide (HH:MM attendu)')
    }

    // Vérifier que la date n'est pas dans le passé
    const selectedDate = new Date(slotData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      errors.push('Impossible de planifier dans le passé')
    }

    // Vérifier que l'heure de fin est après l'heure de début
    if (timeRegex.test(normalizedStartTime) && timeRegex.test(normalizedEndTime)) {
      const [startHour, startMin] = normalizedStartTime.split(':').map(Number)
      const [endHour, endMin] = normalizedEndTime.split(':').map(Number)

      if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
        errors.push('L\'heure de fin doit être après l\'heure de début')
      }
    }

    return errors
  }

  const handleSubmit = async () => {
    if (!selectedSlot) {
      logger.warn('🚫 [SLOT-SELECTION] No slot selected')
      return
    }

    // Validate intervention ID
    if (!interventionId || typeof interventionId !== 'string') {
      logger.error('❌ [SLOT-SELECTION] Invalid intervention ID:', interventionId)
      setErrorMessage('Erreur: identifiant d\'intervention invalide')
      return
    }

    logger.info('🚀 [SLOT-SELECTION] Starting submission for intervention:', interventionId)
    logger.info('📅 [SLOT-SELECTION] Selected slot:', selectedSlot)

    setErrorMessage('') // Clear previous errors
    setIsSubmitting(true)
    try {
      if (selectedSlot === 'reject') {
        // Validate reject message
        if (!rejectMessage || rejectMessage.trim().length < 10) {
          logger.error('❌ [SLOT-SELECTION] Reject message too short:', rejectMessage)
          setErrorMessage('Le message de rejet doit contenir au moins 10 caractères')
          return
        }

        logger.info('❌ [SLOT-SELECTION] Rejecting all propositions with message:', rejectMessage)

        const requestBody = {
          responseType: 'reject',
          message: rejectMessage,
          selectedSlots: [],
          counterProposals: []
        }
        logger.info('📤 [SLOT-SELECTION] Reject request body:', requestBody)

        const response = await fetch(`/api/intervention/${interventionId}/availability-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        logger.info('📥 [SLOT-SELECTION] Reject response status:', response.status)

        if (response.ok) {
          logger.info('✅ [SLOT-SELECTION] Rejection successful')

          // Show success toast notification and hide modification mode
          if (isScheduled && showModificationMode) {
            logger.info('🎉 [SLOT-SELECTION] Slot rejection successful')
            // Hide modification mode
            setShowModificationMode(false)
            setSelectedSlot('')
            setRejectMessage('')
            setErrorMessage('')
          }

          onResponse()
        } else {
          const errorData = await response.text()
          logger.error('❌ [SLOT-SELECTION] Error rejecting availability:', {
            status: response.status,
            statusText: response.statusText,
            body: errorData
          })
          let errorMsg = 'Erreur lors du rejet des créneaux'
          try {
            const parsedError = JSON.parse(errorData)
            errorMsg = parsedError.error || errorMsg
          } catch {
            // Keep default message if can't parse JSON
          }
          setErrorMessage(errorMsg)
        }
      } else {
        // Sélectionner un créneau spécifique
        const slotData = parseSlotId(selectedSlot)
        logger.info('🔍 [SLOT-SELECTION] Parsed slot data:', slotData)

        if (!slotData) {
          logger.error('❌ [SLOT-SELECTION] Could not parse slot ID:', selectedSlot)
          setErrorMessage('Erreur: impossible de traiter le créneau sélectionné')
          return
        }

        // Valider les données du créneau
        const validationErrors = validateSlotData(slotData)
        if (validationErrors.length > 0) {
          logger.error('❌ [SLOT-SELECTION] Slot data validation failed:', validationErrors)
          setErrorMessage(`Données invalides: ${validationErrors.join(', ')}`)
          return
        }
        logger.info('✅ [SLOT-SELECTION] Slot data validation passed')

        // Normaliser les heures avant envoi à l'API
        const normalizedSlotData = {
          ...slotData,
          startTime: normalizeTimeFormat(slotData.startTime),
          endTime: normalizeTimeFormat(slotData.endTime)
        }

        const requestBody = {
          selectedSlot: normalizedSlotData,
          comment: `Créneau choisi par le locataire`
        }
        logger.info('📤 [SLOT-SELECTION] Normalized slot data for API:', normalizedSlotData)
        logger.info('📤 [SLOT-SELECTION] Select request body:', requestBody)

        const response = await fetch(`/api/intervention/${interventionId}/select-slot`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })

        logger.info('📥 [SLOT-SELECTION] Select response status:', response.status)

        if (response.ok) {
          const responseData = await response.json()
          logger.info('✅ [SLOT-SELECTION] Slot selection successful:', responseData)

          // Show success toast notification
          if (isScheduled && showModificationMode) {
            // For modifications
            logger.info('🎉 [SLOT-SELECTION] Slot modification successful')
            // Hide modification mode
            setShowModificationMode(false)
            setSelectedSlot('')
            setRejectMessage('')
            setErrorMessage('')
          }

          onResponse()
        } else {
          const errorData = await response.text()
          logger.error('❌ [SLOT-SELECTION] Error selecting slot:', {
            status: response.status,
            statusText: response.statusText,
            body: errorData,
            requestBody
          })

          let errorMsg = 'Erreur lors de la sélection du créneau'
          let parsedError = null

          try {
            parsedError = JSON.parse(errorData)
            errorMsg = parsedError.error || errorMsg
          } catch {
            // Keep default message if can't parse JSON
          }

          // Add more specific error messages based on status code
          if (response.status === 403) {
            errorMsg = 'Vous n\'avez pas l\'autorisation de sélectionner ce créneau'
          } else if (response.status === 400) {
            errorMsg = parsedError?.error || 'Créneau invalide ou intervention dans un mauvais état'
          } else if (response.status === 404) {
            errorMsg = 'Intervention non trouvée'
          } else if (response.status >= 500) {
            errorMsg = 'Erreur serveur. Veuillez réessayer plus tard.'
          }

          setErrorMessage(errorMsg)
        }
      }
    } catch (error) {
      logger.error('💥 [SLOT-SELECTION] Unexpected error submitting choice:', error)
      logger.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available')
      setErrorMessage('Erreur inattendue. Veuillez réessayer ou contacter le support.')
    } finally {
      setIsSubmitting(false)
      logger.info('🏁 [SLOT-SELECTION] Submission process completed')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            <span className="ml-3 text-slate-600 font-medium">Chargement des disponibilités...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Si l'intervention est programmee et qu'on n'est pas en mode modification
  if (isScheduled && scheduledDate && scheduledTime && !showModificationMode) {
    return (
      <AvailabilityCalendar
        scheduledDate={scheduledDate}
        scheduledTime={scheduledTime}
        isModificationMode={false}
        onModify={() => setShowModificationMode(true)}
        onReject={() => {
          setSelectedSlot('reject')
          setShowModificationMode(true)
        }}
      />
    )
  }

  if (providerAvailabilities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              <span>{isScheduled && showModificationMode ? 'Modifier l\'intervention programmée' : 'Planification & Disponibilités'}</span>
            </div>
            {isScheduled && showModificationMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModificationMode(false)
                  setSelectedSlot('')
                  setRejectMessage('')
                  setErrorMessage('')
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">En attente des disponibilités</h3>
          <p className="text-slate-600 max-w-sm mx-auto">
            Le prestataire n'a pas encore proposé de créneaux pour cette intervention.
          </p>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              Vous recevrez une notification dès que le prestataire aura renseigné ses disponibilités.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-sky-600" />
                <span>{isScheduled && showModificationMode ? 'Modifier l\'intervention programmée' : 'Choisissez votre créneau d\'intervention'}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                {isScheduled && showModificationMode
                  ? 'Sélectionnez un nouveau créneau ou rejetez les propositions.'
                  : 'Sélectionnez le créneau qui vous convient le mieux ou indiquez qu\'aucun ne convient.'
                }
              </p>
            </div>
            {isScheduled && showModificationMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowModificationMode(false)
                  setSelectedSlot('')
                  setRejectMessage('')
                  setErrorMessage('')
                }}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Affichage du créneau actuellement programmé (en mode modification) */}
          {isScheduled && showModificationMode && scheduledDate && scheduledTime && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Créneau actuellement programmé</h4>
                  <p className="text-sm text-blue-700">
                    {new Date(scheduledDate).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })} à {scheduledTime}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sélection du créneau */}
          <div>
            <h4 className="font-medium text-slate-900 mb-4">Créneaux proposés</h4>
            <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot} className="space-y-4">
              {providerAvailabilities.map((avail, index) => {
                const slotId = generateSlotId(avail, index)
                const isSelected = selectedSlot === slotId

                return (
                  <div key={slotId} className="space-y-3">
                    {/* En-tête du prestataire (affiché une seule fois par prestataire) */}
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

                    {/* Créneau sélectionnable */}
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
                                de {avail.startTime.substring(0, 5)} à {avail.endTime.substring(0, 5)}
                              </span>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Option de rejet */}
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
                            Aucun créneau ne me convient
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Zone de message pour le rejet */}
          {selectedSlot === 'reject' && (
            <div className="space-y-3">
              <Label htmlFor="reject-message" className="text-sm font-medium text-slate-700">
                Expliquez pourquoi aucun créneau ne vous convient (obligatoire)
              </Label>
              <Textarea
                id="reject-message"
                placeholder="Exemple: Je ne suis pas disponible ces jours-là, j'aurais besoin d'autres créneaux..."
                value={rejectMessage}
                onChange={(e) => setRejectMessage(e.target.value)}
                className="border-slate-200 focus:border-red-300 focus:ring-red-200"
                rows={3}
              />
            </div>
          )}

          {/* Résumé de la sélection */}
          {selectedSlot && selectedSlot !== 'reject' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-900">
                  Créneau sélectionné
                </span>
              </div>
              <p className="text-sm text-emerald-700">
                Votre intervention sera planifiée définitivement avec ce créneau.
              </p>
            </div>
          )}

          {selectedSlot === 'reject' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-900">
                  Aucun créneau sélectionné
                </span>
              </div>
              <p className="text-sm text-amber-700">
                Votre message sera transmis au prestataire pour qu'il propose de nouveaux créneaux.
              </p>
            </div>
          )}

          {/* Message d'erreur */}
          {errorMessage && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Boutons d'action */}
          <div className="flex justify-end items-center space-x-2 pt-6 border-t border-slate-200">
            {isScheduled && showModificationMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowModificationMode(false)
                  setSelectedSlot('')
                  setRejectMessage('')
                  setErrorMessage('')
                }}
                disabled={isSubmitting}
                className="px-4"
              >
                <X className="h-3 w-3 mr-2" />
                Annuler
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!selectedSlot || (selectedSlot === 'reject' && !rejectMessage.trim()) || isSubmitting}
              className={`px-4 ${
                selectedSlot === 'reject'
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
                  : "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                  Envoi en cours...
                </>
              ) : selectedSlot === 'reject' ? (
                <>
                  <MessageSquare className="h-3 w-3 mr-2" />
                  Envoyer mon message
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-2" />
                  {isScheduled && showModificationMode ? 'Confirmer' : 'Confirmer ce créneau'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

    </>
  )
}
