"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { logger } from '@/lib/logger'

interface QuoteApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  quote: {
    id: string
    providerName: string
    totalAmount: number
  }
}

export function QuoteApprovalModal({
  isOpen,
  onClose,
  onSuccess,
  quote
}: QuoteApprovalModalProps) {
  const [comments, setComments] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const handleApprove = async () => {
    logger.info('🚀 [APPROVAL] Starting quote approval process')

    setIsLoading(true)

    try {
      const response = await fetch(`/api/quotes/${quote.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comments.trim() || null })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'approbation')
      }

      toast("Estimation approuvée", { description: "L'estimation a été approuvée. L'intervention passe en phase de planification." })

      setComments("")
      onClose()
      onSuccess()

    } catch (error) {
      logger.error('❌ [APPROVAL] Error:', error)
      toast.error("Erreur", { description: error instanceof Error ? error.message : "Erreur lors de l'approbation" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setComments("")
      onClose()
    }
  }

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="md"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title="Approuver l'estimation"
        subtitle={`${quote.providerName} - ${quote.totalAmount.toFixed(2)} €`}
        icon={<Check className="h-5 w-5" />}
        variant="success"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-1">Conséquences de l&apos;approbation :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• L&apos;estimation sera marquée comme approuvée</li>
              <li>• L&apos;intervention passera au statut &quot;Planification&quot;</li>
              <li>• Les autres estimations en attente seront automatiquement rejetées</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Commentaires (optionnel)</Label>
            <Textarea
              id="comments"
              placeholder="Ajoutez des commentaires sur votre décision..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button onClick={handleApprove} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Approbation...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Approuver l&apos;estimation
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
