"use client"

import { useState, useEffect } from "react"
import { FileText, User, MapPin, Wrench, Clock, AlertTriangle, Calendar, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { logger } from '@/lib/logger'
import { cn } from "@/lib/utils"
import {
  getInterventionLocationText,
  getInterventionLocationIcon,
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

interface InterventionForQuote {
  id: string
  title: string
  description?: string
  type?: string
  urgency?: string
  created_at: string
}

interface QuoteRequestModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: InterventionForQuote | null
  deadline: string
  additionalNotes: string
  selectedProviderId: string
  providers: Provider[]
  onDeadlineChange: (_deadline: string) => void
  onNotesChange: (_notes: string) => void
  onProviderSelect: (providerId: string, providerName: string) => void
  onSubmit: () => void
  isLoading: boolean
  error: string | null
}

type RequestMode = "quote" | "schedule"

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
  const [requestMode, setRequestMode] = useState<RequestMode>("quote")

  // États pour le mode planification directe
  const [scheduledDate, setScheduledDate] = useState("")
  const [scheduledTime, setScheduledTime] = useState("09:00")

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
        'plomberie': ['prestataire', 'autre'],
        'electricite': ['prestataire', 'autre'],
        'chauffage': ['prestataire', 'autre'],
        'serrurerie': ['prestataire', 'autre'],
        'peinture': ['prestataire', 'autre'],
        'menage': ['prestataire', 'autre'],
        'jardinage': ['prestataire', 'autre'],
        'autre': ['prestataire', 'autre']
      }

      const relevantCategories = typeMapping[intervention.type] || ['prestataire', 'autre']
      return relevantCategories.includes(provider.provider_category)
    })

    // Logique de fallback : si aucun prestataire ne correspond au filtrage, afficher tous les prestataires
    if (relevantProviders.length === 0 && providers.length > 0) {
      logger.warn(`🚨 Aucun prestataire trouvé pour le type "${intervention.type}", affichage de tous les prestataires disponibles`)
      setFilteredProviders(providers)
    } else {
      setFilteredProviders(relevantProviders)
    }
  }, [intervention, providers])

  // Réinitialiser les états quand la modale s'ouvre
  useEffect(() => {
    if (isOpen) {
      setRequestMode("quote")
      setScheduledDate("")
      setScheduledTime("09:00")
    }
  }, [isOpen])

  if (!intervention) return null

  const selectedProvider = filteredProviders.find(p => p.id === selectedProviderId)

  // Validation pour chaque mode
  const isFormValid = () => {
    if (!selectedProviderId) return false

    if (requestMode === "quote") {
      return true // Mode devis : juste besoin d'un prestataire
    } else {
      // Mode planification : besoin d'un prestataire + date + heure
      return scheduledDate !== "" && scheduledTime !== ""
    }
  }

  const handleSubmit = () => {
    if (!isFormValid()) return

    // Log pour debug
    logger.info(`📋 Soumission demande - Mode: ${requestMode}`, {
      providerId: selectedProviderId,
      providerName: selectedProvider?.name,
      scheduledDate: requestMode === "schedule" ? scheduledDate : undefined,
      scheduledTime: requestMode === "schedule" ? scheduledTime : undefined,
      deadline: requestMode === "quote" ? deadline : undefined,
      notes: additionalNotes
    })

    onSubmit()
  }

  // Configuration des titres selon le mode
  const getTitle = () => {
    return requestMode === "quote" ? "Demander un devis" : "Planifier l'intervention"
  }

  const getDescription = () => {
    return requestMode === "quote"
      ? "Sélectionnez un prestataire et définissez les modalités pour la demande de devis"
      : "Planifiez directement l'intervention avec un prestataire sans passer par la demande de devis"
  }

  const getSubmitButtonText = () => {
    if (isLoading) return "Envoi..."
    return requestMode === "quote" ? "Demander le devis" : "Planifier l'intervention"
  }

  const getSubmitButtonIcon = () => {
    return requestMode === "quote" ? FileText : CalendarDays
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900 leading-snug">
            {getTitle()}
          </DialogTitle>
          <p className="text-slate-600">
            {getDescription()}
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

          {/* Tabs pour choisir le mode */}
          <Tabs value={requestMode} onValueChange={(value) => setRequestMode(value as RequestMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quote" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Demander des devis
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Planifier directement
              </TabsTrigger>
            </TabsList>

            {/* Contenu conditionnel selon le mode */}
            <div className="pt-6 space-y-6">
              {/* Sélection du prestataire - Commun aux deux modes */}
              <div className="space-y-3">
                <Label htmlFor="provider-select" className="text-sm font-medium text-slate-900">
                  {requestMode === "quote" ? "Prestataire *" : "Prestataire unique *"}
                </Label>
                <p className="text-xs text-slate-500">
                  {requestMode === "quote"
                    ? "Sélectionnez le prestataire qui recevra la demande de devis"
                    : "Sélectionnez le prestataire qui réalisera l'intervention"}
                </p>

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

              <Separator />

              {/* Mode DEVIS - Date limite */}
              <TabsContent value="quote" className="space-y-6 mt-0">
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
                    Le prestataire sera notifié de cette échéance
                  </p>
                </div>

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
              </TabsContent>

              {/* Mode PLANIFICATION - Date et heure */}
              <TabsContent value="schedule" className="space-y-6 mt-0">
                <div className="bg-sky-50/30 border border-sky-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 text-sky-700">
                    <CalendarDays className="h-5 w-5" />
                    <h3 className="font-medium">Définir le rendez-vous</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date */}
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-date" className="text-sm font-medium text-slate-900">
                        Date du rendez-vous *
                      </Label>
                      <Input
                        id="scheduled-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className={cn(
                          "w-full",
                          !scheduledDate && "border-amber-300 focus:border-amber-500"
                        )}
                      />
                    </div>

                    {/* Heure */}
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time" className="text-sm font-medium text-slate-900">
                        Heure du rendez-vous *
                      </Label>
                      <Input
                        id="scheduled-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className={cn(
                          "w-full",
                          !scheduledTime && "border-amber-300 focus:border-amber-500"
                        )}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600">
                    L'intervention sera directement planifiée à cette date avec le prestataire sélectionné
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="schedule-notes" className="text-sm font-medium text-slate-900">
                    Instructions pour le prestataire
                  </Label>
                  <Textarea
                    id="schedule-notes"
                    placeholder="Informations d'accès, consignes particulières, matériel nécessaire..."
                    value={additionalNotes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Ces instructions seront transmises au prestataire avec la confirmation
                  </p>
                </div>
              </TabsContent>

              {/* Informations sélectionnées - Commun aux deux modes */}
              {selectedProvider && (
                <div className={cn(
                  "border rounded-lg p-4",
                  requestMode === "quote" ? "bg-blue-50 border-blue-200" : "bg-sky-50 border-sky-200"
                )}>
                  <div className="flex items-start gap-3">
                    <User className={cn(
                      "h-5 w-5 mt-0.5",
                      requestMode === "quote" ? "text-blue-600" : "text-sky-600"
                    )} />
                    <div className="space-y-1 flex-1">
                      <p className={cn(
                        "font-medium",
                        requestMode === "quote" ? "text-blue-900" : "text-sky-900"
                      )}>
                        {selectedProvider.name}
                      </p>
                      <p className={cn(
                        "text-sm",
                        requestMode === "quote" ? "text-blue-700" : "text-sky-700"
                      )}>
                        {selectedProvider.email}
                      </p>
                      {selectedProvider.phone && (
                        <p className={cn(
                          "text-sm",
                          requestMode === "quote" ? "text-blue-700" : "text-sky-700"
                        )}>
                          {selectedProvider.phone}
                        </p>
                      )}
                      {selectedProvider.provider_category && (
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          requestMode === "quote"
                            ? "bg-blue-100 text-blue-700 border-blue-300"
                            : "bg-sky-100 text-sky-700 border-sky-300"
                        )}>
                          {selectedProvider.provider_category}
                        </Badge>
                      )}

                      {/* Récapitulatif de la planification */}
                      {requestMode === "schedule" && scheduledDate && scheduledTime && (
                        <div className="mt-3 pt-3 border-t border-sky-200">
                          <div className="flex items-center gap-2 text-sm text-sky-700">
                            <Calendar className="h-4 w-4" />
                            <span className="font-medium">
                              {new Date(scheduledDate).toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-sky-700 mt-1">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {scheduledTime}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs>

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
            disabled={!isFormValid() || isLoading}
            className={cn(
              "min-w-[180px]",
              requestMode === "schedule" && "bg-sky-600 hover:bg-sky-700"
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Envoi...</span>
              </div>
            ) : (
              <>
                {(() => {
                  const Icon = getSubmitButtonIcon()
                  return <Icon className="h-4 w-4 mr-2" />
                })()}
                {getSubmitButtonText()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
