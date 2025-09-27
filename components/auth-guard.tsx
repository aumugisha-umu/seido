"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useAuthLoading } from "@/hooks/use-auth-loading"
import { ENV_CONFIG } from "@/lib/environment"
// Fonction simplifiée pour routing côté client (sans import DAL)
function getSimpleRedirectPath(userRole: string): string {
  const routes = {
    admin: '/admin',
    gestionnaire: '/gestionnaire/dashboard',
    prestataire: '/prestataire/dashboard',
    locataire: '/locataire/dashboard'
  }
  return routes[userRole as keyof typeof routes] || '/gestionnaire/dashboard'
}
import AuthLoading, { AUTH_LOADING_MESSAGES } from "./auth-loading"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const { isAuthLoading, loadingMessage } = useAuthLoading(loading, user)
  const router = useRouter()
  const pathname = usePathname()
  const [callbackGracePeriod, setCallbackGracePeriod] = useState(false)

  useEffect(() => {
    // ✅ UTILISATION DE L'UTILITAIRE CENTRALISÉ
    // Grace period pour les pages callback ET après redirection (éviter race condition avec setSession)
    if (pathname?.includes('/auth/callback')) {
      const callbackGracePeriod = ENV_CONFIG.gracePeriod.callback
      console.log(`⏳ [AUTH-GUARD] Callback page detected - starting ${callbackGracePeriod}ms grace period (${ENV_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`)
      setCallbackGracePeriod(true)
      const timer = setTimeout(() => {
        console.log('✅ [AUTH-GUARD] Grace period ended - resuming normal auth checks')
        setCallbackGracePeriod(false)
      }, callbackGracePeriod)
      return () => clearTimeout(timer)
    } else {
      console.log('🔍 [AUTH-GUARD] Non-callback page - checking if grace period needed')
      // Si on vient de charger une page dashboard et qu'il n'y a pas encore d'user,
      // c'est probablement qu'on vient d'une redirection callback ou d'un signup récent
      if (!user && !loading && (pathname?.includes('/dashboard'))) {
        // ✅ NOUVEAU: Grace period étendue pour signup récent
        const isRecentSignup = sessionStorage.getItem('recent_signup') === 'true'
        const dashboardGracePeriod = isRecentSignup ? 10000 : ENV_CONFIG.gracePeriod.dashboard // 10s pour signup, normal sinon

        console.log(`⏳ [AUTH-GUARD] Dashboard page without user - starting ${dashboardGracePeriod}ms grace period for post-redirect auth (${isRecentSignup ? 'RECENT SIGNUP' : 'NORMAL'}) (${ENV_CONFIG.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`)
        setCallbackGracePeriod(true)
        const timer = setTimeout(() => {
          console.log('✅ [AUTH-GUARD] Post-redirect grace period ended')
          setCallbackGracePeriod(false)
          // Nettoyer le flag si toujours présent après timeout
          if (isRecentSignup) {
            sessionStorage.removeItem('recent_signup')
          }
        }, dashboardGracePeriod)
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
      console.log(`🚫 [AUTH-GUARD] User role '${user.role}' does not match required role '${requiredRole}'`)
      
      // ✅ Redirection simple vers dashboard du rôle utilisateur
      const redirectPath = getSimpleRedirectPath(user.role)
      console.log(`🔄 [AUTH-GUARD] Role mismatch - redirecting ${user.role} to: ${redirectPath}`)
      router.push(redirectPath)
      
      return
    }
  }, [user, loading, requiredRole, router, callbackGracePeriod])

  // ✅ NOUVEAU : Affichage loading amélioré avec messages contextuels
  if (isAuthLoading || callbackGracePeriod) {
    const contextualMessage = callbackGracePeriod 
      ? AUTH_LOADING_MESSAGES.callback
      : loadingMessage || AUTH_LOADING_MESSAGES.verifying
    
    return (
      fallback || (
        <AuthLoading message={contextualMessage} />
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
