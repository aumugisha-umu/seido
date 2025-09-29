"use client"

import { useState } from "react"
import {
  CheckCircle,
  XCircle,
  Calendar,
  Play,
  Clock,
  UserCheck,
  Settings,
  AlertTriangle,
  TrendingUp,
  FileText,
  Euro,
  Edit3,
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { interventionActionsService } from "@/lib/intervention-actions-service"
import { WorkCompletionReport } from "./work-completion-report"
import { SimpleWorkCompletionModal } from "./simple-work-completion-modal"
import { TenantValidationForm } from "./tenant-validation-form"
import { SimplifiedFinalizationModal } from "./simplified-finalization-modal"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useAuth } from "@/hooks/use-auth"
import { MultiQuoteRequestModal } from "./modals/multi-quote-request-modal"
import { QuoteRequestSuccessModal } from "./modals/quote-request-success-modal"
import { getQuoteManagementActionConfig, getExistingQuotesManagementConfig } from "@/lib/quote-state-utils"
import type { WorkCompletionReportData, TenantValidationData } from "./closure/types"
import type { SimpleWorkCompletionData } from "./closure/simple-types"

interface InterventionActionPanelProps {
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
  onCancelQuote?: (_quoteId: string) => void
}

interface ActionConfig {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'destructive' | 'outline' | 'secondary'
  description: string
  requiresComment?: boolean
  confirmationMessage?: string
}

