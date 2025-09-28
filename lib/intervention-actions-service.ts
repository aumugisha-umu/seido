// import { useRouter } from "next/navigation"

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
  location?: string
  tenant?: string
  assignedTo?: string
  hasFiles?: boolean
  lot?: { reference: string }
  building?: { name: string }
  assigned_contact?: { name: string }
}

export interface ApprovalData {
  action: "approve" | "reject"
  rejectionReason?: string
}

export interface APIResponse {
  success: boolean
  message?: string
  data?: unknown
  error?: string
  internalComment?: string
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
    console.log(`✅ Approving intervention ${intervention.id}`)

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

    console.log(`✅ Intervention approved successfully: ${result.intervention.id}`)
    return result
  }

  async rejectIntervention(intervention: InterventionAction, reason: string): Promise<APIResponse> {
    console.log(`❌ Rejecting intervention ${intervention.id}`)
    console.log(`📝 Rejection reason: ${reason}`)

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

    console.log(`❌ Intervention rejected successfully: ${result.intervention.id}`)
    return result
  }

  async startIntervention(intervention: InterventionAction): Promise<APIResponse> {
    console.log(`🚀 Starting intervention ${intervention.id}`)

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

    console.log("🚀 Intervention started successfully:", result.intervention.id)
    return result
  }

  async completeByProvider(intervention: InterventionAction, report: string): Promise<APIResponse> {
    console.log(`✅ Completing intervention ${intervention.id} by provider`)

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

    console.log("✅ Intervention completed by provider:", result.intervention.id)
    return result
  }

  async validateByTenant(intervention: InterventionAction): Promise<APIResponse> {
    console.log(`✅ Validating intervention ${intervention.id} by tenant`)

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

    console.log("✅ Intervention validated by tenant:", result.intervention.id)
    return result
  }

  async contestByTenant(intervention: InterventionAction, contestReason: string): Promise<APIResponse> {
    console.log(`⚠️ Contesting intervention ${intervention.id} by tenant`)

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

    console.log("⚠️ Intervention contested by tenant:", result.intervention.id)
    return result
  }

  async finalizeByManager(intervention: InterventionAction): Promise<APIResponse> {
    console.log(`🏁 Finalizing intervention ${intervention.id} by manager`)

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

    console.log("🏁 Intervention finalized by manager:", result.intervention.id)
    return result
  }

  async cancelIntervention(intervention: InterventionAction, reason: string): Promise<APIResponse> {
    if (!reason?.trim()) {
      throw new Error("Le motif d'annulation est requis")
    }

    console.log(`🚫 Cancelling intervention: ${intervention.id} - "${intervention.title}"`)

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

    console.log(`🚫 Intervention cancelled successfully: ${result.intervention.id}`)
    return result
  }

  async confirmSlot(interventionId: string, slotData: { date: string; startTime: string; endTime: string; }, comment?: string): Promise<APIResponse> {
    console.log(`📅 Confirming slot for intervention ${interventionId}`)
    console.log(`🕐 Selected slot: ${slotData.date} ${slotData.startTime}-${slotData.endTime}`)

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

    console.log(`✅ Slot confirmed successfully for intervention: ${result.intervention?.id}`)
    return result
  }

  // Méthodes héritées (garder pour compatibilité)
  async approveInterventionOld(intervention: InterventionAction, data: ApprovalData): Promise<void> {
    console.log(`✅ Approving intervention ${intervention.id}`)
    console.log(`📝 Internal comment: ${data.internalComment}`)
    
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

    console.log(`✅ Intervention approved successfully: ${result.intervention.id}`)
    return result
  }

  async rejectIntervention(intervention: InterventionAction, data: ApprovalData): Promise<void> {
    console.log(`❌ Rejecting intervention ${intervention.id}`)
    console.log(`📝 Rejection reason: ${data.rejectionReason}`)
    console.log(`📝 Internal comment: ${data.internalComment}`)
    
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

    console.log(`❌ Intervention rejected successfully: ${result.intervention.id}`)
    return result
  }

  /**
   * Annulation d'intervention
   */
  async cancelIntervention(intervention: InterventionAction, data: CancellationData): Promise<void> {
    if (!data.cancellationReason?.trim()) {
      throw new Error("Le motif d'annulation est requis")
    }

    console.log(`🚫 Cancelling intervention: ${intervention.id} - "${intervention.title}"`)

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

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || 'Erreur lors de l\'annulation de l\'intervention')
    }

    const result = await response.json()
    console.log(`🚫 Intervention cancelled successfully: ${result.intervention.id}`)
    return result
  }

  /**
   * Actions de programmation
   */
  async programIntervention(intervention: InterventionAction, data: PlanningData): Promise<void> {
    console.log("📅 Programming intervention with option:", data.option)
    
    if (data.option === "direct") {
      console.log("📅 Direct schedule:", data.directSchedule)
    } else if (data.option === "propose") {
      console.log("📅 Proposed slots:", data.proposedSlots)
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

    console.log("📅 Intervention scheduled successfully:", result.intervention.id)
    return result
  }

  /**
   * Actions d'exécution
   */
  async executeIntervention(intervention: InterventionAction, data: ExecutionData): Promise<void> {
    console.log(`🚀 ${data.action === 'start' ? 'Starting' : 'Cancelling'} intervention ${intervention.id}`)
    console.log(`📝 Comment: ${data.comment}`)
    console.log(`📝 Internal comment: ${data.internalComment}`)
    console.log(`📁 Files: ${data.files.length}`)

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

      console.log("🚀 Intervention started successfully:", result.intervention.id)
      return result

    } else if (data.action === 'cancel') {
      // Cancel functionality to be implemented later
      console.log("❌ Cancel functionality not implemented yet")
      throw new Error("Fonctionnalité d'annulation non encore implémentée")
    } else {
      throw new Error(`Action d'exécution non reconnue: ${data.action}`)
    }
  }

  /**
   * Actions de finalisation
   */
  async finalizeIntervention(intervention: InterventionAction, data: FinalizationData): Promise<void> {
    console.log(`🏁 Finalizing intervention ${intervention.id}`)
    console.log(`💰 Final amount: ${data.finalAmount || 'Same as quote'}`)
    console.log(`📝 Payment comment: ${data.paymentComment}`)

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

    console.log("🏁 Intervention finalized successfully:", result.intervention.id)
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
  }): Promise<void> {
    console.log(`✅ Completing intervention ${intervention.id}`)
    console.log(`📝 Work description: ${data.workDescription}`)
    console.log(`💰 Final cost: ${data.finalCost}€`)

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

    console.log("✅ Intervention completed successfully:", result.intervention.id)
    return result
  }

  /**
   * Action de validation par locataire
   */
  async validateByTenant(intervention: InterventionAction, data: {
    validationStatus: 'approved' | 'contested',
    tenantComment?: string,
    contestReason?: string,
    satisfactionRating?: number
  }): Promise<void> {
    console.log(`👍 Tenant validating intervention ${intervention.id}`)
    console.log(`📝 Status: ${data.validationStatus}`)

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

    console.log("👍 Intervention validated by tenant successfully:", result.intervention.id)
    return result
  }

  /**
   * Actions sur les devis
   */
  async acceptQuote(quoteId: string, interventionId: string): Promise<void> {
    console.log(`[v0] Accepting quote ${quoteId} for intervention ${interventionId}`)
    
    // Ici on appellerait l'API réelle
    // await fetch('/api/quotes/accept', { ... })
    
    return new Promise(resolve => setTimeout(resolve, 1000))
  }

  async rejectQuote(quoteId: string, interventionId: string): Promise<void> {
    console.log(`[v0] Rejecting quote ${quoteId} for intervention ${interventionId}`)
    
    // Ici on appellerait l'API réelle
    // await fetch('/api/quotes/reject', { ... })
    
    return new Promise(resolve => setTimeout(resolve, 1000))
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
