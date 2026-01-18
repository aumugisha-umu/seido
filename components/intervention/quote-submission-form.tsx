"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Upload,
  Euro,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Download,
  Wrench,
  MessageSquare,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useQuoteToast } from "@/hooks/use-quote-toast"
import { logger, logError } from '@/lib/logger'
import {
  getInterventionLocationText,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"
import { FileUploader } from "@/components/ui/file-uploader"
import { TimeSlotCard } from "@/components/interventions/shared/atoms/time-slot-card"
import { RejectSlotModal } from "./modals/reject-slot-modal"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  acceptTimeSlotAction,
  rejectTimeSlotAction,
  withdrawResponseAction
} from '@/app/actions/intervention-actions'
import { TimePicker24h } from "@/components/ui/time-picker-24h"
import { DatePicker } from "@/components/ui/date-picker"
import type { Database } from '@/lib/database.types'

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
  responses?: TimeSlotResponse[]
}

interface Intervention {
  id: string
  title: string
  description: string
  urgency: string
  quote_deadline?: string
  time_slots?: TimeSlot[]
  scheduling_type?: 'flexible' | 'fixed' | 'slots'
}

interface ExistingQuote {
  id?: string
  laborCost?: number
  materialsCost?: number
  workDetails?: string
  estimatedDurationHours?: number
  attachments?: File[]
  providerAvailabilities?: Array<{
    date: string
    startTime: string
    endTime?: string
    isFlexible?: boolean
  }>
}

interface QuoteRequest {
  id: string
  status: string
  individual_message?: string
  deadline?: string
  sent_at: string
}

interface QuoteSubmissionFormProps {
  intervention: Intervention
  existingQuote?: ExistingQuote
  quoteRequest?: QuoteRequest
  onSuccess: () => void
  currentUserId?: string // Needed for time slot responses

  // Optional callbacks for external control (used in modal)
  onSubmitReady?: (submitFn: () => void) => void
  onValidationChange?: (isValid: boolean) => void
  onLoadingChange?: (isLoading: boolean) => void

  // Display options
  hideEstimationSection?: boolean // Hide estimation fields (for availability-only mode)
}

interface FormData {
  laborCost: string
  materialsCost: string
  workDetails: string
  estimatedDurationHours: string
  attachments: File[]
  globalIsFlexible: boolean // Toggle global pour tous les créneaux
  providerAvailabilities: Array<{
    date: string
    startTime: string
    endTime?: string
  }>
}

interface FieldValidation {
  isValid: boolean
  error?: string
}

