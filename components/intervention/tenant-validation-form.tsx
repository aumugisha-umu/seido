"use client"

import { useState } from "react"
import {
  CheckCircle,
  X,
  AlertTriangle,
  Star,
  Camera,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Tool
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface TenantValidationFormProps {
  intervention: {
    id: string
    title: string
    description: string
    status: string
  }
  workReport?: {
    workSummary: string
    workDetails: string
    materialsUsed: string
    actualDurationHours: number
    beforePhotos: string[]
    afterPhotos: string[]
    recommendations: string
  }
  isOpen: boolean
  onClose: () => void
  onSubmit: (validationData: TenantValidationData) => Promise<boolean>
  isLoading?: boolean
}

interface TenantValidationData {
  validationType: 'approve' | 'contest'
  satisfaction: {
    workQuality: number // 1-5 stars
    timeliness: number // 1-5 stars
    cleanliness: number // 1-5 stars
    communication: number // 1-5 stars
    overall: number // 1-5 stars
  }
  workApproval: {
    workCompleted: boolean
    workQuality: boolean
    areaClean: boolean
    instructionsFollowed: boolean
  }
  comments: string
  issues?: {
    description: string
    photos: File[]
    severity: 'minor' | 'major' | 'critical'
  }
  recommendProvider: boolean
  additionalComments: string
}

export function TenantValidationForm({
  intervention,
  workReport,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}: TenantValidationFormProps) {
  const [formData, setFormData] = useState<TenantValidationData>({
    validationType: 'approve',
    satisfaction: {
      workQuality: 5,
      timeliness: 5,
      cleanliness: 5,
      communication: 5,
      overall: 5
    },
    workApproval: {
      workCompleted: false,
      workQuality: false,
      areaClean: false,
      instructionsFollowed: false
    },
    comments: '',
    recommendProvider: true,
    additionalComments: ''
  })

  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'review' | 'evaluation' | 'confirmation'>('review')

  const handleValidationTypeChange = (type: 'approve' | 'contest') => {
    setFormData(prev => ({ ...prev, validationType: type }))
    if (type === 'contest') {
      setFormData(prev => ({
        ...prev,
        issues: {
          description: '',
          photos: [],
          severity: 'minor'
        }
      }))
    } else {
      const { issues, ...rest } = formData
      setFormData(rest)
    }
    setError(null)
  }

  const handleSatisfactionChange = (category: keyof TenantValidationData['satisfaction'], rating: number) => {
    setFormData(prev => ({
      ...prev,
      satisfaction: { ...prev.satisfaction, [category]: rating }
    }))
  }

  const handleApprovalChange = (field: keyof TenantValidationData['workApproval'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      workApproval: { ...prev.workApproval, [field]: value }
    }))
  }

  const handleIssuePhotoChange = (files: FileList) => {
    if (formData.issues) {
      const fileArray = Array.from(files)
      setFormData(prev => ({
        ...prev,
        issues: prev.issues ? { ...prev.issues, photos: [...prev.issues.photos, ...fileArray] } : undefined
      }))
    }
  }

  const removeIssuePhoto = (index: number) => {
    if (formData.issues) {
      setFormData(prev => ({
        ...prev,
        issues: prev.issues ? {
          ...prev.issues,
          photos: prev.issues.photos.filter((_, i) => i !== index)
        } : undefined
      }))
    }
  }

  const validateForm = (): string | null => {
    if (formData.validationType === 'approve') {
      const approvalValues = Object.values(formData.workApproval)
      if (!approvalValues.every(val => val)) {
        return "Veuillez valider tous les points de contrôle pour approuver les travaux"
      }
    } else {
      if (!formData.issues?.description.trim()) {
        return "Veuillez décrire les problèmes constatés"
      }
    }

    if (!formData.comments.trim()) {
      return "Un commentaire est requis"
    }

    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      const success = await onSubmit(formData)
      if (success) {
        onClose()
        // Reset form
        setFormData({
          validationType: 'approve',
          satisfaction: {
            workQuality: 5,
            timeliness: 5,
            cleanliness: 5,
            communication: 5,
            overall: 5
          },
          workApproval: {
            workCompleted: false,
            workQuality: false,
            areaClean: false,
            instructionsFollowed: false
          },
          comments: '',
          recommendProvider: true,
          additionalComments: ''
        })
        setCurrentStep('review')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation')
    }
  }

  const StarRating = ({ rating, onRatingChange, label }: {
    rating: number
    onRatingChange: (rating: number) => void
    label: string
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 cursor-pointer ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            onClick={() => onRatingChange(star)}
          />
        ))}
      </div>
    </div>
  )

  const StepIndicator = ({ step, label, isActive, isCompleted }: {
    step: string
    label: string
    isActive: boolean
    isCompleted: boolean
  }) => (
    <div className={`flex items-center space-x-2 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
        isCompleted ? 'bg-green-100 text-green-600' :
        isActive ? 'bg-blue-100 text-blue-600' :
        'bg-gray-100 text-gray-500'
      }`}>
        {isCompleted ? <CheckCircle className="h-3 w-3" /> :
         step === 'review' ? '1' : step === 'evaluation' ? '2' : '3'}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )

  const isReviewComplete = formData.validationType !== null
  const isEvaluationComplete = formData.validationType === 'approve' ?
    Object.values(formData.workApproval).every(val => val) :
    formData.issues?.description.trim()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Validation des travaux</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">{intervention.title}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <StepIndicator
              step="review"
              label="Contrôle des travaux"
              isActive={currentStep === 'review'}
              isCompleted={isReviewComplete}
            />
            <div className="flex-1 h-px bg-gray-300 mx-4" />
            <StepIndicator
              step="evaluation"
              label="Évaluation"
              isActive={currentStep === 'evaluation'}
              isCompleted={isEvaluationComplete}
            />
            <div className="flex-1 h-px bg-gray-300 mx-4" />
            <StepIndicator
              step="confirmation"
              label="Confirmation"
              isActive={currentStep === 'confirmation'}
              isCompleted={false}
            />
          </div>

          {/* Step 1: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {/* Work Report Summary */}
              {workReport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Résumé des travaux effectués</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Travaux réalisés</h4>
                      <p className="text-sm text-gray-700">{workReport.workSummary}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Durée: </span>
                        <span className="text-sm">{workReport.actualDurationHours}h</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Photos: </span>
                        <span className="text-sm">{workReport.afterPhotos.length} après travaux</span>
                      </div>
                    </div>

                    {workReport.recommendations && (
                      <div>
                        <h4 className="font-medium mb-2">Recommandations</h4>
                        <p className="text-sm text-gray-700">{workReport.recommendations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Validation Choice */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contrôle des travaux</CardTitle>
                  <p className="text-sm text-gray-600">
                    Après vérification des travaux, êtes-vous satisfait du résultat ?
                  </p>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={formData.validationType}
                    onValueChange={(value) => handleValidationTypeChange(value as 'approve' | 'contest')}
                  >
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="approve" id="approve" />
                      <label htmlFor="approve" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <ThumbsUp className="h-4 w-4 text-green-600" />
                        <div>
                          <span className="font-medium text-green-900">Valider les travaux</span>
                          <p className="text-sm text-green-700">Les travaux sont satisfaisants et conformes</p>
                        </div>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="contest" id="contest" />
                      <label htmlFor="contest" className="flex items-center space-x-2 cursor-pointer flex-1">
                        <ThumbsDown className="h-4 w-4 text-red-600" />
                        <div>
                          <span className="font-medium text-red-900">Signaler un problème</span>
                          <p className="text-sm text-red-700">Les travaux présentent des défauts ou ne sont pas conformes</p>
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Evaluation */}
          {currentStep === 'evaluation' && (
            <div className="space-y-4">
              {formData.validationType === 'approve' ? (
                // Approval Checklist
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Points de contrôle</CardTitle>
                    <p className="text-sm text-gray-600">
                      Vérifiez chaque point avant de valider les travaux
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { key: 'workCompleted', label: 'Tous les travaux demandés ont été réalisés', icon: Tool },
                      { key: 'workQuality', label: 'La qualité des travaux est satisfaisante', icon: CheckCircle },
                      { key: 'areaClean', label: 'La zone de travail a été nettoyée', icon: CheckCircle },
                      { key: 'instructionsFollowed', label: 'Les instructions ont été respectées', icon: MessageSquare }
                    ].map(({ key, label, icon: Icon }) => (
                      <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          id={key}
                          checked={formData.workApproval[key as keyof typeof formData.workApproval]}
                          onChange={(e) => handleApprovalChange(key as keyof typeof formData.workApproval, e.target.checked)}
                          className="h-4 w-4 text-green-600 rounded"
                        />
                        <Icon className="h-4 w-4 text-gray-500" />
                        <label htmlFor={key} className="text-sm font-medium text-gray-900 flex-1 cursor-pointer">
                          {label}
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                // Issue Reporting
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Signalement de problème</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="issueDescription">Description du problème *</Label>
                      <Textarea
                        id="issueDescription"
                        value={formData.issues?.description || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          issues: prev.issues ? { ...prev.issues, description: e.target.value } : {
                            description: e.target.value,
                            photos: [],
                            severity: 'minor'
                          }
                        }))}
                        placeholder="Décrivez précisément les problèmes constatés"
                        rows={4}
                        required
                      />
                    </div>

                    <div>
                      <Label>Gravité du problème</Label>
                      <RadioGroup
                        value={formData.issues?.severity || 'minor'}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          issues: prev.issues ? { ...prev.issues, severity: value as 'minor' | 'major' | 'critical' } : undefined
                        }))}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="minor" id="minor" />
                          <label htmlFor="minor" className="text-sm">Mineur - Retouches nécessaires</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="major" id="major" />
                          <label htmlFor="major" className="text-sm">Majeur - Reprises importantes requises</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="critical" id="critical" />
                          <label htmlFor="critical" className="text-sm">Critique - Travaux à refaire</label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div>
                      <Label>Photos des problèmes</Label>
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleIssuePhotoChange(e.target.files)}
                        className="mb-2"
                      />
                      {formData.issues?.photos && formData.issues.photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {formData.issues.photos.map((file, index) => (
                            <div key={index} className="relative bg-red-50 rounded p-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeIssuePhoto(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Satisfaction Rating (only for approval) */}
              {formData.validationType === 'approve' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Évaluation de satisfaction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <StarRating
                      rating={formData.satisfaction.workQuality}
                      onRatingChange={(rating) => handleSatisfactionChange('workQuality', rating)}
                      label="Qualité des travaux"
                    />
                    <StarRating
                      rating={formData.satisfaction.timeliness}
                      onRatingChange={(rating) => handleSatisfactionChange('timeliness', rating)}
                      label="Respect des délais"
                    />
                    <StarRating
                      rating={formData.satisfaction.cleanliness}
                      onRatingChange={(rating) => handleSatisfactionChange('cleanliness', rating)}
                      label="Propreté"
                    />
                    <StarRating
                      rating={formData.satisfaction.communication}
                      onRatingChange={(rating) => handleSatisfactionChange('communication', rating)}
                      label="Communication"
                    />
                    <Separator />
                    <StarRating
                      rating={formData.satisfaction.overall}
                      onRatingChange={(rating) => handleSatisfactionChange('overall', rating)}
                      label="Satisfaction générale"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 'confirmation' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Commentaires finaux</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="comments">Commentaires sur l'intervention *</Label>
                    <Textarea
                      id="comments"
                      value={formData.comments}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                      placeholder="Vos commentaires sur l'intervention et le travail du prestataire"
                      rows={4}
                      required
                    />
                  </div>

                  {formData.validationType === 'approve' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="recommend"
                          checked={formData.recommendProvider}
                          onChange={(e) => setFormData(prev => ({ ...prev, recommendProvider: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <label htmlFor="recommend" className="text-sm font-medium">
                          Je recommande ce prestataire
                        </label>
                      </div>

                      <div>
                        <Label htmlFor="additionalComments">Commentaires additionnels</Label>
                        <Textarea
                          id="additionalComments"
                          value={formData.additionalComments}
                          onChange={(e) => setFormData(prev => ({ ...prev, additionalComments: e.target.value }))}
                          placeholder="Commentaires supplémentaires (optionnel)"
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Résumé de votre validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-4">
                    {formData.validationType === 'approve' ? (
                      <>
                        <ThumbsUp className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-900">Travaux validés</span>
                      </>
                    ) : (
                      <>
                        <ThumbsDown className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-900">Problème signalé</span>
                      </>
                    )}
                  </div>

                  {formData.validationType === 'approve' && (
                    <div className="text-sm text-gray-600">
                      Note globale: {formData.satisfaction.overall}/5 étoiles
                    </div>
                  )}

                  {formData.issues && (
                    <div className="text-sm text-gray-600">
                      Gravité: {formData.issues.severity === 'minor' ? 'Mineur' :
                               formData.issues.severity === 'major' ? 'Majeur' : 'Critique'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex space-x-2">
            {currentStep !== 'review' && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(
                  currentStep === 'confirmation' ? 'evaluation' : 'review'
                )}
              >
                Précédent
              </Button>
            )}
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>

            {currentStep !== 'confirmation' ? (
              <Button
                onClick={() => setCurrentStep(
                  currentStep === 'review' ? 'evaluation' : 'confirmation'
                )}
                disabled={
                  (currentStep === 'review' && !isReviewComplete) ||
                  (currentStep === 'evaluation' && !isEvaluationComplete)
                }
              >
                Suivant
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !formData.comments.trim()}
                className="min-w-[120px]"
              >
                {isLoading ? 'Validation...' :
                 formData.validationType === 'approve' ? 'Valider les travaux' : 'Signaler le problème'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}