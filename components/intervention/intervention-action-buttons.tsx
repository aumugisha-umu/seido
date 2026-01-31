"use client"

import { useState } from "react"
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  FileText,
  Edit3,
  Trash2,
  Edit
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getActionStyling as getActionStylingFromLib } from "@/lib/intervention-action-styles"
import { isInterventionTenant } from "@/lib/intervention-alert-utils"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { interventionActionsService } from "@/lib/intervention-actions-service"
import { getValidAvailabilities } from "@/lib/availability-filtering-utils"
import { analyzeTimeSlots, getProviderActionForTimeSlots, getProviderActionLabel } from "@/lib/time-slot-utils"
import { WorkCompletionReport } from "./work-completion-report"
import { SimpleWorkCompletionModal } from "./simple-work-completion-modal"
import { TenantValidationSimple } from "./tenant-validation-simple"
import { FinalizationModalLive } from "./finalization-modal-live"
import { TenantSlotConfirmationModal } from "./tenant-slot-confirmation-modal"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { QuoteRequestSuccessModal } from "./modals/quote-request-success-modal"
import type { Quote } from "@/lib/quote-state-utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { WorkCompletionReportData, TenantValidationData } from "./closure/types"
import type { SimpleWorkCompletionData } from "./closure/simple-types"
import { logger, logError } from '@/lib/logger'

interface ActionConfig {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline' | 'outlined-danger' | 'secondary' | 'ghost'
  description: string
  requiresComment?: boolean
  confirmationMessage?: string
  isDisabled?: boolean
  badge?: {
    show: boolean
    value: number | string
    variant: 'default' | 'warning' | 'success' | 'destructive'
  }
  tooltip?: string
}

interface InterventionActionButtonsProps {
  intervention: {
    id: string
    title: string
    status: string
    tenant_id?: string
    scheduled_date?: string
    quotes?: Quote[]
    availabilities?: Array<{
      person: string
      role: string
      date: string
      startTime: string
      endTime: string
      userId?: string
    }>
    assignments?: Array<{
      role: string
      user_id: string
      is_primary: boolean
    }>
  }
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  userId: string
  compact?: boolean
  onActionComplete?: (navigateToTab?: string) => void
  onOpenQuoteModal?: () => void
  onEditQuote?: (_quote: Quote) => void
  onCancelQuote?: (_quoteId: string) => void
  onCancelIntervention?: () => void
  onRejectQuoteRequest?: (_quote: Quote) => void
  onProposeSlots?: () => void
  timeSlots?: Array<{
    id: string
    slot_date: string
    start_time: string
    end_time: string
    status?: string
    proposed_by?: string
  }>
}

