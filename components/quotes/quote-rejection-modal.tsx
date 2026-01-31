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
import { X, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { logger } from '@/lib/logger'

interface QuoteRejectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  quote: {
    id: string
    providerName: string
    totalAmount: number
  }
}

export function QuoteRejectionModal({
  isOpen,
  onClose,
  onSuccess,
  quote
}: QuoteRejectionModalProps) {
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({
        title: "Motif requis",
        description: "Veuillez indiquer un motif de rejet",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/quotes/${quote.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du rejet')
      }

      toast({
        title: "Estimation rejetée",
        description: "L'estimation a été rejetée avec succès.",
      })

      setReason("")
      onClose()
      onSuccess()

    } catch (error) {
      logger.error('Erreur lors du rejet:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du rejet",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason("")
      onClose()
    }
  }

  const isReasonValid = reason.trim().length > 0

  return (
    <UnifiedModal
      open={isOpen}
      onOpenChange={handleClose}
      size="md"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title="Rejeter l'estimation"
        subtitle={`${quote.providerName} - ${quote.totalAmount.toFixed(2)} €`}
        icon={<X className="h-5 w-5" />}
        variant="danger"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Attention :</h4>
                <p className="text-sm text-amber-800">
                  Cette action est définitive. Le prestataire sera notifié du rejet avec le motif fourni.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Motif du rejet <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Expliquez pourquoi cette estimation est rejetée..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={4}
              className={!isReasonValid && reason.length > 0 ? "border-red-300 focus:border-red-500" : ""}
            />
            {!isReasonValid && reason.length > 0 && (
              <p className="text-sm text-red-600">Le motif du rejet est obligatoire</p>
            )}
          </div>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          onClick={handleReject}
          disabled={isLoading || !isReasonValid}
          variant="destructive"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Rejet...
            </>
          ) : (
            <>
              <X className="h-4 w-4 mr-2" />
              Rejeter l&apos;estimation
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
