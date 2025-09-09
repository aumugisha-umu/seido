"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [callbackGracePeriod, setCallbackGracePeriod] = useState(false)

  useEffect(() => {
    // Grace period pour les pages callback ET après redirection (éviter race condition avec setSession)
    if (pathname?.includes('/auth/callback')) {
      console.log('⏳ [AUTH-GUARD] Callback page detected - starting 3s grace period')
      setCallbackGracePeriod(true)
      const timer = setTimeout(() => {
        console.log('✅ [AUTH-GUARD] Grace period ended - resuming normal auth checks')
        setCallbackGracePeriod(false)
      }, 3000) // 3s pour laisser setSession() + redirection s'exécuter
      return () => clearTimeout(timer)
    } else {
      console.log('🔍 [AUTH-GUARD] Non-callback page - checking if grace period needed')
      // Si on vient de charger une page dashboard et qu'il n'y a pas encore d'user,
      // c'est probablement qu'on vient d'une redirection callback
      if (!user && !loading && (pathname?.includes('/dashboard'))) {
        console.log('⏳ [AUTH-GUARD] Dashboard page without user - starting 2s grace period for post-redirect auth')
        setCallbackGracePeriod(true)
        const timer = setTimeout(() => {
          console.log('✅ [AUTH-GUARD] Post-redirect grace period ended')
          setCallbackGracePeriod(false)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [pathname, user, loading])

  useEffect(() => {
    console.log('🔍 [AUTH-GUARD] Auth state check:', {
      loading,
      hasUser: !!user,
      userName: user?.name,
      userRole: user?.role,
      pathname,
      callbackGracePeriod
    })
    
    // Si grace period actif, ne pas rediriger
    if (callbackGracePeriod) {
      console.log('⏳ [AUTH-GUARD] Grace period active for callback - waiting...')
      return
    }

    // Si le chargement est terminé et qu'il n'y a pas d'utilisateur
    if (!loading && !user) {
      console.log('🚫 [AUTH-GUARD] User not authenticated - redirecting to login')
      router.push('/auth/login')
      return
    }

    // Si un rôle spécifique est requis et que l'utilisateur n'a pas ce rôle
    if (user && requiredRole && user.role !== requiredRole) {
      console.log(`🚫 [AUTH-GUARD] User role '${user.role}' does not match required role '${requiredRole}' - redirecting to their dashboard`)
      router.push(`/${user.role}/dashboard`)
      return
    }
  }, [user, loading, requiredRole, router, callbackGracePeriod])

  // Afficher le loading pendant l'authentification ou grace period
  if (loading || callbackGracePeriod) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {callbackGracePeriod ? 'Finalisation de la connexion...' : 'Vérification de l\'authentification...'}
            </p>
          </div>
        </div>
      )
    )
  }

  // Si pas d'utilisateur, ne rien afficher (redirection en cours)
  if (!user) {
    return null
  }

  // Si un rôle spécifique est requis mais ne correspond pas
  if (requiredRole && user.role !== requiredRole) {
    return null
  }

  // Utilisateur authentifié avec le bon rôle
  return <>{children}</>
}
