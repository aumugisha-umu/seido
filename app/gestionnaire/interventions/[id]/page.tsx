"use client"

import { use } from "react"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  FileText,
  Users,
  MapPin,
  MessageSquare,
  Phone,
  Mail,
  Eye,
  Download,
  User,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronRight,
  Receipt,
  Settings,
  PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { interventionService, contactService, determineAssignmentType } from "@/lib/database-service"
import { useAuth } from "@/hooks/use-auth"
import { useInterventionCancellation } from "@/hooks/use-intervention-cancellation"
import { InterventionDetailHeader } from "@/components/intervention/intervention-detail-header"
import { IntegratedQuotesSection } from "@/components/quotes/integrated-quotes-section"
import { UserAvailabilitiesDisplay } from "@/components/intervention/user-availabilities-display"
import { InterventionActionPanelHeader } from "@/components/intervention/intervention-action-panel-header"
import { CancelConfirmationModal } from "@/components/intervention/modals/cancel-confirmation-modal"

// Types basés sur la structure de la base de données
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
    attachments: Array<any>
  }>
}

// Fonctions utilitaires
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const getInterventionLocationShort = (intervention: InterventionDetail): string => {
  if (intervention.lot) {
    return `Lot ${intervention.lot.reference}`
  } else if (intervention.building) {
    return "Bâtiment entier"
  }
  return "Non spécifié"
}

const isBuildingWideIntervention = (intervention: InterventionDetail): boolean => {
  return !!(intervention.building && !intervention.lot)
}

