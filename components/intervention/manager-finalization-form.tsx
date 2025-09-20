"use client"

import { useState } from "react"
import {
  CheckCircle,
  FileText,
  Download,
  Upload,
  X,
  AlertTriangle,
  Shield,
  Euro,
  Calendar,
  User,
  Building,
  Printer
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
import { Checkbox } from "@/components/ui/checkbox"

interface ManagerFinalizationFormProps {
  intervention: {
    id: string
    title: string
    description: string
    status: string
    final_cost?: number
    selected_quote_id?: string
  }
  tenantValidation?: {
    validationType: 'approve' | 'contest'
    satisfaction: {
      overall: number
    }
    comments: string
    recommendProvider: boolean
  }
  providerInfo?: {
    name: string
    email: string
    phone?: string
    provider_category?: string
  }
  isOpen: boolean
  onClose: () => void
  onSubmit: (finalizationData: ManagerFinalizationData) => Promise<boolean>
  isLoading?: boolean
}

interface ManagerFinalizationData {
  finalStatus: 'completed' | 'archived_with_issues' | 'cancelled'
  adminComments: string
  qualityControl: {
    proceduresFollowed: boolean
    documentationComplete: boolean
    clientSatisfied: boolean
    costsVerified: boolean
    warrantyDocumented: boolean
  }
  financialSummary: {
    finalCost: number
    budgetVariance: number
    costJustification: string
    paymentStatus: 'pending' | 'paid' | 'disputed'
  }
  documentation: {
    completionCertificate: boolean
    warrantyDocuments: boolean
    invoiceGenerated: boolean
    clientSignOff: boolean
  }
  archivalData: {
    category: string
    keywords: string[]
    retentionPeriod: number // years
    accessLevel: 'public' | 'restricted' | 'confidential'
  }
  followUpActions: {
    warrantyReminder: boolean
    maintenanceSchedule: boolean
    feedbackRequest: boolean
  }
  additionalDocuments: File[]
}

export function ManagerFinalizationForm({
  intervention,
  tenantValidation,
  providerInfo,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}: ManagerFinalizationFormProps) {
  const [formData, setFormData] = useState<ManagerFinalizationData>({
    finalStatus: 'completed',
    adminComments: '',
    qualityControl: {
      proceduresFollowed: false,
      documentationComplete: false,
      clientSatisfied: false,
      costsVerified: false,
      warrantyDocumented: false
    },
    financialSummary: {
      finalCost: intervention.final_cost || 0,
      budgetVariance: 0,
      costJustification: '',
      paymentStatus: 'pending'
    },
    documentation: {
      completionCertificate: false,
      warrantyDocuments: false,
      invoiceGenerated: false,
      clientSignOff: false
    },
    archivalData: {
      category: 'maintenance',
      keywords: [],
      retentionPeriod: 7,
      accessLevel: 'restricted'
    },
    followUpActions: {
      warrantyReminder: true,
      maintenanceSchedule: false,
      feedbackRequest: true
    },
    additionalDocuments: []
  })

  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState<'review' | 'quality' | 'financial' | 'documentation'>('review')
  const [keywordInput, setKeywordInput] = useState('')

  const handleInputChange = (field: keyof ManagerFinalizationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleNestedChange = (section: keyof ManagerFinalizationData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }))
  }

  const handleFileChange = (files: FileList) => {
    const fileArray = Array.from(files)
    setFormData(prev => ({ ...prev, additionalDocuments: [...prev.additionalDocuments, ...fileArray] }))
  }

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalDocuments: prev.additionalDocuments.filter((_, i) => i !== index)
    }))
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.archivalData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        archivalData: {
          ...prev.archivalData,
          keywords: [...prev.archivalData.keywords, keywordInput.trim()]
        }
      }))
      setKeywordInput('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData(prev => ({
      ...prev,
      archivalData: {
        ...prev.archivalData,
        keywords: prev.archivalData.keywords.filter(k => k !== keyword)
      }
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.adminComments.trim()) return "Les commentaires administratifs sont requis"

    const qcValues = Object.values(formData.qualityControl)
    if (!qcValues.every(val => val)) return "Tous les points de contrôle qualité doivent être validés"

    const docValues = Object.values(formData.documentation)
    if (!docValues.every(val => val)) return "Tous les documents doivent être confirmés"

    if (formData.financialSummary.finalCost <= 0) return "Le coût final doit être positif"

    if (Math.abs(formData.financialSummary.budgetVariance) > 20 && !formData.financialSummary.costJustification.trim()) {
      return "Une justification est requise pour une variance budgétaire > 20%"
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la finalisation')
    }
  }

  const generateDocument = (type: 'certificate' | 'warranty' | 'invoice') => {
    // Placeholder for document generation
    alert(`Génération du document: ${type}`)
  }

  const SectionTab = ({ section, label, isActive }: {
    section: string
    label: string
    isActive: boolean
  }) => (
    <button
      onClick={() => setCurrentSection(section as any)}
      className={`px-4 py-2 text-sm font-medium rounded-lg ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-500" />
            <span>Finalisation administrative</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">{intervention.title}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section Tabs */}
          <div className="flex space-x-2 border-b">
            <SectionTab section="review" label="Révision" isActive={currentSection === 'review'} />
            <SectionTab section="quality" label="Contrôle Qualité" isActive={currentSection === 'quality'} />
            <SectionTab section="financial" label="Financier" isActive={currentSection === 'financial'} />
            <SectionTab section="documentation" label="Documentation" isActive={currentSection === 'documentation'} />
          </div>

          {/* Section: Review */}
          {currentSection === 'review' && (
            <div className="space-y-4">
              {/* Intervention Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Résumé de l'intervention</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Statut actuel: </span>
                      <Badge className="ml-2">{intervention.status}</Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Coût final: </span>
                      <span className="ml-2">{intervention.final_cost?.toFixed(2) || 0} €</span>
                    </div>
                  </div>

                  {providerInfo && (
                    <div>
                      <h4 className="font-medium mb-2">Prestataire</h4>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{providerInfo.name}</span>
                          <Badge variant="outline">{providerInfo.provider_category}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {providerInfo.email} • {providerInfo.phone}
                        </div>
                      </div>
                    </div>
                  )}

                  {tenantValidation && (
                    <div>
                      <h4 className="font-medium mb-2">Validation locataire</h4>
                      <div className={`p-3 rounded ${
                        tenantValidation.validationType === 'approve' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          {tenantValidation.validationType === 'approve' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`font-medium ${
                            tenantValidation.validationType === 'approve' ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {tenantValidation.validationType === 'approve' ? 'Travaux validés' : 'Problème signalé'}
                          </span>
                        </div>
                        {tenantValidation.validationType === 'approve' && (
                          <div className="text-sm text-green-700">
                            Satisfaction: {tenantValidation.satisfaction.overall}/5 •
                            {tenantValidation.recommendProvider ? ' Prestataire recommandé' : ' Prestataire non recommandé'}
                          </div>
                        )}
                        <p className="text-sm mt-2">{tenantValidation.comments}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Final Status Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statut final de l'intervention</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="completed"
                        name="finalStatus"
                        value="completed"
                        checked={formData.finalStatus === 'completed'}
                        onChange={(e) => handleInputChange('finalStatus', e.target.value)}
                        className="h-4 w-4 text-green-600"
                      />
                      <label htmlFor="completed" className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Intervention terminée avec succès</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="archived_with_issues"
                        name="finalStatus"
                        value="archived_with_issues"
                        checked={formData.finalStatus === 'archived_with_issues'}
                        onChange={(e) => handleInputChange('finalStatus', e.target.value)}
                        className="h-4 w-4 text-orange-600"
                      />
                      <label htmlFor="archived_with_issues" className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Terminée avec réserves/problèmes</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="cancelled"
                        name="finalStatus"
                        value="cancelled"
                        checked={formData.finalStatus === 'cancelled'}
                        onChange={(e) => handleInputChange('finalStatus', e.target.value)}
                        className="h-4 w-4 text-red-600"
                      />
                      <label htmlFor="cancelled" className="flex items-center space-x-2">
                        <X className="h-4 w-4 text-red-600" />
                        <span className="font-medium">Intervention annulée</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Commentaires administratifs</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.adminComments}
                    onChange={(e) => handleInputChange('adminComments', e.target.value)}
                    placeholder="Commentaires sur la gestion de l'intervention, décisions prises, points d'amélioration..."
                    rows={4}
                    required
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section: Quality Control */}
          {currentSection === 'quality' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Points de contrôle qualité</CardTitle>
                  <p className="text-sm text-gray-600">
                    Vérifiez chaque point avant de finaliser l'intervention
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'proceduresFollowed', label: 'Les procédures internes ont été respectées' },
                    { key: 'documentationComplete', label: 'La documentation est complète et archivée' },
                    { key: 'clientSatisfied', label: 'La satisfaction client est confirmée' },
                    { key: 'costsVerified', label: 'Les coûts ont été vérifiés et approuvés' },
                    { key: 'warrantyDocumented', label: 'Les garanties sont documentées et communiquées' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={key}
                        checked={formData.qualityControl[key as keyof typeof formData.qualityControl]}
                        onCheckedChange={(checked) =>
                          handleNestedChange('qualityControl', key, checked)
                        }
                      />
                      <label htmlFor={key} className="text-sm font-medium flex-1 cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Follow-up Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions de suivi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'warrantyReminder', label: 'Programmer rappel de garantie' },
                    { key: 'maintenanceSchedule', label: 'Programmer maintenance préventive' },
                    { key: 'feedbackRequest', label: 'Demander retour d\'expérience différé' }
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={key}
                        checked={formData.followUpActions[key as keyof typeof formData.followUpActions]}
                        onCheckedChange={(checked) =>
                          handleNestedChange('followUpActions', key, checked)
                        }
                      />
                      <label htmlFor={key} className="text-sm font-medium flex-1 cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section: Financial */}
          {currentSection === 'financial' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Résumé financier</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="finalCost">Coût final (€) *</Label>
                      <Input
                        id="finalCost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.financialSummary.finalCost}
                        onChange={(e) => handleNestedChange('financialSummary', 'finalCost', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="budgetVariance">Variance budgétaire (%)</Label>
                      <Input
                        id="budgetVariance"
                        type="number"
                        step="0.1"
                        value={formData.financialSummary.budgetVariance}
                        onChange={(e) => handleNestedChange('financialSummary', 'budgetVariance', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paymentStatus">Statut de paiement</Label>
                    <select
                      id="paymentStatus"
                      value={formData.financialSummary.paymentStatus}
                      onChange={(e) => handleNestedChange('financialSummary', 'paymentStatus', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="pending">En attente</option>
                      <option value="paid">Payé</option>
                      <option value="disputed">Contesté</option>
                    </select>
                  </div>

                  {Math.abs(formData.financialSummary.budgetVariance) > 20 && (
                    <div>
                      <Label htmlFor="costJustification">Justification de la variance *</Label>
                      <Textarea
                        id="costJustification"
                        value={formData.financialSummary.costJustification}
                        onChange={(e) => handleNestedChange('financialSummary', 'costJustification', e.target.value)}
                        placeholder="Expliquez les raisons de la variance budgétaire"
                        rows={3}
                        required
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section: Documentation */}
          {currentSection === 'documentation' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents officiels</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'completionCertificate', label: 'Certificat de completion généré', action: () => generateDocument('certificate') },
                    { key: 'warrantyDocuments', label: 'Documents de garantie finalisés', action: () => generateDocument('warranty') },
                    { key: 'invoiceGenerated', label: 'Facture générée et envoyée', action: () => generateDocument('invoice') },
                    { key: 'clientSignOff', label: 'Validation client documentée', action: null }
                  ].map(({ key, label, action }) => (
                    <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={key}
                          checked={formData.documentation[key as keyof typeof formData.documentation]}
                          onCheckedChange={(checked) =>
                            handleNestedChange('documentation', key, checked)
                          }
                        />
                        <label htmlFor={key} className="text-sm font-medium cursor-pointer">
                          {label}
                        </label>
                      </div>
                      {action && (
                        <Button variant="outline" size="sm" onClick={action}>
                          <Printer className="h-4 w-4 mr-1" />
                          Générer
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Additional Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents complémentaires</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Ajouter des documents</Label>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files && handleFileChange(e.target.files)}
                      className="mb-2"
                    />
                    <p className="text-xs text-gray-500">
                      Rapports, photos finales, correspondances, etc.
                    </p>
                  </div>

                  {formData.additionalDocuments.length > 0 && (
                    <div className="space-y-2">
                      {formData.additionalDocuments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Archival Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Données d'archivage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Catégorie</Label>
                      <select
                        id="category"
                        value={formData.archivalData.category}
                        onChange={(e) => handleNestedChange('archivalData', 'category', e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="maintenance">Maintenance</option>
                        <option value="emergency">Urgence</option>
                        <option value="improvement">Amélioration</option>
                        <option value="inspection">Inspection</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="retentionPeriod">Période de rétention (années)</Label>
                      <Input
                        id="retentionPeriod"
                        type="number"
                        min="1"
                        max="50"
                        value={formData.archivalData.retentionPeriod}
                        onChange={(e) => handleNestedChange('archivalData', 'retentionPeriod', parseInt(e.target.value) || 7)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Mots-clés</Label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        placeholder="Ajouter un mot-clé"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      />
                      <Button type="button" onClick={addKeyword}>Ajouter</Button>
                    </div>
                    {formData.archivalData.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.archivalData.keywords.map((keyword) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                            <button
                              onClick={() => removeKeyword(keyword)}
                              className="ml-1 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Niveau d'accès</Label>
                    <select
                      value={formData.archivalData.accessLevel}
                      onChange={(e) => handleNestedChange('archivalData', 'accessLevel', e.target.value)}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="public">Public</option>
                      <option value="restricted">Restreint</option>
                      <option value="confidential">Confidentiel</option>
                    </select>
                  </div>
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

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="min-w-[150px]"
            >
              {isLoading ? 'Finalisation...' : 'Finaliser l\'intervention'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}