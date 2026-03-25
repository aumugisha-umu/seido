'use client'

import { DocumentsSection } from '@/components/intervention/documents-section'
import { PropertyDocumentsPanel } from '@/components/documents'
import { BUILDING_DOCUMENT_SLOTS } from '@/lib/constants/property-document-slots'
import { logger } from '@/lib/logger'

interface BuildingDocumentsTabProps {
  buildingId: string
  teamId: string
  interventionsWithDocs: unknown[]
}

export function BuildingDocumentsTab({
  buildingId,
  teamId,
  interventionsWithDocs,
}: BuildingDocumentsTabProps) {
  const transformInterventionsForDocuments = (interventionsData: unknown[]) => {
    return interventionsData.map((intervention: {
      id: string
      reference?: string
      title: string
      type: string
      status: string
      completed_at?: string
      assigned_contact?: { name: string }
      documents?: Array<{
        id: string
        original_filename?: string
        filename: string
        file_size: number
        mime_type: string
        uploaded_at: string
      }>
    }) => ({
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
      documents: intervention.documents?.map((doc) => ({
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
    })).filter((intervention: { documents: unknown[] }) => intervention.documents.length > 0)
  }

  const handleDocumentView = (document: unknown) => {
    logger.info('Viewing document:', document)
  }

  const handleDocumentDownload = (document: unknown) => {
    logger.info('Downloading document:', document)
  }

  return (
    <div className="space-y-6">
      {/* Property documents (PEB, ascenseur, amiante, etc.) */}
      <PropertyDocumentsPanel
        entityType="building"
        entityId={buildingId}
        teamId={teamId}
        slotConfigs={BUILDING_DOCUMENT_SLOTS}
      />

      {/* Intervention documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">Documents d&apos;intervention</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Documents lies aux interventions realisees dans cet immeuble
            </p>
          </div>
        </div>

        <DocumentsSection
          interventions={transformInterventionsForDocuments(interventionsWithDocs)}
          loading={false}
          emptyMessage="Aucun document trouve"
          emptyDescription="Aucune intervention avec documents n'a ete realisee dans cet immeuble."
          onDocumentView={handleDocumentView}
          onDocumentDownload={handleDocumentDownload}
        />
      </div>
    </div>
  )
}
