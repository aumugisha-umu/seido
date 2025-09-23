"use client"

import { useState } from "react"
import {
  CheckCircle,
  XCircle,
  Calendar,
  Play,
  Pause,
  Clock,
  UserCheck,
  Settings,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  FileText,
  Euro,
  Edit3,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { interventionActionsService } from "@/lib/intervention-actions-service"
import { WorkCompletionReport } from "./work-completion-report"
import { TenantValidationForm } from "./tenant-validation-form"
import { ManagerFinalizationForm } from "./manager-finalization-form"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useAuth } from "@/hooks/use-auth"
import { QuoteRequestModal } from "./modals/quote-request-modal"
import { MultiQuoteRequestModal } from "./modals/multi-quote-request-modal"
import { QuoteRequestSuccessModal } from "./modals/quote-request-success-modal"
import type { WorkCompletionReportData, TenantValidationData, ManagerFinalizationData } from "./closure/types"

interface InterventionActionPanelHeaderProps {
  intervention: {
    id: string
    title: string
    status: string
    tenant_id?: string
    scheduled_date?: string
    quotes?: Array<{
      id: string
      status: string
      providerId: string
      isCurrentUserQuote?: boolean
    }>
  }
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  userId: string
  onActionComplete?: () => void
  onOpenQuoteModal?: () => void
  onCancelQuote?: (quoteId: string) => void
}

interface ActionConfig {
  key: string
  label: string
  icon: React.ComponentType<any>
  variant: 'default' | 'destructive' | 'outline' | 'secondary'
  description: string
  requiresComment?: boolean
  confirmationMessage?: string
}

