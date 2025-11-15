/**
 * Hook démo pour gérer les demandes de devis d'intervention
 * Remplace les appels API par des requêtes au demo store
 */

'use client'

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDemoContext } from '@/lib/demo/demo-context'
import { logger } from '@/lib/logger'

interface Provider {
  id: string
  name: string
  email: string
  phone?: string
  provider_category?: string
}

interface IneligibleProvider {
  id: string
  reason: string
}

interface QuoteRequestModal {
  isOpen: boolean
  intervention: unknown | null
}

interface QuoteRequestData {
  providerIds: string[]
  selectedProviders: Provider[]
  providerId: string
  deadline: string
  additionalNotes: string
  individualMessages: Record<string, string>
}

interface SuccessModal {
  isOpen: boolean
  providerNames: string[]
  interventionTitle: string
}

/**
 * Hook démo pour gérer les demandes de devis d'intervention
 * @param teamIdProp - Team ID passé depuis le serveur (Server Props Pattern)
 */
export const useDemoInterventionQuoting = (teamIdProp?: string) => {
  const router = useRouter()
  const { store, getCurrentUser } = useDemoContext()
  const user = getCurrentUser()

  // Server Props Pattern: utiliser teamIdProp en priorité, fallback sur user?.team_id
  const teamId = teamIdProp || user?.team_id

  // État des modals
  const [quoteRequestModal, setQuoteRequestModal] = useState<QuoteRequestModal>({
    isOpen: false,
    intervention: null,
  })

  const [successModal, setSuccessModal] = useState<SuccessModal>({
    isOpen: false,
    providerNames: [],
    interventionTitle: "",
  })

  // État du formulaire
  const [formData, setFormData] = useState<QuoteRequestData>({
    providerIds: [],
    selectedProviders: [],
    providerId: "",
    deadline: "",
    additionalNotes: "",
    individualMessages: {},
  })

  // État de chargement et d'erreur
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // État des prestataires éligibles/inéligibles (calculé par fetchEligibleProviders)
  const [eligibleProviders, setEligibleProviders] = useState<Provider[]>([])
  const [ineligibleProviders, setIneligibleProviders] = useState<IneligibleProvider[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  // Récupérer tous les prestataires depuis le demo store
  const providers = useMemo(() => {
    if (!teamId) {
      logger.warn('🚨 [DEMO-PROVIDERS] No team_id available')
      return []
    }

    logger.info('🔍 [DEMO-PROVIDERS] Fetching providers from demo store for team:', teamId)

    const prestataires = store.query('users', {
      filters: {
        team_id: teamId,
        role: 'prestataire'
      },
      sort: { field: 'name', order: 'asc' }
    })

    logger.info('👥 [DEMO-PROVIDERS] Found providers:', prestataires.length, prestataires)

    return prestataires
  }, [store, teamId])

  /**
   * Récupérer les prestataires éligibles pour une intervention
   * Filtre les prestataires qui ont déjà une demande de devis pending/sent/accepted
   */
  const fetchEligibleProviders = useCallback(async (interventionId: string) => {
    if (!teamId) {
      logger.warn('🚨 [DEMO-ELIGIBLE-PROVIDERS] No team_id available')
      return
    }

    logger.info('🔍 [DEMO-ELIGIBLE-PROVIDERS] Fetching eligible providers for intervention:', interventionId)
    setProvidersLoading(true)

    try {
      // Simuler un délai réseau pour le réalisme
      await new Promise(resolve => setTimeout(resolve, 300))

      // Récupérer tous les prestataires
      const allProviders = store.query('users', {
        filters: {
          team_id: teamId,
          role: 'prestataire'
        },
        sort: { field: 'name', order: 'asc' }
      })

      // Récupérer les devis existants pour cette intervention
      const existingQuotes = store.query('intervention_quotes', {
        filters: { intervention_id: interventionId }
      })

      logger.info('📊 [DEMO-ELIGIBLE-PROVIDERS] Existing quotes:', existingQuotes.length)

      // Filtrer les prestataires inéligibles (avec quote pending/sent/accepted)
      const ineligibleData: IneligibleProvider[] = []
      const ineligibleProviderIds: string[] = []

      existingQuotes.forEach((quote: any) => {
        if (quote.status === 'pending' || quote.status === 'sent' || quote.status === 'accepted') {
          ineligibleProviderIds.push(quote.provider_id)
          const reason =
            quote.status === 'pending' ? 'Demande en attente' :
            quote.status === 'sent' ? 'Devis soumis en attente de validation' :
            'Devis approuvé'
          ineligibleData.push({ id: quote.provider_id, reason })
        }
      })

      const eligible = allProviders.filter((provider: any) =>
        !ineligibleProviderIds.includes(provider.id)
      )

      logger.info('✅ [DEMO-ELIGIBLE-PROVIDERS] Eligible providers:', {
        total: allProviders.length,
        eligible: eligible.length,
        ineligible: ineligibleProviderIds.length,
        ineligibleReasons: ineligibleData
      })

      setEligibleProviders(eligible)
      setIneligibleProviders(ineligibleData)
    } catch (err) {
      logger.error('❌ [DEMO-ELIGIBLE-PROVIDERS] Error:', err)
      setError('Erreur lors de la récupération des prestataires éligibles')
    } finally {
      setProvidersLoading(false)
    }
  }, [store, teamId])

  /**
   * Ouvrir la modal de demande de devis
   */
  const handleQuoteRequest = async (intervention: unknown) => {
    logger.info('🎯 [DEMO-QUOTE-REQUEST] Opening quote request modal for intervention:', intervention.id)

    setQuoteRequestModal({
      isOpen: true,
      intervention: intervention,
    })

    // Calculer une deadline par défaut (7 jours)
    const defaultDeadline = new Date()
    defaultDeadline.setDate(defaultDeadline.getDate() + 7)

    setFormData({
      providerIds: [],
      selectedProviders: [],
      providerId: "",
      deadline: defaultDeadline.toISOString().split('T')[0], // Format YYYY-MM-DD
      additionalNotes: "",
      individualMessages: {},
    })

    setError(null)

    // Récupérer les prestataires éligibles pour cette intervention
    await fetchEligibleProviders(intervention.id)
  }

  /**
   * Fermer la modal de demande de devis
   */
  const closeQuoteRequestModal = () => {
    setQuoteRequestModal({
      isOpen: false,
      intervention: null,
    })
    setFormData({
      providerIds: [],
      selectedProviders: [],
      providerId: "",
      deadline: "",
      additionalNotes: "",
      individualMessages: {},
    })
    setError(null)
  }

  /**
   * Mettre à jour les données du formulaire
   */
  const updateFormData = (field: keyof QuoteRequestData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  /**
   * Sélectionner un prestataire unique (pour compatibilité avec QuoteRequestModal)
   */
  const selectProvider = (providerId: string, providerName: string) => {
    const provider = eligibleProviders.find(p => p.id === providerId) || providers.find(p => p.id === providerId)
    if (!provider) return

    setFormData(prev => ({
      ...prev,
      providerId: providerId,
      providerIds: [providerId], // Synchroniser avec le système multi-prestataires
      selectedProviders: [provider],
      individualMessages: {
        [providerId]: prev.additionalNotes || ""
      }
    }))
  }

  /**
   * Ajouter/retirer un prestataire (pour sélection multiple)
   */
  const toggleProvider = (provider: Provider) => {
    setFormData(prev => {
      const isSelected = prev.providerIds.includes(provider.id)

      if (isSelected) {
        // Retirer le prestataire
        const newProviderIds = prev.providerIds.filter(id => id !== provider.id)
        const newSelectedProviders = prev.selectedProviders.filter(p => p.id !== provider.id)
        const newIndividualMessages = { ...prev.individualMessages }
        delete newIndividualMessages[provider.id]

        return {
          ...prev,
          providerIds: newProviderIds,
          selectedProviders: newSelectedProviders,
          providerId: newProviderIds[0] || "",
          individualMessages: newIndividualMessages
        }
      } else {
        // Ajouter le prestataire
        const newProviderIds = [...prev.providerIds, provider.id]
        const newSelectedProviders = [...prev.selectedProviders, provider]

        return {
          ...prev,
          providerIds: newProviderIds,
          selectedProviders: newSelectedProviders,
          providerId: newProviderIds[0],
          individualMessages: {
            ...prev.individualMessages,
            [provider.id]: prev.additionalNotes || ""
          }
        }
      }
    })
  }

  /**
   * Mettre à jour le message individuel d'un prestataire
   */
  const updateIndividualMessage = (providerId: string, message: string) => {
    setFormData(prev => ({
      ...prev,
      individualMessages: {
        ...prev.individualMessages,
        [providerId]: message
      }
    }))
  }

  /**
   * Soumettre la demande de devis (DEMO - simule l'API)
   */
  const submitQuoteRequest = async () => {
    if (!quoteRequestModal.intervention || formData.providerIds.length === 0) {
      setError("Veuillez sélectionner au moins un prestataire")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 800))

      // Calculer automatiquement la deadline : J+30 jours
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + 30)
      const autoDeadline = deadlineDate.toISOString().split('T')[0]

      logger.info('📤 [DEMO-QUOTE-REQUEST] Simulating quote request:', {
        interventionId: quoteRequestModal.intervention.id,
        providerIds: formData.providerIds,
        deadline: autoDeadline,
        additionalNotes: formData.additionalNotes,
        individualMessages: formData.individualMessages
      })

      // TODO: En mode démo, on pourrait créer des quotes fictifs dans le store
      // Pour l'instant on simule juste le succès
      // store.insert('intervention_quotes', { ... })

      logger.info('✅ [DEMO-QUOTE-REQUEST] Quote request successful (simulated)')

      // Fermer la modal de demande
      closeQuoteRequestModal()

      // Afficher la modal de succès
      setSuccessModal({
        isOpen: true,
        providerNames: formData.selectedProviders.map(p => p.name),
        interventionTitle: quoteRequestModal.intervention.title,
      })

      // Rafraîchir la page après un délai
      setTimeout(() => {
        router.refresh()
      }, 1500)

    } catch (error) {
      logger.error('❌ [DEMO-QUOTE-REQUEST] Error submitting quote request:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Fermer la modal de succès
   */
  const closeSuccessModal = () => {
    setSuccessModal({
      isOpen: false,
      providerNames: [],
      interventionTitle: "",
    })
  }

  return {
    // État des modals
    quoteRequestModal,
    successModal,

    // Données du formulaire
    formData,
    providers,
    eligibleProviders,
    ineligibleProviders,
    providersLoading,

    // États UI
    isLoading,
    error,

    // Actions
    handleQuoteRequest,
    closeQuoteRequestModal,
    updateFormData,
    selectProvider,
    toggleProvider,
    updateIndividualMessage,
    submitQuoteRequest,
    closeSuccessModal,
  }
}
