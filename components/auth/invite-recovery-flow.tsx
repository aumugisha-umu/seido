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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <AuthLogo />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {type === 'invite' ? 'Confirmation de l\'invitation' : 'Récupération de mot de passe'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {type === 'invite'
                    ? 'Vérification de votre invitation en cours...'
                    : 'Vérification du lien de récupération...'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Veuillez patienter quelques instants
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // État: Succès
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {type === 'invite' ? 'Invitation confirmée !' : 'Lien vérifié !'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {type === 'invite'
                    ? 'Votre compte a été activé avec succès'
                    : 'Vous pouvez maintenant définir votre nouveau mot de passe'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Vérification réussie !</strong>
                  <br />
                  Redirection automatique en cours...
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => router.push(redirectTo)}
                className="w-full bg-primary hover:bg-secondary text-primary-foreground"
              >
                Continuer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // État: Erreur
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {type === 'invite' ? 'Invitation invalide' : 'Lien invalide'}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {type === 'invite'
                  ? 'Le lien d\'invitation est expiré ou invalide'
                  : 'Le lien de récupération est expiré ou invalide'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || 'Une erreur est survenue lors de la vérification'}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {type === 'invite'
                  ? 'Veuillez contacter l\'administrateur pour obtenir un nouveau lien d\'invitation.'
                  : 'Veuillez faire une nouvelle demande de réinitialisation de mot de passe.'}
              </p>

              <Button
                onClick={() => router.push(type === 'invite' ? '/auth/login' : '/auth/reset-password')}
                className="w-full bg-primary hover:bg-secondary text-primary-foreground"
              >
                {type === 'invite' ? 'Retour à la connexion' : 'Nouvelle demande'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
