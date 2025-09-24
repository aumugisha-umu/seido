"use client"

import { useState, use, useEffect } from "react"
import { ArrowLeft, Building2, User, MessageSquare, Calendar, FileText, Euro, Plus, MapPin, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { interventionService } from "@/lib/database-service"
import { IntegratedQuotesSection } from "@/components/quotes/integrated-quotes-section"
import { QuoteSubmissionForm } from "@/components/intervention/quote-submission-form"
import { QuoteCancellationModal } from "@/components/quotes/quote-cancellation-modal"
import { useQuoteCancellation } from "@/hooks/use-quote-cancellation"
import { InterventionActionPanelHeader } from "@/components/intervention/intervention-action-panel-header"
import { InterventionDetailHeader } from "@/components/intervention/intervention-detail-header"

// Types pour les données d'intervention
interface InterventionDetail {
  id: string
  title: string
  description: string
  type: string
  urgency: string
  status: string
  createdAt: string
  reference: string
  // Planning
  scheduledDate?: string
  scheduledTime?: string
  // Données de localisation (lot ou bâtiment)
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
  // Fichiers joints
  attachments: Array<{
    name: string
    size: string
    type: string
    id?: string
    storagePath?: string
    uploadedAt?: string
    uploadedBy?: string
  }>
  // Planning et disponibilités
  availabilities: Array<{
    person: string
    role: string
    date: string
    startTime: string
    endTime: string
    userId?: string
  }>
  // Devis
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
    isCurrentUserQuote?: boolean
  }>
  // Instructions
  instructions?: string
}

interface InterventionDetailsProps {
  params: {
    id: string
  }
}

