"use client"

import { useState, useEffect } from "react"
import {
  FileText,
  Upload,
  Grid3x3,
  List,
  Filter,
  RefreshCw,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { DocumentList } from "@/components/intervention/document-list"
import { DocumentUploadZone } from "@/components/intervention/document-upload-zone"
import { DocumentViewer } from "@/components/intervention/document-viewer"
import {
  useInterventionDocuments,
  InterventionDocument,
  getDocumentTypeLabel,
} from "@/hooks/use-intervention-documents"
import { cn } from "@/lib/utils"

interface InterventionDocumentsProps {
  interventionId: string
  interventionStatus: string
  userRole: 'gestionnaire' | 'prestataire' | 'locataire'
  userId: string
  className?: string
}

export function InterventionDocuments({
  interventionId,
  interventionStatus,
  userRole,
  userId,
  className,
}: InterventionDocumentsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDocument, setSelectedDocument] = useState<InterventionDocument | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'reports' | 'invoices'>('all')

  const {
    documents,
    loading,
    error,
    totalCount,
    fetchDocuments,
    deleteDocument,
    updateDocumentType,
  } = useInterventionDocuments({
    interventionId,
    autoFetch: true,
  })

  // Check if user can upload documents
  const canUpload = () => {
    // Gestionnaires can always upload
    if (userRole === 'gestionnaire') return true

    // Prestataires can upload during execution
    if (userRole === 'prestataire') {
      const executionStatuses = ['en_cours', 'terminee']
      return executionStatuses.includes(interventionStatus.toLowerCase())
    }

    // Locataires can upload when creating or during execution
    if (userRole === 'locataire') {
      const allowedStatuses = ['brouillon', 'soumise', 'en_cours']
      return allowedStatuses.includes(interventionStatus.toLowerCase())
    }

    return false
  }

  // Check if user can delete documents
  const canDelete = (doc: InterventionDocument) => {
    // Gestionnaires can delete any document
    if (userRole === 'gestionnaire') return true

    // Users can delete their own documents
    return doc.uploaded_by === userId
  }

  // Filter documents by tab
  const getFilteredDocuments = () => {
    switch (activeTab) {
      case 'photos':
        return documents.filter(doc =>
          doc.document_type === 'photo_avant' ||
          doc.document_type === 'photo_apres'
        )
      case 'reports':
        return documents.filter(doc => doc.document_type === 'rapport')
      case 'invoices':
        return documents.filter(doc =>
          doc.document_type === 'facture' ||
          doc.document_type === 'devis'
        )
      default:
        return documents
    }
  }

  // Handle document view
  const handleViewDocument = (doc: InterventionDocument) => {
    setSelectedDocument(doc)
    setIsViewerOpen(true)
  }

  // Handle document navigation in viewer
  const handleNavigateDocument = (direction: 'prev' | 'next') => {
    const filteredDocs = getFilteredDocuments()
    const currentIndex = filteredDocs.findIndex(d => d.id === selectedDocument?.id)

    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDocument(filteredDocs[currentIndex - 1])
    } else if (direction === 'next' && currentIndex < filteredDocs.length - 1) {
      setSelectedDocument(filteredDocs[currentIndex + 1])
    }
  }

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      const success = await deleteDocument(documentId)
      if (success) {
        // Close viewer if deleted document was being viewed
        if (selectedDocument?.id === documentId) {
          setIsViewerOpen(false)
          setSelectedDocument(null)
        }
      }
    }
  }

  // Handle upload complete
  const handleUploadComplete = () => {
    setIsUploadOpen(false)
    fetchDocuments() // Refresh document list
  }

  // Count documents by type for tab badges
  const photoCount = documents.filter(doc =>
    doc.document_type === 'photo_avant' ||
    doc.document_type === 'photo_apres'
  ).length
  const reportCount = documents.filter(doc => doc.document_type === 'rapport').length
  const invoiceCount = documents.filter(doc =>
    doc.document_type === 'facture' ||
    doc.document_type === 'devis'
  ).length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Documents de l'intervention</h3>
          <p className="text-sm text-gray-500">
            {totalCount} document{totalCount > 1 ? 's' : ''} au total
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          {/* Upload button */}
          {canUpload() && (
            <Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter des documents
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>Ajouter des documents</SheetTitle>
                  <SheetDescription>
                    Téléchargez des photos, rapports ou factures liés à cette intervention
                  </SheetDescription>
                </SheetHeader>
                <Separator className="my-4" />
                <DocumentUploadZone
                  interventionId={interventionId}
                  onUploadComplete={handleUploadComplete}
                />
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Document tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="relative">
            Tous
            {totalCount > 0 && (
              <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {totalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="photos" className="relative">
            Photos
            {photoCount > 0 && (
              <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {photoCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            Rapports
            {reportCount > 0 && (
              <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {reportCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="relative">
            Factures
            {invoiceCount > 0 && (
              <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                {invoiceCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <DocumentList
            documents={getFilteredDocuments()}
            loading={loading}
            error={error}
            userRole={userRole}
            viewMode={viewMode}
            showTypeFilter={false}
            onView={handleViewDocument}
            onDelete={canDelete ? handleDeleteDocument : undefined}
            onTypeChange={userRole === 'gestionnaire' ? updateDocumentType : undefined}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <DocumentList
            documents={getFilteredDocuments()}
            loading={loading}
            error={error}
            userRole={userRole}
            viewMode={viewMode}
            showTypeFilter={false}
            onView={handleViewDocument}
            onDelete={canDelete ? handleDeleteDocument : undefined}
            onTypeChange={userRole === 'gestionnaire' ? updateDocumentType : undefined}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <DocumentList
            documents={getFilteredDocuments()}
            loading={loading}
            error={error}
            userRole={userRole}
            viewMode={viewMode}
            showTypeFilter={false}
            onView={handleViewDocument}
            onDelete={canDelete ? handleDeleteDocument : undefined}
            onTypeChange={userRole === 'gestionnaire' ? updateDocumentType : undefined}
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <DocumentList
            documents={getFilteredDocuments()}
            loading={loading}
            error={error}
            userRole={userRole}
            viewMode={viewMode}
            showTypeFilter={false}
            onView={handleViewDocument}
            onDelete={canDelete ? handleDeleteDocument : undefined}
            onTypeChange={userRole === 'gestionnaire' ? updateDocumentType : undefined}
          />
        </TabsContent>
      </Tabs>

      {/* Document viewer modal */}
      <DocumentViewer
        document={selectedDocument}
        documents={getFilteredDocuments()}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false)
          setSelectedDocument(null)
        }}
        onNavigate={handleNavigateDocument}
      />
    </div>
  )
}