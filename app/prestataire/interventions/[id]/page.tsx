"use client"

import { useState, use, useEffect, useCallback } from "react"
import { ArrowLeft, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
// import { CardContent, CardHeader} from "@/components/ui/card" // unused
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"


import { determineAssignmentType } from '@/lib/services'
import { QuoteSubmissionForm } from "@/components/intervention/quote-submission-form"
import { QuoteCancellationModal } from "@/components/quotes/quote-cancellation-modal"
import { useQuoteCancellation } from "@/hooks/use-quote-cancellation"
import { InterventionActionPanelHeader } from "@/components/intervention/intervention-action-panel-header"
import { InterventionDetailHeader } from "@/components/intervention/intervention-detail-header"
import { InterventionDetailTabs } from "@/components/intervention/intervention-detail-tabs"
import { logger, logError } from '@/lib/logger'
// Réutiliser les types du composant principal
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

interface InterventionQuote {
  id: string
  provider_id: string
  status: string
  amount?: number
  description?: string
  provider?: {
    name: string
    email?: string
    phone?: string
    company?: string
    provider_category?: string
    speciality?: string
  }
}

interface Attachment {
  id: string
  name: string
  url: string
  type: string
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
    attachments: Attachment[]
    isCurrentUserQuote?: boolean
  }>
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
  const fetchInterventionData = useCallback(async () => {
    if (!resolvedParams.id || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      logger.info('🔍 [Provider] Fetching intervention details for ID:', resolvedParams.id)

      // Récupérer l'intervention avec les données relationnelles
      const interventionData = await interventionService.getById(resolvedParams.id)

      if (!interventionData) {
        throw new Error('Intervention non trouvée')
      }

      logger.info('✅ [Provider] Intervention data loaded:', interventionData)

      // Vérifier si le prestataire a un devis accepté pour cette intervention
      const providerQuote = interventionData.intervention_quotes?.find(
        (quote: InterventionQuote) => quote.provider_id === user.id
      )
      const hasAcceptedQuote = providerQuote?.status === 'approved'

      logger.info('📋 [Provider] Quote status check:', {
        providerId: user.id,
        hasQuote: !!providerQuote,
        quoteStatus: providerQuote?.status,
        hasAcceptedQuote
      })

      // Vérifier si l'intervention est en phase de planification ou plus
      const planificationStatuses = [
        'planification',
        'planifiee',
        'en_cours',
        'terminee',
        'approuvee',
        'cloturee'
      ]
      const isInPlanificationPhase = planificationStatuses.includes(interventionData.status?.toLowerCase())

      logger.info('📅 [Provider] Status check:', {
        currentStatus: interventionData.status,
        isInPlanificationPhase,
        hasAcceptedQuote
      })

      // Récupérer les contacts si intervention >= planification ET prestataire a devis accepté
      let organizedContacts = {
        locataires: [],
        syndics: [],
        autres: []
      }

      if (isInPlanificationPhase && hasAcceptedQuote) {
        logger.info('✅ [Provider] Planification phase + accepted quote, fetching full contacts')

        let allContacts = []

        // Récupérer les contacts selon le type d'intervention (lot ou bâtiment)
        if (interventionData.lot_id) {
          // Intervention sur lot spécifique
          allContacts = await contactService.getLotContacts(interventionData.lot_id)
          logger.info('📍 [Provider] Lot contacts loaded:', allContacts.length)
        } else if (interventionData.building_id) {
          // Intervention sur bâtiment entier
          allContacts = await contactService.getBuildingContacts(interventionData.building_id)
          logger.info('🏢 [Provider] Building contacts loaded:', allContacts.length)
        }

        // Récupérer aussi les autres prestataires avec devis accepté
        const acceptedProviderIds = interventionData.intervention_quotes
          ?.filter((quote: InterventionQuote) => quote.status === 'approved')
          ?.map((quote: InterventionQuote) => quote.provider_id) || []

        logger.info('👥 [Provider] Providers with accepted quotes:', acceptedProviderIds)

        // Organiser les contacts par catégorie
        organizedContacts = {
          // Tous les locataires du bien
          locataires: allContacts
            .filter((contact: DatabaseContact) => {
              const type = determineAssignmentType(contact)
              return type === 'tenant'
            })
            .map((contact: DatabaseContact) => ({
              ...contact,
              inChat: true // Les locataires sont dans le chat pour un prestataire accepté
            })),

          // Autres prestataires avec devis accepté (sauf le prestataire connecté)
          autres: [
            // D'abord les autres prestataires avec devis accepté
            ...interventionData.intervention_quotes
              ?.filter((quote: InterventionQuote) =>
                quote.status === 'approved' &&
                quote.provider_id !== user.id
              )
              ?.map((quote: InterventionQuote) => ({
                id: quote.provider_id,
                name: quote.provider?.name || '',
                email: quote.provider?.email || '',
                phone: quote.provider?.phone || null,
                role: 'prestataire',
                provider_category: quote.provider.provider_category || 'service',
                company: quote.provider?.company || null,
                speciality: quote.provider?.speciality || null,
                inChat: true // Les autres prestataires acceptés sont dans le chat
              })) || [],

            // Ensuite les gestionnaires du bien
            ...allContacts
              .filter((contact: DatabaseContact) => {
                const type = determineAssignmentType(contact)
                return type === 'manager'
              })
              .map((contact: DatabaseContact) => ({
                ...contact,
                inChat: true // Les gestionnaires sont toujours dans le chat
              }))
          ],

          // Pas de syndics dans la vue prestataire
          syndics: []
        }

        logger.info('📊 [Provider] Organized contacts:', {
          locataires: organizedContacts.locataires.length,
          autres: organizedContacts.autres.length,
          syndics: organizedContacts.syndics.length
        })
      } else {
        if (!isInPlanificationPhase) {
          logger.info('📋 [Provider] Intervention not in planification phase, using minimal contacts')
        } else if (!hasAcceptedQuote) {
          logger.info('🔒 [Provider] No accepted quote, using minimal contacts')
        } else {
          logger.info('❓ [Provider] Other condition failed, using minimal contacts')
        }
        // Si conditions non remplies, seul le gestionnaire est accessible via les props individuelles
      }

      // Transformer les données au format attendu par l'interface
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
        estimatedCost: interventionData.estimated_cost,
        finalCost: interventionData.final_cost,
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
        // ✅ SÉCURITÉ: RLS policies filtrent automatiquement les disponibilités par rôle
        availabilities: interventionData.user_availabilities?.map(avail => ({
          person: avail.user.name,
          role: avail.user.role,
          date: avail.date,
          startTime: avail.start_time,
          endTime: avail.end_time,
          userId: avail.user.id
        })) || [],
        // ✅ SÉCURITÉ: RLS policies filtrent automatiquement - prestataires voient uniquement leurs devis
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
        // Contacts organisés selon le statut du devis
        contacts: organizedContacts,
        // Scheduling basique
        scheduling: {
          type: interventionData.scheduled_date ? "fixed" : "tbd",
          fixedDate: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toISOString().split('T')[0] : undefined,
          fixedTime: interventionData.scheduled_date ? new Date(interventionData.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined
        },
        // Instructions
        instructions: {
          type: "individual",
          groupMessage: typeof interventionData.instructions === 'string' ? interventionData.instructions : undefined
        }
      }

      logger.info('✅ [Provider] Transformed intervention data:', transformedIntervention)
      setIntervention(transformedIntervention)

    } catch (error) {
      logger.error('❌ [Provider] Error fetching intervention data:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement de l\'intervention')
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id, user?.id])

  // Charger les données au montage du composant
  useEffect(() => {
    fetchInterventionData()
  }, [resolvedParams.id, user?.id, fetchInterventionData])

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

  // Removed unused functions getStatusColor and getUrgencyColor

  const handleBack = () => {
    router.back()
  }

  const handleArchive = () => {
    // Pas d'archivage pour les prestataires
    logger.info('Archive not available for providers')
  }

  const handleStatusAction = (_action: string) => {
    // Actions gérées par le panel d'actions
    logger.info('Status action:', action)
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

      <InterventionDetailTabs
        intervention={intervention}
        userRole="prestataire"
        userId={user?.id || ""}
        onDataChange={fetchInterventionData}
        onDownloadAttachment={(attachment) => {
          logger.info('Download attachment:', attachment)
          // TODO: Implémenter le téléchargement des pièces jointes
        }}
        onCancel={quoteCancellation.handleCancelRequest}
        onOpenQuoteModal={() => setIsQuoteModalOpen(true)}
        onCancelQuote={(quoteId) => quoteCancellation.handleCancelQuote(quoteId)}
      />

      {/* Modale de soumission de devis */}
      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent className="!max-w-7xl !w-[95vw] max-h-[95vh] overflow-y-auto">
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