export function InterventionActionPanelHeader({
  intervention,
  userRole,
  userId,
  onActionComplete,
  onOpenQuoteModal,
  onCancelQuote
}: InterventionActionPanelHeaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionConfig | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  // States for closure modals
  const [showWorkCompletionModal, setShowWorkCompletionModal] = useState(false)
  const [showTenantValidationModal, setShowTenantValidationModal] = useState(false)
  const [showManagerFinalizationModal, setShowManagerFinalizationModal] = useState(false)

  // Hook for quote management
  const quoting = useInterventionQuoting()
  const { user } = useAuth()

  // Fonction pour détecter le devis existant du prestataire connecté
  const getCurrentUserQuote = () => {
    if (userRole !== 'prestataire' || !intervention.quotes) return null
    return intervention.quotes.find(quote =>
      quote.isCurrentUserQuote &&
      (quote.status === 'pending' || quote.status === 'approved')
    )
  }

  const currentUserQuote = getCurrentUserQuote()

  // Fonction de mapping couleurs selon le Design System
  const getActionStyling = (actionKey: string, userRole: string) => {
    // Types d'actions selon le Design System
    const actionTypes = {
      // Actions positives (succès, validation)
      positive: ['approve', 'validate_work', 'finalize', 'complete_work', 'start_work', 'confirm_slot'],
      // Actions destructives (suppression, rejet, annulation)
      destructive: ['reject', 'cancel', 'contest_work', 'delete', 'reject_schedule', 'cancel_quote'],
      // Actions neutres (planification, demande, gestion)
      neutral: ['request_quotes', 'start_planning', 'plan_intervention', 'schedule', 'manage_quotes', 'submit_quote', 'run_matching', 'propose_slots', 'add_availabilities', 'modify_schedule', 'reschedule', 'pause_work', 'edit_quote'],
      // Actions informatives (consultation)
      informative: ['view', 'consult', 'check', 'view_quote']
    }

    // Déterminer le type d'action
    let actionType = 'neutral' // par défaut
    for (const [type, actions] of Object.entries(actionTypes)) {
      if (actions.includes(actionKey)) {
        actionType = type
        break
      }
    }

    // Mapping selon le rôle et le type d'action
    const styleMapping = {
      locataire: {
        positive: { variant: 'default' as const, className: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500' },
        destructive: { variant: 'destructive' as const, className: '' },
        neutral: { variant: 'secondary' as const, className: '' },
        informative: { variant: 'ghost' as const, className: '' }
      },
      gestionnaire: {
        positive: { variant: 'default' as const, className: 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500' },
        destructive: { variant: 'destructive' as const, className: '' },
        neutral: { variant: 'secondary' as const, className: '' },
        informative: { variant: 'ghost' as const, className: '' }
      },
      prestataire: {
        positive: { variant: 'default' as const, className: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500' },
        destructive: { variant: 'destructive' as const, className: '' },
        neutral: { variant: 'secondary' as const, className: '' },
        informative: { variant: 'ghost' as const, className: '' }
      }
    }

    return styleMapping[userRole]?.[actionType] || { variant: 'secondary' as const, className: '' }
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
              variant: 'default',
              description: 'Approuver cette demande d\'intervention',
              requiresComment: false,
              confirmationMessage: 'Êtes-vous sûr de vouloir approuver cette intervention ?'
            },
            {
              key: 'reject',
              label: 'Rejeter',
              icon: XCircle,
              variant: 'destructive',
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
              label: 'Demander des devis',
              icon: FileText,
              variant: 'default',
              description: 'Solliciter des devis auprès de prestataires'
            },
            {
              key: 'start_planning',
              label: 'Organiser la planification',
              icon: Calendar,
              variant: 'outline',
              description: 'Commencer le processus de planification'
            }
          )
        }
        break

      case 'demande_de_devis':
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'manage_quotes',
            label: 'Gérer les devis',
            icon: Euro,
            variant: 'default',
            description: 'Consulter et valider les devis reçus'
          })
        }
        if (userRole === 'prestataire') {
          if (currentUserQuote) {
            // Le prestataire a déjà un devis en cours
            if (currentUserQuote.status === 'pending') {
              actions.push(
                {
                  key: 'edit_quote',
                  label: 'Modifier le devis',
                  icon: Edit3,
                  variant: 'default',
                  description: 'Modifier votre devis en attente d\'évaluation'
                },
                {
                  key: 'cancel_quote',
                  label: 'Annuler le devis',
                  icon: Trash2,
                  variant: 'destructive',
                  description: 'Annuler votre devis actuel'
                }
              )
            } else if (currentUserQuote.status === 'approved') {
              // Devis approuvé - actions limitées
              actions.push({
                key: 'view_quote',
                label: 'Voir le devis',
                icon: FileText,
                variant: 'outline',
                description: 'Consulter votre devis approuvé'
              })
            }
          } else {
            // Aucun devis existant - action normale
            actions.push({
              key: 'submit_quote',
              label: 'Soumettre un devis',
              icon: FileText,
              variant: 'default',
              description: 'Proposer votre devis pour cette intervention'
            })
          }
        }
        break

      case 'planification':
        if (userRole === 'gestionnaire') {
          actions.push(
            {
              key: 'run_matching',
              label: 'Lancer le matching',
              icon: TrendingUp,
              variant: 'default',
              description: 'Trouver automatiquement les créneaux compatibles'
            },
            {
              key: 'propose_slots',
              label: 'Proposer des créneaux',
              icon: Clock,
              variant: 'outline',
              description: 'Proposer manuellement des créneaux'
            }
          )
        }
        if (userRole === 'locataire') {
          actions.push({
            key: 'confirm_slot',
            label: 'Valider un créneau',
            icon: CheckCircle,
            variant: 'default',
            description: 'Confirmer un créneau proposé'
          })
        }
        if (userRole === 'prestataire') {
          actions.push({
            key: 'add_availabilities',
            label: 'Ajouter mes disponibilités',
            icon: Calendar,
            variant: 'outline',
            description: 'Saisir vos créneaux de disponibilité'
          })
        }
        break

      case 'planifiee':
        if (userRole === 'prestataire') {
          actions.push({
            key: 'start_work',
            label: 'Commencer l\'intervention',
            icon: Play,
            variant: 'default',
            description: 'Marquer le début des travaux',
            confirmationMessage: 'Confirmer le début de l\'intervention ?'
          })
        }
        if (userRole === 'locataire' && intervention.tenant_id === userId) {
          actions.push(
            {
              key: 'modify_schedule',
              label: 'Modifier le créneau',
              icon: Calendar,
              variant: 'outline',
              description: 'Modifier le créneau planifié'
            },
            {
              key: 'reject_schedule',
              label: 'Rejeter la planification',
              icon: XCircle,
              variant: 'destructive',
              description: 'Rejeter le créneau proposé',
              requiresComment: true,
              confirmationMessage: 'Cette planification sera rejetée et devra être refaite.'
            }
          )
        }
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'reschedule',
            label: 'Replanifier',
            icon: Calendar,
            variant: 'outline',
            description: 'Modifier la planification'
          })
        }
        break

      case 'en_cours':
        if (userRole === 'prestataire') {
          actions.push({
            key: 'complete_work',
            label: 'Marquer comme terminé',
            icon: CheckCircle,
            variant: 'default',
            description: 'Signaler la fin des travaux',
            requiresComment: true,
            confirmationMessage: 'Confirmer la fin des travaux ?'
          })
        }
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'pause_work',
            label: 'Suspendre',
            icon: Pause,
            variant: 'outline',
            description: 'Suspendre temporairement l\'intervention',
            requiresComment: true
          })
        }
        break

      case 'cloturee_par_prestataire':
        if (userRole === 'locataire') {
          actions.push(
            {
              key: 'validate_work',
              label: 'Valider les travaux',
              icon: CheckCircle,
              variant: 'default',
              description: 'Confirmer que les travaux sont satisfaisants',
              requiresComment: false,
              confirmationMessage: 'Confirmer que les travaux sont bien terminés ?'
            },
            {
              key: 'contest_work',
              label: 'Contester',
              icon: AlertTriangle,
              variant: 'destructive',
              description: 'Signaler un problème avec les travaux',
              requiresComment: true,
              confirmationMessage: 'Signaler un problème nécessitera une révision.'
            }
          )
        }
        break

      case 'cloturee_par_locataire':
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'finalize',
            label: 'Finaliser définitivement',
            icon: UserCheck,
            variant: 'default',
            description: 'Clôturer définitivement l\'intervention',
            requiresComment: false,
            confirmationMessage: 'Cette action finalisera définitivement l\'intervention.'
          })
        }
        break
    }

    // Actions communes disponibles selon le contexte
    if (['approuvee', 'planification', 'planifiee', 'en_cours'].includes(intervention.status)) {
      if (userRole === 'gestionnaire') {
        actions.push({
          key: 'cancel',
          label: 'Annuler',
          icon: XCircle,
          variant: 'destructive',
          description: 'Annuler cette intervention',
          requiresComment: true,
          confirmationMessage: 'Cette intervention sera annulée.'
        })
      }
    }

    return actions
  }

  const handleActionClick = (action: ActionConfig) => {
    setSelectedAction(action)
    setComment('')
    setError(null)

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
          }, comment)
          break

        case 'request_quotes':
          // Ouvrir la modale de demande de devis au lieu de rediriger
          quoting.handleQuoteRequest(intervention)
          return

        case 'manage_quotes':
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=quotes`
          return

        case 'submit_quote':
        case 'edit_quote':
          // Ouvrir la modale de soumission/modification de devis
          if (onOpenQuoteModal) {
            onOpenQuoteModal()
          } else {
            // Fallback vers redirection si pas de callback
            window.location.href = `/prestataire/interventions/${intervention.id}?action=quote`
          }
          return

        case 'cancel_quote':
          // Annuler le devis existant
          if (currentUserQuote && onCancelQuote) {
            onCancelQuote(currentUserQuote.id)
          }
          return

        case 'view_quote':
          // Consulter le devis approuvé (redirection vers la section devis)
          window.location.href = `/prestataire/interventions/${intervention.id}#quotes`
          return

        case 'start_planning':
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=planning`
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
          setShowWorkCompletionModal(true)
          return

        case 'validate_work':
        case 'contest_work':
          setShowTenantValidationModal(true)
          return

        case 'finalize':
          setShowManagerFinalizationModal(true)
          return

        case 'cancel':
          result = await interventionActionsService.cancelIntervention({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status
          }, comment)
          break

        default:
          throw new Error('Action non reconnue')
      }

      if (result.success) {
        setShowConfirmDialog(false)
        setSelectedAction(null)
        onActionComplete?.()
      } else {
        throw new Error(result.error || 'Erreur lors de l\'action')
      }

    } catch (err) {
      console.error('Error executing action:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handler for work completion report
  const handleWorkCompletion = async (reportData: WorkCompletionReportData): Promise<boolean> => {
    try {
      setIsProcessing(true)

      const serializableData = {
        ...reportData,
        beforePhotos: reportData.beforePhotos.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })),
        afterPhotos: reportData.afterPhotos.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        })),
        documents: reportData.documents.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }))
      }

      const response = await fetch(`/api/intervention/${intervention.id}/work-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializableData)
      })

      if (response.ok) {
        setShowWorkCompletionModal(false)
        onActionComplete?.()
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la soumission du rapport')
        return false
      }
    } catch (error) {
      setError('Erreur lors de la soumission du rapport')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Handler for tenant validation
  const handleTenantValidation = async (validationData: TenantValidationData): Promise<boolean> => {
    try {
      setIsProcessing(true)

      const response = await fetch(`/api/intervention/${intervention.id}/tenant-validation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData)
      })

      if (response.ok) {
        setShowTenantValidationModal(false)
        onActionComplete?.()
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la validation')
        return false
      }
    } catch (error) {
      setError('Erreur lors de la validation')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Handler for manager finalization
  const handleManagerFinalization = async (finalizationData: ManagerFinalizationData): Promise<boolean> => {
    try {
      setIsProcessing(true)

      const response = await fetch(`/api/intervention/${intervention.id}/manager-finalization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizationData)
      })

      if (response.ok) {
        setShowManagerFinalizationModal(false)
        onActionComplete?.()
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la finalisation')
        return false
      }
    } catch (error) {
      setError('Erreur lors de la finalisation')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  const availableActions = getAvailableActions()

  if (availableActions.length === 0) {
    return null // Ne rien afficher si pas d'actions disponibles
  }

  // Affichage en boutons horizontaux pour le header
  return (
    <>
      {/* Actions principales en boutons */}
      <div className="flex flex-col items-end space-y-1">
        <span className="text-xs text-slate-600 font-medium">Actions en attente</span>
        <div className="flex items-center space-x-2">
          {availableActions.map((action) => {
            const IconComponent = action.icon
            const styling = getActionStyling(action.key, userRole)

            return (
              <Button
                key={action.key}
                variant={styling.variant}
                size="sm"
                onClick={() => handleActionClick(action)}
                disabled={isProcessing}
                className={`flex items-center space-x-2 min-h-[44px] ${styling.className}`}
                title={action.description}
              >
                <IconComponent className="h-4 w-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            )
          })}
        </div>
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

      {/* Work Completion Report Modal */}
      <WorkCompletionReport
        intervention={intervention}
        isOpen={showWorkCompletionModal}
        onClose={() => setShowWorkCompletionModal(false)}
        onSubmit={handleWorkCompletion}
        isLoading={isProcessing}
      />

      {/* Tenant Validation Modal */}
      <TenantValidationForm
        intervention={intervention}
        isOpen={showTenantValidationModal}
        onClose={() => setShowTenantValidationModal(false)}
        onSubmit={handleTenantValidation}
        isLoading={isProcessing}
      />

      {/* Manager Finalization Modal */}
      <ManagerFinalizationForm
        intervention={intervention}
        isOpen={showManagerFinalizationModal}
        onClose={() => setShowManagerFinalizationModal(false)}
        onSubmit={handleManagerFinalization}
        isLoading={isProcessing}
      />

      {/* Quote Request Modals */}
      <MultiQuoteRequestModal
        isOpen={quoting.quoteRequestModal.isOpen}
        onClose={quoting.closeQuoteRequestModal}
        intervention={quoting.quoteRequestModal.intervention}
        providers={quoting.providers}
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