"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { X, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { logger, logError } from '@/lib/logger'
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du rejet')
      }

      toast({
        title: "Devis rejeté",
        description: "Le devis a été rejeté avec succès.",
        variant: "default",
      })

      setReason("")
      onClose()
      onSuccess()

    } catch (error) {
      logger.error('Erreur lors du rejet:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du rejet du devis",
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <X className="h-5 w-5 text-red-600" />
            <span>Rejeter le devis</span>
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de rejeter le devis de <strong>{quote.providerName}</strong>
            d'un montant de <strong>{quote.totalAmount.toFixed(2)} €</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">Attention :</h4>
                <p className="text-sm text-yellow-800">
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
              placeholder="Expliquez pourquoi ce devis est rejeté..."
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
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
                Rejeter le devis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
