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
      logger.info('🚀 [AUTH-CALLBACK] Starting callback processing')
      logger.info('🔍 [AUTH-CALLBACK] URL:', window.location.href)

      // 1. EXTRAIRE TOKENS DU HASH
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const errorParam = hashParams.get('error') || searchParams.get('error')
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')

      // Gestion des erreurs
      if (errorParam === 'access_denied' && errorCode === 'otp_expired') {
        logger.info('⏰ [AUTH-CALLBACK] Magic link expired')
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
        // Redirect to login after short delay (réduit de 2000ms à 1500ms)
        setTimeout(() => {
          window.location.href = '/auth/login?error=missing_tokens'
        }, 1500)
        return
      }

      // Log détaillé des tokens extraits
      logger.info('🔑 [AUTH-CALLBACK] Tokens extracted:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length || 0,
        refreshTokenLength: refreshToken?.length || 0,
        urlType: hashParams.get('type') || searchParams.get('type'),
        expiresAt: hashParams.get('expires_at'),
        expiresIn: hashParams.get('expires_in')
      })

      // 2. SETUP AUTH STATE LISTENER (Pattern officiel Supabase SSR)
      logger.info('🎧 [AUTH-CALLBACK] Setting up auth state listener...')

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        logger.info('🔔 [AUTH-CALLBACK] Auth state change event:', event)

        if (event === 'SIGNED_IN' && session) {
          logger.info('✅ [AUTH-CALLBACK] User signed in successfully')

          const user = session.user
          logger.info('👤 [AUTH-CALLBACK] User details:', {
            id: user.id,
            email: user.email,
            metadata: user.user_metadata
          })

          // 3. EXTRAIRE PROFIL DES MÉTADONNÉES
          const profile = {
            id: user.id,
            email: user.email!,
            role: (user.user_metadata?.role || 'gestionnaire') as string,
            password_set: (user.user_metadata?.password_set ?? true) as boolean,
            name: (user.user_metadata?.full_name || user.user_metadata?.display_name || user.email) as string
          }

          logger.info('📋 [AUTH-CALLBACK] Profile extracted from metadata:', profile)

          // 4. DÉCISION DE REDIRECTION
          const destination = profile.password_set === false
            ? '/auth/set-password'
            : `/${profile.role}/dashboard`

          logger.info('🎯 [AUTH-CALLBACK] Redirect destination:', {
            destination,
            reason: profile.password_set === false ? 'password_not_set' : 'password_already_set',
            role: profile.role
          })

          // 5. MISE À JOUR UI
          setStatus('success')
          setMessage(
            profile.password_set === false
              ? '✅ Authentification réussie ! Redirection vers la configuration du mot de passe...'
              : `✅ Authentification réussie ! Redirection vers votre espace ${profile.role}...`
          )
          setUserRole(profile.role)

          // 6. REDIRECTION GARANTIE
          logger.info(`🔄 [AUTH-CALLBACK] Navigating to: ${destination}`)

          // Nettoyer le listener avant redirection
          subscription.unsubscribe()

          // Rediriger après un court délai pour que l'UI se mette à jour (réduit de 1000ms à 300ms)
          setTimeout(() => {
            window.location.href = destination
          }, 300)
        } else if (event === 'SIGNED_OUT') {
          logger.warn('⚠️ [AUTH-CALLBACK] User signed out unexpectedly')
          subscription.unsubscribe()
          setStatus('error')
          setMessage('❌ Session expirée ou invalide')
          setTimeout(() => {
            window.location.href = '/auth/login?error=session_expired'
          }, 1500)
        }
      })

      // ✅ CORRECTIF (2025-10-07): ÉTABLIR LA SESSION (BLOQUANT)
      // Problème: setSession() non-bloquant → listener onAuthStateChange ne se déclenche pas → page bloquée
      logger.info('🔑 [AUTH-CALLBACK] Setting session (awaiting)...')
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

        logger.info('✅ [AUTH-CALLBACK] Session established successfully')
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
        logger.info('🧹 [AUTH-CALLBACK] Cleaning up auth listener')
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
