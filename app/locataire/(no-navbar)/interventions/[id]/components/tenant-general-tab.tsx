import { TabsContent } from '@/components/ui/tabs'
import {
  ContentWrapper,
  InterventionDetailsCard,
  DocumentsCard,
  ReportsCard,
  type InterventionDocument,
  type InterventionReport,
} from '@/components/interventions/shared'
import {
  ConfirmationRequiredBanner,
  ConfirmationSuccessBanner,
  ConfirmationRejectedBanner
} from '@/components/intervention/confirmation-required-banner'
import { InterventionProgressCard } from '@/components/interventions/intervention-progress-card'

interface Participant {
  id: string
  name: string
  email?: string
  phone?: string
  company_name?: string
  role: 'manager' | 'provider' | 'tenant'
  hasAccount: boolean
}

interface TenantGeneralTabProps {
  intervention: {
    id: string
    title: string
    description: string | null
    instructions: string | null
    status: string
    scheduling_type: string | null
    scheduled_date: string | null
  }
  participants: {
    managers: Participant[]
    providers: Participant[]
    tenants: Participant[]
  }
  currentUserId: string
  // Confirmation banners
  showConfirmationBanner: boolean
  showConfirmedBanner: boolean
  showRejectedBanner: boolean
  onConfirmationResponse: () => void
  // Planning
  scheduledDate: string | null
  // Documents
  transformedDocuments: InterventionDocument[]
  reports: InterventionReport[]
  onViewDocument: (documentId: string) => void
  onDownloadDocument: (documentId: string) => void
  // Activity
  activityLogs: Array<{
    id: string
    action: string
    created_at: string
    user?: { id: string; name: string; email: string; avatar_url: string | null }
    [key: string]: unknown
  }>
  // Callbacks
  onOpenChatFromParticipant: (participantId: string, threadType: 'group' | 'tenant_to_managers' | 'provider_to_managers') => void
}

export function TenantGeneralTab({
  intervention,
  participants,
  currentUserId,
  showConfirmationBanner,
  showConfirmedBanner,
  showRejectedBanner,
  onConfirmationResponse,
  scheduledDate,
  transformedDocuments,
  reports,
  onViewDocument,
  onDownloadDocument,
  activityLogs,
  onOpenChatFromParticipant,
}: TenantGeneralTabProps) {
  return (
    <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
      <ContentWrapper>
        {showConfirmationBanner && (
          <ConfirmationRequiredBanner
            interventionId={intervention.id}
            scheduledDate={intervention.scheduled_date}
            scheduledTime={null}
            onConfirm={onConfirmationResponse}
            onReject={onConfirmationResponse}
          />
        )}
        {showConfirmedBanner && <ConfirmationSuccessBanner />}
        {showRejectedBanner && <ConfirmationRejectedBanner />}

        <div className="flex-shrink-0">
          <InterventionDetailsCard
            title={intervention.title}
            description={intervention.description || undefined}
            instructions={intervention.instructions || undefined}
            interventionStatus={intervention.status}
            participants={participants}
            currentUserId={currentUserId}
            currentUserRole="locataire"
            onOpenChat={onOpenChatFromParticipant}
            planning={{
              scheduledDate,
              schedulingType: intervention.scheduling_type as 'fixed' | 'slots' | 'flexible' | null,
              status: scheduledDate ? 'scheduled' : 'pending',
              quotesCount: 0,
              quotesStatus: 'none'
            }}
            hideEstimation
          />
        </div>

        {reports.length > 0 && (
          <div className="mt-6">
            <ReportsCard reports={reports} />
          </div>
        )}

        <div className="mt-6">
          <DocumentsCard
            documents={transformedDocuments}
            userRole="tenant"
            onView={onViewDocument}
            onDownload={onDownloadDocument}
          />
        </div>

        <div className="mt-6">
          <InterventionProgressCard
            intervention={intervention}
            activityLogs={activityLogs}
            variant="horizontal"
          />
        </div>
      </ContentWrapper>
    </TabsContent>
  )
}
