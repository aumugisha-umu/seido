"use client"

import { useState, useEffect } from "react"
import { FileText, User, MapPin, Wrench, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
// Removed unused Input import
// Removed unused Checkbox import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// Removed unused Separator import
import ContactSelector from "@/components/ui/contact-selector"
import { logger, logError } from '@/lib/logger'
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  // isBuildingWideIntervention,
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
  intervention: { id: string; title: string; description: string; [key: string]: unknown } | null
  additionalNotes: string
  selectedProviderIds: string[]
  selectedProviders: Provider[]
  individualMessages: Record<string, string>
  providers: Provider[]
  onNotesChange: (_notes: string) => void
  onProviderToggle: (provider: Provider) => void
  onIndividualMessageChange: (providerId: string, message: string) => void
  onSubmit: () => void
  isLoading: boolean
  error: string | null
  teamId: string
}

export const MultiQuoteRequestModal = ({
  isOpen,
  onClose,
  intervention,
  additionalNotes,
  selectedProviderIds,
  selectedProviders,
  individualMessages,
  providers,
  onNotesChange,
  onProviderToggle,
  onIndividualMessageChange,
  onSubmit,
  isLoading,
  error,
  teamId
}: MultiQuoteRequestModalProps) => {
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>(providers || [])

  // Callback pour la sélection de contact via le ContactSelector
  const handleContactSelect = (contactId: string) => {
    const provider = providers.find(p => p.id === contactId)
    if (provider) {
      onProviderToggle(provider)
    }
  }

  // Callback pour la création d'un nouveau contact
  const handleContactCreated = (contact: { id: string; name: string; [key: string]: unknown }) => {
    // Pour l'instant, nous ne gérons pas la création depuis la modale de devis
    logger.info('Nouveau contact créé:', contact)
    // TODO: Ajouter le nouveau prestataire à la liste des providers
  }

  useEffect(() => {
    // Si pas d'intervention, afficher tous les prestataires
    if (!intervention) {
      setFilteredProviders(providers || [])
      return
    }

    // Si pas de providers, liste vide
    if (!providers || providers.length === 0) {
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
    const finalProviders = relevantProviders.length === 0 && providers.length > 0 ? providers : relevantProviders

    if (relevantProviders.length === 0 && providers.length > 0) {
      logger.warn(`🚨 Aucun prestataire trouvé pour le type "${intervention.type}", affichage de tous les prestataires disponibles`)
    }

    setFilteredProviders(finalProviders)
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

          {/* Instructions générales */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-900">
              Instructions générales
            </Label>
            <Textarea
              id="notes"
              placeholder="Instructions communes à tous les prestataires..."
              value={additionalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Ces informations seront envoyées à tous les prestataires sélectionnés
            </p>
            <p className="text-xs text-slate-500 font-medium">
              📅 Date limite automatique : 30 jours à partir d'aujourd'hui
            </p>
          </div>

          {/* Sélection des prestataires avec ContactSelector */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-900">
              Sélection des prestataires
            </Label>
            <ContactSelector
              contacts={filteredProviders.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phone: p.phone,
                speciality: p.provider_category
              }))}
              selectedContactIds={selectedProviderIds}
              onContactSelect={handleContactSelect}
              onContactCreated={handleContactCreated}
              contactType="prestataire"
              placeholder="Sélectionnez les prestataires pour cette intervention"
              teamId={teamId}
            />
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
