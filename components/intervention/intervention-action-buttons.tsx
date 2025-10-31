"use client"

import { useState } from "react"
import {
  CheckCircle,
  XCircle,
  Calendar,
  Play,
  Clock,
  UserCheck,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  FileText,
  Euro,
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
import { WorkCompletionReport } from "./work-completion-report"
import { SimpleWorkCompletionModal } from "./simple-work-completion-modal"
import { TenantValidationForm } from "./tenant-validation-form"
import { FinalizationModalLive } from "./finalization-modal-live"
import { TenantSlotConfirmationModal } from "./tenant-slot-confirmation-modal"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useAuth } from "@/hooks/use-auth"
import { MultiQuoteRequestModal } from "./modals/multi-quote-request-modal"
import { QuoteRequestSuccessModal } from "./modals/quote-request-success-modal"
import { getQuoteManagementActionConfig, getExistingQuotesManagementConfig, shouldNavigateToQuotes, type Quote } from "@/lib/quote-state-utils"
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
  const [showSimplifiedFinalizationModal, setShowSimplifiedFinalizationModal] = useState(false)
  const [showSlotConfirmationModal, setShowSlotConfirmationModal] = useState(false)

  // Hook for quote management
  const quoting = useInterventionQuoting()
  const { user } = useAuth()

  // Fonction pour détecter le devis existant du prestataire connecté
  const getCurrentUserQuote = () => {
    if (userRole !== 'prestataire' || !intervention.quotes) return null
    return intervention.quotes.find(quote => 
      quote.provider_id === userId || quote.submitted_by === userId
    )
  }

  const currentUserQuote = getCurrentUserQuote()

  // Use centralized Material Design 3 based action styling
  const getActionStyling = (actionKey: string, userRole: string) => {
    return getActionStylingFromLib(actionKey, userRole as 'gestionnaire' | 'locataire' | 'prestataire')
  }

  // Fonction helper pour filtrer les disponibilités selon les devis approuvés
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
              key: 'approve',
              label: 'Approuver',
              icon: CheckCircle,
              description: 'Approuver cette demande d\'intervention',
              requiresComment: false,
              confirmationMessage: 'Êtes-vous sûr de vouloir approuver cette intervention ?'
            },
            {
              key: 'reject',
              label: 'Rejeter',
              icon: XCircle,
              description: 'Rejeter cette demande avec un motif',
              requiresComment: true,
              confirmationMessage: 'Cette intervention sera rejetée. Veuillez indiquer le motif.'
            }
          )
        }
        break

      case 'approuvee':
        if (userRole === 'gestionnaire') {
          actions.push(
            {
              key: 'request_quotes',
              label: 'Demander un devis',
              icon: FileText,
              description: 'Solliciter des devis auprès de prestataires'
            },
            {
              key: 'start_planning',
              label: 'Planifier',
              icon: Calendar,
              description: 'Commencer le processus de planification'
            }
          )
        }
        break

      case 'demande_de_devis':
        if (userRole === 'gestionnaire') {
          const quoteConfig = getQuoteManagementActionConfig(intervention.quotes || [])
          actions.push({
            key: quoteConfig.key,
            label: quoteConfig.label,
            icon: FileText,
            variant: quoteConfig.variant,
            description: quoteConfig.description,
            isDisabled: quoteConfig.isDisabled,
            badge: quoteConfig.badge,
            tooltip: quoteConfig.tooltip
          })

          const existingQuotesConfig = getExistingQuotesManagementConfig(intervention.quotes || [])
          if (existingQuotesConfig) {
            actions.push({
              key: existingQuotesConfig.key,
              label: existingQuotesConfig.label,
              icon: Euro,
              variant: existingQuotesConfig.variant,
              description: existingQuotesConfig.description,
              isDisabled: existingQuotesConfig.isDisabled,
              badge: existingQuotesConfig.badge,
              tooltip: existingQuotesConfig.tooltip
            })
          }
        }
        if (userRole === 'prestataire') {
          if (currentUserQuote) {
            if (currentUserQuote.status === 'pending') {
              const isQuoteRequest = !currentUserQuote.amount || currentUserQuote.amount === 0

              if (isQuoteRequest) {
                actions.push(
                  {
                    key: 'reject_quote_request',
                    label: 'Rejeter la demande',
                    icon: XCircle,
                    description: 'Rejeter cette demande de devis'
                  },
                  {
                    key: 'submit_quote',
                    label: 'Soumettre un devis',
                    icon: FileText,
                    description: 'Soumettre votre devis pour cette intervention'
                  }
                )
              } else {
                actions.push(
                  {
                    key: 'edit_quote',
                    label: 'Modifier le devis',
                    icon: Edit3,
                    description: 'Modifier votre devis en attente d\'évaluation'
                  },
                  {
                    key: 'cancel_quote',
                    label: 'Annuler le devis',
                    icon: Trash2,
                    description: 'Annuler votre devis actuel'
                  }
                )
              }
            } else if (currentUserQuote.status === 'sent') {
              actions.push(
                {
                  key: 'edit_quote',
                  label: 'Modifier le devis',
                  icon: Edit3,
                  description: 'Modifier votre devis envoyé'
                },
                {
                  key: 'cancel_quote',
                  label: 'Annuler le devis',
                  icon: Trash2,
                  description: 'Annuler votre devis'
                }
              )
            } else if (currentUserQuote.status === 'accepted') {
              actions.push({
                key: 'view_quote',
                label: 'Voir le devis',
                icon: FileText,
                description: 'Consulter votre devis approuvé'
              })
            }
          } else {
            actions.push({
              key: 'submit_quote',
              label: 'Soumettre un devis',
              icon: FileText,
              description: 'Proposer votre devis pour cette intervention'
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
          const hasPendingSlots = timeSlots?.some(slot =>
            slot.status === 'pending' || slot.status === 'requested'
          )

          if (hasPendingSlots) {
            actions.push({
              key: 'confirm_availabilities',
              label: 'Confirmer disponibilités',
              icon: CheckCircle,
              description: 'Valider ou rejeter les créneaux proposés'
            })
          } else {
            actions.push({
              key: 'add_availabilities',
              label: 'Ajouter mes disponibilités',
              icon: Calendar,
              description: 'Saisir vos créneaux de disponibilité'
            })
          }
        }
        break

      case 'planifiee':
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

      case 'en_cours':
        if (userRole === 'prestataire') {
          actions.push({
            key: 'complete_work',
            label: 'Marquer comme terminé',
            icon: CheckCircle,
            description: 'Signaler la fin des travaux'
          })
        }
        break

      case 'cloturee_par_prestataire':
        if (userRole === 'locataire' && isInterventionTenant(intervention, userId)) {
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
              description: 'Signaler un problème avec les travaux',
              requiresComment: true,
              confirmationMessage: 'Signaler un problème nécessitera une révision.'
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
    if (['approuvee', 'demande_de_devis', 'planification', 'planifiee', 'en_cours'].includes(intervention.status)) {
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

        case 'request_quotes':
          quoting.handleQuoteRequest(intervention)
          return

        case 'manage_quotes':
          if (shouldNavigateToQuotes(intervention.quotes || [])) {
            window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=devis`
          }
          return

        case 'waiting_quotes':
        case 'rejected_quotes_info':
          return

        case 'submit_quote':
        case 'edit_quote':
          if (onOpenQuoteModal) {
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

        case 'add_availabilities':
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
        case 'contest_work':
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

  const handleTenantValidation = async (data: TenantValidationData): Promise<boolean> => {
    try {
      setIsProcessing(true)
      setError(null)

      const result = await interventionActionsService.validateIntervention(
        { id: intervention.id, title: intervention.title, status: intervention.status },
        data
      )

      if (result.success) {
        setShowTenantValidationModal(false)
        onActionComplete?.()
        return true
      } else {
        setError(result.error || 'Erreur lors de la validation')
        return false
      }
    } catch (_error) {
      setError('Erreur lors de la validation')
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
      <div className={compact ? "flex flex-wrap gap-1" : "flex items-center space-x-2"}>
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
              className={`flex items-center ${compact ? 'gap-1 h-7 px-2' : 'space-x-2 min-h-[44px]'} ${styling.className} ${action.isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              title={action.tooltip || action.description}
            >
              <IconComponent className={compact ? "h-3 w-3" : "h-4 w-4"} />
              <span className={compact ? "text-xs" : "hidden sm:inline"}>{action.label}</span>
              {action.badge?.show && (
                <Badge
                  variant={action.badge.variant === 'default' ? 'secondary' :
                           action.badge.variant === 'warning' ? 'outline' :
                           action.badge.variant}
                  className={`ml-1 text-xs ${
                    action.badge.variant === 'warning' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
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

      <TenantValidationForm
        intervention={intervention}
        isOpen={showTenantValidationModal}
        onClose={() => setShowTenantValidationModal(false)}
        onSubmit={handleTenantValidation}
        isLoading={isProcessing}
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
      <MultiQuoteRequestModal
        isOpen={quoting.quoteRequestModal.isOpen}
        onClose={quoting.closeQuoteRequestModal}
        intervention={quoting.quoteRequestModal.intervention}
        providers={quoting.providers}
        ineligibleProviders={quoting.ineligibleProviders}
        selectedProviders={quoting.formData.selectedProviders}
        selectedProviderIds={quoting.formData.providerIds}
        additionalNotes={quoting.formData.additionalNotes}
        individualMessages={quoting.formData.individualMessages}
        onProviderToggle={quoting.toggleProvider}
        onNotesChange={(additionalNotes: string) => quoting.updateFormData({ additionalNotes })}
        onIndividualMessageChange={quoting.updateIndividualMessage}
        onSubmit={quoting.submitQuoteRequest}
        isLoading={quoting.isLoading}
        error={quoting.error}
        teamId={user?.team_id || ''}
      />

      <QuoteRequestSuccessModal
        isOpen={quoting.successModal.isOpen}
        onClose={quoting.closeSuccessModal}
        providerNames={quoting.successModal.providerNames}
        interventionTitle={quoting.successModal.interventionTitle}
      />
    </>
  )
}

