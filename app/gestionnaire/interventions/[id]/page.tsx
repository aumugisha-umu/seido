"use client"

import { use } from "react"
import {
  ArrowLeft,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useState, useEffect, useCallback } from "react"


import { determineAssignmentType } from '@/lib/services'
import { useAuth } from "@/hooks/use-auth"
import { useInterventionCancellation } from "@/hooks/use-intervention-cancellation"
import { InterventionDetailHeader } from "@/components/intervention/intervention-detail-header"
import { InterventionActionPanelHeader } from "@/components/intervention/intervention-action-panel-header"
import { CancelConfirmationModal } from "@/components/intervention/modals/cancel-confirmation-modal"
import { InterventionDetailTabs } from "@/components/intervention/intervention-detail-tabs"
import { logger, logError } from '@/lib/logger'
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

interface InterventionContact {
  id: string
  role: string
  user: {
    id: string
    name: string
    email: string
  }
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


export default function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const _router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [intervention, setIntervention] = useState<InterventionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [quoteRequests, setQuoteRequests] = useState<unknown[]>([])

  // Hook pour la gestion de l'annulation
  const cancellation = useInterventionCancellation()

  // Fonctions de gestion pour le header
  const handleBack = () => {
    router.push('/gestionnaire/interventions')
  }

  const handleArchive = () => {
    logger.info('Archive intervention:', intervention?.id)
    // TODO: Implémenter la logique d'archivage
  }

