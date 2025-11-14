'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Wrench, Users, Plus, AlertCircle, UserCheck, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import { determineAssignmentType } from '@/lib/services'
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { logger } from '@/lib/logger'
import { deleteLotAction } from './actions'
import type { Lot } from '@/lib/services'
import { LotStatsBadges } from './lot-stats-badges'
import { LotContactsGridPreview } from '@/components/ui/lot-contacts-grid-preview'

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

interface LotContact {
  id: string
  user_id: string
  lot_id: string
  building_id: string | null
  type: 'tenant' | 'owner' | 'manager' | 'provider'
  status: 'active'
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    role?: string
    provider_category?: string
    is_active: boolean
    company?: string
    address?: string
    speciality?: string
  }
  [key: string]: unknown
}

interface Intervention {
  id: string
  title: string
  status: string
  description: string
  reference: string
  urgency?: string
  estimated_cost?: number
  scheduled_date?: string
  created_at: string
  assigned_contact?: { name: string }
  [key: string]: unknown
}

interface LotDetailsClientProps {
  lot: Lot & {
    building?: {
      id: string
      name: string
      address: string
      city: string
    }
    manager?: { name: string }
    apartment_number?: string
    floor?: number
    surface_area?: number
    rooms?: number
    is_occupied?: boolean
    [key: string]: unknown
  }
  interventions: Intervention[]
  contacts: LotContact[]
  buildingContacts: LotContact[]
  interventionsWithDocs: Intervention[]
  isOccupied: boolean
  teamId: string
}

export default function LotDetailsClient({
  lot,
  interventions,
  contacts: initialContacts,
  buildingContacts,
  interventionsWithDocs,
  isOccupied: initialIsOccupied,
  teamId
}: LotDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  // Local state
  const [contacts, setContacts] = useState(initialContacts)
  const [isOccupied, setIsOccupied] = useState(initialIsOccupied)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate intervention stats
  const getInterventionStats = () => {
    return {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'pending').length,
      inProgress: interventions.filter(i => i.status === 'in_progress' || i.status === 'assigned').length,
      completed: interventions.filter(i => i.status === 'completed').length
    }
  }

  const confirmDelete = async () => {
    if (!lot?.id) return

    try {
      setIsDeleting(true)
      logger.info("🗑️ Deleting lot:", lot.id)

      const deleteResult = await deleteLotAction(lot.id)

      if (!deleteResult.success) {
        throw new Error(deleteResult.error?.message || 'Failed to delete lot')
      }

      // Redirect to building page or buildings list
      if (lot.building?.id) {
        router.push(`/gestionnaire/biens/immeubles/${lot.building.id}?lot=deleted`)
      } else {
        router.push('/gestionnaire/biens')
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error("❌ Error deleting lot:", errorMessage)
      setError(`Erreur lors de la suppression du lot: ${errorMessage}`)
      setIsDeleting(false)
      setShowDeleteModal(false)
    }
  }

  // Transform interventions data for documents component
  const transformInterventionsForDocuments = (interventionsData: Intervention[]) => {
    return interventionsData.map(intervention => ({
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
      documents: intervention.documents?.map((doc: {
        id: string
        original_filename?: string
        filename: string
        file_size: number
        mime_type: string
        uploaded_at: string
      }) => ({
        id: doc.id,
        name: doc.original_filename || doc.filename,
        size: doc.file_size,
        type: doc.mime_type,
        uploadedAt: doc.uploaded_at,
        uploadedBy: {
          name: 'Utilisateur',
          role: 'user'
        }
      })) || []
    })).filter(intervention => intervention.documents.length > 0)
  }

  const handleDocumentView = (document: unknown) => {
    logger.info('Viewing document:', document)
  }

  const handleDocumentDownload = (document: unknown) => {
    logger.info('Downloading document:', document)
  }

  const handleBack = () => {
    if (lot.building?.id) {
      router.push(`/gestionnaire/biens/immeubles/${lot.building.id}`)
    } else {
      router.push('/gestionnaire/biens')
    }
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/biens/lots/modifier/${lot.id}`)
  }

  const handleCustomAction = (actionKey: string) => {
    switch (actionKey) {
      case "add-intervention":
        router.push(`/gestionnaire/interventions/nouvelle-intervention?lotId=${lot.id}`)
        break
      default:
        logger.info("Action not implemented:", actionKey)
    }
  }

  const interventionStats = getInterventionStats()

  // Transform contacts by role for grid preview
  const transformContactsByRole = () => {
    const managers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const tenants: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const providers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const owners: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const others: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []

    contacts.forEach((contact) => {
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
    const buildingManagers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const buildingTenants: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const buildingProviders: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const buildingOwners: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []
    const buildingOthers: Array<{ id: string; name: string; email: string; phone?: string; type: string; speciality?: string }> = []

    buildingContacts.forEach((contact) => {
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
  contacts.forEach((contact) => {
    lotContactIds[contact.user_id] = contact.id
  })

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye },
    { id: "interventions", label: "Interventions", icon: Wrench, count: interventionStats.total },
    { id: "documents", label: "Documents", icon: FileText },
  ]

  return (
    <div className="layout-padding h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <PropertyDetailHeader
        property={{
          id: lot.id,
          title: lot.reference,
          reference: lot.reference,
          createdAt: lot.created_at,
          createdBy: lot.manager?.name,
          isOccupied,
          apartmentNumber: lot.apartment_number,
          floor: lot.floor,
          building: lot.building ? {
            name: lot.building.name,
            address: lot.building.address,
            city: lot.building.city,
          } : undefined,
        }}
        type="lot"
        onBack={handleBack}
        onEdit={handleEdit}
        customActions={[
          { key: "add-intervention", label: "Créer une intervention", icon: Plus, onClick: () => handleCustomAction("add-intervention") },
        ]}
        onArchive={() => logger.info("Archive lot:", lot.id)}
      />

      {error && (
        <div className="content-max-width px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Surface and rooms info */}
      {(lot.surface_area || lot.rooms) && (
        <div className="content-max-width px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex items-center justify-center space-x-6 text-sm text-slate-600">
            {lot.surface_area && (
              <div className="flex items-center space-x-1">
                <span>📐 {lot.surface_area} m²</span>
              </div>
            )}
            {lot.rooms && (
              <div className="flex items-center space-x-1">
                <span>🏠 {lot.rooms} pièces</span>
              </div>
            )}
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
              totalContacts={contacts.length}
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
                teamId={teamId}
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
              createButtonAction: () => router.push(`/gestionnaire/interventions/nouvelle-intervention?lotId=${lot.id}`)
            }}
            showStatusActions={true}
            searchPlaceholder="Rechercher par titre, description, ou lot..."
            showFilters={true}
            isEmbeddedInCard={true}
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
              interventions={transformInterventionsForDocuments(interventionsWithDocs)}
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
  )
}
