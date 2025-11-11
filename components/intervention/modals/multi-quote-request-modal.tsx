"use client"

import { useState, useEffect } from "react"
import { FileText, User, MapPin, Wrench, Clock, AlertTriangle, Calendar, AlertCircle, CalendarDays } from "lucide-react"
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
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { logger, logError } from '@/lib/logger'
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
  // isBuildingWideIntervention,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

// Helper function pour formater les dates de manière sécurisée
const formatInterventionDate = (dateValue: unknown): string => {
  if (!dateValue) return "Date non spécifiée"
  try {
    const date = new Date(dateValue as string)
    if (isNaN(date.getTime())) return "Date non spécifiée"
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    })
  } catch {
    return "Date non spécifiée"
  }
}

interface Provider {
  id: string
  name: string
  email: string
  phone?: string
  provider_category?: string
}

interface IneligibleProvider {
  id: string
  reason: string
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
  ineligibleProviders?: IneligibleProvider[]
  onNotesChange: (_notes: string) => void
  onProviderToggle: (provider: Provider) => void
  onIndividualMessageChange: (providerId: string, message: string) => void
  onSubmit: () => void
  onScheduleDirect?: (date: string, startTime: string, providerIds: string[]) => void
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
  ineligibleProviders = [],
  onNotesChange,
  onProviderToggle,
  onIndividualMessageChange,
  onSubmit,
  onScheduleDirect,
  isLoading,
  error,
  teamId
}: MultiQuoteRequestModalProps) => {
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>(providers || [])

  // Mode selection: 'quote' or 'schedule'
  const [requestMode, setRequestMode] = useState<'quote' | 'schedule'>('quote')

  // Schedule state for direct scheduling
  const [scheduleDate, setScheduleDate] = useState<string>('')
  const [scheduleTime, setScheduleTime] = useState<string>('')

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
        'autre': ['prestataire', 'autre'] // Inclut tous les types de prestataires
      }

      const relevantCategories = typeMapping[intervention.type as string] || ['prestataire', 'autre']
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

    if (requestMode === 'schedule') {
      // Direct scheduling mode
      if (!scheduleDate || !scheduleTime) {
        logger.error('Date and time are required for direct scheduling')
        return
      }
      if (onScheduleDirect) {
        onScheduleDirect(scheduleDate, scheduleTime, selectedProviderIds)
      }
    } else {
      // Quote request mode
      onSubmit()
    }
  }

  const isSubmitDisabled = () => {
    if (selectedProviderIds.length === 0) return true
    if (requestMode === 'schedule' && (!scheduleDate || !scheduleTime)) return true
    return false
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900 leading-snug">
            {requestMode === 'quote' ? 'Demande de devis' : 'Planification directe'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Quote Request Mode */}
            <button
              type="button"
              onClick={() => setRequestMode('quote')}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                requestMode === 'quote'
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  requestMode === 'quote' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <FileText className={`h-5 w-5 ${
                    requestMode === 'quote' ? 'text-blue-600' : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm mb-1 ${
                    requestMode === 'quote' ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    Demander des devis
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Solliciter plusieurs prestataires pour comparer les offres
                  </p>
                </div>
              </div>
              {requestMode === 'quote' && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </button>

            {/* Direct Schedule Mode */}
            <button
              type="button"
              onClick={() => setRequestMode('schedule')}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                requestMode === 'schedule'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  requestMode === 'schedule' ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                  <CalendarDays className={`h-5 w-5 ${
                    requestMode === 'schedule' ? 'text-emerald-600' : 'text-slate-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm mb-1 ${
                    requestMode === 'schedule' ? 'text-emerald-900' : 'text-slate-900'
                  }`}>
                    Planifier directement
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Fixer immédiatement la date et l'heure du rendez-vous
                  </p>
                </div>
              </div>
              {requestMode === 'schedule' && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </button>
          </div>

          {/* Résumé de l'intervention - Card améliorée */}
          <Card className={`border-l-4 ${
            intervention.urgency === "urgente" ? "border-l-red-500" :
            intervention.urgency === "haute" ? "border-l-orange-500" :
            intervention.urgency === "normale" ? "border-l-blue-500" :
            "border-l-gray-300"
          } shadow-sm`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="line-clamp-2">{intervention.title}</span>
                </CardTitle>
                <Badge className={`${getPriorityColor(intervention.urgency)} text-xs whitespace-nowrap flex-shrink-0`}>
                  {getPriorityLabel(intervention.urgency)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Métadonnées en grid 2 colonnes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Localisation */}
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Localisation</p>
                    <p className="text-sm text-slate-900 mt-0.5 truncate">{getInterventionLocationText(intervention)}</p>
                  </div>
                </div>

                {/* Type d'intervention */}
                <div className="flex items-start gap-2.5">
                  <Wrench className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Type</p>
                    <p className={`text-sm mt-0.5 capitalize truncate ${!intervention.type ? "text-slate-400 italic" : "text-slate-900"}`}>
                      {intervention.type || "Type non spécifié"}
                    </p>
                  </div>
                </div>

                {/* Date de création */}
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Créée le</p>
                    <p className={`text-sm mt-0.5 ${!intervention.created_at ? "text-slate-400 italic" : "text-slate-900"}`}>
                      {formatInterventionDate(intervention.created_at)}
                    </p>
                  </div>
                </div>

                {/* Priorité */}
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Priorité</p>
                    <p className="text-sm text-slate-900 mt-0.5 capitalize">{getPriorityLabel(intervention.urgency)}</p>
                  </div>
                </div>
              </div>

              {/* Description (si présente) */}
              {intervention.description && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {intervention.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions générales (only in quote mode) */}
          {requestMode === 'quote' && (
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
          )}

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
              ineligibleContactIds={ineligibleProviders.map(ip => ip.id)}
              ineligibilityReasons={Object.fromEntries(
                ineligibleProviders.map(ip => [ip.id, ip.reason])
              )}
              onContactSelect={handleContactSelect}
              onContactCreated={handleContactCreated}
              contactType="prestataire"
              placeholder="Sélectionnez les prestataires pour cette intervention"
              teamId={teamId}
            />
          </div>

          {/* Direct Scheduling Section (only in schedule mode) */}
          {requestMode === 'schedule' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900">
                  Définir le rendez-vous
                </h3>
              </div>

              <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-lg">
                <DateTimePicker
                  mode="datetime"
                  dateValue={scheduleDate}
                  timeValue={scheduleTime}
                  onDateChange={setScheduleDate}
                  onTimeChange={setScheduleTime}
                  dateLabel="Date du rendez-vous"
                  timeLabel="Heure du rendez-vous"
                  required
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              <p className="text-xs text-slate-600">
                Les prestataires sélectionnés seront notifiés de ce rendez-vous
              </p>
            </div>
          )}

          {/* Messages individualisés (only in quote mode) */}
          {requestMode === 'quote' && selectedProviders.length > 0 && (
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
            disabled={isSubmitDisabled() || isLoading}
            className={`min-w-[140px] ${
              requestMode === 'schedule' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>{requestMode === 'schedule' ? 'Planification...' : 'Envoi...'}</span>
              </div>
            ) : requestMode === 'schedule' ? (
              <>
                <CalendarDays className="h-4 w-4 mr-2" />
                Planifier le rendez-vous
              </>
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
