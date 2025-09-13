'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
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
                const dashboardPath = `/${userRole}/dashboard`
                
                setTimeout(() => {
                  window.location.href = dashboardPath
                }, 500)
                return
              }
            } catch (getSessionTimeout) {
              const userRole = role || 'gestionnaire'
              const dashboardPath = `/${userRole}/dashboard`
              
              setTimeout(() => {
                window.location.href = dashboardPath
              }, 500)
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
            // 1. Par invitation_code (user ID)
            // 2. Par email (fallback)
            Promise.all([
              // Approche 1: Par user ID  
              fetch('/api/mark-invitation-accepted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: email,
                  invitationCode: user.id
                })
              }),
              
              // Approche 2: Par email seulement (fallback)
              fetch('/api/mark-invitation-accepted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: email
                })
              })
            ]).then(responses => {
              responses.forEach((response, index) => {
                if (response.ok) {
                  response.json().then(result => {
                    if (result && result.success && result.count > 0) {
                      console.log(`✅ Approach ${index + 1}: ${result.count} invitation(s) marked as accepted`)
                    }
                  })
                }
              })
            }).catch(error => {
              console.warn('⚠️ Some invitation marking failed, but continuing:', error)
            })
            
            const userRole = role || 'gestionnaire'
            setStatus('success')
            setMessage('Connexion réussie ! Redirection automatique...')
            setUserRole(userRole)
            
            setTimeout(async () => {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                const dashboardPath = `/${userRole}/dashboard`
                router.refresh()
                
                setTimeout(() => {
                  router.push(dashboardPath)
                }, 200)
              } else {
                setTimeout(() => {
                  const dashboardPath = `/${userRole}/dashboard`
                  window.location.href = dashboardPath
                }, 500)
              }
            }, 3000) // 3 secondes pour voir les logs
            
          } else {
            throw new Error('Session non établie après setSession')
          }
          
        } catch (setSessionError) {
          throw setSessionError
        }
        
      } else {
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession()
        
        if (getSessionError) {
          throw new Error(`Erreur de session: ${getSessionError.message}`)
        }
        
        if (session?.user) {
          const role = session.user.user_metadata?.role || 'gestionnaire'
          setStatus('success')
          setMessage('Session existante trouvée ! Redirection automatique...')
          setUserRole(role)
          
          setTimeout(async () => {
            const dashboardPath = `/${role}/dashboard`
            router.refresh()
            
            setTimeout(() => {
              router.push(dashboardPath)
            }, 200)
          }, 500)
        } else {
          throw new Error('Aucune session trouvée')
        }
      }

    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Erreur inconnue')
      
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