"use client"

import { CheckCircle, XCircle, AlertTriangle, InformationCircleIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Hook spécialisé pour les notifications d'estimations selon Design System SEIDO
export function useQuoteToast() {
  const { toast } = useToast()

  return {
    // Toast pour estimation soumise avec succès
    quoteSubmitted: (amount: number, interventionTitle?: string) => {
      toast({
        variant: "success",
        title: "Estimation soumise avec succès",
        description: `Votre estimation de ${amount}€ a été envoyée au gestionnaire${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast pour estimation approuvée
    quoteApproved: (providerName: string, amount: number, interventionTitle?: string) => {
      toast({
        variant: "success",
        title: "Estimation approuvée",
        description: `L'estimation de ${providerName} (${amount}€) a été approuvée${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast pour estimation rejetée
    quoteRejected: (providerName?: string, reason?: string, interventionTitle?: string) => {
      toast({
        variant: "warning",
        title: "Estimation rejetée",
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
      toast({
        variant: "default",
        title: "Demandes d'estimations envoyées",
        description: `${providerCount} prestataire(s) ont été sollicités${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 5000,
      })
    },

    // Toast pour nouvelle demande d'estimation reçue (prestataire)
    newQuoteRequest: (interventionTitle: string, deadline?: string) => {
      toast({
        variant: "default",
        title: "Nouvelle demande d'estimation",
        description: `Estimation demandée pour "${interventionTitle}"${
          deadline ? ` - Deadline: ${deadline}` : ''
        }`,
        duration: 8000,
      })
    },

    // Toast pour nouvelle estimation reçue (gestionnaire)
    newQuoteReceived: (providerName: string, amount: number, interventionTitle?: string) => {
      toast({
        variant: "default",
        title: "Nouvelle estimation reçue",
        description: `${providerName} a soumis une estimation de ${amount}€${
          interventionTitle ? ` pour "${interventionTitle}"` : ''
        }`,
        duration: 6000,
      })
    },

    // Toast d'erreur générale pour les estimations
    quoteError: (message: string, action?: string) => {
      toast({
        variant: "destructive",
        title: `Erreur ${action ? `lors de ${action}` : 'd\'estimation'}`,
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
        description: `Il vous reste ${timeLeft} pour soumettre l'estimation de "${interventionTitle}"`,
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
      const actionText = action === 'approve' ? 'approuvée' : 'rejetée'
      toast({
        variant: action === 'approve' ? "success" : "warning",
        title: `Estimation ${actionText}`,
        description: `L'estimation de ${providerName} a été ${actionText} avec succès`,
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
