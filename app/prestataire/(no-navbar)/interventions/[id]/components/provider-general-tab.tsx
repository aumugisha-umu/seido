import { TabsContent } from '@/components/ui/tabs'
import {
  ContentWrapper,
  InterventionDetailsCard,
  DocumentsCard,
  ReportsCard,
  type InterventionDocument,
  type InterventionReport,
  type Quote as SharedQuote,
  type TimeSlot as SharedTimeSlot,
} from '@/components/interventions/shared'
import {
  ConfirmationSuccessBanner,
  ConfirmationRejectedBanner
} from '@/components/intervention/confirmation-required-banner'
import { InterventionProgressCard } from '@/components/interventions/intervention-progress-card'
import type { Database } from '@/lib/database.types'

interface Participant {
  id: string
  name: string
  email?: string
  phone?: string
  company_name?: string
  role: 'manager' | 'provider' | 'tenant'
  hasAccount: boolean
}

interface ProviderGeneralTabProps {
  intervention: Database['public']['Tables']['interventions']['Row'] & {
    scheduling_type?: string | null
    requires_quote?: boolean | null
  }
  participants: {
    managers: Participant[]
    providers: Participant[]
    tenants: Participant[]
  }
  currentUserId: string
  // Confirmation banners
  showConfirmedBanner: boolean
  showRejectedBanner: boolean
  // Planning
  scheduledDate: string | null
  proposedSlotsCount: number
  hasRespondedToAllSlots: boolean
  totalActiveSlotsCount: number
  transformedQuotes: SharedQuote[]
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
  onOpenSlotResponseModal: () => void
  onOpenQuoteModal: () => void
}

export function ProviderGeneralTab({
  intervention,
  participants,
  currentUserId,
  showConfirmedBanner,
  showRejectedBanner,
  scheduledDate,
  proposedSlotsCount,
  hasRespondedToAllSlots,
  totalActiveSlotsCount,
  transformedQuotes,
  transformedDocuments,
  reports,
  onViewDocument,
  onDownloadDocument,
  activityLogs,
  onOpenChatFromParticipant,
  onOpenSlotResponseModal,
  onOpenQuoteModal,
}: ProviderGeneralTabProps) {
  return (
    <TabsContent value="general" className="mt-0 flex-1 flex flex-col overflow-hidden">
      <ContentWrapper>
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
            currentUserRole="prestataire"
            onOpenChat={onOpenChatFromParticipant}
            onOpenSlotResponseModal={onOpenSlotResponseModal}
            onOpenQuoteModal={onOpenQuoteModal}
            pendingSlotsForUser={proposedSlotsCount}
            requiresQuote={intervention.requires_quote}
            hasSubmittedQuote={transformedQuotes.some(q => q.provider_id === currentUserId && q.status === 'sent')}
            planning={{
              scheduledDate,
              schedulingType: intervention.scheduling_type as 'fixed' | 'slots' | 'flexible' | null,
              status: scheduledDate ? 'scheduled'
                : proposedSlotsCount > 0 ? 'proposed'
                : hasRespondedToAllSlots ? 'responded'
                : 'pending',
              proposedSlotsCount: hasRespondedToAllSlots ? totalActiveSlotsCount : proposedSlotsCount,
              quotesCount: transformedQuotes.length,
              requestedQuotesCount: transformedQuotes.filter(q => q.status === 'pending').length,
              receivedQuotesCount: transformedQuotes.filter(q => q.status === 'sent').length,
              quotesStatus: transformedQuotes.some(q => q.status === 'accepted')
                ? 'approved'
                : transformedQuotes.some(q => q.status === 'sent')
                  ? 'received'
                  : intervention.requires_quote
                    ? 'pending'
                    : 'none',
              selectedQuoteAmount: transformedQuotes.find(q => q.status === 'accepted')?.amount
            }}
          />
        </div>

        {reports.length > 0 && (
          <div className="mt-6">
            <ReportsCard reports={reports} />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentsCard
            documents={transformedDocuments}
            userRole="provider"
            onUpload={() => { /* TODO: implement document upload */ }}
            onView={onViewDocument}
            onDownload={onDownloadDocument}
          />
          <InterventionProgressCard
            intervention={intervention}
            activityLogs={activityLogs}
          />
        </div>
      </ContentWrapper>
    </TabsContent>
  )
}