export default function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("general")

  // Hook pour la gestion de l'annulation
  const cancellation = useInterventionCancellation()

  // Fonctions de gestion pour le header
  const handleBack = () => {
    router.push('/gestionnaire/interventions')
  }

  const handleArchive = () => {
    console.log('Archive intervention:', intervention?.id)
    // TODO: Implémenter la logique d'archivage
  }

  const handleStatusAction = (action: string) => {
    console.log('Status action:', action, 'for intervention:', intervention?.id)
    // TODO: Implémenter les actions selon le statut
  }

  const handleCancelIntervention = () => {
    if (intervention) {
      cancellation.handleCancellationAction({
        id: intervention.id,
        title: intervention.title,
        status: intervention.status,
        type: intervention.type
      })
    }
  }

  // Fonction pour récupérer les données réelles depuis la DB
  const fetchInterventionData = async () => {
    if (!resolvedParams.id) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching intervention details for ID:', resolvedParams.id)
      
      // 1. Récupérer l'intervention avec les données relationnelles
      const interventionData = await interventionService.getById(resolvedParams.id)
      
      if (!interventionData) {
        throw new Error('Intervention non trouvée')
      }

      console.log('✅ Intervention data loaded:', interventionData)

      console.log('🔍 [MANAGER-DEBUG] Raw intervention data received:', {
        id: interventionData.id,
        status: interventionData.status,
        user_availabilities_count: interventionData.user_availabilities?.length || 0,
        user_availabilities_raw: interventionData.user_availabilities
      })

      // 2. Récupérer tous les contacts selon le type d'intervention (lot ou bâtiment)
      let contacts = []
      if (interventionData.lot_id) {
        // Intervention sur lot spécifique
        contacts = await contactService.getLotContacts(interventionData.lot_id)
        console.log('✅ Lot contacts loaded:', contacts.length)
      } else if (interventionData.building_id) {
        // Intervention sur bâtiment entier - récupérer tous les contacts du bâtiment
        contacts = await contactService.getBuildingContacts(interventionData.building_id)
        console.log('✅ Building contacts loaded:', contacts.length)
      }
      
      console.log('✅ Contacts loaded:', contacts.length)

      // 3. Organiser les contacts par type (nouvelle architecture)
      const getContactAssignmentType = (contact: any) => {
        if (contact.role && contact.provider_category !== undefined) {
          return determineAssignmentType({
            id: contact.id,
            role: contact.role,
            provider_category: contact.provider_category
          })
        }
        // ✅ Pas de fallback nécessaire, role est obligatoire
        return 'other' // Défaut si aucune correspondance
      }
      
      const organizedContacts = {
        locataires: contacts.filter((contact: any) => 
          getContactAssignmentType(contact) === 'tenant'
        ).map((contact: any) => ({
          ...contact,
          inChat: false // Par défaut, pas dans le chat (sera géré plus tard)
        })),
        syndics: contacts.filter((contact: any) => 
          getContactAssignmentType(contact) === 'syndic'
        ).map((contact: any) => ({
          ...contact,
          inChat: false
        })),
        autres: contacts.filter((contact: any) => 
          !['tenant', 'syndic'].includes(getContactAssignmentType(contact))
        ).map((contact: any) => ({
          ...contact,
          inChat: false
        }))
      }

      // 4. Transformer les données au format attendu par l'interface
      const transformedIntervention: InterventionDetail = {
        id: interventionData.id,
        title: interventionData.title,
        description: interventionData.description,
        type: interventionData.type,
        urgency: interventionData.urgency,
        status: interventionData.status,
        createdAt: interventionData.created_at,
        createdBy: interventionData.manager?.name || 'Gestionnaire',
        reference: interventionData.reference,
        requestedDate: interventionData.requested_date,
        scheduledDate: interventionData.scheduled_date,
        estimatedCost: interventionData.estimated_cost,
        finalCost: interventionData.final_cost,
        // Support des interventions lot ET bâtiment
        lot: interventionData.lot ? {
          id: interventionData.lot.id,
          reference: interventionData.lot.reference,
          building: interventionData.lot.building ? {
            id: interventionData.lot.building.id,
            name: interventionData.lot.building.name,
            address: interventionData.lot.building.address,
            city: interventionData.lot.building.city,
            postal_code: interventionData.lot.building.postal_code
          } : null,
          floor: interventionData.lot.floor,
          apartment_number: interventionData.lot.apartment_number
        } : undefined,
        building: interventionData.building ? {
          id: interventionData.building.id,
          name: interventionData.building.name,
          address: interventionData.building.address,
          city: interventionData.building.city,
          postal_code: interventionData.building.postal_code
        } : undefined,
        tenant: interventionData.tenant ? {
          id: interventionData.tenant_id,
          name: interventionData.tenant.name,
          email: interventionData.tenant.email,
          phone: interventionData.tenant.phone
        } : undefined,
        manager: interventionData.manager ? {
          id: interventionData.manager.id,
          name: interventionData.manager.name,
          email: interventionData.manager.email,
          phone: interventionData.manager.phone
        } : undefined,
        assignedContact: interventionData.assigned_contact ? {
          id: interventionData.assigned_contact.id,
          name: interventionData.assigned_contact.name,
          email: interventionData.assigned_contact.email,
          phone: interventionData.assigned_contact.phone,
          speciality: interventionData.assigned_contact.speciality
        } : undefined,
        contacts: organizedContacts,
        // Données statiques pour maintenir la compatibilité (à enrichir plus tard)
        scheduling: {
          type: interventionData.scheduled_date ? "fixed" : "tbd",
          fixedDate: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toISOString().split('T')[0] : undefined,
          fixedTime: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toTimeString().slice(0, 5) : undefined
        },
        instructions: {
          type: "individual",
          individualMessages: [] // À implémenter selon les besoins
        },
        attachments: interventionData.intervention_documents?.map(doc => ({
          name: doc.original_filename,
          size: formatFileSize(doc.file_size),
          type: doc.mime_type,
          id: doc.id,
          storagePath: doc.storage_path,
          uploadedAt: doc.uploaded_at,
          uploadedBy: doc.uploaded_by_user?.name || 'Utilisateur'
        })) || [],
        availabilities: interventionData.user_availabilities?.map(avail => ({
          person: avail.user.name,
          role: avail.user.role,
          date: avail.date,
          startTime: avail.start_time,
          endTime: avail.end_time,
          userId: avail.user.id
        })) || [],
        quotes: interventionData.intervention_quotes?.map(quote => {
          console.log('🔄 [GESTIONNAIRE] Processing quote data:', {
            id: quote.id,
            status: quote.status,
            provider: quote.provider.name
          })

          const transformedQuote = {
            id: quote.id,
            providerId: quote.provider_id,
            providerName: quote.provider.name,
            providerSpeciality: quote.provider.speciality,
            totalAmount: quote.total_amount,
            laborCost: quote.labor_cost,
            materialsCost: quote.materials_cost,
            description: quote.description,
            workDetails: quote.work_details,
            estimatedDurationHours: quote.estimated_duration_hours,
            estimatedStartDate: quote.estimated_start_date,
            status: quote.status,
            submittedAt: quote.submitted_at,
            reviewedAt: quote.reviewed_at,
            reviewComments: quote.review_comments,
            rejectionReason: quote.rejection_reason,
            attachments: typeof quote.attachments === 'string' ? JSON.parse(quote.attachments) : quote.attachments || []
          }

          console.log('✅ [GESTIONNAIRE] Transformed quote:', {
            id: transformedQuote.id,
            status: transformedQuote.status
          })

          return transformedQuote
        }) || []
      }

      console.log('✅ Transformed intervention data:', transformedIntervention)
      setIntervention(transformedIntervention)

    } catch (error) {
      console.error('❌ Error fetching intervention data:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement de l\'intervention')
    } finally {
      setLoading(false)
    }
  }

  // Charger les données réelles au montage du composant
  useEffect(() => {
    fetchInterventionData()
  }, [resolvedParams.id])

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des détails de l'intervention...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Intervention non trouvée</h2>
          <p className="text-gray-600 mb-4">L'intervention demandée n'existe pas ou n'est plus accessible.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header amélioré avec InterventionDetailHeader */}
      <InterventionDetailHeader
        intervention={{
          id: intervention.id,
          title: intervention.title,
          reference: intervention.reference,
          status: intervention.status,
          urgency: intervention.urgency,
          createdAt: intervention.createdAt,
          createdBy: intervention.createdBy,
          lot: intervention.lot,
          building: intervention.building,
        }}
        onBack={handleBack}
        onArchive={handleArchive}
        onStatusAction={handleStatusAction}
        displayMode="custom"
        actionPanel={
          <InterventionActionPanelHeader
            intervention={{
              id: intervention.id,
              title: intervention.title,
              status: intervention.status,
              tenant_id: intervention.tenant?.id,
              scheduled_date: intervention.scheduledDate
            }}
            userRole="gestionnaire"
            userId={user?.id || ""}
            onActionComplete={fetchInterventionData}
            onCancelIntervention={handleCancelIntervention}
          />
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100">
            <TabsTrigger
              value="general"
              className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Général</span>
              <span className="sm:hidden">Général</span>
            </TabsTrigger>
            <TabsTrigger
              value="devis"
              className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
            >
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Devis</span>
              <span className="sm:hidden">Devis</span>
              {intervention.quotes && intervention.quotes.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                  {intervention.quotes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="execution"
              className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
            >
              <PlayCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Exécution</span>
              <span className="sm:hidden">Exécution</span>
              {intervention.attachments && intervention.attachments.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                  {intervention.attachments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Conversations</span>
              <span className="sm:hidden">Messages</span>
              {(intervention.contacts.locataires.length + intervention.contacts.syndics.length + intervention.contacts.autres.length) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                  {intervention.contacts.locataires.length + intervention.contacts.syndics.length + intervention.contacts.autres.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="py-8">
            {/* Tab Content: Général */}
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
            </CardContent>
          </Card>
                </div>

                {/* Colonne latérale - Contacts */}
                <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span>Contacts</span>
              </CardTitle>
            </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Locataires */}
                      {intervention.contacts.locataires.map((contact) => (
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

                        {/* Syndics */}
                      {intervention.contacts.syndics.map((contact) => (
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

                        {/* Autres contacts */}
                      {intervention.contacts.autres.map((contact) => (
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

                        {/* Message si aucun contact */}
                        {intervention.contacts.locataires.length === 0 && 
                         intervention.contacts.syndics.length === 0 && 
                         intervention.contacts.autres.length === 0 && (
                          <div className="text-center py-6 text-gray-500">
                            <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">Aucun contact assigné</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
                </div>
                      </div>
            </TabsContent>

            {/* Tab Content: Devis */}
            <TabsContent value="devis" className="space-y-6">
          <IntegratedQuotesSection
            quotes={intervention.quotes}
            userContext="gestionnaire"
            onDataChange={fetchInterventionData}
            onDownloadAttachment={(attachment) => {
              console.log('Download attachment:', attachment)
              // TODO: Implémenter le téléchargement des pièces jointes
            }}
            showActions={true}
          />
            </TabsContent>

            {/* Tab Content: Exécution */}
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
                    userRole="gestionnaire"
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
                        <Button variant="ghost" size="sm" title="Télécharger">
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

            {/* Tab Content: Conversations */}
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
          </div>
        </Tabs>
      </div>

      {/* Modale d'annulation d'intervention */}
      <CancelConfirmationModal
        isOpen={cancellation.cancellationModal.isOpen}
        onClose={cancellation.closeCancellationModal}
        onConfirm={cancellation.handleConfirmCancellation}
        intervention={cancellation.cancellationModal.intervention}
        cancellationReason={cancellation.cancellationReason}
        onCancellationReasonChange={cancellation.setCancellationReason}
        internalComment={cancellation.internalComment}
        onInternalCommentChange={cancellation.setInternalComment}
        isLoading={cancellation.isLoading}
        error={cancellation.error}
      />
    </>
  )
}
