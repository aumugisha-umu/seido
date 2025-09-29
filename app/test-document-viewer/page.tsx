"use client"

import { useState } from "react"
import { DocumentViewerModal } from "@/components/intervention/document-viewer-modal"
import { DocumentList } from "@/components/intervention/document-list"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { InterventionDocument } from "@/hooks/use-intervention-documents"

// Test data matching the InterventionDocument structure
const mockDocuments: InterventionDocument[] = [
  {
    id: "doc-1",
    intervention_id: "int-1",
    document_type: "photo_avant",
    original_filename: "photo-facade-avant-travaux.jpg",
    storage_path: "/interventions/int-1/photos/photo-facade-avant-travaux.jpg",
    file_size: 2456789,
    mime_type: "image/jpeg",
    description: "Photo de la façade avant le début des travaux de ravalement",
    uploaded_by: "user-1",
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    signed_url: "https://picsum.photos/800/600",
    uploaded_by_user: {
      id: "user-1",
      name: "Jean Dupont",
      email: "jean.dupont@example.com",
      role: "gestionnaire"
    }
  },
  {
    id: "doc-2",
    intervention_id: "int-1",
    document_type: "rapport",
    original_filename: "rapport-intervention-2024-01.pdf",
    storage_path: "/interventions/int-1/rapports/rapport-intervention-2024-01.pdf",
    file_size: 1234567,
    mime_type: "application/pdf",
    description: "Rapport détaillé de l'intervention avec photos et recommandations",
    uploaded_by: "user-2",
    uploaded_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    uploaded_by_user: {
      id: "user-2",
      name: "Marie Martin",
      email: "marie.martin@example.com",
      role: "prestataire"
    }
  },
  {
    id: "doc-3",
    intervention_id: "int-1",
    document_type: "facture",
    original_filename: "facture-INT-2024-001.pdf",
    storage_path: "/interventions/int-1/factures/facture-INT-2024-001.pdf",
    file_size: 567890,
    mime_type: "application/pdf",
    description: "Facture finale de l'intervention",
    uploaded_by: "user-2",
    uploaded_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    uploaded_by_user: {
      id: "user-2",
      name: "Marie Martin",
      email: "marie.martin@example.com",
      role: "prestataire"
    }
  },
  {
    id: "doc-4",
    intervention_id: "int-1",
    document_type: "photo_apres",
    original_filename: "photo-facade-apres-travaux.jpg",
    storage_path: "/interventions/int-1/photos/photo-facade-apres-travaux.jpg",
    file_size: 3456789,
    mime_type: "image/jpeg",
    description: "Photo de la façade après achèvement des travaux",
    uploaded_by: "user-2",
    uploaded_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    signed_url: "https://picsum.photos/800/600?random=2",
    uploaded_by_user: {
      id: "user-2",
      name: "Marie Martin",
      email: "marie.martin@example.com",
      role: "prestataire"
    }
  }
]

export default function TestDocumentViewerPage() {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const handleViewDocument = (document: any) => {
    console.log("Viewing document:", document)
    setSelectedDocument(document)
    setViewerOpen(true)
  }

  const handleDownloadDocument = (document: any) => {
    console.log("Downloading document:", document)
    alert(`Document download triggered: ${document.original_filename}`)
  }

  const handleDeleteDocument = (documentId: string) => {
    console.log("Deleting document:", documentId)
    alert(`Document deletion triggered: ${documentId}`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Document Viewer Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              This page tests the document preview functionality with proper interface mapping
            </p>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
            </div>
          </div>

          <DocumentList
            documents={mockDocuments}
            userRole="gestionnaire"
            onView={handleViewDocument}
            onDownload={handleDownloadDocument}
            onDelete={handleDeleteDocument}
            viewMode={viewMode}
            showTypeFilter={true}
          />
        </CardContent>
      </Card>

      {/* Test direct modal opening */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Modal Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockDocuments.map(doc => (
            <Button
              key={doc.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleViewDocument(doc)}
            >
              Open Modal: {doc.original_filename}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false)
          setSelectedDocument(null)
        }}
        document={selectedDocument}
        onDownload={handleDownloadDocument}
      />

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Modal Open:</strong> {viewerOpen ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Selected Document:</strong>
              {selectedDocument ? (
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-48">
                  {JSON.stringify(selectedDocument, null, 2)}
                </pre>
              ) : (
                ' None'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}