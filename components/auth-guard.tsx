"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: string
  fallback?: React.ReactNode
}

export default function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
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
  }, [user, loading, requiredRole, router])

  // Afficher le loading pendant l'authentification
  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Vérification de l'authentification...</p>
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
