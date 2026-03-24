"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  Euro,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useQuoteToast } from "@/hooks/use-quote-toast"
import { logger } from '@/lib/logger'
import { FileUploader } from "@/components/ui/file-uploader"

interface Intervention {
  id: string
  title: string
  description: string
  urgency: string
  quote_deadline?: string
  scheduling_type?: 'flexible' | 'fixed' | 'slots'
}

interface ExistingQuote {
  id?: string
  laborCost?: number
  materialsCost?: number
  workDetails?: string
  attachments?: File[]
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
  currentUserId?: string

  // Optional callbacks for external control (used in modal)
  onSubmitReady?: (submitFn: () => void) => void
  onValidationChange?: (isValid: boolean) => void
  onLoadingChange?: (isLoading: boolean) => void
}

interface FormData {
  laborCost: string
  materialsCost: string
  workDetails: string
  attachments: File[]
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
  onLoadingChange,
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
    attachments: existingQuote?.attachments || [],
  })

  // Ref for formData to avoid stale closures in submitWrapper
  const formDataRef = useRef(formData)
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // Mettre à jour le formulaire quand existingQuote change
  useEffect(() => {
    if (existingQuote) {
      logger.info('📝 [QuoteForm] Pré-remplissage avec estimation existante:', existingQuote)
      setFormData({
        laborCost: existingQuote.laborCost?.toString() || '',
        materialsCost: existingQuote.materialsCost?.toString() || '0',
        workDetails: existingQuote.workDetails || '',
        attachments: existingQuote.attachments || [],
      })
    }
  }, [existingQuote])

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
  // car dans ce cas, quoteRequest.id est l'ID de l'estimation, pas de la demande
  useEffect(() => {
    // Seulement pour les nouvelles demandes d'estimation (status 'pending'), pas pour l'édition
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
  const submitWrapper = useCallback(() => {
    const currentFormData = formDataRef.current

    if (!currentFormData.laborCost || parseFloat(currentFormData.laborCost) < 0) {
      setError("Le coût total est requis et doit être positif")
      return
    }

    if (!currentFormData.workDetails.trim()) {
      setError("La description des travaux est requise")
      return
    }

    const isEditMode = !!existingQuote?.id

    setIsLoading(true)
    setError(null)

    logger.info('📝 [QuoteForm] submitWrapper called', {
      isEditMode,
      quoteId: existingQuote?.id,
      interventionId: intervention.id,
    })

    ;(async () => {
      try {
        await submitQuote(currentFormData)

        if (isEditMode) {
          quoteToast.systemNotification('Estimation modifiée', `Votre estimation de ${calculateTotal().toFixed(2)}€ a été mise à jour`, 'info')
        } else {
          quoteToast.quoteSubmitted(calculateTotal(), intervention.title)
        }

        onSuccess()

      } catch (error) {
        logger.error('Error submitting:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        setError(errorMessage)

        const errorAction = isEditMode ? 'la modification de l\'estimation' : 'la soumission de l\'estimation'
        quoteToast.quoteError(errorMessage, errorAction)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [intervention.id, intervention.title, onSuccess, existingQuote?.id])

  // Helper function to submit quote
  const submitQuote = async (formData: typeof formDataRef.current) => {
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
        description: formData.workDetails.trim(),
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Erreur lors de la soumission de l\'estimation')
    }

    logger.info('✅ Quote submitted successfully', { quoteId: result.quote?.id })
    return result
  }

  // Use refs to track previous values and avoid calling callbacks during render
  const prevValidationChangeRef = useRef<typeof onValidationChange>(null)
  const prevLoadingChangeRef = useRef<typeof onLoadingChange>(null)

  // Expose submit handler to parent
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

  const calculateTotal = () => {
    return parseFloat(formData.laborCost) || 0
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
        <p id={`${field}-error`} className="text-sm text-red-600 mt-1 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-1" />
          {validation.error}
        </p>
      )
    }
    return null
  }

  // Validation globale pour état du bouton (Design System)
  const isFormValid = (): boolean => {
    const requiredFields: (keyof FormData)[] = ['laborCost', 'workDetails']

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
          description: formData.workDetails.trim(),
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la soumission de l\'estimation')
      }

      // Toast de succès selon Design System
      if (existingQuote?.id) {
        quoteToast.systemNotification('Estimation modifiée', `Votre estimation de ${calculateTotal().toFixed(2)}€ a été mise à jour`, 'info')
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
      const errorAction = existingQuote?.id ? 'la modification de l\'estimation' : 'la soumission de l\'estimation'
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
                  onBlur={(e) => {
                    const validation = validateField('laborCost', e.target.value)
                    setFieldValidations(prev => ({ ...prev, laborCost: validation }))
                  }}
                  aria-invalid={fieldValidations.laborCost ? !fieldValidations.laborCost.isValid : undefined}
                  aria-describedby={fieldValidations.laborCost && !fieldValidations.laborCost.isValid ? 'laborCost-error' : undefined}
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
                    onBlur={(e) => {
                      const validation = validateField('workDetails', e.target.value)
                      setFieldValidations(prev => ({ ...prev, workDetails: validation }))
                    }}
                    aria-invalid={fieldValidations.workDetails ? !fieldValidations.workDetails.isValid : undefined}
                    aria-describedby={fieldValidations.workDetails && !fieldValidations.workDetails.isValid ? 'workDetails-error' : undefined}
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
                      {existingQuote && quoteRequest?.status !== 'pending' ? 'Confirmer la modification' : 'Soumettre l\'estimation'}
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
