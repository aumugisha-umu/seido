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
import { Check, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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
  const { toast } = useToast()

  const handleApprove = async () => {
    console.log('🚀 [APPROVAL] Starting quote approval process')
    console.log('📋 [APPROVAL] Quote data:', {
      id: quote.id,
      providerName: quote.providerName,
      totalAmount: quote.totalAmount
    })
    console.log('💬 [APPROVAL] Comments:', comments.trim() || null)

    setIsLoading(true)

    try {
      const apiUrl = `/api/quotes/${quote.id}/approve`
      console.log('🌐 [APPROVAL] Calling API:', apiUrl)

      const requestBody = {
        comments: comments.trim() || null
      }
      console.log('📤 [APPROVAL] Request body:', requestBody)

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('📥 [APPROVAL] Response status:', response.status)
      console.log('📥 [APPROVAL] Response ok:', response.ok)

      const _data = await response.json()
      console.log('📄 [APPROVAL] Response data:', data)

      if (!response.ok) {
        console.error('❌ [APPROVAL] API error:', data.error)
        if (data.debug) {
          console.error('🐛 [APPROVAL] Debug info from API:', data.debug)
        }
        throw new Error(data.error || 'Erreur lors de l\'approbation')
      }

      console.log('✅ [APPROVAL] Success! Showing toast notification')
      toast({
        title: "Devis approuvé",
        description: "Le devis a été approuvé avec succès. L'intervention passe en phase de planification.",
        variant: "default",
      })

      console.log('🔄 [APPROVAL] Calling onSuccess callback')
      setComments("")
      onClose()
      onSuccess()

    } catch (error) {
      console.error('❌ [APPROVAL] Error caught:', error)
      console.error('❌ [APPROVAL] Error type:', typeof error)
      console.error('❌ [APPROVAL] Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('❌ [APPROVAL] Full error object:', error)

      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'approbation du devis",
        variant: "destructive",
      })
    } finally {
      console.log('🏁 [APPROVAL] Process completed, setting loading to false')
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Check className="h-5 w-5 text-green-600" />
            <span>Approuver le devis</span>
          </DialogTitle>
          <DialogDescription>
            Vous êtes sur le point d'approuver le devis de <strong>{quote.providerName}</strong>
            d'un montant de <strong>{quote.totalAmount.toFixed(2)} €</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="font-medium text-blue-900 mb-1">Conséquences de l'approbation :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Le devis sera marqué comme approuvé</li>
              <li>• L'intervention passera au statut "Planification"</li>
              <li>• Tous les autres devis en attente seront automatiquement rejetés</li>
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Approbation...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Approuver le devis
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
