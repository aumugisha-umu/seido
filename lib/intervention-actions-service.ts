import { logger } from '@/lib/logger'

// Types pour les actions d'intervention
export interface InterventionAction {
  id: string
  type: string
  status: string
  title: string
  description?: string
  priority?: string
  urgency?: string
  reference?: string
  created_at?: string
  created_by?: string
  location?: string
  tenant?: string
  assignedTo?: string
  hasFiles?: boolean
  lot?: { reference: string; building?: { name: string } }
  building?: { name: string }
  assigned_contact?: { name: string }
}

export interface ApprovalData {
  action: "approve" | "reject"
  rejectionReason?: string
  internalComment?: string
}

export interface APIResponse {
  success: boolean
  message?: string
  data?: unknown
  error?: string
  intervention?: InterventionAction
}

export interface PlanningData {
  option: "direct" | "propose" | "organize"
  directSchedule?: {
    date: string
    startTime: string
    endTime: string
  }
  proposedSlots?: Array<{
    date: string
    startTime: string
    endTime: string
  }>
  // Quote request data
  requireQuote?: boolean
  selectedProviders?: string[]
  instructions?: string
}

export interface ExecutionData {
  action: "start" | "cancel"
  comment: string
  internalComment: string
  files: File[]
}

export interface FinalizationData {
  finalAmount?: string
  paymentComment?: string
  paymentMethod?: string
  adminNotes?: string
}

export interface CancellationData {
  cancellationReason: string
  internalComment?: string
}

export class InterventionActionsService {
  private static instance: InterventionActionsService

  public static getInstance(): InterventionActionsService {
    if (!InterventionActionsService.instance) {
      InterventionActionsService.instance = new InterventionActionsService()
    }
    return InterventionActionsService.instance
  }

  /**
   * Actions d'approbation/rejet
   */
  // Nouvelles méthodes simplifiées pour le workflow
  async approveIntervention(intervention: InterventionAction): Promise<APIResponse> {
    logger.info(`✅ Approving intervention ${intervention.id}`)

    const response = await fetch('/api/intervention-approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de l'approbation: ${response.status}`)
    }

    logger.info(`✅ Intervention approved successfully: ${result.intervention.id}`)
    return result
  }

  async rejectIntervention(intervention: InterventionAction, reason: string): Promise<APIResponse> {
    logger.info(`❌ Rejecting intervention ${intervention.id}`)
    logger.info(`📝 Rejection reason: ${reason}`)

    if (!reason) {
      throw new Error('Le motif de rejet est requis')
    }

    const response = await fetch('/api/intervention-reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        rejectionReason: reason
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors du rejet: ${response.status}`)
    }

