import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./use-auth"

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

export const useInterventionQuoting = () => {
  const router = useRouter()
  const { user } = useAuth()

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

  /**
   * Ouvrir la modal de demande de devis
   */
  const handleQuoteRequest = (intervention: any) => {
    console.log('🎯 [QUOTE-REQUEST] Opening quote request modal for intervention:', intervention.id)

    setQuoteRequestModal({
      isOpen: true,
      intervention,
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
    const provider = providers.find(p => p.id === providerId)
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
      console.log('📤 [QUOTE-REQUEST] Submitting quote request:', {
        interventionId: quoteRequestModal.intervention.id,
        providerIds: formData.providerIds,
        deadline: formData.deadline,
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
          deadline: formData.deadline || null,
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

      // Rafraîchir la page après un délai
      setTimeout(() => {
        router.refresh()
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