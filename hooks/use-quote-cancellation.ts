import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { logger, logError } from '@/lib/logger'
interface CancelQuoteResponse {
  success: boolean
  message: string
  error?: string
}

interface UseQuoteCancellationProps {
  onSuccess?: () => void
}

export function useQuoteCancellation({ onSuccess }: UseQuoteCancellationProps = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [pendingQuoteId, setPendingQuoteId] = useState<string | null>(null)
  const { toast } = useToast()

  const cancelQuote = async (_quoteId: string) => {
    try {
      setIsLoading(true)
      logger.info('🔍 [HOOK] Attempting to cancel quote with ID:', quoteId)

      const response = await fetch(`/api/quotes/${quoteId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data: CancelQuoteResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'annulation du devis')
      }

      // Notification de succès
      toast({
        title: "Devis annulé",
        description: "Votre devis a été annulé avec succès. Les gestionnaires ont été notifiés.",
        variant: "default",
        className: "bg-green-50 border-green-200 text-green-800"
      })

      // Callback de succès
      onSuccess?.()

      return { success: true }
    } catch (error) {
      logger.error('❌ Error cancelling quote:', error)
      
      // Notification d'erreur
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'annuler le devis",
        variant: "destructive"
      })

      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
    } finally {
      setIsLoading(false)
      setIsConfirmModalOpen(false)
      setPendingQuoteId(null)
    }
  }

  const handleCancelRequest = (_quoteId: string) => {
    logger.info('🔍 [HOOK] Cancel request for quote ID:', quoteId)
    setPendingQuoteId(quoteId)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmCancel = () => {
    if (pendingQuoteId) {
      cancelQuote(pendingQuoteId)
    }
  }

  const handleCancelModal = () => {
    setIsConfirmModalOpen(false)
    setPendingQuoteId(null)
  }

  return {
    isLoading,
    isConfirmModalOpen,
    handleCancelRequest,
    handleConfirmCancel,
    handleCancelModal,
    cancelQuote
  }
}
