/**
 * Page Détail Lot - Mode Démo
 * Affiche les informations détaillées d'un lot
 */

'use client'

import { use, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Edit, Home, Users, Wrench, Eye, FileText, Building2, MapPin, Info, Calendar, EditIcon, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDemoLot, useDemoLotContacts, useDemoLotStats } from '@/hooks/demo/use-demo-lots'
import { useDemoInterventions } from '@/hooks/demo/use-demo-interventions'
import { useDemoBuilding } from '@/hooks/demo/use-demo-buildings'
import { DetailPageHeader, type DetailPageHeaderBadge, type DetailPageHeaderMetadata, type DetailPageHeaderAction } from '@/components/ui/detail-page-header'
import { LotStatsBadges } from '@/app/gestionnaire/biens/lots/[id]/lot-stats-badges'
import { LotContactsGridPreview } from '@/components/ui/lot-contacts-grid-preview'
import { InterventionsNavigator } from '@/components/interventions/interventions-navigator'
import { DocumentsSection } from '@/components/intervention/documents-section'
import { DeleteConfirmModal } from '@/components/delete-confirm-modal'

// Helper function to get French label for lot category
function getCategoryLabel(category: string): string {
  const categoryLabels: Record<string, string> = {
    'appartement': 'Appartement',
    'collocation': 'Collocation',
    'maison': 'Maison',
    'garage': 'Garage',
    'local_commercial': 'Local commercial',
    'parking': 'Parking',
    'autre': 'Autre'
  }
  return categoryLabels[category] || category
}

