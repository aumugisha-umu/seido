import { useRouter } from "next/navigation"

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
  async approveIntervention(intervention: InterventionAction, data: ApprovalData): Promise<void> {
    console.log(`[v0] Approving intervention ${intervention.id}`)
    console.log(`[v0] Internal comment: ${data.internalComment}`)
    
    // Ici on appellerait l'API réelle
    // await fetch('/api/interventions/approve', { ... })
    
    // Pour l'instant, simulation
    return new Promise(resolve => setTimeout(resolve, 1000))
  }

  async rejectIntervention(intervention: InterventionAction, data: ApprovalData): Promise<void> {
    console.log(`[v0] Rejecting intervention ${intervention.id}`)
    console.log(`[v0] Rejection reason: ${data.rejectionReason}`)
    console.log(`[v0] Internal comment: ${data.internalComment}`)
    
    // Ici on appellerait l'API réelle
    // await fetch('/api/interventions/reject', { ... })
    
    return new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Actions de programmation
   */
  async programIntervention(intervention: InterventionAction, data: PlanningData): Promise<void> {
    console.log("[v0] Programming confirmed with option:", data.option)
    
    if (data.option === "direct") {
      console.log("[v0] Direct schedule:", data.directSchedule)
    } else if (data.option === "propose") {
      console.log("[v0] Proposed slots:", data.proposedSlots)
    }

    // Ici on appellerait l'API réelle
    // await fetch('/api/interventions/program', { ... })
    
    return new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Actions d'exécution
   */
  async executeIntervention(intervention: InterventionAction, data: ExecutionData): Promise<void> {
    console.log(`[v0] ${data.action === 'start' ? 'Starting' : 'Cancelling'} intervention ${intervention.id}`)
    console.log(`[v0] Comment: ${data.comment}`)
    console.log(`[v0] Internal comment: ${data.internalComment}`)
    console.log(`[v0] Files: ${data.files.length}`)

    // Ici on appellerait l'API réelle
    // await fetch('/api/interventions/execute', { ... })
    
    return new Promise(resolve => setTimeout(resolve, 1000))
  }

  /**
   * Actions de finalisation
   */
  async finalizeIntervention(intervention: InterventionAction, data: FinalizationData): Promise<void> {
    console.log(`[v0] Finalizing intervention ${intervention.id}`)
    console.log(`[v0] Final amount: ${data.finalAmount || 'Same as quote'}`)
    console.log(`[v0] Payment comment: ${data.paymentComment}`)

    // Ici on appellerait l'API réelle
    // await fetch('/api/interventions/finalize', { ... })
    
    return new Promise(resolve => setTimeout(resolve, 1000))
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
