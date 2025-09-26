"use client"

import { useState, useEffect, useMemo } from "react"
import { AlertTriangle, X, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { useToast } from "@/hooks/use-toast"
import { FinalizationTabs } from "./finalization-tabs"
import { FinalizationDecision } from "./finalization-decision"
import { FinalizationConfirmationModal } from "./finalization-confirmation-modal"

interface SimplifiedFinalizationModalProps {
  interventionId: string
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  isLoading?: boolean
}

interface FinalizationContextData {
  intervention: {
    id: string
    reference: string
    title: string
    description: string
    type: string
    urgency: string
    status: string
    final_cost?: number
    estimated_cost?: number
    created_at: string
    scheduled_date?: string
    completed_date?: string
    lot?: {
      id: string
      reference: string
      building: {
        id: string
        name: string
        address: string
      }
    }
    tenant?: {
      id: string
      name: string
      email: string
      phone?: string
    }
  }
  workCompletion?: {
    id: string
    workSummary: string
    workDetails: string
    materialsUsed?: string
    actualDurationHours: number
    actualCost?: number
    issuesEncountered?: string
    recommendations?: string
    qualityAssurance: any
    beforePhotos: any[]
    afterPhotos: any[]
    documents: any[]
    submittedAt: string
    provider: {
      id: string
      name: string
      email: string
      phone?: string
      provider_category?: string
    }
  }
  tenantValidation?: {
    id: string
    validationType: 'approve' | 'contest'
    satisfaction: any
    workApproval: any
    comments: string
    issues?: any
    recommendProvider: boolean
    additionalComments?: string
    submittedAt: string
  }
  selectedQuote?: {
    id: string
    amount: number
    description: string
    details: any
    provider: any
    createdAt: string
  }
  contacts: any[]
  existingFinalization?: {
    id: string
    finalStatus: string
    adminComments: string
    finalizedAt: string
  }
}

interface FinalizationFormData {
  decision: 'validate' | 'reject'
  internalComments: string
  providerFeedback: string
  scheduleFollowUp: boolean
  followUpDate?: Date
  followUpType?: string
}

export function SimplifiedFinalizationModal({
  interventionId,
  isOpen,
  onClose,
  onComplete,
  isLoading = false
}: SimplifiedFinalizationModalProps) {
  const { toast } = useToast()

  // Data states
  const [contextData, setContextData] = useState<FinalizationContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [formData, setFormData] = useState<FinalizationFormData>({
    decision: 'validate',
    internalComments: '',
    providerFeedback: '',
    scheduleFollowUp: false
  })

  // UI states
  const [submitting, setSubmitting] = useState(false)

  // Mobile confirmation modal states
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<'validate' | 'contest' | null>(null)

  // Mobile tabs state
  const [activeTab, setActiveTab] = useState('overview')

  // Check if we're on mobile with proper responsive detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
    }

    // Initial check
    checkMobile()

    // Listen for window resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch finalization context
  useEffect(() => {
    if (isOpen && interventionId) {
      fetchFinalizationContext()
    }
  }, [isOpen, interventionId])

  const fetchFinalizationContext = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/intervention/${interventionId}/finalization-context`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors du chargement du contexte')
      }

      setContextData(result.data)
    } catch (err) {
      console.error('Error fetching finalization context:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!contextData) return

    // Validation
    if (!formData.internalComments.trim()) {
      toast({
        title: "Commentaires requis",
        description: "Les commentaires internes sont obligatoires",
        variant: "destructive"
      })
      return
    }

    if (formData.decision === 'reject' && !formData.providerFeedback.trim()) {
      toast({
        title: "Feedback requis",
        description: "Un commentaire pour le prestataire est requis lors du rejet",
        variant: "destructive"
      })
      return
    }

    if (formData.scheduleFollowUp && !formData.followUpDate) {
      toast({
        title: "Date manquante",
        description: "Veuillez sélectionner une date pour le suivi",
        variant: "destructive"
      })
      return
    }

    try {
      setSubmitting(true)

      // Transform data to match existing API format
      const finalizationData = {
        finalStatus: formData.decision === 'validate' ? 'completed' : 'archived_with_issues',
        adminComments: formData.internalComments,
        qualityControl: {
          proceduresFollowed: true,
          documentationComplete: true,
          clientSatisfied: contextData.tenantValidation?.validationType === 'approve',
          costsVerified: true,
          warrantyDocumented: true
        },
        financialSummary: {
          finalCost: contextData.intervention.final_cost || contextData.selectedQuote?.amount || 0,
          budgetVariance: contextData.intervention.estimated_cost
            ? ((contextData.intervention.final_cost || 0) - contextData.intervention.estimated_cost) / contextData.intervention.estimated_cost * 100
            : 0,
          costJustification: formData.decision === 'reject' ? formData.providerFeedback : '',
          paymentStatus: 'pending'
        },
        documentation: {
          completionCertificate: true,
          warrantyDocuments: true,
          invoiceGenerated: true,
          clientSignOff: contextData.tenantValidation?.validationType === 'approve'
        },
        archivalData: {
          category: 'maintenance',
          keywords: [contextData.intervention.type, contextData.intervention.urgency],
          retentionPeriod: 7,
          accessLevel: 'restricted'
        },
        followUpActions: {
          warrantyReminder: formData.scheduleFollowUp,
          maintenanceSchedule: formData.scheduleFollowUp,
          feedbackRequest: false
        },
        additionalDocuments: [],
        // Additional fields for simplified workflow
        providerFeedback: formData.providerFeedback,
        followUpScheduled: formData.scheduleFollowUp,
        followUpDate: formData.followUpDate?.toISOString(),
        followUpType: formData.followUpType
      }

      const response = await fetch(`/api/intervention/${interventionId}/manager-finalization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalizationData)
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la finalisation')
      }

      toast({
        title: "Intervention finalisée",
        description: `L'intervention a été ${formData.decision === 'validate' ? 'validée' : 'rejetée'} avec succès`
      })

      onClose()
      onComplete?.()

    } catch (err) {
      console.error('Error submitting finalization:', err)
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : 'Erreur lors de la finalisation',
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Mobile action handlers
  const handleMobileAction = (action: 'validate' | 'contest') => {
    setPendingAction(action)
    setShowConfirmation(true)
  }

  const handleConfirmAction = async (confirmationData: any) => {
    if (!contextData) return

    // Update form data with confirmation data
    setFormData({
      decision: confirmationData.decision,
      internalComments: confirmationData.internalComments,
      providerFeedback: confirmationData.providerFeedback,
      scheduleFollowUp: confirmationData.scheduleFollowUp
    })

    // Submit using existing logic
    await handleSubmit()

    // Close confirmation modal
    setShowConfirmation(false)
    setPendingAction(null)
  }

  // Loading state
  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <VisuallyHidden>
            <DialogTitle>Chargement de la finalisation d'intervention</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            <span className="ml-2 text-sm text-gray-600">Chargement du contexte...</span>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Error state
  if (error || !contextData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <VisuallyHidden>
            <DialogTitle>Erreur de chargement de la finalisation</DialogTitle>
          </VisuallyHidden>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Erreur de chargement</h3>
            <p className="text-sm text-gray-600 mb-6">{error || 'Impossible de charger les données'}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button onClick={fetchFinalizationContext}>
              Réessayer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // Main modal with responsive layout
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          /* Base styling */
          p-0
          overflow-hidden
          flex
          flex-col

          /* Override Dialog's default max-width */
          max-w-none

          /* Mobile - Full viewport usage */
          w-[95vw]
          h-[90vh]
          max-h-[90vh]

          /* Desktop - Optimized for side-by-side layout */
          lg:w-[80vw]
          lg:h-[70vh]
          lg:max-w-[1200px]
          lg:min-h-[500px]
          lg:max-h-[750px]

          xl:w-[75vw]
          xl:max-w-[1400px]
        "
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>
            Finaliser l'intervention {contextData.intervention.reference}
          </DialogTitle>
        </VisuallyHidden>


        {/* Unified Layout: Sticky header + content below */}
        <div className="flex flex-col h-full">
          {/* Sticky header with tabs and close button - Same for mobile and desktop */}
          <div className="flex-shrink-0 border-b bg-white sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-4">
                <FinalizationTabs
                  contextData={contextData}
                  className="mobile-tabs-only"
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content area - Different layout for mobile vs desktop */}
          {isMobile ? (
            /* Mobile: Single column with tabs content + action buttons at bottom */
            <>
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                <FinalizationTabs
                  contextData={contextData}
                  className="mobile-content-only"
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </div>

              {/* Fixed action buttons at bottom */}
              <div className="flex-shrink-0 bg-white border-t p-4">
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleMobileAction('contest')}
                    variant="outline"
                    className="flex-1 h-12 border-red-200 text-red-700 hover:bg-red-50"
                    disabled={submitting}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Contester
                  </Button>
                  <Button
                    onClick={() => handleMobileAction('validate')}
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                    disabled={submitting}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Valider
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Desktop: Side-by-side layout with mobile content + decision panel */
            <div className="flex flex-1 overflow-hidden">
              {/* Tabs content - Left side using mobile content */}
              <div className="flex-[7] bg-gray-50 overflow-hidden">
                <div className="h-full overflow-y-auto p-4">
                  <FinalizationTabs
                    contextData={contextData}
                    className="mobile-content-only"
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </div>
              </div>

              {/* Decision section - Right side */}
              <div className="flex-[3] bg-gradient-to-br from-gray-50 to-gray-100 border-l overflow-hidden">
                <div className="h-full overflow-y-auto p-6">
                  <FinalizationDecision
                    contextData={contextData}
                    formData={formData}
                    setFormData={setFormData}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    onClose={onClose}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {pendingAction && (
          <FinalizationConfirmationModal
            isOpen={showConfirmation}
            onClose={() => {
              setShowConfirmation(false)
              setPendingAction(null)
            }}
            action={pendingAction}
            onConfirm={handleConfirmAction}
            interventionRef={contextData.intervention.reference}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}