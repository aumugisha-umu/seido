"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  Wrench,
  ChevronDown,
  ChevronRight,
  Paperclip,
  File,
  FileSpreadsheet,
  FileImage
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { DocumentViewerModal } from "./document-viewer-modal"

interface Document {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  uploadedBy?: {
    name: string
    role: string
  }
}

interface InterventionWithDocuments {
  id: string
  reference: string
  title: string
  type: string
  status: string
  completedAt?: string
  assignedContact?: {
    name: string
    role: string
  }
  documents: Document[]
}

interface DocumentsSectionProps {
  interventions: InterventionWithDocuments[]
  loading?: boolean
  emptyMessage?: string
  emptyDescription?: string
  onDocumentView?: (document: Document) => void
  onDocumentDownload?: (document: Document) => void
}

export function DocumentsSection({
  interventions,
  loading = false,
  emptyMessage = "Aucun document",
  emptyDescription = "Aucune intervention avec documents trouvée pour ce bien.",
  onDocumentView,
  onDocumentDownload,
}: DocumentsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedInterventions, setExpandedInterventions] = useState<string[]>([])
  
  // Document viewer modal state
  const [viewerModalOpen, setViewerModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  // Filtrer les interventions avec documents
  const interventionsWithDocs = interventions.filter(intervention => 
    intervention.documents && intervention.documents.length > 0
  )

  const filteredInterventions = interventionsWithDocs.filter(intervention => {
    const matchesSearch = !searchQuery || 
      intervention.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intervention.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intervention.documents.some(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    
    const matchesStatus = statusFilter === "all" || intervention.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const toggleInterventionExpanded = (interventionId: string) => {
    setExpandedInterventions(prev =>
      prev.includes(interventionId)
        ? prev.filter(id => id !== interventionId)
        : [...prev, interventionId]
    )
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet
    if (fileType === 'application/pdf') return File
    return FileText
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-orange-100 text-orange-800'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée'
      case 'in_progress': return 'En cours'
      case 'pending': return 'En attente'
      default: return status
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Handle document viewing
  const handleDocumentView = (document: Document) => {
    if (onDocumentView) {
      onDocumentView(document)
    } else {
      // Use built-in modal viewer
      setSelectedDocument(document)
      setViewerModalOpen(true)
    }
  }

  // Handle document download
  const handleDocumentDownload = async (document: Document) => {
    if (onDocumentDownload) {
      onDocumentDownload(document)
    } else {
      // Use built-in download functionality
      try {
        const response = await fetch(`/api/download-intervention-document?documentId=${document.id}`)
        const data = await response.json()
        
        if (response.ok && data.downloadUrl) {
          // Create a temporary link to trigger download
          const link = window.document.createElement('a')
          link.href = data.downloadUrl
          link.download = data.document.filename
          window.document.body.appendChild(link)
          link.click()
          window.document.body.removeChild(link)
        } else {
          console.error("Erreur de téléchargement:", data.error)
          // Could show a toast notification here
        }
      } catch (error) {
        console.error("Erreur lors du téléchargement:", error)
        // Could show a toast notification here
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (filteredInterventions.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">{emptyMessage}</h3>
        <p className="text-slate-600 mb-4">{emptyDescription}</p>
        {interventionsWithDocs.length === 0 && (
          <p className="text-sm text-slate-500">
            Les documents seront automatiquement regroupés ici lorsque des interventions avec fichiers seront ajoutées.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Rechercher par intervention ou nom de fichier..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="completed">Terminées</SelectItem>
              <SelectItem value="in_progress">En cours</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Document count */}
      <div className="text-sm text-slate-600">
        {filteredInterventions.length} intervention(s) avec {filteredInterventions.reduce((acc, int) => acc + int.documents.length, 0)} document(s)
      </div>

      {/* Interventions with Documents */}
      <div className="space-y-4">
        {filteredInterventions.map((intervention) => {
          const isExpanded = expandedInterventions.includes(intervention.id)
          
          return (
            <Card key={intervention.id} className="border border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleInterventionExpanded(intervention.id)}
                    className="flex items-center space-x-3 text-left flex-1 hover:bg-slate-50 -mx-2 px-2 py-1 rounded-md transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-sky-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-slate-900 truncate">{intervention.title}</h3>
                        <Badge className={`text-xs ${getStatusColor(intervention.status)}`}>
                          {getStatusLabel(intervention.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-600 mt-1">
                        <span>Réf: {intervention.reference}</span>
                        <span>Type: {intervention.type}</span>
                        {intervention.assignedContact && (
                          <span>Contact: {intervention.assignedContact.name}</span>
                        )}
                        {intervention.completedAt && (
                          <span>
                            Terminée le {format(new Date(intervention.completedAt), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center space-x-2 ml-4">
                    <Badge variant="outline" className="text-xs">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {intervention.documents.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t border-slate-200 pt-4">
                    <div className="grid grid-cols-1 gap-3">
                      {intervention.documents.map((document) => {
                        const FileIcon = getFileIcon(document.type)
                        
                        return (
                          <div
                            key={document.id}
                            className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-slate-200">
                              <FileIcon className="h-5 w-5 text-slate-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-900 truncate">{document.name}</div>
                              <div className="flex items-center space-x-4 text-sm text-slate-600">
                                <span>{formatFileSize(document.size)}</span>
                                <span>
                                  Ajouté le {format(new Date(document.uploadedAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                </span>
                                {document.uploadedBy && (
                                  <span>par {document.uploadedBy.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDocumentView(document)}
                                className="h-8 w-8 p-0"
                                title="Voir le document"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDocumentDownload(document)}
                                className="h-8 w-8 p-0"
                                title="Télécharger"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={viewerModalOpen}
        onClose={() => {
          setViewerModalOpen(false)
          setSelectedDocument(null)
        }}
        document={selectedDocument}
        onDownload={handleDocumentDownload}
      />
    </div>
  )
}
