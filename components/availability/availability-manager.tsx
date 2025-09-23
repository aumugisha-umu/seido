"use client"

import { useState } from "react"
import { Calendar, Clock, Plus, Trash2, Users, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAvailabilityManagement, UserAvailability } from "@/hooks/use-availability-management"

interface AvailabilityManagerProps {
  interventionId: string
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
}

export function AvailabilityManager({ interventionId, userRole }: AvailabilityManagerProps) {
  const {
    data,
    userAvailabilities,
    isLoading,
    isSaving,
    isMatching,
    error,
    showAvailabilityEditor,
    saveUserAvailabilities,
    runMatching,
    addAvailability,
    updateAvailability,
    removeAvailability,
    openAvailabilityEditor,
    closeAvailabilityEditor,
    areAvailabilitiesValid,
    canRunMatching,
    isScheduled,
    clearError
  } = useAvailabilityManagement(interventionId)

  const [localAvailabilities, setLocalAvailabilities] = useState<UserAvailability[]>([])

  // Initialize local availabilities when editor opens
  const handleOpenEditor = () => {
    setLocalAvailabilities([...userAvailabilities])
    openAvailabilityEditor()
  }

  // Handle save with local state
  const handleSave = async () => {
    const success = await saveUserAvailabilities(localAvailabilities)
    if (success) {
      closeAvailabilityEditor()
    }
  }

  // Local availability management
  const handleAddLocal = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const newAvailability: UserAvailability = {
      date: tomorrow.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00'
    }

    setLocalAvailabilities(prev => [...prev, newAvailability])
  }

  const handleUpdateLocal = (index: number, field: keyof UserAvailability, value: string) => {
    setLocalAvailabilities(prev => prev.map((avail, i) =>
      i === index ? { ...avail, [field]: value } : avail
    ))
  }

  const handleRemoveLocal = (index: number) => {
    setLocalAvailabilities(prev => prev.filter((_, i) => i !== index))
  }

  const isLocalValid = (): boolean => {
    return localAvailabilities.length > 0 && localAvailabilities.every(avail => {
      if (!avail.date || !avail.startTime || !avail.endTime) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const availDate = new Date(avail.date)

      if (availDate < today) return false

      const [startHour, startMin] = avail.startTime.split(':').map(Number)
      const [endHour, endMin] = avail.endTime.split(':').map(Number)

      return startHour < endHour || (startHour === endHour && startMin < endMin)
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Chargement des disponibilités...</span>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossible de charger les données de l'intervention.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const getUserRoleLabel = (role: string) => {
    switch (role) {
      case 'locataire': return 'Locataire'
      case 'gestionnaire': return 'Gestionnaire'
      case 'prestataire': return 'Prestataire'
      default: return role
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'demande': return 'bg-yellow-100 text-yellow-800'
      case 'approuvee': return 'bg-green-100 text-green-800'
      case 'planification': return 'bg-blue-100 text-blue-800'
      case 'planifiee': return 'bg-purple-100 text-purple-800'
      case 'en_cours': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec informations intervention */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Gestion des Disponibilités</span>
            </CardTitle>
            <Badge className={getStatusBadgeColor(data.intervention.status)}>
              {data.intervention.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {data.statistics.participants_with_availabilities}/{data.statistics.total_participants} participants
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {data.statistics.total_availability_slots} créneaux saisis
              </span>
            </div>
            {data.statistics.best_match_score > 0 && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  Meilleur match: {data.statistics.best_match_score}%
                </span>
              </div>
            )}
          </div>

          {isScheduled && data.intervention.scheduled_date && (
            <Alert className="mt-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Intervention planifiée</strong> pour le{' '}
                {new Date(data.intervention.scheduled_date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="sm" onClick={clearError}>
              Fermer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Vos disponibilités */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Vos Disponibilités</CardTitle>
            {!isScheduled && (
              <Button onClick={handleOpenEditor} disabled={isSaving}>
                {userAvailabilities.length > 0 ? 'Modifier' : 'Ajouter des disponibilités'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {userAvailabilities.length > 0 ? (
            <div className="space-y-2">
              {userAvailabilities.map((avail, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">
                    {new Date(avail.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                  <span className="text-sm text-gray-600">
                    de {avail.startTime?.substring(0, 5) || avail.startTime} à {avail.endTime?.substring(0, 5) || avail.endTime}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune disponibilité saisie</p>
              <p className="text-sm">Cliquez sur "Ajouter des disponibilités" pour commencer</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions de planification (gestionnaire uniquement) */}
      {userRole === 'gestionnaire' && data.statistics.participants_with_availabilities >= 2 && !isScheduled && (
        <Card>
          <CardHeader>
            <CardTitle>Actions de Planification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canRunMatching && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-yellow-900">Matching Automatique</h4>
                  <p className="text-sm text-yellow-700">
                    Trouvez automatiquement les créneaux compatibles entre tous les participants
                  </p>
                </div>
                <Button onClick={runMatching} disabled={isMatching} className="bg-yellow-600 hover:bg-yellow-700">
                  {isMatching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Calcul en cours...
                    </>
                  ) : (
                    'Lancer le Matching'
                  )}
                </Button>
              </div>
            )}

            {data.statistics.total_matches > 0 && (
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-green-900">Créneaux Disponibles</h4>
                  <p className="text-sm text-green-700">
                    {data.statistics.total_matches} créneaux compatibles trouvés
                  </p>
                </div>
                <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
                  Voir les Créneaux
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disponibilités des autres participants */}
      {data.allParticipantAvailabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Disponibilités des Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.allParticipantAvailabilities.map((participant, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{participant.user.name}</span>
                      <Badge variant="outline">
                        {getUserRoleLabel(participant.user.role)}
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {participant.user.total_slots} créneaux
                    </span>
                  </div>
                  <div className="space-y-1">
                    {participant.availabilities.slice(0, 3).map((avail, availIndex) => (
                      <div key={availIndex} className="flex items-center space-x-2 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(avail.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                          {' '}de {avail.start_time?.substring(0, 5) || avail.start_time} à {avail.end_time?.substring(0, 5) || avail.end_time}
                        </span>
                      </div>
                    ))}
                    {participant.availabilities.length > 3 && (
                      <p className="text-xs text-gray-500">
                        ... et {participant.availabilities.length - 3} autres créneaux
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal d'édition des disponibilités */}
      <Dialog open={showAvailabilityEditor} onOpenChange={closeAvailabilityEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion de vos disponibilités</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {localAvailabilities.length > 0 ? (
              <div className="space-y-3">
                {localAvailabilities.map((avail, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={avail.date}
                        onChange={(e) => handleUpdateLocal(index, 'date', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Début</label>
                      <input
                        type="time"
                        value={avail.startTime}
                        onChange={(e) => handleUpdateLocal(index, 'startTime', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Fin</label>
                      <input
                        type="time"
                        value={avail.endTime}
                        onChange={(e) => handleUpdateLocal(index, 'endTime', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveLocal(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune disponibilité</p>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleAddLocal}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un créneau
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAvailabilityEditor}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isLocalValid() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}