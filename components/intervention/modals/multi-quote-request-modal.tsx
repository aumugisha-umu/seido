"use client"

import { useState, useEffect } from "react"
import { FileText, User, Calendar, MessageSquare, MapPin, Wrench, Clock, AlertTriangle, Plus, Minus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  isBuildingWideIntervention,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

interface Provider {
  id: string
  name: string
  email: string
  phone?: string
  provider_category?: string
}

interface MultiQuoteRequestModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: any | null
  deadline: string
  additionalNotes: string
  selectedProviderIds: string[]
  selectedProviders: Provider[]
  individualMessages: Record<string, string>
  providers: Provider[]
  onDeadlineChange: (deadline: string) => void
  onNotesChange: (notes: string) => void
  onProviderToggle: (provider: Provider) => void
  onIndividualMessageChange: (providerId: string, message: string) => void
  onSubmit: () => void
  isLoading: boolean
  error: string | null
}

export const MultiQuoteRequestModal = ({
  isOpen,
  onClose,
  intervention,
  deadline,
  additionalNotes,
  selectedProviderIds,
  selectedProviders,
  individualMessages,
  providers,
  onDeadlineChange,
  onNotesChange,
  onProviderToggle,
  onIndividualMessageChange,
  onSubmit,
  isLoading,
  error
}: MultiQuoteRequestModalProps) => {
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])

  useEffect(() => {
    if (!intervention || !providers) {
      setFilteredProviders([])
      return
    }

    // Filtrer les prestataires selon le type d'intervention
    const relevantProviders = providers.filter(provider => {
      if (!provider.provider_category || !intervention.type) return true

      // Correspondances type intervention -> catégorie prestataire
      const typeMapping: Record<string, string[]> = {
        'plomberie': ['plomberie', 'maintenance', 'general'],
        'electricite': ['electricite', 'maintenance', 'general'],
        'chauffage': ['chauffage', 'plomberie', 'maintenance', 'general'],
        'serrurerie': ['serrurerie', 'maintenance', 'general'],
        'peinture': ['peinture', 'maintenance', 'general'],
        'menage': ['menage', 'maintenance', 'general'],
        'jardinage': ['jardinage', 'maintenance', 'general'],
        'autre': ['maintenance', 'general']
      }

      const relevantCategories = typeMapping[intervention.type] || ['maintenance', 'general']
      return relevantCategories.includes(provider.provider_category)
    })

    setFilteredProviders(relevantProviders)
  }, [intervention, providers])

  if (!intervention) return null

  const handleSubmit = () => {
    if (selectedProviderIds.length === 0) return
    onSubmit()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900 leading-snug">
            Demander des devis - Multi-prestataires
          </DialogTitle>
          <p className="text-slate-600">
            Sélectionnez plusieurs prestataires et personnalisez les messages pour chacun
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé de l'intervention */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-slate-600" />
                {intervention.title}
              </h3>
              <Badge className={`${getPriorityColor(intervention.urgency)} text-xs`}>
                {getPriorityLabel(intervention.urgency)}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                {getInterventionLocationIcon(intervention) === "building" ? (
                  <MapPin className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span>{getInterventionLocationText(intervention)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Wrench className="h-4 w-4" />
                <span className="capitalize">{intervention.type || "Non spécifié"}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{new Date(intervention.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>

            {intervention.description && (
              <p className="text-sm text-slate-700 bg-white rounded px-3 py-2">
                {intervention.description}
              </p>
            )}
          </div>

          {/* Configuration générale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date limite */}
            <div className="space-y-3">
              <Label htmlFor="deadline" className="text-sm font-medium text-slate-900">
                Date limite pour le devis
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
              <p className="text-xs text-slate-500">
                Tous les prestataires seront notifiés de cette échéance
              </p>
            </div>

            {/* Notes générales */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-sm font-medium text-slate-900">
                Instructions générales
              </Label>
              <Textarea
                id="notes"
                placeholder="Instructions communes à tous les prestataires..."
                value={additionalNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-slate-500">
                Ces informations seront envoyées à tous les prestataires sélectionnés
              </p>
            </div>
          </div>

          {/* Sélection des prestataires */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-900">
                Prestataires disponibles ({filteredProviders.length})
              </Label>
              <Badge variant="outline" className="text-xs">
                {selectedProviderIds.length} sélectionné{selectedProviderIds.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {filteredProviders.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span>Aucun prestataire disponible pour ce type d'intervention</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProviders.map((provider) => {
                  const isSelected = selectedProviderIds.includes(provider.id)
                  return (
                    <Card
                      key={provider.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => onProviderToggle(provider)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="font-medium text-slate-900">{provider.name}</p>
                            <p className="text-sm text-slate-600">{provider.email}</p>
                            {provider.phone && (
                              <p className="text-sm text-slate-600">{provider.phone}</p>
                            )}
                            {provider.provider_category && (
                              <Badge variant="outline" className="text-xs">
                                {provider.provider_category}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          {/* Messages individualisés */}
          {selectedProviders.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-slate-900">
                Messages individualisés
              </Label>
              <p className="text-xs text-slate-500">
                Personnalisez le message pour chaque prestataire sélectionné
              </p>

              <div className="space-y-4">
                {selectedProviders.map((provider) => (
                  <Card key={provider.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {provider.name}
                        <Badge variant="outline" className="text-xs">
                          {provider.provider_category}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Textarea
                        value={individualMessages[provider.id] || additionalNotes}
                        onChange={(e) => onIndividualMessageChange(provider.id, e.target.value)}
                        placeholder={`Message spécifique pour ${provider.name}...`}
                        rows={3}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedProviderIds.length === 0 || isLoading}
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
                Demander {selectedProviderIds.length} devis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}