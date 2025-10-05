"use client"

/**
 * 🔄 COMPOSANT LOADING AUTHENTIFICATION
 * 
 * Composant de loading unifié pour toutes les transitions d'authentification
 * Améliore l'UX en montrant des messages contextuel selon l'état.
 */


import { Loader2 } from "lucide-react"

interface AuthLoadingProps {
  message?: string
  showSpinner?: boolean
  className?: string
}

export default function AuthLoading({ 
  message = "Vérification de l'authentification...",
  showSpinner = true,
  className = ""
}: AuthLoadingProps) {
  return (
    <div className={`flex items-center justify-center min-h-screen bg-background ${className}`}>
      <div className="text-center space-y-4">
        {showSpinner && (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {message}
          </p>
          <p className="text-xs text-muted-foreground">
            Veuillez patienter...
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Variant compact pour les loading en cours de page
 */
export function AuthLoadingCompact({ message, className = "" }: AuthLoadingProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="flex items-center space-x-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          {message || "Chargement..."}
        </span>
      </div>
    </div>
  )
}

/**
 * Messages de loading contextuels pré-définis
 */
export const AUTH_LOADING_MESSAGES = {
  initializing: "Initialisation de l'authentification...",
  verifying: "Vérification de l'authentification...",
  redirecting: "Redirection en cours...",
  signingIn: "Connexion en cours...",
  signingOut: "Déconnexion en cours...",
  callback: "Finalisation de la connexion...",
  emailConfirmation: "Confirmation de l'email en cours...",
  passwordReset: "Vérification du lien de réinitialisation...",
  loading: "Chargement des données...",
  transition: "Transition en cours..."
} as const

export type AuthLoadingMessage = keyof typeof AUTH_LOADING_MESSAGES
