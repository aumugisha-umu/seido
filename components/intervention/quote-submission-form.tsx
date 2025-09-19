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
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  getInterventionLocationText,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

interface QuoteSubmissionFormProps {
  intervention: any
  existingQuote?: any // Si le prestataire a déjà soumis un devis
  onSuccess: () => void
}

interface FormData {
  laborCost: string
  materialsCost: string
  description: string
  workDetails: string
  estimatedDurationHours: string
  estimatedStartDate: string
  validUntil: string
  termsAndConditions: string
  warrantyPeriodMonths: string
  attachments: File[]
}

export function QuoteSubmissionForm({
  intervention,
  existingQuote,
  onSuccess
}: QuoteSubmissionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    laborCost: existingQuote?.labor_cost?.toString() || '',
    materialsCost: existingQuote?.materials_cost?.toString() || '0',
    description: existingQuote?.description || '',
    workDetails: existingQuote?.work_details || '',
    estimatedDurationHours: existingQuote?.estimated_duration_hours?.toString() || '',
    estimatedStartDate: existingQuote?.estimated_start_date || '',
    validUntil: existingQuote?.valid_until || '',
    termsAndConditions: existingQuote?.terms_and_conditions || '',
    warrantyPeriodMonths: existingQuote?.warranty_period_months?.toString() || '12',
    attachments: []
  })

  // Set default valid_until to 30 days from now if not set
  useEffect(() => {
    if (!formData.validUntil) {
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setFormData(prev => ({
        ...prev,
        validUntil: defaultDate.toISOString().split('T')[0]
      }))
    }
  }, [])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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

  const calculateTotal = () => {
    const labor = parseFloat(formData.laborCost) || 0
    const materials = parseFloat(formData.materialsCost) || 0
    return labor + materials
  }

  const validateForm = (): string | null => {
    if (!formData.laborCost || parseFloat(formData.laborCost) < 0) {
      return "Le coût de la main d'œuvre est requis et doit être positif"
    }

    if (formData.materialsCost && parseFloat(formData.materialsCost) < 0) {
      return "Le coût des matériaux doit être positif"
    }

    if (!formData.description.trim()) {
      return "La description des travaux est requise"
    }

    if (!formData.validUntil) {
      return "La date de validité est requise"
    }

    const validDate = new Date(formData.validUntil)
    if (validDate <= new Date()) {
      return "La date de validité doit être future"
    }

    if (formData.estimatedDurationHours && parseInt(formData.estimatedDurationHours) <= 0) {
      return "La durée estimée doit être positive"
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
          description: formData.description.trim(),
          workDetails: formData.workDetails.trim() || null,
          estimatedDurationHours: formData.estimatedDurationHours ? parseInt(formData.estimatedDurationHours) : null,
          estimatedStartDate: formData.estimatedStartDate || null,
          validUntil: formData.validUntil,
          termsAndConditions: formData.termsAndConditions.trim() || null,
          warrantyPeriodMonths: parseInt(formData.warrantyPeriodMonths) || 12,
          attachments: attachmentUrls
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la soumission du devis')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Error submitting quote:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Devis soumis avec succès !
          </h3>
          <p className="text-slate-600 mb-4">
            Votre devis a été transmis au gestionnaire. Vous serez notifié de sa validation.
          </p>
          <Button onClick={onSuccess} className="w-full">
            Retour à l'intervention
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Résumé de l'intervention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {existingQuote ? 'Modifier le devis' : 'Soumettre un devis'}
          </CardTitle>
          <p className="text-slate-600">
            Intervention: {intervention.title}
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{intervention.title}</h4>
              <Badge className={`${getPriorityColor(intervention.urgency)}`}>
                {getPriorityLabel(intervention.urgency)}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">{intervention.description}</p>
            <div className="text-sm text-slate-500">
              📍 {getInterventionLocationText(intervention)}
            </div>
            {intervention.quote_deadline && (
              <div className="text-sm text-amber-600 font-medium">
                ⏰ Deadline: {new Date(intervention.quote_deadline).toLocaleDateString('fr-FR')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de devis */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Détails financiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="laborCost">Coût main d'œuvre (€) *</Label>
                <Input
                  id="laborCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.laborCost}
                  onChange={(e) => handleInputChange('laborCost', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="materialsCost">Coût matériaux (€)</Label>
                <Input
                  id="materialsCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.materialsCost}
                  onChange={(e) => handleInputChange('materialsCost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-medium text-blue-900">
                Total du devis: {calculateTotal().toFixed(2)} €
              </div>
              <div className="text-sm text-blue-700">
                Main d'œuvre: {(parseFloat(formData.laborCost) || 0).toFixed(2)} € •
                Matériaux: {(parseFloat(formData.materialsCost) || 0).toFixed(2)} €
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description des travaux *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Description synthétique *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Résumé des travaux à effectuer"
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="workDetails">Détail des travaux</Label>
              <Textarea
                id="workDetails"
                value={formData.workDetails}
                onChange={(e) => handleInputChange('workDetails', e.target.value)}
                placeholder="Description détaillée des étapes, méthodes et matériaux"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Planning et conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedDurationHours">Durée estimée (heures)</Label>
                <Input
                  id="estimatedDurationHours"
                  type="number"
                  min="1"
                  value={formData.estimatedDurationHours}
                  onChange={(e) => handleInputChange('estimatedDurationHours', e.target.value)}
                  placeholder="Ex: 8"
                />
              </div>
              <div>
                <Label htmlFor="estimatedStartDate">Date de début souhaitée</Label>
                <Input
                  id="estimatedStartDate"
                  type="date"
                  value={formData.estimatedStartDate}
                  onChange={(e) => handleInputChange('estimatedStartDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validUntil">Validité du devis *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => handleInputChange('validUntil', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="warrantyPeriodMonths">Garantie (mois)</Label>
                <Input
                  id="warrantyPeriodMonths"
                  type="number"
                  min="0"
                  value={formData.warrantyPeriodMonths}
                  onChange={(e) => handleInputChange('warrantyPeriodMonths', e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="termsAndConditions">Conditions particulières</Label>
              <Textarea
                id="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={(e) => handleInputChange('termsAndConditions', e.target.value)}
                placeholder="Conditions de paiement, modalités d'intervention, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Documents justificatifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="files">Ajouter des documents</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
              />
              <p className="text-sm text-slate-500 mt-1">
                Photos, devis fournisseurs, certificats, etc. (PDF, Images, Documents)
              </p>
            </div>

            {formData.attachments.length > 0 && (
              <div className="space-y-2">
                <Label>Fichiers sélectionnés</Label>
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 rounded p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Envoi...</span>
                  </div>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    {existingQuote ? 'Modifier le devis' : 'Soumettre le devis'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}