export function QuoteSubmissionForm({
  intervention,
  existingQuote,
  quoteRequest,
  onSuccess,
  currentUserId,
  onSubmitReady,
  onValidationChange,
  onLoadingChange,
  hideEstimationSection = false
}: QuoteSubmissionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldValidations, setFieldValidations] = useState<Record<string, FieldValidation>>({})
  const quoteToast = useQuoteToast()

  // States for time slot management
  const [acceptingSlotId, setAcceptingSlotId] = useState<string | null>(null)
  const [withdrawingSlotId, setWithdrawingSlotId] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [slotToReject, setSlotToReject] = useState<TimeSlot | null>(null)

  // Check if intervention has MANAGER-proposed time slots (status = 'requested')
  const hasManagerProposedSlots = useMemo(() => {
    return intervention.time_slots
      && intervention.time_slots.length > 0
      && intervention.time_slots.some(slot => slot.status === 'requested')
  }, [intervention.time_slots])

  // Check if intervention has PROVIDER-created time slots (status = 'pending')
  const hasProviderPendingSlots = useMemo(() => {
    return intervention.time_slots
      && intervention.time_slots.length > 0
      && intervention.time_slots.some(slot => slot.status === 'pending')
  }, [intervention.time_slots])

  // Group slots by date - ONLY for manager-proposed slots ('requested')
  const groupedSlots = useMemo(() => {
    if (!hasManagerProposedSlots || !intervention.time_slots) return []

    const groups = intervention.time_slots
      .filter(slot => slot.status === 'requested')
      .reduce((acc, slot) => {
        const date = slot.slot_date
        const existing = acc.find(g => g.date === date)
        if (existing) {
          existing.slots.push(slot)
        } else {
          acc.push({ date, slots: [slot] })
        }
        return acc
      }, [] as Array<{ date: string; slots: TimeSlot[] }>)

    // Sort by date
    groups.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return groups
  }, [intervention.time_slots, hasManagerProposedSlots])

  const [formData, setFormData] = useState<FormData>({
    laborCost: existingQuote?.laborCost?.toString() || '',
    materialsCost: existingQuote?.materialsCost?.toString() || '0',
    workDetails: existingQuote?.workDetails || '',
    estimatedDurationHours: existingQuote?.estimatedDurationHours?.toString() || '1',
    attachments: existingQuote?.attachments || [],
    globalIsFlexible: false,
    providerAvailabilities: existingQuote?.providerAvailabilities?.map(avail => ({
      date: avail.date,
      startTime: avail.startTime,
      endTime: avail.endTime
    })) || []
  })

  // Ref for formData to avoid stale closures in submitWrapper
  const formDataRef = useRef(formData)
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // Mettre à jour le formulaire quand existingQuote change
  useEffect(() => {
    if (existingQuote) {
      logger.info('📝 [QuoteForm] Pré-remplissage avec devis existant:', existingQuote)
      setFormData({
        laborCost: existingQuote.laborCost?.toString() || '',
        materialsCost: existingQuote.materialsCost?.toString() || '0',
        workDetails: existingQuote.workDetails || '',
        estimatedDurationHours: existingQuote.estimatedDurationHours?.toString() || '1',
        attachments: existingQuote.attachments || [],
        globalIsFlexible: false,
        providerAvailabilities: existingQuote.providerAvailabilities?.map(avail => ({
          date: avail.date,
          startTime: avail.startTime,
          endTime: avail.endTime
        })) || []
      })
    }
  }, [existingQuote])

  // Pré-remplir formData avec les slots 'pending' créés par le prestataire
  useEffect(() => {
    if (hasProviderPendingSlots && intervention.time_slots && !existingQuote) {
      const pendingSlots = intervention.time_slots
        .filter(slot => slot.status === 'pending')
        .map(slot => ({
          date: slot.slot_date,
          startTime: slot.start_time?.substring(0, 5) || '',
          endTime: slot.end_time?.substring(0, 5) || ''
        }))

      if (pendingSlots.length > 0) {
        logger.info('📝 [QuoteForm] Pré-remplissage avec slots pending du prestataire:', pendingSlots)
        setFormData(prev => ({
          ...prev,
          providerAvailabilities: pendingSlots
        }))
      }
    }
  }, [hasProviderPendingSlots, intervention.time_slots, existingQuote])

  // Valider les champs au chargement initial
  useEffect(() => {
    const fieldsToValidate: (keyof FormData)[] = ['laborCost', 'workDetails']
    const initialValidations: Record<string, FieldValidation> = {}

    fieldsToValidate.forEach(field => {
      const value = formData[field].toString()
      initialValidations[field] = validateField(field, value)
    })

    setFieldValidations(initialValidations)
  }, []) // Seulement au mount

  // Marquer la quote_request comme consultée lors du chargement du formulaire
  // Ne pas faire ça si on est en mode édition (existingQuote.id existe)
  // car dans ce cas, quoteRequest.id est l'ID du devis, pas de la demande
  useEffect(() => {
    // Seulement pour les nouvelles demandes de devis (status 'pending'), pas pour l'édition
    if (quoteRequest && quoteRequest.status === 'pending' && !existingQuote?.id) {
      logger.info('👁️ [QuoteForm] Marquage de la demande comme consultée:', quoteRequest.id)

      // Marquer comme vue via l'API
      fetch(`/api/quote-requests/${quoteRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'view'
        })
      }).catch(error => {
        logger.warn('⚠️ [QuoteForm] Impossible de marquer la demande comme consultée:', error)
        // Ne pas bloquer l'utilisateur si cette action échoue
      })
    }
  }, [quoteRequest, existingQuote?.id])

  // Expose submit handler to parent (for modal footer)
  // We create a wrapper that will be called by the parent
  const submitWrapper = useCallback(() => {
    // Use the ref to get the latest data
    const currentFormData = formDataRef.current

    // Check if we have availabilities to submit
    const hasAvailabilities = currentFormData.providerAvailabilities.some(avail =>
      avail.date && avail.startTime
    )

    // Validation based on mode
    if (hideEstimationSection) {
      // Availability-only mode: must have at least one availability
      if (!hasAvailabilities) {
        setError("Veuillez renseigner au moins une disponibilité valide")
        return
      }
    } else {
      // Quote mode: must have quote fields
      if (!currentFormData.laborCost || parseFloat(currentFormData.laborCost) < 0) {
        setError("Le coût total est requis et doit être positif")
        return
      }

      if (!currentFormData.workDetails.trim()) {
        setError("La description des travaux est requise")
        return
      }
    }

    const isEditMode = !!existingQuote?.id

    setIsLoading(true)
    setError(null)

    logger.info('📝 [QuoteForm] submitWrapper called', {
      isEditMode,
      quoteId: existingQuote?.id,
      interventionId: intervention.id,
      hideEstimationSection,
      hasAvailabilities
    })

      // Call the async submit logic
      ; (async () => {
        try {
          // Scenario 1: Availability-only mode
          if (hideEstimationSection) {
            await submitAvailabilities(currentFormData)
            quoteToast.systemNotification('Disponibilités enregistrées', 'Vos disponibilités ont été enregistrées avec succès', 'info')
            onSuccess()
            return
          }

          // Scenario 2 & 3: Quote mode (with or without availabilities)
          await submitQuote(currentFormData, isEditMode)

          // If we have availabilities, submit them too
          if (hasAvailabilities) {
            await submitAvailabilities(currentFormData)
            // Success message for quote + availabilities
            if (isEditMode) {
              quoteToast.systemNotification('Devis et disponibilités mis à jour', 'Votre devis et vos disponibilités ont été mis à jour avec succès', 'info')
            } else {
              quoteToast.systemNotification('Devis et disponibilités enregistrés', `Votre devis de ${calculateTotal().toFixed(2)}€ et vos disponibilités ont été enregistrés avec succès`, 'info')
            }
          } else {
            // Success message for quote only
            if (isEditMode) {
              quoteToast.systemNotification('Devis modifié', `Votre devis de ${calculateTotal().toFixed(2)}€ a été mis à jour`, 'info')
            } else {
              quoteToast.quoteSubmitted(calculateTotal(), intervention.title)
            }
          }

          onSuccess()

        } catch (error) {
          logger.error('Error submitting:', error)
          const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
          setError(errorMessage)

          const errorAction = hideEstimationSection
            ? 'l\'enregistrement des disponibilités'
            : (isEditMode ? 'la modification du devis' : 'la soumission du devis')

          quoteToast.quoteError(errorMessage, errorAction)
        } finally {
          setIsLoading(false)
        }
      })()
  }, [intervention.id, intervention.title, onSuccess, existingQuote?.id, hideEstimationSection])

  // Helper function to submit quote
  const submitQuote = async (formData: typeof formDataRef.current, isEditMode: boolean) => {
    const response = await fetch('/api/intervention-quote-submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        quoteId: existingQuote?.id,
        laborCost: parseFloat(formData.laborCost),
        materialsCost: 0,
        estimatedDurationHours: parseFloat(formData.estimatedDurationHours),
        description: formData.workDetails.trim(),
        providerAvailabilities: [] // Don't send availabilities here anymore
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la soumission du devis')
    }

    logger.info('✅ Quote submitted successfully', { quoteId: result.quote?.id })
    return result
  }

  // Helper function to submit availabilities
  const submitAvailabilities = async (formData: typeof formDataRef.current) => {
    const validAvailabilities = formData.providerAvailabilities
      .filter(avail => avail.date && avail.startTime)
      .map(avail => ({
        date: avail.date,
        startTime: avail.startTime,
        endTime: formData.globalIsFlexible
          ? avail.endTime || null
          : calculateEndTime(avail.startTime),
        isFlexible: formData.globalIsFlexible
      }))

    if (validAvailabilities.length === 0) {
      throw new Error('Aucune disponibilité valide à enregistrer')
    }

    const response = await fetch('/api/intervention-availability-submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        providerAvailabilities: validAvailabilities
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la soumission des disponibilités')
    }

    logger.info('✅ Availabilities submitted successfully', { count: result.availabilities?.length })
    return result
  }

  // Use refs to track previous values and avoid calling callbacks during render
  const prevValidationChangeRef = useRef<typeof onValidationChange>(null)
  const prevLoadingChangeRef = useRef<typeof onLoadingChange>(null)

  // Expose submit handler to parent
  // Now that the modal uses useRef instead of useState, we can pass the function directly
  useEffect(() => {
    if (onSubmitReady) {
      onSubmitReady(submitWrapper)
    }
  }, [onSubmitReady, submitWrapper])

  // Notify parent of validation state changes (deferred)
  useEffect(() => {
    if (onValidationChange && onValidationChange !== prevValidationChangeRef.current) {
      prevValidationChangeRef.current = onValidationChange
      const timeoutId = setTimeout(() => {
        onValidationChange(isFormValid())
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [onValidationChange])

  // Also notify when form data changes (validation state might have changed)
  useEffect(() => {
    if (onValidationChange) {
      const timeoutId = setTimeout(() => {
        onValidationChange(isFormValid())
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [formData, onValidationChange])

  // Notify parent of loading state changes (deferred)
  useEffect(() => {
    if (onLoadingChange && onLoadingChange !== prevLoadingChangeRef.current) {
      prevLoadingChangeRef.current = onLoadingChange
      const timeoutId = setTimeout(() => {
        onLoadingChange(isLoading)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [onLoadingChange])

  // Also notify when loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      const timeoutId = setTimeout(() => {
        onLoadingChange(isLoading)
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [isLoading, onLoadingChange])

  // Validation individuelle des champs selon Design System
  const validateField = (field: keyof FormData, value: string): FieldValidation => {
    switch (field) {
      case 'laborCost':
        if (!value) return { isValid: false, error: 'Le coût total est requis' }
        if (parseFloat(value) < 0) return { isValid: false, error: 'Le coût doit être positif' }
        return { isValid: true }

      case 'workDetails':
        if (!value.trim()) return { isValid: false, error: 'La description des travaux est requise' }
        return { isValid: true }

      case 'estimatedDurationHours':
        if (!value) return { isValid: false, error: 'La durée estimée est requise' }
        const hours = parseFloat(value)
        if (isNaN(hours) || hours <= 0) return { isValid: false, error: 'La durée doit être un nombre positif' }
        if (hours > 168) return { isValid: false, error: 'La durée ne peut pas excéder 168 heures (1 semaine)' }
        return { isValid: true }

      default:
        return { isValid: true }
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Validation temps réel
    const validation = validateField(field, value)
    setFieldValidations(prev => ({ ...prev, [field]: validation }))

    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }))
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }))
  }

  // Gestion des disponibilités prestataire
  const addAvailability = () => {
    const newAvailability = {
      date: '',
      startTime: '',
      endTime: ''
    }
    setFormData(prev => ({
      ...prev,
      providerAvailabilities: [...prev.providerAvailabilities, newAvailability]
    }))
  }

  // Toggle global pour type de disponibilité
  const setGlobalFlexible = (isFlexible: boolean) => {
    setFormData(prev => ({
      ...prev,
      globalIsFlexible: isFlexible
    }))
  }

  const removeAvailability = (index: number) => {
    setFormData(prev => ({
      ...prev,
      providerAvailabilities: prev.providerAvailabilities.filter((_, i) => i !== index)
    }))
  }

  const updateAvailability = (index: number, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      providerAvailabilities: prev.providerAvailabilities.map((avail, i) =>
        i === index ? { ...avail, [field]: value } : avail
      )
    }))
  }

  const calculateTotal = () => {
    return parseFloat(formData.laborCost) || 0
  }

  // Calcule l'heure de fin basée sur l'heure de début et la durée estimée globale
  const calculateEndTime = (startTime: string): string => {
    if (!startTime || !formData.estimatedDurationHours) return ''

    const duration = parseFloat(formData.estimatedDurationHours)
    if (isNaN(duration) || duration <= 0) return ''

    // Parse l'heure de début
    const [hours, minutes] = startTime.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return ''

    // Crée un objet Date pour aujourd'hui avec l'heure de début
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    // Ajoute la durée en heures
    const endDate = new Date(startDate.getTime() + duration * 60 * 60 * 1000)

    // Retourne l'heure au format HH:MM
    return endDate.toTimeString().slice(0, 5)
  }

  // Helper pour les classes d'input selon validation (Design System)
  const getInputClasses = (field: keyof FormData) => {
    const validation = fieldValidations[field]
    if (!validation) return ""

    if (validation.isValid && formData[field]) {
      return "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500"
    } else if (!validation.isValid) {
      return "border-red-300 focus:border-red-500 focus:ring-red-500"
    }
    return ""
  }

  // Helper pour afficher le feedback visuel
  const renderFieldFeedback = (field: keyof FormData) => {
    const validation = fieldValidations[field]
    if (!validation) return null

    if (validation.isValid && formData[field]) {
      return (
        <div className="text-sm text-emerald-600 mt-1 flex items-center">
          <CheckCircle className="w-4 h-4 mr-1" />
          Valide
        </div>
      )
    } else if (!validation.isValid) {
      return (
        <div className="text-sm text-red-600 mt-1 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {validation.error}
        </div>
      )
    }
    return null
  }

  // Validation globale pour état du bouton (Design System)
  const isFormValid = (): boolean => {
    // En mode "disponibilités uniquement", on vérifie seulement qu'il y a au moins une disponibilité valide
    if (hideEstimationSection) {
      return formData.providerAvailabilities.some(avail =>
        avail.date && avail.startTime && (formData.globalIsFlexible ? true : avail.endTime || formData.estimatedDurationHours)
      )
    }

    // En mode normal, on vérifie les champs requis
    const requiredFields: (keyof FormData)[] = ['laborCost', 'workDetails']

    // Vérifier que tous les champs requis sont valides
    return requiredFields.every(field => {
      const validation = fieldValidations[field]
      return validation && validation.isValid && formData[field]
    })
  }

  const validateForm = (): string | null => {
    if (!formData.laborCost || parseFloat(formData.laborCost) < 0) {
      return "Le coût total est requis et doit être positif"
    }

    if (!formData.workDetails.trim()) {
      return "La description des travaux est requise"
    }

    return null
  }

  // Time slot handlers
  const handleAcceptSlot = async (slotId: string) => {
    // Auth is handled server-side by acceptTimeSlotAction via getAuthenticatedUser()
    setAcceptingSlotId(slotId)
    try {
      const result = await acceptTimeSlotAction(slotId, intervention.id)
      if (result.success) {
        quoteToast.quoteSuccess('Créneau accepté avec succès')
        router.refresh()
      } else {
        quoteToast.quoteError(result.error || 'Erreur lors de l\'acceptation du créneau', 'l\'acceptation du créneau')
      }
    } catch (error) {
      logger.error('Error accepting slot:', error)
      quoteToast.quoteError('Erreur lors de l\'acceptation du créneau', 'l\'acceptation du créneau')
    } finally {
      setAcceptingSlotId(null)
    }
  }

  const handleOpenRejectModal = (slot: TimeSlot) => {
    setSlotToReject(slot)
    setRejectModalOpen(true)
  }

  const handleRejectSlot = async (slotId: string, reason: string) => {
    try {
      const result = await rejectTimeSlotAction(slotId, intervention.id, reason)
      if (result.success) {
        quoteToast.quoteSuccess('Créneau rejeté')
        setRejectModalOpen(false)
        setSlotToReject(null)
        router.refresh()
      } else {
        quoteToast.quoteError(result.error || 'Erreur lors du rejet du créneau', 'le rejet du créneau')
      }
    } catch (error) {
      logger.error('Error rejecting slot:', error)
      quoteToast.quoteError('Erreur lors du rejet du créneau', 'le rejet du créneau')
    }
  }

  const handleWithdrawResponse = async (slotId: string) => {
    setWithdrawingSlotId(slotId)
    try {
      const result = await withdrawResponseAction(slotId, intervention.id)
      if (result.success) {
        quoteToast.quoteSuccess('Réponse retirée avec succès')
        router.refresh()
      } else {
        quoteToast.quoteError(result.error || 'Erreur lors du retrait de la réponse', 'le retrait de la réponse')
      }
    } catch (error) {
      logger.error('Error withdrawing response:', error)
      quoteToast.quoteError('Erreur lors du retrait de la réponse', 'le retrait de la réponse')
    } finally {
      setWithdrawingSlotId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // For now, we'll handle attachments as URLs (in a real app, you'd upload to cloud storage first)
      const attachmentUrls: string[] = []

      const response = await fetch('/api/intervention-quote-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interventionId: intervention.id,
          quoteId: existingQuote?.id, // Passer l'ID du devis si en mode édition
          laborCost: parseFloat(formData.laborCost),
          materialsCost: 0, // Pas de séparation matériaux, tout est dans laborCost
          estimatedDurationHours: parseFloat(formData.estimatedDurationHours),
          description: formData.workDetails.trim(),
          providerAvailabilities: formData.providerAvailabilities
            .filter(avail => avail.date && avail.startTime) // Date et heure de début requis
            .map(avail => ({
              date: avail.date,
              startTime: avail.startTime,
              endTime: formData.globalIsFlexible
                ? avail.endTime || null // Heure de fin manuelle en mode flexible
                : calculateEndTime(avail.startTime), // Calcul auto en mode précis
              isFlexible: formData.globalIsFlexible
            }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la soumission du devis')
      }

      // Toast de succès selon Design System
      if (existingQuote?.id) {
        quoteToast.systemNotification('Devis modifié', `Votre devis de ${calculateTotal().toFixed(2)}€ a été mis à jour`, 'info')
      } else {
        quoteToast.quoteSubmitted(calculateTotal(), intervention.title)
      }

      // Appel direct du callback de succès
      onSuccess()

    } catch (error) {
      logger.error('Error submitting quote:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setError(errorMessage)

      // Toast d'erreur selon Design System
      const errorAction = existingQuote?.id ? 'la modification du devis' : 'la soumission du devis'
      quoteToast.quoteError(errorMessage, errorAction)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Layout principal */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Card unifiée - Détails du devis */}
        {/* Estimation Section - Can be hidden for availability-only mode */}
        {!hideEstimationSection && (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-sky-600" />
                </div>
                Détails de votre estimation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Coût total */}
              <div className="space-y-2">
                <Label htmlFor="laborCost" className="text-slate-700 font-medium mb-2 flex items-center gap-2">
                  <Euro className="h-4 w-4" />
                  Coût total (€) *
                </Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.laborCost}
                  onChange={(e) => handleInputChange('laborCost', e.target.value)}
                  placeholder="0.00"
                  className={`h-11 ${getInputClasses('laborCost')}`}
                  required
                />
                {renderFieldFeedback('laborCost')}
              </div>

              {/* Description des travaux + Documents - Layout 50/50 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Description des travaux - 50% */}
                <div className="space-y-2">
                  <Label htmlFor="workDetails" className="text-slate-700 font-medium mb-2 block">
                    Détail des travaux *
                  </Label>
                  <Textarea
                    id="workDetails"
                    value={formData.workDetails}
                    onChange={(e) => handleInputChange('workDetails', e.target.value)}
                    placeholder="Description détaillée des étapes, méthodes et matériaux à utiliser..."
                    className={`resize-none min-h-[200px] ${getInputClasses('workDetails')}`}
                    required
                  />
                  {renderFieldFeedback('workDetails')}
                </div>

                {/* File Uploader - 50% */}
                <div>
                  <FileUploader
                    files={formData.attachments}
                    onFilesChange={(files) => setFormData(prev => ({ ...prev, attachments: files }))}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    maxSize={10}
                    label="Pièce(s) jointe(s)"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section modulaire : Horaires proposés (gestionnaire) OU Disponibilités manuelles (prestataire) */}
        {hasManagerProposedSlots ? (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                Horaires proposés
              </CardTitle>
              <p className="text-sm text-slate-600">
                Le gestionnaire a proposé des créneaux horaires. Acceptez ceux qui vous conviennent pour faciliter la planification.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedSlots.map(({ date, slots }) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    {format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {slots.map(slot => (
                      <TimeSlotCard
                        key={slot.id}
                        slot={slot}
                        currentUserId={currentUserId || ''}
                        userRole="prestataire"
                        onAccept={handleAcceptSlot}
                        onReject={handleOpenRejectModal}
                        onWithdraw={handleWithdrawResponse}
                        showActions={true}
                        compact={true}
                        accepting={acceptingSlotId}
                        withdrawing={withdrawingSlotId}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Message info */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <span className="font-medium">À propos des créneaux :</span> Vous pouvez accepter plusieurs créneaux.
                  Le gestionnaire sélectionnera le créneau définitif après validation de votre devis.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                Mes disponibilités
              </CardTitle>
              <p className="text-sm text-slate-600">
                Renseignez vos créneaux de disponibilité pour faciliter la planification de l'intervention
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.providerAvailabilities.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg">
                  <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 text-sm">Aucune disponibilité renseignée</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Ajoutez vos horaires pour faciliter la planification
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Carte de Contrôle Global */}
                  <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardContent className="pt-4 space-y-4">
                      {/* Toggle global */}
                      <div>
                        <Label className="text-sm font-semibold text-slate-900 mb-3 block">
                          Type de disponibilité pour tous les créneaux
                        </Label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setGlobalFlexible(false)}
                            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${!formData.globalIsFlexible
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                              }`}
                          >
                            <Clock className="w-4 h-4 inline mr-2" />
                            Horaire précis
                          </button>
                          <button
                            type="button"
                            onClick={() => setGlobalFlexible(true)}
                            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${formData.globalIsFlexible
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                              }`}
                          >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Créneau flexible
                          </button>
                        </div>
                      </div>

                      {/* Champ durée conditionnel */}
                      {!formData.globalIsFlexible && (
                        <div className="bg-white border border-blue-200 rounded-lg p-4">
                          <Label htmlFor="global-duration" className="text-sm font-semibold text-slate-900 mb-1 block">
                            Durée estimée pour tous les créneaux
                          </Label>
                          <p className="text-xs text-slate-600 mb-3">
                            Cette durée sera appliquée automatiquement à tous vos créneaux en mode "Horaire précis"
                          </p>
                          <div className="flex items-center gap-2">
                            <Input
                              id="global-duration"
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="168"
                              value={formData.estimatedDurationHours}
                              onChange={(e) => handleInputChange('estimatedDurationHours', e.target.value)}
                              placeholder="1"
                              className="h-10 max-w-[120px]"
                            />
                            <span className="text-sm font-medium text-slate-700">heure(s)</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 2. Cartes de Créneaux Individuels */}
                  {formData.providerAvailabilities.map((avail, index) => (
                    <Card key={index} className="border-slate-200 shadow-sm">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-slate-700">
                            Créneau {index + 1}
                          </h3>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAvailability(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Date */}
                          <div>
                            <Label className="text-sm font-medium text-slate-700 mb-1 block">Date</Label>
                            <DatePicker
                              value={avail.date}
                              onChange={(value) => updateAvailability(index, 'date', value)}
                              minDate={new Date().toISOString().split('T')[0]}
                              className="w-full"
                            />
                          </div>

                          {/* Heure début */}
                          <div>
                            <Label className="text-sm font-medium text-slate-700 mb-1 block">Heure début</Label>
                            <TimePicker24h
                              value={avail.startTime}
                              onChange={(value) => updateAvailability(index, 'startTime', value)}
                              className="h-10"
                            />
                          </div>

                          {/* Heure fin (conditionnel selon toggle global) */}
                          {formData.globalIsFlexible ? (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-1 block">Heure fin</Label>
                              <TimePicker24h
                                value={avail.endTime || ''}
                                onChange={(value) => updateAvailability(index, 'endTime', value)}
                                className="h-10"
                              />
                            </div>
                          ) : (
                            <div>
                              <Label className="text-sm font-medium text-slate-700 mb-1 block">Fin calculée</Label>
                              <div className="h-10 px-3 py-2 text-sm text-slate-600 bg-slate-50 rounded-md border border-slate-200 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                {avail.startTime ? calculateEndTime(avail.startTime) : '--:--'}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAvailability}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Ajouter une disponibilité
                </Button>
              </div>

              {formData.providerAvailabilities.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Information importante</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Ces disponibilités seront partagées avec le gestionnaire pour faciliter la planification de l'intervention une fois votre devis validé.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Only show footer if not controlled externally (no callbacks provided) */}
        {!onSubmitReady && (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="bg-white text-slate-700 border-slate-300 hover:bg-slate-50 h-12 px-6"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                  className={`h-12 px-8 font-semibold ${isFormValid()
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Envoi en cours...</span>
                    </div>
                  ) : (
                    <>
                      <Euro className="h-5 w-5 mr-2" />
                      {existingQuote && quoteRequest?.status !== 'pending' ? 'Confirmer la modification' : 'Soumettre le devis'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {/* Modal de rejet de créneau */}
      <RejectSlotModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false)
          setSlotToReject(null)
        }}
        slot={slotToReject}
        interventionId={intervention.id}
        onSuccess={() => {
          setRejectModalOpen(false)
          setSlotToReject(null)
          router.refresh()
        }}
      />
    </div>
  )
}