  const handleStatusAction = (_action: string) => {
    logger.info('Status action:', action, 'for intervention:', intervention?.id)
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
  const fetchInterventionData = useCallback(async () => {
    if (!resolvedParams.id) return

    setLoading(true)
    setError(null)

    try {
      logger.info('🔍 Fetching intervention details for ID:', resolvedParams.id)
      
      // 1. Récupérer l'intervention avec les données relationnelles
      const interventionData = await interventionService.getById(resolvedParams.id)
      
      if (!interventionData) {
        throw new Error('Intervention non trouvée')
      }

      logger.info('✅ Intervention data loaded:', interventionData)

      logger.info('🔍 [MANAGER-DEBUG] Raw intervention data received:', {
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
        logger.info('✅ Lot contacts loaded:', contacts.length)
      } else if (interventionData.building_id) {
        // Intervention sur bâtiment entier - récupérer tous les contacts du bâtiment
        contacts = await contactService.getBuildingContacts(interventionData.building_id)
        logger.info('✅ Building contacts loaded:', contacts.length)
      }
      
      logger.info('✅ Contacts loaded:', contacts.length)

      // 3. Organiser les contacts par type (nouvelle architecture)
      const getContactAssignmentType = (contact: DatabaseContact) => {
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
        locataires: contacts.filter((contact: DatabaseContact) =>
          getContactAssignmentType(contact) === 'tenant'
        ).map((contact: DatabaseContact) => ({
          ...contact,
          inChat: false // Par défaut, pas dans le chat (sera géré plus tard)
        })),
        syndics: contacts.filter((contact: DatabaseContact) =>
          getContactAssignmentType(contact) === 'syndic'
        ).map((contact: DatabaseContact) => ({
          ...contact,
          inChat: false
        })),
        autres: contacts.filter((contact: DatabaseContact) =>
          !['tenant', 'syndic'].includes(getContactAssignmentType(contact))
        ).map((contact: DatabaseContact) => ({
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
          logger.info('🔄 [GESTIONNAIRE] Processing quote data:', {
            id: quote.id,
            status: quote.status,
            provider: quote.provider.name
          })

          const transformedQuote = {
            id: quote.id,
            providerId: quote.provider_id,
            providerName: quote.provider.name || 'Prestataire inconnu',
            providerSpeciality: quote.provider.speciality,
            totalAmount: quote.total_amount || 0,
            laborCost: quote.labor_cost,
            materialsCost: quote.materials_cost || 0,
            description: quote.description,
            workDetails: quote.work_details,
            estimatedDurationHours: quote.estimated_duration_hours,
            estimatedStartDate: quote.estimated_start_date,
            status: quote.status as 'pending' | 'approved' | 'rejected',
            submittedAt: quote.submitted_at,
            reviewedAt: quote.reviewed_at,
            reviewComments: quote.review_comments,
            rejectionReason: quote.rejection_reason,
            attachments: typeof quote.attachments === 'string' ? JSON.parse(quote.attachments) : quote.attachments || []
          }

          logger.info('✅ [GESTIONNAIRE] Transformed quote:', {
            id: transformedQuote.id,
            status: transformedQuote.status
          })

          return transformedQuote
        }) || []
      }

        // 5. Créer les demandes de devis à partir des prestataires assignés
        const requests = interventionData.intervention_contacts
          ?.filter((contact: InterventionContact) => contact.role === 'prestataire')
          ?.map((contact: InterventionContact) => {
            // Vérifier si ce prestataire a déjà soumis un devis et récupérer son statut
            const providerQuote = transformedIntervention.quotes.find(quote => quote.providerId === contact.user.id)
            const hasQuote = !!providerQuote
            
            // Déterminer le statut basé sur le devis reçu
            let status: 'pending' | 'responded' | 'expired' = 'pending'
            if (hasQuote && providerQuote) {
              if (providerQuote.status === 'approved') {
                status = 'responded'
              } else if (providerQuote.status === 'rejected') {
                status = 'responded' // Le prestataire a répondu mais le devis a été rejeté
              } else if (providerQuote.status === 'pending') {
                status = 'responded' // Le prestataire a soumis un devis en attente
              }
            }
            
            return {
              id: contact.id || `contact-${contact.user.id}-${Date.now()}`,
              provider: {
                id: contact.user.id,
                name: contact.user.name || 'Prestataire inconnu',
                email: contact.user.email || '',
                avatar: undefined // Pas d'avatar pour l'instant
              },
              assigned_at: contact.assigned_at || interventionData.created_at || new Date().toISOString(),
              individual_message: contact.individual_message,
              deadline: interventionData.quote_deadline,
              status: status,
              has_quote: hasQuote,
              quote_status: providerQuote?.status // Ajouter le statut du devis pour référence
            }
          }) || []

      logger.info('✅ Quote requests created:', requests.length)
      setQuoteRequests(requests)

      // Debug log pour tracer les disponibilités récupérées
      logger.info('📊 [MANAGER-DEBUG] Total availabilities mapped:', {
        count: interventionData.user_availabilities?.length || 0,
        byUser: interventionData.user_availabilities?.reduce((acc, avail) => {
          const key = `${avail.user.name} (${avail.user.id})`
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {}) || {},
        details: interventionData.user_availabilities?.map(avail => ({
          userId: avail.user.id,
          userName: avail.user.name,
          role: avail.user.role,
          date: avail.date,
          time: `${avail.start_time}-${avail.end_time}`
        })) || []
      })

      logger.info('✅ Transformed intervention data:', transformedIntervention)
      setIntervention(transformedIntervention)

    } catch (error) {
      logger.error('❌ Error fetching intervention data:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement de l\'intervention')
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  // Charger les données réelles au montage du composant
  useEffect(() => {
    fetchInterventionData()
  }, [fetchInterventionData])

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

      <InterventionDetailTabs
        intervention={intervention}
        quoteRequests={quoteRequests}
        userRole="gestionnaire"
        userId={user?.id || ""}
        onDataChange={fetchInterventionData}
        onDownloadAttachment={(attachment) => {
          logger.info('Download attachment:', attachment)
          // TODO: Implémenter le téléchargement des pièces jointes
        }}
        onResendRequest={(requestId) => {
          logger.info('Resend request:', requestId)
          // TODO: Implémenter la relance de demande
        }}
        onCancelRequest={(requestId) => {
          logger.info('Cancel request:', requestId)
          // TODO: Implémenter l'annulation de demande
        }}
        onNewRequest={(requestId) => {
          logger.info('New request:', requestId)
          // TODO: Implémenter la nouvelle demande de devis
        }}
        onViewProvider={(providerId) => {
          logger.info('View provider:', providerId)
          // TODO: Implémenter la navigation vers le profil du prestataire
        }}
      />

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
