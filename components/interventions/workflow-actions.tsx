'use client'

/**
 * Workflow Actions Component
 * Manages intervention status transitions with proper validation
 */

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Play,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Ban,
  Star
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Custom hook
import { useInterventionWorkflow } from '@/hooks/use-intervention-workflow'

// Types
import type { Database } from '@/lib/database.types'

type InterventionStatus = Database['public']['Enums']['intervention_status']
type UserRole = Database['public']['Enums']['user_role']

interface WorkflowActionsProps {
  interventionId: string
  currentStatus: InterventionStatus
  userRole: UserRole
  onStatusChange?: (newStatus: InterventionStatus) => void
}

// Action configurations
const WORKFLOW_ACTIONS = {
  approve: {
    icon: CheckCircle,
    label: 'Approuver',
    color: 'bg-green-500',
    requiresComment: false,
    nextStatus: 'approuvee' as InterventionStatus
  },
  reject: {
    icon: XCircle,
    label: 'Rejeter',
    color: 'bg-red-500',
    requiresReason: true,
    nextStatus: 'rejetee' as InterventionStatus
  },
  requestQuote: {
    icon: FileText,
    label: 'Demander un devis',
    color: 'bg-yellow-500',
    requiresProvider: true,
    nextStatus: 'demande_de_devis' as InterventionStatus
  },
  startPlanning: {
    icon: Calendar,
    label: 'Planifier',
    color: 'bg-blue-500',
    nextStatus: 'planification' as InterventionStatus
  },
  confirmSchedule: {
    icon: Calendar,
    label: 'Confirmer le planning',
    color: 'bg-blue-600',
    requiresSlot: true,
    nextStatus: 'planifiee' as InterventionStatus
  },
  startWork: {
    icon: Play,
    label: 'Démarrer les travaux',
    color: 'bg-indigo-500',
    nextStatus: 'en_cours' as InterventionStatus
  },
  completeWork: {
    icon: CheckCircle,
    label: 'Terminer les travaux',
    color: 'bg-purple-500',
    requiresReport: false,
    nextStatus: 'cloturee_par_prestataire' as InterventionStatus
  },
  validateWork: {
    icon: Star,
    label: 'Valider les travaux',
    color: 'bg-purple-600',
    requiresSatisfaction: false,
    nextStatus: 'cloturee_par_locataire' as InterventionStatus
  },
  finalize: {
    icon: CheckCircle,
    label: 'Clôturer l\'intervention',
    color: 'bg-green-600',
    requiresCost: false,
    nextStatus: 'cloturee_par_gestionnaire' as InterventionStatus
  },
  cancel: {
    icon: Ban,
    label: 'Annuler',
    color: 'bg-gray-600',
    requiresReason: true,
    nextStatus: 'annulee' as InterventionStatus
  }
}

// Determine available actions based on status and role
function getAvailableActions(
  status: InterventionStatus,
  role: UserRole
): (keyof typeof WORKFLOW_ACTIONS)[] {
  const actions: (keyof typeof WORKFLOW_ACTIONS)[] = []

  switch (status) {
    case 'demande':
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('approve', 'reject')
      }
      break

    case 'approuvee':
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('requestQuote', 'startPlanning', 'cancel')
      }
      break

    case 'demande_de_devis':
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('startPlanning', 'cancel')
      }
      break

    case 'planification':
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('confirmSchedule', 'cancel')
      }
      break

    case 'planifiee':
      if (role === 'prestataire') {
        actions.push('startWork')
      }
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('cancel')
      }
      break

    case 'en_cours':
      if (role === 'prestataire') {
        actions.push('completeWork')
      }
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('cancel')
      }
      break

    case 'cloturee_par_prestataire':
      if (role === 'locataire') {
        actions.push('validateWork')
      }
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('cancel')
      }
      break

    case 'cloturee_par_locataire':
      if (role === 'gestionnaire' || role === 'admin') {
        actions.push('finalize')
      }
      break
  }

  return actions
}

