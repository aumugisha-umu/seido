"use client"

import { useState, useEffect } from "react"
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
  onSuccess
}: QuoteSubmissionFormProps) {
  const _router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldValidations, setFieldValidations] = useState<Record<string, FieldValidation>>({})
  const quoteToast = useQuoteToast()

  const [formData, setFormData] = useState<FormData>({
    laborCost: existingQuote?.laborCost?.toString() || '',
    materialsCost: existingQuote?.materialsCost?.toString() || '0',
    workDetails: existingQuote?.workDetails || '',
    estimatedDurationHours: existingQuote?.estimatedDurationHours?.toString() || '1',
    attachments: existingQuote?.attachments || [],
    providerAvailabilities: existingQuote?.providerAvailabilities || []
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
        providerAvailabilities: existingQuote.providerAvailabilities || []
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


  // Validation individuelle des champs selon Design System
  const validateField = (field: keyof FormData, value: string): FieldValidation => {
    switch (field) {
      case 'laborCost':
        if (!value) return { isValid: false, error: 'Le coût de la main d\'œuvre est requis' }
        if (parseFloat(value) < 0) return { isValid: false, error: 'Le coût doit être positif' }
        return { isValid: true }

      case 'materialsCost':
        if (value && parseFloat(value) < 0) return { isValid: false, error: 'Le coût doit être positif' }
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
      startTime: ''
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

  const updateAvailability = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      providerAvailabilities: prev.providerAvailabilities.map((avail, i) =>
        i === index ? { ...avail, [field]: value } : avail
      )
    }))
  }

  const calculateTotal = () => {
    const labor = parseFloat(formData.laborCost) || 0
    const materials = parseFloat(formData.materialsCost) || 0
    return labor + materials
  }

  // Calcule l'heure de fin basée sur l'heure de début et la durée estimée
  const calculateEndTime = (_startTime: string): string => {
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
      return "Le coût de la main d'œuvre est requis et doit être positif"
    }

    if (formData.materialsCost && parseFloat(formData.materialsCost) < 0) {
      return "Le coût des matériaux doit être positif"
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
          materialsCost: parseFloat(formData.materialsCost),
          estimatedDurationHours: parseFloat(formData.estimatedDurationHours),
          description: formData.workDetails.trim(),
          workDetails: formData.workDetails.trim() || null,
          attachments: attachmentUrls,
          providerAvailabilities: formData.providerAvailabilities
            .filter(avail => avail.date && avail.startTime)
            .map(avail => ({
              ...avail,
              endTime: calculateEndTime(avail.startTime)
            }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la soumission du devis')
      }

      // Toast de succès selon Design System
      quoteToast.quoteSubmitted(calculateTotal(), intervention.title)

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 2000)

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

  if (success) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Devis soumis avec succès !
          </h3>
          <p className="text-slate-600 mb-4">
            Votre devis a été transmis au gestionnaire. Vous serez notifié de sa validation.
          </p>
          <Button variant="default" onClick={onSuccess} className="w-full bg-sky-600 hover:bg-sky-700">
            Retour à l'intervention
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full px-2 sm:px-4">
      {/* Header moderne avec hiérarchie claire */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
            <Wrench className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {existingQuote ? 'Modifier le devis' : 'Soumettre un devis'}
            </h1>
            <p className="text-slate-600">
              Intervention: {intervention.title}
            </p>
          </div>
        </div>
        
        {/* Résumé compact de l'intervention */}
        <div className="bg-gradient-to-r from-sky-50 to-slate-50 border border-sky-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{intervention.title}</h2>
              <p className="text-slate-700 text-base leading-relaxed">{intervention.description}</p>

              {/* Message personnalisé de la demande de devis */}
              {quoteRequest?.individual_message && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Message du gestionnaire :</p>
                      <p className="text-sm text-blue-800">{quoteRequest.individual_message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Badge className={`ml-4 ${getPriorityColor(intervention.urgency)}`}>
              {getPriorityLabel(intervention.urgency)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>{getInterventionLocationText(intervention)}</span>
            </div>

            {/* Deadline de la demande de devis (prioritaire) ou de l'intervention */}
            {(quoteRequest?.deadline || intervention.quote_deadline) && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  Deadline: {new Date(quoteRequest?.deadline || intervention.quote_deadline).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}

            {/* Informations sur la demande de devis */}
            {quoteRequest && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  Demande reçue le {new Date(quoteRequest.sent_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout principal responsive 2 colonnes */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        
        {/* Colonne gauche - Informations financières */}
        <div className="flex">
          {/* Détails financiers */}
          <Card className="shadow-sm border-slate-200 w-full h-full flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Euro className="h-4 w-4 text-emerald-600" />
                </div>
                Détails financiers
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Section des champs de saisie */}
              <div className="space-y-6 flex-1">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="laborCost" className="text-slate-700 font-medium mb-2 block">
                      Coût main d'œuvre (€) *
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
                  
                  <div>
                    <Label htmlFor="materialsCost" className="text-slate-700 font-medium mb-2 block">
                      Coût matériaux (€)
                    </Label>
                    <Input
                      id="materialsCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.materialsCost}
                      onChange={(e) => handleInputChange('materialsCost', e.target.value)}
                      placeholder="0.00"
                      className={`h-11 ${getInputClasses('materialsCost')}`}
                    />
                    {renderFieldFeedback('materialsCost')}
                  </div>

                  {/* Durée estimée */}
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
                    <p className="text-xs text-slate-500">
                      Estimation du temps nécessaire pour réaliser l'intervention
                    </p>
                  </div>

                </div>

              </div>

              {/* Total prominent - Version compacte mais toujours visible */}
              <div className="bg-gradient-to-br from-sky-50 to-emerald-50 border border-sky-200 rounded-xl p-6 mt-6">
                <div className="text-center space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total du Devis</p>
                    <p className="text-3xl font-bold text-sky-700">{calculateTotal().toFixed(2)} €</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white/60 rounded p-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
                        <span>Main d'œuvre</span>
                      </div>
                      <span className="font-bold">{(parseFloat(formData.laborCost) || 0).toFixed(2)} €</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white/60 rounded p-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span>Matériaux</span>
                      </div>
                      <span className="font-bold">{(parseFloat(formData.materialsCost) || 0).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite - Description des travaux et documents */}
        <div className="flex">
          {/* Card unifiée pour description et documents */}
          <Card className="shadow-sm border-slate-200 w-full h-full flex flex-col">
            <CardHeader className="pb-4 flex-shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-600" />
                </div>
                Description des travaux *
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-6">
              {/* Description des travaux - flexible */}
              <div className="flex-1 flex flex-col">
                <Label htmlFor="workDetails" className="text-slate-700 font-medium mb-2 block">
                  Détail des travaux *
                </Label>
                <Textarea
                  id="workDetails"
                  value={formData.workDetails}
                  onChange={(e) => handleInputChange('workDetails', e.target.value)}
                  placeholder="Description détaillée des étapes, méthodes et matériaux à utiliser..."
                  className={`resize-none flex-1 min-h-[200px] ${getInputClasses('workDetails')}`}
                  required
                />
                {renderFieldFeedback('workDetails')}
                <p className="text-sm text-slate-500 mt-1">
                  Décrivez précisément les travaux à effectuer pour établir votre devis
                </p>
              </div>

              <Separator />

              {/* Documents justificatifs */}
              <div className="space-y-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center">
                    <Upload className="h-3 w-3 text-violet-600" />
                  </div>
                  <Label className="text-slate-700 font-medium">Documents justificatifs</Label>
                </div>
                
                <div>
                  <Label htmlFor="files" className="text-slate-600 text-sm mb-2 block">
                    Ajouter des documents
                  </Label>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileChange}
                    className="h-11 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    Photos, devis fournisseurs, certificats, etc. (PDF, Images, Documents - 10MB max)
                  </p>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-medium text-sm">Fichiers sélectionnés</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-violet-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-slate-900 block truncate">{file.name}</span>
                              <span className="text-xs text-slate-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Disponibilités Prestataire en pleine largeur */}
        <div className="lg:col-span-2">
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
                    Ajoutez vos créneaux disponibles pour faciliter la planification
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.providerAvailabilities.map((avail, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                          <Label className="text-sm font-medium text-slate-700">Fin estimée</Label>
                          <div className="mt-1 p-2 text-sm text-slate-600 flex items-center gap-1 min-h-[40px]">
                            <Clock className="h-3 w-3" />
                            {avail.startTime && formData.estimatedDurationHours ? calculateEndTime(avail.startTime) : '--:--'}
                          </div>
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
                        Ces disponibilités seront utilisées pour planifier l'intervention avec le locataire une fois votre devis validé.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions en pleine largeur */}
        <div className="lg:col-span-2">
          {/* Messages d'erreur */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
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
                      {existingQuote ? 'Modifier le devis' : 'Soumettre le devis'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
