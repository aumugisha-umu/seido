"use client"

import { useState, useEffect } from "react"
import { Check, X, MapPin, User, Paperclip, Clock, ChevronLeft, Flame, Wrench, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type InterventionAction } from "@/lib/intervention-actions-service"
import {
  getInterventionLocationText,
  getPriorityColor,
  getPriorityLabel
} from "@/lib/intervention-utils"

type ModalState = 'decision' | 'approve' | 'reject'

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: InterventionAction | null
  action: "approve" | "reject" | null
  rejectionReason: string
  internalComment: string
  onRejectionReasonChange: (_reason: string) => void
  onInternalCommentChange: (_comment: string) => void
  onActionChange: (action: "approve" | "reject") => void
  onConfirm: (action?: "approve" | "reject") => void
  isLoading?: boolean
}

export const ApprovalModal = ({
  isOpen,
  onClose,
  intervention,
  action,
  rejectionReason,
  internalComment,
  onRejectionReasonChange,
  onInternalCommentChange,
  onActionChange,
  onConfirm,
  isLoading = false,
}: ApprovalModalProps) => {
  const [modalState, setModalState] = useState<ModalState>('decision')
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Reset state when modal opens/closes
  // If action is pre-selected, skip directly to that state (e.g., 'revise_decision' skips to 'approve')
  useEffect(() => {
    if (isOpen) {
      // If action is pre-selected, go directly to that state
      if (action === 'approve') {
        setModalState('approve')
      } else if (action === 'reject') {
        setModalState('reject')
      } else {
        setModalState('decision')
      }
      onRejectionReasonChange('')
      onInternalCommentChange('')
    }
  }, [isOpen, action, onRejectionReasonChange, onInternalCommentChange])

  if (!intervention) return null

  const handleStateChange = (newState: ModalState) => {
    setIsTransitioning(true)
    setTimeout(() => {
      setModalState(newState)
      setIsTransitioning(false)
    }, 150)
  }

  const handleApproveClick = () => {
    onActionChange("approve")
    handleStateChange('approve')
  }

  const handleRejectClick = () => {
    onActionChange("reject")
    handleStateChange('reject')
  }

  const handleBack = () => {
    handleStateChange('decision')
  }

  const handleConfirmApprove = () => {
    onConfirm("approve")
  }

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) return
    onConfirm("reject")
  }

  // Format relative time
  const getRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
  }

  // Format full date
  const getFullDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  // Files count
  const filesCount = intervention.filesCount || 0
  const hasFiles = filesCount > 0 || intervention.hasFiles

  // Creator name
  const creatorName = intervention.creator_name || intervention.tenant || 'Locataire'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => isLoading && e.preventDefault()}
        onEscapeKeyDown={(e) => isLoading && e.preventDefault()}
      >
        {/* Accessible title (visually hidden) */}
        <VisuallyHidden>
          <DialogTitle>Traiter la demande d&apos;intervention</DialogTitle>
        </VisuallyHidden>

        <div
          className={cn(
            "transition-opacity duration-150",
            isTransitioning ? "opacity-0" : "opacity-100"
          )}
        >
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STATE: Decision (Initial View) */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {modalState === 'decision' && (
            <div className="p-6">
              {/* Badges: Urgency + Category */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {/* Urgency Badge with Flame icon */}
                <Badge className={cn(getPriorityColor(intervention.urgency || ""), "text-xs font-medium gap-1")}>
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {getPriorityLabel(intervention.urgency || "")}
                </Badge>
                {/* Category Badge */}
                {intervention.type && (
                  <Badge variant="secondary" className="text-xs font-medium gap-1 bg-slate-100 text-slate-700">
                    <Wrench className="h-3 w-3" aria-hidden="true" />
                    {intervention.type}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h2 className="text-xl font-semibold text-slate-900 mb-3 leading-tight">
                {intervention.title}
              </h2>

              {/* Location + Address */}
              <div className="flex items-start gap-2 text-sm text-slate-600 mb-4">
                <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex flex-col">
                  <span>{getInterventionLocationText(intervention)}</span>
                  {intervention.address && (
                    <span className="text-xs text-slate-500">{intervention.address}</span>
                  )}
                </div>
              </div>

              {/* Description */}
              {intervention.description && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">
                    {intervention.description}
                  </p>
                </div>
              )}

              {/* Attachments */}
              {hasFiles && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="p-1.5 bg-blue-100 rounded">
                    <ImageIcon className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-blue-900">
                      {filesCount > 0 ? `${filesCount} pièce${filesCount > 1 ? 's' : ''} jointe${filesCount > 1 ? 's' : ''}` : 'Pièces jointes'}
                    </span>
                    <p className="text-xs text-blue-700">Photos ou documents ajoutés à la demande</p>
                  </div>
                  <Paperclip className="h-4 w-4 text-blue-500" aria-hidden="true" />
                </div>
              )}

              {/* Meta info: Creator + Time */}
              <div className="flex items-center gap-2 text-xs text-slate-600 mb-6 pb-4 border-b border-slate-100">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Créé par <span className="font-medium text-slate-700">{creatorName}</span>
                </span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{getRelativeTime(intervention.created_at)}</span>
              </div>

              {/* Action Buttons */}
              {/* Hide reject button if intervention is already rejected */}
              <div className="flex gap-3">
                {intervention.status !== 'rejetee' && (
                  <Button
                    variant="outline"
                    onClick={handleRejectClick}
                    className="flex-1 h-11 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2" aria-hidden="true" />
                    Rejeter
                  </Button>
                )}
                <Button
                  onClick={handleApproveClick}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors"
                >
                  <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                  Approuver
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STATE: Approve Confirmation */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {modalState === 'approve' && (
            <div className="p-6">
              {/* Header with back button */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="p-2.5 -ml-2.5 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-full">
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Approuver l&apos;intervention
                  </h2>
                </div>
              </div>

              {/* Intervention title recap */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-slate-700">{intervention.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Créé par {creatorName} le {getFullDate(intervention.created_at)}
                </p>
              </div>

              {/* Info message */}
              <p className="text-sm text-slate-600 mb-5">
                L&apos;intervention passera en phase de <span className="font-medium text-slate-700">planification</span>.
              </p>

              {/* Internal comment */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="internal-comment" className="text-sm font-medium text-slate-700">
                  Commentaire interne <span className="text-slate-400 font-normal">(optionnel)</span>
                </Label>
                <Textarea
                  id="internal-comment"
                  value={internalComment}
                  onChange={(e) => onInternalCommentChange(e.target.value)}
                  placeholder="Ajoutez des notes internes sur cette approbation..."
                  className="min-h-[100px] resize-none text-sm"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                  Visible uniquement par l&apos;équipe de gestion
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmApprove}
                  disabled={isLoading}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2" role="status" aria-live="polite">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span>Traitement...</span>
                    </div>
                  ) : (
                    "Confirmer l'approbation"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* STATE: Reject Confirmation */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {modalState === 'reject' && (
            <div className="p-6">
              {/* Header with back button */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="p-2.5 -ml-2.5 rounded-lg hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-600" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-100 rounded-full">
                    <X className="h-4 w-4 text-red-600" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Rejeter l&apos;intervention
                  </h2>
                </div>
              </div>

              {/* Intervention title recap */}
              <div className="bg-slate-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-slate-700">{intervention.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Créé par {creatorName} le {getFullDate(intervention.created_at)}
                </p>
              </div>

              {/* Info message */}
              <p className="text-sm text-slate-600 mb-5">
                Le locataire sera notifié du rejet avec le motif indiqué.
              </p>

              {/* Rejection reason (required) */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="rejection-reason" className="text-sm font-medium text-slate-700">
                  Motif du rejet <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => onRejectionReasonChange(e.target.value)}
                  placeholder="Expliquez pourquoi cette demande est rejetée..."
                  className={cn(
                    "min-h-[80px] resize-none text-sm",
                    !rejectionReason.trim() && "border-red-200 focus-visible:ring-red-500"
                  )}
                />
              </div>

              {/* Internal comment */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="internal-comment-reject" className="text-sm font-medium text-slate-700">
                  Commentaire interne <span className="text-slate-400 font-normal">(optionnel)</span>
                </Label>
                <Textarea
                  id="internal-comment-reject"
                  value={internalComment}
                  onChange={(e) => {
                    console.log('📝 [MODAL] Internal comment changed:', e.target.value)
                    onInternalCommentChange(e.target.value)
                  }}
                  placeholder="Notes internes (non visibles par le locataire)..."
                  className="min-h-[80px] resize-none text-sm"
                />
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                  Visible uniquement par l&apos;équipe de gestion
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim() || isLoading}
                  className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2" role="status" aria-live="polite">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span>Traitement...</span>
                    </div>
                  ) : (
                    "Confirmer le rejet"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
