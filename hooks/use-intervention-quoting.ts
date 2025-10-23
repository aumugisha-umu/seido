import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./use-auth"
import { logger, logError } from '@/lib/logger'
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
  providerId: string // ✅ Ajout pour compatibilité avec QuoteRequestModal
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
 * Hook pour gérer les demandes de devis d'intervention
 * @param teamIdProp - Team ID passé depuis le serveur (Server Props Pattern)
 */
export const useInterventionQuoting = (teamIdProp?: string) => {
  const router = useRouter()
  const { user } = useAuth()

  // ✅ Server Props Pattern: utiliser teamIdProp en priorité, fallback sur user?.team_id
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
    providerId: "", // ✅ Initialisation pour compatibilité avec QuoteRequestModal
    deadline: "",
    additionalNotes: "",
    individualMessages: {},
  })

  // État de chargement et d'erreur
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // État des prestataires
  const [providers, setProviders] = useState<Provider[]>([])
  const [eligibleProviders, setEligibleProviders] = useState<Provider[]>([])
  const [ineligibleProviders, setIneligibleProviders] = useState<IneligibleProvider[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  // Récupérer les prestataires disponibles
  useEffect(() => {
    const fetchProviders = async () => {
      if (!teamId) {
        logger.warn('🚨 [PROVIDERS] No team_id available (teamIdProp:', teamIdProp, ', user?.team_id:', user?.team_id, ')')
        return
      }

      logger.info('🔍 [PROVIDERS] Fetching providers for team:', teamId)
      setProvidersLoading(true)
      try {
        const url = `/api/team-contacts?teamId=${teamId}&type=prestataire`
        logger.info('🌐 [PROVIDERS] API URL:', url)
        
        const response = await fetch(url)
        logger.info('📡 [PROVIDERS] Response status:', response.status, response.statusText)

        if (response.ok) {
          const data = await response.json()
          logger.info('📊 [PROVIDERS] API Response data:', data)
          logger.info('👥 [PROVIDERS] Found providers:', data.contacts?.length || 0, data.contacts)
          setProviders(data.contacts || [])
        } else {
          logger.error('❌ [PROVIDERS] API Error response:', await response.text())
        }
      } catch (err) {
        logger.error('❌ [PROVIDERS] Fetch error:', err)
      } finally {
        setProvidersLoading(false)
      }
    }

    fetchProviders()
  }, [teamId, teamIdProp, user?.team_id]) // ✅ Dépendances mises à jour

  // Récupérer les prestataires éligibles pour une intervention
  const fetchEligibleProviders = async (_interventionId: string) => {
    if (!teamId) {
      logger.warn('🚨 [ELIGIBLE-PROVIDERS] No team_id available')
      return
    }

    logger.info('🔍 [ELIGIBLE-PROVIDERS] Fetching eligible providers for intervention:', _interventionId)
    setProvidersLoading(true)
    try {
      // ⚡ OPTIMISATION: Récupérer prestataires et devis EN PARALLÈLE
      logger.info('🏃 [ELIGIBLE-PROVIDERS] Loading providers and quotes IN PARALLEL...')

      const [allProvidersResponse, quotesResponse] = await Promise.all([
        fetch(`/api/team-contacts?teamId=${user.team_id}&type=prestataire`),
        fetch(`/api/intervention/${_interventionId}/quotes`)
      ])

      if (!allProvidersResponse.ok) {
        throw new Error('Erreur lors de la récupération des prestataires')
      }

      const allProvidersData = await allProvidersResponse.json()
      const allProviders = allProvidersData.contacts || []

      let existingQuotes = []
      if (quotesResponse.ok) {
        const quotesData = await quotesResponse.json()
        existingQuotes = quotesData.quotes || []
      } else {
        const errorText = await quotesResponse.text()
        logger.error('Failed to fetch quotes:', { status: quotesResponse.status, error: errorText })
      }

      logger.info('✅ [ELIGIBLE-PROVIDERS] Parallel fetch complete')

      // Filtrer les prestataires éligibles (exclure ceux avec quote pending/sent/accepted)
      const ineligibleData: IneligibleProvider[] = []
      const ineligibleProviderIds: string[] = []

      existingQuotes.forEach(quote => {
        if (quote.status === 'pending' || quote.status === 'sent' || quote.status === 'accepted') {
          ineligibleProviderIds.push(quote.provider_id)
          const reason =
            quote.status === 'pending' ? 'Demande en attente' :
            quote.status === 'sent' ? 'Devis soumis en attente de validation' :
            'Devis approuvé'
          ineligibleData.push({ id: quote.provider_id, reason })
        }
      })

      const eligible = allProviders.filter(provider =>
        !ineligibleProviderIds.includes(provider.id)
      )

      logger.info('📊 [ELIGIBLE-PROVIDERS] Eligible providers:', {
        total: allProviders.length,
        eligible: eligible.length,
        ineligible: ineligibleProviderIds.length,
        ineligibleReasons: ineligibleData
      })

      setProviders(allProviders)
      setEligibleProviders(eligible)
      setIneligibleProviders(ineligibleData)
    } catch (err) {
      logger.error('❌ [ELIGIBLE-PROVIDERS] Error:', err)
      setError('Erreur lors de la récupération des prestataires éligibles')
    } finally {
      setProvidersLoading(false)
    }
  }

  /**
   * Ouvrir la modal de demande de devis
   */
  const handleQuoteRequest = async (_intervention: unknown) => {
    logger.info('🎯 [QUOTE-REQUEST] Opening quote request modal for intervention:', _intervention.id)

    setQuoteRequestModal({
      isOpen: true,
      intervention: _intervention,
    })

    // Calculer une deadline par défaut (7 jours)
    const defaultDeadline = new Date()
    defaultDeadline.setDate(defaultDeadline.getDate() + 7)

    setFormData({
      providerIds: [],
      selectedProviders: [],
      providerId: "", // ✅ Reset pour compatibilité avec QuoteRequestModal
      deadline: defaultDeadline.toISOString().split('T')[0], // Format YYYY-MM-DD
      additionalNotes: "",
      individualMessages: {},
    })

    setError(null)

    // Récupérer les prestataires éligibles pour cette intervention
    await fetchEligibleProviders(_intervention.id)
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
      providerId: "", // ✅ Reset pour compatibilité avec QuoteRequestModal
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
          providerId: newProviderIds[0] || "", // Synchroniser providerId avec le premier élément
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
          providerId: newProviderIds[0], // Synchroniser providerId avec le premier élément
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
   * Soumettre la demande de devis
   */
  const submitQuoteRequest = async () => {
    if (!quoteRequestModal.intervention || formData.providerIds.length === 0) {
      setError("Veuillez sélectionner au moins un prestataire")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Calculer automatiquement la deadline : J+30 jours
      const deadlineDate = new Date()
      deadlineDate.setDate(deadlineDate.getDate() + 30)
      const autoDeadline = deadlineDate.toISOString().split('T')[0] // Format YYYY-MM-DD

      logger.info('📤 [QUOTE-REQUEST] Submitting quote request:', {
        interventionId: quoteRequestModal.intervention.id,
        providerIds: formData.providerIds,
        deadline: autoDeadline,
        additionalNotes: formData.additionalNotes,
        individualMessages: formData.individualMessages
      })

      const response = await fetch('/api/intervention-quote-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interventionId: quoteRequestModal.intervention.id,
          providerIds: formData.providerIds,
          deadline: autoDeadline,
          additionalNotes: formData.additionalNotes || null,
          individualMessages: formData.individualMessages,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la demande de devis')
      }

      logger.info('✅ [QUOTE-REQUEST] Quote request successful:', result)

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
      logger.error('❌ [QUOTE-REQUEST] Error submitting quote request:', error)
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
    selectProvider, // ✅ Ajout de la fonction pour compatibilité avec QuoteRequestModal
    toggleProvider,
    updateIndividualMessage,
    submitQuoteRequest,
    closeSuccessModal,
  }
}
