"use client"

import { toast } from "sonner"

// Hook spécialisé pour les notifications d'estimations selon Design System SEIDO
export function useQuoteToast() {
  return {
    // Toast pour estimation soumise avec succès
    quoteSubmitted: (amount: number, interventionTitle?: string) => {
      toast.success("Estimation soumise avec succès", {
        description: `Votre estimation de ${amount}€ a été envoyée au gestionnaire${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast pour estimation approuvée
    quoteApproved: (providerName: string, amount: number, interventionTitle?: string) => {
      toast.success("Estimation approuvée", {
        description: `L'estimation de ${providerName} (${amount}€) a été approuvée${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast pour estimation rejetée
    quoteRejected: (providerName?: string, reason?: string, interventionTitle?: string) => {
      toast.warning("Estimation rejetée", {
        description: reason
          ? `Motif: ${reason}`
          : `L'estimation ${providerName ? `de ${providerName}` : ''} n'a pas été retenue${
              interventionTitle ? ` pour "${interventionTitle}"` : ''
            }`,
        duration: 7000,
      })
    },

    // Toast pour demandes d'estimations envoyées
    quoteRequestSent: (providerCount: number, interventionTitle?: string) => {
      toast("Demandes d'estimations envoyées", {
        description: `${providerCount} prestataire(s) ont été sollicités${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 5000,
      })
    },

    // Toast pour nouvelle demande d'estimation reçue (prestataire)
    newQuoteRequest: (interventionTitle: string, deadline?: string) => {
      toast("Nouvelle demande d'estimation", {
        description: `Estimation demandée pour "${interventionTitle}"${
          deadline ? ` - Deadline: ${deadline}` : ''
        }`,
        duration: 8000,
      })
    },

    // Toast pour nouvelle estimation reçue (gestionnaire)
    newQuoteReceived: (providerName: string, amount: number, interventionTitle?: string) => {
      toast("Nouvelle estimation reçue", {
        description: `${providerName} a soumis une estimation de ${amount}€${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast d'erreur générale pour les estimations
    quoteError: (message: string, action?: string) => {
      toast.error(`Erreur ${action ? `lors de ${action}` : 'd\'estimation'}`, {
        description: message,
        duration: 8000,
      })
    },

    // Toast d'erreur de validation de formulaire
    quoteValidationError: (field: string, message: string) => {
      toast.error("Erreur de validation", {
        description: `${field}: ${message}`,
        duration: 6000,
      })
    },

    // Toast pour deadline proche
    quoteDeadlineWarning: (interventionTitle: string, timeLeft: string) => {
      toast.warning("Deadline proche", {
        description: `Il vous reste ${timeLeft} pour soumettre l'estimation de "${interventionTitle}"`,
        duration: 10000,
      })
    },

    // Toast pour intervention passée en planification
    quoteToPlanning: (interventionTitle: string, providerName: string) => {
      toast.success("Passage en planification", {
        description: `"${interventionTitle}" est maintenant assignée à ${providerName}`,
        duration: 6000,
      })
    },

    // Toast de confirmation pour actions importantes
    confirmQuoteAction: (action: 'approve' | 'reject', providerName: string) => {
      const actionText = action === 'approve' ? 'approuvée' : 'rejetée'
      const toastFn = action === 'approve' ? toast.success : toast.warning
      toastFn(`Estimation ${actionText}`, {
        description: `L'estimation de ${providerName} a été ${actionText} avec succès`,
        duration: 5000,
      })
    },

    // Toast pour notifications systèmes
    systemNotification: (title: string, message: string, type: 'info' | 'warning' = 'info') => {
      const toastFn = type === 'warning' ? toast.warning : toast
      toastFn(title, {
        description: message,
        duration: 5000,
      })
    }
  }
}
