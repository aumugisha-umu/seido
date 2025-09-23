"use client"

import { useState } from "react"
import {
  Camera,
  FileText,
  Upload,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench,
  Euro,
  User
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
import type { WorkCompletionReportData } from "./closure/types"

interface WorkCompletionReportProps {
  intervention: {
    id: string
    title: string
    description: string
    status: string
  }
  isOpen: boolean
  onClose: () => void
  onSubmit: (reportData: WorkCompletionReportData) => Promise<boolean>
  isLoading?: boolean
}


export function WorkCompletionReport({
  intervention,
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}: WorkCompletionReportProps) {
  const [formData, setFormData] = useState<WorkCompletionReportData>({
    workSummary: '',
    workDetails: '',
    materialsUsed: '',
    actualDurationHours: 0,
    actualCost: undefined,
    issuesEncountered: '',
    recommendations: '',
    beforePhotos: [],
    afterPhotos: [],
    documents: [],
    qualityAssurance: {
      workCompleted: false,
      areaClean: false,
      clientInformed: false,
      warrantyGiven: false
    }
  })

  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState<'details' | 'photos' | 'qa'>('details')

  const handleInputChange = (field: keyof WorkCompletionReportData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  const handleQAChange = (field: keyof WorkCompletionReportData['qualityAssurance'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      qualityAssurance: { ...prev.qualityAssurance, [field]: value }
    }))
  }

  const handleFileChange = (field: 'beforePhotos' | 'afterPhotos' | 'documents', files: FileList) => {
    const fileArray = Array.from(files)
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ...fileArray] }))
  }

  const removeFile = (field: 'beforePhotos' | 'afterPhotos' | 'documents', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): string | null => {
    if (!formData.workSummary.trim()) return "Le résumé des travaux est requis"
    if (!formData.workDetails.trim()) return "Le détail des travaux est requis"
    if (formData.actualDurationHours <= 0) return "La durée réelle doit être positive"
    if (formData.afterPhotos.length === 0) return "Au moins une photo après travaux est requise"

    // Vérifier que tous les points de qualité sont validés
    const qaValues = Object.values(formData.qualityAssurance)
    if (!qaValues.every(val => val)) return "Tous les points d'assurance qualité doivent être validés"

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
          workSummary: '',
          workDetails: '',
          materialsUsed: '',
          actualDurationHours: 0,
          actualCost: undefined,
          issuesEncountered: '',
          recommendations: '',
          beforePhotos: [],
          afterPhotos: [],
          documents: [],
          qualityAssurance: {
            workCompleted: false,
            areaClean: false,
            clientInformed: false,
            warrantyGiven: false
          }
        })
        setCurrentSection('details')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    }
  }

  const SectionIndicator = ({ section, label, isActive, isCompleted }: {
    section: string
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
{isCompleted ? <CheckCircle className="h-3 w-3" /> : section === 'details' ? '1' : section === 'photos' ? '2' : '3'}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )

  const isDetailsComplete = formData.workSummary.trim() && formData.workDetails.trim() && formData.actualDurationHours > 0
  const isPhotosComplete = formData.afterPhotos.length > 0
  const isQAComplete = Object.values(formData.qualityAssurance).every(val => val)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            <span>Rapport de fin de travaux</span>
          </DialogTitle>
          <p className="text-sm text-gray-600">{intervention.title}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <SectionIndicator
              section="details"
              label="Détails des travaux"
              isActive={currentSection === 'details'}
              isCompleted={isDetailsComplete}
            />
            <div className="flex-1 h-px bg-gray-300 mx-4" />
            <SectionIndicator
              section="photos"
              label="Photos & Documents"
              isActive={currentSection === 'photos'}
              isCompleted={isPhotosComplete}
            />
            <div className="flex-1 h-px bg-gray-300 mx-4" />
            <SectionIndicator
              section="qa"
              label="Assurance Qualité"
              isActive={currentSection === 'qa'}
              isCompleted={isQAComplete}
            />
          </div>

          {/* Section: Détails des travaux */}
          {currentSection === 'details' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Détails des travaux effectués</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="workSummary">Résumé des travaux *</Label>
                    <Textarea
                      id="workSummary"
                      value={formData.workSummary}
                      onChange={(e) => handleInputChange('workSummary', e.target.value)}
                      placeholder="Résumé concis des travaux réalisés"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="workDetails">Description détaillée *</Label>
                    <Textarea
                      id="workDetails"
                      value={formData.workDetails}
                      onChange={(e) => handleInputChange('workDetails', e.target.value)}
                      placeholder="Description précise des interventions, méthodes utilisées, étapes suivies..."
                      rows={5}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="actualDuration">Durée réelle (heures) *</Label>
                      <Input
                        id="actualDuration"
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={formData.actualDurationHours || ''}
                        onChange={(e) => handleInputChange('actualDurationHours', parseFloat(e.target.value) || 0)}
                        placeholder="Ex: 4.5"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="actualCost">Coût réel (€)</Label>
                      <Input
                        id="actualCost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.actualCost || ''}
                        onChange={(e) => handleInputChange('actualCost', parseFloat(e.target.value) || undefined)}
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="materialsUsed">Matériaux utilisés</Label>
                    <Textarea
                      id="materialsUsed"
                      value={formData.materialsUsed}
                      onChange={(e) => handleInputChange('materialsUsed', e.target.value)}
                      placeholder="Liste des matériaux, pièces détachées, consommables utilisés"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="issues">Problèmes rencontrés</Label>
                    <Textarea
                      id="issues"
                      value={formData.issuesEncountered}
                      onChange={(e) => handleInputChange('issuesEncountered', e.target.value)}
                      placeholder="Difficultés, imprévus, problèmes techniques rencontrés"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="recommendations">Recommandations</Label>
                    <Textarea
                      id="recommendations"
                      value={formData.recommendations}
                      onChange={(e) => handleInputChange('recommendations', e.target.value)}
                      placeholder="Conseils d'entretien, préconisations, interventions futures recommandées"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section: Photos & Documents */}
          {currentSection === 'photos' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Photos avant/après & Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Photos avant */}
                  <div>
                    <Label className="flex items-center space-x-2 mb-2">
                      <Camera className="h-4 w-4" />
                      <span>Photos avant travaux</span>
                    </Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileChange('beforePhotos', e.target.files)}
                      className="mb-2"
                    />
                    {formData.beforePhotos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {formData.beforePhotos.map((file, index) => (
                          <div key={index} className="relative bg-gray-50 rounded p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile('beforePhotos', index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Photos après */}
                  <div>
                    <Label className="flex items-center space-x-2 mb-2">
                      <Camera className="h-4 w-4" />
                      <span>Photos après travaux *</span>
                    </Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => e.target.files && handleFileChange('afterPhotos', e.target.files)}
                      className="mb-2"
                      required
                    />
                    {formData.afterPhotos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {formData.afterPhotos.map((file, index) => (
                          <div key={index} className="relative bg-green-50 rounded p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs truncate">{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile('afterPhotos', index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Documents */}
                  <div>
                    <Label className="flex items-center space-x-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <span>Documents complémentaires</span>
                    </Label>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files && handleFileChange('documents', e.target.files)}
                      className="mb-2"
                    />
                    <p className="text-xs text-gray-500 mb-2">
                      Factures, garanties, manuels, certificats...
                    </p>
                    {formData.documents.length > 0 && (
                      <div className="space-y-1">
                        {formData.documents.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-blue-50 rounded p-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{file.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile('documents', index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Section: Assurance Qualité */}
          {currentSection === 'qa' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assurance Qualité</CardTitle>
                  <p className="text-sm text-gray-600">
                    Vérifiez tous les points avant de finaliser le rapport
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'workCompleted', label: 'Tous les travaux demandés ont été réalisés', icon: Wrench },
                    { key: 'areaClean', label: 'La zone de travail a été nettoyée', icon: CheckCircle },
                    { key: 'clientInformed', label: 'Le client a été informé de la fin des travaux', icon: User },
                    { key: 'warrantyGiven', label: 'Les informations de garantie ont été communiquées', icon: FileText }
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <input
                        type="checkbox"
                        id={key}
                        checked={formData.qualityAssurance[key as keyof typeof formData.qualityAssurance]}
                        onChange={(e) => handleQAChange(key as keyof typeof formData.qualityAssurance, e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <Icon className="h-4 w-4 text-gray-500" />
                      <label htmlFor={key} className="text-sm font-medium text-gray-900 flex-1 cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}

                  {isQAComplete && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="text-green-700">
                        Tous les points d'assurance qualité sont validés. Vous pouvez finaliser le rapport.
                      </AlertDescription>
                    </Alert>
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
            {currentSection !== 'details' && (
              <Button
                variant="outline"
                onClick={() => setCurrentSection(
                  currentSection === 'qa' ? 'photos' : 'details'
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

            {currentSection !== 'qa' ? (
              <Button
                onClick={() => setCurrentSection(
                  currentSection === 'details' ? 'photos' : 'qa'
                )}
                disabled={currentSection === 'details' ? !isDetailsComplete : !isPhotosComplete}
              >
                Suivant
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !isQAComplete}
                className="min-w-[120px]"
              >
                {isLoading ? 'Finalisation...' : 'Finaliser les travaux'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}