export function WorkflowActions({
  interventionId,
  currentStatus,
  userRole,
  onStatusChange
}: WorkflowActionsProps) {
  const workflow = useInterventionWorkflow(interventionId)
  const [dialogOpen, setDialogOpen] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [providerComment, setProviderComment] = useState('')
  const [managerComment, setManagerComment] = useState('')
  const [satisfaction, setSatisfaction] = useState<number>(5)
  const [finalCost, setFinalCost] = useState<number | undefined>()
  const [selectedProvider, setSelectedProvider] = useState<string>('')

  // Get available actions
  const availableActions = getAvailableActions(currentStatus, userRole)

  // Handle action execution
  const handleAction = async (action: keyof typeof WORKFLOW_ACTIONS) => {
    try {
      switch (action) {
        case 'approve':
          await workflow.approve(managerComment)
          break
        case 'reject':
          if (!rejectReason || rejectReason.length < 10) {
            toast.error('Veuillez fournir une raison détaillée (min. 10 caractères)')
            return
          }
          await workflow.reject(rejectReason)
          break
        case 'requestQuote':
          if (!selectedProvider) {
            toast.error('Veuillez sélectionner un prestataire')
            return
          }
          await workflow.requestQuote(selectedProvider)
          break
        case 'startPlanning':
          await workflow.startPlanning()
          break
        case 'confirmSchedule':
          // This would need slot selection logic
          toast.info('Sélection de créneau requise')
          break
        case 'startWork':
          await workflow.startWork()
          break
        case 'completeWork':
          await workflow.completeWork(providerComment)
          break
        case 'validateWork':
          await workflow.validateWork(satisfaction)
          break
        case 'finalize':
          await workflow.finalize(finalCost)
          break
        case 'cancel':
          if (!cancelReason || cancelReason.length < 10) {
            toast.error('Veuillez fournir une raison détaillée (min. 10 caractères)')
            return
          }
          await workflow.cancel(cancelReason)
          break
      }

      setDialogOpen(null)
      if (onStatusChange && WORKFLOW_ACTIONS[action].nextStatus) {
        onStatusChange(WORKFLOW_ACTIONS[action].nextStatus)
      }
    } catch (error) {
      console.error('Error executing action:', error)
    }
  }

  if (availableActions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Actions disponibles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => {
            const config = WORKFLOW_ACTIONS[action]
            const Icon = config.icon

            // Simple actions without dialog
            if (
              !config.requiresReason &&
              !config.requiresProvider &&
              !config.requiresSlot &&
              !config.requiresReport &&
              !config.requiresSatisfaction &&
              !config.requiresCost
            ) {
              return (
                <Button
                  key={action}
                  variant="outline"
                  onClick={() => handleAction(action)}
                  disabled={workflow.isTransitioning}
                  className="gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </Button>
              )
            }

            // Actions with dialog
            return (
              <Dialog
                key={action}
                open={dialogOpen === action}
                onOpenChange={(open) => setDialogOpen(open ? action : null)}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={workflow.isTransitioning}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{config.label}</DialogTitle>
                    <DialogDescription>
                      {action === 'reject' && 'Indiquez la raison du rejet'}
                      {action === 'cancel' && 'Indiquez la raison de l\'annulation'}
                      {action === 'requestQuote' && 'Sélectionnez un prestataire'}
                      {action === 'completeWork' && 'Ajoutez un rapport de fin de travaux'}
                      {action === 'validateWork' && 'Évaluez la qualité de l\'intervention'}
                      {action === 'finalize' && 'Finalisez l\'intervention'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Reject reason */}
                    {action === 'reject' && (
                      <div>
                        <Label htmlFor="reject-reason">
                          Raison du rejet *
                        </Label>
                        <Textarea
                          id="reject-reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Expliquez pourquoi cette demande est rejetée..."
                          className="min-h-[100px] mt-2"
                        />
                      </div>
                    )}

                    {/* Cancel reason */}
                    {action === 'cancel' && (
                      <div>
                        <Label htmlFor="cancel-reason">
                          Raison de l'annulation *
                        </Label>
                        <Textarea
                          id="cancel-reason"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="Expliquez pourquoi cette intervention est annulée..."
                          className="min-h-[100px] mt-2"
                        />
                      </div>
                    )}

                    {/* Provider selection */}
                    {action === 'requestQuote' && (
                      <div>
                        <Label htmlFor="provider">
                          Prestataire *
                        </Label>
                        <Select
                          value={selectedProvider}
                          onValueChange={setSelectedProvider}
                        >
                          <SelectTrigger id="provider" className="mt-2">
                            <SelectValue placeholder="Sélectionnez un prestataire" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* In real app, load providers from API */}
                            <SelectItem value="provider-1">
                              Plomberie Express
                            </SelectItem>
                            <SelectItem value="provider-2">
                              Électricité Pro
                            </SelectItem>
                            <SelectItem value="provider-3">
                              Multi-Services
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Work completion report */}
                    {action === 'completeWork' && (
                      <div>
                        <Label htmlFor="provider-report">
                          Rapport d'intervention (optionnel)
                        </Label>
                        <Textarea
                          id="provider-report"
                          value={providerComment}
                          onChange={(e) => setProviderComment(e.target.value)}
                          placeholder="Décrivez les travaux effectués..."
                          className="min-h-[100px] mt-2"
                        />
                      </div>
                    )}

                    {/* Satisfaction rating */}
                    {action === 'validateWork' && (
                      <div>
                        <Label htmlFor="satisfaction">
                          Satisfaction (1-5)
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              variant={satisfaction === rating ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSatisfaction(rating)}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  satisfaction >= rating ? 'fill-current' : ''
                                }`}
                              />
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Final cost */}
                    {action === 'finalize' && (
                      <div>
                        <Label htmlFor="final-cost">
                          Coût final (€) - optionnel
                        </Label>
                        <Input
                          id="final-cost"
                          type="number"
                          value={finalCost || ''}
                          onChange={(e) =>
                            setFinalCost(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          placeholder="0.00"
                          className="mt-2"
                        />
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDialogOpen(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => handleAction(action)}
                      disabled={workflow.isTransitioning}
                    >
                      {workflow.isTransitioning ? 'En cours...' : 'Confirmer'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}