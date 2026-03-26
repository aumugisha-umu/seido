'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ContactsGridPreview } from '@/components/ui/contacts-grid-preview'
import { BuildingLotsGrid } from '@/components/patrimoine/lot-card-unified'

interface BuildingLotsTabProps {
  buildingId: string
  buildingName: string
  lotsWithContacts: unknown[]
  lotContactIdsMap: Record<string, { lotId: string; lotContactId: string; lotReference: string }>
  teamId: string
  buildingManagers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string }>
  buildingTenants: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string }>
  providers: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string; speciality?: string }>
  others: Array<{ id: string; name: string; email: string; phone?: string; company?: string; type: string }>
  buildingContactIds: Record<string, string>
  expandLotId: string | null
  lockedLotIds: Set<string> | null
  canAddProperty: boolean
  subscriptionLoading: boolean
  onUpgradeRequired: () => void
}

export function BuildingLotsTab({
  buildingId,
  buildingName,
  lotsWithContacts,
  lotContactIdsMap,
  teamId,
  buildingManagers,
  buildingTenants,
  providers,
  others,
  buildingContactIds,
  expandLotId,
  lockedLotIds,
  canAddProperty,
  subscriptionLoading,
  onUpgradeRequired,
}: BuildingLotsTabProps) {
  const router = useRouter()

  return (
    <>
      {/* Building-level contacts (interactive) */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 px-1">Contacts de l&apos;immeuble</h3>
        <ContactsGridPreview
          buildingId={buildingId}
          buildingName={buildingName}
          buildingManagers={buildingManagers}
          providers={providers as unknown[]}
          teamId={teamId}
          others={others as unknown[]}
          buildingContactIds={buildingContactIds}
        />
      </div>

      {/* Lots and their contacts (interactive, all expanded) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-foreground">Lots et leurs contacts</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!subscriptionLoading && !canAddProperty) {
                onUpgradeRequired()
                return
              }
              router.push(`/gestionnaire/biens/lots/nouveau?buildingId=${buildingId}`)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un lot
          </Button>
        </div>
        <BuildingLotsGrid
          buildingId={buildingId}
          lots={lotsWithContacts as unknown[]}
          lotContactIdsMap={lotContactIdsMap}
          teamId={teamId}
          buildingManagers={buildingManagers}
          buildingTenants={buildingTenants}
          buildingProviders={providers}
          buildingOthers={others}
          initialExpandedLotId={expandLotId}
          lockedLotIds={lockedLotIds}
          initialExpandAll={false}
          readOnly={false}
        />
      </div>
    </>
  )
}
