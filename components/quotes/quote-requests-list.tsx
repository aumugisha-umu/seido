"use client"

import { MessageSquare } from "lucide-react"
import { QuoteRequestCard } from "./quote-request-card"

interface QuoteRequest {
  id: string
  intervention_id: string
  provider_id: string
  status: 'sent' | 'viewed' | 'responded' | 'expired' | 'cancelled'
  individual_message?: string
  deadline?: string
  sent_at: string
  viewed_at?: string
  responded_at?: string
  created_by: string
  // From joined data (quote_requests_with_details view)
  provider_name: string
  provider_email: string
  provider_speciality?: string
  intervention_title: string
  intervention_type: string
  intervention_urgency: string
  quote_id?: string
  quote_status?: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled'
  quote_amount?: number
}

interface QuoteRequestsListProps {
  requests: QuoteRequest[]
  onResendRequest?: (_requestId: string) => void
  onCancelRequest?: (_requestId: string) => void
  onNewRequest?: (_requestId: string) => void
  onViewProvider?: (_providerId: string) => void
  className?: string
}

export function QuoteRequestsList({
  requests,
  onResendRequest,
  onCancelRequest,
  onNewRequest,
  onViewProvider,
  className = ""
}: QuoteRequestsListProps) {

  if (requests.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucune demande envoyée
        </h3>
        <p className="text-gray-600">
          Les demandes d'estimation apparaîtront ici une fois envoyées aux prestataires.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {requests.map((request) => (
        <QuoteRequestCard
          key={request.id}
          request={request}
          onResendRequest={onResendRequest}
          onCancelRequest={onCancelRequest}
          onNewRequest={onNewRequest}
          onViewProvider={onViewProvider}
        />
      ))}
    </div>
  )
}
