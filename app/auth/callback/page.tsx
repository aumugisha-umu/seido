'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/services'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import AuthLogo from "@/components/ui/auth-logo"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

export default function AuthCallback() {
  const supabase = createBrowserSupabaseClient()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      // 1. EXTRAIRE TOKENS DU HASH
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const errorParam = hashParams.get('error') || searchParams.get('error')
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')

      // Gestion des erreurs
      if (errorParam === 'access_denied' && errorCode === 'otp_expired') {
        setStatus('error')
        setMessage('🔗 Lien d\'invitation expiré. Demandez un nouveau lien d\'invitation à l\'administrateur.')
        return
      }

      if (errorParam && errorParam !== 'access_denied') {
        logger.error('❌ [AUTH-CALLBACK] URL error:', errorParam)
        setStatus('error')
        setMessage(`❌ Erreur d'authentification: ${errorDescription ? decodeURIComponent(errorDescription) : errorParam}`)
        return
      }

      if (!accessToken || !refreshToken) {
        logger.error('❌ [AUTH-CALLBACK] Missing tokens in URL')
        setStatus('error')
        setMessage('❌ Tokens manquants dans l\'URL')
        setTimeout(() => {
          window.location.href = '/auth/login?error=missing_tokens'
        }, 1500)
        return
      }

      // 2. SETUP AUTH STATE LISTENER (Pattern officiel Supabase SSR)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const user = session.user

          // 3. EXTRAIRE PROFIL DES MÉTADONNÉES
          const profile = {
            id: user.id,
            email: user.email!,
            role: (user.user_metadata?.role || 'gestionnaire') as string,
            password_set: (user.user_metadata?.password_set ?? true) as boolean,
            name: (user.user_metadata?.full_name || user.user_metadata?.display_name || user.email) as string
          }

          // 🆕 MULTI-ÉQUIPE: Accepter l'invitation pour les utilisateurs existants
          if (profile.password_set === true) {
            const teamId = searchParams.get('team_id')
            if (teamId) {
              try {
                const response = await fetch('/api/accept-invitation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ teamId })
                })
                if (!response.ok) {
                  logger.warn('⚠️ [AUTH-CALLBACK] Failed to accept invitation')
                }
              } catch {
                // Non-bloquant : l'utilisateur peut quand même accéder à l'app
              }
            }
          }

          // 4. DÉCISION DE REDIRECTION
          const destination = profile.password_set === false
            ? '/auth/set-password'
            : `/${profile.role}/dashboard`

          // 5. MISE À JOUR UI
          setStatus('success')
          setMessage(
            profile.password_set === false
              ? '✅ Authentification réussie ! Redirection vers la configuration du mot de passe...'
              : `✅ Authentification réussie ! Redirection vers votre espace ${profile.role}...`
          )
          setUserRole(profile.role)

          // 6. REDIRECTION GARANTIE
          subscription.unsubscribe()
          setTimeout(() => {
            window.location.href = destination
          }, 300)
        } else if (event === 'SIGNED_OUT') {
          subscription.unsubscribe()
          setStatus('error')
          setMessage('❌ Session expirée ou invalide')
          setTimeout(() => {
            window.location.href = '/auth/login?error=session_expired'
          }, 1500)
        }
      })

      // ✅ ÉTABLIR LA SESSION (BLOQUANT)
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          logger.error('❌ [AUTH-CALLBACK] setSession error:', sessionError)
          subscription.unsubscribe()
          setStatus('error')
          setMessage(`❌ Erreur d'authentification : ${sessionError.message}`)
          setTimeout(() => {
            window.location.href = '/auth/login?error=callback_failed'
          }, 1500)
          return
        }
      } catch (error) {
        logger.error('❌ [AUTH-CALLBACK] setSession exception:', error)
        subscription.unsubscribe()
        setStatus('error')
        setMessage(`❌ Erreur d'authentification`)
        setTimeout(() => {
          window.location.href = '/auth/login?error=callback_failed'
        }, 1500)
      }

      // Cleanup function
      return () => {
        subscription.unsubscribe()
      }
    }

    processCallback()
  }, [searchParams])

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
