"use client"

import { useState, useEffect, useCallback } from "react"
import { Calendar, Clock, Plus, Trash2, Save, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface TenantAvailability {
  date: string
  startTime: string
  endTime: string
}

interface TenantAvailabilityInputProps {
  interventionId: string
  onSuccess: () => void
  providerAvailabilities?: Array<{
    user_name: string
    date: string
    start_time: string
    end_time: string
  }>
}

export function TenantAvailabilityInput({
  interventionId,
  onSuccess,
  providerAvailabilities = []
}: TenantAvailabilityInputProps) {
  const [availabilities, setAvailabilities] = useState<TenantAvailability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)

  // Load existing availabilities on mount
  useEffect(() => {
    loadExistingAvailabilities()
  }, [interventionId, loadExistingAvailabilities])

  const loadExistingAvailabilities = useCallback(async () => {
    try {
      const response = await fetch(`/api/intervention/${interventionId}/tenant-availability`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.availabilities) {
          const existing = result.availabilities.map((avail: { date: string; start_time: string; end_time: string }) => ({
            date: avail.date,
            startTime: avail.start_time,
            endTime: avail.end_time
          }))
          setAvailabilities(existing)
        }
      }
    } catch (error) {
      console.warn("Could not load existing availabilities:", error)
    } finally {
      setLoadingExisting(false)
    }
  }, [interventionId])

  const addAvailability = () => {
    setAvailabilities([...availabilities, {
      date: '',
      startTime: '',
      endTime: ''
    }])
  }

  const removeAvailability = (index: number) => {
    setAvailabilities(availabilities.filter((_, i) => i !== index))
  }

  const updateAvailability = (index: number, field: keyof TenantAvailability, value: string) => {
    setAvailabilities(availabilities.map((avail, i) =>
      i === index ? { ...avail, [field]: value } : avail
    ))
  }

  const validateAvailability = (avail: TenantAvailability): string | null => {
    if (!avail.date || !avail.startTime || !avail.endTime) {
      return "Tous les champs sont requis"
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const availDate = new Date(avail.date)

    if (availDate < today) {
      return "La date ne peut pas être dans le passé"
    }

    if (avail.startTime >= avail.endTime) {
      return "L'heure de fin doit être après l'heure de début"
    }

    return null
  }

  const handleSubmit = async () => {
    setError(null)

    // Validate all availabilities
    const validAvailabilities = availabilities.filter(avail =>
      avail.date && avail.startTime && avail.endTime
    )

    if (validAvailabilities.length === 0) {
      setError("Veuillez renseigner au moins une disponibilité")
      return
    }

    // Validate each availability
    for (const avail of validAvailabilities) {
      const error = validateAvailability(avail)
      if (error) {
        setError(error)
        return
      }
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/intervention/${interventionId}/tenant-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantAvailabilities: validAvailabilities
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Error saving tenant availabilities:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  const getProviderAvailabilitiesForDate = (date: string) => {
    return providerAvailabilities.filter(avail => avail.date === date)
  }

  const hasConflictWithProvider = (tenantAvail: TenantAvailability): boolean => {
    if (!tenantAvail.date || !tenantAvail.startTime || !tenantAvail.endTime) return false

    const providerAvailsForDate = getProviderAvailabilitiesForDate(tenantAvail.date)

    return providerAvailsForDate.some(providerAvail => {
      const tenantStart = timeToMinutes(tenantAvail.startTime)
      const tenantEnd = timeToMinutes(tenantAvail.endTime)
      const providerStart = timeToMinutes(providerAvail.start_time)
      const providerEnd = timeToMinutes(providerAvail.end_time)

      // Check for overlap
      return tenantStart < providerEnd && providerStart < tenantEnd
    })
  }

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  if (loadingExisting) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Chargement...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Disponibilités enregistrées avec succès !
          </h3>
          <p className="text-slate-600 mb-4">
            Le matching automatique avec le prestataire a été lancé. Vous serez notifié du résultat.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Renseignez vos disponibilités
        </CardTitle>
        <p className="text-sm text-slate-600">
          Indiquez vos créneaux de disponibilité pour planifier l'intervention.
          Le système recherchera automatiquement les créneaux compatibles avec le prestataire.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Affichage des disponibilités prestataire pour référence */}
        {providerAvailabilities.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Disponibilités du prestataire
            </h4>
            <div className="space-y-2">
              {providerAvailabilities.map((avail, index) => (
                <div key={index} className="text-sm text-blue-800">
                  <strong>{new Date(avail.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}</strong> de {avail.start_time} à {avail.end_time}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Liste des disponibilités */}
        <div className="space-y-4">
          {availabilities.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-lg">
              <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Aucune disponibilité renseignée</p>
              <p className="text-slate-500 text-xs mt-1">
                Cliquez sur "Ajouter une disponibilité" pour commencer
              </p>
            </div>
          ) : (
            availabilities.map((avail, index) => {
              const hasConflict = hasConflictWithProvider(avail)
              const isValid = avail.date && avail.startTime && avail.endTime && !validateAvailability(avail)

              return (
                <div key={index} className={`border rounded-lg p-4 ${
                  hasConflict ? 'bg-green-50 border-green-200' :
                  isValid ? 'bg-slate-50 border-slate-200' : 'bg-white border-gray-200'
                }`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Date</Label>
                      <Input
                        type="date"
                        value={avail.date}
                        onChange={(e) => updateAvailability(index, 'date', e.target.value)}
                        className="mt-1"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Heure début</Label>
                      <Input
                        type="time"
                        value={avail.startTime}
                        onChange={(e) => updateAvailability(index, 'startTime', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-700">Heure fin</Label>
                      <Input
                        type="time"
                        value={avail.endTime}
                        onChange={(e) => updateAvailability(index, 'endTime', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      {hasConflict && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Compatible
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAvailability(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {avail.date && avail.startTime && avail.endTime && validateAvailability(avail) && (
                    <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {validateAvailability(avail)}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Bouton ajouter */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={addAvailability}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une disponibilité
          </Button>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info importante */}
        {availabilities.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Planification automatique</p>
                <p className="text-sm text-amber-700 mt-1">
                  Une fois vos disponibilités enregistrées, le système calculera automatiquement
                  les créneaux compatibles avec le prestataire et planifiera l'intervention.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            disabled={isLoading || availabilities.length === 0}
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer mes disponibilités
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
