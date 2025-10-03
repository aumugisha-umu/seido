'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  const handleAuthCallback = useCallback(async () => {
    try {
      console.log('🚀 [AUTH-CALLBACK-DELEGATED] Starting simplified OAuth callback')
      console.log('🔍 [AUTH-CALLBACK-DELEGATED] URL:', window.location.href)

      // ✅ Vérification d'erreurs
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const errorParam = hashParams.get('error') || searchParams.get('error')
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')

      if (errorParam === 'access_denied' && errorCode === 'otp_expired') {
        console.log('⏰ [AUTH-CALLBACK-DELEGATED] Magic link expired')
        setStatus('error')
        setMessage('🔗 Lien d\'invitation expiré. Demandez un nouveau lien d\'invitation à l\'administrateur.')
        return
      }

      if (errorParam && errorParam !== 'access_denied') {
        console.log('❌ [AUTH-CALLBACK-DELEGATED] URL error:', errorParam)
        setStatus('error')
        setMessage(`❌ Erreur d'authentification: ${errorDescription ? decodeURIComponent(errorDescription) : errorParam}`)
        return
      }

      // ✅ SOLUTION: Déléguer à AuthProvider - juste établir la session
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken && refreshToken) {
        console.log('🔑 [AUTH-CALLBACK-DELEGATED] Found tokens, setting session for AuthProvider...')

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (setSessionError) {
          throw new Error(`Session error: ${setSessionError.message}`)
        }

        console.log('✅ [AUTH-CALLBACK-DELEGATED] Session set, AuthProvider will handle the rest')
        setMessage('🔄 Authentification en cours...')

        // ✅ Marquer dans sessionStorage qu'on vient d'un callback invitation
        sessionStorage.setItem('auth_callback_context', JSON.stringify({
          type: 'invitation',
          timestamp: Date.now()
        }))

      } else {
        console.log('🔍 [AUTH-CALLBACK-DELEGATED] No tokens, checking existing session...')

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`)
        }

        if (session?.user) {
          console.log('✅ [AUTH-CALLBACK-DELEGATED] Existing session found')
          setMessage('🔄 Session existante détectée...')
        } else {
          throw new Error('Aucune session trouvée')
        }
      }

      // ✅ AuthProvider va maintenant détecter le changement d'état et gérer:
      // - Le traitement des invitations
      // - La redirection vers le dashboard approprié

    } catch (error) {
      console.error('❌ [AUTH-CALLBACK-DELEGATED] Callback failed:', error)

      setStatus('error')
      setMessage(`❌ Erreur d'authentification : ${error instanceof Error ? error.message : 'Erreur inconnue'}`)

      setTimeout(() => {
        router.push('/auth/login?error=callback_failed')
      }, 3000)
    }
  }, [searchParams, router])

  useEffect(() => {
    handleAuthCallback()
  }, [handleAuthCallback])

  // ✅ Écouter les changements d'utilisateur via AuthProvider
  useEffect(() => {
    if (!loading && user) {
      console.log('✅ [AUTH-CALLBACK-DELEGATED] User loaded by AuthProvider:', user.name, user.role)
      setStatus('success')

      // ✅ Vérifier si c'est une nouvelle confirmation email (email_confirmed_at récent)
      const emailConfirmedAt = (user as any).email_confirmed_at
      const isNewConfirmation = emailConfirmedAt &&
        (Date.now() - new Date(emailConfirmedAt).getTime()) < 120000 // < 2 minutes

      if (isNewConfirmation) {
        console.log('📧 [AUTH-CALLBACK] New email confirmation detected, sending welcome email...')
        setMessage(`✅ Email confirmé avec succès ! Envoi de l'email de bienvenue...`)

        // ✅ Envoyer email de bienvenue (non-bloquant)
        fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: (user as any).id })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            console.log('✅ [AUTH-CALLBACK] Welcome email sent successfully')
          } else {
            console.warn('⚠️ [AUTH-CALLBACK] Welcome email failed (non-blocking):', data.error)
          }
        })
        .catch(err => console.warn('⚠️ [AUTH-CALLBACK] Welcome email failed (non-blocking):', err))

        // ✅ Rediriger vers login avec message de succès
        setTimeout(() => {
          console.log('🔄 [AUTH-CALLBACK] Redirecting to login page...')
          window.location.href = '/auth/login?confirmed=true'
        }, 2000)

        return
      }

      // ✅ Message adapté selon si on va vers set-password ou dashboard
      const callbackContext = sessionStorage.getItem('auth_callback_context')
      const isInvitationCallback = callbackContext && JSON.parse(callbackContext).type === 'invitation'

      if (isInvitationCallback) {
        setMessage(`✅ Authentification réussie ! Configuration de votre compte en cours...`)
      } else {
        setMessage(`✅ Connexion réussie ! Redirection vers votre espace ${user.role}...`)
      }

      setUserRole(user.role)
    }
  }, [user, loading])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Authentification SEIDO
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            {status === 'processing' && (
              <div className="space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">
                  Traitement de votre authentification...
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Connexion réussie !</strong><br />
                    {message}
                    {userRole && <><br />Redirection vers votre espace {userRole}...</>}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erreur d'authentification</strong><br />
                    {message}
                    <br /><br />
                    Redirection vers la page de connexion...
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
