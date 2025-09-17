'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { decideRedirectionStrategy, logRoutingDecision, getDashboardPath } from '@/lib/auth-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  // ✅ FONCTION CENTRALISÉE pour gérer toutes les redirections du callback
  const executeCallbackRedirect = async (role: string, reason: string) => {
    console.log('🎯 [AUTH-CALLBACK] executeCallbackRedirect called:', { role, reason })
    
    const dashboardPath = getDashboardPath(role)
    const decision = decideRedirectionStrategy(
      { role } as any, // Mock user object avec role
      window.location.pathname,
      { isAuthStateChange: true, isMiddlewareEval: false }
    )
    
    logRoutingDecision(decision, { role } as any, { 
      trigger: 'callback-redirect', 
      reason,
      dashboardPath 
    })
    
    console.log(`🔄 [AUTH-CALLBACK] Redirect decision: ${decision.strategy} → ${dashboardPath}`)
    
    if (decision.strategy === 'immediate') {
      // Stratégie immédiate - utiliser Next.js routing
      console.log('✅ [AUTH-CALLBACK] Using Next.js routing for immediate redirect')
      setTimeout(() => router.push(dashboardPath), 500)
    } else {
      // Fallback - hard redirect pour garantir la redirection
      console.log('✅ [AUTH-CALLBACK] Using hard redirect as fallback')
      setTimeout(() => {
        window.location.href = dashboardPath
      }, 1000)
    }
  }

  useEffect(() => {
    handleAuthCallback()
  }, [])

  const handleAuthCallback = async () => {
    try {
      console.log('🚀 [AUTH-CALLBACK] Starting handleAuthCallback function')
      console.log('🔍 [AUTH-CALLBACK] Current URL:', window.location.href)
      console.log('🔍 [AUTH-CALLBACK] URL Hash:', window.location.hash)
      console.log('🔍 [AUTH-CALLBACK] Search Params:', searchParams.toString())
      
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')
      
      // ✅ VÉRIFIER D'ABORD LES ERREURS D'EXPIRATION
      const errorParam = hashParams.get('error') || searchParams.get('error')
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code')
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')
      
      console.log('🔍 [AUTH-CALLBACK] URL Error check:', {
        error: errorParam,
        errorCode: errorCode,
        errorDescription: errorDescription ? decodeURIComponent(errorDescription) : null
      })
      
      // Si erreur d'expiration, gestion spéciale
      if (errorParam === 'access_denied' && errorCode === 'otp_expired') {
        console.log('⏰ [AUTH-CALLBACK] Magic link expired - handling gracefully')
        setStatus('error')
        setMessage('🔗 Lien d\'invitation expiré. Demandez un nouveau lien d\'invitation à l\'administrateur.')
        
        // Pas de redirection automatique pour permettre à l'utilisateur de lire le message
        console.log('🚫 [DEBUG] No redirect on expired link - user can read message')
        return
      }
      
      // Si autre erreur, la signaler aussi
      if (errorParam && errorParam !== 'access_denied') {
        console.log('❌ [AUTH-CALLBACK] Other URL error detected:', errorParam)
        setStatus('error')
        setMessage(`❌ Erreur d'authentification: ${errorDescription ? decodeURIComponent(errorDescription) : errorParam}`)
        return
      }
      
      console.log('🔍 [AUTH-CALLBACK] Tokens found:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenPreview: accessToken ? accessToken.substring(0, 50) + '...' : 'none',
        refreshTokenPreview: refreshToken ? refreshToken.substring(0, 20) + '...' : 'none'
      })
      
      if (accessToken && refreshToken) {
        console.log('📝 [AUTH-CALLBACK] Taking NEW TOKEN FLOW path');
        try {
          const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]))
          const role = tokenPayload.user_metadata?.role
          const email = tokenPayload.email
          
          let sessionData, sessionError
          
          try {
            const result = await Promise.race([
              supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('setSession timeout after 2s')), 2000)
              )
            ])
            sessionData = result.data
            sessionError = result.error
          } catch (timeoutError) {
            try {
              const currentSession = await Promise.race([
                supabase.auth.getSession(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('getSession timeout')), 1000)
                )
              ])
              
              if (currentSession?.data?.session?.user) {
                sessionData = currentSession.data
                sessionError = null
              } else {
                const userRole = role || 'gestionnaire'
                
                // ✅ NOUVEAU : Redirection centralisée après timeout  
                console.log('⏳ [AUTH-CALLBACK] Session timeout detected - using centralized redirect')
                setStatus('error')
                setMessage(`⏳ Session timeout détecté. Redirection vers votre espace ${userRole}...`)
                
                await executeCallbackRedirect(userRole, 'session-timeout')
                return
              }
            } catch (getSessionTimeout) {
              const userRole = role || 'gestionnaire'
              
              console.log('⚠️ [DEBUG-INVITATION] Session timeout, but continuing with invitation processing...')
              console.log('🔍 [DEBUG-INVITATION] Will try to mark invitations even without session')
              
              // ✅ MÊME AVEC TIMEOUT, ESSAYER DE MARQUER LES INVITATIONS
              // Utiliser les tokens des URL params si disponibles
              if (email) {
                console.log('📧 [DEBUG-INVITATION-TIMEOUT] Processing invitations with email:', email)
                
                try {
                  // Approche 1: Par email seulement (plus fiable avec timeout)
                  console.log('📡 [DEBUG-INVITATION-TIMEOUT] Calling API by email only...')
                  const response = await fetch('/api/mark-invitation-accepted', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: email
                    })
                  })
                  
                  console.log('📧 [DEBUG-INVITATION-TIMEOUT] API Response status:', response.status)
                  const result = await response.json()
                  console.log('📧 [DEBUG-INVITATION-TIMEOUT] API Response data:', result)
                  
                  if (response.ok) {
                    setStatus('success')
                    setMessage(`✅ Invitation traitée avec succès. Redirection vers votre espace ${userRole}...`)
                    
                    // ✅ NOUVEAU : Redirection centralisée après traitement réussi
                    setTimeout(async () => {
                      await executeCallbackRedirect(userRole, 'invitation-success')
                    }, 2000)
                  } else {
                    setStatus('error')
                    setMessage(`❌ Erreur lors du traitement de l'invitation. Redirection vers votre espace ${userRole}...`)
                    
                    // ✅ NOUVEAU : Redirection centralisée après échec 
                    setTimeout(async () => {
                      await executeCallbackRedirect(userRole, 'invitation-error')
                    }, 3000)
                  }
                } catch (invitationError) {
                  console.error('❌ [DEBUG-INVITATION-TIMEOUT] Failed to process invitation:', invitationError)
                  setStatus('error')
                  setMessage(`❌ Erreur technique. Redirection vers votre espace ${userRole}...`)
                  
                  // ✅ NOUVEAU : Redirection centralisée après erreur technique
                  setTimeout(async () => {
                    await executeCallbackRedirect(userRole, 'invitation-exception')
                  }, 3000)
                }
              } else {
                console.log('❌ [DEBUG-INVITATION-TIMEOUT] No email available for invitation processing')
                setStatus('error')
                setMessage(`❌ Session timeout détecté. Redirection vers votre espace ${userRole}...`)
                
                // ✅ NOUVEAU : Redirection centralisée après timeout sans email
                setTimeout(async () => {
                  await executeCallbackRedirect(userRole, 'timeout-no-email')
                }, 3000)
              }
              
              return
            }
          }
          
          if (sessionError) {
            throw sessionError
          }
          
          if (sessionData?.session?.user) {
            const user = sessionData.session.user
            
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // Marquer les invitations comme acceptées - APPROCHE DOUBLE
            // 1. Par invitation_code (auth.users.id - PAS users.id !)
            // 2. Par email (fallback)
            console.log('🔍 [AUTH-CALLBACK-DEBUG] Marking invitations with:', {
              email: email,
              authUserId: user.id,
              sessionUserId: sessionData.session.user.id,
              invitationCode: sessionData.session.user.id
            })
            
            // 📡 [DEBUG] Attendre et logger chaque appel API séparément
            console.log('📡 [AUTH-CALLBACK-DEBUG] Starting invitation API calls...')
            
            try {
              // Approche 1: Par auth.users.id (PAS users.id !)
              console.log('📡 [INVITATION-API-1] Calling with invitation code...')
              const response1 = await fetch('/api/mark-invitation-accepted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: email,
                  invitationCode: sessionData.session.user.id // ✅ CORRIGÉ: auth.users.id
                })
              })
              
              console.log('📡 [INVITATION-API-1] Response status:', response1.status)
              if (response1.ok) {
                const result1 = await response1.json()
                console.log('📡 [INVITATION-API-1] Result:', result1)
                if (result1 && result1.success && result1.count > 0) {
                  console.log(`✅ [INVITATION-API-1] SUCCESS: ${result1.count} invitation(s) marked as accepted by code`)
                } else {
                  console.log('ℹ️ [INVITATION-API-1] No invitations found by code')
                }
              } else {
                const error1 = await response1.text()
                console.warn('⚠️ [INVITATION-API-1] Failed:', error1)
              }
              
              // Approche 2: Par email seulement (fallback)
              console.log('📡 [INVITATION-API-2] Calling with email only...')
              const response2 = await fetch('/api/mark-invitation-accepted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: email
                })
              })
              
              console.log('📡 [INVITATION-API-2] Response status:', response2.status)
              if (response2.ok) {
                const result2 = await response2.json()
                console.log('📡 [INVITATION-API-2] Result:', result2)
                if (result2 && result2.success && result2.count > 0) {
                  console.log(`✅ [INVITATION-API-2] SUCCESS: ${result2.count} invitation(s) marked as accepted by email`)
                } else {
                  console.log('ℹ️ [INVITATION-API-2] No invitations found by email')
                }
              } else {
                const error2 = await response2.text()
                console.warn('⚠️ [INVITATION-API-2] Failed:', error2)
              }
              
            } catch (invitationError) {
              console.error('❌ [AUTH-CALLBACK-DEBUG] Invitation API calls failed:', invitationError)
            }
            
            const userRole = role || 'gestionnaire'
          setStatus('success')
            setMessage(`✅ Connexion réussie et invitations traitées ! Redirection vers votre espace ${userRole}...`)
            setUserRole(userRole)
            
            console.log('🎉 [AUTH-CALLBACK] New token flow completed successfully')
            console.log('🔄 [AUTH-CALLBACK] Will redirect to:', `/${userRole}/dashboard`)
            console.log('✅ [AUTH-CALLBACK] User role detected:', userRole)
            console.log('✅ [AUTH-CALLBACK] Session data available:', !!sessionData?.session?.user)
            console.log('✅ [AUTH-CALLBACK] User details:', {
              authUserId: sessionData.session.user.id,
              email: sessionData.session.user.email,
              metadata: sessionData.session.user.user_metadata
            })
            
            // ✅ NOUVEAU : Redirection centralisée après traitement des invitations
            setTimeout(async () => {
              console.log('🔄 [AUTH-CALLBACK] Redirecting to dashboard after processing new tokens...')
              await executeCallbackRedirect(userRole, 'new-token-flow-complete')
            }, 2000)
            
          } else {
            throw new Error('Session non établie après setSession')
          }
          
        } catch (setSessionError) {
          throw setSessionError
        }

      } else {
        console.log('📝 [AUTH-CALLBACK] Taking EXISTING SESSION FLOW path (no tokens in URL)')
        
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
        
        if (getSessionError) {
          throw new Error(`Erreur de session: ${getSessionError.message}`)
        }
        
        if (session?.user) {
          const user = session.user
          const email = user.email
          const role = user.user_metadata?.role || 'gestionnaire'
          
          console.log('🔄 [AUTH-CALLBACK] Already authenticated, checking for pending invitations...')
          console.log('📧 [AUTH-CALLBACK] User email:', email)
          console.log('👤 [AUTH-CALLBACK] User ID:', user.id)
          
          // ✅ MARQUER LES INVITATIONS même si déjà connecté
          try {
            console.log('📡 [AUTH-CALLBACK-DEBUG] Existing session invitation marking...')
            console.log('📡 [AUTH-CALLBACK-DEBUG] API request payload:', {
              email: email,
              sessionUserId: session.user.id,
              authUserId: user.id,
              invitationCode: session.user.id,
              requestUrl: '/api/mark-invitation-accepted',
              method: 'POST'
            })
            
            const startTime = Date.now()
            const response = await fetch('/api/mark-invitation-accepted', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                invitationCode: session.user.id // ✅ CORRIGÉ: auth.users.id explicite
              })
            })
            const endTime = Date.now()
            
            console.log('📊 [AUTH-CALLBACK] API Response details:', {
              status: response.status,
              ok: response.ok,
              statusText: response.statusText,
              responseTime: `${endTime - startTime}ms`,
              headers: Object.fromEntries([...response.headers.entries()])
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log('📊 [AUTH-CALLBACK] API Response data:', result)
              console.log('📊 [AUTH-CALLBACK] API Response analysis:', {
                success: result?.success,
                count: result?.count,
                hasInvitations: result?.invitations?.length > 0,
                invitations: result?.invitations,
                error: result?.error
              })
              
              if (result && result.success && result.count > 0) {
                console.log(`✅ [AUTH-CALLBACK] ${result.count} invitation(s) marked as accepted for existing user`)
                console.log(`✅ [AUTH-CALLBACK] Updated invitations:`, result.invitations.map(inv => ({
                  id: inv.id,
                  email: inv.email,
                  status: inv.status,
                  accepted_at: inv.accepted_at
                })))
              } else {
                console.log('ℹ️ [AUTH-CALLBACK] No pending invitations found for this user')
                console.log('ℹ️ [AUTH-CALLBACK] Possible reasons: already accepted, expired, or no invitation exists')
              }
            } else {
              const errorText = await response.text()
              console.warn('⚠️ [AUTH-CALLBACK] Failed to mark invitations:', response.status, errorText)
              console.warn('⚠️ [AUTH-CALLBACK] Response headers:', Object.fromEntries([...response.headers.entries()]))
            }
          } catch (error) {
            console.warn('⚠️ [AUTH-CALLBACK] Error marking invitations for existing user:', error)
            console.warn('⚠️ [AUTH-CALLBACK] Error details:', {
              name: error?.name,
              message: error?.message,
              stack: error?.stack
            })
          }
          
          setStatus('success')
          setMessage(`✅ Session existante trouvée et invitations traitées ! Redirection vers votre espace ${role}...`)
          setUserRole(role)
          
          console.log('🎉 [AUTH-CALLBACK] Existing session flow completed successfully')
          console.log('🔄 [AUTH-CALLBACK] Will redirect to:', `/${role}/dashboard`)
          console.log('✅ [AUTH-CALLBACK] User role detected:', role)
          console.log('✅ [AUTH-CALLBACK] User email:', email)
          console.log('✅ [AUTH-CALLBACK] Auth user ID (session):', session.user.id)
          console.log('✅ [AUTH-CALLBACK] User obj ID:', user.id)
          console.log('✅ [AUTH-CALLBACK] Session user data:', {
            id: user.id,
            email: user.email,
            role: user.user_metadata?.role,
            fullMetadata: user.user_metadata
          })
          
          // ✅ NOUVEAU : Redirection centralisée après traitement des invitations
          setTimeout(async () => {
            console.log('🔄 [AUTH-CALLBACK] Redirecting to dashboard after processing...')
            await executeCallbackRedirect(role, 'existing-session-complete')
          }, 2000)
        } else {
          throw new Error('Aucune session trouvée')
        }
      }

    } catch (error) {
      console.error('💥 [AUTH-CALLBACK] FATAL ERROR in handleAuthCallback:', error)
      console.error('💥 [AUTH-CALLBACK] Error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        type: typeof error
      })
      
      setStatus('error')
      setMessage(`❌ Erreur d'authentification : ${error instanceof Error ? error.message : 'Erreur inconnue'}. Redirection vers la page de connexion...`)
      
      console.error('❌ [AUTH-CALLBACK] Error occurred during callback processing')
      console.error('❌ [AUTH-CALLBACK] Will redirect to /auth/login?error=callback_failed')
      
      // ✅ NOUVEAU : Redirection d'erreur avec système centralisé
      setTimeout(() => {
        console.log('❌ [AUTH-CALLBACK] Fatal error - redirecting to login')
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