export function InterventionActionPanel({
  intervention,
  userRole,
  _userId,
  onActionComplete,
  onOpenQuoteModal,
  onCancelQuote
}: InterventionActionPanelProps) {
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
        // Le locataire n'a aucune action au statut 'demande'
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
          // Action principale : nouvelle demande de devis
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

          // Action secondaire : gérer les devis existants (si il y en a)
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
            // Le prestataire a déjà un devis en cours
            if (currentUserQuote.status === 'pending') {
              actions.push(
                {
                  key: 'edit_quote',
                  label: 'Modifier le devis',
                  icon: Edit3,
                  variant: 'default',
                  description: 'Modifier votre devis en attente d\'évaluation. Vous pouvez ajuster les montants, la description des travaux et vos disponibilités.'
                },
                {
                  key: 'cancel_quote',
                  label: 'Annuler le devis',
                  icon: Trash2,
                  variant: 'destructive',
                  description: 'Annuler définitivement votre devis actuel. Cette action est irréversible.'
                }
              )
            } else if (currentUserQuote.status === 'approved') {
              // Devis approuvé - actions limitées
              actions.push({
                key: 'view_quote',
                label: 'Consulter le devis approuvé',
                icon: FileText,
                variant: 'outline',
                description: 'Voir les détails de votre devis accepté. L\'intervention peut maintenant être planifiée.'
              })
            }
          } else {
            // Aucun devis existant - action normale
            actions.push({
              key: 'submit_quote',
              label: 'Soumettre un devis',
              icon: FileText,
              variant: 'default',
              description: 'Proposer votre devis pour cette intervention avec vos tarifs et disponibilités.'
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
        if (userRole === 'locataire' && intervention.tenant_id === _userId) {
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
            description: 'Signaler la fin des travaux'
          })
        }
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'complete_work',
            label: 'Marquer comme terminé',
            icon: CheckCircle,
            variant: 'default',
            description: 'Marquer l\'intervention comme terminée'
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
        if (userRole === 'gestionnaire') {
          actions.push({
            key: 'finalize',
            label: 'Finaliser',
            icon: UserCheck,
            variant: 'default',
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
            variant: 'default',
            description: 'Clôturer définitivement l\'intervention',
            requiresComment: false
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

  const executeAction = async (_actionKey: string) => {
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
          // Rediriger vers la gestion des devis pour voir les devis reçus
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
          // Rediriger vers la page de planification ou ouvrir le composant
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
          // Rediriger vers la page de modification du planning
          window.location.href = `/locataire/interventions/${intervention.id}?action=modify-schedule`
          return

        case 'reject_schedule':
          // Pour l'instant, utiliser un service générique ou créer un service spécifique
          result = await interventionActionsService.rejectIntervention({
            id: intervention.id,
            title: intervention.title,
            status: intervention.status
          }, comment)
          break

        case 'complete_work':
          // Open simple work completion modal
          setShowSimpleWorkCompletionModal(true)
          return

        case 'validate_work':
        case 'contest_work':
          // Open tenant validation modal
          setShowTenantValidationModal(true)
          return

        case 'finalize':
          setShowSimplifiedFinalizationModal(true)
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

      // Convert File objects to serializable objects
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
    } catch {
      setError('Erreur lors de la soumission du rapport')
      return false
    } finally {
      setIsProcessing(false)
    }
  }

  // Handler for simple work completion
  const handleSimpleWorkCompletion = async (data: SimpleWorkCompletionData): Promise<boolean> => {
    try {
      setIsProcessing(true)

      // Convert files to serializable format
      const serializableData = {
        workReport: data.workReport,
        mediaFiles: data.mediaFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }))
      }

      const response = await fetch(`/api/intervention/${intervention.id}/simple-work-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serializableData)
      })

      if (response.ok) {
        setShowSimpleWorkCompletionModal(false)
        onActionComplete?.()
        return true
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la soumission du rapport')
        return false
      }
    } catch {
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

      // TODO: Replace with actual API call
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
    } catch {
      setError('Erreur lors de la validation')
      return false
    } finally {
      setIsProcessing(false)
    }
  }


  const availableActions = getAvailableActions()

  if (availableActions.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Aucune action disponible pour le moment</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusInfo = () => {
    switch (intervention.status) {
      case 'demande':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          message: 'En attente de validation par le gestionnaire'
        }
      case 'approuvee':
        return {
          color: 'bg-green-100 text-green-800',
          message: 'Approuvée - Prête pour devis ou planification'
        }
      case 'demande_de_devis':
        return {
          color: 'bg-blue-100 text-blue-800',
          message: 'Demande de devis en cours'
        }
      case 'planification':
        return {
          color: 'bg-blue-100 text-blue-800',
          message: 'Recherche du créneau optimal'
        }
      case 'planifiee':
        return {
          color: 'bg-purple-100 text-purple-800',
          message: `Planifiée ${intervention.scheduled_date ? 'pour le ' + new Date(intervention.scheduled_date).toLocaleDateString('fr-FR') : ''}`
        }
      case 'en_cours':
        return {
          color: 'bg-orange-100 text-orange-800',
          message: 'Travaux en cours'
        }
      case 'cloturee_par_prestataire':
        return {
          color: 'bg-indigo-100 text-indigo-800',
          message: 'En attente de validation du locataire'
        }
      case 'cloturee_par_locataire':
        return {
          color: 'bg-teal-100 text-teal-800',
          message: 'En attente de finalisation par le gestionnaire'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          message: intervention.status
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Actions disponibles</span>
            <Badge className={statusInfo.color}>
              {intervention.status}
            </Badge>
          </CardTitle>
          <p className="text-sm text-gray-600">{statusInfo.message}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            {availableActions.map((action) => {
              const IconComponent = action.icon
              const styling = getActionStyling(action.key, userRole)

              return (
                <Button
                  key={action.key}
                  variant={styling.variant}
                  className={`justify-start h-auto p-3 ${styling.className}`}
                  onClick={() => handleActionClick(action)}
                  disabled={isProcessing}
                >
                  <div className="flex items-start space-x-3">
                    <IconComponent className="h-4 w-4 mt-1 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs opacity-80">{action.description}</div>
                    </div>
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

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

      {/* Simple Work Completion Modal */}
      <SimpleWorkCompletionModal
        intervention={intervention}
        isOpen={showSimpleWorkCompletionModal}
        onClose={() => setShowSimpleWorkCompletionModal(false)}
        onSubmit={handleSimpleWorkCompletion}
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

      {/* Simplified Finalization Modal */}
      <SimplifiedFinalizationModal
        interventionId={intervention.id}
        isOpen={showSimplifiedFinalizationModal}
        onClose={() => setShowSimplifiedFinalizationModal(false)}
        onComplete={onActionComplete}
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
        onNotesChange={(_additionalNotes: string) => quoting.updateFormData({ additionalNotes })}
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
