"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  MessageSquare
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

interface Intervention {
  id: string
  title: string
  description: string
  urgency: string
  quote_deadline?: string
}

interface ExistingQuote {
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

  // Optional callbacks for external control (used in modal)
  onSubmitReady?: (submitFn: () => void) => void
  onValidationChange?: (isValid: boolean) => void
  onLoadingChange?: (isLoading: boolean) => void
}

interface FormData {
  laborCost: string
  materialsCost: string
  workDetails: string
  estimatedDurationHours: string
  attachments: File[]
  providerAvailabilities: Array<{
    date: string
    startTime: string
    endTime?: string
    isFlexible: boolean // Toggle individuel par disponibilité
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
  onSubmitReady,
  onValidationChange,
  onLoadingChange
}: QuoteSubmissionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldValidations, setFieldValidations] = useState<Record<string, FieldValidation>>({})
  const quoteToast = useQuoteToast()

  const [formData, setFormData] = useState<FormData>({
    laborCost: existingQuote?.laborCost?.toString() || '',
    materialsCost: existingQuote?.materialsCost?.toString() || '0',
    workDetails: existingQuote?.workDetails || '',
    estimatedDurationHours: existingQuote?.estimatedDurationHours?.toString() || '1',
    attachments: existingQuote?.attachments || [],
    providerAvailabilities: existingQuote?.providerAvailabilities?.map(avail => ({
      ...avail,
      isFlexible: avail.isFlexible ?? false
    })) || []
  })

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
        providerAvailabilities: existingQuote.providerAvailabilities?.map(avail => ({
          ...avail,
          isFlexible: avail.isFlexible ?? false
        })) || []
      })
    }
  }, [existingQuote])

  // Marquer la quote_request comme consultée lors du chargement du formulaire
  useEffect(() => {
    if (quoteRequest && quoteRequest.status === 'sent') {
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
  }, [quoteRequest])

  // Expose submit handler to parent (for modal footer)
  // We create a wrapper that will be called by the parent
  const submitWrapper = useCallback(() => {
    // Trigger form validation and submission
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)
    setError(null)

    // Call the async submit logic
    ;(async () => {
      try {
        const attachmentUrls: string[] = []

        const response = await fetch('/api/intervention-quote-submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            interventionId: intervention.id,
            laborCost: parseFloat(formData.laborCost),
            materialsCost: 0,
            estimatedDurationHours: parseFloat(formData.estimatedDurationHours),
            description: formData.workDetails.trim(),
            providerAvailabilities: formData.providerAvailabilities
              .filter(avail => avail.date && avail.startTime)
              .map(avail => ({
                date: avail.date,
                startTime: avail.startTime,
                endTime: avail.isFlexible
                  ? avail.endTime || null
                  : calculateEndTime(avail.startTime),
                isFlexible: avail.isFlexible
              }))
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erreur lors de la soumission du devis')
        }

        quoteToast.quoteSubmitted(calculateTotal(), intervention.title)
        onSuccess()

      } catch (error) {
        logger.error('Error submitting quote:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        setError(errorMessage)
        quoteToast.quoteError(errorMessage, 'la soumission du devis')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [formData, intervention.id, intervention.title, onSuccess])

  // Use refs to track previous values and avoid calling callbacks during render
  const prevSubmitReadyRef = useRef<typeof onSubmitReady>(null)
  const prevValidationChangeRef = useRef<typeof onValidationChange>(null)
  const prevLoadingChangeRef = useRef<typeof onLoadingChange>(null)

  // Expose submit handler to parent (deferred to avoid render-time setState)
  useEffect(() => {
    // Only call if callback changed or on first mount
    if (onSubmitReady && onSubmitReady !== prevSubmitReadyRef.current) {
      prevSubmitReadyRef.current = onSubmitReady
      // Defer to next tick to avoid setState during render
      const timeoutId = setTimeout(() => {
        onSubmitReady(submitWrapper)
      }, 0)
      return () => clearTimeout(timeoutId)
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
      endTime: '',
      isFlexible: false // Par défaut en mode horaire précis
    }
    setFormData(prev => ({
      ...prev,
      providerAvailabilities: [...prev.providerAvailabilities, newAvailability]
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

  // Calcule l'heure de fin basée sur l'heure de début et la durée estimée
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
          laborCost: parseFloat(formData.laborCost),
          materialsCost: 0, // Pas de séparation matériaux, tout est dans laborCost
          estimatedDurationHours: parseFloat(formData.estimatedDurationHours),
          description: formData.workDetails.trim(),
          providerAvailabilities: formData.providerAvailabilities
            .filter(avail => avail.date && avail.startTime) // Date et heure de début requis
            .map(avail => ({
              date: avail.date,
              startTime: avail.startTime,
              endTime: avail.isFlexible
                ? avail.endTime || null // Heure de fin manuelle en mode flexible
                : calculateEndTime(avail.startTime), // Calcul auto en mode précis
              isFlexible: avail.isFlexible
            }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la soumission du devis')
      }

      // Toast de succès selon Design System
      quoteToast.quoteSubmitted(calculateTotal(), intervention.title)

      // Appel direct du callback de succès
      onSuccess()

    } catch (error) {
      logger.error('Error submitting quote:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      setError(errorMessage)

      // Toast d'erreur selon Design System
      quoteToast.quoteError(errorMessage, 'la soumission du devis')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Layout principal */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Card unifiée - Détails du devis */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-sky-600" />
              </div>
              Détails de votre devis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Durée et Coût sur la même ligne */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Durée estimée - EN PREMIER */}
              <div className="space-y-2">
                <Label htmlFor="estimatedDurationHours" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Durée estimée (heures) *
                </Label>
                <Input
                  id="estimatedDurationHours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="168"
                  value={formData.estimatedDurationHours}
                  onChange={(e) => handleInputChange('estimatedDurationHours', e.target.value)}
                  placeholder="1"
                  required
                  className={`h-11 ${getInputClasses('estimatedDurationHours')}`}
                />
                {renderFieldFeedback('estimatedDurationHours')}
              </div>

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
                <p className="text-sm text-slate-500 mt-1">
                  Décrivez précisément les travaux à effectuer pour établir votre devis
                </p>
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

        {/* Section Disponibilités Prestataire */}
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
                <div className="space-y-3">
                  {formData.providerAvailabilities.map((avail, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      {/* Toggle individuel */}
                      <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                        <Label className="text-sm font-medium text-slate-700">Type de disponibilité</Label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateAvailability(index, 'isFlexible', false)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              !avail.isFlexible
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Clock className="w-3 h-3 inline mr-1" />
                            Horaire précis
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAvailability(index, 'isFlexible', true)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              avail.isFlexible
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Créneau flexible
                          </button>
                        </div>
                      </div>

                      {/* Champs de saisie */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="md:col-span-1">
                          <Label className="text-sm font-medium text-slate-700">Date</Label>
                          <Input
                            type="date"
                            value={avail.date}
                            onChange={(e) => updateAvailability(index, 'date', e.target.value)}
                            className="mt-1"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label className="text-sm font-medium text-slate-700">Heure début</Label>
                          <Input
                            type="time"
                            value={avail.startTime}
                            onChange={(e) => updateAvailability(index, 'startTime', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="md:col-span-1">
                          {avail.isFlexible ? (
                            <>
                              <Label className="text-sm font-medium text-slate-700">Heure fin</Label>
                              <Input
                                type="time"
                                value={avail.endTime || ''}
                                onChange={(e) => updateAvailability(index, 'endTime', e.target.value)}
                                className="mt-1"
                              />
                            </>
                          ) : (
                            <>
                              <Label className="text-sm font-medium text-slate-700">Fin estimée</Label>
                              <div className="mt-1 p-2 text-sm text-slate-600 flex items-center gap-1 min-h-[40px] bg-white rounded border border-slate-200">
                                <Clock className="h-3 w-3" />
                                {avail.startTime && formData.estimatedDurationHours ? calculateEndTime(avail.startTime) : '--:--'}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="md:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAvailability(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
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
                  className={`h-12 px-8 font-semibold ${
                    isFormValid()
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
    </div>
  )
}

