'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, hardAuthRedirect } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      console.log('🔄 [AUTH-CALLBACK] Processing authentication callback...')
      
      // Récupérer les paramètres d'URL (access_token, refresh_token, etc.)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const searchParamsObj = Object.fromEntries(searchParams.entries())
      
      console.log('📋 [AUTH-CALLBACK] Hash params:', hashParams.toString())
      console.log('📋 [AUTH-CALLBACK] Search params:', searchParamsObj)
      
      // Vérifier s'il y a des tokens dans l'URL
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        console.log('🔑 [AUTH-CALLBACK] Tokens found in URL, setting session...')
        
        // Décoder le JWT pour extraire le rôle directement sans attendre setSession
        try {
          const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
          console.log('🔍 [AUTH-CALLBACK] Token payload:', {
            sub: tokenPayload.sub,
            email: tokenPayload.email,
            role: tokenPayload.user_metadata?.role
          })
          
          const role = tokenPayload.user_metadata?.role
          console.log('📋 [AUTH-CALLBACK] Extracted role from token:', role)
          
          // Établir la session et attendre la synchronisation
          const sessionResult = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (sessionResult.error) {
            console.log('⚠️ [AUTH-CALLBACK] Session set error:', sessionResult.error.message)
          } else {
            console.log('✅ [AUTH-CALLBACK] Session set successfully')
          }
          
          // Attendre un délai supplémentaire pour la synchronisation des cookies
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Marquer les invitations comme acceptées via API (basé sur l'email)
          console.log('📝 [AUTH-CALLBACK] Marking invitations as accepted via API (non-blocking)...')
          fetch('/api/mark-invitation-accepted', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: tokenPayload.email
            })
          }).then(response => response.json()).then((result) => {
            if (result.success) {
              console.log(`✅ [AUTH-CALLBACK] ${result.count} invitation(s) marked as accepted via API`)
              if (result.invitations?.length > 0) {
                console.log(`📊 [AUTH-CALLBACK] Updated invitations:`, result.invitations)
              }
            } else {
              console.log('⚠️ [AUTH-CALLBACK] API could not mark invitation as accepted:', result.error)
            }
          }).catch((apiError) => {
            console.log('⚠️ [AUTH-CALLBACK] Error calling mark invitation API:', apiError)
          })

          // Redirection immédiate basée sur le rôle extrait du token
          const redirectPath = role ? `/${role}/dashboard` : '/dashboard'
          
          console.log('🚀 [AUTH-CALLBACK] Immediate redirect to:', redirectPath)
          setStatus('success')
          setMessage(`Redirection vers votre espace ${role || 'utilisateur'}...`)
          setUserRole(role || null)
          
          // Utiliser la redirection hard pour garantir la synchronisation des cookies
          console.log('🏃 [AUTH-CALLBACK] Using hard auth redirect to force cookie sync...')
          setTimeout(async () => {
            await hardAuthRedirect(redirectPath)
          }, 1500)
          
        } catch (tokenError) {
          console.error('❌ [AUTH-CALLBACK] Error decoding token:', tokenError)
          throw new Error('Impossible de décoder le token d\'authentification')
        }

      } else {
        // Pas de tokens - essayer de récupérer la session actuelle
        console.log('🔍 [AUTH-CALLBACK] No tokens in URL, checking current session...')
        
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
        
        if (getSessionError) {
          throw new Error(`Get session error: ${getSessionError.message}`)
        }
        
        if (session?.user) {
          console.log('✅ [AUTH-CALLBACK] Existing session found')
          const role = session.user.user_metadata?.role
          const redirectPath = role ? `/${role}/dashboard` : '/dashboard'
          
          setStatus('success')
          setMessage('Session existante trouvée !')
          setUserRole(role)
          
          setTimeout(async () => {
            await hardAuthRedirect(redirectPath)
          }, 1000)
          
        } else {
          throw new Error('No session found and no tokens provided')
        }
      }

    } catch (error) {
      console.error('❌ [AUTH-CALLBACK] Error:', error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Erreur inconnue')
      
      // Rediriger vers login après un délai en cas d'erreur
      setTimeout(() => {
        router.push('/auth/login?error=callback_failed')
      }, 3000)
    }
  }

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
