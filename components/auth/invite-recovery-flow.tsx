/**
 * 🔐 CLIENT COMPONENT - INVITATION & RECOVERY FLOW
 *
 * Gère la vérification des liens d'invitation et de récupération mot de passe.
 * Utilise une Server Action pour la vérification OTP (modification cookies).
 *
 * Pattern Next.js 15 + Supabase SSR:
 * - Client Component pour UI et states
 * - Server Action pour verifyOtp + cookies
 * - Redirection après succès
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import AuthLogo from '@/components/ui/auth-logo'
import { verifyInviteOrRecoveryAction } from '@/app/actions/confirm-actions'
import { logger } from '@/lib/logger'

/**
 * États du flow de vérification
 */
type FlowState = 'verifying' | 'success' | 'error'

/**
 * Types de liens supportés
 */
type LinkType = 'invite' | 'recovery' | 'magiclink'

interface InviteRecoveryFlowProps {
  tokenHash: string
  type: LinkType  // ✅ BUGFIX: Ajout magiclink pour utilisateurs existants
  teamId?: string  // Pour acceptation auto des invitations multi-équipe
}

/**
 * Helper pour obtenir les messages UI selon le type de lien
 *
 * - invite: Nouvel utilisateur → création compte + définition mot de passe
 * - magiclink: Utilisateur existant → connexion auto + ajout à nouvelle équipe
 * - recovery: Reset password → mise à jour du mot de passe
 */
const getMessages = (type: LinkType) => ({
  verifying: {
    title: type === 'invite'
      ? "Confirmation de l'invitation"
      : type === 'magiclink'
        ? "Connexion à votre nouvelle équipe"
        : "Récupération de mot de passe",
    subtitle: type === 'invite'
      ? "Vérification de votre invitation en cours..."
      : type === 'magiclink'
        ? "Vérification de votre accès en cours..."
        : "Vérification du lien de récupération..."
  },
  success: {
    title: type === 'invite'
      ? "Invitation confirmée !"
      : type === 'magiclink'
        ? "Bienvenue dans votre nouvelle équipe !"
        : "Lien vérifié !",
    subtitle: type === 'invite'
      ? "Votre compte a été activé avec succès"
      : type === 'magiclink'
        ? "Vous avez été ajouté avec succès. Redirection vers le tableau de bord..."
        : "Vous pouvez maintenant définir votre nouveau mot de passe"
  },
  error: {
    title: type === 'invite'
      ? "Invitation invalide"
      : type === 'magiclink'
        ? "Lien de connexion invalide"
        : "Lien invalide",
    subtitle: type === 'invite'
      ? "Le lien d'invitation est expiré ou invalide"
      : type === 'magiclink'
        ? "Le lien de connexion est expiré ou invalide"
        : "Le lien de récupération est expiré ou invalide",
    helpText: type === 'invite' || type === 'magiclink'
      ? "Veuillez contacter l'administrateur pour obtenir un nouveau lien."
      : "Veuillez faire une nouvelle demande de réinitialisation de mot de passe.",
    buttonText: type === 'invite' || type === 'magiclink'
      ? "Retour à la connexion"
      : "Nouvelle demande",
    buttonHref: type === 'invite' || type === 'magiclink'
      ? '/auth/login'
      : '/auth/reset-password'
  }
})

export function InviteRecoveryFlow({ tokenHash, type, teamId }: InviteRecoveryFlowProps) {
  const router = useRouter()
  const [state, setState] = useState<FlowState>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [redirectTo, setRedirectTo] = useState<string>('')

  // ✅ Messages UI différenciés selon le type de lien
  const messages = getMessages(type)

  useEffect(() => {
    // Fonction pour vérifier le lien
    const verifyLink = async () => {
      logger.info(`🔐 [INVITE-RECOVERY-FLOW] Starting ${type} verification`, { teamId })

      try {
        // Appeler la Server Action avec teamId pour acceptation auto
        const result = await verifyInviteOrRecoveryAction(tokenHash, type, teamId)

        if (!result.success) {
          logger.error(`❌ [INVITE-RECOVERY-FLOW] Verification failed:`, result.error)
          setState('error')
          setErrorMessage(result.error || 'Erreur de vérification')
          return
        }

        logger.info(`✅ [INVITE-RECOVERY-FLOW] Verification successful`)

        // ✅ PATTERN SIMPLIFIÉ: On fait confiance au succès de la Server Action
        // La session a été créée côté serveur. SetPasswordPage fera la double vérification.
        // Pas besoin de vérifier getSession() ici (peut bloquer à cause de cookies)

        // Succès - préparer la redirection avec paramètre de vérification
        const baseDestination = result.data?.redirectTo || '/auth/login'
        const destination = `${baseDestination}${baseDestination.includes('?') ? '&' : '?'}verified=true`
        setRedirectTo(destination)
        setState('success')

        // ✅ CRITIQUE: Forcer refresh du router pour que le serveur voit la session
        // Cela permet à useAuth() de se synchroniser via onAuthStateChange
        logger.info(`🔄 [INVITE-RECOVERY-FLOW] Forcing router refresh...`)
        router.refresh()

        // ✅ Attendre 4 secondes pour laisser le temps à:
        // 1. onAuthStateChange de fire avec SIGNED_IN
        // 2. useAuth() de se mettre à jour
        // 3. SetPasswordPage de faire sa double vérification
        // 4. Afficher le message de succès à l'utilisateur
        setTimeout(() => {
          logger.info(`🔄 [INVITE-RECOVERY-FLOW] Redirecting to:`, destination)
          router.push(destination)
        }, 4000)

      } catch (error) {
        logger.error(`❌ [INVITE-RECOVERY-FLOW] Unexpected error:`, error)
        setState('error')
        setErrorMessage('Une erreur inattendue est survenue')
      }
    }

    verifyLink()
  }, [tokenHash, type, teamId, router])

  // État: Vérification en cours
  if (state === 'verifying') {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {messages.verifying.title}
            </h1>
            <p className="text-white/60">
              {messages.verifying.subtitle}
            </p>
          </div>
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-brand-primary mx-auto" />
            <p className="text-sm text-white/50">
              Veuillez patienter quelques instants
            </p>
          </div>
        </div>
      </div>
    )
  }

  // État: Succès
  if (state === 'success') {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {messages.success.title}
            </h1>
            <p className="text-white/60">
              {messages.success.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Alert className="border-green-500/30 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              <strong>Vérification réussie !</strong>
              <br />
              Redirection automatique en cours...
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => router.push(redirectTo)}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02]"
          >
            Continuer
          </Button>
        </div>
      </div>
    )
  }

  // État: Erreur
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {messages.error.title}
          </h1>
          <p className="text-white/60">
            {messages.error.subtitle}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || 'Une erreur est survenue lors de la vérification'}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-white/60">
            {messages.error.helpText}
          </p>

          <Button
            onClick={() => router.push(messages.error.buttonHref)}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02]"
          >
            {messages.error.buttonText}
          </Button>
        </div>
      </div>
    </div>
  )
}