export default function PrestatairInterventionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Hook pour l'annulation de devis
  const quoteCancellation = useQuoteCancellation({
    onSuccess: () => {
      fetchInterventionData() // Recharger les données après annulation
    }
  })

  // Fonction utilitaire pour formater la taille des fichiers
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Fonction pour récupérer les données depuis la DB
  const fetchInterventionData = async () => {
    if (!resolvedParams.id || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔍 [Provider] Fetching intervention details for ID:', resolvedParams.id)

      // Récupérer l'intervention avec les données relationnelles
      const interventionData = await interventionService.getById(resolvedParams.id)

      if (!interventionData) {
        throw new Error('Intervention non trouvée')
      }

      console.log('✅ [Provider] Intervention data loaded:', interventionData)

      // Transformer les données au format attendu par l'interface
      const transformedIntervention: InterventionDetail = {
        id: interventionData.id,
        title: interventionData.title,
        description: interventionData.description,
        type: interventionData.type,
        urgency: interventionData.urgency,
        status: interventionData.status,
        createdAt: interventionData.created_at,
        reference: interventionData.reference,
        // Planning
        scheduledDate: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toISOString().split('T')[0] : undefined,
        scheduledTime: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined,
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
        quotes: interventionData.intervention_quotes?.map(quote => ({
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
          attachments: typeof quote.attachments === 'string' ? JSON.parse(quote.attachments) : quote.attachments || [],
          providerAvailabilities: typeof quote.provider_availabilities === 'string' ? JSON.parse(quote.provider_availabilities) : quote.provider_availabilities || [],
          isCurrentUserQuote: quote.provider_id === user.id
        })) || [],
        instructions: interventionData.instructions
      }

      console.log('✅ [Provider] Transformed intervention data:', transformedIntervention)
      setIntervention(transformedIntervention)

    } catch (error) {
      console.error('❌ [Provider] Error fetching intervention data:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement de l\'intervention')
    } finally {
      setLoading(false)
    }
  }

  // Charger les données au montage du composant
  useEffect(() => {
    fetchInterventionData()
  }, [resolvedParams.id, user?.id])

  // États de chargement et d'erreur
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement des détails de l'intervention...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Erreur de chargement</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => fetchInterventionData()} variant="outline">
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
          <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Intervention non trouvée</h2>
          <p className="text-slate-600 mb-4">L'intervention demandée n'existe pas ou n'est plus accessible.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "en_attente":
      case "pending":
        return "bg-amber-100 text-amber-800 border-amber-200"
      case "en_cours":
      case "programmee":
        return "bg-sky-100 text-sky-800 border-sky-200"
      case "terminee":
      case "cloturee":
        return "bg-emerald-100 text-emerald-800 border-emerald-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "urgent":
      case "urgente":
        return "bg-red-100 text-red-800 border-red-200"
      case "importante":
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "normale":
      case "normal":
        return "bg-amber-100 text-amber-800 border-amber-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleArchive = () => {
    // Pas d'archivage pour les prestataires
    console.log('Archive not available for providers')
  }

  const handleStatusAction = (action: string) => {
    // Actions gérées par le panel d'actions
    console.log('Status action:', action)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header unifié */}
      <InterventionDetailHeader
        intervention={{
          id: intervention.id,
          title: intervention.title,
          reference: intervention.reference,
          status: intervention.status,
          urgency: intervention.urgency,
          createdAt: intervention.createdAt,
          createdBy: intervention.tenant?.name || "Locataire",
          lot: intervention.lot ? {
            reference: intervention.lot.reference,
            building: {
              name: intervention.lot.building?.name || "Bâtiment"
            }
          } : undefined,
          building: intervention.building ? {
            name: intervention.building.name
          } : undefined
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
              scheduled_date: intervention.scheduledDate,
              quotes: intervention.quotes.map(quote => ({
                id: quote.id,
                status: quote.status,
                providerId: quote.providerId,
                isCurrentUserQuote: quote.isCurrentUserQuote
              }))
            }}
            userRole="prestataire"
            userId={user?.id || ''}
            onActionComplete={fetchInterventionData}
            onOpenQuoteModal={() => setIsQuoteModalOpen(true)}
            onCancelQuote={(quoteId) => quoteCancellation.handleCancelQuote(quoteId)}
          />
        }
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Détails de l'intervention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-sky-600" />
                  <span>Détails de l'intervention</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">Description</h4>
                  <p className="text-slate-700">{intervention.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Type</h4>
                    <p className="text-slate-700">{intervention.type}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 mb-1">Priorité</h4>
                    <span className="text-slate-700">{intervention.urgency}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Localisation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <span>Localisation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {intervention.lot ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-sky-600" />
                        <h4 className="font-medium text-slate-900">Lot {intervention.lot.reference}</h4>
                      </div>
                      <p className="text-slate-600">
                        {intervention.lot.building
                          ? `${intervention.lot.building.address}, ${intervention.lot.building.city} ${intervention.lot.building.postal_code}`
                          : "Lot indépendant"
                        }
                      </p>
                      <p className="text-sm text-slate-500">
                        {intervention.lot.building?.name || `Lot ${intervention.lot.reference}`}
                      </p>
                      {intervention.lot.floor && (
                        <p className="text-sm text-slate-500">Étage {intervention.lot.floor}</p>
                      )}
                      {intervention.lot.apartment_number && (
                        <p className="text-sm text-slate-500">Appartement {intervention.lot.apartment_number}</p>
                      )}
                    </div>
                  ) : intervention.building ? (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-sky-600" />
                        <h4 className="font-medium text-slate-900">Bâtiment entier</h4>
                        <Badge variant="secondary" className="text-xs">
                          Intervention globale
                        </Badge>
                      </div>
                      <p className="text-slate-600">
                        {intervention.building.address}, {intervention.building.city} {intervention.building.postal_code}
                      </p>
                      <p className="text-sm text-slate-500">{intervention.building.name}</p>
                      <p className="text-sm text-amber-600 font-medium">
                        Intervention sur l'ensemble du bâtiment
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500">Localisation non spécifiée</p>
                  )}

                  {intervention.tenant && (
                    <div className="pt-4 border-t border-slate-200">
                      <h5 className="font-medium text-slate-900 mb-2">Contact locataire</h5>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-sky-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{intervention.tenant.name}</p>
                          <div className="flex items-center space-x-3 text-sm text-slate-600">
                            <span>{intervention.tenant.email}</span>
                            {intervention.tenant.phone && (
                              <span>{intervention.tenant.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            {intervention.instructions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-amber-600" />
                    <span>Instructions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-900">{intervention.instructions}</p>
                </CardContent>
              </Card>
            )}

            {/* Section Devis */}
            <IntegratedQuotesSection
              quotes={intervention.quotes}
              userContext="prestataire"
              onCancel={quoteCancellation.handleCancelRequest}
              onDownloadAttachment={(attachment) => {
                console.log('Download attachment:', attachment)
                // TODO: Implémenter le téléchargement des pièces jointes
              }}
              showActions={true}
              emptyStateConfig={{
                title: "Aucun devis soumis",
                description: "Soumettez un devis pour cette intervention pour continuer le processus"
              }}
            />

            {/* Modale de soumission de devis */}
            <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
              <DialogContent className="!max-w-7xl !w-[95vw] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-slate-900">
                    {intervention?.quotes.find(q => q.isCurrentUserQuote)
                      ? `Modifier le devis pour "${intervention?.title}"`
                      : `Soumettre un devis pour "${intervention?.title}"`
                    }
                  </DialogTitle>
                </DialogHeader>
                {intervention && (
                  <QuoteSubmissionForm
                    intervention={intervention}
                    existingQuote={intervention.quotes.find(q => q.isCurrentUserQuote)}
                    onSuccess={() => {
                      setIsQuoteModalOpen(false)
                      fetchInterventionData()
                    }}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Planification et disponibilités */}
            {intervention.availabilities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-sky-600" />
                    <span>Planification</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium text-slate-900 text-sm">Disponibilités</h4>
                    {intervention.availabilities.map((availability, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-slate-600" />
                          <span className="font-medium text-slate-900">{availability.person}</span>
                          <Badge variant="outline" className="text-xs">
                            {availability.role}
                          </Badge>
                        </div>
                        <div className="p-2 bg-slate-50 rounded text-sm flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-slate-600" />
                          <span className="text-slate-700">
                            {new Date(availability.date).toLocaleDateString("fr-FR")} de{" "}
                            {availability.startTime} à {availability.endTime}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fichiers joints */}
            {intervention.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-slate-600" />
                    <span>Fichiers joints ({intervention.attachments.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {intervention.attachments.map((file, index) => (
                      <div key={file.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-900">{file.name}</p>
                            <div className="flex items-center space-x-3 text-sm text-slate-500">
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
                          <Button variant="ghost" size="sm" title="Voir le fichier" className="text-slate-600 hover:text-slate-900">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts assignés */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-purple-600" />
                  <span>Contacts assignés</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Gestionnaire */}
                  {intervention.manager && (
                    <div className="flex items-center space-x-3 p-3 bg-sky-50 rounded-lg border border-sky-200">
                      <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-sky-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-slate-900">{intervention.manager.name}</p>
                          <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-xs">
                            Gestionnaire
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p>{intervention.manager.email}</p>
                          {intervention.manager.phone && <p>{intervention.manager.phone}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prestataire assigné */}
                  {intervention.assignedContact && (
                    <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-slate-900">{intervention.assignedContact.name}</p>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">
                            Prestataire
                          </Badge>
                          {intervention.assignedContact.speciality && (
                            <Badge variant="outline" className="text-xs">
                              {intervention.assignedContact.speciality}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          <p>{intervention.assignedContact.email}</p>
                          {intervention.assignedContact.phone && <p>{intervention.assignedContact.phone}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {!intervention.manager && !intervention.assignedContact && (
                    <div className="text-center py-4 text-slate-500">
                      <User className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                      <p>Aucun contact assigné</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      {/* Modale de confirmation d'annulation de devis */}
      <QuoteCancellationModal
        isOpen={quoteCancellation.isConfirmModalOpen}
        isLoading={quoteCancellation.isLoading}
        onConfirm={quoteCancellation.handleConfirmCancel}
        onCancel={quoteCancellation.handleCancelModal}
      />
    </div>
  )
}
