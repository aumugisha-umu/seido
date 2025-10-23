"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { confirmEmailAction, checkProfileCreated } from '@/app/actions/confirm-actions'
import { SignupSuccessModal } from './signup-success-modal'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type FlowState = 'verifying' | 'creating_profile' | 'success' | 'error'

interface ConfirmFlowProps {
  tokenHash: string
  type: 'email' | 'invite' | 'recovery' | 'signup'
}

/**
 * Client Component pour le flow de confirmation d'email
 *
 * États :
 * 1. verifying : Vérification de l'OTP
 * 2. creating_profile : Attente de la création du profil (polling)
 * 3. success : Profil créé, affichage de la modale
 * 4. error : Erreur (OTP invalide ou profil non créé)
 */
export const ConfirmFlow = ({ tokenHash, type }: ConfirmFlowProps) => {
  const router = useRouter()
  const [state, setState] = useState<FlowState>('verifying')
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<{
    authUserId: string
    email: string
    firstName: string
    role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  } | null>(null)

  // Polling pour vérifier la création du profil
  const pollProfileCreation = async (authUserId: string, maxAttempts = 5): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      console.log(`[CONFIRM-FLOW] Checking profile (attempt ${attempt + 1}/${maxAttempts})...`)

      const result = await checkProfileCreated(authUserId)

      if (result.success && result.data) {
        console.log('[CONFIRM-FLOW] Profile found:', result.data)
        return true
      }

      // Attendre 2 secondes avant la prochaine tentative
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return false
  }

  // Flow principal au montage du composant
  useEffect(() => {
    const runConfirmFlow = async () => {
      try {
        // ÉTAPE 1 : Vérifier l'OTP
        console.log('[CONFIRM-FLOW] Starting OTP verification...')
        setState('verifying')

        const confirmResult = await confirmEmailAction(tokenHash, type)

        if (!confirmResult.success || !confirmResult.data) {
          console.error('[CONFIRM-FLOW] OTP verification failed:', confirmResult.error)
          setError(confirmResult.error || 'Erreur de confirmation')
          setState('error')
          return
        }

        console.log('[CONFIRM-FLOW] OTP verified successfully')
        setUserData(confirmResult.data)

        // ÉTAPE 2 : Vérifier que le profil est créé (polling)
        console.log('[CONFIRM-FLOW] Waiting for profile creation...')
        setState('creating_profile')

        const profileCreated = await pollProfileCreation(confirmResult.data.authUserId)

        if (!profileCreated) {
          console.error('[CONFIRM-FLOW] Profile not created after 10 seconds')
          setError(
            'Votre compte est créé mais votre profil prend plus de temps que prévu à être initialisé. ' +
            'Veuillez patienter quelques instants et actualiser la page, ou contactez le support.'
          )
          setState('error')
          return
        }

        // ÉTAPE 3 : Succès ! Afficher la modale
        console.log('[CONFIRM-FLOW] Profile created successfully, showing success modal')
        setState('success')

      } catch (error) {
        console.error('[CONFIRM-FLOW] Unexpected error:', error)
        setError('Une erreur inattendue est survenue. Veuillez réessayer.')
        setState('error')
      }
    }

    runConfirmFlow()
  }, [tokenHash, type])

  // Rendu selon l'état
  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Vérification de votre email...</h2>
            <p className="text-muted-foreground">
              Nous validons votre lien de confirmation
            </p>
          </div>
        )

      case 'creating_profile':
        return (
          <div className="text-center space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <CheckCircle2 className="h-5 w-5 text-green-500 absolute -bottom-1 -right-1" />
            </div>
            <h2 className="text-xl font-semibold">Création de votre profil...</h2>
            <p className="text-muted-foreground">
              Initialisation de votre compte et de votre équipe
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Cela ne prend que quelques secondes</span>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Une erreur est survenue lors de la confirmation.'}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Aller à la page de connexion
              </Button>
              <Button
                onClick={() => router.push('/auth/signup')}
                variant="outline"
                className="w-full"
              >
                Créer un nouveau compte
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Si le problème persiste, contactez le support à{' '}
              <a href="mailto:support@seido.pm" className="underline">
                support@seido.pm
              </a>
            </p>
          </div>
        )

      case 'success':
        // Modale gérée séparément
        return null

      default:
        return null
    }
  }

  return (
    <>
      {/* Contenu principal (loading/error states) */}
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardContent className="pt-6">
            {renderContent()}
          </CardContent>
        </Card>
      </div>

      {/* Modale de succès */}
      {state === 'success' && userData && (
        <SignupSuccessModal
          isOpen={true}
          firstName={userData.firstName}
          role={userData.role}
          dashboardPath={`/${userData.role}/dashboard`}
          onContinue={() => {
            router.push(`/${userData.role}/dashboard`)
          }}
        />
      )}
    </>
  )
}
