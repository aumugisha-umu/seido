import { useState, useEffect, useCallback } from 'react'

export interface UserAvailability {
  id?: string
  date: string
  startTime: string
  endTime: string
}

export interface ParticipantAvailability {
  user: {
    user_id: string
    name: string
    role: string
    provider_category?: string
    total_slots: number
    date_range: { start: string | null; end: string | null }
  }
  availabilities: Array<{
    id: string
    date: string
    start_time: string
    end_time: string
    created_at: string
    updated_at: string
  }>
}

export interface MatchedSlot {
  date: string
  start_time: string
  end_time: string
  participant_user_ids: string[]
  participant_names: string[]
  match_score: number
  overlap_duration: number
}

export interface PartialMatch {
  date: string
  start_time: string
  end_time: string
  available_users: Array<{
    user_id: string
    name: string
    role: string
  }>
  missing_users: Array<{
    user_id: string
    name: string
    role: string
  }>
  match_score: number
}

export interface MatchingResult {
  perfectMatches: MatchedSlot[]
  partialMatches: PartialMatch[]
  suggestions: Array<{
    date: string
    reason: string
    alternatives: MatchedSlot[]
  }>
  conflicts: Array<{
    user_id: string
    user_name: string
    conflicting_slots: Array<{
      date: string
      slots: Array<{ start_time: string; end_time: string }>
    }>
  }>
  statistics: {
    total_users: number
    users_with_availabilities: number
    total_availability_slots: number
    best_match_score: number
  }
}

export interface AvailabilityData {
  intervention: {
    id: string
    title: string
    status: string
    scheduled_date?: string
  }
  userAvailabilities: UserAvailability[]
  allParticipantAvailabilities: ParticipantAvailability[]
  timeSlots: Array<{
    id: string
    slot_date: string
    start_time: string
    end_time: string
    is_selected: boolean
  }>
  matches: MatchedSlot[]
  statistics: {
    total_participants: number
    participants_with_availabilities: number
    total_availability_slots: number
    total_time_slots: number
    total_matches: number
    best_match_score: number
    intervention_status: string
    is_scheduled: boolean
  }
  recommendations: {
    shouldRunMatching: boolean
    canSelectSlot: boolean
    nextAction: string
  }
}

