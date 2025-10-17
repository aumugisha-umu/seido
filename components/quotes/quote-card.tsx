"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, X, User, Download, Trash2 } from "lucide-react"
import { QuoteApprovalModal } from "./quote-approval-modal"
import { QuoteRejectionModal } from "./quote-rejection-modal"

interface QuoteCardProps {
  quote: {
    id: string
    providerId: string
    providerName: string
    providerSpeciality?: string
    totalAmount: number
    laborCost: number
    materialsCost: number
    description: string
    workDetails?: string
    estimatedDurationHours?: number
    estimatedStartDate?: string
    status: string
    submittedAt: string
    reviewedAt?: string
    reviewComments?: string
    rejectionReason?: string
    attachments: Array<{
      id: string
      name: string
      url: string
      type: string
    }>
    isCurrentUserQuote?: boolean
  }
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  onApprove?: (_quoteId: string) => void
  onReject?: (_quoteId: string) => void
  onCancel?: (_quoteId: string) => void
  onDownloadAttachment?: (attachment: {
    id: string
    name: string
    url: string
    type: string
  }) => void
  onDataChange?: () => void
  showActions?: boolean
  compact?: boolean
}

export function QuoteCard({
  quote,
  userContext = 'gestionnaire',
  onCancel,
  onDownloadAttachment,
  onDataChange,
  showActions = true,
  compact = false
}: QuoteCardProps) {
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  
  const getStatusColor = (_status: string) => {
    switch (quote.status) {
      case 'approved':
      case 'accepted':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'cancelled':
        return 'bg-gray-50 border-gray-200 text-gray-800'
      case 'sent':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'pending':
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }
  }

  const getStatusLabel = (_status: string) => {
    switch (quote.status) {
      case 'approved':
      case 'accepted':
        return 'Accepté'
      case 'rejected':
        return 'Refusé'
      case 'cancelled':
        return 'Annulé'
      case 'sent':
        return 'En attente de validation'
      case 'pending':
      default:
        return 'En attente'
    }
  }

  const getBadgeColor = (_status: string) => {
    switch (quote.status) {
      case 'approved':
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getActionButtons = () => {
    const buttons = []

    // Actions selon le contexte et le statut
    if (userContext === 'gestionnaire' && (quote.status === 'pending' || quote.status === 'sent') && showActions) {
      buttons.push(
        <Button
          key="approve"
          size="sm"
          variant="default"
          onClick={() => setShowApprovalModal(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4 mr-1" />
          Accepter
        </Button>
      )
      buttons.push(
        <Button
          key="reject"
          size="sm"
          variant="outline"
          onClick={() => setShowRejectionModal(true)}
          className="text-red-600 hover:text-red-700 border-red-200"
        >
          <X className="h-4 w-4 mr-1" />
          Refuser
        </Button>
      )
    }

    // Bouton d'annulation pour les prestataires (leurs propres devis en attente)
    if (userContext === 'prestataire' && quote.isCurrentUserQuote && showActions && onCancel) {
      // Seuls les devis en attente peuvent être annulés
      const canCancel = quote.status === 'pending'

      if (canCancel) {
        buttons.push(
          <Button
            key="cancel"
            size="sm"
            variant="outline"
            onClick={() => onCancel(quote.id)}
            className="text-red-600 hover:text-red-700 border-red-200"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Annuler devis
          </Button>
        )
      }
    }

    return buttons
  }

  const getUserContextBadge = () => {
    if (userContext === 'prestataire' && quote.isCurrentUserQuote) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          Votre devis
        </Badge>
      )
    }
    return null
  }

  if (compact) {
    return (
      <div className={`border rounded-lg p-3 ${getStatusColor(quote.status)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{quote.providerName}</h4>
              {quote.providerSpeciality && (
                <p className="text-xs text-gray-600">{quote.providerSpeciality}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(quote.status)}`}>
              {getStatusLabel(quote.status)}
            </div>
            {getUserContextBadge()}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">
              {quote.totalAmount.toFixed(2)} €
            </p>
            <p className="text-xs text-gray-500">
              {new Date(quote.submittedAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getActionButtons()}
          </div>
        </div>

        <QuoteApprovalModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onSuccess={() => {
            setShowApprovalModal(false)
            onDataChange?.()
          }}
          quote={{
            id: quote.id,
            providerName: quote.providerName,
            totalAmount: quote.totalAmount
          }}
        />

        <QuoteRejectionModal
          isOpen={showRejectionModal}
          onClose={() => setShowRejectionModal(false)}
          onSuccess={() => {
            setShowRejectionModal(false)
            onDataChange?.()
          }}
          quote={{
            id: quote.id,
            providerName: quote.providerName,
            totalAmount: quote.totalAmount
          }}
        />
      </div>
    )
  }

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(quote.status)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900">{quote.providerName}</h4>
              {getUserContextBadge()}
            </div>
            <p className="text-sm text-gray-600">
              Prestataire {quote.providerSpeciality ? `• ${quote.providerSpeciality}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getBadgeColor(quote.status)}`}>
            {getStatusLabel(quote.status)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(quote.submittedAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-600">Montant total</p>
          <p className="font-semibold text-lg text-gray-900">
            {quote.totalAmount.toFixed(2)} €
          </p>
          <div className="text-xs text-gray-500">
            Main d'œuvre: {quote.laborCost.toFixed(2)} € | Matériaux: {quote.materialsCost.toFixed(2)} €
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Durée estimée</p>
          <p className="font-medium">
            {quote.estimatedDurationHours ? `${quote.estimatedDurationHours}h` : 'Non spécifiée'}
          </p>
          {quote.estimatedStartDate && (
            <p className="text-xs text-gray-500">
              Début: {new Date(quote.estimatedStartDate).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{quote.description}</p>


      {quote.status === 'rejected' && quote.rejectionReason && (
        <div className="mb-3 p-2 bg-red-50 rounded text-xs text-red-700">
          <strong>Motif de refus:</strong> {quote.rejectionReason}
        </div>
      )}

      {quote.status === 'approved' && quote.reviewComments && (
        <div className="mb-3 p-2 bg-green-50 rounded text-xs text-green-700">
          <strong>Commentaires:</strong> {quote.reviewComments}
        </div>
      )}

      {/* Pièces jointes */}
      {quote.attachments && quote.attachments.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-2">Pièces jointes ({quote.attachments.length})</p>
          <div className="flex flex-wrap gap-2">
            {quote.attachments.map((attachment, index) => (
              <Button
                key={attachment.id ? attachment.id : `${quote.id}-attachment-${index}`}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => onDownloadAttachment?.(attachment)}
              >
                <Download className="h-3 w-3 mr-1" />
                {attachment.name || `Fichier ${index + 1}`}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          {getActionButtons()}
        </div>
      </div>

      <QuoteApprovalModal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        onSuccess={() => {
          setShowApprovalModal(false)
          onDataChange?.()
        }}
        quote={{
          id: quote.id,
          providerName: quote.providerName,
          totalAmount: quote.totalAmount
        }}
      />

      <QuoteRejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onSuccess={() => {
          setShowRejectionModal(false)
          onDataChange?.()
        }}
        quote={{
          id: quote.id,
          providerName: quote.providerName,
          totalAmount: quote.totalAmount
        }}
      />
    </div>
  )
}
