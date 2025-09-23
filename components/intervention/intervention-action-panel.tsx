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
  Euro
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { interventionActionsService } from "@/lib/intervention-actions-service"
import { WorkCompletionReport } from "./work-completion-report"
import { TenantValidationForm } from "./tenant-validation-form"
import { ManagerFinalizationForm } from "./manager-finalization-form"
import type { WorkCompletionReportData, TenantValidationData, ManagerFinalizationData } from "./closure/types"

interface InterventionActionPanelProps {
  intervention: {
    id: string
    title: string
    status: string
    tenant_id?: string
    scheduled_date?: string
  }
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  userId: string
  onActionComplete?: () => void
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

export function InterventionActionPanel({
  intervention,
  userRole,
  userId,
  onActionComplete
}: InterventionActionPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ActionConfig | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  // States for closure modals
  const [showWorkCompletionModal, setShowWorkCompletionModal] = useState(false)
  const [showTenantValidationModal, setShowTenantValidationModal] = useState(false)
  const [showManagerFinalizationModal, setShowManagerFinalizationModal] = useState(false)

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
        if (userRole === 'locataire' && intervention.tenant_id === userId) {
          actions.push({
            key: 'edit_availabilities',
            label: 'Modifier les disponibilités',
            icon: Calendar,
            variant: 'outline',
            description: 'Modifier vos créneaux de disponibilité'
          })
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
          actions.push({
            key: 'submit_quote',
            label: 'Soumettre un devis',
            icon: FileText,
            variant: 'default',
            description: 'Proposer votre devis pour cette intervention'
          })
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
    if (['demande', 'approuvee', 'planification', 'planifiee'].includes(intervention.status)) {
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
          // Rediriger vers la gestion des devis pour lancer une demande
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=quotes&action=request`
          return

        case 'manage_quotes':
          // Rediriger vers la gestion des devis pour voir les devis reçus
          window.location.href = `/gestionnaire/interventions/${intervention.id}?tab=quotes`
          return

        case 'submit_quote':
          // Rediriger vers le formulaire de soumission de devis
          window.location.href = `/prestataire/interventions/${intervention.id}?action=quote`
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

        case 'complete_work':
          // Open professional work completion modal
          setShowWorkCompletionModal(true)
          return

        case 'validate_work':
        case 'contest_work':
          // Open tenant validation modal
          setShowTenantValidationModal(true)
          return

        case 'finalize':
          // Open manager finalization modal
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

      // TODO: Replace with actual API call
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
              return (
                <Button
                  key={action.key}
                  variant={action.variant}
                  className="justify-start h-auto p-3"
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
              variant={selectedAction?.variant}
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
    </>
  )
}