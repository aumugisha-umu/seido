"use client"

import { useState } from "react"
import {
  Settings,
  Receipt,
  PlayCircle,
  MessageSquare,
  FileText,
  Users,
  Calendar,
  Clock,
  User,
  MapPin,
  Download,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { IntegratedQuotesSection } from "@/components/quotes/integrated-quotes-section"
import { UserAvailabilitiesDisplay } from "@/components/intervention/user-availabilities-display"

// Types pour les données d'intervention
interface DatabaseContact {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  provider_category?: string
  company?: string | null
  speciality?: string | null
  inChat?: boolean
}

interface InterventionDetail {
  id: string
  title: string
  description: string
  type: string
  urgency: string
  status: string
  createdAt: string
  createdBy: string
  reference: string
  requestedDate?: string
  scheduledDate?: string
  estimatedCost?: number
  finalCost?: number
  lot?: {
    id: string
    reference: string
    building: {
      id: string
      name: string
      address: string
      city: string
      postal_code: string
    }
    floor?: number
    apartment_number?: string
  }
  building?: {
    id: string
    name: string
    address: string
    city: string
    postal_code: string
  }
  tenant?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  manager?: {
    id: string
    name: string
    email: string
    phone?: string
  }
  assignedContact?: {
    id: string
    name: string
    email: string
    phone?: string
    speciality?: string
  }
  contacts: {
    locataires: DatabaseContact[]
    syndics: DatabaseContact[]
    autres: DatabaseContact[]
  }
  scheduling: {
    type: "fixed" | "slots" | "tbd"
    fixedDate?: string
    fixedTime?: string
    slots?: Array<{
      date: string
      startTime: string
      endTime: string
    }>
  }
  instructions: {
    type: "group" | "individual"
    groupMessage?: string
    individualMessages?: Array<{
      contactId: string
      message: string
    }>
  }
  attachments: Array<{
    name: string
    size: string
    type: string
    id?: string
    storagePath?: string
    uploadedAt?: string
    uploadedBy?: string
  }>
  availabilities: Array<{
    person: string
    role: string
    date: string
    startTime: string
    endTime: string
    userId?: string
  }>
  quotes: Array<{
    id: string
    providerId: string
    providerName: string
    providerSpeciality?: string
    totalAmount: number
    laborCost: number
    materialsCost: number
    description: string
    workDetails?: string
    estimatedDurationHours?: number
    estimatedStartDate?: string
    status: string
    submittedAt: string
    reviewedAt?: string
    reviewComments?: string
    rejectionReason?: string
    attachments: Array<{ id: string; name: string; url?: string; [key: string]: unknown }>
    isCurrentUserQuote?: boolean
  }>
}

interface QuoteRequest {
  id: string
  provider: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  assigned_at: string
  individual_message?: string
  deadline?: string
  status: 'pending' | 'responded' | 'expired'
  has_quote?: boolean
  quote_status?: 'pending' | 'accepted' | 'rejected'
}

interface InterventionDetailTabsProps {
  intervention: InterventionDetail
  quoteRequests?: QuoteRequest[]
  userRole: 'gestionnaire' | 'prestataire' | 'locataire'
  userId: string
  onDataChange?: () => void
  onDownloadAttachment?: (attachment: { id: string; name: string; url?: string; [key: string]: unknown }) => void
  onResendRequest?: (_requestId: string) => void
  onCancelRequest?: (_requestId: string) => void
  onNewRequest?: (_requestId: string) => void
  onViewProvider?: (_providerId: string) => void
  // Callbacks spécifiques selon le rôle
  onApprove?: (_quoteId: string) => void
  onReject?: (_quoteId: string) => void
  onCancel?: (_quoteId: string) => void
  // Props pour prestataires
  onOpenQuoteModal?: () => void
  onCancelQuote?: (_quoteId: string) => void
}

export function InterventionDetailTabs({
  intervention,
  quoteRequests = [],
  userRole,
  userId,
  onDataChange,
  onDownloadAttachment,
  onResendRequest,
  onCancelRequest,
  onNewRequest,
  onViewProvider,
  onApprove,
  onReject,
  onCancel,
  // onOpenQuoteModal,
  // onCancelQuote,
}: InterventionDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("general")

  // Fonction helper pour déterminer si l'utilisateur peut voir tous les contacts
  const shouldShowFullContacts = (): boolean => {
    // Gestionnaires voient toujours tous les contacts
    if (userRole === 'gestionnaire') {
      return true
    }

    // Statuts considérés comme "planification et suite" - même logique pour locataires et prestataires
    const planificationStatuses = [
      'planification',
      'planifiee',
      'en_cours',
      'terminee',
      'approuvee',
      'cloturee'
    ]

    // Vérifier si l'intervention est au moins au statut planification (condition commune)
    const isInPlanificationPhase = planificationStatuses.includes(intervention.status.toLowerCase())

    if (!isInPlanificationPhase) {
      return false // Vue restreinte pour tous avant planification
    }

    // Après planification : conditions spécifiques par rôle
    // Pour les locataires : si intervention >= planification, ils voient tous les contacts
    if (userRole === 'locataire') {
      return true
    }

    // Pour les prestataires : intervention >= planification ET devis accepté
    if (userRole === 'prestataire') {
      const hasApprovedQuote = intervention.quotes.some(
        quote => quote.providerId === userId && quote.status === 'accepted'
      )
      return hasApprovedQuote
    }

    return false
  }

  // Fonction helper pour filtrer les prestataires avec devis accepté
  const getApprovedProviders = () => {
    const approvedQuotes = intervention.quotes.filter(quote => quote.status === 'accepted')
    return approvedQuotes.map(quote => ({
      id: quote.providerId,
      name: quote.providerName,
      email: '', // À récupérer depuis les contacts si disponible
      phone: '',
      speciality: quote.providerSpeciality,
      role: 'prestataire'
    }))
  }

  // Configuration des tabs selon le rôle
  const getAvailableTabs = () => {
    const baseTabs = [
      {
        id: "general",
        label: "Général",
        icon: Settings,
        available: true,
      },
      {
        id: "devis",
        label: "Devis",
        icon: Receipt,
        available: userRole !== 'locataire', // Locataire n'a pas accès aux devis
        badge: intervention.quotes?.length || 0,
      },
      {
        id: "execution",
        label: "Exécution",
        icon: PlayCircle,
        available: true,
        badge: intervention.attachments?.length || 0,
      },
      {
        id: "conversations",
        label: userRole === 'gestionnaire' ? "Conversations" : "Messages",
        icon: MessageSquare,
        available: true,
        badge: userRole === 'gestionnaire'
          ? (intervention.contacts?.locataires?.length || 0) +
            (intervention.contacts?.syndics?.length || 0) +
            (intervention.contacts?.autres?.length || 0)
          : 0,
      },
    ]

    return baseTabs.filter(tab => tab.available)
  }

  const availableTabs = getAvailableTabs()

  const renderGeneralTab = () => (
    <TabsContent value="general" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale - Détails de l'intervention */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Détails de l'intervention</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 text-sm">Description</h4>
                <p className="text-gray-700 text-base leading-relaxed">{intervention.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900 text-sm">Type d'intervention</h4>
                  <p className="text-gray-700 text-base">{intervention.type}</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900 text-sm">Priorité</h4>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      intervention.urgency === 'haute' ? 'bg-red-500' :
                      intervention.urgency === 'moyenne' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <span className="text-gray-700 text-base capitalize">{intervention.urgency}</span>
                  </div>
                </div>
              </div>

              {/* Localisation pour prestataire et locataire */}
              {userRole !== 'gestionnaire' && (intervention.lot || intervention.building) && (
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-medium text-gray-900 text-sm">Localisation</h4>
                  {intervention.lot ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <h4 className="font-medium text-gray-900">Lot {intervention.lot.reference}</h4>
                      </div>
                      <p className="text-gray-600">
                        {intervention.lot.building
                          ? `${intervention.lot.building.address}, ${intervention.lot.building.city} ${intervention.lot.building.postal_code}`
                          : "Lot indépendant"
                        }
                      </p>
                      {intervention.lot.building?.name && (
                        <p className="text-sm text-gray-500">{intervention.lot.building.name}</p>
                      )}
                      {intervention.lot.floor && (
                        <p className="text-sm text-gray-500">Étage {intervention.lot.floor}</p>
                      )}
                      {intervention.lot.apartment_number && (
                        <p className="text-sm text-gray-500">Appartement {intervention.lot.apartment_number}</p>
                      )}
                    </div>
                  ) : intervention.building ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <h4 className="font-medium text-gray-900">Bâtiment entier</h4>
                        <Badge variant="secondary" className="text-xs">
                          Intervention globale
                        </Badge>
                      </div>
                      <p className="text-gray-600">
                        {intervention.building.address}, {intervention.building.city} {intervention.building.postal_code}
                      </p>
                      <p className="text-sm text-gray-500">{intervention.building.name}</p>
                      <p className="text-sm text-amber-600 font-medium">
                        Intervention sur l'ensemble du bâtiment
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale - Contacts avec logique conditionnelle */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>{shouldShowFullContacts() ? 'Contacts' : 'Contacts assignés'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shouldShowFullContacts() ? (
                  <>
                    {/* Vue complète pour gestionnaires ou utilisateurs avec permissions étendues */}

                    {/* Gestionnaires */}
                    {intervention.manager && (
                      <div className="flex items-center space-x-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-sky-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{intervention.manager.name}</p>
                            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs">
                              Gestionnaire
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{intervention.manager.email}</p>
                            {intervention.manager.phone && <p>{intervention.manager.phone}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Locataires - Pour gestionnaires et prestataires avec devis accepté: tous les locataires */}
                    {(userRole === 'gestionnaire' || userRole === 'prestataire') && intervention.contacts.locataires.map((contact) => (
                      <div key={contact.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-blue-600">Locataire</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pour locataires: gestionnaires du lot/immeuble */}
                    {userRole === 'locataire' && intervention.contacts.autres.map((contact) => (
                      <div key={contact.id} className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-sky-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-sky-600">Gestionnaire</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pour locataires: autres locataires du bien */}
                    {userRole === 'locataire' && intervention.contacts.locataires.map((contact) => (
                      <div key={contact.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-blue-600">Locataire</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pour prestataires: locataire principal si leur devis est accepté (seulement si pas déjà dans la liste) */}
                    {userRole === 'prestataire' && intervention.tenant &&
                     !intervention.contacts.locataires.some(l => l.id === intervention.tenant.id) && (
                      <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{intervention.tenant.name}</p>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                              Locataire principal
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{intervention.tenant.email}</p>
                            {intervention.tenant.phone && <p>{intervention.tenant.phone}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Syndics - pour gestionnaires seulement */}
                    {userRole === 'gestionnaire' && intervention.contacts.syndics.map((contact) => (
                      <div key={contact.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-orange-600">Syndic</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Prestataires avec devis accepté - Visibles pour gestionnaires, locataires et autres prestataires */}
                    {getApprovedProviders()
                      .filter(provider => userRole === 'gestionnaire' || userRole === 'locataire' || provider.id !== userId)
                      .map((provider) => (
                      <div key={provider.id} className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{provider.name}</p>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                              {provider.id === userId ? "Vous" : "Prestataire"}
                            </Badge>
                            {provider.speciality && (
                              <Badge variant="outline" className="text-xs">
                                {provider.speciality}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {provider.email && <p>{provider.email}</p>}
                            {provider.phone && <p>{provider.phone}</p>}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Autres contacts - pour gestionnaires seulement */}
                    {userRole === 'gestionnaire' && intervention.contacts.autres.map((contact) => (
                      <div key={contact.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                            <p className="text-xs text-gray-600">{contact.role}</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Vue restreinte - Contacts assignés seulement */}

                    {/* Gestionnaire */}
                    {intervention.manager && (
                      <div className="flex items-center space-x-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-sky-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{intervention.manager.name}</p>
                            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs">
                              Gestionnaire
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{intervention.manager.email}</p>
                            {intervention.manager.phone && <p>{intervention.manager.phone}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prestataire assigné - Visible pour gestionnaires ou si devis accepté pour les autres */}
                    {intervention.assignedContact && (
                      userRole === 'gestionnaire' ||
                      intervention.quotes?.some(q => q.providerId === intervention.assignedContact.id && q.status === 'accepted')
                    ) && (
                      <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{intervention.assignedContact.name}</p>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                              Prestataire
                            </Badge>
                            {intervention.assignedContact.speciality && (
                              <Badge variant="outline" className="text-xs">
                                {intervention.assignedContact.speciality}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{intervention.assignedContact.email}</p>
                            {intervention.assignedContact.phone && <p>{intervention.assignedContact.phone}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Message si aucun contact */}
                {(!shouldShowFullContacts() && !intervention.manager && !intervention.assignedContact) ||
                 (shouldShowFullContacts() && userRole === 'gestionnaire' &&
                  intervention.contacts.locataires.length === 0 &&
                  intervention.contacts.syndics.length === 0 &&
                  intervention.contacts.autres.length === 0 &&
                  !intervention.manager &&
                  getApprovedProviders().length === 0) ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucun contact {shouldShowFullContacts() ? '' : 'assigné'}</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>
  )

  const renderDevisTab = () => (
    <TabsContent value="devis" className="space-y-6">
      <IntegratedQuotesSection
        quotes={intervention.quotes}
        quoteRequests={quoteRequests}
        userContext={userRole}
        onDataChange={onDataChange}
        onDownloadAttachment={onDownloadAttachment}
        onResendRequest={onResendRequest}
        onCancelRequest={onCancelRequest}
        onNewRequest={onNewRequest}
        onViewProvider={onViewProvider}
        onApprove={onApprove}
        onReject={onReject}
        onCancel={onCancel}
        showActions={true}
      />
    </TabsContent>
  )

  const renderExecutionTab = () => (
    <TabsContent value="execution" className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Planification & Disponibilités */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Planification & Disponibilités</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {intervention.scheduling.type === "fixed" && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Date et heure fixe</h4>
                <div className="flex items-center space-x-2 text-blue-800">
                  <Calendar className="h-4 w-4" />
                  <span>{intervention.scheduling.fixedDate}</span>
                  <Clock className="h-4 w-4 ml-2" />
                  <span>{intervention.scheduling.fixedTime}</span>
                </div>
              </div>
            )}

            {intervention.scheduling.type === "tbd" && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900">Horaire à définir</h4>
                <p className="text-sm text-yellow-800 mt-1">La planification sera définie ultérieurement</p>
                <UserAvailabilitiesDisplay
                  availabilities={intervention.availabilities}
                  quotes={intervention.quotes}
                  userRole={userRole}
                  showCard={false}
                  className="mt-3"
                />
              </div>
            )}

            {intervention.availabilities.length === 0 && intervention.scheduling.type === "tbd" && (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Aucune disponibilité renseignée</p>
                <p className="text-sm">Les disponibilités apparaîtront ici une fois communiquées</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fichiers joints */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <span>Fichiers joints ({intervention.attachments.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {intervention.attachments.length > 0 ? (
              <div className="space-y-2">
                {intervention.attachments.map((file, index) => (
                  <div key={file.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <div className="flex items-center space-x-3 text-sm text-gray-500">
                          <span>{file.size}</span>
                          <span>•</span>
                          <span>{file.type}</span>
                          {file.uploadedBy && (
                            <>
                              <span>•</span>
                              <span>par {file.uploadedBy}</span>
                            </>
                          )}
                          {file.uploadedAt && (
                            <>
                              <span>•</span>
                              <span>{new Date(file.uploadedAt).toLocaleDateString('fr-FR')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" title="Télécharger" onClick={() => onDownloadAttachment?.(file)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Voir">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Aucun fichier joint</p>
                <p className="text-sm">Les documents liés à l'intervention apparaîtront ici</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )

  const renderConversationsTab = () => (
    <TabsContent value="conversations" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversation de groupe */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Conversation de groupe</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Fonctionnalité à venir</p>
              <p className="text-sm">La messagerie de groupe sera disponible prochainement</p>
            </div>
          </CardContent>
        </Card>

        {/* Conversations individuelles */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span>Conversations individuelles</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Fonctionnalité à venir</p>
              <p className="text-sm">La messagerie individuelle sera disponible prochainement</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-${availableTabs.length} bg-slate-100`}>
          {availableTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                    {tab.badge}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="py-8">
          {renderGeneralTab()}
          {userRole !== 'locataire' && renderDevisTab()}
          {renderExecutionTab()}
          {renderConversationsTab()}
        </div>
      </Tabs>
    </div>
  )
}
