'use client'

import { MapPin } from 'lucide-react'
import { GoogleMapsProvider, GoogleMapPreview } from '@/components/google-maps'
import type { Building } from '@/lib/services'
import { BuildingLotsGrid } from '@/components/patrimoine/lot-card-unified'

interface BuildingAddress {
  latitude: number
  longitude: number
  formatted_address: string | null
}

interface LotWithContacts {
  id: string
  reference: string
  category: string
  floor: number
  door_number: string
  lot_contacts: Array<{
    id: string
    user_id: string
    is_primary: boolean
    user: {
      id: string
      name: string
      email: string
      phone?: string
      role: string
      provider_category?: string
      speciality?: string
    }
  }>
  contracts?: unknown[]
}

interface BuildingInfoSectionProps {
  building: Building
  buildingAddress?: BuildingAddress | null
  addressText: string | null
  lotsWithContacts: LotWithContacts[]
  lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }>
  teamId: string
  buildingManagers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string }>
  buildingTenants: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string }>
  providers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }>
  others: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string }>
  lockedLotIds: Set<string> | null
  stats: { occupiedLots: number; totalLots: number; occupancyRate: number }
}

export function BuildingInfoSection({
  building,
  buildingAddress,
  addressText,
  lotsWithContacts,
  lotContactIdsMap,
  teamId,
  buildingManagers,
  buildingTenants,
  providers,
  others,
  lockedLotIds,
  stats,
}: BuildingInfoSectionProps) {
  return (
    <div className="space-y-4">
      {/* Localisation Card */}
      {(buildingAddress || (building as { description?: string }).description) && (
        <div className="bg-card rounded-lg border p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localisation
          </h3>
          {addressText && (
            <p className="text-sm text-muted-foreground mt-1">{addressText}</p>
          )}
          {(building as { description?: string }).description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
              {(building as { description: string }).description}
            </p>
          )}
          {buildingAddress && (
            <div className="mt-3">
              <GoogleMapsProvider>
                <GoogleMapPreview
                  latitude={buildingAddress.latitude}
                  longitude={buildingAddress.longitude}
                  address={buildingAddress.formatted_address || addressText || undefined}
                  height={180}
                  showOpenButton={true}
                />
              </GoogleMapsProvider>
            </div>
          )}
        </div>
      )}

      {/* Lots Card */}
      {lotsWithContacts.length > 0 && (
        <div className="bg-card rounded-lg border p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Lots ({lotsWithContacts.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              {stats.occupiedLots}/{stats.totalLots} occupes ({stats.occupancyRate}%)
            </span>
          </div>
          <BuildingLotsGrid
            buildingId={building.id}
            lots={lotsWithContacts as unknown[]}
            lotContactIdsMap={lotContactIdsMap}
            teamId={teamId}
            buildingManagers={buildingManagers}
            buildingTenants={buildingTenants}
            buildingProviders={providers}
            buildingOthers={others}
            lockedLotIds={lockedLotIds}
            initialExpandAll={false}
            readOnly={true}
            className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          />
        </div>
      )}
    </div>
  )
}
