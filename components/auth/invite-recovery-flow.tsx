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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import AuthLogo from '@/components/ui/auth-logo'
import { verifyInviteOrRecoveryAction } from '@/app/actions/confirm-actions'
import { logger } from '@/lib/logger'

/**
 * États du flow de vérification
 */
type FlowState = 'verifying' | 'success' | 'error'

interface InviteRecoveryFlowProps {
  tokenHash: string
  type: 'invite' | 'recovery'
}

export function InviteRecoveryFlow({ tokenHash, type }: InviteRecoveryFlowProps) {
  const router = useRouter()
  const [state, setState] = useState<FlowState>('verifying')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [redirectTo, setRedirectTo] = useState<string>('')

  useEffect(() => {
    // Fonction pour vérifier le lien
    const verifyLink = async () => {
      logger.info(`🔐 [INVITE-RECOVERY-FLOW] Starting ${type} verification`)

      try {
        // Appeler la Server Action
        const result = await verifyInviteOrRecoveryAction(tokenHash, type)

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
  }, [tokenHash, type, router])

  // État: Vérification en cours
  if (state === 'verifying') {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {type === 'invite' ? 'Confirmation de l\'invitation' : 'Récupération de mot de passe'}
            </h1>
            <p className="text-white/60">
              {type === 'invite'
                ? 'Vérification de votre invitation en cours...'
                : 'Vérification du lien de récupération...'}
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
              {type === 'invite' ? 'Invitation confirmée !' : 'Lien vérifié !'}
            </h1>
            <p className="text-white/60">
              {type === 'invite'
                ? 'Votre compte a été activé avec succès'
                : 'Vous pouvez maintenant définir votre nouveau mot de passe'}
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
            {type === 'invite' ? 'Invitation invalide' : 'Lien invalide'}
          </h1>
          <p className="text-white/60">
            {type === 'invite'
              ? 'Le lien d\'invitation est expiré ou invalide'
              : 'Le lien de récupération est expiré ou invalide'}
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
            {type === 'invite'
              ? 'Veuillez contacter l\'administrateur pour obtenir un nouveau lien d\'invitation.'
              : 'Veuillez faire une nouvelle demande de réinitialisation de mot de passe.'}
          </p>

          <Button
            onClick={() => router.push(type === 'invite' ? '/auth/login' : '/auth/reset-password')}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02]"
          >
            {type === 'invite' ? 'Retour à la connexion' : 'Nouvelle demande'}
          </Button>
        </div>
      </div>
    </div>
  )
}
