"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { TeamCheckModal } from "@/components/team-check-modal"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useTenantData } from "@/hooks/use-tenant-data"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import LocataireDashboardHybrid from "@/components/dashboards/locataire-dashboard-hybrid"
import { logger } from '@/lib/logger'

interface LocataireDashboardProps {
  userName?: string
  userInitial?: string
  teamId?: string
}

export default function LocataireDashboard({ userName, userInitial, teamId }: LocataireDashboardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { tenantData, tenantProperties, tenantInterventions, loading, error } = useTenantData()

  // Pattern "mounted" to avoid React hydration error
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Session timeout monitoring
  useDashboardSessionTimeout()

  // Show skeleton while loading
  if (!mounted || loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
            <div className="h-24 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    logger.error('[TENANT-DASHBOARD] Error loading dashboard:', error)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Une erreur est survenue lors du chargement du tableau de bord.</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  // Show empty state if no data
  if (!tenantData) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Aucune donnée disponible.</p>
      </div>
    )
  }

  return (
    <>
      <TeamCheckModal
        isOpen={!hasTeam}
        teamStatus={teamStatus}
        userRole={user?.role}
      />
      <LocataireDashboardHybrid
        tenantData={tenantData}
        tenantProperties={tenantProperties}
        tenantInterventions={tenantInterventions}
        loading={loading}
        error={error}
        userName={userName}
        userInitial={userInitial}
        teamId={teamId}
      />
    </>
  )
}
