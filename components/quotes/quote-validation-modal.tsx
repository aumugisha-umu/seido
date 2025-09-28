"use client"

import { useState } from "react"
import { CheckCircle, XCircle, InformationCircleIcon, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Quote {
  id: string
  provider: {
    name: string
    provider_category?: string
  }
  total_amount: number
  labor_cost: number
  materials_cost: number
  description: string
}

interface QuoteValidationModalProps {
  isOpen: boolean
  onClose: () => void
  quote: Quote | null
  action: 'approve' | 'reject'
  onConfirm: (quoteId: string, action: 'approve' | 'reject', comments?: string) => Promise<void>
  isLoading?: boolean
}

export function QuoteValidationModal({
  isOpen,
  onClose,
  quote,
  action,
  onConfirm,
  isLoading: _isLoading
}: QuoteValidationModalProps) {
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!quote) return

    // Validation: commentaire requis pour rejet
    if (action === 'reject' && !comments.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(quote.id, action, comments.trim() || undefined)
      setComments('')
      onClose()
    } catch (error) {
      console.error('Error validating quote:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setComments('')
      onClose()
    }
  }

  if (!quote) return null

  return (
    <Modal open={isOpen} onClose={handleClose} size="md">
      <Modal.Header>
        <Modal.Title className="flex items-center space-x-2 text-slate-900">
          {action === 'approve' ? (
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500" />
          )}
          <span>
            {action === 'approve' ? 'Approuver' : 'Rejeter'} le Devis
          </span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Content className="space-y-4">
        {/* Résumé du Devis selon Design System */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-medium text-slate-900 mb-3">Résumé du Devis</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-600">Prestataire:</span>
              <p className="font-medium text-slate-900">{quote.provider.name}</p>
            </div>
            <div>
              <span className="text-slate-600">Catégorie:</span>
              <p className="font-medium text-slate-900">{quote.provider.provider_category || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-600">Main d'œuvre:</span>
              <p className="font-medium text-slate-900">{quote.labor_cost}€</p>
            </div>
            <div>
              <span className="text-slate-600">Matériaux:</span>
              <p className="font-medium text-slate-900">{quote.materials_cost}€</p>
            </div>
          </div>

          {/* Total prominent selon Design System */}
          <div className="mt-4 text-center p-3 bg-sky-50 border border-sky-200 rounded-lg">
            <p className="text-sm text-slate-600">Total du Devis</p>
            <p className="text-2xl font-bold text-sky-700">{quote.total_amount}€</p>
          </div>

          {/* Description */}
          <div className="mt-3">
            <span className="text-slate-600 text-sm">Description:</span>
            <p className="text-sm text-slate-700 mt-1 p-2 bg-white rounded border">
              {quote.description}
            </p>
          </div>
        </div>

        {/* Zone Commentaires */}
        <div className="space-y-2">
          <Label htmlFor="comments" className="text-slate-700">
            {action === 'approve'
              ? 'Commentaires (optionnel)'
              : 'Motif de rejet (requis) *'
            }
          </Label>
          <Textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={action === 'approve'
              ? "Félicitations pour votre proposition, nous retenons votre offre..."
              : "Veuillez expliquer les raisons du rejet (prix, délais, qualifications, etc.)..."
            }
            rows={4}
            className={
              action === 'reject' && !comments.trim()
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : comments.trim()
                ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                : ''
            }
          />
          {action === 'reject' && !comments.trim() && (
            <div className="text-sm text-red-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Le motif de rejet est requis
            </div>
          )}
        </div>

        {/* Alerte Conséquences selon Design System */}
        {action === 'approve' && (
          <Alert className="border-sky-200 bg-sky-50">
            <InformationCircleIcon className="w-4 h-4 text-sky-600" />
            <AlertDescription className="text-sky-800">
              <strong>Attention :</strong> Cette action définira ce prestataire pour l'intervention et rejettera automatiquement les autres devis en attente.
            </AlertDescription>
          </Alert>
        )}

        {action === 'reject' && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Le prestataire sera notifié du rejet avec votre motif. Cette action est irréversible.
            </AlertDescription>
          </Alert>
        )}
      </Modal.Content>

      <Modal.Footer className="flex justify-end space-x-3">
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isSubmitting}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          Annuler
        </Button>
        <Button
          variant="default"
          onClick={handleConfirm}
          disabled={isSubmitting || (action === 'reject' && !comments.trim())}
          className={`min-w-[140px] ${
            action === 'approve'
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Traitement...</span>
            </div>
          ) : (
            <>
              {action === 'approve' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {action === 'approve' ? "Confirmer l'approbation" : 'Confirmer le rejet'}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
