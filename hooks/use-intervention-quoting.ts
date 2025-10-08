import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./use-auth"
import { toast } from "./use-toast"

interface Provider {
  id: string
  name: string
  email: string
  phone?: string
  provider_category?: string
}

interface QuoteRequestModal {
  isOpen: boolean
  intervention: any | null
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

interface UseInterventionQuotingOptions {
  onActionComplete?: () => void
}

export const useInterventionQuoting = (options?: UseInterventionQuotingOptions) => {
  const router = useRouter()
  const { user } = useAuth()
  const { onActionComplete } = options || {}

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
  const [providersLoading, setProvidersLoading] = useState(false)

  // Récupérer les prestataires disponibles
  useEffect(() => {
    const fetchProviders = async () => {
      if (!user?.team_id) {
        console.warn('🚨 [PROVIDERS] No team_id available, user:', user)
        return
      }

      console.log('🔍 [PROVIDERS] Fetching providers for team:', user.team_id)
      setProvidersLoading(true)
      try {
        const url = `/api/team-contacts?teamId=${user.team_id}&type=prestataire`
        console.log('🌐 [PROVIDERS] API URL:', url)
        
        const response = await fetch(url)
        console.log('📡 [PROVIDERS] Response status:', response.status, response.statusText)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 [PROVIDERS] API Response data:', data)
          console.log('👥 [PROVIDERS] Found providers:', data.contacts?.length || 0, data.contacts)
          setProviders(data.contacts || [])
        } else {
          console.error('❌ [PROVIDERS] API Error response:', await response.text())
        }
      } catch (err) {
        console.error('❌ [PROVIDERS] Fetch error:', err)
      } finally {
        setProvidersLoading(false)
      }
    }

    fetchProviders()
  }, [user?.team_id])

  // Récupérer les prestataires éligibles pour une intervention
  const fetchEligibleProviders = async (interventionId: string) => {
    if (!user?.team_id) {
      console.warn('🚨 [ELIGIBLE-PROVIDERS] No team_id available')
      return
    }

    console.log('🔍 [ELIGIBLE-PROVIDERS] Fetching eligible providers for intervention:', interventionId)
    setProvidersLoading(true)
    try {
      // D'abord récupérer tous les prestataires
      const allProvidersResponse = await fetch(`/api/team-contacts?teamId=${user.team_id}&type=prestataire`)
      if (!allProvidersResponse.ok) {
        throw new Error('Erreur lors de la récupération des prestataires')
      }

      const allProvidersData = await allProvidersResponse.json()
      const allProviders = allProvidersData.contacts || []

      // Ensuite récupérer les devis existants pour cette intervention
      const quotesResponse = await fetch(`/api/intervention/${interventionId}/quotes`)
      let existingQuotes = []

      if (quotesResponse.ok) {
        const quotesData = await quotesResponse.json()
        existingQuotes = quotesData.quotes || []
      }

      // Filtrer les prestataires éligibles (exclure ceux avec devis pending/approved)
      const ineligibleProviderIds = existingQuotes
        .filter(quote => quote.status === 'pending' || quote.status === 'approved')
        .map(quote => quote.provider_id)

      const eligible = allProviders.filter(provider =>
        !ineligibleProviderIds.includes(provider.id)
      )

      console.log('📊 [ELIGIBLE-PROVIDERS] Eligible providers:', {
        total: allProviders.length,
        eligible: eligible.length,
        ineligible: ineligibleProviderIds.length
      })

      setProviders(allProviders)
      setEligibleProviders(eligible)
    } catch (err) {
      console.error('❌ [ELIGIBLE-PROVIDERS] Error:', err)
      setError('Erreur lors de la récupération des prestataires éligibles')
    } finally {
      setProvidersLoading(false)
    }
  }

  /**
   * Ouvrir la modal de demande de devis
   */
  const handleQuoteRequest = async (intervention: any) => {
    console.log('🎯 [QUOTE-REQUEST] Opening quote request modal for intervention:', intervention.id)

    // Charger les détails complets de l'intervention depuis l'API
    let fullIntervention = intervention
    try {
      console.log('📡 [QUOTE-REQUEST] Fetching full intervention details...')
      const response = await fetch(`/api/intervention/${intervention.id}/quote-requests`)
      if (response.ok) {
        const data = await response.json()
        if (data.intervention) {
          fullIntervention = data.intervention
          console.log('✅ [QUOTE-REQUEST] Full intervention details loaded:', fullIntervention)
        }
      }
    } catch (err) {
      console.warn('⚠️ [QUOTE-REQUEST] Could not load full intervention details, using minimal data:', err)
    }

    setQuoteRequestModal({
      isOpen: true,
      intervention: fullIntervention,
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
      providerId: "", // ✅ Reset pour compatibilité avec QuoteRequestModal
      deadline: "",
      additionalNotes: "",
      individualMessages: {},
    })
    setError(null)
  }

  /**
   * Mettre à jour les données du formulaire
   * Accepte soit (field, value) soit un objet de mise à jour partielle
   */
  const updateFormData = (fieldOrUpdate: keyof QuoteRequestData | Partial<QuoteRequestData>, value?: string) => {
    setFormData(prev => {
      // Si le premier paramètre est un objet, on fait un merge
      if (typeof fieldOrUpdate === 'object') {
        return { ...prev, ...fieldOrUpdate }
      }
      // Sinon, syntaxe classique (field, value)
      return { ...prev, [fieldOrUpdate]: value }
    })
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

      console.log('📤 [QUOTE-REQUEST] Submitting quote request:', {
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

      console.log('✅ [QUOTE-REQUEST] Quote request successful:', result)

      // Fermer la modal de demande
      closeQuoteRequestModal()

      // Afficher la modal de succès
      setSuccessModal({
        isOpen: true,
        providerNames: formData.selectedProviders.map(p => p.name),
        interventionTitle: quoteRequestModal.intervention.title,
      })

      // Afficher un toast de succès
      const providerCount = formData.selectedProviders.length
      const providerText = providerCount === 1
        ? formData.selectedProviders[0].name
        : `${providerCount} prestataires`

      toast({
        title: "Demande de devis envoyée",
        description: `La demande a été envoyée avec succès à ${providerText}.`,
        variant: "default",
      })

      // Rafraîchir les données après un délai
      setTimeout(() => {
        if (onActionComplete) {
          onActionComplete()
        } else {
          router.refresh()
        }
      }, 1500)

    } catch (error) {
      console.error('❌ [QUOTE-REQUEST] Error submitting quote request:', error)
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