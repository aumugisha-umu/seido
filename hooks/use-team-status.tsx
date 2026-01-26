"use client"

import React, { useState, useEffect, createContext, useContext } from 'react'
import { createTeamService } from '@/lib/services'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'
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

    try {
      setTeamStatus('checking')
      setError(undefined)

      // Gérer les IDs JWT-only
      let userId = user.id
      if (user.id.startsWith('jwt_')) {
        // Pour un utilisateur JWT-only, considérer qu'il a une équipe temporairement
        setHasTeam(true)
        setTeamStatus('verified')
        return
      }

      const teamService = createTeamService()
      const result = await teamService.ensureUserHasTeam(userId)

      if (result.hasTeam) {
        setHasTeam(true)
        setTeamStatus('verified')
      } else {
        setHasTeam(false)
        setTeamStatus('error')
        setError(result.error || 'Erreur inconnue')
      }
    } catch (err) {
      logger.error('[TEAM-STATUS] Error checking team:', err)
      setHasTeam(false)
      setTeamStatus('error')
      setError('Erreur lors de la vérification de votre équipe.')
    }
  }, [user?.id, user?.name])

  // Check team status when user changes
  useEffect(() => {
    if (user?.id) {
      setTeamStatus('checking')
      setHasTeam(false)
      setError(undefined)
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
