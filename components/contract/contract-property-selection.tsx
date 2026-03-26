'use client'

import PropertySelector from '@/components/property-selector'

interface BuildingsData {
  buildings: unknown[]
  lots: unknown[]
  teamId: string | null
}

interface ContractPropertySelectionProps {
  isSupplierMode: boolean
  mode: 'create' | 'edit'
  selectedBuildingId: string | null
  selectedLotId: string | undefined
  initialBuildingsData: BuildingsData
  onBuildingSelect: (buildingId: string | null) => void
  onLotSelect: (lotId: string | null) => void
}

export function ContractPropertySelection({
  isSupplierMode,
  mode,
  selectedBuildingId,
  selectedLotId,
  initialBuildingsData,
  onBuildingSelect,
  onLotSelect,
}: ContractPropertySelectionProps) {
  if (isSupplierMode) {
    return (
      <div className="flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="text-center max-w-2xl mx-auto mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold mb-2">Selectionnez le bien</h2>
          <p className="text-muted-foreground">
            Choisissez l&apos;immeuble ou le lot auquel rattacher les contrats fournisseurs.
          </p>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <PropertySelector
            mode="select"
            onBuildingSelect={onBuildingSelect}
            onLotSelect={onLotSelect}
            selectedBuildingId={selectedBuildingId || undefined}
            selectedLotId={selectedLotId}
            initialData={initialBuildingsData}
            showViewToggle={true}
            compactCards={true}
            hideBuildingSelect={false}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center max-w-2xl mx-auto mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold mb-2">Selectionnez le lot</h2>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? 'Parcourez vos immeubles pour trouver le lot concerne par ce bail.'
            : 'Modifiez le lot si necessaire (attention: cette action peut avoir des consequences).'}
        </p>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <PropertySelector
          mode="select"
          onLotSelect={onLotSelect}
          selectedLotId={selectedLotId}
          initialData={initialBuildingsData}
          showViewToggle={true}
          compactCards={true}
          hideBuildingSelect={true}
        />
      </div>
    </div>
  )
}