export const useAvailabilityManagement = (interventionId: string) => {
  // État des données
  const [data, setData] = useState<AvailabilityData | null>(null)
  const [matchingResult, setMatchingResult] = useState<MatchingResult | null>(null)
  const [userAvailabilities, setUserAvailabilities] = useState<UserAvailability[]>([])

  // État des interfaces
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isMatching, setIsMatching] = useState(false)
  const [isSelectingSlot, setIsSelectingSlot] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // État des modales
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false)
  const [showMatchingResults, setShowMatchingResults] = useState(false)
  const [showSlotSelector, setShowSlotSelector] = useState(false)

  // Fonction pour charger toutes les données
  const loadAvailabilities = useCallback(async () => {
    if (!interventionId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/intervention/${interventionId}/availabilities`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du chargement des disponibilités')
      }

      setData(result)
      setUserAvailabilities(result.userAvailabilities.map((avail: any) => ({
        id: avail.id,
        date: avail.date,
        startTime: avail.start_time ? avail.start_time.substring(0, 5) : avail.start_time, // Normalize HH:MM:SS → HH:MM
        endTime: avail.end_time ? avail.end_time.substring(0, 5) : avail.end_time       // Normalize HH:MM:SS → HH:MM
      })))

    } catch (err) {
      console.error('Error loading availabilities:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [interventionId])

  // Fonction pour sauvegarder les disponibilités utilisateur
  const saveUserAvailabilities = useCallback(async (availabilities: UserAvailability[]) => {
    if (!interventionId) return false

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(`/api/intervention/${interventionId}/user-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          availabilities: availabilities.map(avail => ({
            date: avail.date,
            startTime: avail.startTime,
            endTime: avail.endTime
          }))
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde')
      }

      // Recharger les données pour avoir l'état à jour
      await loadAvailabilities()

      return true

    } catch (err) {
      console.error('Error saving availabilities:', err)
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [interventionId, loadAvailabilities])

  // Fonction pour lancer le matching
  const runMatching = useCallback(async () => {
    if (!interventionId) return false

    try {
      setIsMatching(true)
      setError(null)

      const response = await fetch(`/api/intervention/${interventionId}/match-availabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du matching')
      }

      setMatchingResult(result.result)
      setShowMatchingResults(true)

      // Recharger les données pour avoir les matches sauvegardés
      await loadAvailabilities()

      return true

    } catch (err) {
      console.error('Error running matching:', err)
      setError(err instanceof Error ? err.message : 'Erreur de matching')
      return false
    } finally {
      setIsMatching(false)
    }
  }, [interventionId, loadAvailabilities])

  // Fonction pour sélectionner un créneau final
  const selectSlot = useCallback(async (
    selectedSlot: { date: string; startTime: string; endTime: string },
    comment?: string
  ) => {
    if (!interventionId) return false

    try {
      setIsSelectingSlot(true)
      setError(null)

      const response = await fetch(`/api/intervention/${interventionId}/select-slot`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedSlot,
          comment
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la sélection du créneau')
      }

      // Fermer les modales
      setShowSlotSelector(false)
      setShowMatchingResults(false)

      // Recharger les données pour voir le statut planifié
      await loadAvailabilities()

      return true

    } catch (err) {
      console.error('Error selecting slot:', err)
      setError(err instanceof Error ? err.message : 'Erreur de sélection')
      return false
    } finally {
      setIsSelectingSlot(false)
    }
  }, [interventionId, loadAvailabilities])

  // Fonctions utilitaires pour les disponibilités
  const addAvailability = useCallback(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const newAvailability: UserAvailability = {
      date: tomorrow.toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00'
    }

    setUserAvailabilities(prev => [...prev, newAvailability])
  }, [])

  const updateAvailability = useCallback((index: number, field: keyof UserAvailability, value: string) => {
    setUserAvailabilities(prev => prev.map((avail, i) =>
      i === index ? { ...avail, [field]: value } : avail
    ))
  }, [])

  const removeAvailability = useCallback((index: number) => {
    setUserAvailabilities(prev => prev.filter((_, i) => i !== index))
  }, [])

  const resetAvailabilities = useCallback(() => {
    if (data) {
      setUserAvailabilities(data.userAvailabilities.map(avail => ({
        id: avail.id,
        date: avail.date,
        startTime: avail.startTime ? avail.startTime.substring(0, 5) : avail.startTime, // Normalize in case data contains HH:MM:SS
        endTime: avail.endTime ? avail.endTime.substring(0, 5) : avail.endTime
      })))
    }
  }, [data])

  // Fonctions de contrôle des modales
  const openAvailabilityEditor = useCallback(() => {
    setShowAvailabilityEditor(true)
  }, [])

  const closeAvailabilityEditor = useCallback(() => {
    setShowAvailabilityEditor(false)
    resetAvailabilities()
  }, [resetAvailabilities])

  const openSlotSelector = useCallback(() => {
    setShowSlotSelector(true)
  }, [])

  const closeSlotSelector = useCallback(() => {
    setShowSlotSelector(false)
  }, [])

  const closeMatchingResults = useCallback(() => {
    setShowMatchingResults(false)
  }, [])

  // Validation
  const isAvailabilityValid = useCallback((availability: UserAvailability): boolean => {
    if (!availability.date || !availability.startTime || !availability.endTime) {
      return false
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const availDate = new Date(availability.date)

    if (availDate < today) {
      return false
    }

    const [startHour, startMin] = availability.startTime.split(':').map(Number)
    const [endHour, endMin] = availability.endTime.split(':').map(Number)

    return startHour < endHour || (startHour === endHour && startMin < endMin)
  }, [])

  const areAvailabilitiesValid = useCallback((): boolean => {
    return userAvailabilities.length > 0 && userAvailabilities.every(isAvailabilityValid)
  }, [userAvailabilities, isAvailabilityValid])

  // Charger les données au montage
  useEffect(() => {
    loadAvailabilities()
  }, [loadAvailabilities])

  return {
    // Données
    data,
    matchingResult,
    userAvailabilities,

    // États
    isLoading,
    isSaving,
    isMatching,
    isSelectingSlot,
    error,

    // États des modales
    showAvailabilityEditor,
    showMatchingResults,
    showSlotSelector,

    // Actions principales
    loadAvailabilities,
    saveUserAvailabilities,
    runMatching,
    selectSlot,

    // Gestion des disponibilités
    addAvailability,
    updateAvailability,
    removeAvailability,
    resetAvailabilities,

    // Contrôle des modales
    openAvailabilityEditor,
    closeAvailabilityEditor,
    openSlotSelector,
    closeSlotSelector,
    closeMatchingResults,

    // Validation
    isAvailabilityValid,
    areAvailabilitiesValid,

    // État calculé
    hasAvailabilities: userAvailabilities.length > 0,
    canRunMatching: data?.recommendations.shouldRunMatching || false,
    canSelectSlot: data?.recommendations.canSelectSlot || false,
    isScheduled: data?.statistics.is_scheduled || false,

    // Nettoyage erreur
    clearError: () => setError(null)
  }
}