"use client"

import React from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, Mail, MessageSquare, Calendar, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

// Interface unifiée pour supporter les deux formats de données
interface QuoteRequest {
  id: string
  // Nouveau format
  intervention_id?: string
  provider_id?: string
  status?: 'sent' | 'viewed' | 'responded' | 'expired' | 'cancelled'
  sent_at?: string
  viewed_at?: string
  responded_at?: string
  created_by?: string
  provider_name?: string
  provider_email?: string
  provider_speciality?: string
  intervention_title?: string
  intervention_type?: string
  intervention_urgency?: string
  quote_id?: string
  quote_amount?: number

  // Ancien format (pour compatibilité)
  provider?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  assigned_at?: string
  has_quote?: boolean

  // Commun aux deux formats
  individual_message?: string
  deadline?: string
  quote_status?: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled'
}

interface QuoteRequestCardProps {
  request: QuoteRequest
  onResendRequest?: (_requestId: string) => void
  onCancelRequest?: (_requestId: string) => void
  onNewRequest?: (_requestId: string) => void
  onViewProvider?: (_providerId: string) => void
  className?: string
}

export function QuoteRequestCard({
  request,
  onResendRequest,
  onCancelRequest,
  onNewRequest,
  onViewProvider,
  className = ""
}: QuoteRequestCardProps) {

  // Helpers pour extraire les données selon le format
  const getProviderName = () => request.provider_name || request.provider?.name || 'Prestataire inconnu'
  const getProviderEmail = () => request.provider_email || request.provider?.email || 'Email inconnu'
  const getProviderId = () => request.provider_id || request.provider?.id || ''
  const getStatus = () => {
    // Mapper l'ancien format au nouveau
    if (request.status) return request.status
    if (request.has_quote) return 'responded'
    return 'sent'
  }

  const getStatusConfig = (request: QuoteRequest) => {
    // If there's a quote, show quote status
    if ((request.quote_id || request.has_quote) && request.quote_status) {
      switch (request.quote_status) {
        case 'approved':
          return {
            label: 'Devis approuvé',
            variant: 'default' as const,
            className: 'bg-green-100 text-green-800 border-green-200',
            icon: '✅'
          }
        case 'rejected':
          return {
            label: 'Devis rejeté',
            variant: 'destructive' as const,
            className: 'bg-red-100 text-red-800 border-red-200',
            icon: '❌'
          }
        case 'pending':
          return {
            label: 'Devis en attente',
            variant: 'secondary' as const,
            className: 'bg-blue-100 text-blue-800 border-blue-200',
            icon: '📝'
          }
        default:
          return {
            label: 'Devis reçu',
            variant: 'default' as const,
            className: 'bg-green-100 text-green-800 border-green-200',
            icon: '✅'
          }
      }
    }

    // Otherwise show request status
    const currentStatus = getStatus()
    switch (currentStatus) {
      case 'sent':
        return {
          label: 'Envoyée',
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '📤'
        }
      case 'viewed':
        return {
          label: 'Consultée',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '👁️'
        }
      case 'responded':
        return {
          label: 'Répondu',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅'
        }
      case 'expired':
        return {
          label: 'Expirée',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: '⏰'
        }
      case 'cancelled':
        return {
          label: 'Annulée',
          variant: 'destructive' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❌'
        }
      default:
        return {
          label: 'En attente',
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳'
        }
    }
  }

  const isExpired = (deadline?: string) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  const statusConfig = getStatusConfig(request)
  const expired = isExpired(request.deadline)

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md w-full ${
        expired ? 'border-red-200 bg-red-50' : 'border-gray-200'
      } ${className}`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* En-tête avec nom et statut */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              {getProviderName()}
            </h4>
            <Badge
              variant={statusConfig.variant}
              className={`text-xs ${statusConfig.className}`}
            >
              {statusConfig.icon} {statusConfig.label}
            </Badge>
          </div>

          {/* Informations du prestataire */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {request.provider?.avatar ? (
                <Image
                  src={request.provider.avatar}
                  alt={getProviderName()}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                <Mail className="h-3 w-3" />
                <span className="truncate">{getProviderEmail()}</span>
              </div>

              {request.provider_speciality && (
                <div className="text-xs text-gray-600 mb-1">
                  Spécialité: {request.provider_speciality}
                </div>
              )}

              {/* Message individuel */}
              {request.individual_message && (
                <div className="flex items-start space-x-1 text-xs text-gray-600 mb-1">
                  <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{request.individual_message}</span>
                </div>
              )}

              {/* Date d'envoi - avec fallback pour compatibilité */}
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                <Clock className="h-3 w-3" />
                <span>
                  Envoyé le {(() => {
                    try {
                      const dateStr = request.sent_at || (request as { assigned_at?: string }).assigned_at
                      return dateStr ? format(new Date(dateStr), 'dd MMM yyyy à HH:mm', { locale: fr }) : 'Date inconnue'
                    } catch {
                      return 'Date invalide'
                    }
                  })()}
                </span>
              </div>

              {/* Date de consultation si applicable */}
              {request.viewed_at && (
                <div className="flex items-center space-x-1 text-xs text-blue-600 mb-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Consulté le {(() => {
                      try {
                        return format(new Date(request.viewed_at), 'dd MMM yyyy à HH:mm', { locale: fr })
                      } catch {
                        return 'Date invalide'
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Date de réponse si applicable */}
              {request.responded_at && (
                <div className="flex items-center space-x-1 text-xs text-green-600 mb-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Répondu le {(() => {
                      try {
                        return format(new Date(request.responded_at), 'dd MMM yyyy à HH:mm', { locale: fr })
                      } catch {
                        return 'Date invalide'
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Date limite */}
              {request.deadline && (
                <div className={`flex items-center space-x-1 text-xs ${
                  expired ? 'text-red-600' : 'text-gray-500'
                }`}>
                  <Calendar className="h-3 w-3" />
                  <span>
                    {expired ? 'Expiré le' : 'Échéance'} {(() => {
                      try {
                        return format(new Date(request.deadline), 'dd MMM yyyy', { locale: fr })
                      } catch {
                        return 'Date invalide'
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Montant du devis si disponible */}
              {request.quote_amount && (
                <div className="text-xs font-semibold text-green-600 mb-1">
                  Devis: {request.quote_amount.toFixed(2)} €
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-gray-100">
            {onViewProvider && (
              <Button
                key={`view-provider-${request.id}`}
                variant="outline"
                size="sm"
                onClick={() => onViewProvider(getProviderId())}
                className="text-xs h-7"
              >
                Voir profil
              </Button>
            )}

            {/* Actions selon le statut */}
            {request.quote_status === 'rejected' ? (
              onNewRequest && (
                <Button
                  key={`new-request-${request.id}`}
                  variant="default"
                  size="sm"
                  onClick={() => onNewRequest(request.id)}
                  className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Nouvelle demande
                </Button>
              )
            ) : (
              <React.Fragment key={`actions-${request.id}`}>
                {onResendRequest && !request.quote_id && !request.has_quote && ['expired', 'cancelled'].includes(getStatus()) && (
                  <Button
                    key={`resend-${request.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => onResendRequest(request.id)}
                    className="text-xs h-7"
                  >
                    Relancer
                  </Button>
                )}

                {onCancelRequest && !request.quote_id && !request.has_quote && ['pending', 'sent', 'viewed'].includes(getStatus()) && (
                  <Button
                    key={`cancel-${request.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => onCancelRequest(request.id)}
                    className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Annuler
                  </Button>
                )}
              </React.Fragment>
            )}
          </div>
        </div>

        {/* Alerte d'expiration */}
        {expired && !request.quote_id && !request.has_quote && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span>Cette demande a expiré. Vous pouvez la relancer ou faire une nouvelle demande.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
