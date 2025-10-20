"use client"

import React, { useState, useEffect, createContext, useContext } from 'react'
import { createTeamService } from '@/lib/services'
import { useAuth } from './use-auth'
import { logger, logError } from '@/lib/logger'
interface TeamStatusContextType {
  teamStatus: 'checking' | 'verified' | 'error'
  hasTeam: boolean
  error?: string
  recheckTeamStatus: () => Promise<void>
}

const TeamStatusContext = createContext<TeamStatusContextType | undefined>(undefined)

export function TeamStatusProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [teamStatus, setTeamStatus] = useState<'checking' | 'verified' | 'error'>('checking')
  const [hasTeam, setHasTeam] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const checkTeamStatus = React.useCallback(async () => {
    if (!user?.id) {
      setTeamStatus('error')
      setError('Utilisateur non connecté')
      return
    }

    // ✅ DÉSACTIVER EN MODE DEVELOPMENT (pour tests E2E et debugging)
    const isDev = process.env.NODE_ENV === 'development' ||
                  (typeof window !== 'undefined' && window.location.hostname === 'localhost')

    logger.info('🧪 [TEAM-STATUS] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      isDev,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A'
    })

    if (isDev) {
      logger.info('🧪 [TEAM-STATUS] Development mode detected - auto-approving team access')
      setHasTeam(true)
      setTeamStatus('verified')
      setError(undefined)
      return
    }

    try {
      setTeamStatus('checking')
      setError(undefined)
      logger.info('🔍 [TEAM-STATUS] Checking team status for user:', user.name)

      // ✅ CORRECTION: Gérer les IDs JWT-only en utilisant l'auth_user_id
      let userId = user.id
      if (user.id.startsWith('jwt_')) {
        logger.info('⚠️ [TEAM-STATUS] JWT-only user detected, skipping team check for now')
        // Pour un utilisateur JWT-only, considérer qu'il a une équipe temporairement
        // Le profil sera trouvé lors du prochain rafraîchissement
        setHasTeam(true)
        setTeamStatus('verified')
        return
      }

      const teamService = createTeamService()
      const result = await teamService.ensureUserHasTeam(userId)

      if (result.hasTeam) {
        logger.info('✅ [TEAM-STATUS] User has team access')
        setHasTeam(true)
        setTeamStatus('verified')
      } else {
        logger.info('❌ [TEAM-STATUS] User has no team access:', result.error)
        setHasTeam(false)
        setTeamStatus('error')
        setError(result.error || 'Erreur inconnue')
      }
    } catch (err) {
      logger.error('❌ [TEAM-STATUS] Error checking team:', err)
      setHasTeam(false)
      setTeamStatus('error')
      setError('Erreur lors de la vérification de votre équipe.')
    }
  }, [user?.id, user?.name])

  // Single useEffect to handle team status check when user changes
  useEffect(() => {
    if (user?.id) {
      // Reset status and trigger check
      setTeamStatus('checking')
      setHasTeam(false)
      setError(undefined)

      // Immediately check team status
      checkTeamStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const recheckTeamStatus = async () => {
    await checkTeamStatus()
  }

  const value = {
    teamStatus,
    hasTeam,
    error,
    recheckTeamStatus,
  }

  return <TeamStatusContext.Provider value={value}>{children}</TeamStatusContext.Provider>
}

export function useTeamStatus() {
  const context = useContext(TeamStatusContext)
  if (context === undefined) {
    throw new Error('useTeamStatus must be used within a TeamStatusProvider')
  }
  return context
}
