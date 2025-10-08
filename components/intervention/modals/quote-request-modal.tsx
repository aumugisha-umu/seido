"use client"

import { useState, useEffect } from "react"
import { FileText, User, Calendar, MessageSquare, MapPin, Wrench, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateTimePicker } from "@/components/ui/date-time-picker"
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

interface QuoteRequestModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: any | null
  deadline: string
  additionalNotes: string
  selectedProviderId: string
  providers: Provider[]
  onDeadlineChange: (deadline: string) => void
  onNotesChange: (notes: string) => void
  onProviderSelect: (providerId: string, providerName: string) => void
  onSubmit: () => void
  isLoading: boolean
  error: string | null
}

export const QuoteRequestModal = ({
  isOpen,
  onClose,
  intervention,
  deadline,
  additionalNotes,
  selectedProviderId,
  providers,
  onDeadlineChange,
  onNotesChange,
  onProviderSelect,
  onSubmit,
  isLoading,
  error
}: QuoteRequestModalProps) => {
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])

  useEffect(() => {
    if (!intervention || !providers) {
      setFilteredProviders([])
      return
    }

    // Filtrer les prestataires selon le type d'intervention avec logique plus inclusive
    const relevantProviders = providers.filter(provider => {
      // Si le prestataire n'a pas de catégorie définie, l'inclure par défaut
      if (!provider.provider_category) return true
      
      // Si l'intervention n'a pas de type spécifié, inclure tous les prestataires
      if (!intervention.type) return true

      // Correspondances type intervention -> catégorie prestataire (plus inclusives)
      const typeMapping: Record<string, string[]> = {
        'plomberie': ['prestataire', 'autre'], // Inclut prestataires génériques
        'electricite': ['prestataire', 'autre'],
        'chauffage': ['prestataire', 'autre'],
        'serrurerie': ['prestataire', 'autre'],
        'peinture': ['prestataire', 'autre'],
        'menage': ['prestataire', 'autre'],
        'jardinage': ['prestataire', 'autre'],
        'autre': ['prestataire', 'autre', 'syndic', 'assurance', 'notaire', 'proprietaire'] // Très inclusif pour "autre"
      }

      const relevantCategories = typeMapping[intervention.type] || ['prestataire', 'autre']
      return relevantCategories.includes(provider.provider_category)
    })

    // Logique de fallback : si aucun prestataire ne correspond au filtrage, afficher tous les prestataires
    if (relevantProviders.length === 0 && providers.length > 0) {
      console.warn(`🚨 Aucun prestataire trouvé pour le type "${intervention.type}", affichage de tous les prestataires disponibles`)
      setFilteredProviders(providers)
    } else {
      setFilteredProviders(relevantProviders)
    }
  }, [intervention, providers])

  if (!intervention) return null

  const selectedProvider = filteredProviders.find(p => p.id === selectedProviderId)

  const handleSubmit = () => {
    if (!selectedProviderId) return
    onSubmit()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900 leading-snug">
            Demander un devis
          </DialogTitle>
          <p className="text-slate-600">
            Sélectionnez un prestataire et définissez les modalités pour la demande de devis
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

          {/* Sélection du prestataire */}
          <div className="space-y-3">
            <Label htmlFor="provider-select" className="text-sm font-medium text-slate-900">
              Prestataire *
            </Label>

            <Select value={selectedProviderId} onValueChange={(value) => {
              const provider = filteredProviders.find(p => p.id === value)
              if (provider) {
                onProviderSelect(value, provider.name)
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un prestataire..." />
              </SelectTrigger>
              <SelectContent>
                {filteredProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{provider.name}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{provider.email}</span>
                        {provider.provider_category && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{provider.provider_category}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filteredProviders.length === 0 && providers.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span>Aucun prestataire n'a été ajouté à votre équipe. Ajoutez des prestataires dans la section Contacts.</span>
              </div>
            )}
            
            {filteredProviders.length === 0 && providers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
                <AlertTriangle className="h-4 w-4" />
                <span>Tous vos prestataires sont affichés car aucun ne correspond spécifiquement au type "{intervention.type || 'non spécifié'}".</span>
              </div>
            )}
          </div>

          {/* Date limite */}
          <div className="space-y-3">
            <DateTimePicker
              mode="date"
              dateValue={deadline}
              onDateChange={onDeadlineChange}
              dateLabel="Date limite pour le devis"
              datePlaceholder="Sélectionner une date"
              minDate={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-slate-500">
              Le prestataire sera notifié de cette échéance
            </p>
          </div>

          {/* Notes supplémentaires */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-900">
              Instructions supplémentaires
            </Label>
            <Textarea
              id="notes"
              placeholder="Précisions sur les travaux, contraintes d'accès, matériaux spécifiques..."
              value={additionalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Ces informations aideront le prestataire à établir un devis précis
            </p>
          </div>

          {/* Informations sélectionnées */}
          {selectedProvider && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-blue-900">{selectedProvider.name}</p>
                  <p className="text-sm text-blue-700">{selectedProvider.email}</p>
                  {selectedProvider.phone && (
                    <p className="text-sm text-blue-700">{selectedProvider.phone}</p>
                  )}
                  {selectedProvider.provider_category && (
                    <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                      {selectedProvider.provider_category}
                    </Badge>
                  )}
                </div>
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
            disabled={!selectedProviderId || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Envoi...</span>
              </div>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Demander le devis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}