export function InterventionActionButtons({
  intervention,
  userRole,
  userId,
  compact = false,
  onActionComplete,
  onOpenQuoteModal,
  onEditQuote,
  onCancelQuote,
  onCancelIntervention,
  onRejectQuoteRequest,
  onProposeSlots,
  timeSlots = []
}: InterventionActionButtonsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionConfig | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  // States for closure modals
  const [showWorkCompletionModal, setShowWorkCompletionModal] = useState(false)
  const [showSimpleWorkCompletionModal, setShowSimpleWorkCompletionModal] = useState(false)
  const [showTenantValidationModal, setShowTenantValidationModal] = useState(false)
  const [tenantValidationInitialMode, setTenantValidationInitialMode] = useState<'approve' | 'reject'>('approve')
  const [showSimplifiedFinalizationModal, setShowSimplifiedFinalizationModal] = useState(false)
  const [showSlotConfirmationModal, setShowSlotConfirmationModal] = useState(false)

  // Hook for quote management
  const quoting = useInterventionQuoting()

  // Fonction pour détecter l'estimation existante du prestataire connecté
  const getCurrentUserQuote = () => {
    if (userRole !== 'prestataire' || !intervention.quotes) return null
    return intervention.quotes.find(quote =>
      quote.providerId === userId || (quote as any).created_by === userId
    )
  }

  const currentUserQuote = getCurrentUserQuote()

  // Use centralized Material Design 3 based action styling
  const getActionStyling = (actionKey: string, userRole: string) => {
    return getActionStylingFromLib(actionKey, userRole as 'gestionnaire' | 'locataire' | 'prestataire')
  }

  // Fonction helper pour filtrer les disponibilités selon les estimations approuvées
  const getFilteredAvailabilitiesForModal = () => {
    if (!intervention.availabilities) {
      return []
    }

    const { filteredAvailabilities } = getValidAvailabilities(
      intervention.availabilities,
      intervention.quotes || [],
      'locataire'
    )

    return filteredAvailabilities
  }

  // Définir les actions disponibles selon le statut et le rôle
  const getAvailableActions = (): ActionConfig[] => {
    const actions: ActionConfig[] = []

    switch (intervention.status) {
      case 'demande':
        if (userRole === 'gestionnaire') {
          actions.push(
            {
              key: 'process_request',
              label: 'Traiter la demande',
              icon: FileText,
              variant: 'default',
              description: 'Examiner et traiter cette demande d\'intervention'
            }
          )
        }
        break

      case 'approuvee':
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'start_planning',
            label: 'Planifier',
            icon: Calendar,
            description: 'Commencer le processus de planification'
          })
        }
        break

      case 'demande_de_devis':
        if (userRole === 'gestionnaire') {
          // Ajouter le bouton "Modifier la planification" comme pour le statut planification
          actions.push({
            key: 'propose_slots',
            label: 'Modifier la planification',
            icon: Edit,
            description: 'Modifier la planification existante'
          })
        }
        if (userRole === 'prestataire') {
          if (currentUserQuote) {
            if (currentUserQuote.status === 'pending') {
              const isQuoteRequest = !currentUserQuote.amount || currentUserQuote.amount === 0

              if (isQuoteRequest) {
                // Ne plus afficher "Rejeter la demande" - uniquement "Soumettre une estimation"
                actions.push({
                  key: 'submit_quote',
                  label: 'Soumettre une estimation',
                  icon: FileText,
                  description: 'Soumettre votre estimation pour cette intervention'
                })
              } else {
                actions.push(
                  {
                    key: 'edit_quote',
                    label: 'Modifier l\'estimation',
                    icon: Edit3,
                    description: 'Modifier votre estimation en attente d\'évaluation'
                  },
                  {
                    key: 'cancel_quote',
                    label: 'Annuler l\'estimation',
                    icon: Trash2,
                    description: 'Annuler votre estimation actuelle'
                  }
                )
              }
            } else if (currentUserQuote.status === 'sent') {
              actions.push(
                {
                  key: 'edit_quote',
                  label: 'Modifier l\'estimation',
                  icon: Edit3,
                  description: 'Modifier votre estimation envoyée'
                },
                {
                  key: 'cancel_quote',
                  label: 'Annuler l\'estimation',
                  icon: Trash2,
                  description: 'Annuler votre estimation'
                }
              )
            } else if (currentUserQuote.status === 'accepted') {
              actions.push({
                key: 'view_quote',
                label: 'Voir l\'estimation',
                icon: FileText,
                description: 'Consulter votre estimation approuvée'
              })
            }
          } else {
            actions.push({
              key: 'submit_quote',
              label: 'Soumettre une estimation',
              icon: FileText,
              description: 'Proposer votre estimation pour cette intervention'
            })
          }
        }
        break

      case 'planification':
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'propose_slots',
            label: 'Modifier la planification',
            icon: Edit,
            description: 'Modifier la planification existante'
          })
        }
        if (userRole === 'locataire') {
          actions.push({
            key: 'confirm_slot',
            label: 'Valider un créneau',
            icon: CheckCircle,
            description: 'Confirmer un créneau proposé'
          })
        }
        if (userRole === 'prestataire') {
          // Use helper function to analyze time slots and determine action
          const analysis = analyzeTimeSlots(timeSlots, userId)
          const actionKey = getProviderActionForTimeSlots(analysis)
          const label = getProviderActionLabel(actionKey)

          // Map action keys to icons and descriptions
          const actionConfig = {
            confirm_availabilities: {
              icon: CheckCircle,
              description: 'Valider ou rejeter les créneaux proposés par le gestionnaire'
            },
            modify_availabilities: {
              icon: Edit,
              description: 'Modifier vos disponibilités existantes'
            },
            add_availabilities: {
              icon: Calendar,
              description: 'Saisir vos créneaux de disponibilité'
            }
          }

          const config = actionConfig[actionKey]

          actions.push({
            key: actionKey,
            label,
            icon: config.icon,
            description: config.description
          })
        }
        break

      case 'planifiee':
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'finalize',
            label: 'Finaliser',
            icon: UserCheck,
            description: 'Clôturer définitivement l\'intervention',
            requiresComment: false
          })
        }
        if (userRole === 'prestataire') {
          actions.push({
            key: 'complete_work',
            label: 'Marquer comme terminé',
            icon: CheckCircle,
            variant: 'default',
            description: 'Signaler la fin des travaux'
          })
        }
        if (userRole === 'locataire' && intervention.tenant_id === userId) {
          actions.push(
            {
              key: 'modify_schedule',
              label: 'Modifier le créneau',
              icon: Calendar,
              description: 'Modifier le créneau planifié'
            },
            {
              key: 'reject_schedule',
              label: 'Refuser le créneau',
              icon: XCircle,
              description: 'Refuser ce créneau et demander d\'autres options',
              requiresComment: true
            }
          )
        }
        break

      case 'cloturee_par_prestataire':
        if (userRole === 'locataire' && isInterventionTenant(intervention, userId)) {
          // Les deux boutons ouvrent la même modale TenantValidationSimple
          // qui permet de choisir entre valider et contester en interne
          actions.push(
            {
              key: 'validate_work',
              label: 'Valider',
              icon: CheckCircle,
              description: 'Valider les travaux effectués'
            },
            {
              key: 'contest_work',
              label: 'Contester',
              icon: AlertTriangle,
              description: 'Signaler un problème avec les travaux'
              // PAS de requiresComment ni confirmationMessage
              // car TenantValidationSimple gère tout en interne
            }
          )
        }
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'finalize',
            label: 'Finaliser',
            icon: UserCheck,
            description: 'Clôturer définitivement l\'intervention',
            requiresComment: false
          })
        }
        break

      case 'cloturee_par_locataire':
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'finalize',
            label: 'Finaliser',
            icon: UserCheck,
            description: 'Clôturer définitivement l\'intervention',
            requiresComment: false
          })
        }
        break
    }

    // Actions communes disponibles selon le contexte
    if (['approuvee', 'demande_de_devis', 'planification', 'planifiee'].includes(intervention.status)) {
      if (userRole === 'gestionnaire') {
        actions.push({
          key: 'cancel',
          label: 'Annuler',
          icon: XCircle,
          description: 'Annuler cette intervention',
          requiresComment: true,
          confirmationMessage: 'Cette intervention sera annulée.'
        })
      }
    }

    return actions
  }

  const handleActionClick = (action: ActionConfig) => {
    if (action.isDisabled || ['waiting_quotes', 'rejected_quotes_info'].includes(action.key)) {
      return
    }

    setSelectedAction(action)
    setComment('')
    setError(null)

    if (action.key === 'cancel' && onCancelIntervention) {
      executeAction(action.key)
      return
    }

    if (action.requiresComment || action.confirmationMessage) {
      setShowConfirmDialog(true)
    } else {
      executeAction(action.key)
    }
  }

  const executeAction = async (actionKey: string) => {
    if (!selectedAction && actionKey !== selectedAction?.key) return

    setIsProcessing(true)
    setError(null)

    try {
      let result

      switch (actionKey) {
        case 'approve':
          result = await interventionActionsService.approveIntervention({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status
          })
          break

        case 'reject':
          result = await interventionActionsService.rejectIntervention({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status
          }, {
            action: "reject",
            rejectionReason: comment
          })
          break

        case 'process_quotes':
          // Naviguer vers l'onglet estimations pour traiter les estimations reçues
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=devis`
          return

        case 'view_quotes':
          // Naviguer vers l'onglet estimations en mode consultation
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=devis`
          return

        case 'waiting_quotes':
        case 'rejected_quotes_info':
          return

        case 'submit_quote':
          if (onOpenQuoteModal) {
            onOpenQuoteModal()
          } else {
            window.location.href = `/prestataire/interventions/${intervention.id}?action=quote`
          }
          return

        case 'edit_quote':
          if (currentUserQuote && onEditQuote) {
            onEditQuote(currentUserQuote)
          } else if (onOpenQuoteModal) {
            onOpenQuoteModal()
          } else {
            window.location.href = `/prestataire/interventions/${intervention.id}?action=quote`
          }
          return

        case 'reject_quote_request':
          if (currentUserQuote && onRejectQuoteRequest) {
            onRejectQuoteRequest(currentUserQuote)
          }
          return

        case 'cancel_quote':
          if (currentUserQuote && onCancelQuote) {
            onCancelQuote(currentUserQuote.id)
          }
          return

        case 'view_quote':
          window.location.href = `/prestataire/interventions/${intervention.id}#quotes`
          return

        case 'start_planning':
        case 'propose_slots':
          if (onProposeSlots) {
            onProposeSlots()
            return
          }
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=execution`
          return

        case 'confirm_availabilities':
          onActionComplete?.('execution')
          return

        case 'modify_availabilities':
        case 'add_availabilities':
          // Open modal via callback (for prestataire)
          if (onProposeSlots) {
            onProposeSlots()
            return
          }
          // Fallback redirection for gestionnaire
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=time-slots`
          return

        case 'reschedule':
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=time-slots`
          return

        case 'start_work':
          result = await interventionActionsService.startIntervention({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status
          })
          break

        case 'modify_schedule':
          window.location.href = `/locataire/interventions/${intervention.id}?action=modify-schedule`
          return

        case 'reject_schedule':
          result = await interventionActionsService.rejectIntervention({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status
          }, comment)
          break

        case 'complete_work':
          setShowSimpleWorkCompletionModal(true)
          return

        case 'validate_work':
          setTenantValidationInitialMode('approve')
          setShowTenantValidationModal(true)
          return

        case 'contest_work':
          setTenantValidationInitialMode('reject')
          setShowTenantValidationModal(true)
          return

        case 'confirm_slot':
          setShowSlotConfirmationModal(true)
          return

        case 'finalize':
          setShowSimplifiedFinalizationModal(true)
          return

        case 'cancel':
          if (onCancelIntervention) {
            onCancelIntervention()
          } else {
            result = await interventionActionsService.cancelIntervention({
              id: intervention.id,
              title: intervention.title,
              status: intervention.status
            }, comment)
          }
          break

        default:
          logger.warn(`[ACTION-BUTTONS] Unknown action: ${actionKey}`)
          return
      }

      if (result && result.success) {
        setShowConfirmDialog(false)
        setSelectedAction(null)
        setComment('')
        onActionComplete?.()
      } else if (result && !result.success) {
        setError(result.error || 'Une erreur est survenue')
      }
    } catch (error) {
      logError('[ACTION-BUTTONS] Action execution error', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handlers for modal submissions
  const handleWorkCompletion = async (data: WorkCompletionReportData): Promise<boolean> => {
    try {
      setIsProcessing(true)
      setError(null)

      const result = await interventionActionsService.completeIntervention(
        { id: intervention.id, title: intervention.title, status: intervention.status },
        data
      )

      if (result.success) {
        setShowWorkCompletionModal(false)
        onActionComplete?.()
        return true
      } else {
        setError(result.error || 'Erreur lors de la clôture')
        return false
      }
    } catch (_error) {
      setError('Erreur lors de la clôture')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSimpleWorkCompletion = async (data: SimpleWorkCompletionData): Promise<boolean> => {
    try {
      setIsProcessing(true)
      setError(null)

      const result = await interventionActionsService.simpleCompleteIntervention(
        intervention.id,
        data
      )

      if (result.success) {
        setShowSimpleWorkCompletionModal(false)
        onActionComplete?.()
        return true
      } else {
        setError(result.error || 'Erreur lors de la clôture')
        return false
      }
    } catch (_error) {
      setError('Erreur lors de la clôture')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Simple tenant validation handlers - Appelle la nouvelle route API
  const handleApproveWork = async (data: { comments: string; photos: File[] }): Promise<boolean> => {
    try {
      setIsProcessing(true)
      setError(null)

      const response = await fetch(`/api/intervention/${intervention.id}/tenant-validation-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationType: 'approve',
          comments: data.comments
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        logger.info({ interventionId: intervention.id }, '✅ Tenant validation successful')
        setShowTenantValidationModal(false)
        onActionComplete?.()
        return true
      } else {
        logger.error({ error: result.error }, '❌ Tenant validation failed')
        setError(result.error || 'Erreur lors de la validation')
        return false
      }
    } catch (_error) {
      logError('❌ Tenant validation error', _error)
      setError('Erreur lors de la validation')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectWork = async (data: { comments: string; photos: File[] }): Promise<boolean> => {
    try {
      setIsProcessing(true)
      setError(null)

      const response = await fetch(`/api/intervention/${intervention.id}/tenant-validation-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationType: 'contest',
          comments: data.comments
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        logger.info({ interventionId: intervention.id, isContested: true }, '✅ Tenant contestation successful')
        setShowTenantValidationModal(false)
        onActionComplete?.()
        return true
      } else {
        logger.error({ error: result.error }, '❌ Tenant contestation failed')
        setError(result.error || 'Erreur lors de la contestation')
        return false
      }
    } catch (_error) {
      logError('❌ Tenant contestation error', _error)
      setError('Erreur lors de la contestation')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSlotConfirmation = async (selectedSlot: { date: string; startTime: string; endTime: string; }, comment?: string): Promise<void> => {
    try {
      setIsProcessing(true)
      setError(null)

      const result = await interventionActionsService.confirmSlot(intervention.id, selectedSlot, comment)

      if (result.success) {
        setShowSlotConfirmationModal(false)
        onActionComplete?.()
      } else {
        throw new Error(result.error || 'Erreur lors de la confirmation du créneau')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la confirmation du créneau')
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const availableActions = getAvailableActions()

  if (availableActions.length === 0) {
    return null
  }

  return (
    <>
      {/* Actions buttons */}
      <div className={compact ? "flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-hide" : "flex items-center space-x-2"}>
        {availableActions.map((action) => {
          const IconComponent = action.icon
          const styling = getActionStyling(action.key, userRole)

          const buttonContent = (
            <Button
              key={action.key}
              variant={styling.variant}
              size={compact ? "sm" : "sm"}
              onClick={() => handleActionClick(action)}
              disabled={isProcessing || action.isDisabled}
              className={`flex items-center flex-shrink-0 ${compact ? 'gap-1.5 h-8 px-2.5 text-xs whitespace-nowrap' : 'space-x-2 min-h-[44px]'} ${styling.className} ${action.isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={action.tooltip || action.description}
            >
              <IconComponent className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              <span className={compact ? "text-xs font-medium" : "hidden sm:inline"}>{action.label}</span>
              {action.badge?.show && (
                <Badge
                  variant={action.badge.variant === 'default' ? 'secondary' :
                    action.badge.variant === 'warning' ? 'outline' :
                      action.badge.variant}
                  className={`ml-1 text-xs ${action.badge.variant === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    action.badge.variant === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-slate-200 text-slate-700'
                    }`}
                >
                  {action.badge.value}
                </Badge>
              )}
            </Button>
          )

          if (action.tooltip && action.tooltip !== action.description && !compact) {
            return (
              <TooltipProvider key={action.key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">{action.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          }

          return buttonContent
        })}
      </div>

      {/* Dialog de confirmation */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAction?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedAction?.confirmationMessage && (
              <p className="text-sm text-gray-600">
                {selectedAction.confirmationMessage}
              </p>
            )}

            {selectedAction?.requiresComment && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {selectedAction.key === 'reject' ? 'Motif du rejet *' :
                    selectedAction.key === 'contest_work' ? 'Description du problème *' :
                      selectedAction.key === 'complete_work' ? 'Rapport de fin de travaux *' :
                        'Commentaire *'}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    selectedAction.key === 'reject' ? 'Expliquez pourquoi cette intervention est rejetée...' :
                      selectedAction.key === 'contest_work' ? 'Décrivez le problème constaté...' :
                        selectedAction.key === 'complete_work' ? 'Résumé des travaux effectués...' :
                          'Ajoutez un commentaire...'
                  }
                  rows={4}
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            <Button
              onClick={() => executeAction(selectedAction?.key || '')}
              disabled={isProcessing || (selectedAction?.requiresComment && !comment.trim())}
              variant={selectedAction ? getActionStyling(selectedAction.key, userRole).variant : 'default'}
              className={selectedAction ? getActionStyling(selectedAction.key, userRole).className : ''}
            >
              {isProcessing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All closure modals */}
      <WorkCompletionReport
        intervention={intervention}
        isOpen={showWorkCompletionModal}
        onClose={() => setShowWorkCompletionModal(false)}
        onSubmit={handleWorkCompletion}
        isLoading={isProcessing}
      />

      <SimpleWorkCompletionModal
        intervention={intervention}
        isOpen={showSimpleWorkCompletionModal}
        onClose={() => setShowSimpleWorkCompletionModal(false)}
        onSubmit={handleSimpleWorkCompletion}
        isLoading={isProcessing}
      />

      <TenantValidationSimple
        intervention={intervention}
        isOpen={showTenantValidationModal}
        onClose={() => setShowTenantValidationModal(false)}
        onApprove={handleApproveWork}
        onReject={handleRejectWork}
        isLoading={isProcessing}
        initialMode={tenantValidationInitialMode}
      />

      <FinalizationModalLive
        interventionId={intervention.id}
        isOpen={showSimplifiedFinalizationModal}
        onClose={() => setShowSimplifiedFinalizationModal(false)}
        onComplete={onActionComplete}
      />

      <TenantSlotConfirmationModal
        isOpen={showSlotConfirmationModal}
        onClose={() => setShowSlotConfirmationModal(false)}
        availabilities={getFilteredAvailabilitiesForModal()}
        interventionTitle={intervention.title}
        onConfirm={handleSlotConfirmation}
        loading={isProcessing}
      />

      {/* Quote Request Modals */}
      <QuoteRequestSuccessModal
        isOpen={quoting.successModal.isOpen}
        onClose={quoting.closeSuccessModal}
        providerNames={quoting.successModal.providerNames}
        interventionTitle={quoting.successModal.interventionTitle}
      />
    </>
  )
}

