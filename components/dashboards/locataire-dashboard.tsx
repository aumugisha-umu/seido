"use client"

import { useState, useEffect, useMemo } from "react"
import { useDashboardSessionTimeout } from "@/hooks/use-dashboard-session-timeout"
import LocataireDashboardHybrid from "@/components/dashboards/locataire-dashboard-hybrid"
import { logger } from '@/lib/logger'
import { Clock, FileText } from "lucide-react"
import type { TenantData, TenantIntervention } from "@/hooks/use-tenant-data"
import type { TenantData as ServerTenantData } from "@/lib/services/domain/tenant.service"

interface LocataireDashboardProps {
  userName?: string
  userInitial?: string
  teamId?: string
  // ✅ Server-loaded data (Next.js 15 pattern)
  serverTenantData?: ServerTenantData | null
  serverError?: string | null
  userId?: string
  userRole?: string
}

/**
 * LocataireDashboard - Optimized for Next.js 15 Server Components
 *
 * ✅ All data is loaded server-side and passed as props
 * ✅ No client-side auth fetch (useAuth) needed for initial render
 * ✅ No client-side data fetch (useTenantData) needed for initial render
 * ✅ Instant render with server-provided data
 */
export default function LocataireDashboard({
  userName,
  userInitial,
  teamId,
  serverTenantData,
  serverError,
  userId,
  userRole
}: LocataireDashboardProps) {
  // Pattern "mounted" to avoid React hydration error
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Session timeout monitoring
  useDashboardSessionTimeout()

  // ✅ Transform server data to component format (memoized)
  const { tenantData, tenantProperties, tenantInterventions, contractStatus } = useMemo(() => {
    if (!serverTenantData) {
      return {
        tenantData: null,
        tenantProperties: [],
        tenantInterventions: [],
        contractStatus: 'none' as const
      }
    }

    // Transform lots to TenantData format
    const transformedProperties: TenantData[] = serverTenantData.lots.map((item) => ({
      id: item.lot.id,
      reference: item.lot.reference,
      floor: item.lot.floor,
      apartment_number: item.lot.apartment_number,
      surface_area: item.lot.surface_area,
      rooms: item.lot.rooms,
      charges_amount: item.lot.charges_amount,
      category: item.lot.category,
      building: item.lot.building || null,
      is_primary: item.is_primary
    }))

    const primaryData = transformedProperties.find(p => p.is_primary) || transformedProperties[0] || null

    // Transform interventions to TenantIntervention format
    const transformedInterventions: TenantIntervention[] = (serverTenantData.interventions || []).map((i: any) => ({
      id: i.id,
      title: i.title,
      description: i.description || '',
      status: i.status,
      created_at: i.created_at,
      completed_date: i.completed_date,
      urgency: i.urgency || 'normale',
      type: i.intervention_type || i.type || 'autre',
      lot: i.lot,
      building: i.building || null,
      assigned_contact: i.assigned_contact,
      quotes: i.quotes || [],
      timeSlots: i.timeSlots || [],
      assignments: i.assignments || []
    }))

    return {
      tenantData: primaryData,
      tenantProperties: transformedProperties,
      tenantInterventions: transformedInterventions,
      contractStatus: serverTenantData.contractStatus
    }
  }, [serverTenantData])

  // Show skeleton only during hydration (brief moment)
  if (!mounted) {
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
  if (serverError) {
    logger.error('[TENANT-DASHBOARD] Server error:', serverError)
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Une erreur est survenue lors du chargement du tableau de bord.</p>
        <p className="text-gray-500 text-sm">{serverError}</p>
      </div>
    )
  }

  // Show state for tenants without any contract
  if (contractStatus === 'none') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center shadow-lg border border-gray-100">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Aucun contrat lié
          </h2>
          <p className="text-gray-600 mb-6">
            Votre compte n'est actuellement lié à aucun contrat de location.
            Si vous êtes locataire, contactez votre gestionnaire pour qu'il associe votre compte à votre contrat.
          </p>
          <div className="bg-amber-50 rounded-lg p-4 text-left">
            <p className="text-sm text-amber-800">
              <strong>Besoin d'aide ?</strong><br />
              Contactez votre gestionnaire immobilier pour obtenir l'accès à vos informations de location.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show state for tenants with upcoming contract (a_venir)
  // They can see their info but cannot create interventions
  if (contractStatus === 'a_venir') {
    return (
      <>
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-900 font-medium">Contrat à venir</p>
              <p className="text-blue-700 text-sm">
                Votre contrat n'a pas encore démarré. Vous pouvez consulter vos informations,
                mais la création de demandes d'intervention sera disponible à partir du début de votre bail.
              </p>
            </div>
          </div>
        </div>
        <LocataireDashboardHybrid
          tenantData={tenantData}
          tenantProperties={tenantProperties}
          tenantInterventions={tenantInterventions}
          loading={false}
          error={null}
          userName={userName}
          userInitial={userInitial}
          teamId={teamId}
          canCreateIntervention={false}
        />
      </>
    )
  }

  // Normal state: active contract - show full dashboard
  return (
    <LocataireDashboardHybrid
      tenantData={tenantData}
      tenantProperties={tenantProperties}
      tenantInterventions={tenantInterventions}
      loading={false}
      error={null}
      userName={userName}
      userInitial={userInitial}
      teamId={teamId}
      canCreateIntervention={true}
    />
  )
}