export default function LotDetailPageDemo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const { lot } = useDemoLot(id)
  const { contacts: lotContacts, buildingContacts } = useDemoLotContacts(id)
  const { stats } = useDemoLotStats(id)
  const { interventions } = useDemoInterventions({ lot_id: id })

  const [activeTab, setActiveTab] = useState("overview")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get building data if lot has building_id
  const { building } = useDemoBuilding(lot?.building_id || '')

  if (!lot) {
    notFound()
  }

  // Calculate intervention stats
  const getInterventionStats = () => {
    return {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'demande').length,
      inProgress: interventions.filter(i =>
        ['approuvee', 'demande_de_devis', 'planification', 'planifiee', 'en_cours'].includes(i.status)
      ).length,
      completed: interventions.filter(i =>
        ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)
      ).length
    }
  }

  const interventionStats = getInterventionStats()

  // Check if lot is occupied
  const isOccupied = lotContacts.some((contact: any) => contact.user?.role === 'locataire')

  const confirmDelete = async () => {
    if (!lot?.id) return

    try {
      setIsDeleting(true)
      // In demo mode, just redirect back
      setTimeout(() => {
        if (lot.building_id) {
          router.push(`/demo/gestionnaire/biens/immeubles/${lot.building_id}`)
        } else {
          router.push('/demo/gestionnaire/biens')
        }
      }, 500)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Erreur lors de la suppression du lot: ${errorMessage}`)
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleBack = () => {
    if (lot.building_id) {
      router.push(`/demo/gestionnaire/biens/immeubles/${lot.building_id}`)
    } else {
      router.push('/demo/gestionnaire/biens')
    }
  }

  const handleEdit = () => {
    router.push(`/demo/gestionnaire/biens/lots/modifier/${lot.id}`)
  }

  const handleCustomAction = (actionKey: string) => {
    switch (actionKey) {
      case "add-intervention":
        router.push(`/demo/gestionnaire/interventions/nouvelle?lot_id=${lot.id}`)
        break
      default:
        console.log("Action not implemented:", actionKey)
    }
  }

  // Transform contacts by role for grid preview
  const transformContactsByRole = () => {
    const managers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const tenants: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const providers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const owners: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const others: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []

    lotContacts.forEach((contact: any) => {
      const transformedContact = {
        id: contact.user_id,
        name: contact.user.name,
        email: contact.user.email,
        phone: contact.user.phone,
        type: contact.user.role || 'other',
        speciality: contact.user.speciality
      }

      switch (contact.user.role) {
        case 'gestionnaire':
        case 'admin':
          managers.push(transformedContact)
          break
        case 'locataire':
          tenants.push(transformedContact)
          break
        case 'prestataire':
          providers.push(transformedContact)
          break
        case 'proprietaire':
          owners.push(transformedContact)
          break
        default:
          others.push(transformedContact)
      }
    })

    return { managers, tenants, providers, owners, others }
  }

  const { managers, tenants, providers, owners, others } = transformContactsByRole()

  // Transform building contacts by role for inheritance display
  const transformBuildingContactsByRole = () => {
    const buildingManagers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingTenants: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingProviders: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingOwners: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []
    const buildingOthers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }> = []

    buildingContacts.forEach((contact: any) => {
      const transformedContact = {
        id: contact.user_id,
        name: contact.user.name,
        email: contact.user.email,
        phone: contact.user.phone,
        company: contact.user.company,
        type: contact.user.role || 'other',
        speciality: contact.user.speciality
      }

      switch (contact.user.role) {
        case 'gestionnaire':
        case 'admin':
          buildingManagers.push(transformedContact)
          break
        case 'locataire':
          buildingTenants.push(transformedContact)
          break
        case 'prestataire':
          buildingProviders.push(transformedContact)
          break
        case 'proprietaire':
          buildingOwners.push(transformedContact)
          break
        default:
          buildingOthers.push(transformedContact)
      }
    })

    return { buildingManagers, buildingTenants, buildingProviders, buildingOwners, buildingOthers }
  }

  const { buildingManagers, buildingTenants, buildingProviders, buildingOwners, buildingOthers } = transformBuildingContactsByRole()

  // Create mapping of user_id to lot_contact_id for deletion
  const lotContactIds: Record<string, string> = {}
  lotContacts.forEach((contact: any) => {
    lotContactIds[contact.user_id] = contact.id
  })

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye },
    { id: "interventions", label: "Interventions", icon: Wrench, count: interventionStats.total },
    { id: "documents", label: "Documents", icon: FileText },
  ]

  // Prepare header data
  const headerBadges: DetailPageHeaderBadge[] = []

  // Add category badge
  headerBadges.push({
    label: getCategoryLabel(lot.category),
    icon: Home,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dotColor: 'bg-blue-500'
  })

  // Add occupancy badge
  if (isOccupied) {
    headerBadges.push({
      label: 'Occupé',
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500'
    })
  } else {
    headerBadges.push({
      label: 'Libre',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      dotColor: 'bg-gray-500'
    })
  }

  const headerMetadata: DetailPageHeaderMetadata[] = [
    building && {
      icon: Building2,
      text: building.name
    },
    building && {
      icon: MapPin,
      text: `${building.address}, ${building.city}`
    },
    lot.floor !== undefined && {
      icon: Info,
      text: `Étage ${lot.floor}`
    },
    lot.created_at && {
      icon: Calendar,
      text: `Créé le ${new Date(lot.created_at).toLocaleDateString('fr-FR')}`
    }
  ].filter(Boolean) as DetailPageHeaderMetadata[]

  const primaryActions: DetailPageHeaderAction[] = [
    {
      label: 'Modifier',
      icon: EditIcon,
      onClick: handleEdit,
      variant: 'outline'
    },
    {
      label: 'Créer intervention',
      icon: Plus,
      onClick: () => handleCustomAction('add-intervention'),
      variant: 'default'
    }
  ]

  const dropdownActions: DetailPageHeaderAction[] = [
    {
      label: 'Archiver',
      icon: Archive,
      onClick: () => console.log("Archive lot:", lot.id)
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      onClick: () => setShowDeleteModal(true)
    }
  ]

  // Transform interventions for documents
  const transformInterventionsForDocuments = (interventionsData: any[]) => {
    return interventionsData
      .filter((intervention: any) => intervention.documents && intervention.documents.length > 0)
      .map((intervention: any) => ({
        id: intervention.id,
        reference: intervention.reference || `INT-${intervention.id.slice(-6)}`,
        title: intervention.title,
        type: intervention.type,
        status: intervention.status,
        completedAt: intervention.completed_at,
        assignedContact: intervention.assigned_contact ? {
          name: intervention.assigned_contact.name,
          role: 'prestataire'
        } : undefined,
        documents: intervention.documents.map((doc: any) => ({
          id: doc.id,
          name: doc.original_filename || doc.filename,
          size: doc.file_size,
          type: doc.mime_type,
          uploadedAt: doc.uploaded_at,
          uploadedBy: {
            name: 'Utilisateur',
            role: 'user'
          }
        }))
      }))
  }

  const handleDocumentView = (document: unknown) => {
    console.log('Viewing document:', document)
  }

  const handleDocumentDownload = (document: unknown) => {
    console.log('Downloading document:', document)
  }

  return (
    <>
      {/* Unified Detail Page Header */}
      <DetailPageHeader
        onBack={handleBack}
        backButtonText="Retour aux biens"
        title={lot.reference}
        subtitle={lot.surface_area || lot.rooms ? `${lot.surface_area ? lot.surface_area + ' m²' : ''} ${lot.surface_area && lot.rooms ? '·' : ''} ${lot.rooms ? lot.rooms + ' pièces' : ''}`.trim() : undefined}
        badges={headerBadges}
        metadata={headerMetadata}
        primaryActions={primaryActions}
        dropdownActions={dropdownActions}
      />

      <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
        {error && (
          <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="content-max-width mx-auto w-full px-4 sm:px-6 lg:px-8 mt-0 mb-6">
          <div className="border-b border-slate-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-sky-600 text-sky-600 bg-white"
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <Badge variant="secondary" className="ml-1 text-xs bg-slate-100 text-slate-600">
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Card Content */}
        <Card className="flex-1 flex flex-col content-max-width mx-auto w-full p-6 min-h-0 overflow-hidden">
          <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex-1 flex flex-col min-h-0 pb-6">
              {activeTab === "overview" && (
                <div className="mt-0 flex-1 flex flex-col min-h-0 space-y-10">
                  {/* Section 1: Stats Badges */}
                  <LotStatsBadges
                    stats={{
                      totalInterventions: interventionStats.total,
                      activeInterventions: interventionStats.inProgress,
                      completedInterventions: interventionStats.completed
                    }}
                    totalContacts={lotContacts.length}
                  />

                  {/* Section 1.5: Description (if exists) */}
                  {lot.description && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{lot.description}</p>
                    </div>
                  )}

                  {/* Section 2: Contacts Preview - Grid Only */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">Contacts du lot</h3>
                    <LotContactsGridPreview
                      lotId={lot.id}
                      lotReference={lot.reference}
                      managers={managers}
                      tenants={tenants}
                      providers={providers}
                      owners={owners}
                      others={others}
                      buildingManagers={buildingManagers}
                      buildingTenants={buildingTenants}
                      buildingProviders={buildingProviders}
                      buildingOwners={buildingOwners}
                      buildingOthers={buildingOthers}
                      lotContactIds={lotContactIds}
                      teamId={'demo-team-id'}
                    />
                  </div>
                </div>
              )}

              {activeTab === "interventions" && (
                <div className="flex-1 flex flex-col min-h-0">
                  <InterventionsNavigator
                    interventions={interventions as any}
                    userContext="gestionnaire"
                    loading={false}
                    emptyStateConfig={{
                      title: "Aucune intervention",
                      description: "Aucune intervention n'a été créée pour ce lot.",
                      showCreateButton: true,
                      createButtonText: "Créer une intervention",
                      createButtonAction: () => router.push(`/demo/gestionnaire/interventions/nouvelle?lot_id=${lot.id}`)
                    }}
                    showStatusActions={true}
                    searchPlaceholder="Rechercher par titre, description, ou lot..."
                    showFilters={true}
                    isEmbeddedInCard={true}
                    baseUrl="/demo/gestionnaire/interventions"
                  />
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-6 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Documents du lot</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Documents liés aux interventions réalisées dans ce lot
                      </p>
                    </div>
                  </div>

                  <DocumentsSection
                    interventions={transformInterventionsForDocuments(interventions)}
                    loading={false}
                    emptyMessage="Aucun document trouvé"
                    emptyDescription="Aucune intervention avec documents n'a été réalisée dans ce lot."
                    onDocumentView={handleDocumentView}
                    onDocumentDownload={handleDocumentDownload}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Confirmer la suppression"
          message="Êtes-vous sûr de vouloir supprimer ce lot ? Cette action supprimera également toutes les données associées (interventions, contacts, etc.)."
          itemName={lot?.reference}
          itemType="lot"
          isLoading={isDeleting}
          danger={true}
        />
      </div>
    </>
  )
}