    logger.info(`❌ Intervention rejected successfully: ${result.intervention.id}`)
    return result
  }

  async updateInterventionStatus(interventionId: string, newStatus: string): Promise<APIResponse> {
    logger.info(`🔄 Updating intervention ${interventionId} to status: ${newStatus}`)

    const response = await fetch('/api/intervention-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId,
        status: newStatus
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la mise à jour du statut: ${response.status}`)
    }

    logger.info(`✅ Intervention status updated successfully to: ${newStatus}`)
    return result
  }

  async startIntervention(intervention: InterventionAction): Promise<APIResponse> {
    logger.info(`🚀 Starting intervention ${intervention.id}`)

    const response = await fetch('/api/intervention-start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors du démarrage: ${response.status}`)
    }

    logger.info("🚀 Intervention started successfully:", result.intervention.id)
    return result
  }

  async completeByProvider(intervention: InterventionAction, report: string): Promise<APIResponse> {
    logger.info(`✅ Completing intervention ${intervention.id} by provider`)

    const response = await fetch('/api/intervention-complete-provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        completionReport: report
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la finalisation: ${response.status}`)
    }

    logger.info("✅ Intervention completed by provider:", result.intervention.id)
    return result
  }

  async acceptSchedule(interventionId: string): Promise<APIResponse> {
    logger.info(`✅ Provider accepting schedule for intervention ${interventionId}`)

    const response = await fetch('/api/intervention-schedule-accept', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de l'acceptation du planning: ${response.status}`)
    }

    logger.info(`✅ Schedule accepted successfully: ${result.intervention.id}`)
    return result
  }

  async rejectSchedule(interventionId: string, reason: string): Promise<APIResponse> {
    logger.info(`❌ Provider rejecting schedule for intervention ${interventionId}`)
    logger.info(`📝 Rejection reason: ${reason}`)

    if (!reason) {
      throw new Error('Le motif de refus est requis')
    }

    const response = await fetch('/api/intervention-schedule-reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId,
        rejectionReason: reason
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors du refus du planning: ${response.status}`)
    }

    logger.info(`❌ Schedule rejected successfully: ${result.intervention.id}`)
    return result
  }

  async validateByTenant(intervention: InterventionAction): Promise<APIResponse> {
    logger.info(`✅ Validating intervention ${intervention.id} by tenant`)

    const response = await fetch('/api/intervention-validate-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la validation: ${response.status}`)
    }

    logger.info("✅ Intervention validated by tenant:", result.intervention.id)
    return result
  }

  async contestByTenant(intervention: InterventionAction, contestReason: string): Promise<APIResponse> {
    logger.info(`⚠️ Contesting intervention ${intervention.id} by tenant`)

    const response = await fetch('/api/intervention-contest-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        contestReason: contestReason
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la contestation: ${response.status}`)
    }

    logger.info("⚠️ Intervention contested by tenant:", result.intervention.id)
    return result
  }

  async finalizeByManager(intervention: InterventionAction): Promise<APIResponse> {
    logger.info(`🏁 Finalizing intervention ${intervention.id} by manager`)

    const response = await fetch('/api/intervention-finalize-manager', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la finalisation: ${response.status}`)
    }

    logger.info("🏁 Intervention finalized by manager:", result.intervention.id)
    return result
  }

  async cancelIntervention(intervention: InterventionAction, reason: string): Promise<APIResponse> {
    if (!reason?.trim()) {
      throw new Error("Le motif d'annulation est requis")
    }

    logger.info(`🚫 Cancelling intervention: ${intervention.id} - "${intervention.title}"`)

    const response = await fetch('/api/intervention-cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        cancellationReason: reason
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de l'annulation: ${response.status}`)
    }

    logger.info(`🚫 Intervention cancelled successfully: ${result.intervention.id}`)
    return result
  }

  async confirmSlot(interventionId: string, slotData: { date: string; startTime: string; endTime: string; }, comment?: string): Promise<APIResponse> {
    logger.info(`📅 Confirming slot for intervention ${interventionId}`)
    logger.info(`🕐 Selected slot: ${slotData.date} ${slotData.startTime}-${slotData.endTime}`)

    const response = await fetch(`/api/intervention/${interventionId}/select-slot`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedSlot: slotData,
        comment: comment
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la confirmation du créneau: ${response.status}`)
    }

    logger.info(`✅ Slot confirmed successfully for intervention: ${result.intervention?.id}`)
    return result
  }

  // Méthodes héritées (garder pour compatibilité)
  async approveInterventionOld(intervention: InterventionAction, data: ApprovalData): Promise<APIResponse> {
    logger.info(`✅ Approving intervention ${intervention.id}`)
    logger.info(`📝 Internal comment: ${data.internalComment}`)

    const response = await fetch('/api/intervention-approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        internalComment: data.internalComment
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de l'approbation: ${response.status}`)
    }

    logger.info(`✅ Intervention approved successfully: ${result.intervention.id}`)
    return result
  }

  async rejectInterventionOld(intervention: InterventionAction, data: ApprovalData): Promise<APIResponse> {
    logger.info(`❌ Rejecting intervention ${intervention.id}`)
    logger.info(`📝 Rejection reason: ${data.rejectionReason}`)
    logger.info(`📝 Internal comment: ${data.internalComment}`)

    if (!data.rejectionReason) {
      throw new Error('Le motif de rejet est requis')
    }

    const response = await fetch('/api/intervention-reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        rejectionReason: data.rejectionReason,
        internalComment: data.internalComment
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors du rejet: ${response.status}`)
    }

    logger.info(`❌ Intervention rejected successfully: ${result.intervention.id}`)
    return result
  }

  /**
   * Annulation d'intervention
   */
  async cancelInterventionOld(intervention: InterventionAction, data: CancellationData): Promise<APIResponse> {
    if (!data.cancellationReason?.trim()) {
      throw new Error("Le motif d'annulation est requis")
    }

    logger.info(`🚫 Cancelling intervention: ${intervention.id} - "${intervention.title}"`)

    const response = await fetch('/api/intervention-cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        cancellationReason: data.cancellationReason,
        internalComment: data.internalComment,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Erreur lors de l\'annulation de l\'intervention')
    }

    logger.info(`🚫 Intervention cancelled successfully: ${result.intervention.id}`)
    return result
  }

  /**
   * Actions de programmation
   */
  async programIntervention(intervention: InterventionAction, data: PlanningData): Promise<APIResponse> {
    logger.info("📅 Programming intervention with option:", data.option)

    if (data.option === "direct") {
      logger.info("📅 Direct schedule:", data.directSchedule)
    } else if (data.option === "propose") {
      logger.info("📅 Proposed slots:", data.proposedSlots)
    }

    const response = await fetch('/api/intervention-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        planningType: data.option,
        directSchedule: data.directSchedule,
        proposedSlots: data.proposedSlots,
        internalComment: `Planification ${data.option === 'direct' ? 'directe' : data.option === 'propose' ? 'avec choix' : 'à organiser'}`
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la planification: ${response.status}`)
    }

    logger.info("📅 Intervention scheduled successfully:", result.intervention.id)
    return result
  }

  /**
   * Actions d'exécution
   */
  async executeIntervention(intervention: InterventionAction, data: ExecutionData): Promise<APIResponse> {
    logger.info(`🚀 ${data.action === 'start' ? 'Starting' : 'Cancelling'} intervention ${intervention.id}`)
    logger.info(`📝 Comment: ${data.comment}`)
    logger.info(`📝 Internal comment: ${data.internalComment}`)
    logger.info(`📁 Files: ${data.files.length}`)

    if (data.action === 'start') {
      const response = await fetch('/api/intervention-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interventionId: intervention.id,
          startComment: data.comment || 'Intervention démarrée',
          internalComment: data.internalComment
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || `Erreur lors du démarrage: ${response.status}`)
      }

      logger.info("🚀 Intervention started successfully:", result.intervention.id)
      return result

    } else if (data.action === 'cancel') {
      // Cancel functionality to be implemented later
      logger.info("❌ Cancel functionality not implemented yet")
      throw new Error("Fonctionnalité d'annulation non encore implémentée")
    } else {
      throw new Error(`Action d'exécution non reconnue: ${data.action}`)
    }
  }

  /**
   * Actions de finalisation
   */
  async finalizeIntervention(intervention: InterventionAction, data: FinalizationData): Promise<APIResponse> {
    logger.info(`🏁 Finalizing intervention ${intervention.id}`)
    logger.info(`💰 Final amount: ${data.finalAmount || 'Same as quote'}`)
    logger.info(`📝 Payment comment: ${data.paymentComment}`)

    const response = await fetch('/api/intervention-finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        finalizationComment: data.paymentComment,
        paymentStatus: 'approved', // Default status, could be made configurable
        finalAmount: data.finalAmount,
        paymentMethod: data.paymentMethod || 'Non spécifié',
        adminNotes: data.adminNotes
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la finalisation: ${response.status}`)
    }

    logger.info("🏁 Intervention finalized successfully:", result.intervention.id)
    return result
  }

  /**
   * Action de completion par prestataire
   */
  async completeIntervention(intervention: InterventionAction, data: {
    completionNotes?: string,
    internalComment?: string,
    finalCost?: number,
    workDescription?: string
  }): Promise<APIResponse> {
    logger.info(`✅ Completing intervention ${intervention.id}`)
    logger.info(`📝 Work description: ${data.workDescription}`)
    logger.info(`💰 Final cost: ${data.finalCost}€`)

    const response = await fetch('/api/intervention-complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        completionNotes: data.completionNotes,
        internalComment: data.internalComment,
        finalCost: data.finalCost,
        workDescription: data.workDescription
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la completion: ${response.status}`)
    }

    logger.info("✅ Intervention completed successfully:", result.intervention.id)
    return result
  }

  /**
   * Simple work completion (rapport de travaux rapide)
   */
  async simpleCompleteIntervention(
    interventionId: string,
    data: { workReport: string; mediaFiles: File[] }
  ): Promise<APIResponse> {
    logger.info(`✅ Simple work completion for intervention ${interventionId}`)
    logger.info(`📝 Work report length: ${data.workReport.length} chars`)

    try {
      const response = await fetch(`/api/intervention/${interventionId}/simple-work-completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workReport: data.workReport,
          mediaFiles: data.mediaFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
          }))
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        logger.error('❌ Simple work completion failed:', result.error)
        return {
          success: false,
          error: result.error || `Erreur lors de la soumission: ${response.status}`
        }
      }

      logger.info('✅ Simple work completion successful')
      return {
        success: true,
        message: result.message || 'Rapport soumis avec succès',
        data: result.report
      }
    } catch (error) {
      logger.error('❌ Error in simpleCompleteIntervention:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la soumission du rapport'
      }
    }
  }

  /**
   * Action de validation par locataire
   */
  async validateByTenantOld(intervention: InterventionAction, data: {
    validationStatus: 'approved' | 'contested',
    tenantComment?: string,
    contestReason?: string,
    satisfactionRating?: number
  }): Promise<APIResponse> {
    logger.info(`👍 Tenant validating intervention ${intervention.id}`)
    logger.info(`📝 Status: ${data.validationStatus}`)

    const response = await fetch('/api/intervention-validate-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        interventionId: intervention.id,
        validationStatus: data.validationStatus,
        tenantComment: data.tenantComment,
        contestReason: data.contestReason,
        satisfactionRating: data.satisfactionRating
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Erreur lors de la validation: ${response.status}`)
    }

    logger.info("👍 Intervention validated by tenant successfully:", result.intervention.id)
    return result
  }

  /**
   * Actions sur les devis
   */
  async acceptQuote(quoteId: string, interventionId: string): Promise<APIResponse> {
    logger.info(`[v0] Accepting quote ${quoteId} for intervention ${interventionId}`)

    // Ici on appellerait l'API réelle
    // await fetch('/api/quotes/accept', { ... })

    return new Promise(resolve => setTimeout(() => resolve({ success: true } as APIResponse), 1000))
  }

  async rejectQuote(quoteId: string, interventionId: string): Promise<APIResponse> {
    logger.info(`[v0] Rejecting quote ${quoteId} for intervention ${interventionId}`)

    // Ici on appellerait l'API réelle
    // await fetch('/api/quotes/reject', { ... })

    return new Promise(resolve => setTimeout(() => resolve({ success: true } as APIResponse), 1000))
  }

  /**
   * Navigation helpers
   */
  generateApprovalRedirectUrl(intervention: InterventionAction): string {
    const queryParams = new URLSearchParams({
      fromApproval: "true",
      tenantId: intervention.tenant || "",
      location: this.getInterventionLocationText(intervention),
      title: intervention.title || "",
      type: intervention.type || "",
      priority: intervention.priority || "",
      description: intervention.description || "",
      estimatedDuration: "2h", // TODO: get from intervention
      hasFiles: (intervention.hasFiles || false).toString(),
      createdAt: intervention.created_at || "",
    })

    return `/gestionnaire/interventions/nouvelle-intervention?${queryParams.toString()}`
  }

  /**
   * Utility methods
   */
  getInterventionLocationText(intervention: InterventionAction): string {
    if (intervention.lot?.reference) {
      return `Lot ${intervention.lot.reference}`
    } else if (intervention.building?.name) {
      return `Bâtiment entier - ${intervention.building.name}`
    } else if (intervention.location) {
      return intervention.location
    }
    return "Non spécifié"
  }

  getInterventionLocationIcon(intervention: InterventionAction): "building" | "location" {
    if (intervention.building && !intervention.lot) {
      return "building"
    }
    return "location"
  }

  isBuildingWideIntervention(intervention: InterventionAction): boolean {
    return !!(intervention.building && !intervention.lot)
  }
}

// Export singleton instance
export const interventionActionsService = InterventionActionsService.getInstance()
