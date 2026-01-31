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
    // ✅ Grace period pour les pages callback ET après redirection (éviter race condition avec setSession)
    if (pathname?.includes('/auth/callback')) {
      const gracePeriod = ENV_CONFIG.gracePeriod.callback
      setCallbackGracePeriod(true)
      const timer = setTimeout(() => {
        setCallbackGracePeriod(false)
      }, gracePeriod)
      return () => clearTimeout(timer)
    } else {
      // Si on vient de charger une page dashboard et qu'il n'y a pas encore d'user,
      // c'est probablement qu'on vient d'une redirection callback ou d'un signup récent
      if (!user && !loading && (pathname?.includes('/dashboard'))) {
        // ✅ Grace period étendue pour signup récent ET pour redirections Server Action
        const isRecentSignup = sessionStorage.getItem('recent_signup') === 'true'
        const isRecentLogin = sessionStorage.getItem('recent_login') === 'true'
        const isServerRedirect = !document.referrer.includes('/auth/')

        let dashboardGracePeriod = ENV_CONFIG.gracePeriod.dashboard
        if (isRecentSignup) {
          dashboardGracePeriod = 10000 // 10s pour signup
        } else if (isRecentLogin || isServerRedirect) {
          dashboardGracePeriod = 5000 // 5s pour login Server Action
        }

        setCallbackGracePeriod(true)
        const timer = setTimeout(() => {
          setCallbackGracePeriod(false)
          if (isRecentSignup) {
            sessionStorage.removeItem('recent_signup')
          }
          if (isRecentLogin) {
            sessionStorage.removeItem('recent_login')
          }
        }, dashboardGracePeriod)
        return () => clearTimeout(timer)
      }
    }
  }, [pathname, user, loading])

  useEffect(() => {
    // Si grace period actif, ne pas rediriger
    if (callbackGracePeriod) {
      return
    }

    // Si le chargement est terminé et qu'il n'y a pas d'utilisateur
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    // Si un rôle spécifique est requis et que l'utilisateur n'a pas ce rôle
    if (user && requiredRole && user.role !== requiredRole) {
      const redirectPath = getSimpleRedirectPath(user.role)
      router.push(redirectPath)
      return
    }
  }, [user, loading, requiredRole, router, callbackGracePeriod, pathname])

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

