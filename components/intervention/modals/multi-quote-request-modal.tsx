"use client"

import { useState, useEffect } from "react"
import { FileText, User, Calendar, MessageSquare, MapPin, Wrench, Clock, AlertTriangle, ChevronRight, Building2, Users, Info, Send, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ContactSelector from "@/components/ui/contact-selector"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
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
  additionalNotes: string
  selectedProviderIds: string[]
  selectedProviders: Provider[]
  individualMessages: Record<string, string>
  providers: Provider[]
  onNotesChange: (notes: string) => void
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
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([])
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const { toast } = useToast()

  // Callback pour la sélection de contact via le ContactSelector
  const handleContactSelect = (contactId: string) => {
    const provider = providers.find(p => p.id === contactId)
    if (provider) {
      onProviderToggle(provider)
    }
  }

  // Callback pour la création d'un nouveau contact
  const handleContactCreated = (contact: any) => {
    console.log('Nouveau contact créé:', contact)
  }

  useEffect(() => {
    if (!intervention || !providers) {
      setFilteredProviders([])
      return
    }

    // Filtrer les prestataires selon le type d'intervention
    const relevantProviders = providers.filter(provider => {
      if (!provider.provider_category) return true
      if (!intervention.type) return true

      const typeMapping: Record<string, string[]> = {
        'plomberie': ['prestataire', 'autre'],
        'electricite': ['prestataire', 'autre'],
        'chauffage': ['prestataire', 'autre'],
        'serrurerie': ['prestataire', 'autre'],
        'peinture': ['prestataire', 'autre'],
        'menage': ['prestataire', 'autre'],
        'jardinage': ['prestataire', 'autre'],
        'autre': ['prestataire', 'autre', 'syndic', 'assurance', 'notaire', 'proprietaire']
      }

      const relevantCategories = typeMapping[intervention.type] || ['prestataire', 'autre']
      return relevantCategories.includes(provider.provider_category)
    })

    const finalProviders = relevantProviders.length === 0 && providers.length > 0 ? providers : relevantProviders

    if (relevantProviders.length === 0 && providers.length > 0) {
      console.warn(`Aucun prestataire trouvé pour le type "${intervention.type}", affichage de tous les prestataires disponibles`)
    }

    setFilteredProviders(finalProviders)
  }, [intervention, providers])

  if (!intervention) return null

  const handleSubmit = () => {
    if (selectedProviderIds.length === 0) return
    onSubmit()

    // Afficher la notification de succès
    toast({
      title: "✅ Demandes de devis envoyées",
      description: `${selectedProviderIds.length} prestataire${selectedProviderIds.length > 1 ? 's ont' : ' a'} reçu votre demande de devis pour "${intervention.title}"`,
      variant: "success"
    })
  }

  // Calcul de la date limite
  const deadlineDate = new Date()
  deadlineDate.setDate(deadlineDate.getDate() + 30)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="bg-gradient-to-r from-slate-50 to-gray-50 -m-6 mb-0 p-6 pb-4 rounded-t-lg border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl lg:text-2xl font-bold text-slate-900">
                  Demander des devis - {intervention.title}
                </DialogTitle>
                <Badge
                  className={cn(
                    "text-xs font-medium",
                    getPriorityColor(intervention.urgency)
                  )}
                >
                  {getPriorityLabel(intervention.urgency)}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Sélectionnez plusieurs prestataires et personnalisez les messages
              </p>
            </div>
            {selectedProviderIds.length > 0 && (
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 animate-in fade-in duration-300">
                {selectedProviderIds.length} sélectionné{selectedProviderIds.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Contenu scrollable avec padding optimisé */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
          {/* Carte intervention */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-5 space-y-4">
              {/* Informations du lot/bâtiment */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-600 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    {intervention.lot_id || intervention.lot ? (
                      <>
                        <p className="text-sm font-semibold text-slate-900">
                          Lot {intervention.lot?.reference || intervention.lot_reference || 'N/A'}
                        </p>
                        {intervention.lot?.building && (
                          <p className="text-xs text-slate-600">
                            {intervention.lot.building.address || intervention.building?.address}
                            {intervention.lot.building.city && `, ${intervention.lot.building.city}`}
                            {intervention.lot.building.postal_code && ` ${intervention.lot.building.postal_code}`}
                          </p>
                        )}
                        {intervention.building && !intervention.lot?.building && (
                          <p className="text-xs text-slate-600">
                            {intervention.building.address}
                            {intervention.building.city && `, ${intervention.building.city}`}
                            {intervention.building.postal_code && ` ${intervention.building.postal_code}`}
                          </p>
                        )}
                      </>
                    ) : intervention.building_id || intervention.building ? (
                      <>
                        <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          Bâtiment entier
                          <Badge variant="secondary" className="text-xs">
                            Intervention globale
                          </Badge>
                        </p>
                        <p className="text-xs text-slate-600">
                          {intervention.building?.address}
                          {intervention.building?.city && `, ${intervention.building.city}`}
                          {intervention.building?.postal_code && ` ${intervention.building.postal_code}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-600">Localisation non spécifiée</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Informations clés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <Wrench className="h-4 w-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Type d'intervention</p>
                    <p className="text-sm text-slate-700 font-medium capitalize">
                      {intervention.type || "Non spécifié"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">Date de création</p>
                    <p className="text-sm text-slate-700 font-medium">
                      {intervention.created_at ? new Date(intervention.created_at).toLocaleDateString("fr-FR") : "Non disponible"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {intervention.description && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {intervention.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Instructions */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes" className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-600" />
                Instructions générales
              </Label>
              <Badge variant="outline" className="text-xs">
                Obligatoire
              </Badge>
            </div>

            <Textarea
              id="notes"
              placeholder="Décrivez les détails importants pour cette intervention (accès, contraintes, attentes...)"
              value={additionalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
              className="resize-none border-slate-200 focus:border-slate-300 focus:ring-slate-200/50 transition-colors"
            />

            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-500 mt-0.5" />
                Ces informations seront envoyées à tous les prestataires sélectionnés
              </p>
              <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Date limite de réponse : {deadlineDate.toLocaleDateString("fr-FR", {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Sélection des prestataires */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-600" />
                Sélection des prestataires
              </Label>
              {filteredProviders.length > 0 && (
                <span className="text-xs text-slate-500">
                  {filteredProviders.length} disponible{filteredProviders.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <ContactSelector
              contacts={providers.map(p => ({
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
              placeholder="Rechercher et sélectionner des prestataires..."
              teamId={teamId}
            />

            {selectedProviderIds.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                Sélectionnez au moins un prestataire pour continuer
              </p>
            )}
          </div>

          {/* Messages individualisés */}
          {selectedProviders.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-slate-600" />
                  Messages personnalisés
                </Label>
                <Badge variant="outline" className="text-xs">
                  Optionnel
                </Badge>
              </div>

              <p className="text-sm text-slate-600">
                Ajoutez des instructions spécifiques pour chaque prestataire
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedProviders.map((provider) => (
                  <Card
                    key={provider.id}
                    className={cn(
                      "transition-all duration-200 border-slate-200",
                      hoveredCard === provider.id && "shadow-md border-slate-300 scale-[1.02]"
                    )}
                    onMouseEnter={() => setHoveredCard(provider.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <User className="h-3.5 w-3.5 text-slate-600" />
                          </div>
                          <span className="text-slate-900">{provider.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {provider.provider_category || 'Prestataire'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3">
                      <Textarea
                        value={individualMessages[provider.id] || ''}
                        onChange={(e) => onIndividualMessageChange(provider.id, e.target.value)}
                        placeholder={`Instructions spécifiques pour ${provider.name}...`}
                        rows={3}
                        className="resize-none text-sm border-slate-200 focus:border-slate-300 focus:ring-slate-200/50 transition-colors"
                      />
                      {individualMessages[provider.id] && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Message personnalisé ajouté
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Message d'erreur amélioré */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-red-100 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Erreur</p>
                  <p className="text-sm text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="border-t bg-white px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-slate-600">
              {selectedProviderIds.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Prêt à envoyer
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="hover:bg-slate-50 transition-colors"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={selectedProviderIds.length === 0 || isLoading}
                className="min-w-[160px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Envoi en cours...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    <span>
                      Demander devis
                    </span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}