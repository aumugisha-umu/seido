"use client"

import { CheckCircle, XCircle, AlertTriangle, InformationCircleIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Hook spécialisé pour les notifications de devis selon Design System SEIDO
export function useQuoteToast() {
  const { toast } = useToast()

  return {
    // Toast pour devis soumis avec succès
    quoteSubmitted: (amount: number, interventionTitle?: string) => {
      toast({
        variant: "success",
        title: "Devis soumis avec succès",
        description: `Votre devis de ${amount}€ a été envoyé au gestionnaire${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast pour devis approuvé
    quoteApproved: (providerName: string, amount: number, interventionTitle?: string) => {
      toast({
        variant: "success",
        title: "Devis approuvé",
        description: `Le devis de ${providerName} (${amount}€) a été approuvé${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast pour devis rejeté
    quoteRejected: (providerName?: string, reason?: string, interventionTitle?: string) => {
      toast({
        variant: "warning",
        title: "Devis rejeté",
        description: reason
          ? `Motif: ${reason}`
          : `Le devis ${providerName ? `de ${providerName}` : ''} n'a pas été retenu${
              interventionTitle ? ` pour "${interventionTitle}"` : ''
            }`,
        duration: 7000,
      })
    },

    // Toast pour demandes de devis envoyées
    quoteRequestSent: (providerCount: number, interventionTitle?: string) => {
      toast({
        variant: "default",
        title: "Demandes de devis envoyées",
        description: `${providerCount} prestataire(s) ont été sollicités${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 5000,
      })
    },

    // Toast pour nouvelle demande de devis reçue (prestataire)
    newQuoteRequest: (interventionTitle: string, deadline?: string) => {
      toast({
        variant: "default",
        title: "Nouvelle demande de devis",
        description: `Devis demandé pour "${interventionTitle}"${
          deadline ? ` - Deadline: ${deadline}` : ''
        }`,
        duration: 8000,
      })
    },

    // Toast pour nouveau devis reçu (gestionnaire)
    newQuoteReceived: (providerName: string, amount: number, interventionTitle?: string) => {
      toast({
        variant: "default",
        title: "Nouveau devis reçu",
        description: `${providerName} a soumis un devis de ${amount}€${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast d'erreur générale pour les devis
    quoteError: (message: string, action?: string) => {
      toast({
        variant: "destructive",
        title: `Erreur ${action ? `lors de ${action}` : 'de devis'}`,
        description: message,
        duration: 8000,
      })
    },

    // Toast d'erreur de validation de formulaire
    quoteValidationError: (field: string, message: string) => {
      toast({
        variant: "destructive",
        title: "Erreur de validation",
        description: `${field}: ${message}`,
        duration: 6000,
      })
    },

    // Toast pour deadline proche
    quoteDeadlineWarning: (interventionTitle: string, timeLeft: string) => {
      toast({
        variant: "warning",
        title: "Deadline proche",
        description: `Il vous reste ${timeLeft} pour soumettre le devis de "${interventionTitle}"`,
        duration: 10000,
      })
    },

    // Toast pour intervention passée en planification
    quoteToPlanning: (interventionTitle: string, providerName: string) => {
      toast({
        variant: "success",
        title: "Passage en planification",
        description: `"${interventionTitle}" est maintenant assignée à ${providerName}`,
        duration: 6000,
      })
    },

    // Toast de confirmation pour actions importantes
    confirmQuoteAction: (action: 'approve' | 'reject', providerName: string) => {
      const actionText = action === 'approve' ? 'approuvé' : 'rejeté'
      toast({
        variant: action === 'approve' ? "success" : "warning",
        title: `Devis ${actionText}`,
        description: `Le devis de ${providerName} a été ${actionText} avec succès`,
        duration: 5000,
      })
    },

    // Toast pour notifications systèmes
    systemNotification: (title: string, message: string, type: 'info' | 'warning' = 'info') => {
      toast({
        variant: type === 'warning' ? "warning" : "default",
        title,
        description: message,
        duration: 5000,
      })
    }
  }
}
