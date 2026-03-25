import { TabsContent } from '@/components/ui/tabs'
import {
  DocumentsCard,
  ReportsCard,
  type InterventionDocument,
  type InterventionReport,
} from '@/components/interventions/shared'

interface InterventionDocumentsTabProps {
  reports: InterventionReport[]
  transformedDocuments: InterventionDocument[]
  onUpload: () => void
  onView: (documentId: string) => void
  onDownload: (documentId: string) => void
}

export function InterventionDocumentsTab({
  reports,
  transformedDocuments,
  onUpload,
  onView,
  onDownload,
}: InterventionDocumentsTabProps) {
  return (
    <TabsContent value="documents" className="mt-0 flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
        {reports.length > 0 && (
          <ReportsCard reports={reports} />
        )}
        <DocumentsCard
          documents={transformedDocuments}
          userRole="manager"
          onUpload={onUpload}
          onView={onView}
          onDownload={onDownload}
        />
      </div>
    </TabsContent>
  )
}
