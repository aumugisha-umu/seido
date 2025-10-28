'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Eye, FileText, Wrench, Users, Plus, Search, Filter, AlertCircle, UserCheck } from "lucide-react"
import { LotContactsList } from "@/components/lot-contacts-list"
import { useRouter } from "next/navigation"
import { determineAssignmentType } from '@/lib/services'
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { DocumentsSection } from "@/components/intervention/documents-section"
import { PropertyDetailHeader } from "@/components/property-detail-header"
import { logger } from '@/lib/logger'
import { deleteLotAction } from './actions'
import type { Lot } from '@/lib/services'

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
  interventionsWithDocs: Intervention[]
  isOccupied: boolean
}

export default function LotDetailsClient({
  lot,
  interventions,
  contacts: initialContacts,
  interventionsWithDocs,
  isOccupied: initialIsOccupied
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

  const handleContactsUpdate = (updatedContacts: LotContact[]) => {
    setContacts(updatedContacts)
    // Recalculate occupation status
    const hasTenant = updatedContacts.some(contact => contact.user?.role === 'locataire')
    setIsOccupied(hasTenant)
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

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye },
    { id: "contacts", label: "Contacts", icon: Users, count: contacts.length },
    { id: "interventions", label: "Interventions", icon: Wrench, count: interventionStats.total },
    { id: "documents", label: "Documents", icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Surface and rooms info */}
      {(lot.surface_area || lot.rooms) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-sky-500 text-sky-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Lot Information */}
            <Card>
              <CardHeader>
                <CardTitle>Informations du Lot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Référence</span>
                  <span className="font-medium">{lot.reference}</span>
                </div>
                {/* Category */}
                {lot.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Catégorie</span>
                    <span className="font-medium">{getCategoryLabel(lot.category)}</span>
                  </div>
                )}

                {/* Parent Building */}
                {lot.building && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Immeuble</span>
                    <span className="font-medium">{lot.building.name}</span>
                  </div>
                )}

                {/* Complete Address */}
                {(() => {
                  let address = ""
                  if (lot.building) {
                    // Lot in building: use building address
                    address = [lot.building.address, lot.building.city].filter(Boolean).join(", ")
                  } else if (lot.street || lot.city) {
                    // Independent lot: use lot address
                    address = [lot.street, lot.postal_code, lot.city].filter(Boolean).join(", ")
                  }
                  return address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Adresse</span>
                      <span className="font-medium text-sm text-right">{address}</span>
                    </div>
                  )
                })()}

                {lot.apartment_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Numéro de porte</span>
                    <span className="font-medium">{lot.apartment_number}</span>
                  </div>
                )}

                {lot.floor !== null && lot.floor !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Étage</span>
                    <span className="font-medium">{lot.floor}</span>
                  </div>
                )}

                {/* Description */}
                {lot.description && (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <span className="text-gray-600">Description</span>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{lot.description}</p>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut d'occupation</span>
                  <span className="font-medium">
                    <Badge variant={isOccupied ? "default" : "secondary"}>
                      {isOccupied ? "Occupé" : "Vacant"}
                    </Badge>
                  </span>
                </div>
                {(() => {
                  const tenant = contacts.find(contact => contact.user?.role === 'locataire')?.user
                  return tenant && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Locataire</span>
                        <span className="font-medium">{tenant.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email</span>
                        <span className="font-medium text-sm">{tenant.email}</span>
                      </div>
                      {tenant.phone && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Téléphone</span>
                          <span className="font-medium">{tenant.phone}</span>
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div className="pt-2 border-t text-xs text-gray-500">
                  Créé le {new Date(lot.created_at).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>

            {/* Assigned Managers */}
            {contacts.filter(contact => determineAssignmentType({
              id: contact.id,
              role: contact.user.role,
              provider_category: contact.user.provider_category
            }) === 'manager').length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-purple-600" />
                    Gestionnaires assignés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {contacts
                    .filter(contact => determineAssignmentType({
                      id: contact.id,
                      role: contact.user.role,
                      provider_category: contact.user.provider_category
                    }) === 'manager')
                    .map((manager) => (
                      <div key={manager.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border-l-4 border-l-purple-500">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 text-sm">
                            {manager.user.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            {manager.user.email}
                          </div>
                          {manager.user.phone && (
                            <div className="text-xs text-slate-600 mt-1">
                              📞 {manager.user.phone}
                            </div>
                          )}
                          {manager.is_primary_for_lot && (
                            <Badge variant="outline" className="text-xs mt-2">
                              Responsable principal
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="space-y-6">
            <LotContactsList
              lotId={lot.id}
              buildingId={lot?.building?.id}
              contacts={contacts}
              onContactsUpdate={handleContactsUpdate}
            />
          </div>
        )}

        {activeTab === "interventions" && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600">{interventionStats.total}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-orange-600">{interventionStats.pending}</div>
                  <div className="text-sm text-gray-600">En attente</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-yellow-600">{interventionStats.inProgress}</div>
                  <div className="text-sm text-gray-600">En cours</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">{interventionStats.completed}</div>
                  <div className="text-sm text-gray-600">Terminées</div>
                </CardContent>
              </Card>
            </div>

            {/* Interventions Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Wrench className="h-5 w-5 mr-2 text-gray-400" />
                Interventions ({interventionStats.total})
              </h2>
              <Button onClick={() => router.push(`/gestionnaire/interventions/nouvelle-intervention?lotId=${lot.id}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une intervention
              </Button>
            </div>

            {interventions.length > 0 ? (
              <>
                {/* Search and Filter */}
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input placeholder="Rechercher par titre, description..." className="pl-10" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="pending">En attente</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="completed">Terminées</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Interventions List */}
                <div className="space-y-4">
                  {interventions.map((intervention) => (
                    <Card key={intervention.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-medium text-gray-900">{intervention.title}</h3>
                              <Badge variant={
                                intervention.status === 'completed' ? 'default' :
                                intervention.status === 'in_progress' ? 'secondary' :
                                'destructive'
                              }>
                                {intervention.status === 'completed' ? 'Terminée' :
                                 intervention.status === 'in_progress' ? 'En cours' :
                                 intervention.status === 'assigned' ? 'Assignée' :
                                 'En attente'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {intervention.urgency === 'high' ? 'Urgent' :
                                 intervention.urgency === 'medium' ? 'Moyen' :
                                 'Faible'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-3">{intervention.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>Référence: {intervention.reference}</span>
                              {intervention.assigned_contact && (
                                <span>Contact: {intervention.assigned_contact.name}</span>
                              )}
                              {intervention.estimated_cost && (
                                <span>Coût estimé: {intervention.estimated_cost}€</span>
                              )}
                              <span>
                                Créée le {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {intervention.scheduled_date && (
                              <div className="mt-2 text-sm text-blue-600">
                                📅 Programmée pour le {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/gestionnaire/interventions/${intervention.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Voir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
                <p className="text-gray-600 mb-4">Aucune intervention n'a été créée pour ce lot.</p>
                <Button onClick={() => router.push(`/gestionnaire/interventions/nouvelle-intervention?lotId=${lot.id}`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer la première intervention
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
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
      </main>

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
