"use client"

import React, { useState, useEffect, createContext, useContext } from 'react'
import { teamService } from '@/lib/database-service'
import { useAuth } from './use-auth'

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

  const checkTeamStatus = async () => {
    if (!user?.id) {
      setTeamStatus('error')
      setError('Utilisateur non connecté')
      return
    }

    try {
      setTeamStatus('checking')
      setError(undefined)
      console.log('🔍 [TEAM-STATUS] Checking team status for user:', user.name)
      
      const result = await teamService.ensureUserHasTeam(user.id)
      
      if (result.hasTeam) {
        console.log('✅ [TEAM-STATUS] User has team access')
        setHasTeam(true)
        setTeamStatus('verified')
      } else {
        console.log('❌ [TEAM-STATUS] User has no team access:', result.error)
        setHasTeam(false)
        setTeamStatus('error')
        setError(result.error || 'Erreur inconnue')
      }
    } catch (err) {
      console.error('❌ [TEAM-STATUS] Error checking team:', err)
      setHasTeam(false)
      setTeamStatus('error')
      setError('Erreur lors de la vérification de votre équipe.')
    }
  }

  useEffect(() => {
    if (user?.id) {
      // Only check if we haven't verified yet or if user changed
      if (teamStatus === 'checking') {
        checkTeamStatus()
      }
    }
  }, [user?.id])

  // Reset team status when user changes
  useEffect(() => {
    if (user?.id) {
      setTeamStatus('checking')
      setHasTeam(false)
      setError(undefined)
    }
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
