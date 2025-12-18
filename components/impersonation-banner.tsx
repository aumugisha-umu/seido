'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, User, AlertTriangle, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { stopImpersonationAction } from '@/app/actions/impersonation-actions'
import {
  IMPERSONATION_COOKIE_NAME,
  decodeImpersonationToken
} from '@/lib/impersonation-jwt'
import { useAuth } from '@/hooks/use-auth'

/**
 * Bandeau affiche quand un admin est connecte en tant qu'un autre utilisateur.
 * Position: bas de l'ecran, peut etre minimise en badge.
 */
export function ImpersonationBanner() {
  const router = useRouter()
  const { user } = useAuth()
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [adminInfo, setAdminInfo] = useState<{ email: string; name?: string } | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Detecter si on est en mode impersonation via le cookie
  useEffect(() => {
    const checkImpersonation = () => {
      // Lire le cookie cote client
      const cookies = document.cookie.split(';')
      const impersonationCookie = cookies.find(c =>
        c.trim().startsWith(`${IMPERSONATION_COOKIE_NAME}=`)
      )

      if (impersonationCookie) {
        const token = impersonationCookie.split('=')[1]
        const decoded = decodeImpersonationToken(token)
        if (decoded) {
          setIsImpersonating(true)
          setAdminInfo({
            email: decoded.admin_email,
            name: decoded.admin_name
          })
          // Reset l'etat de sortie quand on detecte une session d'impersonation
          setIsExiting(false)
          return
        }
      }

      setIsImpersonating(false)
      setAdminInfo(null)
      setIsExiting(false)
    }

    checkImpersonation()

    // Re-verifier si les cookies changent (navigation)
    const interval = setInterval(checkImpersonation, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleExit = async () => {
    setIsExiting(true)
    try {
      const result = await stopImpersonationAction()
      if (result.success && result.redirectUrl) {
        router.push(result.redirectUrl)
      } else if (result.redirectUrl) {
        router.push(result.redirectUrl)
      } else {
        setIsExiting(false)
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error exiting impersonation:', error)
      setIsExiting(false)
      router.push('/auth/login')
    }
  }

  if (!isImpersonating) {
    return null
  }

  // Mode minimise: petit badge en bas a gauche
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 bg-orange-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-orange-600 transition-all"
      >
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">
          {user?.name?.split(' ')[0] || 'Impersonation'}
        </span>
        <ChevronUp className="h-4 w-4" />
      </button>
    )
  }

  // Mode complet: bandeau en bas
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-orange-500 text-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="content-max-width px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Minimize button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-orange-600 rounded transition-colors"
            title="Minimiser"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

          {/* Message */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              Connecte en tant que{' '}
              <strong>{user?.name || user?.email || 'utilisateur'}</strong>
            </span>
            {adminInfo && (
              <span className="text-sm text-orange-100 hidden md:inline">
                (admin: {adminInfo.name || adminInfo.email})
              </span>
            )}
          </div>

          {/* Exit button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExit}
            disabled={isExiting}
            className="flex-shrink-0 bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          >
            {isExiting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Sortie...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Revenir a mon compte</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
