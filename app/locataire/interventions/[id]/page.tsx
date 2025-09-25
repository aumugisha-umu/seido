"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, Building2, User, MessageSquare, CalendarDays, Euro, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { InterventionActionPanelHeader } from "@/components/intervention/intervention-action-panel-header"
import { InterventionDetailHeader } from "@/components/intervention/intervention-detail-header"
import { InterventionDetailTabs } from "@/components/intervention/intervention-detail-tabs"
import { interventionService, contactService, determineAssignmentType } from "@/lib/database-service"

interface InterventionDetailsProps {
  params: {
    id: string
  }
}

export default function InterventionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { user } = useAuth()
  const [intervention, setIntervention] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fonction utilitaire pour formater la taille des fichiers
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const refreshIntervention = async () => {
    if (!resolvedParams.id || !user?.id) return

    try {
      const data = await interventionService.getById(resolvedParams.id)

      console.log('🔍 [TENANT-DEBUG] Raw intervention data received:', {
        id: data.id,
        status: data.status,
        user_availabilities_count: data.user_availabilities?.length || 0
      })

      // Filtrer et compter les disponibilités prestataire pour debug
      const providerAvails = data.user_availabilities?.filter(avail => avail.user?.role === 'prestataire') || []
      console.log(`🔧 [TENANT-DEBUG] Provider availabilities found: ${providerAvails.length}`)

      // Fonction helper pour déterminer si on doit récupérer les contacts complets
      const shouldFetchFullContacts = (): boolean => {
        const planificationStatuses = [
          'planification',
          'planifiee',
          'en_cours',
          'terminee',
          'validee',
          'cloturee'
        ]
        return planificationStatuses.includes(data.status?.toLowerCase())
      }

      // Récupérer les contacts du lot/bâtiment si les conditions sont remplies
      let organizedContacts = {
        locataires: [],
        syndics: [],
        autres: []
      }

      if (shouldFetchFullContacts()) {
        console.log('🔍 [TENANT-DEBUG] Fetching full contacts for tenant view')

        let contacts = []
        if (data.lot_id) {
          // Intervention sur lot spécifique
          contacts = await contactService.getLotContacts(data.lot_id)
          console.log('✅ [TENANT-DEBUG] Lot contacts loaded:', contacts.length)
        } else if (data.building_id) {
          // Intervention sur bâtiment entier
          contacts = await contactService.getBuildingContacts(data.building_id)
          console.log('✅ [TENANT-DEBUG] Building contacts loaded:', contacts.length)
        }

        // Organiser les contacts et filtrer le locataire connecté
        const getContactAssignmentType = (contact: any) => {
          if (contact.role && contact.provider_category !== undefined) {
            return determineAssignmentType({
              id: contact.id,
              role: contact.role,
              provider_category: contact.provider_category
            })
          }
          return 'other'
        }

        organizedContacts = {
          // Autres locataires du bien (exclure l'utilisateur connecté)
          locataires: contacts
            .filter((contact: any) =>
              getContactAssignmentType(contact) === 'tenant' &&
              contact.id !== user.id
            )
            .map((contact: any) => ({
              ...contact,
              inChat: false
            })),
          // Pas de syndics dans la vue locataire selon les nouvelles règles
          syndics: [],
          // Seulement les gestionnaires, pas les prestataires du bien
          autres: contacts
            .filter((contact: any) => {
              const type = getContactAssignmentType(contact)
              // Garder seulement les gestionnaires, exclure prestataires et syndics
              return type === 'manager'
            })
            .map((contact: any) => ({
              ...contact,
              inChat: false
            }))
        }

        console.log('✅ [TENANT-DEBUG] Organized contacts:', {
          locataires: organizedContacts.locataires.length,
          syndics: organizedContacts.syndics.length,
          autres: organizedContacts.autres.length
        })
      } else {
        console.log('🔒 [TENANT-DEBUG] Intervention status not in planification phase, using empty contacts')
      }

      // Transform the data to match expected format for InterventionDetailTabs
      const transformedData = {
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.intervention_type || "Non spécifié",
        urgency: data.priority || "Normale",
        status: data.status,
        createdAt: data.created_at,
        createdBy: "Vous",
        reference: `INT-${data.id.slice(-8)}`,
        requestedDate: data.requested_date,
        scheduledDate: data.scheduled_date,
        estimatedCost: data.estimated_cost,
        finalCost: data.final_cost,
        // Support des interventions lot ET bâtiment
        lot: data.lot ? {
          id: data.lot.id,
          reference: data.lot.reference,
          building: data.lot.building ? {
            id: data.lot.building.id,
            name: data.lot.building.name,
            address: data.lot.building.address,
            city: data.lot.building.city,
            postal_code: data.lot.building.postal_code
          } : null,
          floor: data.lot.floor,
          apartment_number: data.lot.apartment_number
        } : undefined,
        building: data.building ? {
          id: data.building.id,
          name: data.building.name,
          address: data.building.address,
          city: data.building.city,
          postal_code: data.building.postal_code
        } : undefined,
        tenant: data.tenant ? {
          id: data.tenant_id,
          name: data.tenant.name,
          email: data.tenant.email,
          phone: data.tenant.phone
        } : undefined,
        manager: data.manager ? {
          id: data.manager.id,
          name: data.manager.name,
          email: data.manager.email,
          phone: data.manager.phone
        } : undefined,
        assignedContact: data.assigned_contact ? {
          id: data.assigned_contact.id,
          name: data.assigned_contact.name,
          email: data.assigned_contact.email,
          phone: data.assigned_contact.phone,
          speciality: data.assigned_contact.speciality
        } : undefined,
        // Contacts selon les conditions de visibilité
        contacts: organizedContacts,
        // Scheduling
        scheduling: {
          type: data.scheduled_date ? "fixed" : "tbd",
          fixedDate: data.scheduled_date ? new Date(data.scheduled_date).toISOString().split('T')[0] : undefined,
          fixedTime: data.scheduled_date ? new Date(data.scheduled_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : undefined
        },
        // Instructions
        instructions: {
          type: "individual",
          groupMessage: data.instructions
        },
        attachments: data.intervention_documents?.map(doc => ({
          name: doc.original_filename,
          size: formatFileSize(doc.file_size),
          type: doc.mime_type,
          id: doc.id,
          storagePath: doc.storage_path,
          uploadedAt: doc.uploaded_at,
          uploadedBy: doc.uploaded_by_user?.name || 'Utilisateur'
        })) || [],
        availabilities: data.user_availabilities?.map(avail => ({
          person: avail.user.name,
          role: avail.user.role,
          date: avail.date,
          startTime: avail.start_time,
          endTime: avail.end_time,
          userId: avail.user.id
        })) || [],
        quotes: data.intervention_quotes?.filter(quote => quote.status === 'approved').map(quote => ({
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
          attachments: quote.attachments || [],
          isCurrentUserQuote: false
        })) || [], // Locataires voient seulement les devis approuvés pour identifier les prestataires sélectionnés
      }

      console.log('✅ [TENANT-DEBUG] Transformed intervention data:', {
        id: transformedData.id,
        status: transformedData.status,
        availabilities_count: transformedData.availabilities.length,
        approved_quotes_count: transformedData.quotes.length,
        approved_providers: transformedData.quotes.map(q => ({ id: q.providerId, name: q.providerName }))
      })

      setIntervention(transformedData)
    } catch (err) {
      console.error("Error refreshing intervention:", err)
    }
  }


  useEffect(() => {
    const fetchIntervention = async () => {
      try {
        setLoading(true)
        setError(null)
        await refreshIntervention()
      } catch (err) {
        console.error("Error fetching intervention:", err)
        setError("Erreur lors du chargement de l'intervention")
      } finally {
        setLoading(false)
      }
    }

    if (resolvedParams.id && user?.id) {
      fetchIntervention()
    }
  }, [resolvedParams.id, user?.id])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">
                {error}
              </p>
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!intervention) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Intervention non trouvée
              </p>
              <div className="flex justify-center mt-4">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }


  const handleBack = () => {
    router.back()
  }

  const handleArchive = () => {
    // Pas d'archivage pour les locataires
    console.log('Archive not available for tenants')
  }

  const handleStatusAction = (action: string) => {
    // Actions gérées par le panel d'actions
    console.log('Status action:', action)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header unifié */}
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
          building: intervention.building
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
              tenant_id: user?.id,
              scheduled_date: intervention.scheduledDate
            }}
            userRole="locataire"
            userId={user?.id || ''}
            onActionComplete={refreshIntervention}
          />
        }
      />

      <InterventionDetailTabs
        intervention={intervention}
        userRole="locataire"
        userId={user?.id || ""}
        onDataChange={refreshIntervention}
        onDownloadAttachment={(attachment) => {
          console.log('Download attachment:', attachment)
          // TODO: Implémenter le téléchargement des pièces jointes
        }}
      />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-9 w-40" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          <div className="flex items-center space-x-3 mb-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-80" />
          </div>

          <Skeleton className="h-5 w-64 mb-4" />

          <div className="flex items-center space-x-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Intervention details card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned contacts card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar skeleton */}
          <div className="space-y-6">
            {/* Planning card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>

            {/* Files card skeleton */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
