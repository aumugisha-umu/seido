// Types pour les données de clôture d'intervention

export interface WorkCompletionReportData {
  workSummary: string
  workDetails: string
  materialsUsed: string
  actualDurationHours: number
  actualCost?: number
  issuesEncountered: string
  recommendations: string
  beforePhotos: File[]
  afterPhotos: File[]
  documents: File[]
  qualityAssurance: {
    workCompleted: boolean
    areaClean: boolean
    clientInformed: boolean
    warrantyGiven: boolean
  }
}

export interface TenantValidationData {
  validationType: 'approve' | 'contest'
  satisfaction: {
    workQuality: number // 1-5 stars
    timeliness: number // 1-5 stars
    cleanliness: number // 1-5 stars
    communication: number // 1-5 stars
    overall: number // 1-5 stars
  }
  workApproval: {
    workCompleted: boolean
    workQuality: boolean
    areaClean: boolean
    instructionsFollowed: boolean
  }
  comments: string
  issues?: {
    description: string
    photos: File[]
    severity: 'minor' | 'major' | 'critical'
  }
  recommendProvider: boolean
  additionalComments: string
}

export interface ManagerFinalizationData {
  finalStatus: 'completed' | 'archived_with_issues' | 'cancelled'
  adminComments: string
  qualityControl: {
    proceduresFollowed: boolean
    documentationComplete: boolean
    clientSatisfied: boolean
    costsVerified: boolean
    warrantyDocumented: boolean
  }
  financialSummary: {
    finalCost: number
    budgetVariance: number
    costJustification: string
    paymentStatus: 'pending' | 'paid' | 'disputed'
  }
  documentation: {
    completionCertificate: boolean
    warrantyDocuments: boolean
    invoiceGenerated: boolean
    clientSignOff: boolean
  }
  archivalData: {
    category: string
    keywords: string[]
    retentionPeriod: number // years
    accessLevel: 'public' | 'restricted' | 'confidential'
  }
  followUpActions: {
    warrantyReminder: boolean
    maintenanceSchedule: boolean
    feedbackRequest: boolean
  }
  additionalDocuments: File[]
}